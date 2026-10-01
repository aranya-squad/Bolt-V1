# Bolt developer handoff: next steps — 01 October 2026

Repository publication note: this commit contains only the two dated documents. Source links are relative to this repository. Referenced probe scripts, logs, the first `assessment.md`, AWS collector/policy and cost worksheet are original local audit artifacts, not files included in this commit. Their names preserve evidence provenance; use the documented cases and repository tests to vet findings if those artifacts are unavailable.

Read this with [assessment01-10-2026.md](assessment01-10-2026.md). The assessment records evidence and limitations; this document proposes implementation work. Findings **F01–F19** and observations **D01–D15** refer to that assessment. Suggested contracts/model names below are proposals, not existing functionality or approved tournament requirements.

Target: fix the current learning app and establish a reliable base for **100–150 simultaneous timed participants**, with a measured path toward thousands. Keep React/Vite, Zustand, TanStack Query/Axios, Django/DRF, PostgreSQL, Redis, Celery, Gunicorn/Caddy and the existing Compose deployment. No architecture rewrite is proposed.

Reviewed baseline: Bolt-V1 `62ddc8c`, separate Bolt-V1-frontend `b26fd2c`. Repository paths below are relative to Bolt-V1 unless stated otherwise. Clickable source links target this repository; a developer moving the documents should preserve their location under `docs/`. Recommendations must be rechecked against the implementation branch before coding.

**Current scope is a handoff, not implementation or deployment authorization.** No fixes, pushes, AWS provisioning or deployment were performed to create it. Cloud costs, live configuration and deployed revision remain unverified. Respect the existing GitHub-only boundary; review external hosting integrations before pushing a later implementation.

## How to work through the waves

Every task identifies the issue to vet, a proportionate fix and completion evidence. Use task IDs in PRs. “Done” means the relevant tests/checks ran, not merely that code changed. For source-only or hypothetical findings, reproduce or inspect the deployed configuration before asserting an incident or applying a speculative repair.

| Wave | Category focus | Exit criterion |
|---|---|---|
| 0 | Product, repository identity, QA baseline | Rules/dependencies documented; defects reproduced on the working branch |
| 1 | Authentication/privacy, build/release, browser integration | Small broken paths repaired; reproducible, safe local/staging artifact |
| 2 | API/data correctness, frontend persistence | Replay-safe answers, shared validation, stable scoring and recoverable writes |
| 3 | Event flow, content and authorization | Approved minimal timed-event flow works without disrupting ordinary learning |
| 4 | SQL performance, AWS evidence and cost tuning | Measured app behavior and attributable cost comparison |
| 5 | QA, recovery and launch handoff | Production-like acceptance evidence and operational runbook |
| 6 | Conditional growth | Only changes justified by measured bottlenecks or agreed failure tolerance |

Waves are dependency groups, not calendar weeks. Wave 0 decisions and AWS read-only evidence collection can run alongside independent Wave 1 fixes. Wave 2 correctness precedes final performance benchmarks. Wave 3 depends on the tournament rules. Cloud changes and public load tests need separate authorization; local tests and reviewed implementation PRs can proceed without an AWS deployment cycle.

For each PR, include finding/task IDs, a short before/after reproduction, affected API callers, migration/backfill implications and meaningful validation. Convert relevant diagnostic expectations into regression tests; do not copy assertions that expect 500s or inflated scores as acceptance criteria. Do not change historical results or remove audit records silently.

## Wave 0 — establish the working contract

### Category: Product and project identity

#### W0-PROD-01 — identify the canonical frontend and deployment sources

**Covers:** F14, F16, F17. **Owner:** project lead + frontend/platform developer.

- **Vet:** compare `Bolt-V1/frontend` with the separate frontend checkout; confirm actual production/preview URLs, deployed commit, image digest, API origin and GitHub/Vercel integrations. The observed file-count difference does not decide which repo is authoritative.
- **Recommendation:** choose one frontend source for this release and record where CI/build/deployment reads it. Keep the other unchanged until ownership is resolved; any necessary feature reconciliation should be an explicit PR, not wholesale directory replacement. Record GitHub Apps/hosting branch triggers, including PR previews.
- **01 October clarification:** the user chose repository recency as a fallback after supplying the student/teacher hostnames. Use bundled `Bolt-V1/frontend` provisionally for answer recovery; CI builds that directory, but live deployed revision/hosting selection remains unverified. Root `Bolt-V1/vercel.json` has the API proxy plus SPA fallback; standalone config has only SPA fallback. Verify the actual hosting root/config before human rollout; do not generalize the standalone routing issue to both repositories.
- **Done:** a short source/release map identifies frontend/backend branches, artifact provenance, URLs, build-time API variable and automatic deployment behavior. If access is missing, mark each field unknown and assign an owner; independent fixes can continue.

#### W0-PROD-02 — agree the smallest event and service specification

**Covers:** F01–F04, F12, F17, F18. **Owner:** Product + organizer + technical lead.

- **Vet:** obtain round duration, answer cadence, shared/individualized questions, participant eligibility, late joins, allowed attempts/skips, deadline/grace, recovery after disconnect, tie-break and result publication. Decide whether a leaderboard is actually needed.
- **Recommendation:** for a first simultaneous event, prefer one server-timed round, pre-enrolled participants, one accepted answer per question, server receipt as the deadline authority, and post-round results. These are proposed defaults requiring agreement. Decide whether the existing one-retry classwork UI, server cap of three and practice retries are intentional; preserve approved learning behavior separately.
- **Done:** record rules plus monthly/event budget, latency target and acceptable interruption/recovery. Use the assessment's p95/p99 and 300-participant headroom targets only if adopted. A server cannot prove offline entry time from a browser timestamp; specify what an unacknowledged answer means at the deadline.

#### W0-PROD-03 — decide role, consent and retention behavior

**Covers:** F10, F15. **Owner:** Product/privacy owner + backend lead.

