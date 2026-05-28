# ScrollUniversity — Lecturer Worker (Phase 3A: Audio-First)

Provider-agnostic AI lecturer publisher. Joins a LiveKit room as
`lecturer:<tutorId>` and publishes a real audio track produced by a
pluggable TTS provider. Truthfully reports `delivery_mode` and
`lecturer_bot_status` back onto `classroom_sessions` so the
frontend never claims LIVE without observable media.

This worker intentionally does **not** publish video. Avatar / sovereign
GPU rendering is Phase 3B and plugs in behind the same `TTSProvider` /
session lifecycle without changes to the orchestration contract.

## Endpoints

| Method | Path                | Purpose                                              |
| ------ | ------------------- | ---------------------------------------------------- |
| GET    | `/health`           | Liveness probe                                       |
| POST   | `/publish-lecturer` | Dispatch from `lecturer-bootstrap` edge function     |
| POST   | `/stop-lecturer`    | Force-stop an active room session                    |

Both POST routes require `Authorization: Bearer ${LECTURER_WORKER_KEY}`.

## Dispatch contract

`lecturer-bootstrap` (Supabase Edge Function) POSTs:

```json
{
  "livekitUrl": "wss://...",
  "token": "<publisher-jwt>",
  "identity": "lecturer:<tutorId>",
  "room": "course-<courseId>",
  "sessionId": "<uuid>",
  "lectureTitle": "AI Ethics & Responsible Systems",
  "tutor": { "id": "...", "name": "Miriam", "specialty": "...", "voiceId": "..." }
}
```

Response:

```json
{ "ok": true, "mode": "audio" }            // audio track published
{ "ok": true, "mode": "text" }             // TTS unavailable; transcript only
{ "ok": false, "reason": "worker_join_failed", "detail": "..." }
```

The worker also patches `classroom_sessions` directly via service role:

| Stage                              | `lecturer_bot_status` | `delivery_mode`       |
| ---------------------------------- | --------------------- | --------------------- |
| Room connected, no track yet       | `joining`             | `awaiting-publisher`  |
| Audio track actually published     | `live`                | `audio`               |
| TTS misconfigured (text mode)      | `live`                | `text`                |
| LiveKit disconnect                 | `error`               | `error`               |
| Graceful stop                      | `ended`               | `awaiting-publisher`  |

## TTS providers

| `TTS_PROVIDER` | Behavior                                        |
| -------------- | ----------------------------------------------- |
| `elevenlabs`   | Streams `pcm_16000` directly into LiveKit       |
| `text`         | No audio; transcript via LiveKit data channel   |

Adding a new provider (OpenVoice, XTTS, MuseTalk audio side, etc.) means
implementing `TTSProvider` in `src/tts/` and registering it in
`buildTtsProvider()`. The room loop does not change.

## Local dev

```bash
cp .env.example .env
# fill SUPABASE_SERVICE_ROLE_KEY, ELEVENLABS_API_KEY, LECTURER_WORKER_KEY
npm install
npm run dev
```

Then add the same `LECTURER_WORKER_KEY` and `LECTURER_WORKER_URL`
(e.g. `https://your-host/publish-lecturer`) to Lovable Cloud secrets so
`lecturer-bootstrap` can reach this worker.

## Deploy

### Docker (RunPod / Fly / Render / Fargate)

```bash
docker build -t scrolluniversity-lecturer-worker .
docker run -p 8080:8080 --env-file .env scrolluniversity-lecturer-worker
```

### RunPod serverless

Use the included `Dockerfile`. Expose port `8080`. RunPod's HTTP route
handler maps cleanly onto `/publish-lecturer`. Set the env vars in the
template, not in code.

## Observability

Logs are single-line JSON with `ts`, `level`, `msg`, plus per-session
fields (`sessionId`, `room`, `identity`, `tutor`). Notable events:

- `room.connecting` / `room.connected` — LiveKit join lifecycle
- `audio.published` — first frame source attached
- `elevenlabs.ttfb` — time-to-first-byte from TTS provider
- `utterance.spoken` — TTS duration + frame count per turn
- `room.disconnected` — with reason
- `session.stopping` — graceful teardown

## Truthfulness rules

The worker NEVER:

- claims `delivery_mode='avatar'` (no video frames are published here)
- sets `lecturer_bot_status='live'` before audio is actually flowing
- holds a `live` status after a LiveKit disconnect

If you change this file, preserve those invariants.
