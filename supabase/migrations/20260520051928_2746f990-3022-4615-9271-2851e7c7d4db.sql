CREATE TYPE public.resource_kind AS ENUM ('book','equipment','room','media','other');
CREATE TYPE public.loan_status AS ENUM ('reserved','checked_out','returned','overdue','canceled');

CREATE TABLE public.library_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  kind public.resource_kind NOT NULL DEFAULT 'book',
  identifier TEXT,
  location TEXT,
  total_copies INTEGER NOT NULL DEFAULT 1,
  loan_days INTEGER NOT NULL DEFAULT 14,
  max_renewals INTEGER NOT NULL DEFAULT 2,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT library_resources_copies_chk CHECK (total_copies > 0)
);
CREATE INDEX idx_libres_kind ON public.library_resources(kind) WHERE active;

ALTER TABLE public.library_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth views catalog" ON public.library_resources FOR SELECT TO authenticated USING (true);
CREATE POLICY "Librarian manages catalog" ON public.library_resources FOR ALL
  USING (public.has_role(auth.uid(),'admin'::public.app_role) OR public.has_role(auth.uid(),'superadmin'::public.app_role) OR public.has_role(auth.uid(),'librarian'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role) OR public.has_role(auth.uid(),'superadmin'::public.app_role) OR public.has_role(auth.uid(),'librarian'::public.app_role));

CREATE TABLE public.resource_loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES public.library_resources(id) ON DELETE CASCADE,
  borrower_user_id UUID NOT NULL,
  status public.loan_status NOT NULL DEFAULT 'reserved',
  reserved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  checked_out_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  returned_at TIMESTAMPTZ,
  renewals INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_loans_borrower ON public.resource_loans(borrower_user_id);
CREATE INDEX idx_loans_resource ON public.resource_loans(resource_id);
CREATE INDEX idx_loans_status ON public.resource_loans(status);

ALTER TABLE public.resource_loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Borrower views own loans" ON public.resource_loans
  FOR SELECT USING (auth.uid() = borrower_user_id);
CREATE POLICY "Librarian manages loans" ON public.resource_loans FOR ALL
  USING (public.has_role(auth.uid(),'admin'::public.app_role) OR public.has_role(auth.uid(),'superadmin'::public.app_role) OR public.has_role(auth.uid(),'librarian'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role) OR public.has_role(auth.uid(),'superadmin'::public.app_role) OR public.has_role(auth.uid(),'librarian'::public.app_role));

CREATE TRIGGER tg_loans_updated_at
  BEFORE UPDATE ON public.resource_loans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.loan_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES public.resource_loans(id) ON DELETE CASCADE,
  event_kind TEXT NOT NULL,
  note TEXT,
  actor_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_loan_events_loan ON public.loan_events(loan_id);

ALTER TABLE public.loan_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner views loan events" ON public.loan_events
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.resource_loans l WHERE l.id = loan_id AND l.borrower_user_id = auth.uid()
  ));
CREATE POLICY "Librarian views loan events" ON public.loan_events FOR SELECT
  USING (public.has_role(auth.uid(),'admin'::public.app_role) OR public.has_role(auth.uid(),'superadmin'::public.app_role) OR public.has_role(auth.uid(),'librarian'::public.app_role));
CREATE POLICY "Authorized inserts loan events" ON public.loan_events FOR INSERT
  WITH CHECK (actor_id = auth.uid());

CREATE OR REPLACE FUNCTION public.tg_loan_events_immutable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Loan events are immutable'; END $$;
CREATE TRIGGER tg_loan_events_no_update BEFORE UPDATE ON public.loan_events FOR EACH ROW EXECUTE FUNCTION public.tg_loan_events_immutable();
CREATE TRIGGER tg_loan_events_no_delete BEFORE DELETE ON public.loan_events FOR EACH ROW EXECUTE FUNCTION public.tg_loan_events_immutable();

CREATE OR REPLACE FUNCTION public.resource_available_copies(_resource_id UUID)
RETURNS INTEGER LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT GREATEST(
    (SELECT total_copies FROM public.library_resources WHERE id = _resource_id)
    - (SELECT COUNT(*) FROM public.resource_loans
        WHERE resource_id = _resource_id AND status IN ('reserved','checked_out','overdue')),
    0
  );
$$;

CREATE OR REPLACE FUNCTION public.reserve_resource(_resource_id UUID)
RETURNS public.resource_loans
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_res public.library_resources;
  v_loan public.resource_loans;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_res FROM public.library_resources WHERE id = _resource_id AND active;
  IF v_res.id IS NULL THEN RAISE EXCEPTION 'Resource not found'; END IF;
  IF public.resource_available_copies(_resource_id) <= 0 THEN
    RAISE EXCEPTION 'No copies available';
  END IF;
  IF EXISTS (SELECT 1 FROM public.resource_loans
             WHERE resource_id = _resource_id AND borrower_user_id = v_uid
               AND status IN ('reserved','checked_out','overdue')) THEN
    RAISE EXCEPTION 'You already hold this resource';
  END IF;
  INSERT INTO public.resource_loans (resource_id, borrower_user_id, status)
  VALUES (_resource_id, v_uid, 'reserved') RETURNING * INTO v_loan;
  INSERT INTO public.loan_events (loan_id, event_kind, note, actor_id)
  VALUES (v_loan.id, 'reserved', 'Reserved by borrower', v_uid);
  RETURN v_loan;
END $$;

