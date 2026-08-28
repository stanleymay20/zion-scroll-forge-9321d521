-- Launch P0: make authorization assignments backend-controlled.
-- Historical migrations created a platform-owner "GodMode" bypass and at one
-- point allowed users/admins to mutate role rows from browser sessions. At
-- launch, authorization must come only from explicit user_roles rows written
-- by trusted backend/service workflows.

DO $$
BEGIN
  IF to_regclass('public.user_roles') IS NULL THEN
    RAISE EXCEPTION 'launch role authority requires public.user_roles';
  END IF;
END $$;

-- Older production schemas may already have user_roles from a narrower table
-- definition. CREATE TABLE IF NOT EXISTS in historical migrations does not add
-- later lifecycle columns to an existing relation, so establish the exact two
-- authority fields this launch boundary depends on. Existing assignments remain
-- active by default and unexpired until a trusted backend explicitly changes
-- them; this preserves current access while making future deactivation auditable.
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

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

-- Canonical authorization predicate: only explicit, active, unexpired
-- user_roles assignments count. user_roles.role exists as text in the original
-- canonical table and as app_role-aware callers in later migrations, so compare
-- their textual values explicitly rather than relying on an implicit cast.
-- No platform-owner, email, profile field, or recency heuristic can confer a role.
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
      AND ur.role::text = _role::text
      AND ur.is_active
      AND (ur.expires_at IS NULL OR ur.expires_at > now())
  );
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

COMMENT ON FUNCTION public.has_role(uuid, public.app_role)
IS 'Launch authority predicate: roles come only from explicit active backend-controlled public.user_roles assignments; legacy platform-owner GodMode is not an authorization source.';
