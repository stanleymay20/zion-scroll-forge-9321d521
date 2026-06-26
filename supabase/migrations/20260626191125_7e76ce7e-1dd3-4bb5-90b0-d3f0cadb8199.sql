
-- Fix notify_standing_changed: column is user_id, not student_id
CREATE OR REPLACE FUNCTION public.notify_standing_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.standing = NEW.standing THEN RETURN NEW; END IF;
  PERFORM public.emit_notification(
    NEW.user_id,
    'Academic standing updated',
    'Your academic standing is now: '||NEW.standing,
    'standing_changed',
    'student_academic_standing', NEW.id,
    jsonb_build_object('standing', NEW.standing, 'gpa', NEW.gpa)
  );
  RETURN NEW;
END;
$function$;

-- Fix notify_grade_posted: 'posted' is not a valid grade_status enum value
-- Canonical posting state is 'final'. Drop the legacy 'posted' comparison.
CREATE OR REPLACE FUNCTION public.notify_grade_posted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _course text;
BEGIN
  IF NEW.status IS DISTINCT FROM 'final'::grade_status THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status AND OLD.letter_grade IS NOT DISTINCT FROM NEW.letter_grade THEN
    RETURN NEW;
  END IF;
  SELECT c.title INTO _course
    FROM public.courses c WHERE c.id = NEW.course_id;
  PERFORM public.emit_notification(
    NEW.student_id,
    'Grade posted',
    COALESCE('Your grade for '||_course||' has been posted: '||NEW.letter_grade, 'A grade has been posted.'),
    'grade_posted',
    'grade_records', NEW.id,
    jsonb_build_object('course_id', NEW.course_id, 'letter_grade', NEW.letter_grade, 'grade_points', NEW.grade_points)
  );
  RETURN NEW;
END;
$function$;
