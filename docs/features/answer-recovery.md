---
status: READY FOR HUMAN REVIEW
branch: feat/answer-recovery
base_commit: b03d167b8b5478feb4d306ec51a5872c0b5b3951
reviewed_code_commit: 6d32de6a94c2afb92c5bc7a4c72dffe73737d2b1
current_commit: 88cfff2791c9adc3648a39cf39a21a73c97e1697
last_checkpoint: 2026-10-01
owner: ai
---

## Next Exact Action

Human developers review the published baseline/foundation/recovery in the
recorded dependency order, verify PR CI, then decide integration. Confirm actual
production frontend source/revision before any release. No merge/deploy is
performed or authorized by this context task. Metadata reflects the inspected
owning branch head; the body below is the preserved historical approval and
verified delivery record, including now-completed initial prerequisites.

# Answer recovery: approved plan and delivery record

Status: ready for developer review after approval on 01 October 2026. AR-01/02 foundation is published at b03d167. AR-03–08 implementation, local verification and independent code review are complete at 6d32de6; the final handoff commit changes only this document. Main and feat-Sagar remain frozen. No AWS deployment is authorized.

Second-pass revision: 01 October 2026, Asia/Kolkata. The task owner approved this contract, branch policy, limits, guidelines and bounded agent delegation, and requested a small implementation suited to a 3–4 developer indie team.

## Confirmed context

- User chose `feat/answer-recovery` first; teacher dashboard and tournament rounds are to be reassessed afterward.
- `feat-Sagar` is `c81416d`; `origin/main` is `cec94ea`. The feature branch contains the earlier lint commit and both assessment/handoff documents, not yet merged into main.
- User supplied `www.student.boltabacus.com` and `www.teacher.boltabacus.com` as frontend URLs and authorized repository recency as a fallback for choosing the implementation source. Choose `Bolt-V1/frontend`: its latest functional source commit is June 30 (`fb4ef13`), versus June 18 in the standalone checkout; its latest lint changes are October 1. The other backend feature branch is older and an ancestor of the chosen base. This chooses a working source; it does not prove which commit serves the domains. Site requests and GitHub deployment API calls are blocked by this environment; live attribution stays unverified.
- Correct a prior assessment mistake: root `Bolt-V1/vercel.json` proxies `/api/(.*)` to the API. The standalone `vercel.json` has only a SPA rewrite. Routing conclusions must distinguish those configurations and the actual hosting project's selected config.
- CI uses `npm ci` without a tracked npm lockfile. Fix only that frontend reproducibility prerequisite in a small foundation branch; do not bundle dependency/framework upgrades.
- Root `CLAUDE.md` contains a generic game-studio template, model/editor nudges and repeated approval by file count. Align it with one shared Bolt workflow rather than maintaining conflicting instructions.
- No `AGENTS.md` exists. Use uppercase root `AGENTS.md` because Codex recognizes it. Do not add a second case-only `agents.md` that can conflict on case-insensitive filesystems.
- Local PostgreSQL/Redis/dependencies are available in this environment. They must be isolated for parallel tests and cannot be assumed to exist on a developer's workstation.

## Approval scope and publication sequence

1. Publish workflow on `chore/agent-workflow`, based on `feat-Sagar@c81416d`:
   - `AGENTS.md` from the reviewable proposed file.
   - Replace `CLAUDE.md` with the short compatible adapter; preserve opt-in local daily-log behavior.
   - `docs/agent-workflow.md` with portable worktree/setup/review guidance.
   - `.github/PULL_REQUEST_TEMPLATE.md` for developer handoff.
   - `docs/features/answer-recovery.md` containing approved scope, contract, tasks and current status.
   - Targeted corrections in `docs/assessment01-10-2026.md` and `docs/next-steps01-10-2026.md` distinguishing the bundled Vercel API proxy from standalone config and recording frontend selection as provisional deployment evidence.
   Check document paths/diffs and commit locally; publish after the next foundation gate. No new CI/deploy automation.

2. Complete the same `chore/agent-workflow` foundation branch with a separate CI-baseline commit:
   - Narrow `.gitignore` lockfile exclusion for `frontend/package-lock.json`.
   - Generate and track `frontend/package-lock.json` with an agreed toolchain; verify clean install and current frontend checks.
   Reuse existing lint fixes through the declared `feat-Sagar` ancestry. Do not rewrite/package-upgrade the backend or unrelated frontend code. Record baseline failures separately. Combining the two foundation commits into one reviewable branch avoids asking humans to merge a documentation prerequisite whose CI cannot pass until a dependent lockfile branch is merged. Publish the checked foundation branch, not a claim that its earlier documentation-only commit passed CI.

3. Create `feat/answer-recovery` from the checked foundation commit, then implement the approved recovery scope described below. Keep task worktrees on distinct helper branches.

4. Coordinator integrates, reviews and verifies; push the feature with a draft PR if API access supports it, otherwise a PR-ready handoff. Report exact commits, tests, merge order and blockers.

5. Reassess `feat/teacher-dashboard` after this feature is handed off. Do not start `feat/tournament-rounds` until eligibility/deadline/content/scoring/organizer requirements are approved. Approval of this plan does not authorize those later features or every finding in the assessment.

Until humans merge prerequisites, these branches are stacked:

`main -> feat-Sagar@c81416d (frozen baseline) -> chore/agent-workflow -> feat/answer-recovery`

Only new branch commits are made. Do not modify `main` or add changes to the existing `feat-Sagar` branch. **All integration PRs target `main` and remain drafts while prerequisites are pending; no PR targets `feat-Sagar`.** Task/helper branches are integrated locally into the recovery branch, not merged into the baseline. Show the feature-only commit range against its foundation, alongside the main comparison that currently includes prerequisites. Humans merge baseline/foundation/recovery in the recorded order; the agent never merges them. Stop and recheck if a base ref changes. Do not retarget/rebase/force-push a reviewed branch silently.

