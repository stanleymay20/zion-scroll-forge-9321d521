
DO $$ BEGIN
  CREATE TYPE public.issued_credential_kind AS ENUM (
    'certificate','diploma','associate','bachelor','master','doctorate','supreme','honor'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.issued_credential_status AS ENUM ('issued','revoked','expired','superseded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.issued_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  kind public.issued_credential_kind NOT NULL,
  title text NOT NULL,
  program_ref text,
  program_id uuid,
  issued_by uuid,
  issued_at timestamptz NOT NULL DEFAULT now(),
  effective_on date NOT NULL DEFAULT (now()::date),
  expires_on date,
  verification_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16),'hex'),
  seal_hash text NOT NULL,
  snapshot jsonb NOT NULL,
  status public.issued_credential_status NOT NULL DEFAULT 'issued',
  revoked_at timestamptz,
  revoke_reason text,
  supersedes_id uuid REFERENCES public.issued_credentials(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_issued_credentials_student ON public.issued_credentials(student_id);
CREATE INDEX IF NOT EXISTS idx_issued_credentials_kind ON public.issued_credentials(kind);

ALTER TABLE public.issued_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "student sees own issued credentials" ON public.issued_credentials;
CREATE POLICY "student sees own issued credentials" ON public.issued_credentials FOR SELECT
  USING (student_id = auth.uid()
         OR public.has_role(auth.uid(),'admin')
         OR public.has_role(auth.uid(),'registrar')
         OR public.has_role(auth.uid(),'faculty'));

DROP POLICY IF EXISTS "registrar issues credentials" ON public.issued_credentials;
CREATE POLICY "registrar issues credentials" ON public.issued_credentials FOR INSERT
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'registrar'));

DROP POLICY IF EXISTS "registrar revokes credentials" ON public.issued_credentials;
CREATE POLICY "registrar revokes credentials" ON public.issued_credentials FOR UPDATE
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'registrar'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'registrar'));

CREATE TABLE IF NOT EXISTS public.credential_revocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id uuid NOT NULL REFERENCES public.issued_credentials(id) ON DELETE RESTRICT,
  reason text NOT NULL,
  revoked_by uuid,
  revoked_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.credential_revocations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "revocations readable to staff and owner" ON public.credential_revocations;
CREATE POLICY "revocations readable to staff and owner" ON public.credential_revocations FOR SELECT
  USING (public.has_role(auth.uid(),'admin')
         OR public.has_role(auth.uid(),'registrar')
         OR EXISTS (SELECT 1 FROM public.issued_credentials ic WHERE ic.id = credential_id AND ic.student_id = auth.uid()));
DROP POLICY IF EXISTS "registrar writes revocations" ON public.credential_revocations;
CREATE POLICY "registrar writes revocations" ON public.credential_revocations FOR INSERT
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'registrar'));

-- Seal + immutability triggers
CREATE OR REPLACE FUNCTION public.tg_issued_credentials_seal()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.seal_hash IS NULL OR length(NEW.seal_hash) = 0 THEN
    NEW.seal_hash := encode(digest(
      coalesce(NEW.snapshot::text,'') || '|' ||
      NEW.student_id::text || '|' ||
      NEW.kind::text || '|' ||
      NEW.title || '|' ||
      NEW.issued_at::text,
      'sha256'), 'hex');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_issued_credentials_seal ON public.issued_credentials;
CREATE TRIGGER trg_issued_credentials_seal
  BEFORE INSERT ON public.issued_credentials
  FOR EACH ROW EXECUTE FUNCTION public.tg_issued_credentials_seal();

