import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ✝️ ScrollUniversity - Bulk Content Seeding System
// Generates comprehensive modules for all courses missing content

const WEEK_THEMES = [
  { week: 1, theme: "Foundations & Biblical Framework", focus: "Core concepts, historical context, scriptural foundations" },
  { week: 2, theme: "Theological Deep Dive", focus: "Doctrine, key principles, hermeneutical approaches" },
  { week: 3, theme: "Historical & Contextual Analysis", focus: "Church history, cultural contexts, scholarly perspectives" },
  { week: 4, theme: "Practical Ministry Application", focus: "Real-world application, case studies, hands-on exercises" },
  { week: 5, theme: "Advanced Concepts & Debates", focus: "Complex topics, theological debates, research methods" },
  { week: 6, theme: "Integration & Synthesis", focus: "Cross-disciplinary insights, holistic understanding" },
  { week: 7, theme: "Leadership & Service", focus: "Servant leadership, pastoral application, community service" },
  { week: 8, theme: "Capstone Project & Assessment", focus: "Final synthesis, comprehensive review, future vision" }
];

function defaultCourseOutcomes(course: any): string[] {
  const courseTitle = course.title || 'Course';
  const faculty = course.faculty || 'General Studies';
  return [
    `Explain the core vocabulary, sources, and methods that shape ${courseTitle}.`,
    `Analyze cases and evidence using ${faculty} standards and biblical-theological reasoning.`,
    `Apply course concepts to supervised ministry, professional, or research practice.`,
    `Produce a final synthesis artifact that demonstrates transferable mastery.`,
  ];
}

function buildLearningProgression(course: any) {
  return {
    syllabus_standard: [
      'Course purpose and measurable outcomes',
      'Weekly lecture, reading, practice, and reflection rhythm',
      'Formative checkpoints before final synthesis',
      'Academic integrity, citation, and remediation policy',
    ],
    assessment_model: [
      'Weekly formative checks',
      'Applied assignment portfolio',
      'Faculty or AI-supported feedback cycle',
      'Final synthesis project',
    ],
    support_model: [
      'AI tutor available for guided practice',
      'Advising and progress checkpoints',
      'Peer discussion and cohort accountability',
      'Remediation path before high-stakes completion',
    ],
    capstone: `Final synthesis portfolio for ${course.title || 'this course'}`,
  };
}

