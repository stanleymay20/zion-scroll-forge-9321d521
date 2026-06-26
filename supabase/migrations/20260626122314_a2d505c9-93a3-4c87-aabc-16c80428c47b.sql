
ALTER TABLE public.registration_windows
  DROP CONSTRAINT IF EXISTS registration_windows_term_id_fkey;
ALTER TABLE public.registration_windows
  ADD CONSTRAINT registration_windows_term_id_fkey
  FOREIGN KEY (term_id) REFERENCES public.academic_terms(id) ON DELETE CASCADE;
