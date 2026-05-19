
-- Enums
CREATE TYPE public.ledger_entry_type AS ENUM ('tuition_charge','fee_charge','payment','aid_disbursement','refund','adjustment','reversal');
CREATE TYPE public.aid_award_kind AS ENUM ('scholarship','grant','work_study','sponsorship','waiver');
CREATE TYPE public.aid_award_status AS ENUM ('offered','accepted','declined','disbursed','revoked');
CREATE TYPE public.account_hold_kind AS ENUM ('financial','academic','conduct','administrative');
CREATE TYPE public.account_hold_status AS ENUM ('active','released');

-- Ledger
CREATE TABLE public.student_account_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id UUID NOT NULL,
  term_id UUID REFERENCES public.academic_terms(id),
  entry_type public.ledger_entry_type NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  memo TEXT NOT NULL,
  reference_id UUID,
  reverses_entry_id UUID REFERENCES public.student_account_ledger(id),
  posted_by UUID NOT NULL,
  posted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (amount <> 0)
);
CREATE INDEX idx_sal_student ON public.student_account_ledger(student_user_id, posted_at DESC);
ALTER TABLE public.student_account_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "students view own ledger" ON public.student_account_ledger
FOR SELECT USING (student_user_id = auth.uid()
  OR public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'registrar')
  OR public.has_role(auth.uid(),'superadmin'));

CREATE POLICY "bursar posts ledger" ON public.student_account_ledger
FOR INSERT WITH CHECK (
  posted_by = auth.uid() AND (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'registrar')
    OR public.has_role(auth.uid(),'superadmin')
  )
);

CREATE OR REPLACE FUNCTION public.tg_ledger_immutable() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN RAISE EXCEPTION 'Ledger entries are immutable. Post a reversal instead.'; END IF;
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Ledger entries cannot be deleted.'; END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER tg_ledger_no_update BEFORE UPDATE ON public.student_account_ledger
FOR EACH ROW EXECUTE FUNCTION public.tg_ledger_immutable();
CREATE TRIGGER tg_ledger_no_delete BEFORE DELETE ON public.student_account_ledger
FOR EACH ROW EXECUTE FUNCTION public.tg_ledger_immutable();

-- Financial aid awards
CREATE TABLE public.financial_aid_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id UUID NOT NULL,
  term_id UUID REFERENCES public.academic_terms(id),
  kind public.aid_award_kind NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  status public.aid_award_status NOT NULL DEFAULT 'offered',
  source TEXT NOT NULL,
  notes TEXT,
  offered_by UUID NOT NULL,
  offered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ,
  disbursed_ledger_id UUID REFERENCES public.student_account_ledger(id),
  revoked_reason TEXT
);
CREATE INDEX idx_faa_student ON public.financial_aid_awards(student_user_id);
ALTER TABLE public.financial_aid_awards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "students view own awards" ON public.financial_aid_awards
FOR SELECT USING (student_user_id = auth.uid()
  OR public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'registrar')
  OR public.has_role(auth.uid(),'superadmin'));

CREATE POLICY "bursar offers awards" ON public.financial_aid_awards
FOR INSERT WITH CHECK (
  offered_by = auth.uid() AND (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'registrar')
    OR public.has_role(auth.uid(),'superadmin')
  )
);

CREATE POLICY "bursar updates awards" ON public.financial_aid_awards
FOR UPDATE USING (
  public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'registrar')
  OR public.has_role(auth.uid(),'superadmin')
  OR (student_user_id = auth.uid() AND status = 'offered')
);

CREATE OR REPLACE FUNCTION public.tg_aid_state_machine() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'disbursed' AND NEW.status <> 'disbursed' THEN
    RAISE EXCEPTION 'Disbursed awards cannot change status. Post a reversal.';
  END IF;
  IF OLD.status = 'revoked' AND NEW.status <> 'revoked' THEN
    RAISE EXCEPTION 'Revoked awards are terminal.';
  END IF;
  IF OLD.status = 'declined' AND NEW.status <> 'declined' THEN
    RAISE EXCEPTION 'Declined awards are terminal.';
  END IF;
  IF NEW.status IN ('accepted','declined','disbursed','revoked') AND NEW.decided_at IS NULL THEN
    NEW.decided_at := now();
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER tg_aid_states BEFORE UPDATE ON public.financial_aid_awards
FOR EACH ROW EXECUTE FUNCTION public.tg_aid_state_machine();

-- Account holds
CREATE TABLE public.account_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id UUID NOT NULL,
  kind public.account_hold_kind NOT NULL,
  status public.account_hold_status NOT NULL DEFAULT 'active',
  reason TEXT NOT NULL,
  placed_by UUID NOT NULL,
  placed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  released_by UUID,
  released_at TIMESTAMPTZ,
  release_note TEXT
);
CREATE INDEX idx_holds_student ON public.account_holds(student_user_id, status);
ALTER TABLE public.account_holds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "students view own holds" ON public.account_holds
FOR SELECT USING (student_user_id = auth.uid()
  OR public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'registrar')
  OR public.has_role(auth.uid(),'superadmin'));

CREATE POLICY "staff place holds" ON public.account_holds
FOR INSERT WITH CHECK (placed_by = auth.uid() AND (
  public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'registrar')
  OR public.has_role(auth.uid(),'superadmin')
));

CREATE POLICY "staff release holds" ON public.account_holds
FOR UPDATE USING (
  public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'registrar')
  OR public.has_role(auth.uid(),'superadmin')
);

-- Balance computation
CREATE OR REPLACE FUNCTION public.compute_student_balance(p_student UUID)
RETURNS NUMERIC LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(
    CASE WHEN entry_type IN ('tuition_charge','fee_charge') THEN amount
         WHEN entry_type IN ('payment','aid_disbursement','adjustment','reversal','refund') THEN -amount
         ELSE 0 END
  ), 0)
  FROM public.student_account_ledger
  WHERE student_user_id = p_student;
$$;

-- Recompute financial holds
CREATE OR REPLACE FUNCTION public.recompute_account_holds()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count INTEGER := 0;
  r RECORD;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'registrar') OR public.has_role(auth.uid(),'superadmin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  FOR r IN
    SELECT student_user_id, public.compute_student_balance(student_user_id) AS bal,
           MIN(posted_at) FILTER (WHERE entry_type IN ('tuition_charge','fee_charge')) AS oldest_charge
    FROM public.student_account_ledger
    GROUP BY student_user_id
  LOOP
    IF r.bal > 500 AND r.oldest_charge < now() - INTERVAL '30 days' THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.account_holds
        WHERE student_user_id = r.student_user_id AND kind='financial' AND status='active'
      ) THEN
        INSERT INTO public.account_holds(student_user_id, kind, reason, placed_by)
        VALUES (r.student_user_id, 'financial',
                'Auto: outstanding balance $'||r.bal::TEXT||' aged >30d', auth.uid());
        v_count := v_count + 1;
      END IF;
    END IF;
  END LOOP;
  RETURN v_count;
END $$;
