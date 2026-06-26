
CREATE OR REPLACE FUNCTION public.generate_curriculum_titles(p_faculty text, p_years int, p_n int)
RETURNS text[]
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $fn$
DECLARE
  pool_y1 text[] := ARRAY[
    'Foundations of ' || p_faculty,
    'Introduction to ' || p_faculty || ' Studies',
    'History and Heritage of ' || p_faculty,
    'Scroll Literacy in ' || p_faculty,
    'Academic Writing and Research Skills',
    'Ethics and Governance in ' || p_faculty,
    'Quantitative Reasoning for ' || p_faculty,
    'Communication and Collaboration in ' || p_faculty
  ];
  pool_y2 text[] := ARRAY[
    'Core Theory I in ' || p_faculty,
    'Core Theory II in ' || p_faculty,
    'Comparative ' || p_faculty || ' Systems',
    'Field Methods in ' || p_faculty,
    'Digital Tools for ' || p_faculty,
    'Applied ' || p_faculty || ' Practicum I',
    'Global Perspectives on ' || p_faculty,
    'Spiritual Formation in ' || p_faculty
  ];
  pool_y3 text[] := ARRAY[
    'Advanced ' || p_faculty || ' I',
    'Advanced ' || p_faculty || ' II',
    'Case Studies in ' || p_faculty,
    'Innovation and Design in ' || p_faculty,
    'Cross-Disciplinary ' || p_faculty,
    'Policy and Leadership in ' || p_faculty,
    'Applied ' || p_faculty || ' Practicum II',
    'Research Methods in ' || p_faculty
  ];
  pool_y4 text[] := ARRAY[
    'Senior Seminar in ' || p_faculty,
    'Senior Thesis I in ' || p_faculty,
    'Senior Thesis II in ' || p_faculty,
    'Capstone Project Design in ' || p_faculty,
    'Capstone Project Implementation in ' || p_faculty,
    'Professional Internship in ' || p_faculty,
    'Integrative Synthesis in ' || p_faculty,
    'Vocational Calling and Mission in ' || p_faculty
  ];
  result text[] := ARRAY[]::text[];
  per_year int[] := ARRAY[]::int[];
  base int;
  rem int;
  y int;
  k int;
  pool text[];
  pick text;
  cycle int;
BEGIN
  IF p_n <= 0 THEN RETURN result; END IF;
  base := p_n / p_years;
  rem := p_n - base * p_years;
  FOR y IN 1..p_years LOOP
    per_year := per_year || (base + CASE WHEN y <= rem THEN 1 ELSE 0 END);
  END LOOP;

  FOR y IN 1..p_years LOOP
    IF p_years = 1 THEN
      pool := pool_y1 || pool_y2;
    ELSIF p_years = 2 THEN
      pool := CASE WHEN y = 1 THEN pool_y1 || pool_y2 ELSE pool_y3 || pool_y4 END;
    ELSIF p_years = 3 THEN
      pool := CASE WHEN y = 1 THEN pool_y1
                   WHEN y = 2 THEN pool_y2 || pool_y3
                   ELSE pool_y4 END;
    ELSE
      pool := CASE WHEN y = 1 THEN pool_y1
                   WHEN y = 2 THEN pool_y2
                   WHEN y = 3 THEN pool_y3
                   ELSE pool_y4 END;
    END IF;

    FOR k IN 1..per_year[y] LOOP
      cycle := ((k - 1) / array_length(pool, 1));
      pick := pool[ 1 + ((k - 1) % array_length(pool, 1)) ];
      IF cycle > 0 THEN
        pick := pick || ' — Module ' || (cycle + 1)::text;
      END IF;
      result := result || pick;
    END LOOP;
  END LOOP;
  RETURN result;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.generate_curriculum_titles(text,int,int) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_curriculum_titles(text,int,int) FROM anon;
GRANT EXECUTE ON FUNCTION public.generate_curriculum_titles(text,int,int) TO service_role, authenticated;
