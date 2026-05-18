
-- ============================================================
-- PR10: Thesis / Dissertation & Defense System
-- ============================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE public.thesis_project_type AS ENUM ('capstone','thesis','dissertation');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.thesis_status AS ENUM (
    'proposal_draft','proposal_submitted','proposal_approved',
    'in_progress','submitted_for_defense','defense_scheduled',
    'defended','revisions_required','passed','failed','withdrawn','archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.thesis_committee_role AS ENUM (
    'chair','supervisor','co_supervisor','internal_examiner','external_examiner','observer'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.thesis_member_state AS ENUM ('invited','accepted','declined','removed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.thesis_submission_kind AS ENUM ('proposal','draft','revision','final');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.thesis_recommendation AS ENUM (
    'accept','accept_with_minor_revisions','major_revisions','reject'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.thesis_defense_mode AS ENUM ('oral_public','oral_closed','virtual_public','virtual_closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.thesis_defense_status AS ENUM ('scheduled','in_progress','completed','cancelled','postponed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.thesis_vote_value AS ENUM ('pass','pass_with_revisions','major_revisions','fail','abstain');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.thesis_integrity_kind AS ENUM ('plagiarism','ai_misuse','data_integrity','authorship','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.thesis_flag_state AS ENUM ('open','under_review','dismissed','substantiated','remediated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- thesis_projects
-- ============================================================
CREATE TABLE IF NOT EXISTS public.thesis_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  degree_program_id UUID,
  project_type public.thesis_project_type NOT NULL,
  title TEXT NOT NULL,
  abstract TEXT,
  research_questions TEXT[],
  ethics_required BOOLEAN NOT NULL DEFAULT false,
  ethics_approved_at TIMESTAMPTZ,
  status public.thesis_status NOT NULL DEFAULT 'proposal_draft',
  current_stage TEXT NOT NULL DEFAULT 'proposal',
  supervisor_id UUID,
  self_reported_originality NUMERIC(5,2),
  verified_similarity_score NUMERIC(5,2),
  ai_assistance_disclosure TEXT,
  final_outcome public.thesis_recommendation,
  passed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_thesis_projects_student ON public.thesis_projects(student_id);
CREATE INDEX IF NOT EXISTS idx_thesis_projects_status ON public.thesis_projects(status);

-- ============================================================
-- thesis_committees + members
-- ============================================================
CREATE TABLE IF NOT EXISTS public.thesis_committees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thesis_id UUID NOT NULL REFERENCES public.thesis_projects(id) ON DELETE CASCADE,
  formed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  formed_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (thesis_id)
);

CREATE TABLE IF NOT EXISTS public.thesis_committee_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id UUID NOT NULL REFERENCES public.thesis_committees(id) ON DELETE CASCADE,
  member_id UUID NOT NULL,
  role public.thesis_committee_role NOT NULL,
  state public.thesis_member_state NOT NULL DEFAULT 'invited',
  is_external BOOLEAN NOT NULL DEFAULT false,
  external_affiliation TEXT,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (committee_id, member_id, role)
);
CREATE INDEX IF NOT EXISTS idx_thesis_cm_member ON public.thesis_committee_members(member_id);

-- ============================================================
-- thesis_submissions (immutable versions)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.thesis_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thesis_id UUID NOT NULL REFERENCES public.thesis_projects(id) ON DELETE RESTRICT,
  kind public.thesis_submission_kind NOT NULL,
  version INTEGER NOT NULL,
  file_url TEXT,
  word_count INTEGER,
  similarity_score NUMERIC(5,2),
  ai_assistance_disclosure TEXT,
  submitted_by UUID NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (thesis_id, kind, version)
);
CREATE INDEX IF NOT EXISTS idx_thesis_sub_thesis ON public.thesis_submissions(thesis_id);

-- ============================================================
-- thesis_reviews (per committee member, per submission)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.thesis_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.thesis_submissions(id) ON DELETE RESTRICT,
  reviewer_id UUID NOT NULL,
  reviewer_role public.thesis_committee_role NOT NULL,
  rubric_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  written_feedback TEXT,
  recommendation public.thesis_recommendation NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (submission_id, reviewer_id)
);

