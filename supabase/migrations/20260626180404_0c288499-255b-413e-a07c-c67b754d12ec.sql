-- ============================================================================
-- CI Academic Spine Repair (idempotent safety net)
-- ----------------------------------------------------------------------------
-- This migration is a no-op against production (every object already exists)
-- but guarantees that a fresh CI database — where earlier migrations may be
-- skipped due to Supabase-only dependencies — still contains the academic
-- spine objects required by:
--   supabase/tests/academic_spine.test.sql
--   supabase/tests/lifecycle_behavior.test.sql
--   supabase/tests/lifecycle_invariants.test.sql
--   supabase/tests/executive_scope_isolation.test.sql
--
-- Rules:
--   • CREATE TABLE IF NOT EXISTS only — never alters existing columns.
--   • Functions are created ONLY if absent. Production overloads are preserved.
--   • Triggers are dropped+recreated only when their parent table exists.
--   • All SECURITY DEFINER functions pin search_path = public.
-- ============================================================================

-- ── Stub students table (CI only; prod is richer) ──────────────────────────
CREATE TABLE IF NOT EXISTS public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  full_name text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='students' AND policyname='students_self_select') THEN
    CREATE POLICY "students_self_select" ON public.students FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='students' AND policyname='students_service_all') THEN
    CREATE POLICY "students_service_all" ON public.students FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── student_academic_standing ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.student_academic_standing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  term_id uuid,
  semester_id uuid,
  gpa numeric,
  cumulative_gpa numeric,
  credits_earned integer,
  credits_attempted integer,
  standing text,
  dean_list boolean DEFAULT false,
  honors text,
  plo_attainment_rate numeric,
  intervention_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  computed_inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  computed_by uuid,
  evidence_sufficient boolean NOT NULL DEFAULT false,
  last_calculated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_academic_standing TO authenticated;
GRANT ALL ON public.student_academic_standing TO service_role;
ALTER TABLE public.student_academic_standing ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='student_academic_standing' AND policyname='sas_self_select') THEN
    CREATE POLICY "sas_self_select" ON public.student_academic_standing FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='student_academic_standing' AND policyname='sas_service_all') THEN
    CREATE POLICY "sas_service_all" ON public.student_academic_standing FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── graduation_candidates ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.graduation_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  degree_program_id uuid,
  academic_year_id uuid,
  expected_graduation_date date,
  application_date timestamptz,
  requirements_met jsonb DEFAULT '{}'::jsonb,
  gpa_requirement_met boolean DEFAULT false,
  credits_requirement_met boolean DEFAULT false,
  spiritual_formation_met boolean DEFAULT false,
  capstone_completed boolean DEFAULT false,
  financial_clearance boolean DEFAULT false,
  status text DEFAULT 'pending',
  ceremony_participation boolean DEFAULT false,
  reviewed_by uuid,
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.graduation_candidates TO authenticated;
GRANT ALL ON public.graduation_candidates TO service_role;
ALTER TABLE public.graduation_candidates ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='graduation_candidates' AND policyname='gc_self_select') THEN
    CREATE POLICY "gc_self_select" ON public.graduation_candidates FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='graduation_candidates' AND policyname='gc_self_apply') THEN
    CREATE POLICY "gc_self_apply" ON public.graduation_candidates FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='graduation_candidates' AND policyname='gc_service_all') THEN
    CREATE POLICY "gc_service_all" ON public.graduation_candidates FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── Registrar RPC stubs (only if production version is absent) ─────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='enroll_student_in_section'
  ) THEN
    EXECUTE $fn$
      CREATE FUNCTION public.enroll_student_in_section(_section_id uuid)
      RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $body$
      BEGIN
        RETURN jsonb_build_object('ok', false, 'reason', 'ci_stub_only');
      END $body$;
    $fn$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='drop_section_enrollment'
  ) THEN
    EXECUTE $fn$
      CREATE FUNCTION public.drop_section_enrollment(_enrollment_id uuid, _reason text DEFAULT NULL)
      RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $body$
      BEGIN
        RETURN jsonb_build_object('ok', false, 'reason', 'ci_stub_only');
      END $body$;
    $fn$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='generate_transcript'
  ) THEN
    EXECUTE $fn$
      CREATE FUNCTION public.generate_transcript(_student_id uuid)
      RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $body$
      BEGIN
        RETURN jsonb_build_object('student_id', _student_id, 'courses', '[]'::jsonb, 'gpa', 0);
      END $body$;
    $fn$;
  END IF;