## Initial answer-recovery scope

Target current learning flows, not tournament orchestration. Reuse existing session/attempt endpoints, unique `(session, question_index, attempt_number)` records, PostgreSQL transactions and existing React/TanStack Query/Axios/Zustand code.

Backend:

- Explicit one-based attempt identity for upgraded clients; the same identity and payload returns the stored receipt. A conflicting payload returns a structured conflict. Exact accepted replays remain recoverable after finalization; new writes cannot alter a finalized result.
- Validate full batches before writing; allow distinct legal retries for one question. Unify normalization, skips and approved mode rules across single/bulk paths. Lock once per session and preserve append-only writes/uniqueness.
- Return compact accepted identities/session state for resume. Keep existing routes and ordinary verdict fields where compatible. Use the explicit version/capability contract below: old practice already sends zero-based `attempt_number`, so field presence alone cannot identify an upgraded client. Backend-first rollout of the new contract is required.
- Frontend awaits accepted receipts before finalization. For the upgraded client, a submit identity manifest is part of the agreed contract, not an optional late addition; the server verifies it under the same session lock. Server cannot verify browser work never declared.
- No historical attempt/result/XP rewrite. Audit legacy nullable identities; do not add a destructive migration merely to implement new-client retries. Any necessary schema change must be reported/reviewed before integration.
- User chose to preserve learning interactions, fix saving/replay and count each question once. Keep the current classwork UI's retry behavior and test-mode one-answer/no-skip rule. Preserve practice retry interactions rather than imposing a new blanket three-attempt UI limit; define the shared service's mode policy explicitly. Ordinary classwork's documented server cap remains a safety boundary, without expanding its UI retry count. Practice batching must support the current wrong/correct retry flow, bounded payloads and existing request protections.
- Award at most one score credit per question with an allowed correct non-skip attempt; keep the denominator as the frozen question count. Newly finalized reports and scores must agree. Derive XP from the corrected score while preserving the existing XP formula and retake rules. Already-finalized records/XP and historical report interpretation are unchanged. Use a small persisted scoring-version marker in existing session JSON metadata for newly finalized records so reports select the corrected reducer only for those records; leave generator parameters intact. No historical backfill or new model column is presumed necessary.

Frontend:

- Update shared types/hooks/mocks/schema and both `ClassworkPage` and `InArenaPage`. The latter drops failed flushes into finalization; classwork advances after failed writes.
- Assign identity once, retain identical payload, acknowledge only returned entries and handle input arriving during an in-flight flush.
- Use the bounded session-scoped browser state contract below. Explicit user logout clears pending state after a visible warning when work is unsaved; automatic authentication expiry suspends/requires re-login without silently deleting pending work. No tokens/PINs stored; storage failures are visible. No general offline platform/IndexedDB rewrite.
- Display saving/pending/error/accepted state, honor rate-limit retry guidance and reset recoverable finalization failures. Do not navigate to success after failed required persistence.
- Refetch mutable receipt/status metadata on resume; keep frozen questions reusable. No claim that late/offline answers qualify for a future tournament.

Excluded: tournament/round entities or tournament deadline enforcement, new organizer/leaderboard flows, frontend redesign, new auth provider, broad throttle/deletion/content fixes, AWS sizing/deployments, automatic main merge and historical data repair. Recovery must avoid restarting a personal displayed timer, but is not a tournament-integrity solution. Reproduce/report material unrelated blockers instead of bundling them.

## Frozen contract for the first implementation

Changes remain within `/api/v1` session routes. This is an explicit client capability/field change, not a new API framework.

### Protocol and compatibility

- Add `attempt_contract_version: 2` to upgraded session metadata. New single-write payloads and bulk/submit envelopes carry `contract_version: 2`; successful single/bulk/finalize responses add the same version while retaining existing top-level verdict/result keys. Legacy absent-version requests continue through a named compatibility path; do not reinterpret their optional zero-based `attempt_number` as the new identity.
- An unsupported explicit version returns 400 with a stable code. A new frontend checks capability before accepting input; against an older API it shows a clear upgrade/reload requirement, rather than pretending ignored identity fields provide protection.
- Keep legacy response shapes and documented behavior during backend-first rollout. Legacy callers do not become replay-safe merely because the server changed. Preserve their compatibility path explicitly, with its limitations and removal condition documented; do not mix a legacy fast-item partial-rejection response with v2 all-or-nothing acknowledgements. The legacy path is a temporary adapter, not a second generic grading framework.
- For legacy requests sharing a session with v2/gapped identities, allocate the server's next identity from the maximum stored non-null identity, under the same lock, rather than `count()+1`; retain legacy wire shapes and accepted-row cap counting. Test this interleaving without claiming legacy transport replay is safe. Legacy nullable rows remain unmodified; G2 must confirm how their state is represented before advertising resumability for such active sessions.
- New receipts include `question_index`, `attempt_number`, `accepted`, canonical `submitted_answer`, `elapsed_ms`, `is_skip`, ordinary `is_correct`, and `xp_delta: 0`; existing verdict keys remain for ordinary learning. GET state includes server state, compact per-question last/max identity and terminal state, latest accepted own-session receipt and safe timing/context metadata. Reconcile older pending identities through exact replay rather than returning an unbounded attempt history in every resume response. No expected answers are added to classwork metadata or receipts.
- Validate runtime receipt shape/version, identity and acceptance before removing queued work; TypeScript annotations do not validate network data. Recheck mutable capability on resume/re-login/reconnect. If an API rollback returns an old receipt against cached v2 metadata, stop writes, preserve the queue and show incompatibility; do not treat HTTP 200 alone as an acknowledgement. Backend rollback requires reverting the frontend first; no deployment is performed in this task.
- Correct/skip is terminal for new writes in that question's upgraded flow; exact accepted replays remain valid. Practice wrong-answer retries remain available. Classwork UI stays at its existing retry allowance; server safety cap is three, test mode one/no skip, practice has no newly imposed three-attempt UI limit. Caps count accepted rows, not request count or untrusted attempt numbers.

