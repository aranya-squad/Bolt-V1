---
status: READY FOR HUMAN REVIEW
branch: chore/ai-context-system-v2
base_commit: c8675e646cb2fffa13fd7ba8d867f6baf9cc5a35
current_commit: b5c39ead35457948d4513e97cc3ee7b03f8943ff
last_checkpoint: 2026-10-01
owner: ai
---

# AI Context System V2

## Goal

Finish the existing context spine so sessions resume from Git, inspect real source,
work autonomously within scope and leave durable verification/continuation state.
Scope: handoff steps A–H; documentation, standard-library tooling/tests and
warning-only CI. No application changes, merge, deployment or live mutation.

## Completed

- Existing seven context/handoff commits through `638dd5c` preserved.
- Full repository handoff and required startup docs read; local clone acquired.
- Remote refs verified: main `cec94ea`, continuous context `c8675e6`,
  answer recovery `88cfff2`, context V2 `638dd5c`; no unexpected movement.
- Created/published tracker at `95aeb06`.
- A complete: runtime trees match reviewed code; checked routing/auth/recovery,
  primary writes/scoring, CI/Compose/Caddy/Gunicorn/health/logging and AWS scripts.
  Corrected Vercel build-vs-rewrite scope and Redis throttle-vs-JWT-blacklist
  ownership. Brief metadata now names an existing checkpoint; retained unique
  100–150-user historical target as planning evidence, not a capacity guarantee.

- B–D complete: three accepted ADRs index existing approvals; old startup paths
  migrated; CURRENT_STATE is pointer-only; historical architecture/setup handoff
  labeled; recovery metadata prepended while its detailed body remains unchanged.

- E–F complete: offline standard-library checker, focused regression tests,
  independent advisory CI job and explicit promotion criteria in RUNBOOK.

- G document exercise complete: all 12 cold-start questions resolved through the compact startup
  and selective routes; actual practice answer/finalization path traced below.
  Resumed published `cdaffa4`; A–F were preserved rather than restarted.

- H complete: reviewed feature-only diff and preserved recovery body/runtime;
  checked canonical routes/links, source ownership, concise startup and approval
  boundaries. Published cold-start milestone at `53a061b` through connected
  GitHub after shell push lacked credentials; fetched and verified identical tree.

## In Progress

None. Setup implementation/validation work is closed under the owner's explicit
acceptance of G on 2026-10-01. Human integration/hosted CI/live-evidence gates remain.

## Remaining

No setup implementation remains. G is DONE by HUMAN acceptance of the existing
answers/source trace and documented method limitation; no fresh-session PASS is
claimed. Hosted PR CI and human dependency-order integration follow; release/live
verification require separately authorized operational evidence.

## Verification

- CODE: `git diff 6d32de6 HEAD -- backend frontend` is empty; reviewed runtime
  code is preserved on this branch.
- CODE: inspected Compose, Caddy, Gunicorn, CI, frontend scripts, session API
  hooks/routes and progress service ownership.
- TEST: 18 checker regressions pass; strict and GitHub warning-only modes report
  zero errors/warnings on the full clone. Python compilation and diff checks pass.
- CI: configuration inspected only; no hosted run claimed. Backend/frontend/build
  jobs and triggers unchanged; context job/steps advisory, build has no dependency.
- Application test counts remain prior recorded evidence, not re-executed here.
- H: 91 concrete documentation links/paths checked, zero missing; router glob/
  heading checks pass. Added-line credential-pattern scan: zero findings; no
  secret/environment/dependency/build artifacts or duplicate ACTIVE_TASKS file.
  This scoped scan is not a repository-wide secret audit.
- H: `git diff --check c8675e6 HEAD` passes; only context docs, checker/tests and
  advisory CI differ from the setup base. No API/schema/migration/runtime changes.
  Historical architecture body and detailed recovery body remain preserved.
- H: PROJECT_BRIEF is about 1,040 words; combined bootstrap/brief/router about
  2,090 words. Deep docs remain selective. Shared human gates are consistent.
- LIVE: none inspected or mutated; no application services/deploy scripts run.
  Main/foundation/recovery refs rechecked and preserved.

## Cold-start validation (G)

