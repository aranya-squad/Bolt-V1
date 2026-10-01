---
status: READY FOR HUMAN REVIEW
branch: feat/daily-quests
owner: Bolt V1 / human reviewer
last_checkpoint: 2026-10-01
base_commit: c75c1f7b4e67bb71c668c4370a59918aef045ab5
reviewed_code_commit: b5658520623c45b427927bd26a2e21ea7cd6f7d2
---
# Daily Quests — Today’s Bolt Mission

**READY FOR HUMAN REVIEW.** Implementation, local checks, independent reviews and application publication complete. No merge, deployment or production mutation.

Scope v1.0 SHA-256: `2f879b568f5b83e00ead86a85181cdd61e2630025dfc696f95a9049dc7a271bb`.

## Product and frozen rules

Students get one five-question untimed effort mission on the Hub. One tap starts the existing practice flow; accepted answers show saved progress. Mistakes count as effort. Celebration requires all five persisted non-skip answers plus successful atomic finalization. Only ordinary correct-answer XP and the existing perfect bonus apply; zero correct answers truthfully awards zero XP. Missions do not unlock lessons or levels.

The highest unlocked level and earliest supported unlocked lesson use existing primary completion records and approved CLASSWORK template configuration. Supported arithmetic settings are frozen on assignment; unavailable or malformed content produces an honest unavailable state. Existing CuratedGenerator delegates to ProceduralGenerator; this change does not wire imported question-bank content or invent curriculum.

The first successfully assigned mission pins a valid profile timezone, falling back to UTC. Server local midnight controls daily reset, including 23/25-hour DST dates. Later timezone changes do not grant another mission. Missing a day causes no XP loss, erased history or backfill. Started older missions remain resumable; the Hub exposes the latest earlier unfinished mission.

A mission binds one existing ZEN/test-mode session, five questions, no timer/skip/retry/curriculum rewards. Duplicate starts return the same session. Finalization validates five distinct persisted answers and records result, existing XP event and mission completion atomically. Lost responses, reloads and pending-answer recovery use existing durable session handling. Unfinished mission sessions are excluded from stale automatic abandonment.

NEEDS are implemented. WANTS (themes, adaptive choice, history screens, reminders, reports and bonus rewards) remain deferred. Hero cosmetics and curriculum changes are excluded. Details and AC-01–AC-10 are in the frozen scope; task ownership and votes are in the plan.

## Independent decisions

Before runtime coding, distinct senior PM `/root/pm`, CTO `/root/cto` and Head QA `/root/head_qa` approved the same digest above. Required Security, Data Integrity and Frontend/UX specialists also approved it. G1 and G2 executed PASS before workers. The digest has not changed.

Independent implementation review identified a real deferred-FK PostgreSQL deadlock, hard-deletion collector incompatibility, clipped long operands, a 44px fallback gap and report containment/keyboard scrolling defects. Bounded repairs and regressions preserve the approved behavior. The self-service delete endpoint anonymizes/deactivates; it was not broken by the hard-delete finding.

Final CTO/UX/QA/Security/Data exact-commit decisions and timing records are in `daily-quests.plan.json`. Initial blocked votes and failed checks remain recorded. CTO, Head QA, Security, Data Integrity and UX all PASS exact published application commit `b5658520623c45b427927bd26a2e21ea7cd6f7d2`, independently verifying tree equality with locally tested `79d4ff4`. All ten acceptance criteria PASS. The branch also carries a documentation-only handoff closure after this application checkpoint; its exact head is given in the final response/branch ref.

## Validation and acceptance

| Area | Evidence |
|---|---|
| Eligibility/config/calendar | Mission backend cases: malformed/unavailable content, primary selection, sparse/final levels, snapshots, invalid timezone, DST23/25, midnight and late resume |
| Verification/rewards | Direct, legacy and v2 finalization, incomplete409 before writes, wrong/all-wrong effort, existing XP/perfect scoring, no lesson/level completion |
| Concurrency/lifecycle | Real PostgreSQL separate connections, both forced start/finalize schedules, duplicate assignment/start/finalize, cleanup scan/update race, User cascade and protected standalone session |
| Privacy | Student and owner authorization, no-store success/error mission APIs/session APIs, primary role recheck, identity-scoped frontend caches |
| Mobile/recovery | UI behavior tests and built-SPA real API:320/390,44px, numeric input/Enter/shrunken keyboard viewport, reduced motion, delayed/lost answers, lost start/finalize, reload/resume, confirmed celebration |
| Maximum content | Real generator ADD/SUB4D8rows and MUL4Dx2D at320/390; whole operands retained and canvas contained; normal Arena preserved |
| Completion report | Document overflow assertion and ArrowRight movement on actual labelled scroll region; existing ordinary recovery suite retained |

Backend full suite: **295 passed** (44 mission cases); Ruff PASS. Migration clean apply, unique constraints, deferred FKs, empty-database reverse/reapply and drift PASS. Frontend lint/type/build PASS; **94 Vitest tests passed**. Built-SPA real API: **10 browser cases passed**, including 6 mission and 4 existing recovery cases. OpenAPI YAML/contracts PASS. G1/G2/G5 executed PASS; G4 independently signed PASS.

Useful verification commands: backend `ruff check .` / `pytest`; `manage.py makemigrations --check --dry-run`; frontend `npm run lint`, `npm run type-check`, `npm test`, `npm run build`; isolated seeded real API `npm run e2e:recovery`; gates `python scripts/check_feature_gate.py --scope docs/features/daily-quests.scope.md --plan docs/features/daily-quests.plan.json --gate G5`.

