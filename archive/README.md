# archive/

Dormant subprojects parked here pending a decision to revive or retire.

Nothing in `archive/` is built, deployed, type-checked, or referenced by the
live application (`src/`), the Supabase project (`supabase/`), or any
GitHub Actions workflow. It exists so the work isn't lost — not because
it's currently used.

## What's here

### `archive/backend/`
Express + Prisma backend from an earlier architecture. The live app talks
to Supabase directly via `@/integrations/supabase/client`, and all business
logic that was being built here was migrated to Supabase Edge Functions
under `supabase/functions/`. The Prisma schema and this server are no
longer the source of truth. As of archiving, `npm run build` here reports
~25 TypeScript errors (missing `@prisma/client` enums, duplicate type
declarations) — these are expected and not in scope to fix while archived.

### `archive/lecturer-worker/`
Standalone Node worker (RunPod deploy target) for AI lecture rendering.
No references from the live app or CI. Kept because the roadmap may need
a long-running worker for video / avatar pipelines.

### `archive/remotion/`
Remotion video rendering project. Its `package.json` has `"scripts": null`
and no caller in the repo. Kept against the chance the video pipeline
returns.

## Reviving an archived subproject

1. Read the subproject's own README / source to understand its state at
   archiving time.
2. Move it back out (e.g. `git mv archive/backend backend`).
3. Wire it back into CI: add the relevant job(s) to
   `.github/workflows/production-deploy.yml`.
4. Update the root `eslint.config.js` ignore list as needed.
5. Update the root `README.md` to mention it as live again.

## Retiring permanently

If a subproject has been here for a release cycle without anyone reaching
for it, it can be deleted outright. The git history preserves everything.
