
DO $$ BEGIN CREATE TYPE public.academic_term_type AS ENUM ('fall','spring','summer','winter','trimester','custom'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.academic_term_status AS ENUM ('planned','open','in_session','closed','archived'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.grade_status AS ENUM ('in_progress','provisional','final','withdrawn','incomplete'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.transcript_kind AS ENUM ('unofficial','official'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.academic_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  term_type public.academic_term_type NOT NULL DEFAULT 'custom',
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  add_drop_ends_on date,
  withdraw_ends_on date,
  status public.academic_term_status NOT NULL DEFAULT 'planned',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_on >= starts_on)
);
ALTER TABLE public.academic_terms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "terms readable by all" ON public.academic_terms FOR SELECT USING (true);
CREATE POLICY "terms manageable by admin/registrar" ON public.academic_terms FOR ALL
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'registrar'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'registrar'));

CREATE TABLE IF NOT EXISTS public.course_credit_standards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL UNIQUE,
  credit_hours numeric(4,2) NOT NULL CHECK (credit_hours >= 0),
  contact_hours numeric(5,2) NOT NULL CHECK (contact_hours >= 0),
  out_of_class_hours numeric(5,2) NOT NULL DEFAULT 0 CHECK (out_of_class_hours >= 0),
  level text NOT NULL DEFAULT 'undergraduate',
  rationale text,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.course_credit_standards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "credit standards readable" ON public.course_credit_standards FOR SELECT USING (true);
CREATE POLICY "credit standards managed" ON public.course_credit_standards FOR ALL
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'registrar'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'registrar'));

CREATE TABLE IF NOT EXISTS public.term_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term_id uuid NOT NULL REFERENCES public.academic_terms(id) ON DELETE RESTRICT,
  student_id uuid NOT NULL,
  course_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'enrolled',
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  dropped_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (term_id, student_id, course_id)
);
ALTER TABLE public.term_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "students view own term enrollments" ON public.term_enrollments FOR SELECT
  USING (student_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'registrar') OR public.has_role(auth.uid(),'faculty'));
CREATE POLICY "registrars manage term enrollments" ON public.term_enrollments FOR ALL
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'registrar'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'registrar'));

CREATE TABLE IF NOT EXISTS public.grade_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term_id uuid NOT NULL REFERENCES public.academic_terms(id) ON DELETE RESTRICT,
  student_id uuid NOT NULL,
  course_id uuid NOT NULL,
  credit_hours numeric(4,2) NOT NULL,
  letter_grade text,
  grade_points numeric(4,2),
  status public.grade_status NOT NULL DEFAULT 'in_progress',
  posted_by uuid,
  posted_at timestamptz,
  finalized_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (term_id, student_id, course_id)
);
ALTER TABLE public.grade_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "students view own grades" ON public.grade_records FOR SELECT
  USING (student_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'registrar') OR public.has_role(auth.uid(),'faculty'));
CREATE POLICY "registrars manage grades" ON public.grade_records FOR ALL
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'registrar'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'registrar'));

CREATE OR REPLACE FUNCTION public.tg_grade_records_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'final' AND OLD.finalized_at IS NOT NULL THEN
    IF NEW.letter_grade IS DISTINCT FROM OLD.letter_grade
       OR NEW.grade_points IS DISTINCT FROM OLD.grade_points
       OR NEW.credit_hours IS DISTINCT FROM OLD.credit_hours
       OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.student_id IS DISTINCT FROM OLD.student_id
       OR NEW.course_id IS DISTINCT FROM OLD.course_id
       OR NEW.term_id IS DISTINCT FROM OLD.term_id THEN
      RAISE EXCEPTION 'Finalized grade records are immutable';
    END IF;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.status = 'final' AND NEW.finalized_at IS NULL THEN
    NEW.finalized_at := now();
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_grade_records_immutable ON public.grade_records;
CREATE TRIGGER trg_grade_records_immutable BEFORE UPDATE ON public.grade_records
  FOR EACH ROW EXECUTE FUNCTION public.tg_grade_records_immutable();

CREATE OR REPLACE FUNCTION public.tg_grade_records_no_delete()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'final' THEN
    RAISE EXCEPTION 'Finalized grade records cannot be deleted';
  END IF;
  RETURN OLD;
END $$;
DROP TRIGGER IF EXISTS trg_grade_records_no_delete ON public.grade_records;
CREATE TRIGGER trg_grade_records_no_delete BEFORE DELETE ON public.grade_records
  FOR EACH ROW EXECUTE FUNCTION public.tg_grade_records_no_delete();