- **Vet:** intended ADMIN access to the teacher portal, eligible class-join roles, who approves student participation, and actual school/guardian attestation process. Inspect `users.User`, `classroom.EnrollmentConsent` and deletion's retained fields, including DOB and request metadata.
- **Recommendation:** write a small role/ownership matrix and a field-retention table. Prefer existing enrollment and teacher ownership checks. Do not grant ADMIN broad access merely to silence a 403. Do not label a student's request as a teacher action without a real approval policy/process.
- **Done:** API/UI access rules and attestation/retention owners are explicit. Mechanical deletion/login fixes need not wait; changes to retained personal data and consent require this decision. Immutable consent models must not be bypassed casually with queryset deletion.

### Category: QA baseline

#### W0-QA-01 — verify the assessment on the implementation branch

**Covers:** F01–F19; D01–D15. **Owner:** developer + QA.

- **Vet:** rerun the relevant probes in a disposable local database and inspect the source-only findings. Use `test_diagnostics.py`, `test_second_pass.py` and `second-pass-diagnostics.log`. Record HEAD/settings/service versions and distinguish “reproduced,” “already fixed,” “conditional” and “needs evidence.”
- **Recommendation:** add corrected regression tests near existing `apps/exercises/tests/test_views.py`, `apps/progress/tests/test_services.py`, `apps/users/tests` and `apps/classroom/tests`. Use real database transactions/connections for races. Keep fast unit tests; add targeted real-hasher/throttle/integration coverage rather than converting the entire unit suite into an expensive production simulation.
- **Done:** each task has an issue/reproduction or a documented source/config check. No production test data or public traffic is used. Fifteen passing adverse-behavior probes must not be reported as release acceptance.

## Wave 1 — repair small broken paths and release boundaries

### Category: Authentication and privacy

#### W1-API-01 — fix unknown-call-sign authentication

**Covers:** F06; D10/D11. **Owner:** backend. **Start:** immediately after vetting.

- **Vet/location:** `backend/apps/users/backends.py`, `users/views.py`, `users/tests/test_call_sign.py`. An unknown profile reaches a malformed PBKDF2 dummy hash. Check known, unknown and inactive accounts with production hashing enabled.
- **Fix:** replace the invalid encoded hash with a valid dummy hashing operation following Django's authentication pattern, e.g. an unsaved `User().set_password(pin)` on a missing-account path. Do not save that user, hardcode hash internals, downgrade hashing or catch all errors and return success. Validate login input types through a DRF serializer so non-string call signs/PINs cannot cause `.strip()` exceptions. Keep generic invalid-credential responses.
- **Done:** correct login still issues tokens/cookie; unknown/wrong/inactive credentials receive intended errors without 500; malformed payloads return 400. Real-hasher tests pass. Equivalent hash work reduces one timing discrepancy; it is not a proof of perfect constant-time authentication.
- **Impact:** no model migration or new auth provider. Throttle work is W2-API-05.

#### W1-API-02 — repair deletion and implement approved retention

**Covers:** F10; D08. **Owner:** backend + privacy owner.

- **Vet/location:** `backend/apps/users/views.py:DeleteAccountView` and `models.py:AuditEvent`. Verify the current 500 with a valid credential and inspect approved retained fields from W0-PROD-03.
- **Fix:** create the audit event using existing `actor`, `subject`, `action`, `metadata` fields within the deletion transaction. Keep re-authentication, anonymization and deactivation atomic. Delete the refresh cookie using the same name/path/domain helpers as logout; verify JWT rejection for inactive users and the installed refresh serializer's behavior. Blacklist the necessary outstanding refresh tokens through existing SimpleJWT models if the approved “all sessions revoked” requirement needs it.
- **Done:** valid deletion returns 204, user is inactive, retained/scrubbed fields match policy, and audit failure rolls back the wipe. Wrong credential changes nothing. Old access/refresh credentials cannot regain access under the approved policy. Test student and teacher cases.
- **Impact:** the field-mismatch fix is small; DOB/consent retention or extra attestation evidence may require a separate additive migration. Preserve existing audit history; no blanket hard-delete.

### Category: Build and deployment configuration

#### W1-PLAT-01 — exclude secrets/dev artifacts and run the image as non-root

**Covers:** F07. **Owner:** platform/backend.

- **Vet/location:** `backend/docker/Dockerfile.prod`, AWS scripts' `docker build` context. Inspect applicable ignore files and privately check existing image layers if accessible. Source establishes a possible inclusion path, not an actual credential leak.
- **Fix:** add `backend/.dockerignore` covering `.env*`, virtual environments, caches, local logs, uploads, keys/certificates and other local artifacts while retaining required application/requirements files. Keep secrets supplied at runtime. Add a dedicated non-root user and grant only required writable paths; verify worker/beat scheduling files and static-collection paths remain usable. Do not assume `gitignore` controls Docker.
- **Done:** clean image builds/runs web, worker and beat; a dummy canary environment file/key placed in a disposable build context is absent from the final image/layers; development virtualenv is absent. Report image size/architecture without inspecting secrets into logs.
- **Impact:** no AWS resource changes. If a secret is actually found in a distributed image, privately identify the affected artifact and follow a scoped rotation response; source risk alone does not prove exposure.

#### W1-PLAT-02 — reconcile internal health and fresh bootstrap

**Covers:** F08; D15. **Owner:** platform/backend.

- **Vet/location:** `docker-compose.prod.yml`, `Caddyfile`, `backend/config/settings/production.py`, `aws-deploy.sh`, `aws-resume-deploy.sh`. Test the actual image's health command under production redirect/allowed-host options; the previous reproduction was middleware-level only.
- **Fix:** keep public HTTPS enforcement. For the internal loopback probe, send the trusted `X-Forwarded-Proto: https` header and a host accepted by `ALLOWED_HOSTS`, or narrowly exempt only a dedicated internal probe path. Prefer the header fix for the current setup; document that Gunicorn port 8000 is private and forwarding headers are accepted only from trusted traffic. Align bootstrap with current 80/443 ingress, Caddyfile copy/mount and domain/ACME variables; fail clearly on missing inputs.
- **Done:** local/isolated staging Compose health reaches 200 without redirect/TLS errors; public HTTP still redirects; DB/Redis failures produce the intended degraded response. Readiness should execute a bounded `SELECT 1`, not merely reuse an established DB connection. Keep one health endpoint initially; split liveness/readiness only if tooling needs distinct behavior. Compose `unhealthy` is not itself proof of an automatic restart.
- **Impact:** code/config rehearsal only; do not run AWS bootstrap/resume against production during this work.