### Identity, atomicity and errors

- Identity is `(session, question_index, attempt_number)` with one-based numbers 1–32767, matching the existing PostgreSQL small-integer field. The stored canonical answer, skip flag and original `elapsed_ms` must match for an exact replay. Client retries must not recompute elapsed time or allocate another number after an uncertain response. Identity exhaustion shows an explicit limit; no wraparound.
- Allow gaps after a definitely rejected input; allocation uses the maximum known server/local identity plus one, not accepted-row count. Ownership and session locking remain mandatory. Never renumber an unacknowledged identity to work around a conflict; refresh receipts and show the actual committed outcome.
- Validate integer/boolean types without coercing strings, floats or booleans to integers: index in the frozen question array and small-integer range, answer within signed 32-bit range, elapsed 0–2147483647 milliseconds. Normalize new explicit skips and legacy sentinel consistently; a real answer zero is not a skip. Reject conflicting representations. Preserve `MIN_ANSWER_MS = 200` and its existing enforced kinds. Validate every item before any v2 mutation, including caps against other items in the batch.
- For v2 skips, `is_skip: true` with answer zero or the existing `SKIP_ANSWER_SENTINEL` normalizes to the stored sentinel; omitted flag plus sentinel also means skip. Explicit false plus sentinel, or explicit true plus another answer, is invalid. Omitted/false flag plus answer zero is a genuine answer. This covers current flash skips without conflating correct zero answers.
- Repeating an identical identity inside one batch is rejected with 400 and item indices; distinct permitted attempt numbers for the same question are legal. A conflicting existing identity returns 409. Any v2 validation/conflict failure creates zero new rows. Replays mixed with invalid new items are acknowledged only after the whole batch validates; the stored replay rows are unchanged.
- Evaluate new per-question batch items in attempt-number order, independent of request array order, while returning receipts associated with the original identities. Validate terminal/cap policy across the entire proposed sequence before insertion. API-04 covers a reversed request array so behavior cannot depend on loop order.
- Keep the existing minimum-elapsed policy, without treating client elapsed as trusted time. A v2 rejected fast item rejects the whole batch with item-level reason/identity. UI displays that rejected item and can explicitly exclude it to retry remaining valid work; it must not silently discard it or retry the same deterministic 400 indefinitely.
- Proposal limits, frozen for this slice: 100 items per v2 batch (the current practice session maximum is 100 questions), bounded request values, and frontend chunks no larger than that. Repeated practice retries can span batches. Oversized input yields a documented error, not a 500. Do not change general server/proxy request limits without a demonstrated need.
- Suggested error codes: `invalid_attempt`, `duplicate_identity`, `identity_conflict`, `attempt_limit`, `session_closed`, `pending_attempts`, `unsupported_contract`. Keep `detail` and item identities for the UI. Preserve authenticated ownership 404/401 behavior; do not leak another user's session existence or receipts.

### Finalize and recovery after closure

- `submit/` v2 requires `expected_attempts`: at most 200 distinct identities, captured from unresolved required work when finishing starts, retained across draining/reloads until submit is acknowledged. Previously acknowledged work is already durable and need not be enumerated again; do not send the lifetime attempt history. Verify this manifest under the same session lock as finalization. Missing identities return 409 `pending_attempts` with no progress/XP writes. Empty/partial sessions can finalize only when no declared required work remains. Excluding a definitively rejected item needs an explicit UI choice and a visible rejected status; uncertain work cannot be excluded automatically.
- Writes and finalization serialize on the existing session lock. If write commits first, finalization includes it; if finalization commits first, a genuinely new write is rejected. Returning an existing final result is stable; a manifest mismatch still returns an explicit conflict, not silent success.
- Exact committed replays are recoverable after submitted/abandoned closure without adding rows. For an abandoned session with missing writes, do not resurrect it or upload old answers as if accepted. Preserve the local unresolved state and show it. Keep existing abandonment timing/retention; narrowly recheck active-state predicates in the cleanup update so a stale scan cannot mark a newly finalized session abandoned. Test cleanup/finalize ordering; no scheduler or tournament-grace changes.
- For new finalizations, use one small per-question reducer for score/report states: correct on first accepted answer, fixed after allowed wrongs followed by correct, skipped on terminal skip, otherwise wrong/unanswered. Missing questions stay in the score denominator. Do not clamp duplicated credits; prevent them. Existing personal elapsed-time/XP/retake formulas remain except transport replays add no elapsed/XP.

## Browser state and recovery UX

Use one small pure queue/reconciliation module plus existing React/Zustand/hooks. Inspection found `sessionStore.ts` currently unused by the gameplay pages; adopt/extend it only if useful, do not create parallel state stores merely to use a named library.