CREATE OR REPLACE FUNCTION public.tg_issued_credentials_immutable()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.snapshot IS DISTINCT FROM OLD.snapshot
     OR NEW.student_id IS DISTINCT FROM OLD.student_id
     OR NEW.kind IS DISTINCT FROM OLD.kind
     OR NEW.title IS DISTINCT FROM OLD.title
     OR NEW.issued_at IS DISTINCT FROM OLD.issued_at
     OR NEW.verification_token IS DISTINCT FROM OLD.verification_token
     OR NEW.seal_hash IS DISTINCT FROM OLD.seal_hash
     OR NEW.effective_on IS DISTINCT FROM OLD.effective_on THEN
    RAISE EXCEPTION 'Issued credentials are immutable (only status/revocation/expiry/supersession allowed)';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_issued_credentials_immutable ON public.issued_credentials;
CREATE TRIGGER trg_issued_credentials_immutable
  BEFORE UPDATE ON public.issued_credentials
  FOR EACH ROW EXECUTE FUNCTION public.tg_issued_credentials_immutable();

CREATE OR REPLACE FUNCTION public.tg_issued_credentials_no_delete()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'Issued credentials cannot be deleted';
END $$;
DROP TRIGGER IF EXISTS trg_issued_credentials_no_delete ON public.issued_credentials;
CREATE TRIGGER trg_issued_credentials_no_delete
  BEFORE DELETE ON public.issued_credentials
  FOR EACH ROW EXECUTE FUNCTION public.tg_issued_credentials_no_delete();

-- Public verification (fail-closed). Logs every attempt to credential_verification_log.
CREATE OR REPLACE FUNCTION public.verify_issued_credential(token text, verifier_org text DEFAULT NULL)
RETURNS TABLE (
  verification_token text,
  kind public.issued_credential_kind,
  title text,
  program_ref text,
  issued_at timestamptz,
  effective_on date,
  expires_on date,
  status public.issued_credential_status,
  seal_hash text,
  revoked boolean,
  revoke_reason text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row public.issued_credentials%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.issued_credentials WHERE verification_token = token LIMIT 1;

  BEGIN
    INSERT INTO public.credential_verification_log
      (credential_token, credential_type, verified_subject, verifier_org, outcome)
    VALUES (
      token,
      COALESCE(v_row.kind::text,'unknown'),
      COALESCE(v_row.title,'not_found'),
      verifier_org,
      CASE
        WHEN v_row.id IS NULL THEN 'not_found'
        WHEN v_row.status = 'revoked' THEN 'revoked'
        WHEN v_row.expires_on IS NOT NULL AND v_row.expires_on < now()::date THEN 'expired'
        ELSE 'valid'
      END
    );
  EXCEPTION WHEN OTHERS THEN
    -- Logging is best-effort; never block verification on log failure.
    NULL;
  END;

  IF v_row.id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY SELECT
    v_row.verification_token, v_row.kind, v_row.title, v_row.program_ref,
    v_row.issued_at, v_row.effective_on, v_row.expires_on, v_row.status,
    v_row.seal_hash, (v_row.status = 'revoked'), v_row.revoke_reason;
END $$;

-- Issuance gate: validates a student is eligible for a given degree kind before allowing issuance.
CREATE OR REPLACE FUNCTION public.check_credential_eligibility(p_student_id uuid, p_kind public.issued_credential_kind)
RETURNS TABLE (eligible boolean, reason text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_final_credits numeric;
  v_gpa numeric;
BEGIN
  SELECT total_credit_hours, gpa INTO v_final_credits, v_gpa FROM public.compute_student_gpa(p_student_id);
  v_final_credits := COALESCE(v_final_credits, 0);

  IF p_kind IN ('bachelor','master','doctorate','supreme') AND v_final_credits < 30 THEN
    RETURN QUERY SELECT false, 'Insufficient finalized credit hours for this credential tier';
    RETURN;
  END IF;
  IF p_kind IN ('master','doctorate','supreme') AND (v_gpa IS NULL OR v_gpa < 3.0) THEN
    RETURN QUERY SELECT false, 'GPA threshold not met for graduate-tier credential';
    RETURN;
  END IF;

  RETURN QUERY SELECT true, 'Eligibility checks passed';
END $$;
