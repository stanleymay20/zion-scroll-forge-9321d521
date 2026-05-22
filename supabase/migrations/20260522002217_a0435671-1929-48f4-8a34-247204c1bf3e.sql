-- Halls
CREATE TABLE public.residence_halls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  campus text,
  gender_policy text NOT NULL DEFAULT 'coed' CHECK (gender_policy IN ('coed','male','female','family')),
  description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Rooms
CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hall_id uuid NOT NULL REFERENCES public.residence_halls(id) ON DELETE CASCADE,
  room_number text NOT NULL,
  room_type text NOT NULL CHECK (room_type IN ('single','double','triple','suite')),
  capacity int NOT NULL CHECK (capacity > 0),
  term_rate numeric(10,2),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(hall_id, room_number)
);
CREATE INDEX idx_rooms_hall ON public.rooms(hall_id);

-- Applications
CREATE TABLE public.housing_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id uuid NOT NULL,
  term text NOT NULL,
  preferred_hall_id uuid REFERENCES public.residence_halls(id) ON DELETE SET NULL,
  preferred_room_type text CHECK (preferred_room_type IN ('single','double','triple','suite')),
  notes text,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','under_review','approved','waitlisted','rejected','withdrawn')),
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_user_id, term)
);
CREATE INDEX idx_housing_apps_student ON public.housing_applications(student_user_id);

-- Assignments
CREATE TABLE public.room_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  student_user_id uuid NOT NULL,
  term text NOT NULL,
  status text NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned','checked_in','checked_out','canceled')),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  checked_in_at timestamptz,
  checked_out_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_user_id, term)
);
CREATE INDEX idx_room_assign_room ON public.room_assignments(room_id);
CREATE INDEX idx_room_assign_student ON public.room_assignments(student_user_id);

-- Maintenance
CREATE TABLE public.maintenance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL,
  category text NOT NULL CHECK (category IN ('plumbing','electrical','hvac','appliance','furniture','pest','cleaning','other')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','emergency')),
  summary text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  assigned_to uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_maint_room ON public.maintenance_requests(room_id);

-- Updated_at triggers
CREATE TRIGGER trg_halls_updated BEFORE UPDATE ON public.residence_halls FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_rooms_updated BEFORE UPDATE ON public.rooms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_happs_updated BEFORE UPDATE ON public.housing_applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_rassign_updated BEFORE UPDATE ON public.room_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_maint_updated BEFORE UPDATE ON public.maintenance_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Capacity guard on assignment insert/update
CREATE OR REPLACE FUNCTION public.tg_rassign_capacity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cap int; used int;
BEGIN
  IF NEW.status IN ('assigned','checked_in') THEN
    SELECT capacity INTO cap FROM public.rooms WHERE id = NEW.room_id;
    SELECT count(*) INTO used FROM public.room_assignments
      WHERE room_id = NEW.room_id AND term = NEW.term
        AND status IN ('assigned','checked_in')
        AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
    IF used >= cap THEN
      RAISE EXCEPTION 'Room is at capacity for term %', NEW.term;
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_rassign_capacity_ins BEFORE INSERT ON public.room_assignments
  FOR EACH ROW EXECUTE FUNCTION public.tg_rassign_capacity();
CREATE TRIGGER trg_rassign_capacity_upd BEFORE UPDATE ON public.room_assignments
  FOR EACH ROW EXECUTE FUNCTION public.tg_rassign_capacity();

-- Assignment status transition stamps
CREATE OR REPLACE FUNCTION public.tg_rassign_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status <> OLD.status THEN
    IF OLD.status IN ('checked_out','canceled') THEN
      RAISE EXCEPTION 'Assignment is in terminal state %', OLD.status;
    END IF;
    IF NEW.status = 'checked_in' AND NEW.checked_in_at IS NULL THEN NEW.checked_in_at := now(); END IF;
    IF NEW.status = 'checked_out' AND NEW.checked_out_at IS NULL THEN NEW.checked_out_at := now(); END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_rassign_status BEFORE UPDATE ON public.room_assignments
  FOR EACH ROW EXECUTE FUNCTION public.tg_rassign_status();

-- Application status validation
CREATE OR REPLACE FUNCTION public.tg_happ_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status <> OLD.status THEN
    IF OLD.status IN ('approved','rejected','withdrawn') THEN
      RAISE EXCEPTION 'Application is in terminal state %', OLD.status;
    END IF;
    IF NEW.status IN ('approved','rejected','withdrawn') AND NEW.decided_at IS NULL THEN
      NEW.decided_at := now();
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_happ_status BEFORE UPDATE ON public.housing_applications
  FOR EACH ROW EXECUTE FUNCTION public.tg_happ_status();

-- Maintenance status stamp
CREATE OR REPLACE FUNCTION public.tg_maint_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status <> OLD.status THEN
    IF NEW.status IN ('resolved','closed') AND NEW.resolved_at IS NULL THEN
      NEW.resolved_at := now();
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_maint_status BEFORE UPDATE ON public.maintenance_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_maint_status();

-- RLS
ALTER TABLE public.residence_halls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.housing_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active halls" ON public.residence_halls FOR SELECT USING (active = true);
CREATE POLICY "Staff manage halls" ON public.residence_halls FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'housing_officer') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin'))
  WITH CHECK (public.has_role(auth.uid(),'housing_officer') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin'));

CREATE POLICY "Anyone can view active rooms" ON public.rooms FOR SELECT USING (active = true);
CREATE POLICY "Staff manage rooms" ON public.rooms FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'housing_officer') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin'))
  WITH CHECK (public.has_role(auth.uid(),'housing_officer') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin'));

CREATE POLICY "Student views own application" ON public.housing_applications FOR SELECT TO authenticated USING (student_user_id = auth.uid());
CREATE POLICY "Staff view all applications" ON public.housing_applications FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'housing_officer') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin'));
CREATE POLICY "Student submits own application" ON public.housing_applications FOR INSERT TO authenticated WITH CHECK (student_user_id = auth.uid());
CREATE POLICY "Student updates own application" ON public.housing_applications FOR UPDATE TO authenticated
  USING (student_user_id = auth.uid()) WITH CHECK (student_user_id = auth.uid());
CREATE POLICY "Staff manage applications" ON public.housing_applications FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'housing_officer') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin'))
  WITH CHECK (public.has_role(auth.uid(),'housing_officer') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin'));

CREATE POLICY "Student views own assignment" ON public.room_assignments FOR SELECT TO authenticated USING (student_user_id = auth.uid());
CREATE POLICY "Staff view all assignments" ON public.room_assignments FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'housing_officer') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin'));
CREATE POLICY "Staff manage assignments" ON public.room_assignments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'housing_officer') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin'))
  WITH CHECK (public.has_role(auth.uid(),'housing_officer') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin'));

CREATE POLICY "Resident views own maintenance" ON public.maintenance_requests FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.room_assignments a
    WHERE a.room_id = maintenance_requests.room_id AND a.student_user_id = auth.uid()
      AND a.status IN ('assigned','checked_in')
  ));
CREATE POLICY "Staff view all maintenance" ON public.maintenance_requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'housing_officer') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin'));
CREATE POLICY "Resident files maintenance for own room" ON public.maintenance_requests FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.room_assignments a
    WHERE a.room_id = room_id AND a.student_user_id = auth.uid()
      AND a.status IN ('assigned','checked_in')
  ));
CREATE POLICY "Staff manage maintenance" ON public.maintenance_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'housing_officer') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin'))
  WITH CHECK (public.has_role(auth.uid(),'housing_officer') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin'));