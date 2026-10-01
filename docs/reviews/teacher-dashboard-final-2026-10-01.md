# F1 final three-role implementation acceptance

Reviewed source: `865248002b95599715261be077620256e8101e8a`. All three decisions apply to exact F1 scope1.2; planning approvals preceded coding. Human merge/release remains separate.

---

# Product Manager final review — F1 teacher dashboard

Decision: **APPROVED — F1 product acceptance at the named source commit.**

Reviewer: Product Manager agent `/root/product_manager`.
Reviewed commit: `865248002b95599715261be077620256e8101e8a`.
Reviewed worktree: `/workspace/scratch/3adb80fae809/teacher-dashboard`.
Approved scope: `docs/scopes/teacher-workflows-v1.2.md`, version 1.2.
Scope SHA-256 independently verified: `19697b1a3061d588b8b0ed2ebd78b3c9d375830e68469ef5951f183974d51ff8`.

## Product outcome

The implementation satisfies the signed F1 needs using the existing Instructor Command, BatchDetail roster and TeacherLevelDashboard screens. Active enrollment is consistently used for batch counts and report numerators/denominators; current level and arithmetic accuracy semantics remain unchanged; report cells match lesson identity; teacher data is account-scoped with hydration/cancellation/late-settlement protection; each screen exposes truthful Refresh and retry behavior. No new product blocker or scope revision was identified.

| Criterion | Product acceptance evidence |
|---|---|
| F1-AC01 | `ClassListCreateView.get`, `RosterView.get`, `TeacherLevelDashboardView.get` use active membership and owner filtering. `test_membership_agrees_without_assignment_join_multiplication` covers multi-level classes, overlap, inactive history, archived/unassigned/foreign classes and unchanged User.is_active policy. |
| F1-AC02 | `RosterStudentSerializer` uses separate grouped completion/accuracy inputs; preserves default/cap/count and one-decimal unweighted mean. Backend fixtures cover no profile/history, gap/cap, unequal session sizes and unrelated XP rows; real finalization/retake regression preserves unique counts. Empty class/lesson rows are retained. |
| F1-AC03 | Report input queries explicitly use primary. Separate stale database alias test records zero replica reads after committed real finalization. Existing teacher permissions, owner 404, wire shapes and archived roster policy are retained. |
| F1-AC04 | `TeacherLevelDashboardPage` obtains the stat by lesson_id; frontend fixtures reorder/miss/include unrelated IDs and assert cells receive correct values/zero. |
| F1-AC05 | `teacherIdentity.ts` captures issuing identity/epoch, gates hydration/token/TEACHER role, propagates cancellation and contains late queries/mutation callbacks/promises. Hook tests cover delayed A success/failure after B login and immediate queued switches; real browser verifies same-SPA A→logout→B and foreign API denial. |
| F1-AC06–07 | Read the measurement report and extracted candidate JSON: all 24 fixtures/144 requests use data SELECT counts list=1, roster=4, matrix=4 across 5/10/50/150 students and 1/5/20 classes, cold/warm, short/long histories. Auth/savepoint overhead and single-sample timing/EXPLAIN limitations are separately recorded. No live-capacity or statistical speedup claim is needed for acceptance. |
| F1-AC08 | All existing screens retain content during refresh, show stale-data error on failure and permit retry. Missing/initial error differs from empty. Teacher query defaults always refetch on mount, use two-minute stale time, focus refetch only when stale and no polling. Relevant owner invalidations remain issuing-account scoped. |

## Executed evidence inspected

- Extracted backend JUnit `teacher-f1-pytest.xml` reports 273 tests, zero errors/failures/skips; candidate measurement artifact identifies `e7b81dc4dc258f5efa62d256952a38a901729b97`. Runtime changes between that tested application checkpoint and the named final F1 commit are test/documentation only.
- Independently queried GitHub Actions run `36862766356`: teacher-browser and reporting-measurement jobs both completed successfully. Browser logs explicitly check out `865248002b95599715261be077620256e8101e8a` and record two F1 Chromium tests passed. The one skipped test is explicitly the future F2 scenario, not omitted F1 coverage.
- Real built-SPA/API browser code uses ordinary PBKDF2 authentication and verifies no active service worker. A synthetic student solves/finalizes through the real learning/persistence path; teacher Refresh displays 1/1 classwork and 100% accuracy while inactive history remains excluded. The test respects the existing minimum-answer interval and inspects accepted receipts/durable result counts.
- Coordinator-reported frontend evidence: 94 tests plus Node 20 lint/type-check/build. PM inspected the observable test assertions and source; PM did not separately rerun those checks or claim a manual visual/browser run.

