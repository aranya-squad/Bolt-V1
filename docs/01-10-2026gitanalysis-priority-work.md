# Git/deployment audit triage and P0 checkpoint — 01 October 2026

Source review: `docs/01-10-2026gitanalysisv1.md` plus a fresh re-check of
`feat-Sagar`, GitHub branch/status evidence, deployment scripts and recent deploy history.

## Priority classification

### P0 — fix before the next production image/release

1. **G01 — backend Docker context can include private runtime files.**
   - Evidence remains present at the reviewed branch: the production Dockerfile copies the
     backend context and the branch previously had no backend Docker ignore.
   - Required fix: context-root `backend/.dockerignore`, build from tracked source, and
     a synthetic-canary image/layer inspection before release.
2. **G03 critical subset — resumed deploy can turn SSH/read failure into a new Django key.**
   - The old resume script used `StrictHostKeyChecking=no`, swallowed lookup failure and
     generated a replacement key when the lookup returned empty.
   - Required fix: verified host-key checking, fail-closed secret retrieval, no implicit
     key replacement, owner-only env permissions.
3. **G02 critical subset — release-side effects can happen before trustworthy preflight and
   the final HTTP health result was informational only.**
   - Required fix: preflight verified SSH/secret state before metadata/image side effects;
     build from a named tracked Git revision; non-200/transport health failure must fail
     the release.

### P1 — material next fixes after the P0 checkpoint

1. **G02 remaining release reproducibility:** remove reliance on mutable `latest` across all
   supported release paths, verify one release artifact/digest, and fix generic Compose
   pull/migration ordering.
2. **G04 — CI install blocker:** `frontend/package-lock.json` is absent on `feat-Sagar`
   while CI uses `npm ci`. Reuse the already-reviewed lockfile foundation rather than
   regenerating dependencies casually.
3. **G05 — preview can proxy relative `/api` to production:** first establish the actual
   Vercel project/root/branch; then disable API-connected previews or point them only to
   an isolated nonproduction backend.
4. **G06 — GitHub controls:** fresh GitHub evidence shows `main` is currently unprotected.
   Add proportionate PR/review/required-check protection after CI is reproducible; make
   workflow token permissions explicitly minimal where provider settings require it.

### P2 — hardening / cleanup, not a release blocker

- Action SHA pinning or additional supply-chain scanning if the threat model justifies it.
- Historical/helper branch cleanup only after integration/recovery needs are confirmed.
- Optional process changes such as GitFlow, branch renaming, multiple approvers,
  CODEOWNERS committees, GitOps/Kubernetes, repo merger or a new staging estate remain
  unsupported by current evidence.

## Fresh Git/deployment evidence

- `feat-Sagar` was at `08ef74324acf8b14504ee7228abf1f32b1b05130` before this P0 work.
- `main` is currently reported by GitHub as `protected: false`.
- The last `main` commit has a failed Vercel status; that status does not prove which
  Vercel project/domain is production.
- No GitHub Actions workflow run is attached to the reviewed `feat-Sagar` tip.
- Recent repository history contains manual AWS/Caddy/Vercel deployment fixes, but source
  history does not prove the currently deployed AWS revision or active Vercel root.

## P0 implementation checkpoint

Implemented on `feat-Sagar`:

- added `backend/.dockerignore` to exclude env/credential/private-key and local artifacts;
- hardened `aws-resume-deploy.sh` to:
  - use a private process umask;
  - require an existing trusted `known_hosts` entry and strict host-key verification;
  - retrieve the existing Django secret before live metadata/image side effects;
  - fail rather than generate a replacement key on SSH/read/parse failure;
  - build the backend image from the tracked Git tree at the release SHA;
  - tag the release image with that Git SHA instead of `latest`;
  - write/copy the env file with owner-only permissions;
  - fail the release when the public health endpoint is not HTTP 200.

Not yet claimed complete:

- Docker image/layer canary acceptance has not run in this environment.
- The bootstrap `aws-deploy.sh` SSH path and generic `backend/deploy.sh` release ordering
  still need the same P0/P1 review once the supported production entrypoint is confirmed.
- No AWS, Vercel or production mutation was performed.
- No merge to `main` and no deployment was performed.