-- ============================================================
-- thesis_defenses + votes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.thesis_defenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thesis_id UUID NOT NULL REFERENCES public.thesis_projects(id) ON DELETE RESTRICT,
  submission_id UUID REFERENCES public.thesis_submissions(id),
  mode public.thesis_defense_mode NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 90,
  location TEXT,
  virtual_link TEXT,
  status public.thesis_defense_status NOT NULL DEFAULT 'scheduled',
  computed_outcome public.thesis_recommendation,
  outcome_computed_at TIMESTAMPTZ,
  is_public BOOLEAN GENERATED ALWAYS AS (mode IN ('oral_public','virtual_public')) STORED,
  scheduled_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_thesis_def_thesis ON public.thesis_defenses(thesis_id);
CREATE INDEX IF NOT EXISTS idx_thesis_def_public ON public.thesis_defenses(is_public, status, scheduled_at);

CREATE TABLE IF NOT EXISTS public.thesis_defense_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  defense_id UUID NOT NULL REFERENCES public.thesis_defenses(id) ON DELETE RESTRICT,
  examiner_id UUID NOT NULL,
  examiner_role public.thesis_committee_role NOT NULL,
  vote public.thesis_vote_value NOT NULL,
  rationale TEXT,
  cast_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (defense_id, examiner_id)
);

-- ============================================================
-- thesis_milestones
-- ============================================================
CREATE TABLE IF NOT EXISTS public.thesis_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thesis_id UUID NOT NULL REFERENCES public.thesis_projects(id) ON DELETE CASCADE,
  milestone_key TEXT NOT NULL,
  label TEXT NOT NULL,
  required BOOLEAN NOT NULL DEFAULT true,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  verified_by UUID,
  evidence_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (thesis_id, milestone_key)
);

-- ============================================================
-- thesis_integrity_flags
-- ============================================================
CREATE TABLE IF NOT EXISTS public.thesis_integrity_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thesis_id UUID NOT NULL REFERENCES public.thesis_projects(id) ON DELETE RESTRICT,
  submission_id UUID REFERENCES public.thesis_submissions(id),
  kind public.thesis_integrity_kind NOT NULL,
  state public.thesis_flag_state NOT NULL DEFAULT 'open',
  detected_by_ai BOOLEAN NOT NULL DEFAULT false,
  raised_by UUID,
  description TEXT NOT NULL,
  evidence JSONB,
  resolution_notes TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_thesis_flag_thesis ON public.thesis_integrity_flags(thesis_id);

-- ============================================================
-- Triggers: updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.tg_thesis_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DO $$ DECLARE t TEXT; BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'thesis_projects','thesis_committees','thesis_committee_members',
    'thesis_defenses','thesis_milestones','thesis_integrity_flags'
  ]) LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS tg_touch_%1$s ON public.%1$s;
       CREATE TRIGGER tg_touch_%1$s BEFORE UPDATE ON public.%1$s
       FOR EACH ROW EXECUTE FUNCTION public.tg_thesis_touch_updated_at();', t);
  END LOOP;
END $$;

-- ============================================================
-- Immutability: locked rows cannot be updated/deleted
-- ============================================================
CREATE OR REPLACE FUNCTION public.tg_thesis_block_locked_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND COALESCE(OLD.locked, true) THEN
    RAISE EXCEPTION 'Immutable record (%) cannot be deleted', TG_TABLE_NAME;
  END IF;
  IF TG_OP = 'UPDATE' AND COALESCE(OLD.locked, true) THEN
    RAISE EXCEPTION 'Immutable record (%) cannot be modified', TG_TABLE_NAME;
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS tg_lock_thesis_submissions ON public.thesis_submissions;
CREATE TRIGGER tg_lock_thesis_submissions
BEFORE UPDATE OR DELETE ON public.thesis_submissions
FOR EACH ROW EXECUTE FUNCTION public.tg_thesis_block_locked_change();

DROP TRIGGER IF EXISTS tg_lock_thesis_reviews ON public.thesis_reviews;
CREATE TRIGGER tg_lock_thesis_reviews
BEFORE UPDATE OR DELETE ON public.thesis_reviews
FOR EACH ROW EXECUTE FUNCTION public.tg_thesis_block_locked_change();

DROP TRIGGER IF EXISTS tg_lock_thesis_defense_votes ON public.thesis_defense_votes;
CREATE TRIGGER tg_lock_thesis_defense_votes
BEFORE UPDATE OR DELETE ON public.thesis_defense_votes
FOR EACH ROW EXECUTE FUNCTION public.tg_thesis_block_locked_change();