- State format includes schema version, user ID, session ID, lesson/level context, current question/feedback state, immutable pending items, issued identity counters, finish manifest and timer state. Store only required learner-entered values, not tokens, PINs, expected answers or whole histories. Treat parsed browser storage as untrusted typed input.
- Proposed storage bound: 200 pending items and 256 KiB serialized state per session; pause input with a visible capacity warning if exceeded, never evict unacknowledged entries. These are recovery buffer limits, not a lifetime practice-attempt cap. If storage is denied/full/corrupt, explain degraded in-memory behavior rather than displaying “saved locally.” `sessionStorage` supports same-tab reload, not guaranteed tab-close/browser-crash recovery.
- Hydrate only after authentication resolves and validate the current user/context against server state before flushing. Explicit logout/switch-user clears the previous user's pending state; automatic 401/refresh failure suspends writes and permits same-user re-login recovery. Do not redirect/clear work silently. Make only the narrow auth-store/interceptor changes needed for this distinction, not a token-system rewrite.
- Reconcile server receipts before reissuing pending work; server is authoritative. Restore classwork's mode from `SessionMeta.is_test_mode` and its current question/retry/verdict state, not the page's default false/zero values. Do not POST start repeatedly just to recover a known session ID. On practice resume, do not reset attempt counters or turn a stored wrong-answer retry into a new first attempt.
- Serialize flushes with one in-flight mutation. Snapshot each chunk, remove only receipts matching that chunk, retain input added while it runs, and tolerate lost receipt/ack callbacks. React StrictMode/remount must not start duplicate timers/flushes; idempotency is the server backstop, not permission for uncontrolled UI effects.
- Preserve immediate practice feedback but distinguish local verdict from server acceptance. Classwork never advances after an uncertain or rejected required write. Flash-card timing/auto-advance remains its normal interaction while writes are pending, until recovery capacity is reached.
- Retry transport/timeout and appropriate 5xx with bounded backoff using the original identity; honor 429 `Retry-After`. Handle 400/409/401/404 by their reason and offer explicit recovery; do not swallow them or create infinite loops. Render backend messages as text, not HTML.
- Finishing freezes further input, drains required work and submits the manifest. On error, unlock the relevant recovery actions; do not get stuck behind `isFinalizingRef`. Timer expiry stops new input but preserves pending work and displays unresolved saves. Finalize waits for known required receipts; results navigation requires confirmed progress.
- Add safe server `started_at`/`server_now` and effective personal-limit metadata. For new timed sessions freeze the existing effective limit into session config without changing generator parameters; no new deadline model. Display remaining duration from that metadata on reload/background tabs, with no fresh full-duration restart. Use only a minimal flash-card remaining-time restoration; do not auto-generate offline skips for unseen cards.
- Scope of recovery: same browser tab/session, reconnect and re-authentication. Multi-tab concurrent writers receive conflict/reconciliation, not silent merging. Cross-device synchronization, general offline play and tournament fairness are separate work.

## Measurable test matrix

This matrix defines the approved acceptance boundaries. Executed evidence and its limits are recorded below; each row is not a claim of a separate browser test. Existing misleading names/expectations were clarified only with a documented contract reason, not deleted to make the suite pass.

| Test IDs | Boundary and expected assertion |
|---|---|
| API-01 | Replay single, bulk and cross-path at least three times: one accepted row/identity; stable verdict/score/elapsed/XP |
| API-02 | Same identity/different answer, skip or elapsed: 409, zero new writes |
| API-03 | Invalid second item, duplicate identity, oversize and invalid numeric values: v2 whole batch adds zero rows |
| API-04 | Repeated-question wrong/correct pair, genuine zero answer, explicit/sentinel skips and every existing mode: approved policy, one correct credit maximum |
| API-05 | Mode caps cannot be bypassed by high/gapped identity numbers or single/bulk switching; accepted replay does not consume a cap |
| API-06 | Real concurrent write/write, write/finalize and stale-cleanup/finalize using separate transactions/connections and barriers, with bounded timeouts: deterministic durable outcome and no duplicate XP or abandoned finalized result |
| API-07 | Missing manifest identities: no summary/XP; exact finalized replay/result retrieval stable; new writes to closed sessions denied |
| API-08 | Old client without version, old zero-based bulk, new v2 client, unsupported versions, old API capability absence and old response after rollback/cached capability: documented compatibility; queue never falsely acknowledged |
| API-09 | Another user/session ID, inactive identity and private receipt fields: unauthorized reads/writes blocked, expected answers withheld |
| DATA-01 | Pre-existing finalized record/XP/report interpretation unchanged; old nullable attempt data is not silently renumbered; newly finalized reports agree with corrected score |
| UI-01 | Drop a response after DB commit, then retry/reload: one row and restored acceptance |
| UI-02 | Wrong/correct practice buffer, storage-full/corrupt/denied, new input during flush, StrictMode/remount: no silent eviction or duplicate timers |
| UI-03 | Explicit logout/switch-user versus automatic expiry/re-login: intended isolation/recovery, no credential persistence |
| UI-04 | Resume classwork mode/retry/verdict/position and timed/untimed/flash state: no reset or phantom skips |
| UI-05 | 400/409/429/5xx, failed finalize, timer-expired pending work and abandoned session: explicit status, actionable recovery and no success redirect |
| INT-01 | Built SPA, no MSW, real local API/JWTs and known synthetic PIN login: normal and fault recovery; one smoke case with actual hashing/throttle behavior |
| REG-01 | Ruff, existing pytest, frontend lint/type-check/Vitest/build, targeted integration tests and targeted schema checks; pre-existing smoke-suite failures reported separately |

## Delivery gates and stop conditions

| Gate | Required evidence | May proceed when |
|---|---|---|
| G0 — approval | Revised rules, contracts, scope, bounds and branch policy | Owner approves this version; no implementation beforehand |
| G1 — foundation | Exact base refs; clean lock install; backend/frontend baseline; tracked/untracked diff and link checks | No newly introduced baseline failure; any unrelated blocker is recorded and escalated before readiness claims |
| G2 — contract | Coordinator commits the approved written contract/schema skeleton; model/legacy feasibility review | Both workers acknowledge one contract and disjoint file ownership; frontend worker owns TypeScript types; no unresolved meaning of a field/error |
| G3 — implementation | Task commits with focused tests and before/after assertions | Coordinator accepts scoped diffs; no placeholder implementation or unapproved dependency/model change |
| G4 — integration | Named integrated commit; full required checks and browser/DB race evidence | Reviewer checks the actual combined tree, including untracked artifacts and compatibility paths |
| G5 — handoff | PR-ready summary/compare ranges, exact CI evidence, rollout/rollback constraints and unresolved limitations | Branch can be labeled review-ready; missing required checks keep it a draft |

