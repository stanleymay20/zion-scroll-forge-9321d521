CREATE OR REPLACE FUNCTION public.ensure_default_institution_membership()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_inst_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT id INTO v_inst_id
  FROM public.institutions
  WHERE slug = 'scrolluniversity'
  LIMIT 1;

  IF v_inst_id IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.institution_members (institution_id, user_id, role, status, joined_at)
  VALUES (v_inst_id, v_user_id, 'student', 'active', now())
  ON CONFLICT (institution_id, user_id) DO UPDATE
    SET status = 'active';

  UPDATE public.profiles
     SET current_institution_id = v_inst_id
   WHERE id = v_user_id;

  RETURN v_inst_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_default_institution_membership() TO authenticated;