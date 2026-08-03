import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ✝️ Multi-tenant institution resolver
async function resolveInstitutionId(req: Request, supabase: any, bodyData?: any): Promise<string> {
  try {
    if (bodyData?.institution_id) return bodyData.institution_id;
    
    try {
      const authHeader = req.headers.get('authorization');
      if (authHeader) {
        const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
        if (user) {
          const { data: profile } = await supabase.from('profiles').select('current_institution_id').eq('id', user.id).single();
          if (profile?.current_institution_id) return profile.current_institution_id;
        }
      }
    } catch {}

    const { data } = await supabase.from('institutions').select('id').eq('slug', 'scrolluniversity').single();
    if (data) return data.id;
    throw new Error('No institution could be resolved');
  } catch (error) {
    console.error('Institution resolution error:', error);
    throw error;
  }
}

// Week-by-week curriculum structure for 8-week intensive courses
const WEEK_THEMES = [
  { week: 1, theme: "Foundations & Introduction", focus: "Core concepts, historical context, biblical foundations" },
  { week: 2, theme: "Theological Framework", focus: "Scriptural basis, doctrinal perspectives, key principles" },
  { week: 3, theme: "Deep Dive Analysis", focus: "In-depth study, case studies, comparative analysis" },
  { week: 4, theme: "Practical Application", focus: "Real-world application, ministry contexts, hands-on exercises" },
  { week: 5, theme: "Advanced Concepts", focus: "Complex topics, scholarly debates, research methods" },
  { week: 6, theme: "Integration & Synthesis", focus: "Connecting ideas, cross-disciplinary insights, holistic understanding" },
  { week: 7, theme: "Ministry Preparation", focus: "Leadership skills, pastoral application, service opportunities" },
  { week: 8, theme: "Capstone & Assessment", focus: "Final project, comprehensive review, future directions" }
];

function defaultCourseOutcomes(courseTitle: string, faculty: string): string[] {
  return [
    `Explain the core vocabulary, sources, and methods that shape ${courseTitle}.`,
    `Analyze cases and evidence using ${faculty} standards and biblical-theological reasoning.`,
    `Apply course concepts to supervised ministry, professional, or research practice.`,
    `Produce a final synthesis artifact that demonstrates transferable mastery.`,
  ];
}

function buildLearningProgression(courseTitle: string) {
  return {
    syllabus_standard: [
      "Course purpose and measurable outcomes",
      "Weekly lecture, reading, practice, and reflection rhythm",
      "Formative checkpoints before final synthesis",
      "Academic integrity, citation, and remediation policy",
    ],
    assessment_model: [
      "Weekly formative checks",
      "Applied assignment portfolio",
      "Faculty or AI-supported feedback cycle",
      "Final synthesis project",
    ],
    support_model: [
      "AI tutor available for guided practice",
      "Advising and progress checkpoints",
      "Peer discussion and cohort accountability",
      "Remediation path before high-stakes completion",
    ],
    capstone: `Final synthesis portfolio for ${courseTitle}`,
  };
}