## Scope boundaries and remaining handoff correction

F1 changed no progress writer, courses/auth policy, global replica router, assignment workflow, migrations, infrastructure or live data. Historical auth/answer recovery was reused. Deferred wants, tournament rules and separate prerelease reliability repairs remain excluded. F2 implementation remains governed by its own signed requirements and stacked branch.

The current tracker/measurement prose at the reviewed commit still says browser rerun pending and its tracker metadata/current next action describe an earlier checkpoint. Before marking F1 READY FOR HUMAN REVIEW, the coordinator must update those records with the successful run, reviewed F1 SHA and current next action. This is a documentation correction, not an unfulfilled product behavior or a request for new scope approval.

This approval certifies the bounded product needs against inspected source and executed evidence. It does not authorize merge/deploy, certify production topology/revision, establish streaming-replica behavior, prove tournament fairness, promise atomic snapshots across independent requests or establish production latency/capacity. Human dependency integration, ordinary combined PR CI and release/live-evidence gates remain distinct.


---

# CTO final F1 review — teacher dashboard and roster correctness

Reviewer: `/root/cto_reviewer`.
Named reviewed/verified commit:
`865248002b95599715261be077620256e8101e8a`.
Approved scope v1.2 SHA-256:
`19697b1a3061d588b8b0ed2ebd78b3c9d375830e68469ef5951f183974d51ff8`.

Decision: **APPROVED FOR HUMAN REVIEW — F1 implementation and required bounded
verification are complete**. No unresolved CTO source finding. This approves
the named F1 checkpoint, not a subsequent F2 combined revision, merge or release.

## Source review and resolved findings

The named commit contains the accepted grouped primary reporting reads and
active-membership fixes, preserved metric definitions, teacher identity/session
epoch query keys and late-result containment, explicit truthful Refresh behavior
and lesson_id cell matching. It changes no progress writer, finalized history,
recovery contract, global auth/router policy, enrollment eligibility or tournament
rule. Backend direct model queries avoid related-manager router initialization
before primary selection; assignment remains unchanged in F1.

Earlier CTO findings are resolved in the reviewed source: mutateAsync rechecks
identity after the whole awaited mutation lifecycle, lesson ID schema retains
integer-PK string representation, blank link clearing is documented, and mocks
exclude newly created unassigned batches from level reporting. Request listeners
are disposed; issuing-account callbacks and invalidations remain guarded.

Reviewer independently executed 21 focused Node20.19.5/Vitest1.6.1 query/page
tests on the corrective writer source and verified source equality with this
named integrated checkpoint. Root records Node20 lint/type-check, **94 Vitest**
tests and build passing. Normal hosted CI also completed successfully.

## Independently inspected hosted evidence

- Named commit's normal CI:
  https://github.com/aranya-squad/Bolt-V1/actions/runs/36862766238 — SUCCESS.
- Dedicated native verification:
  https://github.com/aranya-squad/Bolt-V1/actions/runs/36862766356 — both
  reporting-measurement and teacher-browser jobs SUCCESS. Checkout logs identify
  exact head865248, native PostgreSQL16.15/Redis7.4.11 containers and real isolated
  built-SPA/API execution. No OS-identity shim was used.
- Backend JUnit artifact11162641406 was independently downloaded and parsed:
  **273 tests, zero errors/failures/skips**. It includes the genuinely separate
  available stale database alias routing case and committed real finalization/
  retake assertions. Archive SHA-256:
  `602fd13ece55f19c9ed6b5ba0c761c3f2ef9bb63b244bf7198ceda4e4e7ba810`.
- Browser job logs: **2 F1 cases passed**; **1 F2-only assignment case intentionally
  skipped**. Real authentication, finalization followed by reporting Refresh,
  inactive exclusion and same-SPA cross-teacher isolation are exercised.
