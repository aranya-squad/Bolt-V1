# Context V2 verification attempt — 2026-10-01

Startup-source recovery at ce544953, recorded before selective deeper reads.
Method limitation: fetch_commit returned prior G answers/tracker diff during ref inspection. This run is contaminated and cannot certify an independent fresh-session G PASS. Answers below are constrained to startup sources; prior chat memory is not evidence.
1. Bolt: abacus student/teacher learning platform. PROJECT_BRIEF Product.
2. Implemented: auth, levels/lessons/classwork/Arena/progress/XP/classes/rosters/import/recovery. Brief Product and DONE; recorded tests are historical evidence, not rerun here.
3. In progress: AI context V2 G verification, A–F/H locally complete per Brief IN PROGRESS. Owning tracker requires selective retrieval.
4. Next: G, human integration in dependency order, hosted CI, live-source/topology verification, teacher dashboard reassessment. Brief NEXT.
5. Blocked/live-unknown: production frontend revision, AWS topology, logs/observability, tournament rules. Brief BLOCKED.
6. Architecture: React18/TS/Vite, Router/Query/Axios/Zustand; Django/DRF/JWT; PostgreSQL optional replica; Redis/Celery; Gunicorn/Caddy/Compose; Vercel rewrites. Brief Stack/Environments. Exact request/control/data flows require SYSTEM_MAP and source.
7. API bug: router api route to config/app URLs/views/serializers, OpenAPI, shared client/types/mocks/tests. CONTEXT_INDEX api; exact endpoint needs selective retrieval.
8. Outage: RUNBOOK plus compose/Caddy/AWS scripts/settings and authorized deployed revision/container/RDS/Redis/DNS/TLS/health/log evidence. CONTEXT_INDEX aws_deploy; no live evidence available. AGENTS restricts read-only cloud access to authorized scope.
9. Human approvals: ambiguous product/conflicting decisions/material expansion/destructive migration/live infrastructure/security/secrets/protected integration/release/irreversible actions. Bootstrap Working rules, AGENTS Shared boundaries, router approvals. main and feat-Sagar frozen; no merge/deploy allowed here.
10. Lost task: GitHub refs/commits, feature handoff, brief/latest relevant dev-log milestone; resume durable checkpoint, never assume uncommitted state survived. Bootstrap Lost cloud task.
11. Active state owner: docs/features/<feature>.md on owning branch. Bootstrap Working rules and AGENTS continuation.
12. Evidence order: authorized inspected live > current code/config > Git/PR > active handoff > brief > map/runbook > accepted ADRs > dev log > memory > history; new explicit human decisions override older decisions. Bootstrap Evidence order.
Selective routes now: SYSTEM_MAP and RUNBOOK for architecture/API/outage; source for practice answer persistence trace. Setup tracker/handoff intentionally deferred until after trace recording.

## Selective source verification (recorded before handoff/tracker reads)

Architecture/API/outage answers confirmed through SYSTEM_MAP and RUNBOOK. Exact API boundaries are Django app URLs/views/contracts/serializers; frontend client uses /api/v1. PostgreSQL is authoritative; replica routing must not enter authoritative recovery operations. Production configuration is evidence of intended deployment only. Outage route: request/origin/revision, health, provider revision, Caddy/web logs, worker/beat if relevant, DB/Redis metrics, local reproduction. Live resource/log destinations remain UNKNOWN. No cloud operation was performed.

### Real feature trace: practice answer acceptance and completion

- `frontend/src/features/practice/InArenaPage.tsx`: `handleSubmit` validates integer input, calls recovery `enqueue`; `onFinished` invalidates ME and navigates to practice victory. Immediate practice feedback is provisional, not authoritative.
- `frontend/src/shared/api/queries/useAnswerRecovery.ts`: `useAnswerRecovery` initializes identity-scoped recovery and schedules flush/retry; `complete` calls finish and only invokes onFinished with a validated result.
- `frontend/src/shared/store/sessionStore.ts`: `enqueue` issues immutable question_index/attempt_number and persists pending work; `flush` refreshes server metadata, reconciles, submits batches up to 100, and acknowledges matching receipts. `finish` persists a required-attempt manifest, drains pending answers, finalizes, then clears storage after validated result.
- `frontend/src/shared/store/answerRecovery.ts`: `saveRecovery` stores bounded same-user/session/context state in sessionStorage; `validateBulk`/`matchesReceipt` validate version, identity and exact payload; `acknowledge` drops only matching accepted pending entries.
- `frontend/src/shared/api/queries/useSession.ts`: `submitBulk` POSTs v2 attempts to `/sessions/<id>/attempts/bulk/`; `finalize` POSTs expected_attempts to `/sessions/<id>/submit/` and validates result identity/numeric fields. `shared/api/client.ts` supplies origin/auth transport.
- `backend/apps/exercises/urls.py`: maps to `BulkSubmitAttemptView.post` and `FinalizeSessionView.post` in views.py. Authenticated ownership lookup and atomic primary row lock precede writes.
- `backend/apps/exercises/attempt_contract.py`: `accept_batch` validates the entire batch before append, enforces caps/terminal/skip/minimum elapsed constraints, allows exact replay, rejects identity conflicts, grades against `ArenaSession.questions_json`. `validate_manifest` verifies required accepted identities exist.
- `backend/apps/progress/services.py`: `record_attempt` writes QuestionAttempt on session database; `finalize_session` locks primary ArenaSession, computes one verdict per frozen question, creates ProgressRecord/XPEvent, updates completion records, marks submitted with scoring_version 2 and invalidates cache after commit.
- `backend/apps/progress/models.py`: attempt identity unique_together and model append-only guards; result OneToOne session. PostgreSQL records and server session state own acceptance/results, not browser feedback, queue, cache or client clocks. View serializes receipts/ProgressRecord; validated response returns through store/hook to victory UI.

Limits: code reading only; no new runtime/API/browser test. Same-tab sessionStorage is not cross-device durability; unavailable storage degrades to memory. Legacy absent-version submission is not replay-safe. Finalize manifests cover required pending identities, not a tournament fairness proof. Client elapsed times are not authoritative competition evidence. No live/CI freshness certification.

## G–H comparison and executed evidence

Read tracker and only relevant handoff G/H/Definition of Done after recording the above. G requires minimal fresh context, 12 sourced answers and a real feature path; this run fails its freshness condition because of early patch exposure. Source recoverability and the trace are satisfactory but not an independent fresh-context PASS. No implementation defect was identified. The bootstrap procedure now prevents this specific tool-response trap; only another clean session can validate it.

H local candidate review: 18 unittest regressions pass on Python 3.12. Strict checker and `--warning-only --github-actions` each report zero errors/warnings. `git diff --check c8675e6` passes; `git diff --exit-code 6d32de6 -- backend frontend` is empty. CI diff contains only the independent advisory context job, with unchanged triggers/application jobs/build dependencies. Historical architecture body and detailed recovery delivery body remain preserved. Startup remains concise; deep retrieval was selective. No service/deploy/AWS script, production migration or load test was run. Added docs are dated evidence/proposals, not competing current-state owners.

Hosted CI remains unverified: connected GitHub returned no PR-triggered workflow runs for ce544953 (first page and PR filter only). No live provider access/state was inspected. Human integration gates remain baseline → workflow foundation → answer recovery → continuous context → context V2; review context-only c8675e6..setup and full main comparison. Normal backend/frontend/build PR CI, actual frontend deployed source/revision and live API/provider/log/health evidence remain required for integration/release claims. Clean G is the only remaining setup validation gate; READY FOR HUMAN REVIEW is deliberately withheld.