DOCUMENT EXERCISE PASS; fresh-session validation PENDING. Recorded 2026-10-01
at `cdaffa4`. Method: a same-session, constrained document
exercise starting from only bootstrap/brief/router, then following selected
routes. This is not an independent fresh-agent review or a new browser/API test.
No full historical assessment or full dev log was needed to answer the questions.

| Question | Recovered answer / selective evidence |
|---|---|
| 1. What is Bolt? | Abacus learning platform for students/teachers; PROJECT_BRIEF Product. |
| 2. What is implemented? | Auth, levels/lessons, classwork/practice, progress/XP, classes/rosters/import and recovery on this lineage. Recorded recovery tests are local TEST; not production proof. |
| 3. What is in progress? | Context V2 G–H; owning tracker gives exact remaining work. Recovery is READY FOR HUMAN REVIEW on its owning branch. |
| 4. What is next? | Finish H, then human dependency-order review/integration, PR CI and live-source verification; tournament rules/load work stays separate. |
| 5. What is blocked/unknown? | Live frontend revision, AWS topology and log availability UNKNOWN; tournament rules require HUMAN decision. None blocks this repository setup. |
| 6. What is the architecture? | React/Router/Query/Axios/Zustand → DRF `/api/v1` → PostgreSQL; Redis cache/Celery. SYSTEM_MAP locates ownership; RUNBOOK distinguishes source deployment from LIVE. |
| 7. Where is an API bug investigated? | Router api route → Django URL/view/serializer/contract, client schema/types/hooks/mocks/tests; reproduce actual request before changes. |
| 8. Where is an outage investigated? | Router aws_deploy → RUNBOOK debugging route: deployed revision/origin, health, Caddy/web logs, worker/beat and DB/Redis when relevant/authorized. CloudWatch/Sentry availability must be verified. |
| 9. What needs human approval? | Merge/release/live mutation, secrets/security decisions, destructive data/backfill, unresolved product/conflicting decisions and material scope expansion; bootstrap/ADR 0003. |
| 10. How is a lost task resumed? | Inspect current refs, feature handoff/checkpoint and relevant history; continue committed work. Inaccessible uncommitted state is not assumed to survive; CLOUD_DEV_HANDOFF. |
| 11. Who owns active state? | `docs/features/<feature>.md` on its branch; brief summarizes global state and log records history. CURRENT_STATE is pointer-only. |
| 12. What wins conflicts? | Inspected authorized LIVE/current CODE beats summaries/history; explicit new HUMAN decisions supersede older policy and must be recorded. |

### Real practice path traced (CODE)

1. `frontend/src/features/practice/InArenaPage.tsx` loads `useSession`, calls
   `useAnswerRecovery`, and enqueues an immutable attempt from `handleSubmit`.
2. `frontend/src/shared/store/sessionStore.ts` persists the queue using
   `answerRecovery.ts`/sessionStorage. `flush` refreshes mutable session metadata,
   reconciles server receipts and sends batches of at most 100 through `submitBulk`.
3. `frontend/src/shared/api/queries/useSession.ts` POSTs v2 to
   `/api/v1/sessions/<id>/attempts/bulk/`; `validateBulk` verifies each receipt
   against identity and payload before `acknowledge` removes pending work.
4. `backend/config/urls.py` and `backend/apps/exercises/urls.py` route to
   `BulkSubmitAttemptView`: authenticated own-session lookup, primary DB row lock
   and atomic transaction. `attempt_contract.accept_batch` validates the batch,
   handles exact replay/conflicts and calls `progress.services.record_attempt`
   for new append-only `QuestionAttempt` rows. Server grading is authoritative.
5. Store `finish` freezes the pending identity manifest, drains the queue, then
   POSTs `/api/v1/sessions/<id>/submit/`. `FinalizeSessionView` locks the session,
   validates required persisted identities and returns an existing result or
   calls `progress.services.finalize_session`.
6. That service derives score from persisted attempts, creates ProgressRecord/
   XPEvent/completion state on primary, marks submitted with scoring version 2
   and invalidates caches after commit. Client result validation precedes storage
   cleanup and `onFinished` navigation to victory.

Limits: same-tab recovery; no cross-device/tournament guarantee. No application
tests or live health/provider/log inspection were performed by this exercise.

## Completeness review — 2026-10-01

