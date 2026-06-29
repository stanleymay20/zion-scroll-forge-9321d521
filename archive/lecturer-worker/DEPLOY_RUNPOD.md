# RunPod CPU Deployment — Audio-Only Lecturer Worker (Phase 3A)

This guide deploys the **audio-only** worker on a RunPod CPU pod. No GPU
is required for this phase — TTS (ElevenLabs) and LLM (Lovable AI
Gateway) are both remote HTTP calls. GPU + MuseTalk video rendering is
Phase 3B and reuses the exact same HTTP contract, room loop, and
session-state machine.

The goal of Phase 3A is to **prove the contract end-to-end**:

1. Worker process starts and `/health` responds.
2. `lecturer-bootstrap` edge function reaches the worker over HTTPS.
3. Worker joins the LiveKit room as `lecturer:<tutorId>`.
4. Worker publishes a real audio track produced by ElevenLabs.
5. `classroom_sessions.lecturer_bot_status` flips to `live` and
   `delivery_mode` flips to `audio` — truthfully, only after the
   track is published.
6. Students subscribed to the LiveKit room hear the lecturer.

Only when all six are green do we move to Phase 3B (GPU + video).

---

## 1. Build the image

```bash
cd lecturer-worker
docker build -t scrolluniversity-lecturer-worker:phase3a .
```

The image is ~180 MB (node:20-slim + compiled JS + node_modules). It
listens on `PORT` (default `8080`) and exposes `/health`,
`/publish-lecturer`, `/stop-lecturer`.

---

## 2. Create a RunPod CPU pod (or any container host)

RunPod is recommended for symmetry with the future GPU pod, but any
container host with a stable public HTTPS URL works
(Fly.io, Render, Fargate, Cloud Run, a bare VPS with Caddy, ...).

RunPod template settings:

| Field                | Value                                                    |
| -------------------- | -------------------------------------------------------- |
| Container image      | `<your-registry>/scrolluniversity-lecturer-worker:phase3a` |
| Container disk       | 5 GB                                                     |
| Expose HTTP port     | `8080`                                                   |
| GPU                  | **none** (CPU pod is sufficient for Phase 3A)            |
| Min CPU / RAM        | 1 vCPU / 1 GB (one session); scale up for concurrency    |

After it boots, RunPod gives you a public URL like
`https://abcdef-8080.proxy.runpod.net`. That URL is what goes into
`LECTURER_WORKER_URL`.

---

## 3. Environment variables

Set these in the RunPod template (NOT in the image):

| Var                              | Required | Notes |
| -------------------------------- | -------- | ----- |
| `LECTURER_WORKER_KEY`            | ✅       | Long random secret (e.g. `openssl rand -hex 32`). MUST match the same-named secret in Lovable Cloud — it authorises the worker to call the `lecturer-session-patch` edge function. |
| `SUPABASE_URL`                   | ✅       | `https://klbtvdqfsctrfdkilrmx.supabase.co` |
| `TTS_PROVIDER`                   | ✅       | `elevenlabs` for audio, `text` for transcript-only fallback. |
| `ELEVENLABS_API_KEY`             | if audio | Required when `TTS_PROVIDER=elevenlabs`. Otherwise the worker self-downgrades to text mode (truthful, not silent-fake). |
| `ELEVENLABS_DEFAULT_VOICE_ID`    | optional | Defaults to `JBFqnCBsd6RMkjVDRZzb` (George). |
| `ELEVENLABS_MODEL_ID`            | optional | Defaults to `eleven_turbo_v2_5`. |
| `LOVABLE_API_KEY`                | optional | Enables AI-Gateway-drafted lecture turns. Falls back to a deterministic script if missing. |
| `LECTURER_MODEL`                 | optional | Defaults to `google/gemini-3-flash-preview`. |
| `PORT`                           | optional | Defaults to `8080`. Match the exposed port. |
| `MAX_SESSION_SECONDS`            | optional | Hard wall-clock cap per room session. Defaults to 5400 (90 min). |
| `LOG_LEVEL`                      | optional | `debug` | `info` | `warn` | `error`. |

---

## 4. Lovable Cloud secrets (edge-function side)

These are configured in Lovable Cloud (Project Settings → Secrets) so
`lecturer-bootstrap` can dispatch to your worker:

| Secret                  | Value                                                              |
| ----------------------- | ------------------------------------------------------------------ |
| `LECTURER_WORKER_URL`   | `https://<your-runpod-host>/publish-lecturer`                      |
| `LECTURER_WORKER_KEY`   | Same long random secret as on the worker side                      |
| `LIVEKIT_URL`           | `wss://<your-livekit-host>`                                        |
| `LIVEKIT_API_KEY`       | LiveKit API key (used to mint publisher JWTs)                      |
| `LIVEKIT_API_SECRET`    | LiveKit API secret                                                 |

`lecturer-bootstrap` mints a publisher JWT with `roomJoin + canPublish`
for identity `lecturer:<tutorId>` and POSTs the dispatch JSON to
`LECTURER_WORKER_URL`. If `LECTURER_WORKER_URL` is missing, the
bootstrap function records `no_worker_configured` on the session row
and the UI surfaces that truthfully — no fake "live" state.

---

## 5. Verify end-to-end

After the pod is running:

```bash
# 5a. Health
curl https://<your-runpod-host>/health
# -> {"ok":true,"service":"scrolluniversity-lecturer-worker","ttsProvider":"elevenlabs",...}

# 5b. Auth enforcement (should be 401)
curl -X POST https://<your-runpod-host>/publish-lecturer -d '{}'

# 5c. Body validation (should be 400)
curl -X POST https://<your-runpod-host>/publish-lecturer \
  -H "Authorization: Bearer <LECTURER_WORKER_KEY>" \
  -H "Content-Type: application/json" -d '{}'
```

Then start a classroom session in the app. Watch the row in
`classroom_sessions` — `lecturer_bot_status` should walk:

```
joining (set by lecturer-bootstrap)
   -> live + delivery_mode=audio (set by worker once track is published)
   -> ended (set by worker on graceful stop)
```

Worker logs (single-line JSON) show the lifecycle:

```
room.connecting -> room.connected -> elevenlabs.ttfb -> audio.published
   -> utterance.spoken (per turn) -> session.stopping (on stop)
```

If `delivery_mode` ever lands on anything other than `audio` / `text`
while `lecturer_bot_status='live'`, treat that as a bug — it violates
the truthfulness invariants documented in `README.md`.

---

## 6. What this gives you (and what it does not)

✅ Real LiveKit audio from a real ElevenLabs voice.
✅ Real lecture script drafted by Lovable AI Gateway.
✅ Truthful `delivery_mode` and `lecturer_bot_status` on every state
   change — no fake-live, no silent-track.
✅ One pod per active session at this scale; scales horizontally by
   running more pods behind a load balancer (the registry is in-process
   per pod, so each pod must receive its own dispatch).

❌ No video. No avatar. No lip-sync. That is Phase 3B.

---

## 7. Phase 3B preview (do not start yet)

Once Phase 3A is stable in production, Phase 3B adds a GPU pod that:

1. Reuses the same HTTP dispatch contract (`/publish-lecturer`).
2. Reuses the same `RoomSession` lifecycle and `patchSession` calls.
3. Adds a `VideoSource` + `LocalVideoTrack` alongside the existing
   `AudioSource`, fed by MuseTalk (or any lip-sync renderer) consuming
   the same TTS PCM stream the audio path already produces.
4. On video-frame publish, sets `delivery_mode='avatar'` (truthful;
   only set once frames are actually flowing).

The orchestration code in `lecturer-bootstrap` does not change.
