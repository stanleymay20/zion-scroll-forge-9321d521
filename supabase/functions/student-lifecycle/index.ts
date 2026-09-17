import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LifecycleAction {
  action: 'submit_application' | 'process_admission' | 'enroll_student' | 'graduate_student';
  userId?: string;
  applicationId?: string;
  institutionId?: string;
  degreeProgramId?: string;
  applicationData?: any;
  decision?: 'admitted' | 'rejected' | 'waitlisted';
  decisionReason?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify JWT token
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    const { action, userId, applicationId, institutionId, degreeProgramId, applicationData, decision, decisionReason }: LifecycleAction = await req.json()

    if (!action) {
      return new Response('Missing action', { status: 400, headers: corsHeaders })
    }

    let result: any = {}

    switch (action) {
      case 'submit_application': {
        if (!institutionId || !degreeProgramId || !applicationData) {
          return new Response('Missing required fields for application', { status: 400, headers: corsHeaders })
        }

        // Create application
        const { data: application, error: appError } = await supabaseClient
          .from('applications')
          .insert({
            user_id: user.id,
            institution_id: institutionId,
            degree_program_id: degreeProgramId,
            status: 'submitted',
            application_data: applicationData,
            submitted_at: new Date().toISOString()
          })
          .select()
          .single()

        if (appError) {
          throw new Error('Failed to create application: ' + appError.message)
        }

        // Update student lifecycle status
        await supabaseClient
          .from('student_lifecycle')
          .upsert({
            user_id: user.id,
            institution_id: institutionId,
            status: 'applied',
            application_id: application.id,
            degree_program_id: degreeProgramId,
            status_changed_at: new Date().toISOString()
          })

        // Create notification for student
        await supabaseClient
          .from('notifications')
          .insert({
            user_id: user.id,
            type: 'application_submitted',
            title: 'Application Submitted',
            message: 'Your application has been submitted and is under review.',
            data: { application_id: application.id },
            created_at: new Date().toISOString()
          })

        // Award ScrollCoins for application submission
        await supabaseClient.rpc('earn_scrollcoin', {
          user_uuid: user.id,
          amount: 50,
          reason: 'Application submission',
          reference_id: application.id,
          reference_type: 'application'
        })

        result = { application, status: 'applied' }
        break
      }

      case 'process_admission': {
        if (!applicationId || !decision) {
          return new Response('Missing required fields for admission decision', { status: 400, headers: corsHeaders })
        }

        // Verify user has admin role
        const { data: hasAdminRole } = await supabaseClient.rpc('has_role', {
          user_uuid: user.id,
          required_role: 'admin'
        })

        if (!hasAdminRole) {
          return new Response('Insufficient permissions', { status: 403, headers: corsHeaders })
        }

        // Update application
        const { data: application, error: updateError } = await supabaseClient
          .from('applications')
          .update({
            status: decision,
            decision_reason: decisionReason,
            decided_by: user.id,
            decided_at: new Date().toISOString()
          })
          .eq('id', applicationId)
          .select()
          .single()

        if (updateError) {
          throw new Error('Failed to update application: ' + updateError.message)
        }

        result = { application, decision }
        break
      }

      default:
        return new Response('Action not yet implemented', { status: 501, headers: corsHeaders })
    }

    return new Response(
      JSON.stringify({
        success: true,
        action,
        result
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )

  } catch (error) {
    console.error('Student lifecycle error:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : String(error),
        success: false 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})