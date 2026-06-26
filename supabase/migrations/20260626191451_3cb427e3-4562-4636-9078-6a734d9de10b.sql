
-- Production drift: grade_records had no producer for academic_records_audit, so finalized
-- grades were silently un-audited. Add canonical audit trigger.
CREATE OR REPLACE FUNCTION public.audit_grade_finalization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status = 'final'::grade_status)
     OR (TG_OP = 'UPDATE' AND NEW.status = 'final'::grade_status
         AND OLD.status IS DISTINCT FROM 'final'::grade_status) THEN
    INSERT INTO public.academic_records_audit(
      event_type, student_id, term_id, course_id, section_id, grade_record_id, actor_id, payload)
    VALUES (
      'grade_finalized', NEW.student_id, NEW.term_id, NEW.course_id, NEW.section_id, NEW.id,
      COALESCE(auth.uid(), NEW.posted_by),
      jsonb_build_object('letter_grade', NEW.letter_grade, 'grade_points', NEW.grade_points,
                         'percentage', NEW.percentage, 'credit_hours', NEW.credit_hours));
  END IF;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS trg_audit_grade_finalization ON public.grade_records;
CREATE TRIGGER trg_audit_grade_finalization
  AFTER INSERT OR UPDATE OF status ON public.grade_records
  FOR EACH ROW EXECUTE FUNCTION public.audit_grade_finalization();

-- Backfill audit rows for any historically-finalized grades that have no audit entry
INSERT INTO public.academic_records_audit(
  event_type, student_id, term_id, course_id, section_id, grade_record_id, actor_id, payload)
SELECT 'grade_finalized_backfill', gr.student_id, gr.term_id, gr.course_id, gr.section_id, gr.id,
       gr.posted_by,
       jsonb_build_object('letter_grade', gr.letter_grade, 'grade_points', gr.grade_points,
                          'percentage', gr.percentage, 'credit_hours', gr.credit_hours,
                          'backfilled_at', now())
FROM public.grade_records gr
WHERE gr.status = 'final'
  AND NOT EXISTS (SELECT 1 FROM public.academic_records_audit a WHERE a.grade_record_id = gr.id);