#### W1-PLAT-03 — make builds repeatable and release identity explicit

**Covers:** F09, F16. **Owner:** frontend/platform.

- **Vet/location:** `.gitignore`, `.github/workflows/ci.yml`, `frontend/package.json`, `backend/requirements/*.in` and `*.txt`, both AWS scripts and `backend/deploy.sh`.
- **Fix:** use npm as CI already does; remove/narrow the ignore rules preventing the selected frontend's `package-lock.json` from being tracked, generate it using the agreed Node/npm toolchain, and retain `npm ci`. Match local/CI Node versions. Use the repository's existing pip-compile convention to capture transitive Python dependencies; review resolution changes instead of silently upgrading the whole stack. Check upstream support/advisories for the pinned framework/runtime versions and make any necessary supported-version update a focused compatibility PR; no CVE finding is asserted here.
- **Release fix:** build/tag by commit and record the digest; target verified EC2 architecture. Preserve a reviewed rollback digest. Distinguish missing secret from failed SSH retrieval and fail closed instead of generating a replacement key on transport error. Verify SSH host identity or use an established SSM path if one exists; introducing a new deployment platform is unnecessary.
- **Done:** fresh-checkout install/lint/test/type-check/build passes; compatible image identity and SPA commit are recorded; dry-run/local script checks reject missing secrets/config. Fix migration-script working directory/Compose/env loading if the actual path fails. Do not describe single-host Compose recreate as a rolling deployment.
- **Impact:** no automatic AWS deployment job is added. Review external hosting triggers before GitHub work.

### Category: Browser/API integration

#### W1-FE-01 — verify API origin, mocks and token lifecycle

**Covers:** F14. **Owner:** frontend + backend/platform.

- **Vet/location:** `frontend/src/shared/api/client.ts`, `main.tsx`, `shared/store/authStore.ts`, Vercel configuration and server cookie/CORS settings. Confirm the real deployment from W0-PROD-01.
- **Fix:** document the build-time API origin without a duplicate `/api/v1` suffix. Prefer existing same-site custom domains for SPA/API and explicit credentialed CORS. Retain HttpOnly refresh cookies and in-memory access tokens. Development MSW may remain for UI work; use a built preview with mocks off for integration.
- **Done:** real login, refresh after expiry/reload, logout and API JSON responses pass on representative origins/browsers. Test two tabs refreshing simultaneously. If that race reproduces, add small browser-native coordination, e.g. Web Locks/BroadcastChannel with a tested fallback; do not weaken blacklist/rotation or add a new identity service preemptively.
- **Dependencies:** canonical source/URLs required for live-origin acceptance. Local built-preview tests can start earlier.

## Wave 2 — make answer persistence and scoring dependable

### Category: API contracts and PostgreSQL invariants

#### W2-API-01 — use one attempt policy and explicit replay identity

**Covers:** F01, F03; D01–D03. **Owner:** backend + frontend. **Depends:** W0-PROD-02.

- **Vet/location:** `exercises/views.py:SubmitAttemptView/BulkSubmitAttemptView`, `progress/models.py:QuestionAttempt`, `progress/services.py:record_attempt`, `frontend/src/shared/api/queries/useSession.ts`. The database already has uniqueness on `(session, question_index, attempt_number)`; the server currently recomputes `count()+1`, and practice sends zero-based numbers that are ignored.
- **Fix:** keep the routes and existing tuple as the retry identity. Define explicit **one-based** `attempt_number` for both write paths; update the frontend and require it for the new reliable contract. Store/retry the same payload with the same number. For an existing tuple, return the stored receipt when immutable submitted fields match; return a structured 409 when the same identity carries conflicting data. Look up replays before deadline/closed-session rejection so an accepted write can be recovered after closure. New writes must still satisfy all rules.
- **Policy:** centralize request normalization and per-session mode rules in a small shared service, retaining durable writes in `progress/services.py`. Validate index/type, cap, ordering, skip and elapsed input consistently. Count new accepted attempts, not retries. Treat a successful answer or skip as terminal only if the learning policy adopts that rule. Client elapsed time remains untrusted metadata.
- **Done:** replay, mixed single/bulk replay, conflicting payload, exhausted cap, test-mode second answer and malformed item tests pass. No cached verdict is the sole durable copy.
- **Migration/compatibility:** audit nullable legacy attempt numbers before tightening nullability/check constraints; preserve existing uniqueness. A missing-number compatibility path may be temporary but cannot promise idempotency. Document frontend/API rollout order and a minimum supported client contract; do not silently guess whether an old request is a retry. Do not add UUID receipt tables or a message broker when the existing tuple suffices.

#### W2-API-02 — validate an entire batch before writing

**Covers:** F01, F03; D02/D06/D07. **Owner:** backend. **Depends:** W2-API-01.

- **Fix/location:** add a DRF input serializer for the batch; validate list/item types, all values, identity conflicts, caps, skip/test policy and timing rules before mutation. Permit multiple attempts for one question when their attempt numbers are distinct and the practice policy allows them; reject duplicate/conflicting identities, not every repeated question index.
- **Transaction:** lock the existing `ArenaSession` once and load prior attempts once. Build a normalized plan in memory, including earlier items in the same batch, then write within one explicit transaction. Prefer **all-or-nothing** acceptance for this first version; use `ValidationError`/exceptions to roll back instead of returning 400 after inserts. Return per-identity receipts, including replay receipts, in deterministic order. Remove the current implicit “skip some fast items” behavior if adopting all-or-nothing; update callers/tests accordingly.
- **Bound:** limit batch item count based on question count/approved retries plus a configured upper bound; bound payload size in the actual ingress/app path. No new ingestion service is needed.
- **Done:** invalid second item leaves zero new rows; wrong/correct practice pair is accepted according to policy; duplicate batch retry creates no rows; a replay mixed with invalid/new data has a defined result. Skip/zero-answer cases pass.

#### W2-API-03 — score distinct questions and finalize consistently

**Covers:** F01, F03, F18, F19; D13. **Owner:** backend. **Depends:** W2-API-01/02.