Stop dependent work for a needed product rule, migration/backfill, unapproved dependency, live-system requirement, incompatible older client or introduced test failure. Continue independent approved work. Do not patch unrelated login/deletion/throttle/content defects to hide a blocker; record a separate proposed task. No agent may waive a failed safety/acceptance gate itself.

## Code review quality gate

- Every changed file/behavior traces to this feature, a documented prerequisite or the two targeted assessment corrections. Stage explicit files, not broad `git add .`.
- One authoritative attempt policy/scoring reducer; simple queue state and typed API boundaries. No generic framework, duplicate shadow store, new queue service or speculative future feature.
- Reject unjustified `any`, ignored type errors, disabled lint/tests, broad swallowed exceptions, magic retry/status behavior, undocumented TODO implementations and unrelated reformatting. Necessary exceptions require a concrete reason and a test.
- Review transaction/lock ordering, append-only effects, response recovery, stale callbacks, storage/auth cleanup, numeric bounds and privacy fields. Do not rely on JavaScript state to enforce a database invariant.
- Tests assert observable API/UI/database behavior, not a mocked helper returning its own expected value. Fake timers/barriers cover timing deterministically; do not use long sleeps as race proof. A test that currently asserts duplicated rows while named “idempotent” is a legacy limitation test, not a v2 regression standard.
- No dependency changes in recovery by default. Lockfile foundation generation must review resolutions, especially fresh wildcard ranges; do not claim “no upgrades” merely because package.json stayed unchanged. Reuse a valid existing resolved set where safe or report necessary resolution changes. Capture Node/npm/Python/service versions; CI Node version is a reproduction baseline, not proof of upstream support.
- Reviewer records blocking findings and their resolution against exact commits. Any subsequent code change reruns affected checks/review. Human developer remains the final merge authority; agent review does not guarantee bug-free code.

## Delegation and approved code areas

Coordinator owns the initial contract, integration and feature handoff. Use a sibling worktree per integration/task branch and unique database/test DB, Redis namespace and local ports per runtime. No concurrent writes to one checkout or dependency environment.

| Worker | Ownership | Verification |
|---|---|---|
| Backend agent | `backend/apps/exercises/views.py`, `serializers.py`, narrowly `tasks.py` cleanup update; new contained attempt service/input validation if justified; `backend/apps/progress/services.py`; corresponding existing/new tests | replay/conflict, batch rollback, skip/zero, mode policy, finalized replay and real concurrent transactions |
| Frontend agent | `frontend/src/shared/api/queries/useSession.ts`, `shared/types/index.ts`, `shared/store/sessionStore.ts`, `shared/store/authStore.ts`, `shared/api/client.ts`, new contained pending-queue module; `features/learn/ClassworkPage.tsx`, `features/learn/verdictLogic.ts`, `features/practice/InArenaPage.tsx`, `shared/ui/SyncDot.tsx`, relevant UI/tests and mocks; narrow hydration wiring in `App.tsx` and logout/pending-work wiring in `features/profile/ProfilePage.tsx` and `features/teacher/TeacherDashboardPage.tsx` | lost response/reload/reconnect, rejected writes, pending flush plus new input, auth/logout isolation, timer/resume and finalize recovery; no profile/dashboard feature redesign |
| Coordinator | contract and `frontend/src/api/openapi.yaml`; feature docs; `frontend/playwright.integration.config.ts`, integration-only local preview/config helpers if needed, `frontend/package.json` test command and relevant `frontend/e2e/` tests; agent integration | combined diff/API compatibility and end-to-end local verification; frontend agent alone implements the frozen TS types, avoiding shared ownership |
| Reviewer/QA agent | read-only review of named integrated commit; isolated test resources; QA artifacts without changes to another worker's files | regression/tenant isolation and fault-path report; coordinator owns follow-up code changes |

Any extra file must be inside the approved feature areas and necessary to these acceptance criteria; a new product rule or unrelated subsystem requires clarification. Backend migrations/model changes are not assumed approved merely because the area contains models.

The integration runner must refuse non-local API targets and not use production URLs as a fallback. Keep existing mock-only smoke tests labeled; use the new targeted built-preview configuration without weakening production CORS/cookies. Match CI PostgreSQL 16/Redis 7 where available, and report the current environment's PostgreSQL 17/Redis 8 or Node differences honestly if equivalent-version verification cannot run. Tests and dependency installs use allocated resources; writes remain per-worktree. Never reset a teammate's DB or flush a shared Redis.

## Execution tasks and dependencies

| Wave | Category | Task and owner | Dependency / completion evidence |
|---|---|---|---|
| 0 | Workflow | AR-01 — coordinator: guidance, PR template, feature plan and two targeted assessment corrections | G0 approval; scoped document diff and valid paths |
| 0 | Reproducibility | AR-02 — coordinator: tracked lockfile, clean local install and baseline checks on the same foundation branch | AR-01; reviewed resolutions, tool versions and G1 evidence |
| 1 | API agreement | AR-03 — coordinator: contract/schema, mode/skip policy, legacy active-session feasibility and task ownership | AR-02; G2 acknowledged by workers; no implicit migration |
| 2 | Persistence | AR-04 — backend: shared v2 validation/write/receipt logic, atomic bulk and compatibility adapter | AR-03; API-01–05, API-08–09 |
| 2 | Browser recovery | AR-05 — frontend: bounded queue, validated receipts, resume/auth/timing, pages and truthful save status | AR-03; UI-01–05, API-08 response validation; exclusive UI/types ownership |
| 2 | Results | AR-06 — backend: manifest finalize, distinct scoring/versioned reports and narrow cleanup race fix | AR-04; API-06–07, DATA-01; no historical rewrite |
| 3 | Integration | AR-07 — coordinator: combine reviewed commits and run built-SPA/real-API fault paths plus required regressions | AR-05–06; INT-01, REG-01 and G4 integrated-commit evidence |
| 3 | Review and handoff | AR-08 — independent reviewer plus coordinator: findings/fixes, exact-commit rechecks and draft PR/handoff | AR-07; G5, feature-only/full compare links, no protected-branch or AWS changes |

