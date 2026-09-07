-- ScrollUniversity module AI-provenance compatibility.
--
-- The 2024 AI-content enhancement added course_modules.ai_generated only when
-- course_modules already existed. In clean historical replays the canonical
-- module table can be created later, leaving this provenance column absent.
-- Current content-authority migrations own the compatibility explicitly so
-- their behavior never depends on historical migration timing.

ALTER TABLE public.course_modules
  ADD COLUMN IF NOT EXISTS ai_generated boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.course_modules.ai_generated IS
  'Legacy-compatible provenance flag. AI authorship alone never grants review, publication, teaching-readiness, credit, or credential authority.';
