
DROP POLICY IF EXISTS "Resident files maintenance for own room" ON public.maintenance_requests;
CREATE POLICY "Resident files maintenance for own room"
ON public.maintenance_requests
FOR INSERT
TO authenticated
WITH CHECK (
  reporter_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.room_assignments a
    WHERE a.room_id = maintenance_requests.room_id
      AND a.student_user_id = auth.uid()
      AND a.status = ANY (ARRAY['assigned'::text, 'checked_in'::text])
  )
);

REVOKE SELECT (answer) ON public.quiz_questions FROM authenticated, anon;

CREATE OR REPLACE FUNCTION public.get_quiz_answer(_question_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT q.answer
  FROM public.quiz_questions q
  JOIN public.assignments a ON a.id = q.assignment_id
  JOIN public.teaching_assignments t ON t.course_id = a.course_id
  WHERE q.id = _question_id
    AND t.faculty_user_id = auth.uid()
$$;
REVOKE ALL ON FUNCTION public.get_quiz_answer(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_quiz_answer(uuid) TO authenticated;

DROP POLICY IF EXISTS "Conversation members can broadcast on their topics" ON realtime.messages;
DROP POLICY IF EXISTS "Conversation members can read realtime topics" ON realtime.messages;

CREATE POLICY "Realtime read access for members"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  extension = 'postgres_changes'
  OR (
    realtime.topic() LIKE 'conversation:%'
    AND EXISTS (
      SELECT 1 FROM public.conversation_members cm
      WHERE cm.conversation_id::text = split_part(realtime.topic(), ':', 2)
        AND cm.user_id = auth.uid()
    )
  )
  OR (
    realtime.topic() LIKE 'study_group:%'
    AND EXISTS (
      SELECT 1 FROM public.study_group_members sgm
      WHERE sgm.group_id::text = split_part(realtime.topic(), ':', 2)
        AND sgm.user_id = auth.uid()
    )
  )
  OR (
    realtime.topic() LIKE 'course:%'
    AND EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.course_id::text = split_part(realtime.topic(), ':', 2)
        AND e.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Realtime broadcast for members"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  extension = ANY (ARRAY['broadcast'::text, 'presence'::text])
  AND (
    (
      realtime.topic() LIKE 'conversation:%'
      AND EXISTS (
        SELECT 1 FROM public.conversation_members cm
        WHERE cm.conversation_id::text = split_part(realtime.topic(), ':', 2)
          AND cm.user_id = auth.uid()
      )
    )
    OR (
      realtime.topic() LIKE 'study_group:%'
      AND EXISTS (
        SELECT 1 FROM public.study_group_members sgm
        WHERE sgm.group_id::text = split_part(realtime.topic(), ':', 2)
          AND sgm.user_id = auth.uid()
      )
    )
    OR (
      realtime.topic() LIKE 'course:%'
      AND EXISTS (
        SELECT 1 FROM public.enrollments e
        WHERE e.course_id::text = split_part(realtime.topic(), ':', 2)
          AND e.user_id = auth.uid()
      )
    )
  )
);

ALTER VIEW public.accreditation_baseline_report SET (security_invoker = on);
ALTER VIEW public.v_learning_readiness SET (security_invoker = on);
ALTER VIEW public.faculty_verification_summary SET (security_invoker = on);