function buildModuleStandards(course: any, week: number, weekTheme: any) {
  const courseTitle = course.title || "Course";
  const faculty = course.faculty || "General Studies";
  const focus = weekTheme.focus.split(",")[0].toLowerCase();

  return {
    learning_objectives: [
      `Define the core concepts and vocabulary for ${weekTheme.theme}.`,
      `Analyze ${focus} through ${faculty} scholarship and biblical wisdom.`,
      `Apply this week's concepts to a realistic ministry, research, or professional case.`,
      `Create evidence of mastery that connects ${courseTitle} to your calling and context.`,
    ],
    reflective_prompt: `In 120-180 words, explain how ${weekTheme.theme.toLowerCase()} changes your understanding of ${courseTitle}. Cite one course idea or Scripture, name one unresolved question, and describe one concrete action you will take before the next module.`,
    formative_checkpoints: [
      {
        id: `week-${week}-concept-check`,
        prompt: `What is the most important principle from ${weekTheme.theme}, and why does it matter?`,
        mastery_hint: "A strong answer defines the principle, grounds it in course material, and explains its consequence.",
      },
      {
        id: `week-${week}-application-check`,
        prompt: `Apply ${weekTheme.theme} to a realistic ${faculty} case or ministry decision.`,
        mastery_hint: "A strong answer names the context, evaluates options, and defends a wise next step.",
      },
    ],
    module_references: [
      { label: "Primary Scripture", value: "Proverbs 1:7" },
      { label: "Academic method", value: "Evidence-based reasoning with responsible citation" },
    ],
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    // Prefer DeepSeek for cost-effective generation, fallback to Lovable AI
    const aiConfig = deepseekApiKey 
      ? { url: 'https://api.deepseek.com/v1/chat/completions', key: deepseekApiKey, model: 'deepseek-chat' }
      : { url: 'https://ai.gateway.lovable.dev/v1/chat/completions', key: lovableApiKey!, model: 'google/gemini-2.5-pro' };
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const bodyData = await req.json();
    const institutionId = await resolveInstitutionId(req, supabase, bodyData);
    
    // Optional: generate for specific course
    const targetCourseId = bodyData?.course_id;

    console.log(`✝️ Comprehensive 8-Week Course Generation Started for institution ${institutionId}`);

    const { data: progress } = await supabase
      .from('generation_progress')
      .insert({
        institution_id: institutionId,
        progress: 0,
        current_stage: 'Initializing 8-week intensive course generation',
        faculties_created: 0,
        courses_created: 0,
        modules_created: 0,
        tutors_created: 0
      })
      .select()
      .single();

    EdgeRuntime.waitUntil(runGeneration(supabase, aiConfig, progress.id, institutionId, targetCourseId));

    return new Response(
      JSON.stringify({ 
        success: true,
        message: '8-week intensive course generation started',
        institution_id: institutionId,
        progressId: progress.id,
        estimatedTime: '3-6 hours for full curriculum',
        features: [
          '8 weeks of intensive content per course',
          'Comprehensive markdown lessons (2000+ words each)',
          'AI-generated assessments with 10 questions per module',
          'Downloadable study materials',
          'Scripture integrations throughout',
          'ScrollCoin reward markers'
        ]
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Generation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function runGeneration(
  supabase: any, 
  aiConfig: { url: string; key: string; model: string }, 
  progressId: string, 
  institutionId: string,
  targetCourseId?: string
) {
  let stats = { faculties: 0, courses: 0, modules: 0, quizzes: 0, materials: 0 };

  try {
    let courses: any[] = [];
    
    if (targetCourseId) {
      // Generate for specific course
      const { data: course } = await supabase.from('courses').select('*, faculties(*)').eq('id', targetCourseId).single();
      if (course) courses = [course];
    } else {
      // Get all faculties and generate courses
      const { data: faculties } = await supabase.from('faculties').select('*').eq('institution_id', institutionId);
      
      if (!faculties?.length) {
        throw new Error('No faculties found. Please create faculties first.');
      }

      // Generate 4 comprehensive courses per faculty
      for (const faculty of faculties) {
        await updateProgress(supabase, progressId, {
          current_stage: `Creating courses for ${faculty.name}`,
          progress: Math.floor((stats.courses / (faculties.length * 4)) * 20)
        });

        for (let i = 0; i < 4; i++) {
          const course = await generateCourse(supabase, aiConfig, faculty, institutionId, i);
          if (course) {
            courses.push(course);
            stats.courses++;
          }
        }
      }
    }

    // Generate 8 weeks of content for each course
    const totalModules = courses.length * 8;
    
    for (const course of courses) {
      console.log(`✝️ Generating 8-week curriculum for: ${course.title}`);
      
      for (let week = 1; week <= 8; week++) {
        await updateProgress(supabase, progressId, {
          current_stage: `${course.title} - Week ${week}: ${WEEK_THEMES[week-1].theme}`,
          progress: 20 + Math.floor((stats.modules / totalModules) * 70),
          modules_created: stats.modules
        });

        // Generate comprehensive module content
        const module = await generateWeekModule(supabase, aiConfig, course, week, institutionId);
        if (module) {
          stats.modules++;
          
          // Generate quiz with AI-powered questions
          await generateQuiz(supabase, aiConfig, module, course, week, institutionId);
          stats.quizzes++;
          
          // Generate learning materials
          await generateMaterials(supabase, aiConfig, module, course, week, institutionId);
          stats.materials += 4;
        }
        
        // Rate limiting - pause between modules
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    await updateProgress(supabase, progressId, {
      current_stage: 'Complete - All courses generated with 8 weeks of content',
      progress: 100,
      courses_created: stats.courses,
      modules_created: stats.modules
    });

    console.log('✝️ Generation complete:', stats);
  } catch (error: any) {
    console.error('Generation failed:', error);
    await updateProgress(supabase, progressId, {
      current_stage: `Error: ${error.message}`,
      progress: -1
    });
  }
}

async function generateCourse(
  supabase: any, 
  aiConfig: { url: string; key: string; model: string }, 
  faculty: any, 
  institutionId: string,
  index: number
) {
  const courseTypes = ['Foundations', 'Advanced Studies', 'Practical Ministry', 'Research Methods'];
  
  const prompt = `You are an expert Christian university curriculum designer. Create a comprehensive 8-week intensive course for the ${faculty.name} faculty.

Course Focus: ${courseTypes[index % 4]}
Faculty Description: ${faculty.description || faculty.name}
Key Scripture: ${faculty.key_scripture || 'Proverbs 1:7'}

Generate a rigorous academic course suitable for university-level study. Return ONLY valid JSON:

{
  "title": "Course Title (academic, specific, compelling)",
  "description": "200-300 word course description explaining scope, objectives, and spiritual significance",
  "level": "Intermediate",
  "duration": "8 weeks",
  "prerequisites": ["List any prerequisites"],
  "learning_outcomes": [
    "Specific measurable outcome 1",
    "Specific measurable outcome 2", 
    "Specific measurable outcome 3",
    "Specific measurable outcome 4",
    "Specific measurable outcome 5"
  ],
  "key_texts": ["Primary textbook", "Secondary readings"],
  "tags": ["topic1", "topic2", "topic3", "topic4"]
}`;

  try {
    const response = await fetch(aiConfig.url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${aiConfig.key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: aiConfig.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API failed: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content.trim();
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const courseData = JSON.parse(content);

    const { data: course, error } = await supabase.from('courses').insert({
      institution_id: institutionId,
      title: courseData.title,
      description: courseData.description,
      faculty: faculty.name,
      faculty_id: faculty.id,
      level: courseData.level || 'Intermediate',
      duration: '8 weeks',
      credit_hours: 3,
      estimated_duration_hours: 72,
      learning_outcomes: courseData.learning_outcomes || defaultCourseOutcomes(courseData.title, faculty.name),
      learning_progression: buildLearningProgression(courseData.title),
      tags: courseData.tags || courseData.learning_outcomes?.slice(0, 4) || [],
      xr_enabled: false,
      scroll_coin_cost: 0,
      scholarship_eligible: true
    }).select().single();

    if (error) throw error;
    console.log('✅ Created course:', course.title);
    return course;
  } catch (error: any) {
    console.error('Error generating course:', error.message);
    return null;
  }
}

async function generateWeekModule(
  supabase: any,
  aiConfig: { url: string; key: string; model: string },
  course: any,
  week: number,
  institutionId: string
) {
  const weekTheme = WEEK_THEMES[week - 1];
  
  const prompt = `You are a distinguished Christian scholar creating Week ${week} content for "${course.title}".

WEEK ${week}: ${weekTheme.theme}
Focus Area: ${weekTheme.focus}
Course Description: ${course.description}

Create comprehensive lesson content. Return ONLY valid JSON:

{
  "title": "Week ${week}: [Specific Lesson Title]",
  "content_md": "# Week ${week}: [Title]

## Learning Objectives
By the end of this week, students will be able to:
1. [Specific objective 1]
2. [Specific objective 2]
3. [Specific objective 3]

## Opening Scripture
> [Relevant Bible verse with reference]

## Introduction
[2-3 paragraphs introducing this week's topic, its importance, and connection to previous learning]

## Section 1: [Topic Title]
[3-4 paragraphs of substantive content with theological depth]

### Key Concepts
- **[Concept 1]**: [Detailed explanation]
- **[Concept 2]**: [Detailed explanation]
- **[Concept 3]**: [Detailed explanation]

## Section 2: [Topic Title]
[3-4 paragraphs exploring the topic further]

### Biblical Foundation
[Analysis of relevant scripture passages with application]

## Section 3: [Topic Title]
[3-4 paragraphs with practical application]

### Case Study
[Real-world scenario for analysis and discussion]

## Section 4: Practical Application
[How to apply this week's learning in ministry and daily life]

### Discussion Questions
1. [Thought-provoking question 1]
2. [Thought-provoking question 2]
3. [Thought-provoking question 3]

## Weekly Assignment
[Description of assignment worth ScrollCoins upon completion]

**📜 Scripture Memory Verse**: [Key verse for the week]

**💰 ScrollCoin Rewards**:
- Complete reading: 15 SC
- Discussion participation: 10 SC
- Assignment submission: 25 SC

## Closing Prayer
[Brief prayer relevant to the week's theme]

---
*Next week we will explore: [Preview of Week ${week + 1} content]*",
  "duration_minutes": ${60 + (week * 5)},
  "key_scripture": "[Primary scripture reference]"
}

IMPORTANT: 
- Content must be 2000-2500 words minimum
- Include deep theological insights
- Cite scripture throughout
- Make content academically rigorous yet accessible
- Include practical ministry applications`;

  try {
    const response = await fetch(aiConfig.url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${aiConfig.key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: aiConfig.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 8000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error for module:', response.status, errorText);
      throw new Error(`AI API failed: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content.trim();
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const moduleData = JSON.parse(content);
    const standards = buildModuleStandards(course, week, weekTheme);

    const { data: module, error } = await supabase.from('course_modules').insert({
      institution_id: institutionId,
      course_id: course.id,
      title: moduleData.title,
      content_md: moduleData.content_md,
      order_index: week,
      duration_minutes: moduleData.duration_minutes || 60,
      learning_objectives: Array.isArray(moduleData.learning_objectives) ? moduleData.learning_objectives : standards.learning_objectives,
      reflective_prompt: moduleData.reflective_prompt || standards.reflective_prompt,
      formative_checkpoints: Array.isArray(moduleData.formative_checkpoints) ? moduleData.formative_checkpoints : standards.formative_checkpoints,
      module_references: standards.module_references,
      content: {
        learning_objectives: Array.isArray(moduleData.learning_objectives) ? moduleData.learning_objectives : standards.learning_objectives,
        summary: `Week ${week} develops ${weekTheme.focus} with accountable practice and reflection.`,
        syllabus_unit: {
          week,
          theme: weekTheme.theme,
          assessment: "Reflection, formative checkpoints, and applied assignment evidence",
        },
      },
      rewards_amount: 50
    }).select().single();

    if (error) throw error;
    console.log(`✅ Created Week ${week} module:`, module.title);
    return module;
  } catch (error: any) {
    console.error(`Error generating week ${week} module:`, error.message);
    return null;
  }
}

async function generateQuiz(
  supabase: any,
  aiConfig: { url: string; key: string; model: string },
  module: any,
  course: any,
  week: number,
  institutionId: string
) {
  const prompt = `Create a comprehensive quiz for Week ${week} of "${course.title}".
Module Title: ${module.title}

Generate 10 challenging questions that test understanding of the week's content.
Return ONLY valid JSON array:

[
  {
    "question": "Question text here?",
    "type": "multiple_choice",
    "options": ["A) First option", "B) Second option", "C) Third option", "D) Fourth option"],
    "correct": "A) First option",
    "explanation": "Brief explanation of why this is correct",
    "points": 10
  }
]

Include:
- 6 knowledge/comprehension questions
- 2 application questions  
- 2 analysis/synthesis questions
Make questions challenging but fair for university-level students.`;

  try {
    const response = await fetch(aiConfig.url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${aiConfig.key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: aiConfig.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.6,
        max_tokens: 4000
      }),
    });

    if (!response.ok) throw new Error(`AI API failed: ${response.status}`);

    const data = await response.json();
    let content = data.choices[0].message.content.trim();
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const questions = JSON.parse(content);

    // Create quiz
    const { data: quiz, error: quizError } = await supabase.from('quizzes').insert({
      institution_id: institutionId,
      module_id: module.id,
      title: `Week ${week} Assessment: ${module.title.replace(`Week ${week}: `, '')}`,
      passing_score: 70,
      time_limit_minutes: 30
    }).select().single();

    if (quizError) throw quizError;

    // Insert questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      await supabase.from('quiz_questions').insert({
        quiz_id: quiz.id,
        question_text: q.question,
        question_type: q.type || 'multiple_choice',
        options: q.options,
        correct_answer: q.correct,
        explanation: q.explanation,
        points: q.points || 10,
        order_index: i + 1
      });
    }

    console.log(`✅ Created quiz with ${questions.length} questions for Week ${week}`);
    return quiz;
  } catch (error: any) {
    console.error('Error generating quiz:', error.message);
    // Fallback to basic quiz
    const { data: quiz } = await supabase.from('quizzes').insert({
      institution_id: institutionId,
      module_id: module.id,
      title: `Week ${week} Assessment`,
      passing_score: 70
    }).select().single();
    return quiz;
  }
}

async function generateMaterials(
  supabase: any,
  aiConfig: { url: string; key: string; model: string },
  module: any,
  course: any,
  week: number,
  institutionId: string
) {
  // Generate study guide content
  const studyGuidePrompt = `Create a comprehensive study guide for Week ${week} of "${course.title}".
Module: ${module.title}

Return ONLY valid JSON:
{
  "summary": "500-word summary of key concepts",
  "key_terms": [
    {"term": "Term 1", "definition": "Definition"},
    {"term": "Term 2", "definition": "Definition"}
  ],
  "scripture_references": ["Reference 1", "Reference 2"],
  "review_questions": ["Question 1?", "Question 2?", "Question 3?"],
  "further_reading": ["Resource 1", "Resource 2"]
}`;

  try {
    const response = await fetch(aiConfig.url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${aiConfig.key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: aiConfig.model,
        messages: [{ role: 'user', content: studyGuidePrompt }],
        temperature: 0.5,
        max_tokens: 2000
      }),
    });

    let studyGuide = {};
    if (response.ok) {
      const data = await response.json();
      let content = data.choices[0].message.content.trim();
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      studyGuide = JSON.parse(content);
    }

    // Insert learning materials
    await supabase.from('learning_materials').insert([
      {
        institution_id: institutionId,
        module_id: module.id,
        title: `Week ${week} Study Guide`,
        kind: 'study_guide',
        meta: studyGuide
      },
      {
        institution_id: institutionId,
        module_id: module.id,
        title: `Week ${week} Lecture Notes`,
        kind: 'notes',
        meta: { generated: true, week }
      },
      {
        institution_id: institutionId,
        module_id: module.id,
        title: `Week ${week} Scripture References`,
        kind: 'scripture',
        meta: { references: (studyGuide as any).scripture_references || [] }
      },
      {
        institution_id: institutionId,
        module_id: module.id,
        title: `Week ${week} Discussion Guide`,
        kind: 'discussion',
        meta: { questions: (studyGuide as any).review_questions || [] }
      }
    ]);

    console.log(`✅ Created 4 learning materials for Week ${week}`);
  } catch (error: any) {
    console.error('Error generating materials:', error.message);
  }
}

async function updateProgress(supabase: any, progressId: string, updates: any) {
  await supabase.from('generation_progress').update({
    ...updates,
    updated_at: new Date().toISOString()
  }).eq('id', progressId);
}
