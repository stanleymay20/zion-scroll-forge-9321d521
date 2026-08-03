-- Backfill university-grade learning contracts without overwriting stronger authored content.

UPDATE public.courses c
SET
  credit_hours = COALESCE(c.credit_hours, 3),
  estimated_duration_hours = COALESCE(c.estimated_duration_hours, 72),
  duration = COALESCE(c.duration, '8 weeks'),
  learning_outcomes = CASE
    WHEN c.learning_outcomes IS NULL OR jsonb_array_length(COALESCE(c.learning_outcomes, '[]'::jsonb)) = 0 THEN
      jsonb_build_array(
        'Explain the core vocabulary, sources, and methods that shape ' || c.title || '.',
        'Analyze cases and evidence using ' || COALESCE(c.faculty, 'General Studies') || ' standards and biblical-theological reasoning.',
        'Apply course concepts to supervised ministry, professional, or research practice.',
        'Produce a final synthesis artifact that demonstrates transferable mastery.'
      )
    ELSE c.learning_outcomes
  END,
  learning_progression = COALESCE(c.learning_progression, '{}'::jsonb) || jsonb_build_object(
    'syllabus_standard', jsonb_build_array(
      'Course purpose and measurable outcomes',
      'Weekly lecture, reading, practice, and reflection rhythm',
      'Formative checkpoints before final synthesis',
      'Academic integrity, citation, and remediation policy'
    ),
    'assessment_model', jsonb_build_array(
      'Weekly formative checks',
      'Applied assignment portfolio',
      'Faculty or AI-supported feedback cycle',
      'Final synthesis project'
    ),
    'support_model', jsonb_build_array(
      'AI tutor available for guided practice',
      'Advising and progress checkpoints',
      'Peer discussion and cohort accountability',
      'Remediation path before high-stakes completion'
    ),
    'capstone', 'Final synthesis portfolio for ' || c.title
  )
WHERE c.visibility IN ('public', 'published', 'preview')
   OR c.learning_outcomes IS NULL
   OR c.learning_progression IS NULL
   OR c.credit_hours IS NULL
   OR c.estimated_duration_hours IS NULL;

UPDATE public.course_modules m
SET
  learning_objectives = CASE
    WHEN m.learning_objectives IS NULL OR jsonb_array_length(COALESCE(m.learning_objectives, '[]'::jsonb)) = 0 THEN
      jsonb_build_array(
        'Define the core concepts and vocabulary for ' || m.title || '.',
        'Analyze the module theme through course scholarship and biblical wisdom.',
        'Apply this module to a realistic ministry, research, or professional case.',
        'Create evidence of mastery that connects this module to the learner''s calling and context.'
      )
    ELSE m.learning_objectives
  END,
  reflective_prompt = CASE
    WHEN m.reflective_prompt IS NULL OR length(m.reflective_prompt) < 80 THEN
      'In 120-180 words, explain how this module changes your understanding of the course. Cite one course idea or Scripture, name one unresolved question, and describe one concrete action you will take before the next module.'
    ELSE m.reflective_prompt
  END,
  formative_checkpoints = CASE
    WHEN jsonb_array_length(COALESCE(m.formative_checkpoints, '[]'::jsonb)) < 2 THEN
      jsonb_build_array(
        jsonb_build_object(
          'id', 'concept-check',
          'prompt', 'What is the most important principle from this module, and why does it matter?',
          'mastery_hint', 'A strong answer defines the principle, grounds it in course material, and explains its consequence.'
        ),
        jsonb_build_object(
          'id', 'application-check',
          'prompt', 'Apply this module to a realistic ministry, research, or professional decision.',
          'mastery_hint', 'A strong answer names the context, evaluates options, and defends a wise next step.'
        )
      )
    ELSE m.formative_checkpoints
  END,
  module_references = COALESCE(m.module_references, '[]'::jsonb) || jsonb_build_array(
    jsonb_build_object('label', 'Academic method', 'value', 'Evidence-based reasoning with responsible citation')
  ),
  content = COALESCE(m.content, '{}'::jsonb) || jsonb_build_object(
    'syllabus_unit', jsonb_build_object(
      'assessment', 'Reflection, formative checkpoints, and applied assignment evidence',
      'mastery_standard', 'Outcome evidence required before completion'
    )
  )
WHERE m.reflective_prompt IS NULL
   OR length(m.reflective_prompt) < 80
   OR jsonb_array_length(COALESCE(m.formative_checkpoints, '[]'::jsonb)) < 2
   OR m.learning_objectives IS NULL
   OR jsonb_array_length(COALESCE(m.learning_objectives, '[]'::jsonb)) = 0;