- **Vet/location:** `progress/services.py:finalize_session`, `exercises/views.py:FinalizeSessionView/SessionReportView`, `progress/xp_rules.py`. Keep the current per-session row lock and one-to-one `ProgressRecord`; finalization is already retrievable on retry at the view level.
- **Fix:** derive one result per question under the approved rule. Recommended ordinary practice rule: at most one correct credit for a question with an allowed correct non-skip attempt; tournament first accepted answer decides. Keep denominator equal to frozen session question count. Make reports and scoring use the same reducer. Do not merely clamp 133.33% to 100%; that hides duplicated scoring and XP.
- **Consistency:** keep scoring and immediate result/receipt reads explicitly on PostgreSQL primary, including `QuestionAttempt`/`ProgressRecord` reads if replica routing is configured. Validate that one finalization produces one intended XP/completion effect. Test answer-versus-finalize ordering using real concurrent transactions.
- **Persistence guard:** frontend must await receipts before submit. As a small additional guard, allow submit to carry the identities it expects persisted; compare that manifest with stored attempts under the session lock and return a recoverable conflict if any are missing. This verifies declared work, not unseen browser state. An empty/partial timed session may still finalize under the approved policy.
- **Done:** D13 becomes 1/3 under the proposed distinct-credit rule; results/XP stable across repeated finalize; no accepted write appears after results were frozen; report agrees with score. Preserve append-only history. Produce an anomaly report for existing inflated records; any correction/backfill requires separate reviewed policy, not an in-place silent rewrite.

#### W2-API-04 — freeze time limits and enforce starts/resumes/deadlines

**Covers:** F02, F05, F18; D04/D09. **Owner:** backend + frontend.

- **Vet/location:** session starts, `ArenaSession`, `SessionMetaSerializer`, `exercises/tasks.py`, `ClassworkPage.tsx` and `InArenaPage.tsx`. Time display reads a mutable template for classwork; both pages count down from a fresh duration.
- **Fix:** capture the effective limit at creation and add a nullable `expires_at` to `ArenaSession` (null for approved untimed practice). Expose additive `started_at`, `expires_at`, `server_now` metadata. Check the server clock before every **new** answer; define/document the server timestamp capture point and boundary comparison, including lock/queue delay. Allow replay recovery and finalization of already accepted work after expiry. Keep periodic cleanup as housekeeping, with an intentional retention window so it cannot invalidate active recovery/finalization unexpectedly.
- **Eligibility:** share previous-level/previous-lesson checks across both start routes; validate the mode with a DRF boolean field rather than Python truthiness of arbitrary input. Resume only a matching requested mode/template. Do not mutate an existing session's mode. Return a clear conflict when switching modes requires ending the prior session, or permit separate matching sessions if Product approves.
- **Concurrency:** reproduce simultaneous start and different-session completion races first. If necessary, serialize start/finalize by locking the existing user row and then session/completion rows in a consistent order. Existing completion uniqueness must remain. Add only a narrowly defined active-session constraint if the approved invariant warrants it; user-wide locks do not serialize different students.
- **Done:** direct lesson route cannot bypass approved access; timer survives reload/background tabs; requests at boundary follow the agreed comparison/grace rule; template edits do not change an in-flight limit. Review legacy-session backfill before populating deadlines; do not expire all old sessions unexpectedly.

#### W2-API-05 — wire scope-specific limits without blocking a school

**Covers:** F11, F06. **Owner:** backend/security. **Depends:** expected cadence from W0-PROD-02.

- **Vet:** default anon/user limits are both 60/min; several views declare scopes without `ScopedRateThrottle`. Class join already explicitly uses it. Confirm Caddy/Gunicorn client-IP handling and that direct public access to port 8000 is closed.
- **Fix:** explicitly use scoped per-user limits for attempt/profile/join routes, leaving normal read protections separate. Use existing DRF throttle classes and Redis cache. Do **not** simply attach the existing `login: 5/min` per-IP scope to all logins: 150 students behind one school IP would collide. Use a small custom login throttle keyed to normalized account/call sign plus a separately measured shared-IP burst ceiling. Avoid raw identifiers in keys/logs; use Django's keyed hashing helper if needed. Keep generic responses and a documented abuse/temporary lockout policy.
- **Done:** real-hasher, no-forced-authentication tests cover one abusive account and 150 distinct accounts behind one IP; expected cadence and retries avoid unexpected 429; abusive requests are limited and `Retry-After` handled. DRF cache throttles are approximate under concurrency; add atomic Redis enforcement only if a measured/security requirement demands it.
- **Impact:** configuration/small DRF subclass, not a new auth gateway. No global throttle disable.

### Category: Frontend persistence and API rollout

#### W2-FE-01 — recover pending writes in both classwork and practice

**Covers:** F03, F14. **Owner:** frontend. **Depends:** W2-API-01/02/03; coordinate in the same release.

- **Vet/location:** practice `flushAttempts/handleFinalize`, classwork `handleSubmit/handleSkip/handleFinalize`, `useSession.ts`, `sessionStore.ts`, `SyncDot.tsx`. **Additional source-backed scope:** classwork currently advances after failed submit and swallows failed skip, so fixing practice alone is insufficient. This was inspected for this handoff; it is not a new browser reproduction.
- **Fix:** extend existing hooks/types with explicit attempt identity and receipt fields. Assign the number once; keep identical payload across retries. Flush practice in small bounded groups/on progress rather than only at session end, while preserving local practice feedback. Remove only acknowledged identities, not the whole queue: new input may arrive while an earlier flush is in flight.
- **Durability:** use a small session-scoped pending queue in the existing Zustand/browser storage approach, preferably `sessionStorage` for bounded per-tab reload recovery. Store user/session IDs and pending payloads/position only; no PINs/tokens. Clear on acknowledged completion/logout and enforce expiry/cross-user checks. Storage can fail or be cleared; surface that limitation. Multi-tab/device resumes should refetch server receipt state rather than merge guesses. Use IndexedDB only if required storage/offline behavior outgrows this small queue.
- **UI:** show pending/saving/accepted/error states; do not silently advance on failed classwork persistence. On an uncertain network result retry the same identity. On validation error preserve rejected work and show the reason. On 429 honor retry guidance. Finish waits for required acknowledgements; reset finalizing state on recoverable failure. Timer expiry freezes input but does not silently discard pending work or accept out-of-policy late answers.
- **API recovery:** extend session detail with compact accepted identities/state, omitting expected answers for restricted modes. Update `useSession`'s current `staleTime: Infinity` behavior: keep frozen questions cacheable but refetch/invalidate mutable receipts/status on reconnect/resume. Keep browser expiry display derived from server metadata.
- **Done:** built-SPA tests cover lost response after commit, reload, wrong/correct retry, in-flight flush plus new input, failed skip, rejected batch and finalize failure. No silent zero-score success; UI labels such as “saved locally” reflect actual persistence.