AR-04/06 belong to one backend agent and run sequentially; AR-05 runs in its own frontend worktree after the contract is frozen. The reviewer does not write into either agent's checkout. This task list is not approval to start later dashboard/tournament features.

## Acceptance and handoff

- Retrying a committed answer does not create another row/score effect; a conflicting identity is not silently accepted.
- An invalid batch makes zero new writes; approved repeated-question retries persist correctly.
- An acknowledged answer is visible after reload/resume; another user cannot read/write that session.
- No silent classwork advance, lost practice queue or success redirect on failed required persistence; finalize retry returns the existing result.
- Existing unit checks and relevant targeted browser tests pass on a built SPA/real local API, not MSW alone. Record exact configuration/versions and checks that could not run.
- Draft PR or equivalent handoff includes baseline/current commits, prerequisites, API compatibility, local test evidence, manual vetting, migration status and remaining limitations. Developer alone reviews/merges and deploys from their end.

## Approval record

The task owner approved this second-pass revision on 01 October 2026: “Yes, begin with the work”, with the explicit constraint to keep the implementation suitable for an indie project with 3–4 developers. This covers routine implementation, local verification, bounded delegation and new-branch GitHub publication. It does not authorize main/feat-Sagar changes, AWS deployment, historical backfill or later features.

The earlier two-foundation-branch sketch is superseded. If a fixed limit proves inadequate under tests, report the reason before changing a user-visible promise; routine internal tuning within approved constraints remains autonomous.

Frontend working-source selection and preserve-interactions/distinct-scoring policy have been answered. Actual hosting attribution remains unavailable and is not a reason to invent deployment evidence or change DNS/hosting during this feature.

## Continuing while the owner is away

After approval, work can proceed without the owner present on a workstation while this task/environment remains running. Resolve routine reversible implementation choices within scope and record them. Required unanswered rules pause dependent work; independent tasks may continue. Persist approved checkpoints/handoff on GitHub. This does not guarantee processing after the platform ends/suspends the session; another task/agent resumes from the branch and feature record.

## Delivery checkpoint

- Frozen base: `feat-Sagar@c81416d166792caada0868dff0d3242daccbedde`; remote main: `cec94ea187ab3fcf571f73dd4468b1edaf0d290a`.
- Foundation: `chore/agent-workflow@b03d167`, published from an isolated sibling worktree.
- Coding selection: two GPT-6.1-Sol agents at high effort, with bounded backend/frontend ownership in separate worktrees; coordinator plus one independent reviewer. No additional team hierarchy or orchestration framework.
- Reviewed implementation: `feat/answer-recovery@6d32de6`; local checks and independent code review passed. The final handoff commit is documentation only; human integration/release is pending.
- Local verification is recorded below; GitHub CI and production capacity remain unverified.

### Foundation verification — 01 October 2026

- Backend Ruff passed; pytest passed all 145 collected tests using `config.settings.test`, isolated PostgreSQL 16.15 and Redis 7. An initial invocation inherited development settings; the release baseline is the explicitly configured test-settings run, not that invocation.
- Frontend `npm ci`, ESLint, TypeScript, Vitest (4 files / 25 tests) and Vite build passed. Lockfile regeneration retained all existing installed package versions and registry integrity metadata; optional-platform metadata was resolved through npm. No package.json dependency change.
- The initial foundation run used Node 24.19.0 / npm 11.9.0 / Python 3.12.14. CI specifies Node 20 / Python 3.12; later Node-20 verification is recorded below. Local success is not GitHub CI evidence.
- The install regenerated the existing MSW worker; that unrelated generated change was restored and excluded from publication.
- Existing Ruff configuration and factory warnings remain; no checks were disabled to hide them.

### AR-03 wire contract and runtime ownership

Implement these exact field names in addition to the frozen behavioral contract above. No new endpoint or model is required.

| Surface | Fields / behavior |
|---|---|
| Session GET/start metadata | `attempt_contract_version: 2`, `state: active/submitted/abandoned`, `started_at`, `server_now`, nullable `lesson_id`/`level_id`, existing effective `time_limit_sec`/`flash_speed_ms`/`is_test_mode`, `question_states` |
| Each question state | `question_index`, `max_attempt_number` (0 when none), `attempt_count`, `terminal`, nullable `latest_receipt`; bounded by question count, not lifetime retries; latest follows accepted chronology and may be lower than maximum identity |
| Accepted receipt | `contract_version: 2`, `question_index`, `attempt_number`, `accepted: true`, canonical `submitted_answer`, original `elapsed_ms`, `is_skip`, `is_correct`, `xp_delta: 0` |
| Single/bulk | Single body adds version/identity; bulk envelope adds version and keeps `attempts`. Bulk returns `{contract_version: 2, verdicts: receipts}`. Each receipt includes its version; HTTP success alone is not acceptance. |
| Finalize | `{contract_version: 2, expected_attempts: identities}`; result retains ProgressRecord keys and adds `contract_version: 2`. Validate required identities even for an existing result. |
| Errors | `code`, `detail`, optional `items` (input index/identity/code/detail), own-session `receipt` for identity conflict, `missing_attempts` for incomplete manifest. Preserve tenant-safe 401/404. |
| Legacy nullable rows | Do not renumber/backfill. Session metadata advertises version 1 if any attempt identity is null; upgraded UI blocks unsafe resumed input and explains incompatibility. Ordinary legacy non-null sessions can reconcile from stored identities. Completed history remains unchanged. |
| Frozen timing / scoring | For new sessions freeze effective `time_limit_sec` in existing config; existing sessions use documented fallback. Persist `scoring_version: 2` in existing config only when newly finalizing; reports without marker keep historical interpretation. Keep generator parameters intact. |

