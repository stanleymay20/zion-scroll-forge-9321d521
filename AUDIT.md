# ScrollUniversity — Repository Audit

_Audit date: 2026-06-28 • Branch: `claude/scrolluniversity-audit-restructure-y4ty40`_

This audit catalogues what's in the repo today, what's wrong with it, and a
proposed structure to make ScrollUniversity production-ready and easy to work
in. **No files have been moved or deleted yet** — every action in the
remediation plan is staged behind explicit approval, because several items
(committed binaries, `.env`, duplicate source trees) are partially destructive
to clean up.

---

## 1. Findings

### 1.1 Three "source" directories, two of them dead

| Directory             | Size  | Status          | Evidence |
|-----------------------|-------|-----------------|----------|
| `src/`                | 8.2M  | **Canonical**   | `vite.config.ts` alias `@` → `./src`; `tsconfig.app.json` `include: ["src"]`; `vitest.config.ts` `include: ['src/**/*']`; `index.html` loads `/src/main.tsx`. |
| `src-comprehensive/`  | 5.8M  | Dead duplicate  | Listed in `eslint.config.js` `ignores`; no imports reference it; identical to `comprehensive-src/`. |
| `comprehensive-src/`  | 5.8M  | Dead duplicate  | Same as above. |

The two "comprehensive" trees are byte-identical and exist only to confuse
contributors. Removing them deletes ~11.6 MB of working-tree clutter and
clarifies that `src/` is the one true frontend.

### 1.2 Documentation sprawl (431 tracked Markdown files)

- **66 Markdown files at repo root** — almost all are "TASK_NN_…_COMPLETE.md",
  "PHASE_N_…_REPORT.md", or "…_IMPLEMENTATION_COMPLETE.md" status reports for
  work already merged. These belong in commit messages, PR descriptions, or a
  changelog — not the root of the project.
- **105 files in `backend/`**, most of them the same pattern
  (`*_IMPLEMENTATION.md`, `*_COMPLETE.md`).
- Two empty files committed: `TASK_45_PWA_SETUP_COMPLETE.md` (0 bytes) and
  `backend/COURSE_CONTENT_CREATION_COMPLETE.md` (0 bytes).
- The "real" docs already live in `docs/` (architecture, deployment, developer
  guide, user guide, ADRs) — that directory is well-shaped and should be the
  only place documentation goes.

### 1.3 `README.md` describes a project that does not exist

The root README claims:

- A `backend/` powered by **Express + Prisma + PostgreSQL** with
  `npm run generate` / `npm run migrate` / `npm run seed`.
- A frontend that talks to that backend at `localhost:3001`.

The actual frontend (`src/`) talks directly to **Supabase**
(`@supabase/supabase-js` is in `package.json`, `src/integrations/` wires up the
Supabase client, `VITE_SUPABASE_*` env vars are required). The project
structure section omits `comprehensive-src/`, `src-comprehensive/`, `courses/`,
`lecturer-worker/`, `remotion/`, `k8s/`, `ENG_EBOOKS_M100/`, and `supabase.exe`.

A new contributor following this README cannot get the project running.

### 1.4 Secrets and binaries in the working tree

| Item                | Size  | Why it's a problem |
|---------------------|-------|--------------------|
| `.env`              | 642 B | Tracked in git. Contains `SUPABASE_URL` + Supabase **anon** JWT. The anon key is intended to be public, but committing `.env` normalizes the practice — the next person will commit a service-role key. `.env` is not in `.gitignore`. |
| `supabase.exe`      | 43 M  | Windows-only build of the Supabase CLI. Should be installed per-developer, not committed. |
| `ENG_EBOOKS_M100/`  | 124 M | 104 `.epub` files of ministry books. Either content assets (belong in Supabase Storage / a CDN) or dataset (belong out-of-tree or in Git LFS). Bloats every clone. |
| `bun.lockb`         | 180 K | Binary Bun lockfile, **coexisting** with text `bun.lock` (236 K) and `package-lock.json` (3.6 K) — three lockfiles for the same `package.json` is a guaranteed drift source. |

Combined, the repo carries ~167 MB of content that does not belong in a
source-control checkout.

### 1.5 Mixed package managers

- `package.json` script names are npm-style.
- Root has `bun.lock`, `bun.lockb`, **and** `package-lock.json`.
- `backend/`, `lecturer-worker/`, and `remotion/` each have their own
  `package.json` + lockfiles (some `bun.lock`, some `package-lock.json`).