Reviewed published `dd09954` against the repository handoff A–H, actual diffs,
checker/tests, ADRs, startup migration and previous feature plan. Same-agent
review; no independent reviewer sign-off is claimed.

| Step | Review result |
|---|---|
| A | Complete: source/config audit, factual fixes, canonical state ownership; no runtime changes. |
| B | Complete: decision index and three ADRs with rationale, alternatives, consequences and approval evidence. |
| C | Complete: compact AGENTS/cloud startup; CURRENT_STATE pointer; preserved history/design. |
| D | Complete: recovery metadata/next action added without rewriting detailed delivery record. |
| E | Complete: offline standard-library checker, metadata/commit/path checks and 18 passing regressions. |
| F | Complete configuration: independent warning-only job; app jobs/triggers unchanged. Hosted verification remains pending. |
| G | Partial: all 12 questions and real source trace documented, but performed after this session had already read deeper context. Require an isolated fresh-session run before final completion. |
| H | Complete local review: diff/path/safety/source-of-truth checks; durable checkpoints; no merge/deploy. Recheck after G is published. |

Fresh review checks: 18 tests pass, strict checker 0 errors/0 warnings, diff check
passes, runtime trees equal reviewed `6d32de6`; connected GitHub returns no
PR-triggered workflow runs for `dd09954` (first-page query, not all CI history).
No new code/tool defect requiring repair was found. Checker limitations remain
deliberate: structural/source-drift hints cannot certify semantic/live accuracy;
source-drift comparison covers backend/frontend, not every infrastructure file.

### Previous plan and next feature

Approved recovery plan explicitly says reassess `feat/teacher-dashboard` after
recovery handoff, and defer `feat/tournament-rounds` until rules are approved.
No teacher-dashboard/tournament-rounds remote branch was found in this check.
The older `feature/v2-wave0-1-auth-rework@c2421de` (June 29) is already an ancestor
of this lineage; it is not a new parallel task to recreate.

Recommended teacher slice (PROPOSAL, not implementation authorization): measure
and batch roster/class/dashboard queries (W4-PERF-02), check active-enrollment
consistency and preserve teacher ownership; verify built SPA + real local API
against persisted completion/accuracy. Existing screens are the starting point.
Role/consent changes need the W0-PROD-03 product matrix. Unknown-call-sign auth,
image exclusions and internal health/bootstrap repairs remain separate prerelease
backlog; the current login source still contains the malformed dummy hash.

## Verification attempt — 2026-10-01, starting at ce544953

- Remote refs rechecked through connected GitHub: setup `ce544953`, main
  `cec94ea`, recovery `88cfff2`, workflow `b03d167`, continuous context `c8675e6`;
  no newer remote work found. Clean local checkout copied into an isolated task
  directory; original checkouts were preserved.
- **G FAIL for fresh-session certification.** During initial ref inspection,
  `fetch_commit` returned the previous cold-start answers in its diff before the
  startup-only answers were recorded. This is a procedure failure, not evidence
  of a missing product/source route. Prior chat/project memory was not evidence.
- Startup-constrained answers and subsequent actual-source practice trace were
  recorded before intentionally opening tracker/handoff in
  `docs/context-verification-2026-10-01.md`. All 12 topics were recoverable;
  exact architecture/request/persistence/outage investigation required selective
  SYSTEM_MAP/RUNBOOK/source retrieval as designed. No semantic gap was identified.
- Repaired the verification procedure in BOLT_BOOTSTRAP: use ref-only endpoints,
  defer commit patches/trackers/previous answers, and reject contaminated runs.
  This repair needs a genuinely clean session to establish its fresh-context
  outcome. No remaining setup implementation identified; G evidence remains.
- TEST: Python 3.12, 18 checker regressions pass; strict and advisory modes report
  0 errors/0 warnings. H candidate checks and limitations are recorded in the
  verification report. No runtime/schema/migration changes; no live actions.
- CI: connected GitHub returned no PR-triggered runs for `ce544953`; query is
  first-page/PR-filtered, not a complete CI audit. Publication is not CI proof.
- Setup stays IN PROGRESS; do not restore review readiness from this attempt.
  Teacher-dashboard assessment may proceed as independent planning, without
  implementing that feature or implying setup is closed.