The API worker owns backend implementation/tests only; frontend worker owns runtime types, queue, hooks, gameplay and narrow auth/logout wiring only. Coordinator alone edits OpenAPI, feature docs, package.json integration test command, Playwright integration configuration and e2e files. Mocks belong to the frontend worker. Workers read this contract and report disagreement before writing a divergent field.

Local implementation resources: PostgreSQL 16 at loopback port 5544, Redis 7 at loopback port 6385. API worker uses `bolt_recovery_api` and Redis DB 4; integration uses `bolt_recovery_integration` and Redis DB 5; reviewer uses `bolt_recovery_review` and Redis DB 6. API/frontend integration ports are 8011/4181. Each DB test run creates its own prefixed test DB. Private connection/environment configuration is outside Git. Use test settings explicitly for unit tests; the built-SPA integration runner uses real hashing/JWT/throttles and synthetic users.

Gate status: G0 approved; G1 foundation passed locally; G2 contract/schema committed with disjoint ownership; G3 scoped implementation integrated; G4 local checks passed; G5 independent code review accepted 6d32de6, followed by this documentation-only handoff. Historical-null fixtures verify the safe capability fallback; no production data scan/migration was performed. GitHub draft-PR creation returned API Forbidden; native Git is used for branch publication, and GitHub CI remains unverified. Human prerequisite integration and release gates remain open.

### Integration setup (local only)

1. Use isolated local PostgreSQL 16 and Redis 7 instances; create `bolt_recovery_integration`. Configure private `DJANGO_SECRET_KEY`, `DATABASE_URL` (loopback / that database), `REDIS_URL` (loopback / isolated DB or namespace). Never point this runner at a shared/live DB. Match Python 3.12 and Node 20 from CI where available.
2. Set `PYTHONPATH` to the checkout's `backend` and `frontend/e2e/recovery` directories and `DJANGO_SETTINGS_MODULE=api_settings`. From the repository root run `python frontend/e2e/recovery/fixtures.py`; it applies local migrations/seeds four synthetic users with PIN 2468, requires the normal password hasher, and prints fixture IDs/call-signs in its final JSON line. Save that line to a private file and set `RECOVERY_FIXTURE_FILE` to its absolute path. Each seed run uses new users; it never deletes result history or flushes shared cache.
3. From `backend/`, start `python manage.py runserver 127.0.0.1:8011 --noreload` with those settings. Confirm `/api/v1/health/` reports DB/Redis healthy.
4. From `frontend/`, run `npm ci` and `npm run e2e:recovery`. Supply `RECOVERY_PYTHON` if the Django environment's Python is not on PATH; inherited PYTHONPATH/DB/cache/private key are used by synthetic-only database assertions. Install Playwright's Chromium through its normal verified installer, or set `RECOVERY_CHROMIUM_PATH` to an available trusted Chromium executable.
5. The runner builds the SPA with `VITE_API_BASE_URL` pinned to `RECOVERY_API_ORIGIN` (default `http://127.0.0.1:8011`) and starts preview at `RECOVERY_PREVIEW_ORIGIN` (default `http://127.0.0.1:4181`). Both origins must be HTTP loopback with no credentials/path/query. The API settings import the existing base settings, retain real hashing/JWT/throttles, disable development toolbar profiling, reject any inherited replica URL, and permit only the explicit local preview as an additional CORS origin. Production settings/CORS remain unchanged. Stop only the local services started for this run.

The targeted runner does not run or weaken the older mock-only smoke suite. Fault tests forward accepted requests to the real API before dropping responses and use direct synthetic DB counts to verify duplicate protection; separate tests exercise real PIN/JWT and configured user throttles. Local traces/results are kept under ignored node_modules cache; they are not release artifacts or real-user exports.

### Backend integration checkpoint

Backend task commits `b4ac308` and `637b683` were reviewed and cherry-picked as `73b41f0` and `6e135e9`. Integrated Ruff and all 249 backend tests passed on PostgreSQL 16.15 / Redis 7; 104 added cases cover recovery contracts/transactions/data preservation. The two misleading legacy replay tests now describe their actual limitations without changing assertions. No migrations or dependencies were added.

Foundation checks also passed using Node 20.20.2 / npm 10.8.2 in a local Docker runtime (lint, types, 25 tests, build), superseding the earlier Node-20-outstanding checkpoint. GitHub CI remains unverified; local Docker is test tooling, not added deployment infrastructure.

### Frontend integration checkpoint

UI task `7f71de3` was cherry-picked as `ade2f8c`; review fixes culminate in `6d32de6`. Integrated Node-20 checks and 73 Vitest tests passed (48 added against the foundation). Shared recovery uses a small pure module, the existing Zustand store and a focused hook; gameplay pages shed duplicated save logic. No dependency, database model or new infrastructure service was introduced. UI and server agree that latest accepted receipt may have an identity below maximum and newly finalized reports may contain unanswered questions.

### Integrated verification — 6d32de6a94c2afb92c5bc7a4c72dffe73737d2b1

- Backend: full Ruff passed; all 251 pytest cases passed on Python 3.12.14, PostgreSQL 16.15 and Redis 7 with explicit test settings and isolated Redis DB 7. The run was at 2b5d06c; the backend tree is byte-for-byte unchanged in the reviewed final commit. This includes 106 added cases, five real PostgreSQL lock-order/race tests, and two regressions that route unpinned reads to an unavailable replica alias. The actual lock, replay/manifest/scoring and recovery reads use primary; no live replica was inspected or provisioned.
- Frontend: ESLint, TypeScript, 73 Vitest tests across six files, and Vite build passed under Node 20.20.2 / npm 10.8.2 on the reviewed final commit. Foundation clean installation already passed; dependency manifests/resolutions remain unchanged by the feature, apart from the integration script.
- Built SPA / real API: all four Chromium integration cases passed after rebuilding against the isolated API: committed response lost then reload/finalize; uncertain classwork save then same-session resume; actual PIN hashing/JWT/user throttling; expired refresh authentication then same-learner recovery of a finish queue. Each persistence case verifies synthetic database counts/results/XP. No service worker was registered. Runner used Node 24.19.0 / npm 11.9.0 and trusted local Chromium 151; the separate CI-version frontend checks used Node 20.
- Schema: YAML parsed, all 33 local references resolved, and the three recovery routes checked. This is a targeted consistency check, not full OpenAPI validation. Backend/frontend contract regressions validate receipts and unsafe older-response handling.
- Guards: non-loopback API origin rejected before network activity; inherited replica URL rejected before fixture queries. Existing CI workflow unchanged. Existing factory/Ruff deprecation notices, Router future-flag notices and missing icon warning were not hidden with disabled checks.
- GitHub CI, production hostname/source attribution, AWS configuration, release capacity, and the older mock-only smoke suite are not verified by these local checks. No tournament concurrency or load-readiness claim follows from this feature.