### Proposed contract changes to vet together

All existing paths below are relative to `/api/v1`. JSON field names are proposed additions.

| Route | Small contract change | Compatibility note |
|---|---|---|
| `sessions/{id}/attempts/` | Explicit one-based `attempt_number`, `is_skip`; receipt includes identity and acknowledgement; keep ordinary verdict fields | Old missing-number requests are not replay-safe; coordinate client rollout |
| `sessions/{id}/attempts/bulk/` | Same item schema; multiple legal attempt numbers per question; atomic validation; receipts per identity | Update bulk callers and remove implicit partial rejection semantics together |
| `sessions/{id}/` | Add server timing, active/submitted state and compact accepted identities | No answer leakage; mutable metadata refetched, frozen questions reusable |
| `sessions/{id}/submit/` | Optional expected-identity manifest for guarded finish; return same stored result on retry | Competition client requires its guarded flow; legacy no-manifest behavior documented |
| Existing skip handling | Explicit boolean normalized in the shared service; temporarily accept legacy sentinel | Reject conflicting representations; genuine numeric zero must not be graded as skip |

Update `frontend/src/shared/types/index.ts`, query hooks, MSW handlers and `frontend/src/api/openapi.yaml`/server schema together. Give structured errors stable machine-readable codes while retaining human-readable `detail`; do not change every API's envelope unnecessarily.

## Wave 3 — implement only the approved timed-event needs

### Category: Event API and user flow

#### W3-API-01 — add minimal shared-round state if the event requires it

**Covers:** F04, F02, F18. **Owner:** backend + Product. **Depends:** W0 rules and Wave 2.

- **Vet:** if organizers only need independent timed drills with manual result collection, document that limitation and skip shared-round machinery. If users must share an organizer-controlled start/deadline/content set, existing personal sessions need a small explicit round model.
- **Recommended minimum:** add `CompetitionRound` inside `apps.exercises` with organizer, existing class/enrollment scope, scheduled start/end, a frozen `questions_json`/configuration snapshot and publication/cancellation state. Add a nullable round FK on `ArenaSession` and uniqueness of `(round, user)` for round sessions. One class is sufficient only if the agreed event scope fits it; add a class M2M when confirmed necessary, without a separate registration platform.
- **Reuse:** create/resume an `ArenaSession` for each eligible participant and reuse the fixed attempt/submit pipeline. Add a `COMPETITION` session kind only for this distinct policy; keep practice answer disclosure and personal test mode unchanged. Prevent competition finalization from unintentionally granting course completions/first-level bonuses; choose competition XP/stats handling explicitly, with zero XP/course advancement as the proposed initial default. Existing `ProgressRecord` can hold results; no parallel scoring datastore is needed.
- **Endpoints:** add only round detail and join/start routes, e.g. `GET rounds/{id}/` and `POST rounds/{id}/sessions/`; retain session write routes. Enforce enrollment/organizer permissions, no start before opening and no late join unless approved. Configure rounds through Django admin if the actual organizer has vetted staff access; add a small owner-scoped API only if teachers need self-service. Role ADMIN alone does not grant Django staff access.
- **Done:** 150 users get one session each, identical approved content/deadline where required, replay-safe joins, and no curriculum regression. Frozen round content is never sent before its approved release time. Additive migrations only; no payment/bracket/event-service framework.

#### W3-FE-01 — provide a small join, play and result flow

**Covers:** F04, F03, F14. **Owner:** frontend. **Depends:** W3-API-01 if shared rounds selected.

- **Fix:** reuse existing routes/components, problem canvas, query hooks and persistence behavior. Add a round link/waiting state, server-derived countdown, accepted/pending answer indicators and a final result view. No client flag may override event mode, eligibility or deadline.
- **Disclosure:** competition session metadata, single/bulk receipts and early-finalize reports must not reveal expected answers or correctness before the approved reveal time. Existing `SessionReportView` serializes expected answers; guard it for round sessions. Use an event receipt type without immediate verdict feedback rather than breaking ordinary practice/classwork feedback.
- **Results:** if a ranking is required, query existing round session/progress rows at close and use the approved tie-break; do not rank on untrusted `elapsed_ms`. Start with post-round standings. Add short-TTL Redis caching/polling only if live organizer views create measured load. No WebSocket service is required for a synchronized countdown.
- **Completion:** participants may finish early; disconnected participants still need deterministic closure. Reuse existing Celery for idempotent finalization of ended round sessions or an organizer close action, with safe retry/visibility. The database deadline governs answers regardless of task timing. Publish results only after the chosen reconciliation condition is met.
- **Done:** reconnect/early finish cannot reveal answers prematurely; missing participant finalize is recoverable; event UX and ordinary lessons/practice both pass browser tests. Round cancellation/result correction has an explicit organizer procedure.

### Category: Content and classroom authorization

#### W3-DATA-01 — connect approved content and harden XLSX import

**Covers:** F12. **Owner:** backend + content owner. **Depends:** source choice in W0-PROD-02.