The existing context freshness checker is advisory and still fails: inherited `ai-sdlc-v1.md` lacks Next Exact Action; its blanket `*.md` scan also treats the new immutable scope artifact as a mutable tracker. Checker/checks were not weakened or unrelated workflow artifacts rewritten. Daily Quests tracker has required metadata; G1/G2/G5 are the feature's explicit gates.

## Runtime and evidence limits

Tests used Python3.12.14, stock PostgreSQL16.15, Redis7.0.15, Node24.19.0 (CI uses20) and Chromium153.0.8010.0. Real API browser tests keep actual password hashing, authentication expiry and throttles, and disable mocks/service workers.

This environment maps only root UID. A scratch identity-only LD_PRELOAD shim let stock PostgreSQL run; Head QA reviewed its getuid/geteuid/getpwuid/stat scope and hashes. No query/storage/transaction functions were interposed. Tests prove application behavior under actual PostgreSQL semantics, not production identity/security deployment. Each invocation has a separate network namespace; services/tests therefore run together against fresh synthetic loopback databases. Chromium used no-zygote/in-process SwiftShader with normal multiprocess operation and standard CORS/browser security. Failed CDN/browser setup attempts and initial single-process crashes are preserved in timings.

Hosted CI and live release verification: **UNKNOWN / not executed**. No dependencies, production infrastructure or CI configuration changed.

## Timings

All timestamps are UTC wall clock. Phases overlap; their durations must not be summed. Request/start **2026-10-01T13:02:34Z**. Exact review, worker, check, failure, repair and publication intervals are in the plan. Initial environment start is explicitly approximate; missing command-level timestamps are not invented. Documentation-only closure and final gate/ref verification follow the application push; their exact times are reported with the final branch head.

| Step | UTC interval | Elapsed |
|---|---|---:|
| G0 source/intake |13:02:34–13:07:11|277s|
| PM scope draft |13:05:29–13:07:11|102s|
| G1 scope challenge/signoff |13:05:29–13:08:02|153s|
| G2 decomposition/gate |13:08:02–13:09:03.974308|61.974s|
| Initial implementation/integration |13:09:16–13:20:53|697s|
| Backend worker |13:10:00–13:17:01|421s|
| Frontend worker |13:09:55–13:20:53|658s|
| Environment preparation |~13:04:00–13:13:39|~579s|
| Backend blocker repair |13:25:08–13:27:56|168s|
| Mobile operand repair |13:25:24–13:26:28|64s|
| Fallback touch target |13:27:40–13:28:00|20s|
| Report containment repair |13:30:43–13:31:55|72s|
| G4 QA/integration including waits |13:17:38–13:41:55|1457s|
| Application push |13:42:40.791–13:42:41.724|0.933s|
| Elapsed to application push |13:02:34–13:42:41.724|2407.724s (40m7.7s)|

Process observations: preprovision PostgreSQL/Redis/browser binaries for this root-mapped environment; use ordinary browser multiprocess mode; test both deferred-FK lock directions from the outset; include supported maximum content and keyboard scroll targets in initial mobile QA; avoid synchronous child-process polling while an async interception must execute. Environment/repair phases account for most avoidable elapsed time; overlapping work makes totals non-additive.

## Changed contracts and rollout/rollback

New additive table/migration `exercises.0005_dailyquest`, unique student/date and one-to-one session. GET `/api/v1/daily-quests/today/`; POST `/api/v1/daily-quests/{mission_id}/start/`; optional `SessionMeta.daily_quest`; existing finalize can return409 `mission_incomplete`. OpenAPI/types/mocks agree. Private mission responses use no-store. No backfill, scheduled reset job, new reward type, feature flag or deployment configuration.

For human release: integrate prerequisites and review CI, apply the additive migration before serving new backend routes, then ship compatible frontend. Assignments are lazy on Hub access. Prefer frontend rollback while retaining the compatible backend/table and mission cleanup guard. Do not reverse migration after mission history exists; full backend rollback needs a deliberate history/cleanup plan because old stale cleanup lacks the mission exclusion. Reverse/reapply evidence covers an empty synthetic database only.

## Dependencies and preserved work

Approved foundation `c75c1f7b4e67bb71c668c4370a59918aef045ab5` includes workflow/context and answer recovery. Compare feature-only `c75c1f7..feat/daily-quests`; full-main comparison also includes prerequisite work. Human integration must preserve latest workflow/context/answer-recovery updates before Daily Quests.

Fresh ref recheck: main `cec94ea187ab3fcf571f73dd4468b1edaf0d290a`, teacher dashboard `00038d7043ffa2db8bd62a45d3d82c1573083683`, batch assignment `cf64abaf64c410ced9e6a0861883bb56e8b33f4a`, answer recovery `88cfff2791c9adc3648a39cf39a21a73c97e1697`, frozen feat-Sagar `bf8bbf9ee7ffec01c9cc9034695fc7023bd22495` remain untouched. Context branch advanced to `26eee36e6502b457c9ed5cd7c4543994374a16c5` during work; no silent rebase or overwrite. Only the authorized feature ref is published.

## Next Exact Action

Human reviews `feat/daily-quests`, the frozen scope/plan, prerequisite branch changes and the additive migration; run hosted PR CI on the chosen integration before deciding merge/release. AI stopped at READY FOR HUMAN REVIEW; do not treat local PASS as deployed/live verification.