-- Block deletion of resolved integrity flags
CREATE OR REPLACE FUNCTION public.tg_thesis_block_flag_delete()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.state IN ('substantiated','dismissed','remediated') THEN
    RAISE EXCEPTION 'Resolved integrity flags cannot be deleted (archived only).';
  END IF;
  RETURN OLD;
END $$;
DROP TRIGGER IF EXISTS tg_block_flag_delete ON public.thesis_integrity_flags;
CREATE TRIGGER tg_block_flag_delete
BEFORE DELETE ON public.thesis_integrity_flags
FOR EACH ROW EXECUTE FUNCTION public.tg_thesis_block_flag_delete();

-- ============================================================
-- Defense outcome computation (from committee votes)
-- ============================================================
CREATE OR REPLACE FUNCTION public.compute_thesis_defense_outcome(p_defense_id UUID)
RETURNS public.thesis_recommendation
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_thesis UUID;
  v_total INTEGER; v_pass INTEGER; v_pass_rev INTEGER;
  v_major INTEGER; v_fail INTEGER; v_required INTEGER;
  v_open_flags INTEGER;
  v_outcome public.thesis_recommendation;
BEGIN
  SELECT thesis_id INTO v_thesis FROM public.thesis_defenses WHERE id = p_defense_id;
  IF v_thesis IS NULL THEN RETURN NULL; END IF;

  SELECT COUNT(*) INTO v_open_flags FROM public.thesis_integrity_flags
   WHERE thesis_id = v_thesis AND state IN ('open','under_review');

  SELECT
    COUNT(*) FILTER (WHERE vote = 'pass'),
    COUNT(*) FILTER (WHERE vote = 'pass_with_revisions'),
    COUNT(*) FILTER (WHERE vote = 'major_revisions'),
    COUNT(*) FILTER (WHERE vote = 'fail'),
    COUNT(*) FILTER (WHERE vote <> 'abstain')
  INTO v_pass, v_pass_rev, v_major, v_fail, v_total
  FROM public.thesis_defense_votes WHERE defense_id = p_defense_id;

  SELECT GREATEST(2, COUNT(*)) INTO v_required
  FROM public.thesis_committee_members tcm
  JOIN public.thesis_committees tc ON tc.id = tcm.committee_id
  WHERE tc.thesis_id = v_thesis
    AND tcm.state = 'accepted'
    AND tcm.role IN ('chair','supervisor','internal_examiner','external_examiner');

  IF v_total < v_required THEN RETURN NULL; END IF;

  IF v_fail >= 1 THEN v_outcome := 'reject';
  ELSIF v_major >= 1 THEN v_outcome := 'major_revisions';
  ELSIF v_pass_rev >= 1 THEN v_outcome := 'accept_with_minor_revisions';
  ELSE v_outcome := 'accept';
  END IF;

  -- Fail-closed on open integrity flags
  IF v_open_flags > 0 AND v_outcome = 'accept' THEN
    v_outcome := 'major_revisions';
  END IF;

  RETURN v_outcome;
END $$;

CREATE OR REPLACE FUNCTION public.tg_thesis_recompute_defense_outcome()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_def UUID; v_outcome public.thesis_recommendation; v_thesis UUID; BEGIN
  v_def := COALESCE(NEW.defense_id, OLD.defense_id);
  v_outcome := public.compute_thesis_defense_outcome(v_def);
  UPDATE public.thesis_defenses
     SET computed_outcome = v_outcome,
         outcome_computed_at = now(),
         status = CASE WHEN v_outcome IS NOT NULL THEN 'completed' ELSE status END
   WHERE id = v_def
   RETURNING thesis_id INTO v_thesis;

  IF v_outcome IS NOT NULL AND v_thesis IS NOT NULL THEN
    UPDATE public.thesis_projects
       SET status = CASE
             WHEN v_outcome = 'accept' THEN 'passed'::public.thesis_status
             WHEN v_outcome = 'accept_with_minor_revisions' THEN 'revisions_required'::public.thesis_status
             WHEN v_outcome = 'major_revisions' THEN 'revisions_required'::public.thesis_status
             WHEN v_outcome = 'reject' THEN 'failed'::public.thesis_status
             ELSE status
           END,
           final_outcome = v_outcome,
           passed_at = CASE WHEN v_outcome = 'accept' THEN now() ELSE passed_at END
     WHERE id = v_thesis;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tg_thesis_defense_vote_outcome ON public.thesis_defense_votes;
CREATE TRIGGER tg_thesis_defense_vote_outcome
AFTER INSERT ON public.thesis_defense_votes
FOR EACH ROW EXECUTE FUNCTION public.tg_thesis_recompute_defense_outcome();

