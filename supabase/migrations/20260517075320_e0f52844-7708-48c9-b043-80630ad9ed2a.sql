-- ============================================================
-- PR7: Public Trust Surface & Claim Verification Layer
-- ============================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE public.claim_type AS ENUM (
    'accreditation','faculty','curriculum','practicum','employment',
    'research','ai_tutor','infrastructure','partnership','transcript_equivalency'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.claim_verification_state AS ENUM (
    'not_yet_verified','under_review','pilot','experimental','internal_only','verified','expired','retracted'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.claim_subject_kind AS ENUM (
    'program','course','faculty','institution','partnership','infrastructure','ai_capability'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- public_claims
-- ============================================================
CREATE TABLE IF NOT EXISTS public.public_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_type public.claim_type NOT NULL,
  subject_kind public.claim_subject_kind NOT NULL,
  subject_id UUID,
  subject_label TEXT NOT NULL,
  statement TEXT NOT NULL,
  scope_notes TEXT,
  verification_state public.claim_verification_state NOT NULL DEFAULT 'not_yet_verified',
  reviewer_user_id UUID,
  reviewer_role TEXT,
  reviewed_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  retraction_reason TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  proposed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_public_claims_subject ON public.public_claims (subject_kind, subject_id);
CREATE INDEX IF NOT EXISTS idx_public_claims_type_state ON public.public_claims (claim_type, verification_state);

ALTER TABLE public.public_claims ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- claim_evidence_links
-- ============================================================
CREATE TABLE IF NOT EXISTS public.claim_evidence_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES public.public_claims(id) ON DELETE CASCADE,
  evidence_table TEXT NOT NULL,
  evidence_id UUID NOT NULL,
  evidence_summary TEXT,
  evidence_verified BOOLEAN NOT NULL DEFAULT false,
  evidence_expires_at TIMESTAMPTZ,
  linked_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_claim_evidence_links_claim ON public.claim_evidence_links (claim_id);

ALTER TABLE public.claim_evidence_links ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- trust_transparency_reports
-- ============================================================
CREATE TABLE IF NOT EXISTS public.trust_transparency_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  summary TEXT NOT NULL,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  narrative TEXT,
  published_at TIMESTAMPTZ,
  published_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trust_transparency_reports ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- public_verification_snapshots (append-only audit)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.public_verification_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES public.public_claims(id) ON DELETE CASCADE,
  verification_state public.claim_verification_state NOT NULL,
  reviewer_user_id UUID,
  reviewer_role TEXT,
  evidence_count INT NOT NULL DEFAULT 0,
  unexpired_evidence_count INT NOT NULL DEFAULT 0,
  snapshot_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verification_snapshots_claim ON public.public_verification_snapshots (claim_id, created_at DESC);

ALTER TABLE public.public_verification_snapshots ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Core visibility rule
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_claim_publicly_visible(_claim_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.public_claims c
    WHERE c.id = _claim_id
      AND c.is_published = true
      AND c.verification_state = 'verified'
      AND c.reviewer_user_id IS NOT NULL
      AND (c.expires_at IS NULL OR c.expires_at > now())
      AND EXISTS (
        SELECT 1 FROM public.claim_evidence_links e
        WHERE e.claim_id = c.id
          AND e.evidence_verified = true
          AND (e.evidence_expires_at IS NULL OR e.evidence_expires_at > now())
      )
  );
$$;

-- ============================================================
-- Snapshot generator
-- ============================================================
CREATE OR REPLACE FUNCTION public.snapshot_claim_verification(_claim_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c RECORD;
  ev_count INT;
  ev_active INT;
  snap_id UUID;
BEGIN
  SELECT * INTO c FROM public.public_claims WHERE id = _claim_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT count(*), count(*) FILTER (
    WHERE evidence_verified AND (evidence_expires_at IS NULL OR evidence_expires_at > now())
  )
  INTO ev_count, ev_active
  FROM public.claim_evidence_links WHERE claim_id = _claim_id;

  INSERT INTO public.public_verification_snapshots
    (claim_id, verification_state, reviewer_user_id, reviewer_role,
     evidence_count, unexpired_evidence_count, snapshot_payload)
  VALUES
    (c.id, c.verification_state, c.reviewer_user_id, c.reviewer_role,
     COALESCE(ev_count,0), COALESCE(ev_active,0),
     jsonb_build_object(
       'statement', c.statement,
       'subject_label', c.subject_label,
       'claim_type', c.claim_type,
       'expires_at', c.expires_at,
       'is_published', c.is_published
     ))
  RETURNING id INTO snap_id;

  RETURN snap_id;
END $$;

-- Auto-snapshot on state change
CREATE OR REPLACE FUNCTION public.tg_snapshot_on_state_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.verification_state IS DISTINCT FROM OLD.verification_state
     OR NEW.is_published IS DISTINCT FROM OLD.is_published THEN
    PERFORM public.snapshot_claim_verification(NEW.id);
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_public_claims_snapshot ON public.public_claims;
CREATE TRIGGER trg_public_claims_snapshot
AFTER INSERT OR UPDATE ON public.public_claims
FOR EACH ROW EXECUTE FUNCTION public.tg_snapshot_on_state_change();

-- Block deleting evidence on verified claims
CREATE OR REPLACE FUNCTION public.tg_block_claim_evidence_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE st public.claim_verification_state;
BEGIN
  SELECT verification_state INTO st FROM public.public_claims WHERE id = OLD.claim_id;
  IF st = 'verified' THEN
    RAISE EXCEPTION 'Cannot delete evidence link on a verified claim (claim_id=%). Retract the claim first.', OLD.claim_id;
  END IF;
  RETURN OLD;
END $$;

DROP TRIGGER IF EXISTS trg_block_claim_evidence_delete ON public.claim_evidence_links;
CREATE TRIGGER trg_block_claim_evidence_delete
BEFORE DELETE ON public.claim_evidence_links
FOR EACH ROW EXECUTE FUNCTION public.tg_block_claim_evidence_delete();

-- ============================================================
-- RLS policies
-- ============================================================

-- public_claims: public can read only publicly-visible rows
DROP POLICY IF EXISTS "Public can view verified visible claims" ON public.public_claims;
CREATE POLICY "Public can view verified visible claims"
ON public.public_claims FOR SELECT
USING (public.is_claim_publicly_visible(id));

DROP POLICY IF EXISTS "Staff can view all claims" ON public.public_claims;
CREATE POLICY "Staff can view all claims"
ON public.public_claims FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(),'admin') OR
  public.has_role(auth.uid(),'superadmin') OR
  public.has_role(auth.uid(),'registrar') OR
  public.has_role(auth.uid(),'faculty')
);

DROP POLICY IF EXISTS "Staff can insert claims" ON public.public_claims;
CREATE POLICY "Staff can insert claims"
ON public.public_claims FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(),'admin') OR
  public.has_role(auth.uid(),'superadmin') OR
  public.has_role(auth.uid(),'registrar') OR
  public.has_role(auth.uid(),'faculty')
);

