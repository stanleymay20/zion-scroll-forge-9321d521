-- =====================================================================
-- Sprint CT1a — Golden Path Course scaffold + authoring-readiness view
-- =====================================================================
-- CT1 (per the plan after CT2.1 green) asks for "one exceptional,
-- fully working course that proves the teaching model end to end."
-- That is fundamentally a content-authoring sprint: evaluate_module_quality
-- requires ~8000 chars per module plus pedagogical flow markers, which
-- is faculty work, not engineering.
--
-- CT1a (this migration) ships what engineering can honestly ship now:
--
--   1. ONE Golden Path course row, structurally complete, in
--      curriculum_status = 'pending_authorship'. Zero fake content.
--   2. Three course_learning_outcomes with real codes + statements
--      (authored as foundational CLOs for a Scholarly Research &
--      Writing course — genuinely applicable across faculties, not
--      made-up filler).
--   3. Eight module skeletons in 'draft' state with meaningful
--      titles and prerequisites. Their content_md is intentionally
--      empty — PR #2's INSERT trigger will snapshot revision 1 as
--      empty, and the CT2.1 student-visibility gate will keep them
--      invisible to students until an author lifts them through the
--      review lifecycle.
--   4. One assessment stub + one assignment stub under the first
--      module so the course_teaching_readiness assessment_artifacts
--      count sees two artifacts the moment content is authored.
--   5. vw_course_authoring_readiness view — per-module punch-list
--      showing content_char_count vs the 8000 threshold, which flow
--      markers are present/missing, current review_state, and
--      whether a quality run would pass. This is the authoring
--      scoreboard. Reusable across every course, not only this one.
--
-- CT1b (deferred, faculty handoff) is tracked in the sprint-log entry
-- that ships with this migration.
-- =====================================================================

-- ---------- 0. Defensive schema drift reconciliation -----------------
-- The curriculum-completeness authority trigger
-- (enforce_course_curriculum_state_authority, from 20260907113x)
-- references NEW.syllabus on public.courses. The courses table is
-- defined with a syllabus column in complete_schema_sync + production
-- schema migrations, but those are bootstrap-advisory in CI, so a
-- fresh CI DB may not have the column. Add it defensively (idempotent)
-- before any INSERT that would fire the dependency-change trigger
-- chain on courses.
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS syllabus text,
  ADD COLUMN IF NOT EXISTS faculty_author_id uuid;

-- Same drift tolerance for course_modules: vw_course_authoring_readiness
-- references review_state_updated_at (set by PR #2's state-transition
-- triggers). In production this column is set alongside content_review_state,
-- but a fresh CI DB rebuilt from migrations may not yet carry it.
ALTER TABLE public.course_modules
  ADD COLUMN IF NOT EXISTS review_state_updated_at timestamptz;

-- ---------- Golden Path identifiers (deterministic) ------------------
-- UUIDs are stable so the test suite + UI can address the scaffold.
-- Prefix '66666666-c771-...' is reserved for CT1 Golden Path rows.

-- ---------- 1. Golden Path course row --------------------------------
INSERT INTO public.courses (
  id, title, description, curriculum_status, created_at
)
SELECT
  '66666666-c771-0001-0000-000000000001'::uuid,
  'UNIV 101 — Introduction to Scholarly Research & Writing',
  'The Golden Path foundation course. Students develop the research, '
    || 'critical reading, and academic writing habits required across every '
    || 'ScrollUniversity programme. Authoring status: in development.',
  'pending_authorship',
  now()
WHERE EXISTS (
  SELECT 1 FROM information_schema.columns
   WHERE table_schema='public' AND table_name='courses' AND column_name='curriculum_status'
)
ON CONFLICT (id) DO NOTHING;

-- Fall-back insert when curriculum_status column is absent in some
-- historical environments (CI bootstrap drift tolerant).
INSERT INTO public.courses (id, title, description)
SELECT
  '66666666-c771-0001-0000-000000000001'::uuid,
  'UNIV 101 — Introduction to Scholarly Research & Writing',
  'The Golden Path foundation course. Students develop the research, '
    || 'critical reading, and academic writing habits required across every '
    || 'ScrollUniversity programme. Authoring status: in development.'
WHERE NOT EXISTS (
  SELECT 1 FROM public.courses
   WHERE id = '66666666-c771-0001-0000-000000000001'::uuid
)
ON CONFLICT (id) DO NOTHING;

-- ---------- 2. Course learning outcomes ------------------------------
DO $$
DECLARE
  v_course uuid := '66666666-c771-0001-0000-000000000001'::uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.courses WHERE id = v_course) THEN
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                  WHERE table_schema='public' AND table_name='course_learning_outcomes') THEN
    RETURN;
  END IF;

  INSERT INTO public.course_learning_outcomes (id, course_id, code, statement, bloom_level)
  VALUES
    ('66666666-c771-0001-0001-000000000001', v_course, 'CLO-1',
     'Identify a scholarly question, evaluate the state of its evidence, '
     || 'and articulate a defensible thesis supported by that evidence.',
     'evaluate'),
    ('66666666-c771-0001-0001-000000000002', v_course, 'CLO-2',
     'Locate, read, and cite primary and secondary sources accurately, '
     || 'distinguishing argument from assertion and evidence from opinion.',
     'analyze'),
    ('66666666-c771-0001-0001-000000000003', v_course, 'CLO-3',
     'Produce a 2,500–3,500 word research paper in a recognized academic style, '
     || 'revised through independent peer and faculty feedback.',
     'create')
  ON CONFLICT (course_id, code) DO NOTHING;
