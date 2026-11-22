# ScrollUniversity interactive AI lecturer — classroom v1

## Goal
Let an enrolled adult student join an existing LiveKit classroom, explicitly opt in to microphone audio,
raise a hand, type a question and receive an answer from a human lecturer or a future AI lecturer
worker. The real-time protocol is owned by ScrollUniversity; avatar/STT/LLM/TTS services remain replaceable.

## Implemented in this branch
- JWT-gated LiveKit join using the existing livekit-token function and its enrollment/staff checks.
- Students can publish microphone-only media (LiveKit protobuf TrackSource.MICROPHONE = 2).
- Observers cannot publish media or classroom data packets. Faculty retain existing publish rights.
- Microphones are off until a student/faculty member clicks the enable control.
- Peer audio tracks are attached, so other classroom participants can hear the student.
- Ephemeral, room-local Q&A and hand raises via reliable LiveKit data packets.
- Payload validation (topic, version, 500-character cap, max packet size) and sender identity from LiveKit.
- Faculty/AI lecturer identities can publish an answer; student-forged answer packets are ignored by the UI.

## LiveKit data contract
Topic: scrolluniversity.classroom.v1

Messages (JSON encoded with TextEncoder):
- Question: { "version": 1, "id": "<uuid>", "kind": "question", "text": "..." }
- Answer: { "version": 1, "id": "<uuid>", "kind": "answer", "text": "..." }
- Hand: { "version": 1, "id": "<uuid>", "kind": "hand", "raised": true }

Never trust a name/role contained in a packet. Use the authenticated LiveKit participant.identity.
This is a transport, not a durable message store. Late joiners do not receive previous messages,
and there are no persistent transcripts, moderation records or assessment claims in this change.

## Next: own AI lecturer worker (not implemented here)
1. Join the classroom with an existing lecturer:<tutor-id> publisher token from lecturer-bootstrap.
2. Listen for question packets and opt-in student audio. Do not process student audio unless a
   faculty-approved classroom policy and applicable consent permit it.
3. Stream microphone audio to a configurable STT backend (e.g. Whisper), route transcripts to
   ScrollUniversity's existing course-context retrieval and pedagogy prompts.
4. Stream generated text through a configurable TTS provider and publish speech in LiveKit.
5. Publish an answer packet with the returned academic explanation and cited sources.
6. Optional: add a video avatar renderer (Nuplex or equivalent) behind a provider adapter.
7. Add faculty moderation, turn allocation, rate limits, safeguards against hallucinated citations,
   GDPR retention/consent controls, audio accessibility and human-approval checkpoints.
8. Add e2e tests using two authorized clients and one observer, on an isolated non-production room.

## Known limits / deployment checklist
- Not merged into main or deployed by creating this branch.
- AI worker consumption, streaming speech recognition and automatic answers are not wired yet.
- A client-side hand raise is a coordination signal, not server-enforced speaking permission.
  Faculty moderation requires trusted LiveKit room permission updates (separate task).
- Classroom data messages are only delivered to connected clients and are not durable records.
- End-to-end audio, browser permissions, LiveKit tokens, and production secrets must be tested before release.
- Since the production gate runs on pull requests, inspect its TypeScript/tests/build results before merge.
- Do not expose LiveKit API secrets or Supabase service-role keys in browser code.
