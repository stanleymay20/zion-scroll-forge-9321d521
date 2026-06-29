# ScrollUniversity

A Christian higher-education platform built on Vite + React + Supabase. The
live application talks to Supabase directly (Postgres + Auth + Storage +
Edge Functions); there is no separate API server in the deploy path.

Production deploys happen through Lovable from `main`. Per-push quality is
gated by GitHub Actions: security scanning, the SQL regression suite
against an ephemeral Postgres, and a typed frontend build.

---

## Quick start

Requirements: Node 20+, npm, and access to a Supabase project (URL +
anon/publishable key).

```bash
git clone https://github.com/stanleymay20/zion-scroll-forge-9321d521.git
cd zion-scroll-forge-9321d521

npm install
cp .env.example .env       # fill in VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY

npm run dev                # http://localhost:8080
npm run build              # production bundle
npm test                   # vitest
npm run lint               # eslint
npx tsc --noEmit -p tsconfig.app.json   # strict type check (CI gate)
```

The required environment variables and their meaning are in `.env.example`.
Never commit a real `.env` — it's gitignored, and any service-role secret
must stay out of the frontend.

---

## Repository layout

```
.
├── src/                     # Vite + React frontend (the live app)
│   ├── components/          # UI components (shadcn-based)
│   ├── pages/               # Route components
│   ├── hooks/               # Custom React hooks
│   ├── integrations/        # Supabase client, Lovable cloud auth
│   ├── services/            # Higher-level data access
│   ├── lib/                 # Utilities, performance, error handling
│   ├── routes/              # Route configuration
│   ├── contexts/            # React contexts
│   ├── types/               # Shared TypeScript types
│   └── test/                # Vitest setup
│
├── supabase/                # Supabase project (CLI workdir)
│   ├── config.toml          # Project config
│   ├── migrations/          # 200+ SQL migrations
│   ├── functions/           # 49 Edge Functions (the real backend)
│   └── tests/               # SQL regression + governance suites
│
├── infra/
│   ├── docker/              # Dockerfile.frontend, docker-compose, nginx
│   └── k8s/                 # Optional Kubernetes manifests
│
├── docs/
│   ├── README.md            # Documentation index
│   ├── architecture/        # (under ARCHITECTURE.md etc.)
│   ├── guides/              # Deployment, mobile, PWA, content gen, ...
│   ├── governance/          # ADR-adjacent framework docs, sprint log
│   ├── adr/                 # Architecture Decision Records
│   └── api/                 # OpenAPI surface
│
├── courses/                 # Authored course content
├── scripts/                 # One-off TS + shell scripts
├── public/                  # Static assets served by Vite
│
├── archive/                 # Dormant subprojects — not built, not deployed
│   ├── backend/             # Pre-Supabase Express+Prisma server
│   ├── lecturer-worker/     # Standalone worker (RunPod target)
│   └── remotion/            # Video rendering project
│
├── .github/workflows/       # CI: backend-sql-tests, production-deploy
├── .lovable/                # Lovable project plan
│
├── AUDIT.md                 # Original structural audit (Phase 0)
├── README.md                # This file
└── …vite/ts/tailwind config at root (required by Vite + Lovable)
```

`archive/` is for subprojects that may be revived but aren't part of the
current deploy or CI. See `archive/README.md`.

---

## Architecture

```
┌────────────────────────┐         ┌─────────────────────────────────┐
│  React + Vite frontend │ ──HTTPS─▶  Supabase (managed Postgres)    │
│  src/                  │         │  • Auth (JWT)                   │
│                        │         │  • Storage                      │
│  @lovable.dev/cloud    │         │  • RLS-secured tables           │
│  auth + Supabase JS    │ ──RPC──▶│  • Edge Functions (49)          │
│                        │         │    e.g. ai-tutor-chat,          │
│                        │         │         cohort-onboard,         │
│                        │         │         generate-content,       │
│                        │         │         billing-worker, ...     │
└────────────────────────┘         └─────────────────────────────────┘
                                              ▲
                                              │ SQL
                                              │
                                   ┌──────────────────────┐
                                   │ supabase/migrations/ │
                                   │ supabase/tests/      │
                                   └──────────────────────┘
```

