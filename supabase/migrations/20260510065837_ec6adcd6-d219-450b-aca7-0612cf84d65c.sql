
ALTER TABLE public.degree_programs DROP CONSTRAINT IF EXISTS degree_programs_accreditation_status_check;
ALTER TABLE public.degree_programs ADD CONSTRAINT degree_programs_accreditation_status_check
  CHECK (accreditation_status = ANY (ARRAY['accreditation_ready','accreditation_track','needs_rework','experimental','internal_honorific','pending_review']));