Pick one (npm or bun) and either delete the others, or convert this to a
proper monorepo with a single root lockfile.

### 1.6 Subproject sprawl, no workspace

The repo is several projects in a trench-coat:

| Subproject         | Purpose                              | Has own package.json? |
|--------------------|--------------------------------------|------------------------|
| `src/` (root)      | React + Vite frontend                | shared root           |
| `backend/`         | Node/Express API (per README)        | yes                    |
| `lecturer-worker/` | Worker process (RunPod deploy)       | yes                    |
| `remotion/`        | Video rendering (Remotion)           | yes                    |
| `courses/`         | Course content (one course present)  | no                     |
| `scripts/`         | One-off TS + shell scripts           | no                     |
| `supabase/`        | DB migrations                        | no                     |
| `k8s/`             | Kubernetes manifests                 | no                     |
| `nginx/`           | Edge config                          | no                     |
| `.kiro/specs`      | Spec-driven specs (Kiro)             | no                     |

This is fine — it's actually a real system. It just needs to be **declared** as
a workspace (npm workspaces or bun workspaces) so dependencies install once,
TypeScript path resolution works across packages, and CI knows what to build.

### 1.7 CI / workflows

`.github/workflows/` contains:

- `test-suite.yml`
- `backend-sql-tests.yml`
- `production-deploy.yml`

These exist but aren't audited here — once the structure is settled, the
workflows need a pass to confirm they reference real paths (the dead
`comprehensive-src/` trees in particular).

### 1.8 Misc

- `.gitignore` ignores `node_modules` / `dist` but not `.env`, `*.local`,
  coverage output, OS junk beyond `.DS_Store`, or build artifacts of the
  subprojects.
- `.vscode/` is partially tracked (`.gitignore` excludes contents but allows
  `extensions.json` only). Fine — just noting.
- `package.json` `name` is still `vite_react_shadcn_ts`, `version` `0.0.0` —
  template defaults.

---

## 2. Proposed target structure

Goal: a workspace-rooted monorepo where every top-level directory has one
obvious purpose, docs live in `docs/`, content assets live out-of-tree, and
the README accurately describes what's there.

```
scrolluniversity/
├── README.md                       # accurate quickstart, links to docs/
├── CHANGELOG.md                    # rolled-up history (replaces the 60+ root MDs)
├── package.json                    # workspace root, declares workspaces
├── <lockfile>                      # ONE of: package-lock.json | bun.lock
├── .env.example                    # template, .env stays untracked
├── .gitignore                      # tightened
├── .github/workflows/              # CI (already present)
│
├── apps/
│   ├── web/                        # = current src/ + vite.config + index.html + tailwind
│   ├── backend/                    # = current backend/
│   ├── lecturer-worker/            # = current lecturer-worker/
│   └── video/                      # = current remotion/
│
├── packages/                       # (future) shared TS libs across apps
│
├── infra/
│   ├── docker/                     # Dockerfile.frontend, docker-compose.yml, nginx/
│   ├── k8s/                        # = current k8s/
│   └── supabase/                   # = current supabase/ (migrations + config)
│
├── content/
│   └── courses/                    # = current courses/ (course-authored content)
│
├── scripts/                        # = current scripts/
│
└── docs/
    ├── README.md                   # docs index (already exists)
    ├── architecture/               # ARCHITECTURE.md, ADRs
    ├── guides/                     # USER_GUIDE, DEVELOPER_GUIDE, ADMIN_MANUAL, DEPLOYMENT
    ├── api/                        # SUYAS_API_DOCS etc.
    ├── governance/                 # ACADEMIC_INTEGRITY_FRAMEWORK, REAL_WORLD_IMPACT_FRAMEWORK
    └── history/                    # one place for the TASK_*/PHASE_*/COMPLETE.md status logs
                                    # (or delete them — git log is the canonical history)
```

### What gets deleted

- `src-comprehensive/` and `comprehensive-src/` (~11.6 MB, both dead).
- `supabase.exe` (43 MB — devs install Supabase CLI per platform).
- Two extra lockfiles (keep one).
- The empty `*_COMPLETE.md` files.

### What gets moved out of the repo

- `ENG_EBOOKS_M100/` → Supabase Storage / a separate content repo / Git LFS.
  The decision depends on whether the app serves these files at runtime.

### What gets reorganized in place