The Edge Functions under `supabase/functions/` are the real backend.
`src/integrations/supabase/client.ts` is the single entry point used by
~277 files. The Postgres schema is versioned by `supabase/migrations/`
and verified per push by the SQL regression suites under
`supabase/tests/`.

---

## CI

Two workflows in `.github/workflows/`:

### `backend-sql-tests.yml`
Spins up Postgres 15, applies all `supabase/migrations/*.sql`, then runs:
- `academic_spine.test.sql` (blocking)
- `program_transfer_governance.test.sql` (advisory)
- `lifecycle_behavior.test.sql` (blocking)
- `lifecycle_invariants.test.sql` (blocking)
- `executive_scope_isolation.test.sql` (blocking)

### `production-deploy.yml`
Per-push gate, despite its name (the real deploy is Lovable's). Three jobs:
- **Security Scan** — Trivy filesystem scan → GitHub Security SARIF
  upload, plus Snyk advisory (skipped when `SNYK_TOKEN` isn't set).
- **Backend SQL Tests** — duplicate of the dedicated workflow above,
  kept here so the deploy gate has its own pass/fail.
- **Frontend Tests** — `npm ci` → `npm run lint` (advisory) →
  `npx tsc --noEmit -p tsconfig.app.json` (blocking) →
  `npm run build` (blocking).

The earlier `build-images` and `deploy-to-k8s` jobs were removed when
the Express backend was archived (see `AUDIT.md` and Phase 4A commits).
Lovable handles deploy; the optional k8s manifests under `infra/k8s/`
are preserved for self-hosted scenarios.

---

## Deployment

- **Frontend (production):** Lovable auto-deploys from `main`. Push there
  and the new build goes live shortly after.
- **Database (Supabase):** apply new migrations from
  `supabase/migrations/` via Supabase CLI or the Supabase dashboard.
  The CI SQL suites verify each migration against the regression
  fixtures before merging is safe.
- **Edge Functions:** deploy with the Supabase CLI from the project
  root: `supabase functions deploy <name>`.

For self-hosted scenarios, build the frontend image yourself:
```bash
docker build -f infra/docker/Dockerfile.frontend -t scrolluniversity-frontend .
```
The optional k8s manifests in `infra/k8s/` reference Deployments named
`scrolluniversity-frontend` (and `scrolluniversity-backend` for the
archived server) — they're kept for reference and aren't part of any
active deploy.

---

## Documentation

The full docs live under `docs/`:

| Where | What |
|---|---|
| `docs/README.md` | Index |
| `docs/USER_GUIDE.md`, `docs/ADMIN_MANUAL.md` | End-user / admin guides |
| `docs/DEVELOPER_GUIDE.md`, `docs/ARCHITECTURE.md` | Engineering |
| `docs/DEPLOYMENT.md` | Deployment specifics |
| `docs/TROUBLESHOOTING_GUIDE.md` | Common problems |
| `docs/SUYAS_*.md` | SUYAS subsystem (data model, API, governance, state machines, quick start) |
| `docs/guides/` | Mobile, PWA, content generation, Zapier, testing access control, deployment, launch specs |
| `docs/governance/` | Academic integrity framework, real-world impact framework, world-class excellence framework, sprint log |
| `docs/adr/` | Architecture Decision Records |
| `docs/api/openapi.yaml` | API surface |
| `AUDIT.md` | The Phase 0 audit that drove the recent restructure |

---

## Contributing

The codebase is mid-flight in a restructure (see `AUDIT.md`). Before
adding new top-level files or directories, check whether they belong
under one of the existing buckets (`src/`, `supabase/`, `infra/`,
`docs/`, `scripts/`, `content`-style under `courses/`, `archive/` for
dormant work). The git history captures who built what; please do not
add new `*_COMPLETE.md` / `*_IMPLEMENTATION.md` status files to the
root or to `backend/`.

When committing:
- Add a focused commit message; commit `.env`-style files only with
  placeholder values (use `.env.example`).
- Run `npm run lint`, `npx tsc --noEmit -p tsconfig.app.json`, and
  `npm run build` locally before pushing.
- The SQL regression suite (`supabase/tests/*.test.sql`) is blocking
  for any migration change.

---

## License

Internal — see project owners for licensing details.