- **Vet/location:** `ImportQuestionsView`, `CuratedQuestion`, `CuratedGenerator`, `Question` shape `{text, answer, operation}`, `ExerciseTemplate` and both problem canvases. Procedural generation may be the desired lesson source; do not replace it globally just because imported rows exist.
- **Fix:** choose an explicit template content source, e.g. a validated config option for curated versus procedural. For curated source, query the lesson's approved rows, validate renderable text/operator/integer answers, select deterministically if a subset is required, and snapshot into `ArenaSession.questions_json`. A round snapshots once and shares that snapshot. Fail clearly on insufficient content rather than silently switching sources. Import alone does not create a usable template; provide an explicit admin configuration step.
- **Import safety:** parse/validate the bounded workbook before deleting existing rows; enforce duplicate row/index/type/answer rules and explicit missing-answer handling. Avoid fractional truncation. Use a transaction for replacement, meaningful row errors and actual inserted counts instead of `ignore_conflicts=True` masking discrepancies. Add a modest validation/dry-run path using the same parser and define file/row limits from the real dataset; no separate ETL service. Use read-only workbook processing where compatible and close files reliably.
- **Done:** importing then starting a curated lesson/round yields the chosen questions; procedural templates remain procedural. Bad rows/duplicates produce no partial replacement; an in-progress session survives re-import because its snapshot is frozen. Content version/digest and question count are traceable without storing a new versioning subsystem.

#### W3-API-02 — implement the approved role and enrollment matrix

**Covers:** F15, F10. **Owner:** backend + frontend + privacy owner. **Depends:** W0-PROD-03.

- **Vet/location:** `users/permissions.py`, `classroom/views.py`, `frontend/src/router.tsx`, registration/consent flow. Reproduce ADMIN class-list 403 and test other-class access through direct API calls.
- **Fix:** align frontend role routing and API permissions with the matrix. Preserve explicit teacher ownership filtering; granting ADMIN a role permission without defining/filtering the data scope is insufficient. Restrict joining to approved roles, handle active/inactive enrollment explicitly, and catch enrollment uniqueness races with a deterministic response.
- **Consent:** separate registration from actual attestation if policy requires teacher approval; use existing enrollment plus a small explicit approval action/evidence record. Do not invent guardian accounts or mutate immutable consent history to retrofit attestations. Define how existing users join additional classes under the policy.
- **Done:** intended ADMIN/teacher behavior works; cross-class access stays denied; ineligible roles cannot self-enroll. Stored actor/time/request evidence reflects the real action and retained fields follow policy.

## Wave 4 — reduce query cost and obtain AWS facts

### Category: Backend performance

#### W4-PERF-01 — reduce bulk SQL without weakening integrity

**Covers:** F13, F01. **Owner:** backend. **Depends:** Wave 2 contract.

- **Vet:** reproduce the 30-answer query count on the corrected path with real JWTs and realistic session sizes; include successful, replay and rejected batches. Original 94 SQL is a local baseline, not an AWS capacity target.
- **Fix:** preload attempts once, calculate identities/counts/verdicts in memory and insert validated new rows using `bulk_create` through a new small batch writer in `progress/services.py`. Keep session locking and existing database uniqueness. Remember `bulk_create` bypasses model `save`; preserve append-only/validation rules in the writer and restrict it to inserts. Do not use `ignore_conflicts` as acknowledgement of a write that may not have occurred.
- **Done:** query growth is not two lookups per item; record before/after SQL, latency and correctness for 1/30/max-size/replayed batches. Aim for a small fixed lookup count plus bounded insert chunks, rather than an invented exact query target across different backends. All Wave 2 replay/atomicity/race tests remain green.
- **Impact:** no queue between API and durable accepted answers, no new database service.

#### W4-PERF-02 — batch roster aggregates and bound history work

**Covers:** F13. **Owner:** backend.

- **Vet/location:** `classroom/serializers.py`, roster/dashboard views, `users/stats.py`. Measure cold/warm rosters at 5/10/50/150 students; confirm active-enrollment reporting policy.
- **Fix:** roster only needs current level and average accuracy; do not compute full XP/streak stats per student. Fetch students/profiles once, grouped level-completion counts once and grouped progress accuracy once, then pass maps to the serializer. Prefer separate aggregates to avoid multiplying joins and corrupting averages. Class counts can use filtered `Count`; dashboard should use a filtered `Prefetch(..., to_attr=...)` or batched query instead of calling `.values_list()` per prefetched class.
- **History:** compute consecutive streak dates from distinct ordered activity dates and stop once the sequence breaks; preserve timezone/today-yesterday semantics. Retain the existing 60-second cache and after-commit invalidation unless measurements justify changes. Inspect query plans/indexes before adding them. A daily rollup table is not the first fix for the current scale.
- **Done:** current roster query growth no longer adds about five statements per student; metrics and values match the previous approved semantics. No inactive-enrollment discrepancy; post-finalize stats update correctly and realistic history does not require loading every activity row into Python.

### Category: AWS evidence and cost optimization

#### W4-OPS-01 — collect a private, complete baseline

**Covers:** F17, F16. **Owner:** platform/FinOps. **Can start alongside Wave 1.**

- **Vet:** obtain secure read-only access or exports; confirm account/project attribution, relevant regions and live resource IDs. No credentials were available to the prior audit. Do not equate no metrics with zero usage or Mumbai account costs with Bolt costs.
- **Fix the evidence path:** validate `collect_aws.py` and its policy before relying on it. Add metric-specific Sum/Minimum where required, units, all cache nodes/guest-memory values, public IPv4 and DB/cache security-group detail, pagination and explicit partial/missing-data status. Label global/account-wide output correctly. Broader inventory can be supplied manually rather than expanding a bespoke collector indefinitely.
- **Done:** private inventory/config report, actual deployed image/source, July–September bill and recent detailed utilization. Include credits/amortization/tax/units, project/shared-resource allocation and non-AWS frontend charges. Separate unavailable/denied/absent configuration. Cost-allocation tags enabled now do not retrospectively prove past project costs.
- **Boundary:** read-only collection only. IAM changes, metric-agent installation or retention/resource modifications are separate reviewed operational work; no secret values or production student data need collection.

#### W4-OPS-02 — price and tune the smallest acceptable deployment

**Covers:** F17, F13. **Owner:** platform + technical lead/FinOps. **Depends:** corrected app path, W4-OPS-01 and Wave 5 load results.