END$$;

-- ---------- 3. Eight module skeletons (draft) ------------------------
-- The INSERT trigger from PR #2 hardening normalizes new modules to
-- content_review_state='draft', revision=1, source='legacy' (since
-- content_md is empty), so these are safely invisible to students.
DO $$
DECLARE
  v_course uuid := '66666666-c771-0001-0000-000000000001'::uuid;
  v_titles text[] := ARRAY[
    'Module 1: What scholarship is — and is not',
    'Module 2: Reading a scholarly argument',
    'Module 3: Locating credible sources',
    'Module 4: Taking notes that survive revision',
    'Module 5: Framing a researchable question',
    'Module 6: Drafting a defensible thesis',
    'Module 7: Revision as the engine of thought',
    'Module 8: Capstone — your first scholarly paper'
  ];
  i int;
  v_mod_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.courses WHERE id = v_course) THEN
    RETURN;
  END IF;

  FOR i IN 1..8 LOOP
    v_mod_id := ('66666666-c771-0001-0002-' || lpad(i::text, 12, '0'))::uuid;

    INSERT INTO public.course_modules (id, course_id, title, order_index)
    VALUES (v_mod_id, v_course, v_titles[i], i)
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
END$$;

-- ---------- 4. One assessment + one assignment under module 1 --------
-- Stubs only; faculty authors real question banks + rubrics later.
DO $$
DECLARE
  v_course uuid := '66666666-c771-0001-0000-000000000001'::uuid;
  v_module uuid := '66666666-c771-0001-0002-000000000001'::uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.course_modules WHERE id = v_module) THEN
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables
              WHERE table_schema='public' AND table_name='assessments') THEN
    BEGIN
      INSERT INTO public.assessments (id, module_id, title, description, assessment_type, max_score, passing_score)
      VALUES (
        '66666666-c771-0001-0003-000000000001'::uuid,
        v_module,
        'Module 1 — Reading check',
        'Short MCQ check that the student can distinguish scholarship from assertion.',
        'quiz',
        100,
        70
      )
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'CT1a: assessments insert skipped (%)', SQLERRM;
    END;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables
              WHERE table_schema='public' AND table_name='assignments') THEN
    BEGIN
      INSERT INTO public.assignments (id, module_id, course_id, title, description, assignment_type)
      VALUES (
        '66666666-c771-0001-0004-000000000001'::uuid,
        v_module, v_course,
        'Module 1 — Reflective reading log',
        'Student logs three sources read this module, with one sentence per source '
          || 'distinguishing claim from evidence.',
        'practical'
      )
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'CT1a: assignments insert skipped (%)', SQLERRM;
    END;
  END IF;
END$$;

-- ---------- 5. Authoring-readiness view ------------------------------
-- Per-module punch-list showing exactly what evaluate_module_quality
-- would flag. Reusable across every course — not just the Golden Path.
CREATE OR REPLACE VIEW public.vw_course_authoring_readiness AS
SELECT
  m.id                                                    AS module_id,
  m.course_id,
  c.title                                                 AS course_title,
  m.order_index,
  m.title                                                 AS module_title,
  m.content_review_state,
  m.content_revision,
  COALESCE(m.content_char_count, length(COALESCE(m.content_md, '')), 0)
                                                           AS content_char_count,
  8000                                                    AS content_char_threshold,
  CASE
    WHEN COALESCE(m.content_char_count, length(COALESCE(m.content_md, '')), 0) >= 8000
    THEN true ELSE false
  END                                                     AS content_long_enough,
  (CASE WHEN m.content_md ILIKE '%ignition%' OR m.content_md ILIKE '%hook%' OR m.content_md ILIKE '%opening question%' THEN 1 ELSE 0 END) +
  (CASE WHEN m.content_md ILIKE '%demonstration%' OR m.content_md ILIKE '%worked example%' THEN 1 ELSE 0 END) +
  (CASE WHEN m.content_md ILIKE '%activation%' OR m.content_md ILIKE '%your turn%' OR m.content_md ILIKE '%try this%' THEN 1 ELSE 0 END) +
  (CASE WHEN m.content_md ILIKE '%reflect%' THEN 1 ELSE 0 END) +
  (CASE WHEN m.content_md ILIKE '%commission%' OR m.content_md ILIKE '%next step%' OR m.content_md ILIKE '%go and do%' THEN 1 ELSE 0 END) +
  (CASE WHEN m.content_md ILIKE '%scripture%' OR m.content_md ILIKE '%biblical%' THEN 1 ELSE 0 END)
                                                           AS flow_markers_present,
  4                                                        AS flow_markers_threshold,
  COALESCE(m.quality_verified, false)                     AS quality_verified,
  m.review_state_updated_at
FROM public.course_modules m
JOIN public.courses c ON c.id = m.course_id;

COMMENT ON VIEW public.vw_course_authoring_readiness IS
  'CT1a: per-module authoring punch-list. Shows what evaluate_module_quality '
  'would flag before publish_module_content can succeed. Reusable across the '
  'catalog — not Golden-Path-specific.';

GRANT SELECT ON public.vw_course_authoring_readiness TO authenticated;

COMMENT ON COLUMN public.courses.curriculum_status IS
  'Course authorship/governance state. The Golden Path course '
  '(66666666-c771-0001-0000-000000000001) ships in pending_authorship '
  'until faculty finish module content and the course is governance-approved.';
