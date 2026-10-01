---
status: READY FOR HUMAN REVIEW
branch: chore/ai-context-system-v2
base_commit: c8675e646cb2fffa13fd7ba8d867f6baf9cc5a35
current_commit: 53a061b59b6f0c01f9939e730ddb961a06fea82a
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

- G complete: all 12 cold-start questions resolved through the compact startup
  and selective routes; actual practice answer/finalization path traced below.
  Resumed published `cdaffa4`; A–F were preserved rather than restarted.

- H complete: reviewed feature-only diff and preserved recovery body/runtime;
  checked canonical routes/links, source ownership, concise startup and approval
  boundaries. Published cold-start milestone at `53a061b` through connected
  GitHub after shell push lacked credentials; fetched and verified identical tree.

## In Progress

None. Approved repository setup A–H is complete; awaiting human review.

## Remaining

No setup implementation remains. Human review/integration and hosted PR CI are
next; live verification belongs to a separately authorized operational task.

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

PASS, 2026-10-01 at `cdaffa4`. Method: a same-session, constrained document
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

## Known Risks / Unknowns

- LIVE: AWS/Vercel revision, infrastructure, logs and health remain UNKNOWN;
  no appropriate provider/log connector is available in this session.
- CI: workflow currently runs on PRs/main only; feature publication is not CI evidence.
- Compatibility migration complete; historical documents retain dated evidence.
- Metadata checkpoint SHAs are prior exact observations, not self-referential heads.

## Human Decisions Required

None for this approved setup. Human review/integration/release remain later gates.

## Next Exact Action

Human reviewers inspect the context-only range
`c8675e646cb2fffa13fd7ba8d867f6baf9cc5a35..chore/ai-context-system-v2`, then
review the full main comparison including unmerged prerequisites. Follow the
baseline → workflow foundation → recovery → continuous context → context V2
lineage for integration; verify normal PR CI before deciding merge. Keep the
context job advisory. No agent merge/deploy is authorized. Optionally adopt the
compact Project instructions from AI_CONTEXT_SYSTEM_SETUP and add only the final
bootstrap as a Project Source; this task did not change the Project settings.

## Checkpoint convention

`current_commit` is the last exact commit verified before this document's commit.
A commit cannot contain its own SHA. The commit containing this file is the
durable checkpoint; inspect `git log -1 -- docs/features/ai-context-system-v2.md`
or GitHub file history for its exact SHA. Recheck the remote branch before writing.