DROP POLICY IF EXISTS "Only governance can update/verify claims" ON public.public_claims;
CREATE POLICY "Only governance can update/verify claims"
ON public.public_claims FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(),'admin') OR
  public.has_role(auth.uid(),'superadmin') OR
  public.has_role(auth.uid(),'registrar')
)
WITH CHECK (
  public.has_role(auth.uid(),'admin') OR
  public.has_role(auth.uid(),'superadmin') OR
  public.has_role(auth.uid(),'registrar')
);

-- claim_evidence_links
DROP POLICY IF EXISTS "Public can view evidence on visible claims" ON public.claim_evidence_links;
CREATE POLICY "Public can view evidence on visible claims"
ON public.claim_evidence_links FOR SELECT
USING (public.is_claim_publicly_visible(claim_id));

DROP POLICY IF EXISTS "Staff can view all evidence links" ON public.claim_evidence_links;
CREATE POLICY "Staff can view all evidence links"
ON public.claim_evidence_links FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(),'admin') OR
  public.has_role(auth.uid(),'superadmin') OR
  public.has_role(auth.uid(),'registrar') OR
  public.has_role(auth.uid(),'faculty')
);

DROP POLICY IF EXISTS "Governance can manage evidence links" ON public.claim_evidence_links;
CREATE POLICY "Governance can manage evidence links"
ON public.claim_evidence_links FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(),'admin') OR
  public.has_role(auth.uid(),'superadmin') OR
  public.has_role(auth.uid(),'registrar')
)
WITH CHECK (
  public.has_role(auth.uid(),'admin') OR
  public.has_role(auth.uid(),'superadmin') OR
  public.has_role(auth.uid(),'registrar')
);

-- trust_transparency_reports
DROP POLICY IF EXISTS "Public can view published reports" ON public.trust_transparency_reports;
CREATE POLICY "Public can view published reports"
ON public.trust_transparency_reports FOR SELECT
USING (published_at IS NOT NULL);

DROP POLICY IF EXISTS "Staff can view all reports" ON public.trust_transparency_reports;
CREATE POLICY "Staff can view all reports"
ON public.trust_transparency_reports FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(),'admin') OR
  public.has_role(auth.uid(),'superadmin') OR
  public.has_role(auth.uid(),'registrar')
);

DROP POLICY IF EXISTS "Governance can manage reports" ON public.trust_transparency_reports;
CREATE POLICY "Governance can manage reports"
ON public.trust_transparency_reports FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(),'admin') OR
  public.has_role(auth.uid(),'superadmin') OR
  public.has_role(auth.uid(),'registrar')
)
WITH CHECK (
  public.has_role(auth.uid(),'admin') OR
  public.has_role(auth.uid(),'superadmin') OR
  public.has_role(auth.uid(),'registrar')
);

-- public_verification_snapshots: append-only, public can read snapshots for visible claims
DROP POLICY IF EXISTS "Public can view snapshots of visible claims" ON public.public_verification_snapshots;
CREATE POLICY "Public can view snapshots of visible claims"
ON public.public_verification_snapshots FOR SELECT
USING (public.is_claim_publicly_visible(claim_id));

DROP POLICY IF EXISTS "Staff can view all snapshots" ON public.public_verification_snapshots;
CREATE POLICY "Staff can view all snapshots"
ON public.public_verification_snapshots FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(),'admin') OR
  public.has_role(auth.uid(),'superadmin') OR
  public.has_role(auth.uid(),'registrar') OR
  public.has_role(auth.uid(),'faculty')
);

-- No UPDATE/DELETE policies on snapshots = immutable.

-- ============================================================
-- Helper RPC: program verification surface
-- ============================================================
CREATE OR REPLACE FUNCTION public.program_verification_surface(_program_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'claim_type', c.claim_type,
    'statement', c.statement,
    'verification_state', c.verification_state,
    'reviewer_role', c.reviewer_role,
    'verified_at', c.verified_at,
    'expires_at', c.expires_at,
    'evidence_count', (SELECT count(*) FROM public.claim_evidence_links e WHERE e.claim_id = c.id AND e.evidence_verified)
  )), '[]'::jsonb)
  INTO claims
  FROM public.public_claims c
  WHERE c.subject_kind = 'program'
    AND c.subject_id = _program_id
    AND public.is_claim_publicly_visible(c.id);

  RETURN jsonb_build_object('program_id', _program_id, 'claims', claims);
END $$;