### Review findings and fixes

The independent reviewer reproduced failures rather than accepting green unit counts. Findings were corrected in these integrated commits:

| Finding | Fix / evidence |
|---|---|
| Active practice with all server questions terminal and absent/corrupt/denied storage could not finish | `142fecc`: normal finalize path, with three actual-page regressions |
| A different payload at the same identity had no actionable conflict recovery | `4a4822a`: validate/display own server receipt, retain the local payload until explicit server-answer choice; preserve neighbors/manifest |
| Unavailable storage allowed another session to silently replace the sole pending buffer | `a49f928`: retain it, offer return/discard, discover classwork memory state, invalidate stale callbacks; one store remains |
| Submitted-session resume had no result retrieval action | `a49f928`: shared confirmed-result retrieval, retained manifest, single automatic attempt and explicit retry after failure |
| Later queued identities after a conflict could repeatedly hit definitive terminal rejection | `a49f928`: explicit exclusion only for validated failed-snapshot item-level attempt-limit errors; uncertain closed-session work remains retained |
| Optional replica routing could violate primary consistency under the session lock | `2b5d06c`: pin authoritative reads/writes and best-record reads to primary, with stale-router regressions |
| Browser fault test intercepted the obsolete single endpoint; dev toolbar caused periodic five-second DNS waits | `cf8f36e`: intercept the actual bulk endpoint; isolated base-settings runner avoids toolbar overhead; direct DNS timing reproduced the local delay |
| Session request timeout did not bound a subsequent authentication refresh | `a49f928`: ten-second refresh request timeout and real interceptor regression preserving pending work |
| Rejected-item storage could include unknown/private API error fields | `6d32de6`: reconstruct only the validated question/attempt identity, with identity/index-fallback storage regressions |

Independent review accepted the exact final code SHA above with no remaining blocking findings. Four external QA cases passed: active result resume, submitted result resume, memory-only queue preservation, and conflict adoption followed by terminal exclusion with private-field nonpersistence. Focused reviewer runs passed 16 frontend cases (32 intentionally unselected) and 16 backend cases; these supplement the full coordinator runs, not replace them. The final handoff changes only documentation.

These fixes add no tables, migrations, runtime dependencies or services. Teacher/profile screens changed only where sign-out/account removal needed pending-work isolation; this is not the teacher-dashboard feature. The pre-existing authentication refresh callback lacks a separate account-generation guard; broader authentication race hardening remains a separate concern, not a tested guarantee of this slice.

### Developer handoff and PR-ready description

Title: **Recover learning answers safely and score each question once**

Interrupted saves could lose acknowledgment, create repeat writes or credit one question more than once. This branch adds explicit v2 immutable attempt identities, atomic bulk receipts and finish manifests, then connects the existing practice/classwork pages to bounded same-tab recovery. Practice feedback/retry interactions remain; classwork waits for acceptance; results require confirmed persistence. Newly finalized results count each frozen question once, while existing finalized history is left untouched.

Review order: `feat-Sagar@c81416d` baseline, then `chore/agent-workflow@b03d167`, then `feat/answer-recovery`. All integration PRs target main and remain drafts while prerequisites are unmerged. Do not push new work to feat-Sagar or merge/deploy from this agent task.

- [Published foundation](https://github.com/aranya-squad/Bolt-V1/tree/chore/agent-workflow)
- [Feature branch](https://github.com/aranya-squad/Bolt-V1/tree/feat/answer-recovery)
- [Feature-only comparison](https://github.com/aranya-squad/Bolt-V1/compare/b03d167...feat/answer-recovery)
- [Complete comparison against main](https://github.com/aranya-squad/Bolt-V1/compare/main...feat/answer-recovery) — includes baseline/foundation prerequisites

Vet locally using the commands/setup above, then check normal wrong/correct practice retries, classwork retry/test mode, reload while offline, failed finish/retry, sign-out confirmation/account switching, denied browser storage return/discard, and timed/flash resume without a fresh duration or invented unseen skips. Unit/page tests cover these additional edges; the four listed browser scenarios are the executed real-API subset.

No new migration/backfill is required. Backend must become compatible before the upgraded frontend is released; absent-version callers remain supported but their transport retries are not made replay-safe. Upgraded UI pauses on an incompatible API rather than falsely acknowledging answers. Legacy nullable identities require a separately approved historical-data decision. New scoring stores a version marker in existing session JSON; rollback must preserve interpretation of those new records and must not rewrite historical results or discard pending queues.

Recovery uses sessionStorage, so closing the tab/browser or moving devices is outside its durability promise. Storage-denied recovery survives only in this running tab; explicit discard/logout intentionally removes it. Competition timing/fairness, cross-device/multi-tab coordination, production load testing and AWS optimization remain separate approved work. Live frontend ownership still needs human confirmation before release.

GitHub draft-PR API creation was blocked by Forbidden; no PR number or GitHub CI success is claimed. Native Git publication and this PR-ready description provide the handoff. Human developers own review, prerequisite integration, CI verification and eventual production deployment.
