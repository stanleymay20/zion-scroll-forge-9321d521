
CREATE OR REPLACE FUNCTION public.touch_tutor_student_memory()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