- Reporting artifact11162666520 was independently downloaded, digest-checked and
  parsed: exact application_commit865248, **24 scenarios / 144 requests**, all
  list/roster/matrix data-query counts **1/4/4**. Reviewer checked list active
  counts, roster row totals and every matrix active denominator against fixture
  sizes across all scenarios. Archive SHA-256:
  `fc15b3d154899b48370e7d215b21fa7dad19f292a6411c9175f787a17034f191`.
  EXPLAIN/timing evidence and unchanged-runtime baseline are recorded in
  `docs/verification/teacher-reporting-2026-10-01.md`.

These executed results satisfy the signed F1 acceptance criteria within the
stated fixture/role/read-side boundaries. Missing F2 behavior is intentionally
excluded from this approval and retains its own stacked branch/tests/review.

## Limits and remaining human gates

Reporting uses normal read-committed primary queries and fixed committed-state
agreement, not one common snapshot during concurrent enrollment. Stale-alias
tests simulate lag through divergent database contents; they are not streaming
replication or production topology evidence. Query counts are bounded for the
measured fixtures; timings have one observation per condition and do not prove
statistical speedup, concurrent load capacity, AWS savings or production behavior.

Human integration remains necessary in documented prerequisite order, then F1,
then separately reviewed F2. Verify CI at the actual integrated human commit and
production source/revision/topology/log/health/backup evidence before release.
No main/frozen-baseline merge, deployment or live mutation is approved by this
review. The feature tracker/global brief/log should now reflect this verified
F1 checkpoint and the separate F2 continuation.


---

# Head QA final acceptance — F1 teacher dashboard and roster correctness

**Decision: APPROVED FOR HUMAN REVIEW.**

Reviewed application/source checkpoint: **`865248002b95599715261be077620256e8101e8a`** on `feat/teacher-dashboard`. Reviewer: independent Head QA agent `/root/head_qa`, 01 October 2026. Approval applies to F1 only in scope v1.2, `docs/scopes/teacher-workflows-v1.2.md`, whose SHA-256 was independently rechecked as `19697b1a3061d588b8b0ed2ebd78b3c9d375830e68469ef5951f183974d51ff8`.

This is implementation acceptance supported by inspected source and executed evidence, distinct from the earlier planning signoff. No blocking F1 finding remains. Documentation-only publication checkpoints may retain this source approval; subsequent runtime changes require affected checks and renewed review.

## Executed evidence independently inspected

