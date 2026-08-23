import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { logAiOutput } from "../_shared/ai-log.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface QuizSubmission {
  attemptId: string;
  responses: Record<string, any>;
  timeSpent?: number;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  const t0 = Date.now()
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405)

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ success: false, error: 'Unauthorized' }, 401)
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const token = authHeader.slice('Bearer '.length)
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    if (authError || !user) return json({ success: false, error: 'Unauthorized' }, 401)

    const body = await req.json().catch(() => null) as QuizSubmission | null
    const attemptId = body?.attemptId
    const responses = body?.responses
    const timeSpent = body?.timeSpent

    if (!attemptId || !responses || typeof responses !== 'object' || Array.isArray(responses)) {
      return json({ success: false, error: 'Missing or invalid required fields' }, 400)
    }
    if (timeSpent != null && (!Number.isFinite(timeSpent) || timeSpent < 0)) {
      return json({ success: false, error: 'Invalid timeSpent' }, 400)
    }

    // SECURITY BOUNDARY: service-role access must never grade an attempt merely because
    // the caller knows its UUID. Prove ownership and state before any privileged write.
    const { data: ownedAttempt, error: attemptError } = await supabaseClient
      .from('quiz_attempts')
      .select('id,user_id,status')
      .eq('id', attemptId)
      .maybeSingle()

    if (attemptError) throw new Error(`Failed to load quiz attempt: ${attemptError.message}`)
    if (!ownedAttempt || ownedAttempt.user_id !== user.id) {
      return json({ success: false, error: 'Quiz attempt not found' }, 404)
    }
    if (ownedAttempt.status !== 'in_progress') {
      return json({ success: false, error: 'Quiz attempt has already been submitted' }, 409)
    }

    // Persist only learner-controlled submission facts. Authoritative score/pass/mastery
    // remain server-derived by auto_grade_quiz and are never accepted from the client.
    const submissionPatch: Record<string, unknown> = {
      responses,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    }
    if (timeSpent != null) submissionPatch.time_taken = Math.round(timeSpent)

    const { error: submissionError } = await supabaseClient
      .from('quiz_attempts')
      .update(submissionPatch)
      .eq('id', attemptId)
      .eq('user_id', user.id)
      .eq('status', 'in_progress')

    if (submissionError) throw new Error(`Failed to submit quiz: ${submissionError.message}`)

    const { data: success, error: gradingError } = await supabaseClient.rpc('auto_grade_quiz', {
      attempt_uuid: attemptId,
    })
    if (gradingError || !success) {
      throw new Error('Failed to grade quiz: ' + (gradingError?.message || 'Unknown error'))
    }

    // Return a deliberately bounded result rather than exposing the entire attempt row.
    const { data: attempt, error: resultError } = await supabaseClient
      .from('quiz_attempts')
      .select(`
        id,
        assessment_id,
        attempt_number,
        status,
        score,
        max_score,
        percentage,
        passed,
        time_taken,
        submitted_at,
        graded_at,
        feedback,
        assessments (
          title,
          max_attempts,
          course_id
        )
      `)
      .eq('id', attemptId)
      .eq('user_id', user.id)
      .single()

    if (resultError) throw new Error(`Failed to load graded result: ${resultError.message}`)

    await logAiOutput({
      user_id: user.id,
      feature: 'grading',
      model: 'rule_based:auto_grade_quiz',
      provider: 'internal',
      input_reference: attemptId,
      output_reference: attempt.id,
      confidence: attempt.passed === true ? 0.95 : attempt.passed === false ? 0.9 : null,
      human_review_required: false,
      latency_ms: Date.now() - t0,
      metadata: { passed: attempt.passed ?? null, score: attempt.score ?? null },
    })

    return json({
      success: true,
      attempt,
      message: attempt.passed
        ? 'Congratulations! You passed the quiz.'
        : 'Quiz completed. Review your results and try again if possible.',
    })
  } catch (error) {
    console.error('Quiz grading error:', error)
    await logAiOutput({
      feature: 'grading',
      provider: 'internal',
      status: 'error',
      latency_ms: Date.now() - t0,
      error_message: (error as Error)?.message ?? String(error),
    })
    return json({ success: false, error: (error as Error).message }, 500)
  }
})