CREATE TABLE IF NOT EXISTS public.official_transcripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  kind public.transcript_kind NOT NULL DEFAULT 'unofficial',
  issued_by uuid,
  issued_at timestamptz NOT NULL DEFAULT now(),
  verification_code text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(12),'hex'),
  gpa numeric(4,2),
  total_credit_hours numeric(6,2) NOT NULL DEFAULT 0,
  snapshot jsonb NOT NULL,
  revoked_at timestamptz,
  revoke_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.official_transcripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "students view own official transcripts" ON public.official_transcripts FOR SELECT
  USING (student_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'registrar'));
CREATE POLICY "registrars issue official transcripts" ON public.official_transcripts FOR INSERT
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'registrar'));
CREATE POLICY "registrars revoke official transcripts" ON public.official_transcripts FOR UPDATE
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'registrar'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'registrar'));

CREATE OR REPLACE FUNCTION public.tg_official_transcripts_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.snapshot IS DISTINCT FROM OLD.snapshot
     OR NEW.gpa IS DISTINCT FROM OLD.gpa
     OR NEW.total_credit_hours IS DISTINCT FROM OLD.total_credit_hours
     OR NEW.student_id IS DISTINCT FROM OLD.student_id
     OR NEW.kind IS DISTINCT FROM OLD.kind
     OR NEW.verification_code IS DISTINCT FROM OLD.verification_code
     OR NEW.issued_at IS DISTINCT FROM OLD.issued_at THEN
    RAISE EXCEPTION 'Issued transcripts are immutable (only revocation allowed)';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_official_transcripts_immutable ON public.official_transcripts;
CREATE TRIGGER trg_official_transcripts_immutable BEFORE UPDATE ON public.official_transcripts
  FOR EACH ROW EXECUTE FUNCTION public.tg_official_transcripts_immutable();

CREATE OR REPLACE FUNCTION public.tg_official_transcripts_no_delete()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Official transcripts cannot be deleted';
END $$;
DROP TRIGGER IF EXISTS trg_official_transcripts_no_delete ON public.official_transcripts;
CREATE TRIGGER trg_official_transcripts_no_delete BEFORE DELETE ON public.official_transcripts
  FOR EACH ROW EXECUTE FUNCTION public.tg_official_transcripts_no_delete();

CREATE OR REPLACE FUNCTION public.verify_official_transcript(code text)
RETURNS TABLE (
  verification_code text,
  kind public.transcript_kind,
  issued_at timestamptz,
  total_credit_hours numeric,
  gpa numeric,
  revoked boolean,
  revoke_reason text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.verification_code, t.kind, t.issued_at, t.total_credit_hours, t.gpa,
         (t.revoked_at IS NOT NULL) AS revoked, t.revoke_reason
  FROM public.official_transcripts t
  WHERE t.verification_code = code
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.compute_student_gpa(p_student_id uuid)
RETURNS TABLE (gpa numeric, total_credit_hours numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    CASE WHEN SUM(credit_hours) > 0
      THEN ROUND(SUM(grade_points * credit_hours)::numeric / SUM(credit_hours)::numeric, 2)
      ELSE NULL END AS gpa,
    COALESCE(SUM(credit_hours),0) AS total_credit_hours
  FROM public.grade_records
  WHERE student_id = p_student_id AND status = 'final' AND grade_points IS NOT NULL;
$$;

DROP TRIGGER IF EXISTS trg_terms_updated ON public.academic_terms;
CREATE TRIGGER trg_terms_updated BEFORE UPDATE ON public.academic_terms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_ccs_updated ON public.course_credit_standards;
CREATE TRIGGER trg_ccs_updated BEFORE UPDATE ON public.course_credit_standards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_te_updated ON public.term_enrollments;
CREATE TRIGGER trg_te_updated BEFORE UPDATE ON public.term_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_gr_updated ON public.grade_records;
CREATE TRIGGER trg_gr_updated BEFORE UPDATE ON public.grade_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_grade_records_student ON public.grade_records(student_id);
CREATE INDEX IF NOT EXISTS idx_grade_records_term ON public.grade_records(term_id);
CREATE INDEX IF NOT EXISTS idx_term_enrollments_student ON public.term_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_official_transcripts_student ON public.official_transcripts(student_id);