- Named-head [Teacher verification run 36862766356](https://github.com/aranya-squad/Bolt-V1/actions/runs/36862766356): both `reporting-measurement` and `teacher-browser` jobs completed successfully. Job logs independently confirm checkout of the exact reviewed SHA, not an inferred branch head.
- Backend job `110370765964`: downloaded artifact `11162641406` and parsed its JUnit XML. **273 tests, zero failures, errors or skips.** The genuinely available, separately provisioned stale-database reporting test is present and passed. Archive SHA-256: `602fd13ece55f19c9ed6b5ba0c761c3f2ef9bb63b244bf7198ceda4e4e7ba810`; XML SHA-256: `6e3a2f4fa8036f1a0fe9004bdd117d35c0a4a479b3321b3dd663fc6ec29d586c`.
- Downloaded measurement artifact `11162666520`, verified its `application_commit` equals the reviewed SHA, and independently checked all **24 scenarios / 144 requests**. List/roster/matrix use **1/4/4 data SELECTs**, respectively, with one separately counted JWT authentication SELECT and two savepoint queries. All response sizes, active list counts, matrix denominators and CLASSWORK/HOMEWORK completion counts match fixture expectations. PostgreSQL **16.15**, Redis **7.4.11**. Archive SHA-256: `fc15b3d154899b48370e7d215b21fa7dad19f292a6411c9175f787a17034f191`; JSON SHA-256: `df6ea8a5517213a70de7c21b99757a127cc8fac06759ebdb9099f55576d9a692`.
- Browser job `110370765943`: inspected logs showing **two F1 Chromium cases passed** against the built SPA and real isolated API. The first uses genuine PBKDF2-authenticated users, real classwork start/accepted receipts/finalization, persistence inspection, primary reporting Refresh and inactive-history exclusion. The second retains the same SPA/QueryClient through router logout and teacher B login, shows only B's classes, and confirms real foreign roster/PATCH denial. The F2 assignment case is intentionally skipped at this F1 checkpoint; it is not counted as F1 evidence.
- [Normal CI run 36862766238](https://github.com/aranya-squad/Bolt-V1/actions/runs/36862766238) is successful. Independently inspected backend Ruff/pytest, frontend lint/type-check/Vitest, build and advisory-context step results. Frontend logs show **94 tests passed** under Node 20. Normal PR CI uses GitHub's generated PR merge ref `b2dd2458d48beb4dc62f35c6135147f87d74e466`; the specialized backend/browser/measurement evidence above checks out the exact application head. The generated test ref is not a human merge or release.

## Acceptance mapping

| Signed criterion | Accepted evidence |
|---|---|
| F1-AC01 active membership/count agreement | Endpoint regressions cover inactive enrollment with history, overlapping students, multiple assignments, foreign/unassigned/archived classes and unchanged inactive-user policy. Named measurement values independently agree with active membership. |
| F1-AC02 preserved metrics and edge cases | Actual database tests cover missing profile/history, null accuracy, empty roster/lessons, arithmetic mean with unequal session sizes, unrelated XP/completion rows, gap/cap level rules and repeated finalization/retakes. |
| F1-AC03 ownership/contracts/primary refresh | Actual authenticated role/ownership tests, explicit primary-pinning checks and divergent available stale-database regression passed; real browser finalization and Refresh demonstrate committed durable changes. |
| F1-AC04 lesson identity | Component tests reorder/miss/add lesson-stat IDs; values attach by lesson_id. Corrected schema describes integer-backed lesson ID strings. |
| F1-AC05 identity and late settlements | Hook tests use a shared QueryClient and cover hydration/no-token/logout/non-teacher gates, delayed A queries/mutations, queued requests, successful issuing-owner invalidation, and mutateAsync settlement during a switch. Real browser account switch retains the SPA. |
| F1-AC06 measured costs | Executed pre-edit corrected baseline and named candidate cover 5/10/50/150 active students, 1/5/20 classes, short/long histories, overlap/inactive fixtures, cold/warm Redis conditions, counts, timings, rows and representative analyzed query plans. |
| F1-AC07 bounded queries | Every named-head measurement meets F1 list ≤1, roster ≤4, matrix ≤5; actual counts are 1/4/4. Database query-budget regressions passed across fixture sizes. |
| F1-AC08 refresh and truthful states | Existing screen tests cover initial failure, retry, preserved content during failed background Refresh, distinct empty/null/loading states and remount fetch within the stale window. Relevant mutations invalidate issuing-owner batch/matrix keys. |
| BOTH-AC01, F1 portion | Backend suite, lint/types/Vitest/build, schema/mocks and two real built-SPA/API browser cases passed. Assignment implementation/evidence remains F2's separate gate. |

## Resolved review findings

The implemented source fixes active membership and query amplification without a new progress writer. The previously reported schema UUID error for lesson IDs and full-reload account-switch test gap are corrected. The browser test now respects the existing 200 ms answer interval and validates actual accepted receipts; no clock, scoring or runtime guard was weakened. Teacher mutation promises as well as callbacks are contained when identity changes during awaited invalidation.

## Limits and remaining human gates

This approval establishes the signed F1 behavior on the reviewed repository lineage and isolated evidence. It does not establish live production frontend ownership/revision, infrastructure, capacity, latency guarantees, retention, telemetry or deployment correctness. Replica evidence uses a genuinely separate divergent database as a controlled lag simulation, not operational streaming replication. Measurement rosters fully overlap; disjoint/mixed-roster latency is not measured. Cold cache means Redis application cache only; PostgreSQL buffers are not reset. Timings are one observation per fixture/mode and cannot support statistical speedup, AWS sizing or production-capacity claims. The earlier truncated baseline is explicitly rejected; the corrected harness resets query capture and verifies its count against timed executions.

Human review/integration of the documented prerequisite branches remains necessary before main/release. F2 remains a separately stacked feature with its own implementation acceptance and executed concurrency/browser/contract gates. Tournament rules, broad auth transport issues, consent/retention, deletion, image/health and live-evidence reliability work remain outside F1.

The coordinator should update the F1 tracker, measurement report, brief and milestone log with this completed acceptance and exact evidence, then publish the documentation checkpoint. No agent merge or deployment is authorized by this review.