function buildModuleStandards(course: any, week: number, weekTheme: any) {
  const courseTitle = course.title || 'Course';
  const faculty = course.faculty || 'General Studies';
  const focus = weekTheme.focus.split(',')[0].toLowerCase();

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
        mastery_hint: 'A strong answer defines the principle, grounds it in course material, and explains its consequence.',
      },
      {
        id: `week-${week}-application-check`,
        prompt: `Apply ${weekTheme.theme} to a realistic ${faculty} case or ministry decision.`,
        mastery_hint: 'A strong answer names the context, evaluates options, and defends a wise next step.',
      },
    ],
    module_references: [
      { label: 'Primary Scripture', value: 'Proverbs 1:7' },
      { label: 'Academic method', value: 'Evidence-based reasoning with responsible citation' },
    ],
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json().catch(() => ({}));
    const limitCourses = body.limit || 10; // Process in batches
    const institutionId = body.institution_id || 'ae42441f-8815-48a6-a9a4-1019ad382c2e';

    console.log(`✝️ Bulk Content Seeding Started - Processing up to ${limitCourses} courses`);

    // Find courses with 0 modules
    const { data: coursesWithoutModules, error: queryError } = await supabase
      .from('courses')
      .select(`
        id, 
        title, 
        description, 
        faculty,
        level,
        course_modules(id)
      `)
      .eq('institution_id', institutionId)
      .limit(100);

    if (queryError) throw queryError;

    // Filter to courses with no modules
    const emptyCoursss = (coursesWithoutModules || []).filter(
      (c: any) => !c.course_modules || c.course_modules.length === 0
    ).slice(0, limitCourses);

    console.log(`Found ${emptyCoursss.length} courses without modules`);

    if (emptyCoursss.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'All courses already have modules',
        processed: 0
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Process courses
    const results: any[] = [];
    
    for (const course of emptyCoursss) {
      console.log(`📚 Generating content for: ${course.title}`);
      
      try {
        await supabase
          .from('courses')
          .update({
            credit_hours: course.credit_hours || 3,
            estimated_duration_hours: course.estimated_duration_hours || 72,
            learning_outcomes: defaultCourseOutcomes(course),
            learning_progression: buildLearningProgression(course),
          })
          .eq('id', course.id)
          .or('learning_outcomes.is.null,learning_progression.is.null,credit_hours.is.null,estimated_duration_hours.is.null');

        // Generate 8 weeks of comprehensive modules
        for (let week = 1; week <= 8; week++) {
          const weekTheme = WEEK_THEMES[week - 1];
          
          const moduleContent = generateModuleContent(course, week, weekTheme);
          const quizData = generateQuizData(course, week);
          const standards = buildModuleStandards(course, week, weekTheme);

          const { data: module, error: moduleError } = await supabase
            .from('course_modules')
            .insert({
              institution_id: institutionId,
              course_id: course.id,
              title: `Week ${week}: ${weekTheme.theme}`,
              content_md: moduleContent,
              order_index: week,
              duration_minutes: 60 + (week * 5),
              rewards_amount: 50,
              quiz_data: quizData,
              learning_objectives: standards.learning_objectives,
              reflective_prompt: standards.reflective_prompt,
              formative_checkpoints: standards.formative_checkpoints,
              module_references: standards.module_references,
              content: {
                learning_objectives: standards.learning_objectives,
                summary: `Week ${week} of ${course.title} focuses on ${weekTheme.focus}`,
                syllabus_unit: {
                  week,
                  theme: weekTheme.theme,
                  assessment: 'Reflection, formative checkpoints, and applied assignment evidence',
                },
              }
            })
            .select()
            .single();

          if (moduleError) {
            console.error(`Error creating module for week ${week}:`, moduleError);
          } else {
            console.log(`✅ Created Week ${week} for ${course.title}`);
          }
        }

        results.push({ course: course.title, status: 'success', modules: 8 });
      } catch (courseError: any) {
        console.error(`Error processing course ${course.title}:`, courseError);
        results.push({ course: course.title, status: 'failed', error: courseError.message });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Processed ${results.length} courses`,
      processed: results.length,
      results
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('Bulk seeding error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});

function generateModuleContent(course: any, week: number, weekTheme: any): string {
  const courseTitle = course.title || 'Course';
  const faculty = course.faculty || 'General Studies';
  const description = course.description || '';

  return `# Week ${week}: ${weekTheme.theme}

## ${courseTitle}
*${faculty} • ScrollUniversity*

---

## Learning Objectives

By the end of this week, you will be able to:

1. **Understand** the core principles of ${weekTheme.focus.split(',')[0]}
2. **Analyze** how ${weekTheme.theme.toLowerCase()} applies to ${faculty.toLowerCase()} contexts
3. **Apply** these insights to real-world ministry and professional settings
4. **Integrate** biblical wisdom with practical knowledge

---

## Opening Scripture

> "The fear of the LORD is the beginning of knowledge, but fools despise wisdom and instruction." — Proverbs 1:7 (NIV)

This foundational truth reminds us that all true learning begins with reverence for God. As we study ${weekTheme.theme.toLowerCase()}, we approach this topic with humility and a desire to honor Christ in our scholarship.

---

## Introduction

Welcome to Week ${week} of **${courseTitle}**. This week we focus on **${weekTheme.theme}**, exploring ${weekTheme.focus}.

${description ? `As we continue our journey through this course, remember: ${description.substring(0, 200)}...` : ''}

In Christ-centered education, we recognize that all truth is God's truth. The principles we study this week find their ultimate grounding in the character and purposes of our Creator. Whether we examine ancient texts, contemporary scholarship, or practical applications, we do so as stewards of knowledge entrusted to us by the Lord of all wisdom.

---

## Section 1: Foundational Concepts

### The Biblical Framework

Every discipline within ScrollUniversity is grounded in Scripture. This week's theme of "${weekTheme.theme}" connects directly to biblical principles that have guided the Church for millennia.

**Key Scripture Passages:**
- **Colossians 1:17** - "He is before all things, and in him all things hold together."
- **Proverbs 2:6** - "For the LORD gives wisdom; from his mouth come knowledge and understanding."
- **2 Timothy 2:15** - "Do your best to present yourself to God as one approved, a worker who does not need to be ashamed and who correctly handles the word of truth."

### Historical Development

The study of ${weekTheme.focus.split(',')[0]} has a rich history within Christian scholarship. From the early Church Fathers through the Reformation and into contemporary academia, believers have sought to integrate faith and learning.

The patristic era gave us foundational insights that remain relevant today. Augustine's emphasis on faith seeking understanding (*fides quaerens intellectum*) provides a model for our approach. We don't abandon faith when we study rigorously; rather, our faith propels us toward deeper understanding.

---

## Section 2: Core Content

### Understanding ${weekTheme.theme}

This week's focus on ${weekTheme.focus} invites us to consider how these elements intersect with our calling as Christ-followers.

**Key Concepts to Master:**

1. **Theological Integration** - How does this topic relate to systematic theology?
2. **Practical Application** - What difference does this make in daily life and ministry?
3. **Scholarly Engagement** - What do leading Christian thinkers say about these matters?
4. **Cultural Relevance** - How do we apply ancient wisdom to contemporary challenges?

### The Christ-Centered Perspective

In all our studies at ScrollUniversity, we maintain that Jesus Christ is Lord over every domain of knowledge. This isn't merely a pious addition to secular learning; it's the very foundation upon which true understanding is built.

**Reflection Questions:**
- How does the Lordship of Christ transform our understanding of this topic?
- What unique insights does Scripture provide that secular scholarship might miss?
- How can we engage respectfully with non-Christian perspectives while maintaining biblical fidelity?

---

## Section 3: Practical Application

### Ministry Context

The knowledge we gain isn't meant to remain abstract. True Christian scholarship issues in transformed lives and effective ministry.

**Application Areas:**
- **Personal Formation** - How does this week's study shape your character?
- **Church Ministry** - How can these insights strengthen local congregations?
- **Cultural Engagement** - How do we bring this wisdom into the public square?
- **Global Mission** - What implications exist for cross-cultural ministry?

### Case Study

Consider this scenario: You are leading a small group at your church, and a participant raises a challenging question related to ${weekTheme.focus.split(',')[0]}. How would you respond in a way that is both intellectually honest and pastorally sensitive?

**Discussion Points:**
1. What core truths must be protected?
2. Where is there room for differing Christian perspectives?
3. How do we handle questions we cannot fully answer?

---

## Section 4: Integration & Synthesis

### Connecting the Dots

As we conclude this week's study, consider how ${weekTheme.theme} connects to:

- **Previous weeks** of this course
- **Other courses** you're taking at ScrollUniversity
- **Your personal calling** and vocational direction
- **The broader mission** of the Church in the world

### Week ${week} Summary

Key takeaways from this week include:

1. ${weekTheme.focus.split(',')[0]} is essential for understanding ${courseTitle}
2. Biblical wisdom provides the framework for true knowledge
3. Practical application is the test of genuine learning
4. Christian scholarship serves the Church and glorifies God

---

## Weekly Assignment

📝 **Assignment: Reflective Essay**

Write a 500-word reflection addressing the following prompt:

*"How has this week's study of ${weekTheme.theme} deepened your understanding of ${courseTitle}? What practical steps will you take to apply these insights in your life and ministry?"*

**Submission Requirements:**
- 500+ words
- Include at least 2 Scripture references
- Due by end of the week

**💰 ScrollCoin Rewards:**
- Complete reading: 15 SC
- Discussion participation: 10 SC
- Assignment submission: 25 SC

---

## Scripture Memory

📜 **This Week's Memory Verse:**

> "Trust in the LORD with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight." — Proverbs 3:5-6

---

## Discussion Questions

1. What aspect of ${weekTheme.theme} was most challenging for you to understand? Why?
2. How does this week's content connect to your personal calling and ministry context?
3. What questions remain that you'd like to explore further?
4. How can you encourage a fellow student in their learning journey this week?

---

## Closing Prayer

*Heavenly Father, thank You for the gift of learning and the privilege of studying ${courseTitle}. As we have explored ${weekTheme.theme} this week, open our eyes to see Your truth more clearly. Help us not merely to accumulate knowledge, but to grow in wisdom that leads to transformed lives. May our studies honor You and equip us to serve Your Church and Your world. In Jesus' name, Amen.*

---

*Next week: ${WEEK_THEMES[week]?.theme || 'Course Conclusion and Review'}*

---
**✝️ All learning at ScrollUniversity is conducted under the Lordship of Jesus Christ**
`;
}

function generateQuizData(course: any, week: number): any[] {
  const weekTheme = WEEK_THEMES[week - 1];
  
  return [
    {
      question: `What is the primary focus of Week ${week} in ${course.title}?`,
      type: 'multiple_choice',
      options: [
        `A) ${weekTheme.theme}`,
        `B) Basic introduction`,
        `C) Course prerequisites`,
        `D) Unrelated content`
      ],
      correct: `A) ${weekTheme.theme}`,
      explanation: `Week ${week} focuses on ${weekTheme.theme}, covering ${weekTheme.focus}.`,
      points: 10
    },
    {
      question: `According to Proverbs 1:7, what is the beginning of knowledge?`,
      type: 'multiple_choice',
      options: [
        'A) Reading many books',
        'B) The fear of the LORD',
        'C) Academic degrees',
        'D) Natural intelligence'
      ],
      correct: 'B) The fear of the LORD',
      explanation: 'Scripture teaches that true knowledge begins with reverence for God.',
      points: 10
    },
    {
      question: `What phrase from Augustine describes the relationship between faith and understanding?`,
      type: 'multiple_choice',
      options: [
        'A) Sola scriptura',
        'B) Fides quaerens intellectum',
        'C) Coram Deo',
        'D) Imago Dei'
      ],
      correct: 'B) Fides quaerens intellectum',
      explanation: 'Augustine\'s phrase "fides quaerens intellectum" means "faith seeking understanding."',
      points: 10
    },
    {
      question: `True or False: At ScrollUniversity, secular knowledge is kept separate from biblical truth.`,
      type: 'true_false',
      options: ['True', 'False'],
      correct: 'False',
      explanation: 'All truth is God\'s truth, and we integrate biblical wisdom with all areas of study.',
      points: 10
    },
    {
      question: `Which passage states that "in Christ all things hold together"?`,
      type: 'multiple_choice',
      options: [
        'A) John 1:1',
        'B) Romans 8:28',
        'C) Colossians 1:17',
        'D) Hebrews 1:3'
      ],
      correct: 'C) Colossians 1:17',
      explanation: 'Colossians 1:17 declares Christ\'s cosmic lordship over all creation.',
      points: 10
    },
    {
      question: `What are the four application areas mentioned for ministry context?`,
      type: 'short_answer',
      correct: 'Personal Formation, Church Ministry, Cultural Engagement, Global Mission',
      explanation: 'These four areas help us apply our learning in comprehensive ways.',
      points: 15
    },
    {
      question: `What is the memory verse for this week according to the module?`,
      type: 'multiple_choice',
      options: [
        'A) Proverbs 3:5-6',
        'B) Psalm 23:1',
        'C) John 3:16',
        'D) Romans 12:1-2'
      ],
      correct: 'A) Proverbs 3:5-6',
      explanation: 'Each week includes a Scripture memory component for spiritual formation.',
      points: 10
    },
    {
      question: `How many ScrollCoins are awarded for assignment submission?`,
      type: 'multiple_choice',
      options: [
        'A) 10 SC',
        'B) 15 SC',
        'C) 25 SC',
        'D) 50 SC'
      ],
      correct: 'C) 25 SC',
      explanation: 'Assignment submission awards 25 ScrollCoins as recognition of effort.',
      points: 10
    },
    {
      question: `Describe in your own words how faith and scholarship relate at ScrollUniversity.`,
      type: 'essay',
      correct: 'Faith provides the foundation for true understanding; scholarship done in faith glorifies God.',
      explanation: 'This open-ended question assesses understanding of integrated learning.',
      points: 25
    },
    {
      question: `What does 2 Timothy 2:15 encourage believers to do with the word of truth?`,
      type: 'multiple_choice',
      options: [
        'A) Memorize it completely',
        'B) Handle it correctly as an approved worker',
        'C) Keep it private',
        'D) Simplify it for others'
      ],
      correct: 'B) Handle it correctly as an approved worker',
      explanation: 'Paul exhorts Timothy to study diligently and handle Scripture with integrity.',
      points: 10
    }
  ];
}
