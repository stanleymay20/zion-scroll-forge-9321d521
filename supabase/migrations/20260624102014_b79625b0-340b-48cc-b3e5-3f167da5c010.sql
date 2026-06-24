
-- AI avatar consent log
CREATE TABLE public.ai_avatar_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tutor_name text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ai_avatar_consents TO authenticated;
GRANT ALL ON public.ai_avatar_consents TO service_role;
ALTER TABLE public.ai_avatar_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users insert own consents" ON public.ai_avatar_consents
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users view own consents" ON public.ai_avatar_consents
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all consents" ON public.ai_avatar_consents
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Faculty likeness/voice release registry
CREATE TABLE public.faculty_likeness_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_name text NOT NULL,
  faculty_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  avatar_resembles_real_person boolean NOT NULL DEFAULT false,
  voice_cloned boolean NOT NULL DEFAULT false,
  release_signed boolean NOT NULL DEFAULT false,
  release_document_url text,
  release_signed_at timestamptz,
  expires_at timestamptz,
  scope text,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.faculty_likeness_releases TO authenticated;
GRANT ALL ON public.faculty_likeness_releases TO service_role;
ALTER TABLE public.faculty_likeness_releases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage likeness releases" ON public.faculty_likeness_releases
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Faculty view own likeness release" ON public.faculty_likeness_releases
  FOR SELECT TO authenticated USING (auth.uid() = faculty_user_id);

CREATE TRIGGER update_faculty_likeness_releases_updated_at
  BEFORE UPDATE ON public.faculty_likeness_releases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
