# Git/deployment audit triage and implementation checkpoint — 01 October 2026

Source review: `docs/01-10-2026gitanalysisv1.md` plus fresh inspection of
`feat-Sagar`, GitHub branch/ruleset/status evidence, deployment scripts, CI and
recent deploy history.

## Priority classification

### P0 — release/security blockers

1. **G01 — backend Docker context could include private runtime files.**
   - Production Dockerfile uses `COPY . .`; the reviewed branch originally had no
     backend context ignore.
   - Fix: context-root `backend/.dockerignore`, tracked-source build and a real
     image/filesystem/layer synthetic-secret canary.
2. **G03 critical subset — resumed deploy could turn SSH/read failure into a new Django key.**
   - Old resume path used `StrictHostKeyChecking=no`, swallowed lookup failures and
     generated a replacement key when lookup returned empty.
   - Fix: verified known-host requirement, strict SSH, fail-closed secret read, no
     implicit key replacement and owner-only env permissions.
3. **G02 critical subset — release side effects preceded trustworthy preflight and health
   failure was informational only.**
   - Fix: verified SSH/secret preflight before metadata/image effects, tracked Git
     release source and a failing non-200/transport health gate.

**Status: SOURCE FIXED + CI VERIFIED.** See verification below. This does not mean
merged or released.

### P1 — material release/review fixes

1. **G02 release reproducibility and ordering**
   - Compose now uses one required immutable `IMAGE_REF=<repo>@sha256:<digest>` for
     web/worker/beat; there is no production Compose `latest` fallback.
   - Resume deploy pushes a Git-SHA tag, resolves the ECR digest, then uses that exact
     digest for pull, migration, collectstatic and Compose.
   - Generic Compose deploy pulls the immutable release before migrations and starts
     the same reference.
2. **G04 CI install blocker**
   - Reused the already-reviewed `frontend/package-lock.json` from
     `chore/agent-workflow@b03d167` after checking its root dependencies/devDependencies
     match current `frontend/package.json`.
   - Added the narrow `.gitignore` exception so the frontend lock remains tracked.
3. **G05 preview → production API risk**
   - Still investigation-gated. Both checked-in Vercel configs can route relative
     `/api` to production, but the active Vercel project/root/preview policy is not
     established by repository source alone.
   - The draft PR has not reported a Vercel commit status at the inspected heads. That
     is not proof that no preview exists.
   - Do not change production/preview routing until the hosting owner confirms the
     active project/root/branch and desired preview policy.
4. **G06 GitHub controls**
   - GitHub currently reports `main` as `protected: false`; repository rulesets
     endpoint returned no rulesets.
   - Classic branch-protection detail is not readable through the installed GitHub App
     administration scope, so no stronger claim is made.
   - After CI verification, the observed checks suitable for a proportionate protection
     rule are: `backend`, `frontend`, `build`, `docker-context`, and
     `release-scripts`.
   - No branch-protection setting was mutated by this task.

**Status: P1 SOURCE WORK STARTED AND VERIFIED for G02/G04. G05 and the admin-setting
part of G06 remain pending owner/provider confirmation.**

### P2 — hardening / cleanup

Completed:
- CI now declares `permissions: contents: read`; a GitHub-hosted run showed effective
  token permissions `Contents: read` and `Metadata: read`.
- Third-party Actions are pinned to immutable commits:
  - checkout v4: `11d5960a326750d5838078e36cf38b85af677262`
  - setup-python v5: `a26af69be951a213d495a4c3e4e4022e16d87065`
  - setup-node v4: `49933ea5288caeca8642d1e84afbd3f7d6820020`
  - upload-artifact v4: `ea165f8d65b6e75b540449e92b4886f43607fa02`

Remaining/deferred:
- GitHub now warns that some pinned Actions target the deprecated Node 20 Actions runtime
  and are being forced to Node 24. Upgrade majors should be reviewed separately rather
  than silently changing CI dependencies during this security/release fix.
- Historical/helper branch cleanup only after integration/recovery needs are confirmed.
- No evidence warrants GitFlow, branch renaming, multiple mandatory approvers, a broad
  CODEOWNERS committee, GitOps/Kubernetes, repository merger or a new staging estate.

## Fresh Git/deployment evidence

- `feat-Sagar` was `08ef74324acf8b14504ee7228abf1f32b1b05130` before this
  implementation sequence.
- `main` remains `cec94ea187ab3fcf571f73dd4468b1edaf0d290a` during this work.
- GitHub branch metadata reports `main` unprotected; repository rulesets list is empty.
- The last main commit has a failed Vercel status, but this does not identify the current
  production domain/revision or establish preview behavior.
- Draft validation PR: `#4`, `feat-Sagar -> main`. It exists to execute CI/review only;
  it is not merge or deployment authorization.
- No AWS, Vercel, DNS, secret, branch-protection or production-data mutation occurred.

## P0 implementation and acceptance

Implemented on `feat-Sagar`:

- `backend/.dockerignore` excludes env/credential/private-key and local artifacts.
- `aws-resume-deploy.sh`:
  - uses a private process umask;
  - requires a pre-existing trusted `known_hosts` entry with strict host verification;
  - retrieves the existing Django secret before live metadata/image side effects;
  - fails on SSH/read/parse failure instead of synthesizing a replacement key;
  - builds from the tracked Git backend tree;
  - resolves and deploys one ECR image digest;
  - writes/transfers the env file owner-only;
  - fails the release when the public health endpoint is not HTTP 200.
- `scripts/verify-backend-docker-context.sh` builds the actual production Dockerfile from
  tracked backend source, injects synthetic secret canaries, verifies required runtime
  imports/content, and scans both final filesystem and saved layers.

### GitHub-hosted acceptance evidence

CI run **#27** at `c6270605711fc82dba76f953032cc7f96c7fd8c5` completed successfully:
- `backend`: Ruff passed; pytest reached 100% (145 test progress markers).
- `frontend`: `npm ci`, lint, type-check and **25 tests** passed.
- `docker-context`: **PASS** — synthetic secret canaries absent while runtime content remained.
- `release-scripts`: shell syntax + immutable Compose interpolation passed.
- `build`: Vite production build passed.

CI run **#28** at `f794ec0f58eafe5a694bb143a756e95b4d604fa7` also completed successfully
after removing the remaining mutable Compose image fallback. All five jobs above passed.

Earlier canary failures were harness defects, not accepted security failures:
- first harness matched legitimate CA certificate `.pem` files;
- second harness revision was malformed during an automated replacement;
- both were corrected, and the clean canary subsequently passed in runs #27/#28.

## Boundaries and remaining exact actions

1. **Do not merge/deploy yet.** Keep PR #4 draft until human review.
2. **G05:** hosting owner must confirm which Vercel project/root/revision serves student/
   teacher production and whether PR previews are enabled/API-connected. Then choose:
   disabled API previews, or an isolated nonproduction API target. Never restore an
   implicit production preview route for convenience.
3. **G06:** repository administrator should add a proportionate main protection rule after
   human review, using the verified CI job names above and one human review as appropriate
   for the small team. This connector does not provide branch-protection mutation access.
4. **Bootstrap path:** `aws-deploy.sh` is still a first-infrastructure bootstrap, not the
   verified resumed-release path. Its first-contact SSH enrollment cannot be made
   genuinely verified without an authenticated owner/AWS fingerprint source. Do not
   replace it with blind `ssh-keyscan`/TOFU and call that secure.
5. No production release claim is valid until deployed revision/image digest and live
   health are independently confirmed.
