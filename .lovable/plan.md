# Production blank page — root cause and minimal repair

## Findings (verified read-only)

1. **Live bundle has no backend address.** Both scrolluniversity.org and zion-scroll-forge.lovable.app serve the same file, `assets/js/index-BpTKdAxY.js` (about 920 KB). It contains the "supabaseUrl is required" check but does **not** contain this project's backend address. So the build ran with an empty `VITE_SUPABASE_URL`, and almost certainly an empty publishable key as well.
2. **Published version.** The old broken bundle `BpTKdAxY` is still live. The pending deploy `912aa0ee…` has **not** replaced it, so the publish has not completed (or it produced the same empty build). The current workspace HEAD is `cc436bf…`, which is newer than `2f3fed1…`.
3. **Environment injection is now healthy.** The workspace `.env` exists, was rewritten at 23:15 UTC today (when the backend resumed), and defines `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (210 chars, not printed) and `VITE_SUPABASE_PROJECT_ID`. Lovable Cloud reports auth and database reachable.
4. **Root cause.** `.env` is listed in `.gitignore`, so the build cannot pick it up from the repo. It relies on Lovable injecting the values at build time. While the backend was paused, that injection was missing, so the published build baked in `undefined`. The generated client has no guard for a missing value, so the app crashes on its first module evaluation and the page stays blank. Green GitHub checks don't cover this because CI never checks a published bundle for the backend address.
5. **Will a rebuild fix it?** Yes. The backend is online and the values are present again, so a fresh publish should bake them in. No code change is needed.

## Minimal safe repair

1. Republish the current version from the Publish dialog (click Update). Don't change any code, database, auth or migrations.
2. Verify once the deploy finishes:
   - The live site serves a **new** `index-*.js` file name, not `BpTKdAxY`.
   - That bundle contains the project's backend host.
   - The homepage renders, and the console has no "supabaseUrl is required" error, on both scrolluniversity.org and the lovable.app URL.
3. If the new bundle still lacks the address, check that Lovable Cloud is connected to this project and contact Lovable support with deploy ID `912aa0ee…`. Don't hardcode keys.

## Optional follow-up (separate approval)
- Add a release-gate check that fails if the built bundle is missing the backend host.