- **Fix/process:** complete `cost-inputs.csv` with verified rates/quantities and compare current baseline, tuned single-host and required-availability options. Include app/database/cache/storage/backups, IPv4, monitoring/transfer and any added load balancer. Keep gross/amortized/credits separate.
- **Tune first:** make Gunicorn workers/threads configurable and measure RSS, CPU, latency and DB connections alongside Celery/beat memory. Avoid five workers merely because the formula returns five. Evaluate a bounded `CONN_MAX_AGE` with connection health checks only if connection overhead warrants it and DB connection limits support web/worker/admin traffic. No PgBouncer/RDS Proxy is assumed necessary for 150 users.
- **Savings:** propose measured right-sizing; scoped ECR/log/S3 lifecycle; removal of confirmed unused resources; credit/IPv4/NAT review. Preserve backup/rollback/event audit requirements. Compare burstable/non-burstable or storage alternatives only where metrics and verified regional prices support them.
- **Done:** priced options include measured load/failure tolerance and explicit tradeoffs. No promised savings or instance class without evidence; no commitments or production resizing from this handoff.

## Wave 5 — validate readiness and hand over operations

### Category: QA and integration

#### W5-QA-01 — run production-like behavior and browser fault tests

**Covers:** F01–F16, F18. **Owner:** QA + developers. **Depends:** relevant implementation tasks.

- **Fix/process:** run existing Ruff/pytest and npm lint/type-check/Vitest/build. Add a targeted integration invocation restoring actual JWT authentication, PBKDF2, throttle classes and relevant production security options at settings/module load. Default test settings disable throttles; changing rate strings alone is not coverage. Match CI's PostgreSQL/Redis/Node versions for release evidence.
- **Browser:** update obsolete email-form/heading smoke expectations to the chosen student/teacher flows. Configure Playwright to use a built SPA/preview and real local API with controlled fixtures; current `webServer` uses Vite dev/MSW. Retain UI-only mock tests, clearly labeled. Exercise reload, deadline, retries, lost response, pending flush, deletion, refresh, class ownership and import-to-session paths.
- **Concurrency:** use separate DB connections/transactional tests for duplicate starts, same-session writes/finalize and different-session course completion. Unit tests wrapped in one outer transaction cannot establish real lock behavior.
- **Done:** passing evidence plus traces/logs for fault scenarios, no unexpected data loss/duplication, and declared unresolved cases. Run appropriate checks per PR, then this combined gate once; unnecessary repeated whole-suite runs are not a readiness strategy.

#### W5-QA-02 — load-test the agreed event profile on an isolated target

**Covers:** F11, F13, F17, F18. **Owner:** QA/platform. **Depends:** Wave 2/3 and usable metrics.

- **Process:** use one small HTTP load script/tool with fixture credentials and real JWTs. A dev-only Locust script is a reasonable Python fit if no harness already exists; it is not an application dependency or service. Browser tests cover UX; HTTP load tests cover concurrency. Use only local or separately authorized private staging.
- **Workload:** 150 participants with synchronized login/start/finish, realistic think time, shared-IP case, token refresh, retries and organizer traffic if required. Adopt 300 as headroom only if agreed; run 500/1,000 later for growth. Include event duration and soak, rather than a short burst only. Model immediate-answer and buffered-practice paths separately to avoid counting both full workloads for the same flow.
- **Measure:** achieved throughput, all response/error codes, latency distributions, app CPU/RSS/swap/credits, DB connections/locks/memory/I/O, Redis evictions/queues and final answer/result reconciliation. Include dropped/timed-out requests in results; successful-only percentiles are insufficient.
- **Done:** agreed service targets and zero lost/duplicated accepted submissions hold. If failed, identify the bottleneck, apply the smallest change and rerun that case. Results justify W4-OPS-02 sizing; user count alone does not.

### Category: Recovery and launch handoff

#### W5-OPS-01 — rehearse restore, failures and rollback

**Covers:** F08, F16, F17. **Owner:** platform + backend/QA.

- **Vet:** current backup retention/protection, actual monitoring and image rollback path. Availability and recovery targets must come from W0, not assume Single-AZ is acceptable or unacceptable for everyone.
- **Rehearse:** private restore/PITR into an isolated DB, rollback to a known compatible image, failed migration, web-worker/host loss, Redis/cache/broker outage and token refresh disruption. Accepted answers remain in PostgreSQL. Cache failures must not turn a successfully committed score into silent loss; test error/retry behavior including after-commit cache invalidation. Keep throttle-outage policy explicit.
- **Done:** measured recovery and restore correctness, participant results reconciliation and a documented migration/rollback plan. Expand/contract schema changes and retain compatibility with the chosen rollback artifact; additive changes are not automatically safe if old code misreads new semantics. Do not test by stopping production services or restoring over the live DB.

#### W5-OPS-02 — prepare the developer and organizer launch packet

**Covers:** F04, F14, F17. **Owner:** technical lead + organizer.

- **Deliver:** reviewed source/image/SPA versions, rule sheet, test/load/restore artifacts, priced choice, remaining risks and named incident/decision owners. Include login rehearsal, timing/time-sync check, monitoring/dashboard links, event deployment freeze, support/reconnect instructions and a rollback/contact procedure.
- **Done:** Product, engineering, QA and operations assess the agreed criteria. Any accepted limitation is explicit, including single-host interruption risk. A ready packet is the end of this work stream; production deployment is a separate authorized action. AWS usage/cost unknowns cannot be signed off by this document.

## Wave 6 — growth changes only when a trigger is met

### Category: Capacity and availability

#### W6-SCALE-01 — increase capacity or failure tolerance from evidence

**Covers:** F17. **Owner:** platform/technical lead. **Conditional, not a launch prerequisite by default.**

| Observed trigger / agreed requirement | Small next action | Evidence before expanding further |
|---|---|---|
| App memory/CPU/credit pressure after query/worker tuning | Benchmark the next suitable existing instance class and worker limits | Better full-duration latency/headroom at an acceptable verified cost |
| App-node/deploy interruption is unacceptable, or tuned node cannot meet load | Two stateless app replicas behind an appropriate managed load balancer; keep one beat scheduler | Node-loss rehearsal, shared secret/config/session behavior, connection budget and priced LB overhead |
| Database failover required | Evaluate RDS Multi-AZ independently of throughput sizing | Failover/restore timing and agreed extra cost |
| Redis outage violates agreed service goals | Evaluate the existing managed cache's replication/failover configuration | Cache/throttle/broker failover behavior and memory/eviction metrics |
| Async task volume competes with web latency | Separate or right-size the existing Celery worker | Task queue and web latency evidence; no competing beat instances |

