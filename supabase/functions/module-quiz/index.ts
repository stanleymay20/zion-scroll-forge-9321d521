import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function normalizeOptions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.map((o: any) => typeof o === 'string' ? o : (o?.text ?? String(o)))
}

function normalizeCorrectAnswer(row: any, options: string[]): number | string | null {
  const raw = row.answer ?? row.correct_answer ?? null
  if (typeof raw === 'number') return raw
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    const asNum = Number(trimmed)
    if (Number.isInteger(asNum) && asNum >= 0 && asNum < options.length) return asNum
    const idx = options.findIndex((o) => o.trim().toLowerCase() === trimmed.toLowerCase())
    return idx >= 0 ? idx : trimmed
  }
  if (raw && typeof raw === 'object') {
    const candidate = raw.index ?? raw.value ?? raw.answer ?? raw.correct
    if (typeof candidate === 'number') return candidate
    if (typeof candidate === 'string') {
      const idx = options.findIndex((o) => o.trim().toLowerCase() === candidate.trim().toLowerCase())
      return idx >= 0 ? idx : candidate
    }
  }
  return null
}

async function isAuthorizedLearner(supabase: any, userId: string, courseId: string) {
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('course_id', courseId)
    .eq('user_id', userId)
    .maybeSingle()

  if (enrollment) return true

  const { data: sectionEnrollment } = await supabase
    .from('section_enrollments')
    .select('id,course_sections!inner(course_id)')
    .eq('student_user_id', userId)
    .eq('course_sections.course_id', courseId)
    .limit(1)
    .maybeSingle()

  return !!sectionEnrollment
}

