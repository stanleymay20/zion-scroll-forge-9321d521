
-- Capstone tracks (Level 4-5 graduate-intensity)
CREATE TABLE public.capstone_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  faculty_area TEXT NOT NULL,
  level INTEGER NOT NULL CHECK (level IN (4,5)),
  description TEXT NOT NULL,
  learning_outcomes TEXT[] NOT NULL DEFAULT '{}',
  primary_source_reading_list JSONB NOT NULL DEFAULT '[]'::jsonb,
  duration_weeks INTEGER NOT NULL DEFAULT 12,
  prerequisites TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','retired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.capstone_tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view published capstone tracks" ON public.capstone_tracks FOR SELECT USING (status = 'published');
CREATE POLICY "Admins manage capstone tracks" ON public.capstone_tracks FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Research publications
CREATE TABLE public.research_publications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  authors TEXT[] NOT NULL DEFAULT '{}',
  venue TEXT NOT NULL,
  year INTEGER NOT NULL,
  faculty_area TEXT NOT NULL,
  abstract TEXT,
  external_url TEXT,
  doi TEXT,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','under_review','accepted','published','rejected')),
  is_peer_reviewed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.research_publications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public views accepted/published research" ON public.research_publications FOR SELECT USING (status IN ('accepted','published'));
CREATE POLICY "Admins manage research" ON public.research_publications FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Oral defenses
CREATE TABLE public.oral_defenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_name TEXT NOT NULL,
  degree_title TEXT NOT NULL,
  faculty_area TEXT NOT NULL,
  examiner_names TEXT[] NOT NULL DEFAULT '{}',
  defense_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','passed','passed_with_distinction','referred','failed')),
  recording_url TEXT,
  scrollchain_hash TEXT,
  abstract TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.oral_defenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public views completed public defenses" ON public.oral_defenses FOR SELECT USING (is_public = true AND status IN ('passed','passed_with_distinction'));
CREATE POLICY "Admins manage defenses" ON public.oral_defenses FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Primary source collections
CREATE TABLE public.primary_source_collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  faculty_area TEXT NOT NULL,
  description TEXT NOT NULL,
  item_count INTEGER NOT NULL DEFAULT 0,
  access_type TEXT NOT NULL DEFAULT 'open' CHECK (access_type IN ('open','licensed','partner')),
  external_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.primary_source_collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public views active source collections" ON public.primary_source_collections FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage source collections" ON public.primary_source_collections FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Catalog expansion progress
CREATE TABLE public.catalog_expansion_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  faculty_area TEXT NOT NULL UNIQUE,
  current_course_count INTEGER NOT NULL DEFAULT 0,
  target_course_count INTEGER NOT NULL DEFAULT 100,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.catalog_expansion_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public views catalog progress" ON public.catalog_expansion_progress FOR SELECT USING (true);
CREATE POLICY "Admins manage catalog progress" ON public.catalog_expansion_progress FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- updated_at triggers
CREATE TRIGGER trg_capstone_tracks_updated BEFORE UPDATE ON public.capstone_tracks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_research_publications_updated BEFORE UPDATE ON public.research_publications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_oral_defenses_updated BEFORE UPDATE ON public.oral_defenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_primary_source_collections_updated BEFORE UPDATE ON public.primary_source_collections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_catalog_expansion_updated BEFORE UPDATE ON public.catalog_expansion_progress FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