CREATE OR REPLACE FUNCTION public.checkout_loan(_loan_id UUID)
RETURNS public.resource_loans
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_loan public.resource_loans;
  v_res public.library_resources;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT (public.has_role(v_uid,'admin'::public.app_role) OR public.has_role(v_uid,'superadmin'::public.app_role) OR public.has_role(v_uid,'librarian'::public.app_role)) THEN
    RAISE EXCEPTION 'Librarian role required';
  END IF;
  SELECT * INTO v_loan FROM public.resource_loans WHERE id = _loan_id;
  IF v_loan.id IS NULL THEN RAISE EXCEPTION 'Loan not found'; END IF;
  IF v_loan.status <> 'reserved' THEN RAISE EXCEPTION 'Only reserved loans can be checked out'; END IF;
  SELECT * INTO v_res FROM public.library_resources WHERE id = v_loan.resource_id;
  UPDATE public.resource_loans
     SET status = 'checked_out',
         checked_out_at = now(),
         due_at = now() + (v_res.loan_days || ' days')::INTERVAL
   WHERE id = _loan_id RETURNING * INTO v_loan;
  INSERT INTO public.loan_events (loan_id, event_kind, note, actor_id)
  VALUES (_loan_id, 'checked_out', 'Due ' || v_loan.due_at::DATE, v_uid);
  RETURN v_loan;
END $$;

CREATE OR REPLACE FUNCTION public.return_loan(_loan_id UUID)
RETURNS public.resource_loans
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_loan public.resource_loans;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT (public.has_role(v_uid,'admin'::public.app_role) OR public.has_role(v_uid,'superadmin'::public.app_role) OR public.has_role(v_uid,'librarian'::public.app_role)) THEN
    RAISE EXCEPTION 'Librarian role required';
  END IF;
  SELECT * INTO v_loan FROM public.resource_loans WHERE id = _loan_id;
  IF v_loan.id IS NULL THEN RAISE EXCEPTION 'Loan not found'; END IF;
  IF v_loan.status NOT IN ('checked_out','overdue','reserved') THEN
    RAISE EXCEPTION 'Loan not active'; END IF;
  UPDATE public.resource_loans
     SET status = 'returned', returned_at = now()
   WHERE id = _loan_id RETURNING * INTO v_loan;
  INSERT INTO public.loan_events (loan_id, event_kind, note, actor_id)
  VALUES (_loan_id, 'returned', NULL, v_uid);
  RETURN v_loan;
END $$;

CREATE OR REPLACE FUNCTION public.renew_loan(_loan_id UUID)
RETURNS public.resource_loans
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_loan public.resource_loans;
  v_res public.library_resources;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_loan FROM public.resource_loans WHERE id = _loan_id;
  IF v_loan.id IS NULL THEN RAISE EXCEPTION 'Loan not found'; END IF;
  IF v_loan.borrower_user_id <> v_uid AND NOT (
       public.has_role(v_uid,'admin'::public.app_role) OR public.has_role(v_uid,'superadmin'::public.app_role) OR public.has_role(v_uid,'librarian'::public.app_role))
  THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF v_loan.status <> 'checked_out' THEN RAISE EXCEPTION 'Only active loans can be renewed'; END IF;
  SELECT * INTO v_res FROM public.library_resources WHERE id = v_loan.resource_id;
  IF v_loan.renewals >= v_res.max_renewals THEN RAISE EXCEPTION 'Renewal limit reached'; END IF;
  UPDATE public.resource_loans
     SET renewals = renewals + 1,
         due_at = COALESCE(due_at, now()) + (v_res.loan_days || ' days')::INTERVAL
   WHERE id = _loan_id RETURNING * INTO v_loan;
  INSERT INTO public.loan_events (loan_id, event_kind, note, actor_id)
  VALUES (_loan_id, 'renewed', 'New due ' || v_loan.due_at::DATE, v_uid);
  RETURN v_loan;
END $$;

CREATE OR REPLACE FUNCTION public.cancel_loan(_loan_id UUID, _reason TEXT)
RETURNS public.resource_loans
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_loan public.resource_loans;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_loan FROM public.resource_loans WHERE id = _loan_id;
  IF v_loan.id IS NULL THEN RAISE EXCEPTION 'Loan not found'; END IF;
  IF v_loan.borrower_user_id <> v_uid AND NOT (
       public.has_role(v_uid,'admin'::public.app_role) OR public.has_role(v_uid,'superadmin'::public.app_role) OR public.has_role(v_uid,'librarian'::public.app_role))
  THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF v_loan.status <> 'reserved' THEN RAISE EXCEPTION 'Only reservations can be canceled'; END IF;
  UPDATE public.resource_loans SET status = 'canceled' WHERE id = _loan_id RETURNING * INTO v_loan;
  INSERT INTO public.loan_events (loan_id, event_kind, note, actor_id)
  VALUES (_loan_id, 'canceled', _reason, v_uid);
  RETURN v_loan;
END $$;

CREATE OR REPLACE FUNCTION public.mark_overdue_loans()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_count INTEGER := 0;
  r RECORD;
BEGIN
  IF NOT (public.has_role(v_uid,'admin'::public.app_role) OR public.has_role(v_uid,'superadmin'::public.app_role) OR public.has_role(v_uid,'librarian'::public.app_role)) THEN
    RAISE EXCEPTION 'Librarian role required';
  END IF;
  FOR r IN SELECT id FROM public.resource_loans
            WHERE status = 'checked_out' AND due_at < now()
  LOOP
    UPDATE public.resource_loans SET status = 'overdue' WHERE id = r.id;
    INSERT INTO public.loan_events (loan_id, event_kind, note, actor_id)
    VALUES (r.id, 'overdue', 'Auto-flagged overdue', v_uid);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END $$;