Do not add Kubernetes, a new queue, persistent WebSockets, partitioning or a database proxy just to label the app “ready for thousands.” Registered accounts and simultaneous load are different. Connection pooling and larger/horizontal capacity require a demonstrated bottleneck or recovery requirement.

### Category: Database consistency

#### W6-DATA-01 — validate a replica only if read traffic justifies one

**Covers:** F19. **Owner:** backend/platform. **Depends:** primary consistency from W2-API-03.

- **Vet:** whether `REPLICA_DATABASE_URL` is actually configured and whether measured reads dominate after roster/history improvements. If absent/unneeded, keep single-primary operation.
- **Fix if proceeding:** inventory router-routed reads; keep scoring, receipts, finalization, eligibility immediately after completion and immediate result retrieval on primary. Route only explicitly stale-tolerant history/catalog/report reads to replica; test lag and failover. Existing `config/dbrouter.py` supports a primary hint, but explicit `.using('default')` is appropriate for critical ORM reads that cannot carry it reliably.
- **Done:** a lagging replica cannot change accepted results, award first-completion twice or re-lock a just-completed lesson. Read benefit exceeds verified cost/operational complexity. No replica is provisioned as part of the current plan.

## Findings-to-task coverage

| Assessment finding | Main handoff tasks |
|---|---|
| F01 Replay/caps/scoring | W2-API-01, W2-API-02, W2-API-03, W4-PERF-01 |
| F02 Deadline | W0-PROD-02, W2-API-04, W3-API-01 |
| F03 Persistence ambiguity | W2-API-01, W2-API-02, W2-API-03, W2-FE-01 |
| F04 Tournament/disclosure gap | W0-PROD-02, W3-API-01, W3-FE-01 |
| F05 Access bypass | W2-API-04 |
| F06 Real-hasher login | W1-API-01, W2-API-05 |
| F07 Image inclusion risk | W1-PLAT-01 |
| F08 Bootstrap/health | W1-PLAT-02, W5-OPS-01 |
| F09 Lockfiles/CI | W1-PLAT-03 |
| F10 Deletion/privacy | W0-PROD-03, W1-API-02, W3-API-02 |
| F11 Throttles | W2-API-05, W5-QA-02 |
| F12 Curated import | W0-PROD-02, W3-DATA-01 |
| F13 Query amplification | W4-PERF-01, W4-PERF-02, W5-QA-02 |
| F14 Frontend/API/refresh | W0-PROD-01, W1-FE-01, W2-FE-01, W5-QA-01 |
| F15 Roles/consent | W0-PROD-03, W3-API-02 |
| F16 Deployment identity/security | W0-PROD-01, W1-PLAT-03, W4-OPS-01, W5-OPS-01 |
| F17 Costs/capacity/recovery | W4-OPS-01, W4-OPS-02, W5-QA-02, W5-OPS-01, W5-OPS-02, W6-SCALE-01 |
| F18 Races/resume | W2-API-03, W2-API-04, W3-API-01, W5-QA-01 |
| F19 Replica consistency | W2-API-03, W6-DATA-01 |

## Source map for the developer

| Area | Reviewed source |
|---|---|
| Sessions, routes and input/output | [models](../backend/apps/exercises/models.py), [views](../backend/apps/exercises/views.py), [serializers](../backend/apps/exercises/serializers.py), [URLs](../backend/apps/exercises/urls.py) |
| Durable grading, XP and course completion | [progress models](../backend/apps/progress/models.py), [services](../backend/apps/progress/services.py), [XP rules](../backend/apps/progress/xp_rules.py) |
| Auth, privacy and stats | [backend](../backend/apps/users/backends.py), [views](../backend/apps/users/views.py), [models](../backend/apps/users/models.py), [permissions](../backend/apps/users/permissions.py), [stats](../backend/apps/users/stats.py) |
| Classes, consent and roster | [models](../backend/apps/classroom/models.py), [views](../backend/apps/classroom/views.py), [serializers](../backend/apps/classroom/serializers.py) |
| Timed UI and failed writes | [classwork](../frontend/src/features/learn/ClassworkPage.tsx), [practice](../frontend/src/features/practice/InArenaPage.tsx), [session hooks](../frontend/src/shared/api/queries/useSession.ts), [types](../frontend/src/shared/types/index.ts), [session store](../frontend/src/shared/store/sessionStore.ts), [SyncDot](../frontend/src/shared/ui/SyncDot.tsx) |
| API origin/auth frontend | [Axios client](../frontend/src/shared/api/client.ts), [auth store](../frontend/src/shared/store/authStore.ts), [router](../frontend/src/router.tsx) |
| Content generation | [question shape](../backend/apps/exercises/generators/base.py), [curated generator](../backend/apps/exercises/generators/curated.py) |
| Runtime/settings | [base](../backend/config/settings/base.py), [production](../backend/config/settings/production.py), [test](../backend/config/settings/test.py), [router](../backend/config/dbrouter.py), [cleanup](../backend/apps/exercises/tasks.py), [Gunicorn](../backend/gunicorn.conf.py) |
| Build and deployment | [Dockerfile](../backend/docker/Dockerfile.prod), [Compose](../docker-compose.prod.yml), [Caddy](../Caddyfile), [bootstrap](../aws-deploy.sh), [resume](../aws-resume-deploy.sh), [deployment helper](../backend/deploy.sh), [CI](../.github/workflows/ci.yml), [ignore rules](../.gitignore) |
| Existing QA entry points | [pytest configuration](../backend/pyproject.toml), [frontend scripts](../frontend/package.json), [Playwright config](../frontend/playwright.config.ts), [smoke tests](../frontend/e2e/smoke.spec.ts) |

## First implementation slice

Start with W0-QA-01 and the independent login/deletion/build/health repairs in Wave 1. In parallel, resolve source ownership and the event/role rule sheets. Then implement Wave 2's backend contract and frontend acknowledgement/recovery together. This yields a useful reliability improvement for the existing learning app before conditional event or scaling work.

Hand the developer both this file and the dated assessment; include the local probes/logs if they need reproducible evidence. Keep AWS exports and any image-exposure investigation private. Completion evidence, not document status, determines readiness.