END $$;

-- ── Notification trigger producers (CI-safe, idempotent) ──────────────────
-- Stub notifications table so trigger functions compile in a bare CI DB.
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  title text,
  body text,
  type text,
  related_id uuid,
  related_type text,
  is_read boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  event_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notifications' AND policyname='notif_self_select') THEN
    CREATE POLICY "notif_self_select" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notifications' AND policyname='notif_service_all') THEN
    CREATE POLICY "notif_service_all" ON public.notifications FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- CI-safe trigger function stubs. Only created if production version absent.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                 WHERE n.nspname='public' AND p.proname='notify_grade_posted') THEN
    EXECUTE $fn$
      CREATE FUNCTION public.notify_grade_posted() RETURNS trigger
      LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $body$
      BEGIN
        INSERT INTO public.notifications(user_id, title, type, related_id, related_type, event_key)
        VALUES (COALESCE(NEW.student_id, NEW.user_id), 'Grade posted', 'grade_posted', NEW.id, 'grade_records',
                'grade_posted:'||NEW.id::text);
        RETURN NEW;
      END $body$;
    $fn$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                 WHERE n.nspname='public' AND p.proname='notify_standing_changed') THEN
    EXECUTE $fn$
      CREATE FUNCTION public.notify_standing_changed() RETURNS trigger
      LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $body$
      BEGIN
        INSERT INTO public.notifications(user_id, title, type, related_id, related_type, event_key)
        VALUES (NEW.user_id, 'Academic standing updated', 'standing_changed', NEW.id, 'student_academic_standing',
                'standing:'||NEW.id::text);
        RETURN NEW;
      END $body$;
    $fn$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                 WHERE n.nspname='public' AND p.proname='notify_advising_flag') THEN
    EXECUTE $fn$
      CREATE FUNCTION public.notify_advising_flag() RETURNS trigger
      LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $body$
      BEGIN
        INSERT INTO public.notifications(user_id, title, type, related_id, related_type, event_key)
        VALUES (NEW.student_user_id, 'Advising flag raised', 'advising_flag', NEW.id, 'student_advising_flags',
                'advising_flag:'||NEW.id::text);
        RETURN NEW;
      END $body$;
    $fn$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                 WHERE n.nspname='public' AND p.proname='notify_intervention_assigned') THEN
    EXECUTE $fn$
      CREATE FUNCTION public.notify_intervention_assigned() RETURNS trigger
      LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $body$
      BEGIN
        INSERT INTO public.notifications(user_id, title, type, related_id, related_type, event_key)
        VALUES (NEW.user_id, 'Intervention assigned', 'intervention_assigned', NEW.id, 'outcome_intervention',
                'intervention:'||NEW.id::text);
        RETURN NEW;
      END $body$;
    $fn$;
  END IF;
END $$;

-- Attach triggers only when their parent table exists.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='grade_records')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_notify_grade_posted') THEN
    EXECUTE 'CREATE TRIGGER trg_notify_grade_posted AFTER INSERT OR UPDATE ON public.grade_records
             FOR EACH ROW EXECUTE FUNCTION public.notify_grade_posted()';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='student_academic_standing')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_notify_standing_changed') THEN
    EXECUTE 'CREATE TRIGGER trg_notify_standing_changed AFTER INSERT OR UPDATE ON public.student_academic_standing
             FOR EACH ROW EXECUTE FUNCTION public.notify_standing_changed()';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='student_advising_flags')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_notify_advising_flag') THEN
    EXECUTE 'CREATE TRIGGER trg_notify_advising_flag AFTER INSERT ON public.student_advising_flags
             FOR EACH ROW EXECUTE FUNCTION public.notify_advising_flag()';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='outcome_intervention')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_notify_intervention_assigned') THEN
    EXECUTE 'CREATE TRIGGER trg_notify_intervention_assigned AFTER INSERT ON public.outcome_intervention
             FOR EACH ROW EXECUTE FUNCTION public.notify_intervention_assigned()';
  END IF;
END $$;
