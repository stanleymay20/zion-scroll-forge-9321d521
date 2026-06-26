import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4.20.1'
import { logAiOutput } from '../_shared/ai-log.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GenerationRequest {
  jobId: string;
  jobType: 'course' | 'module' | 'lesson' | 'quiz' | 'assignment' | 'pdf';
  prompt: string;
  parameters: Record<string, any>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  const t0 = Date.now();
  let logUserId: string | null = null;
  let logJobId: string | null = null;
  let logModel: string | null = null;

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

    const { jobId, jobType, prompt, parameters }: GenerationRequest = await req.json()
    logUserId = user.id;
    logJobId = jobId;
    logModel = parameters?.model || 'gpt-4-turbo-preview';

    if (!jobId || !jobType || !prompt) {
      return new Response('Missing required fields', { status: 400, headers: corsHeaders })
    }

    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY') ?? '',
    })

    // Update job status to processing
    await supabaseClient
      .from('content_generation_jobs')
      .update({ 
        status: 'processing', 
        started_at: new Date().toISOString(),
        progress_percentage: 10 
      })
      .eq('id', jobId)

    let generatedContent: any = {}
    let systemPrompt = ""
    let userPrompt = prompt

    // Configure generation based on job type
    switch (jobType) {
      case 'course':
        systemPrompt = `You are an expert Christian educator and curriculum designer. Create comprehensive, spiritually-integrated course content that honors Christ as Lord while maintaining academic excellence. Focus on practical application, biblical integration, and transformative learning.`
        
        userPrompt += `\n\nPlease generate a complete course structure with:
        1. Course title and description
        2. Learning objectives (3-5 clear, measurable objectives)
        3. Target audience definition
        4. 6-8 modules with titles, descriptions, and learning objectives
        5. For each module, include 3-4 lectures with titles and content outlines
        6. Assessment strategy
        7. Spiritual formation components

        Return the response as a JSON object with the following structure:
        {
          "title": "Course Title",
          "description": "Course description",
          "learning_objectives": ["objective 1", "objective 2"],
          "target_audience": {"level": "undergraduate", "prerequisites": []},
          "modules": [
            {
              "title": "Module Title",
              "description": "Module description",
              "objectives": ["objective 1"],
              "estimated_time": 120,
              "lectures": [
                {
                  "title": "Lecture Title",
                  "content": "Lecture content outline",
                  "type": "standard",
                  "engagement": ["discussion", "reflection"]
                }
              ]
            }
          ],
          "assessment_strategy": {"types": [], "weights": {}}
        }`
        break

      case 'module':
        systemPrompt = `You are a Christian educator creating detailed module content. Integrate biblical principles and spiritual formation naturally into the academic content.`
        
        userPrompt += `\n\nGenerate a comprehensive module with:
        1. Module title and description
        2. Learning objectives
        3. 3-5 detailed lectures
        4. Interactive activities
        5. Reflection questions
        6. Practical applications
        7. Scripture integration where appropriate

        Format as JSON with lectures array containing detailed content.`
        break

      case 'lesson':
        systemPrompt = `You are creating engaging lesson content that integrates academic excellence with spiritual formation. Make it practical and transformative.`
        
        userPrompt += `\n\nCreate a detailed lesson including:
        1. Lesson objectives
        2. Introduction/hook
        3. Main content sections
        4. Activities and engagement
        5. Reflection questions
        6. Practical application
        7. Assessment/check for understanding
        8. Resources and further reading

        Format as structured JSON.`
        break

      case 'quiz':
        systemPrompt = `You are creating assessment questions that test both knowledge and understanding. Include questions that encourage reflection and application.`
        
        const questionCount = parameters.questionCount || 10
        userPrompt += `\n\nCreate ${questionCount} quiz questions with:
        1. Mix of question types (multiple choice, true/false, short answer)
        2. Various difficulty levels
        3. Clear, unambiguous questions
        4. Correct answers with explanations
        5. Points per question

        Format as JSON array of questions.`
        break

      case 'assignment':
        systemPrompt = `You are creating meaningful assignments that encourage deep learning, reflection, and practical application of Christian principles.`
        
        userPrompt += `\n\nDesign an assignment with:
        1. Clear instructions and requirements
        2. Rubric with specific criteria
        3. Learning objectives alignment
        4. Spiritual formation component
        5. Practical application focus

        Format as structured JSON with all components.`
        break

      default:
        throw new Error(`Unsupported job type: ${jobType}`)
    }

    // Update progress
    await supabaseClient
      .from('content_generation_jobs')
      .update({ progress_percentage: 30 })
      .eq('id', jobId)

    // Make OpenAI request with retry logic
    let retryCount = 0
    const maxRetries = 3
    let response: any = null

    while (retryCount < maxRetries && !response) {
      try {
        const completion = await openai.chat.completions.create({
          model: parameters.model || 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: parameters.temperature || 0.7,
          max_tokens: parameters.maxTokens || 4000,
          response_format: { type: 'json_object' }
        })

        response = completion
        break
      } catch (error) {
        retryCount++
        console.error(`Attempt ${retryCount} failed:`, error)
        
        if (retryCount < maxRetries) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000))
        } else {
          throw error
        }
      }
    }

    if (!response) {
      throw new Error('Failed to generate content after retries')
    }

    // Update progress
    await supabaseClient
      .from('content_generation_jobs')
      .update({ progress_percentage: 70 })
      .eq('id', jobId)

    // Parse the generated content
    try {
      generatedContent = JSON.parse(response.choices[0].message.content)
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError)
      generatedContent = {
        content: response.choices[0].message.content,
        raw_response: true
      }
    }

    // Calculate costs (approximate)
    const tokensUsed = response.usage?.total_tokens || 0
    const estimatedCost = tokensUsed * 0.00001 // Rough estimate for GPT-4

    // Update progress
    await supabaseClient
      .from('content_generation_jobs')
      .update({ progress_percentage: 90 })
      .eq('id', jobId)

    // Anti-drift validation for certain content types
    let qualityScore = 8.5 // Default score

    if (jobType === 'course' || jobType === 'module') {
      // Perform basic validation
      if (generatedContent.title && generatedContent.description && generatedContent.learning_objectives) {
        qualityScore = 9.0
      }
      
      // Check for spiritual integration
      const content = JSON.stringify(generatedContent).toLowerCase()
      if (content.includes('christ') || content.includes('biblical') || content.includes('spiritual') || content.includes('faith')) {
        qualityScore = Math.min(qualityScore + 0.5, 10)
      }
    }

    // Complete the job
    const { error: updateError } = await supabaseClient
      .from('content_generation_jobs')
      .update({
        status: 'completed',
        progress_percentage: 100,
        output_content: generatedContent,
        completed_at: new Date().toISOString(),
        tokens_used: tokensUsed,
        actual_cost: estimatedCost,
        model_used: parameters.model || 'gpt-4-turbo-preview',
        quality_score: qualityScore
      })
      .eq('id', jobId)

    if (updateError) {
      console.error('Error updating job:', updateError)
    }

    // If this is a course generation, create the actual course record
    if (jobType === 'course' && generatedContent.title) {
      try {
        await supabaseClient.rpc('create_course_from_generation', {
          job_uuid: jobId
        })
      } catch (courseError) {
        console.error('Error creating course from generation:', courseError)
      }
    }

    await logAiOutput({
      user_id: logUserId,
      feature: "content_gen",
      provider: "openai",
      model: logModel,
      input_reference: logJobId,
      output_reference: logJobId,
      tokens_out: tokensUsed,
      cost_estimate: estimatedCost,
      confidence: qualityScore ? qualityScore / 10 : null,
      latency_ms: Date.now() - t0,
      status: "ok",
      metadata: { job_type: jobType, quality_score: qualityScore },
    });

    return new Response(
      JSON.stringify({
        success: true,
        jobId,
        content: generatedContent,
        qualityScore,
        tokensUsed,
        estimatedCost
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )

  } catch (error) {
    console.error('Content generation error:', error)

    // Update job status to failed (best-effort; req.json() may already be consumed)
    if (logJobId) {
      try {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )
        await supabaseClient
          .from('content_generation_jobs')
          .update({
            status: 'failed',
            error_message: (error as Error).message,
            completed_at: new Date().toISOString()
          })
          .eq('id', logJobId)
      } catch (updateError) {
        console.error('Error updating failed job:', updateError)
      }
    }

    await logAiOutput({
      user_id: logUserId,
      feature: "content_gen",
      provider: "openai",
      model: logModel,
      input_reference: logJobId,
      status: "error",
      latency_ms: Date.now() - t0,
      error_message: (error as Error).message,
    });

    return new Response(
      JSON.stringify({
        error: (error as Error).message,
        success: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})