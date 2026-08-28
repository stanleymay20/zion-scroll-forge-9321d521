-- Launch P0: maintenance mode must fail closed for protected write RPCs.
-- A historical term-rollover compatibility shim can create a no-op
-- assert_not_maintenance() when the original operations migration does not
-- bootstrap cleanly. Reassert the intended production behavior explicitly.

DO $$
BEGIN
  IF to_regclass('public.maintenance_settings') IS NULL THEN
    RAISE EXCEPTION 'launch maintenance authority requires public.maintenance_settings';
  END IF;

  IF to_regprocedure('public.has_role(uuid,public.app_role)') IS NULL THEN
    RAISE EXCEPTION 'launch maintenance authority requires canonical has_role(uuid, app_role)';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.is_maintenance_mode()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT ms.is_enabled
       FROM public.maintenance_settings ms
      WHERE ms.id = true),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.assert_not_maintenance()
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF public.is_maintenance_mode()
     AND NOT (
       public.has_role(auth.uid(), 'admin'::public.app_role)
       OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
     ) THEN
    RAISE EXCEPTION 'maintenance_mode_active'
      USING HINT = 'The platform is in maintenance mode. Writes are temporarily disabled.';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.is_maintenance_mode() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_maintenance_mode() TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.assert_not_maintenance() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assert_not_maintenance() TO authenticated, service_role;

COMMENT ON FUNCTION public.assert_not_maintenance()
IS 'Launch maintenance gate: blocks protected writes during maintenance for every caller except explicit active admin/superadmin role assignments.';