async function syncVerifiedCompletion(
  supabase: any,
  userId: string,
  courseId: string,
  moduleId: string,
  percentage: number,
) {
  // Compatibility projections. Learners cannot write these tables directly;
  // this trusted boundary keeps older UI/reporting paths coherent.
  await supabase.from('learning_progress').upsert({
    user_id: userId,
    module_id: moduleId,
    completed: true,
    quiz_score: percentage,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,module_id' })

  await supabase.from('module_progress').upsert({
    user_id: userId,
    course_id: courseId,
    module_id: moduleId,
    completed: true,
    completed_at: new Date().toISOString(),
  }, { onConflict: 'user_id,module_id' })

  const { data: modules } = await supabase
    .from('course_modules')
    .select('id')
    .eq('course_id', courseId)

  const moduleIds = (modules ?? []).map((m: any) => m.id)
  if (moduleIds.length === 0) return

  const { data: completed } = await supabase
    .from('student_module_progress')
    .select('module_id')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .in('module_id', moduleIds)

  const progress = Math.min(100, Math.round(((completed?.length ?? 0) / moduleIds.length) * 10000) / 100)

  await supabase
    .from('enrollments')
    .update({ progress, updated_at: new Date().toISOString() })
    .eq('course_id', courseId)
    .eq('user_id', userId)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.slice(7))
    if (authError || !user) return json({ error: 'Unauthorized' }, 401)

    const body = await req.json().catch(() => null)
    const action = body?.action
    const moduleId = body?.moduleId
    const courseId = body?.courseId

    if (!moduleId || !courseId || !['questions', 'submit'].includes(action)) {
      return json({ error: 'Invalid request' }, 400)
    }

    if (!(await isAuthorizedLearner(supabase, user.id, courseId))) {
      return json({ error: 'Forbidden' }, 403)
    }

    // Bind the claimed module to the claimed course before reading/grading anything.
    const { data: moduleRow, error: moduleError } = await supabase
      .from('course_modules')
      .select('id,course_id')
      .eq('id', moduleId)
      .eq('course_id', courseId)
      .maybeSingle()
    if (moduleError) throw new Error(`Failed to verify module: ${moduleError.message}`)
    if (!moduleRow) return json({ error: 'Module not found in course' }, 404)

    const { data: rows, error: questionError } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('module_id', moduleId)
      .eq('course_id', courseId)
      .order('order_index', { ascending: true })

    if (questionError) throw new Error(`Failed to load module quiz: ${questionError.message}`)
    const questions = rows ?? []

    if (action === 'questions') {
      return json({
        questions: questions.map((row: any) => ({
          id: row.id,
          prompt: row.prompt ?? row.question_text ?? '',
          options: normalizeOptions(row.options),
          points: Number(row.points ?? 1),
          order_index: row.order_index ?? 0,
          learning_objective_id: row.learning_objective_id ?? null,
          bloom_level: row.bloom_level ?? null,
        })),
      })
    }

    const answers = body?.answers
    if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
      return json({ error: 'Invalid answers' }, 400)
    }
    if (questions.length === 0) return json({ error: 'Assessment has no questions' }, 409)

    // Reject answers for question IDs outside this server-selected assessment.
    const allowedIds = new Set((questions as any[]).map((q) => q.id))
    if (Object.keys(answers).some((id) => !allowedIds.has(id))) {
      return json({ error: 'Answers contain unknown question IDs' }, 400)
    }

    let earned = 0
    let possible = 0
    const outcomeBuckets = new Map<string, { earned: number; possible: number }>()
    const review: any[] = []

    for (const row of questions as any[]) {
      const options = normalizeOptions(row.options)
      const correct = normalizeCorrectAnswer(row, options)
      const submitted = answers[row.id]
      const points = Number(row.points ?? 1)
      possible += points

      let isCorrect = false
      if (typeof correct === 'number') {
        isCorrect = Number(submitted) === correct
      } else if (typeof correct === 'string') {
        isCorrect = String(submitted ?? '').trim().toLowerCase() === correct.trim().toLowerCase()
      }

      if (isCorrect) earned += points

      if (row.learning_objective_id) {
        const bucket = outcomeBuckets.get(row.learning_objective_id) ?? { earned: 0, possible: 0 }
        bucket.possible += points
        if (isCorrect) bucket.earned += points
        outcomeBuckets.set(row.learning_objective_id, bucket)
      }

      review.push({
        id: row.id,
        correct: isCorrect,
        selected: submitted,
        correctIndex: typeof correct === 'number' ? correct : null,
      })
    }

    const percentage = possible > 0 ? Math.round((earned / possible) * 100) : 0
    const passed = percentage >= 70
    const now = new Date().toISOString()

    // Authoritative result. No client-supplied score is accepted.
    const { data: submission, error: submissionError } = await supabase
      .from('quiz_submissions')
      .insert({
        user_id: user.id,
        course_id: courseId,
        module_id: moduleId,
        score: percentage,
        total: possible,
        submitted_at: now,
      })
      .select('id')
      .single()
    if (submissionError) throw new Error(`Failed to persist quiz submission: ${submissionError.message}`)

    for (const [learningObjectiveId, bucket] of outcomeBuckets.entries()) {
      const scorePct = bucket.possible > 0 ? Math.round((bucket.earned / bucket.possible) * 100) : 0
      const { error } = await supabase
        .from('student_outcome_mastery')
        .upsert({
          user_id: user.id,
          course_id: courseId,
          module_id: moduleId,
          learning_objective_id: learningObjectiveId,
          score_pct: scorePct,
        }, { onConflict: 'user_id,module_id,learning_objective_id' })
      if (error) throw new Error(`Failed to persist outcome mastery: ${error.message}`)
    }

    const { error: masteryError } = await supabase
      .from('student_module_progress')
      .upsert({
        user_id: user.id,
        module_id: moduleId,
        mastery_level: percentage,
        status: passed ? 'completed' : 'in_progress',
        last_accessed: now,
        ...(passed ? { completed_at: now } : { completed_at: null }),
      }, { onConflict: 'user_id,module_id' })
    if (masteryError) throw new Error(`Failed to persist module mastery: ${masteryError.message}`)

    let rewardAwarded = false
    if (passed) {
      await syncVerifiedCompletion(supabase, user.id, courseId, moduleId, percentage)

      // One reward per learner+module, regardless of retries/replays. The amount is
      // derived from the server score and cannot be supplied by the browser.
      const { data: awarded, error: rewardError } = await supabase.rpc('award_verified_learning_reward', {
        p_user_id: user.id,
        p_reward_type: 'module_quiz_pass',
        p_source_id: moduleId,
        p_amount: Math.max(1, percentage),
        p_metadata: {
          course_id: courseId,
          module_id: moduleId,
          submission_id: submission.id,
          score: percentage,
        },
      })
      if (rewardError) throw new Error(`Failed to award verified learning reward: ${rewardError.message}`)
      rewardAwarded = awarded === true
    }

    return json({
      score: percentage,
      passed,
      earned,
      possible,
      rewardAwarded,
      review,
      outcomes: Array.from(outcomeBuckets.entries()).map(([learning_objective_id, bucket]) => ({
        learning_objective_id,
        score_pct: bucket.possible > 0 ? Math.round((bucket.earned / bucket.possible) * 100) : 0,
      })),
    })
  } catch (error) {
    console.error('module-quiz error', error)
    return json({ error: (error as Error).message }, 500)
  }
})