## Dashboard assessment milestone — 2026-10-01

- Published verification-method repair at `c93ececacff1ec17991f68d2e5dc5c20f229f07c`;
  local candidate tree and reconstructed Git object match GitHub exactly.
- Completed independent planning in `docs/teacher-dashboard-assessment-2026-10-01.md`.
  Existing screens, active enrollment discrepancy, per-student/per-class aggregates,
  optional replica consistency and teacher query identity isolation were inspected.
- Scope proposes read-side batching/consistent membership and existing UI fixes,
  with exact files, metric semantics, dependencies, SQL budgets and meaningful
  tests. Historical roster measurements are labelled historical; no new Django/
  Postgres/Redis benchmark was available in this environment.
- Teacher implementation remains unapproved/unstarted; auth/image/health/deletion
  repairs are separate and tournament rules remain deferred. Setup is not closed.
- H after corrections: 31 concrete report/startup path references exist (explicit
  future proposed files excluded); router paths/globs/headings pass checker.
  Startup word counts: bootstrap 606, brief about 1,160, router 520. Historical
  architecture/recovery body preservation and runtime equality verified again.
  Added-file/line credential-pattern scan and scoped diff check pass; not a full
  repository secret audit. Only documentation changed during this session.

## Closure decision — 2026-10-01

HUMAN: owner explicitly instructed "Mark G as done" and proceed with 2–3 new
features. G is DONE by this acceptance; the previously recorded contaminated
verification attempt is preserved unchanged as historical evidence. This does
not convert that attempt into an independently observed fresh-session PASS.
A–F/H local evidence and complete source recovery remain the basis for readiness.
Setup is READY FOR HUMAN REVIEW, with no remaining setup implementation.

The same instruction establishes environment-scoped PM, CTO and Head QA signoff
before any new feature coding; recorded in ADR 0004/AGENTS/agent-workflow/template.
Final closure checks re-run: checker tests, strict/advisory modes, diff/path/runtime
preservation. Hosted CI and live systems remain unverified; no merge/deploy.

## Known Risks / Unknowns

- LIVE: AWS/Vercel revision, infrastructure, logs and health remain UNKNOWN;
  no appropriate provider/log connector is available in this session.
- CI: workflow currently runs on PRs/main only; feature publication is not CI evidence.
- Compatibility migration complete; historical documents retain dated evidence.
- Metadata checkpoint SHAs are prior exact observations, not self-referential heads.

## Human Decisions Required

None for this approved setup. Human review/integration/release remain later gates.

## Next Exact Action

Human reviewers inspect context-only `c8675e6..chore/ai-context-system-v2` and the
full-main comparison including unmerged prerequisites. Integrate frozen baseline
→ workflow foundation → answer recovery → continuous context → context V2 under
human control; verify normal PR CI and keep the context job advisory. No agent
merge/deploy is authorized. G is done by owner acceptance; a clean cold-start
exercise remains optional additional evidence, not remaining setup implementation.

New feature work proceeds through the mandatory PM/CTO/Head QA scope signoff gate
in AGENTS for this owner's Bolt Work Project/account environment. Features remain
on separate authorized task branches and preserve integration/release boundaries.

## Checkpoint convention

`current_commit` is the last exact commit verified before this document's commit.
A commit cannot contain its own SHA. The commit containing this file is the
durable checkpoint; inspect `git log -1 -- docs/features/ai-context-system-v2.md`
or GitHub file history for its exact SHA. Recheck the remote branch before writing.


## Prospective AI-SDLC V1 follow-on — 2026-10-01

This follow-on is isolated on `chore/bolt-ai-sdlc-v1`, stacked from the closed context branch, so `chore/ai-context-system-v2` remains unchanged. HUMAN requested a prospective agentic SDLC for future feature ideas without breaking current work.

Added documentation/tooling only: `docs/AI_SDLC.md`, ADR 0005, `skills/feature-scoper/SKILL.md`, plan/specialist templates, and a stdlib gate checker with focused tests. Existing teacher workstreams already in progress are grandfathered onto ADR 0004 unless explicitly opted in. No application/runtime/schema/deployment code or CI trigger was changed. Repository skill source and a Project Instructions addition are durable, but workspace skill installation/Project Settings require user/UI action.
