-- Launch P0: make authorization assignments backend-controlled.
-- Historical migrations created a platform-owner "GodMode" bypass and at one
-- point allowed users/admins to mutate role rows from browser sessions.  At
-- launch, authorization must come only from explicit user_roles rows written
-- by trusted backend/service workflows.

DO $$
BEGIN
  IF to_regclass('public.user_roles') IS NULL THEN
    RAISE EXCEPTION 'launch role authority requires public.user_roles';
  END IF;
END $$;

-- Browser roles may inspect only what RLS permits; they cannot grant, change,
-- or remove authorization assignments directly.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.user_roles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.user_roles TO authenticated;

DROP POLICY IF EXISTS "user_roles_self_insert" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_self_update" ON public.user_roles;
DROP POLICY IF EXISTS "only_admins_assign_roles" ON public.user_roles;
DROP POLICY IF EXISTS "only_admins_update_roles" ON public.user_roles;

-- The legacy platform_owners table may remain as historical metadata, but it
-- is not an authorization source and cannot be mutated from browser roles.
DO $$
BEGIN
  IF to_regclass('public.platform_owners') IS NOT NULL THEN
    REVOKE INSERT, UPDATE, DELETE ON TABLE public.platform_owners FROM PUBLIC, anon, authenticated;
    GRANT SELECT ON TABLE public.platform_owners TO authenticated;
  END IF;
END $$;

-- Canonical authorization predicate: only explicit user_roles assignments
-- count.  No "most recently active profile", platform-owner, email, or profile
-- field can confer a role.
CREATE OR REPLACE FUNCTION public.has_role(
  _user_id uuid,
  _role public.app_role
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role = _role
  );
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

COMMENT ON FUNCTION public.has_role(uuid, public.app_role)
IS 'Launch authority predicate: roles come only from explicit backend-controlled public.user_roles assignments; legacy platform-owner GodMode is not an authorization source.';