-- ============================================================
-- Helper: is_thesis_committee_member
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_thesis_committee_member(_thesis_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.thesis_committee_members tcm
    JOIN public.thesis_committees tc ON tc.id = tcm.committee_id
    WHERE tc.thesis_id = _thesis_id
      AND tcm.member_id = _user_id
      AND tcm.state = 'accepted'
  );
$$;

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.thesis_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thesis_committees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thesis_committee_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thesis_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thesis_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thesis_defenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thesis_defense_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thesis_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thesis_integrity_flags ENABLE ROW LEVEL SECURITY;

-- thesis_projects
DROP POLICY IF EXISTS "thesis_projects_student_select" ON public.thesis_projects;
CREATE POLICY "thesis_projects_student_select" ON public.thesis_projects
FOR SELECT TO authenticated
USING (
  student_id = auth.uid()
  OR supervisor_id = auth.uid()
  OR public.is_thesis_committee_member(id, auth.uid())
  OR public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'superadmin')
  OR public.has_role(auth.uid(),'registrar')
  OR public.has_role(auth.uid(),'faculty')
);

DROP POLICY IF EXISTS "thesis_projects_student_insert" ON public.thesis_projects;
CREATE POLICY "thesis_projects_student_insert" ON public.thesis_projects
FOR INSERT TO authenticated
WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "thesis_projects_student_update" ON public.thesis_projects;
CREATE POLICY "thesis_projects_student_update" ON public.thesis_projects
FOR UPDATE TO authenticated
USING (
  (student_id = auth.uid() AND status IN ('proposal_draft','proposal_submitted','in_progress','revisions_required'))
  OR public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'superadmin')
  OR public.has_role(auth.uid(),'registrar')
);

-- committees
DROP POLICY IF EXISTS "thesis_committees_select" ON public.thesis_committees;
CREATE POLICY "thesis_committees_select" ON public.thesis_committees
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.thesis_projects p WHERE p.id = thesis_id AND p.student_id = auth.uid())
  OR public.is_thesis_committee_member(thesis_id, auth.uid())
  OR public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'superadmin')
  OR public.has_role(auth.uid(),'registrar')
  OR public.has_role(auth.uid(),'faculty')
);

DROP POLICY IF EXISTS "thesis_committees_admin_write" ON public.thesis_committees;
CREATE POLICY "thesis_committees_admin_write" ON public.thesis_committees
FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'registrar'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'registrar'));

DROP POLICY IF EXISTS "thesis_cm_select" ON public.thesis_committee_members;
CREATE POLICY "thesis_cm_select" ON public.thesis_committee_members
FOR SELECT TO authenticated
USING (
  member_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.thesis_committees c
    JOIN public.thesis_projects p ON p.id = c.thesis_id
    WHERE c.id = committee_id AND (p.student_id = auth.uid() OR p.supervisor_id = auth.uid())
  )
  OR public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'superadmin')
  OR public.has_role(auth.uid(),'registrar')
  OR public.has_role(auth.uid(),'faculty')
);

DROP POLICY IF EXISTS "thesis_cm_admin_write" ON public.thesis_committee_members;
CREATE POLICY "thesis_cm_admin_write" ON public.thesis_committee_members
FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'registrar'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'registrar'));

DROP POLICY IF EXISTS "thesis_cm_self_respond" ON public.thesis_committee_members;
CREATE POLICY "thesis_cm_self_respond" ON public.thesis_committee_members
FOR UPDATE TO authenticated
USING (member_id = auth.uid())
WITH CHECK (member_id = auth.uid());

-- submissions
DROP POLICY IF EXISTS "thesis_sub_select" ON public.thesis_submissions;
CREATE POLICY "thesis_sub_select" ON public.thesis_submissions
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.thesis_projects p WHERE p.id = thesis_id AND p.student_id = auth.uid())
  OR public.is_thesis_committee_member(thesis_id, auth.uid())
  OR public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'superadmin')
  OR public.has_role(auth.uid(),'registrar')
  OR public.has_role(auth.uid(),'faculty')
);

DROP POLICY IF EXISTS "thesis_sub_student_insert" ON public.thesis_submissions;
CREATE POLICY "thesis_sub_student_insert" ON public.thesis_submissions
FOR INSERT TO authenticated
WITH CHECK (
  submitted_by = auth.uid()
  AND EXISTS (SELECT 1 FROM public.thesis_projects p WHERE p.id = thesis_id AND p.student_id = auth.uid())
);