- The 60+ root `*.md` files → `docs/history/` or deleted entirely (git log is
  already the canonical history of what was implemented when).
- `backend/`'s 100+ `*_IMPLEMENTATION.md` files → same treatment.

### What gets rewritten

- `README.md` — accurate quickstart for the actual Supabase + Vite stack,
  pointing at `docs/` for everything else.
- `.gitignore` — add `.env`, `.env.local`, `*.local`, `coverage/`, sub-app
  build outputs.
- `package.json` — declare `workspaces: ["apps/*", "packages/*"]`, give it a
  real name (`scrolluniversity`) and version.
- `eslint.config.js` — drop the `comprehensive-src` / `src-comprehensive`
  ignores once those dirs are gone.

---

## 3. Migration plan (phased, each phase is one PR)

Each phase is small enough to review and revert independently.

**Phase 0 — Audit (this PR).** Land `AUDIT.md`. No code moves. Get
alignment on the target structure before touching anything.

**Phase 1 — Secrets and binaries.**
1. Remove `.env` from the index (`git rm --cached .env`); add to `.gitignore`;
   copy current contents to `.env.example` with placeholders.
2. Remove `supabase.exe` (`git rm`); document Supabase CLI install in README.
3. Decide on `ENG_EBOOKS_M100/` (move to Storage, LFS, or external repo).
4. Pick one package manager; delete the other two lockfiles.

**Phase 2 — Dead code.**
1. `git rm -r src-comprehensive comprehensive-src`.
2. Remove their entries from `eslint.config.js`.
3. Delete empty `*_COMPLETE.md` files.

**Phase 3 — Documentation consolidation.**
1. Create `docs/history/`.
2. Move the 60+ root status MDs into it (or delete — recommend delete, the
   info is already in git log + PRs).
3. Same pass over `backend/*.md`.
4. Move `DEPLOYMENT_GUIDE.md`, `MOBILE_FEATURES_GUIDE.md`, etc. into
   `docs/guides/`.
5. Move framework MDs (`ACADEMIC_INTEGRITY_FRAMEWORK.md`,
   `REAL_WORLD_IMPACT_FRAMEWORK.md`, `WORLD_CLASS_*`) into
   `docs/governance/`.

**Phase 4 — Workspace layout.**
1. Create `apps/`, `infra/`, `content/`.
2. `git mv src apps/web/src`, move `vite.config.ts`, `index.html`,
   `tailwind.config.ts`, `postcss.config.js`, `tsconfig.app.json`,
   `vitest.config.ts`, `components.json`, `public/` under `apps/web/`.
3. `git mv backend apps/backend`; `git mv lecturer-worker apps/lecturer-worker`;
   `git mv remotion apps/video`.
4. `git mv k8s infra/k8s`; `git mv supabase infra/supabase`;
   `git mv nginx infra/docker/nginx`;
   `git mv Dockerfile.frontend docker-compose.yml infra/docker/`.
5. `git mv courses content/courses`.
6. Update path references: `eslint.config.js`, root `tsconfig.json`,
   workflows under `.github/`, any script that hard-codes `./src` or
   `./backend`.
7. Convert root `package.json` to a workspace root.

**Phase 5 — README + CI.**
1. Rewrite `README.md` against the new structure and the real Supabase stack.
2. Walk each workflow in `.github/workflows/` and update paths.
3. Re-run `npm run lint`, `npm test`, `npm run build` to confirm nothing
   broke.

---

## 4. Approval needed before proceeding

Before any of Phases 1–5 run, I'd like a sign-off on:

1. **Delete `src-comprehensive/` and `comprehensive-src/`?** (Strongly
   recommend yes — they're identical dead copies and already ignored by
   ESLint.)
2. **What to do with the 60+ root status MDs?**
   `delete` / `move to docs/history/` / `keep at root`.
3. **What to do with `ENG_EBOOKS_M100/`?**
   `move to Supabase Storage` / `move to Git LFS` / `move to a separate repo` /
   `keep in-tree`. Need to know if the app serves these at runtime.
4. **Package manager:** `npm` / `bun`. (Recommend npm — that's what the script
   names assume and what `package-lock.json` is for.)
5. **Workspace move (Phase 4):** confirm you want the `apps/`-style monorepo
   layout, or prefer to leave subprojects at root and just clean up docs +
   dead code.

Once these five answers are in, the remaining phases are mechanical.
