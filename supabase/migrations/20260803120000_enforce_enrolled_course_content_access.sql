-- Enforce university-style course-room access.
-- Catalog/course metadata can remain browseable, but module content and materials
-- are restricted to enrolled students, teaching faculty, and academic admins.

DROP POLICY IF EXISTS "Anyone can view modules" ON public.course_modules;
DROP POLICY IF EXISTS "Modules readable when course allows access" ON public.course_modules;
DROP POLICY IF EXISTS "Modules readable: first module preview or enrolled+" ON public.course_modules;

CREATE POLICY "Course modules readable only by enrolled course members"
ON public.course_modules
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
  OR EXISTS (
    SELECT 1
    FROM public.enrollments e
    WHERE e.course_id = course_modules.course_id
      AND e.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.teaching_assignments t
    WHERE t.course_id = course_modules.course_id
      AND t.faculty_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "enrolled students read materials" ON public.learning_materials;

CREATE POLICY "Learning materials readable only by enrolled course members"
ON public.learning_materials
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.course_modules m
    WHERE m.id = learning_materials.module_id
      AND (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
        OR EXISTS (
          SELECT 1
          FROM public.enrollments e
          WHERE e.course_id = m.course_id
            AND e.user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1
          FROM public.teaching_assignments t
          WHERE t.course_id = m.course_id
            AND t.faculty_user_id = auth.uid()
        )
      )
  )
);

DROP POLICY IF EXISTS "Anyone can view course materials" ON public.course_materials;
DROP POLICY IF EXISTS "Authenticated users can view course materials" ON public.course_materials;

CREATE POLICY "Course materials readable only by enrolled course members"
ON public.course_materials
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.course_modules m
    WHERE m.id = course_materials.module_id
      AND (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
        OR EXISTS (
          SELECT 1
          FROM public.enrollments e
          WHERE e.course_id = m.course_id
            AND e.user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1
          FROM public.teaching_assignments t
          WHERE t.course_id = m.course_id
            AND t.faculty_user_id = auth.uid()
        )
      )
  )
);