-- reviews
DROP POLICY IF EXISTS "thesis_review_select" ON public.thesis_reviews;
CREATE POLICY "thesis_review_select" ON public.thesis_reviews
FOR SELECT TO authenticated
USING (
  reviewer_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.thesis_submissions s
    JOIN public.thesis_projects p ON p.id = s.thesis_id
    WHERE s.id = submission_id AND p.student_id = auth.uid()
  )
  OR public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'superadmin')
  OR public.has_role(auth.uid(),'registrar')
);

DROP POLICY IF EXISTS "thesis_review_member_insert" ON public.thesis_reviews;
CREATE POLICY "thesis_review_member_insert" ON public.thesis_reviews
FOR INSERT TO authenticated
WITH CHECK (
  reviewer_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.thesis_submissions s
    WHERE s.id = submission_id
      AND public.is_thesis_committee_member(s.thesis_id, auth.uid())
  )
);

-- defenses
DROP POLICY IF EXISTS "thesis_def_public_select" ON public.thesis_defenses;
CREATE POLICY "thesis_def_public_select" ON public.thesis_defenses
FOR SELECT TO anon, authenticated
USING (
  is_public = true AND status IN ('scheduled','completed')
);

DROP POLICY IF EXISTS "thesis_def_governed_select" ON public.thesis_defenses;
CREATE POLICY "thesis_def_governed_select" ON public.thesis_defenses
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.thesis_projects p WHERE p.id = thesis_id AND p.student_id = auth.uid())
  OR public.is_thesis_committee_member(thesis_id, auth.uid())
  OR public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'superadmin')
  OR public.has_role(auth.uid(),'registrar')
  OR public.has_role(auth.uid(),'faculty')
);

DROP POLICY IF EXISTS "thesis_def_admin_write" ON public.thesis_defenses;
CREATE POLICY "thesis_def_admin_write" ON public.thesis_defenses
FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'registrar'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'registrar'));

-- defense votes
DROP POLICY IF EXISTS "thesis_vote_select" ON public.thesis_defense_votes;
CREATE POLICY "thesis_vote_select" ON public.thesis_defense_votes
FOR SELECT TO authenticated
USING (
  examiner_id = auth.uid()
  OR public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'superadmin')
  OR public.has_role(auth.uid(),'registrar')
);

DROP POLICY IF EXISTS "thesis_vote_examiner_insert" ON public.thesis_defense_votes;
CREATE POLICY "thesis_vote_examiner_insert" ON public.thesis_defense_votes
FOR INSERT TO authenticated
WITH CHECK (
  examiner_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.thesis_defenses d
    WHERE d.id = defense_id
      AND public.is_thesis_committee_member(d.thesis_id, auth.uid())
  )
);

-- milestones
DROP POLICY IF EXISTS "thesis_milestone_select" ON public.thesis_milestones;
CREATE POLICY "thesis_milestone_select" ON public.thesis_milestones
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.thesis_projects p WHERE p.id = thesis_id AND p.student_id = auth.uid())
  OR public.is_thesis_committee_member(thesis_id, auth.uid())
  OR public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'superadmin')
  OR public.has_role(auth.uid(),'registrar')
  OR public.has_role(auth.uid(),'faculty')
);

DROP POLICY IF EXISTS "thesis_milestone_write" ON public.thesis_milestones;
CREATE POLICY "thesis_milestone_write" ON public.thesis_milestones
FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'registrar') OR public.has_role(auth.uid(),'faculty'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'registrar') OR public.has_role(auth.uid(),'faculty'));

-- integrity flags
DROP POLICY IF EXISTS "thesis_flag_select" ON public.thesis_integrity_flags;
CREATE POLICY "thesis_flag_select" ON public.thesis_integrity_flags
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.thesis_projects p WHERE p.id = thesis_id AND p.student_id = auth.uid())
  OR public.is_thesis_committee_member(thesis_id, auth.uid())
  OR public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'superadmin')
  OR public.has_role(auth.uid(),'registrar')
  OR public.has_role(auth.uid(),'faculty')
);

DROP POLICY IF EXISTS "thesis_flag_write" ON public.thesis_integrity_flags;
CREATE POLICY "thesis_flag_write" ON public.thesis_integrity_flags
FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'registrar') OR public.has_role(auth.uid(),'faculty'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'registrar') OR public.has_role(auth.uid(),'faculty'));
