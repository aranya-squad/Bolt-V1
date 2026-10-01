# F2 final three-role implementation acceptance

Reviewed source: `3ee301a6bfe6c401da931da001a613c8a5d1c68d`, stacked on checked F1source8652480. Three distinct agents approved frozen scope1.2 before coding, then independently accepted this final source and executed evidence. These records are implementation acceptance; human integration and release remain separate. No remaining source/product/QA blocker.

---

# Product Manager final review — F2 batch assigned levels

Decision: **APPROVED — final F2 product acceptance. No remaining product blocker within scope.**

Reviewer: Product Manager agent `/root/product_manager`.
Reviewed/published source: `3ee301a6bfe6c401da931da001a613c8a5d1c68d` on `feat/batch-level-assignment`.
Worktree: `/workspace/scratch/3adb80fae809/batch-level-assignment`.
F1 dependency/base: `865248002b95599715261be077620256e8101e8a`.
Approved scope: `docs/scopes/teacher-workflows-v1.2.md`, version 1.2.
Scope SHA-256 independently verified unchanged: `19697b1a3061d588b8b0ed2ebd78b3c9d375830e68469ef5951f183974d51ff8`.

## Product outcome and scope alignment

A teacher can configure reporting levels for an owned batch on the existing BatchDetail screen, save/reload the complete selection and see the batch included or removed from the corresponding existing level reports. The Class.assigned_levels relation remains the sole assignment state. Assignment does not change student access, lesson locks, enrollment, sessions or completed history.

| Acceptance | Inspected implementation and evidence |
|---|---|
| F2-AC01 | `AssignedLevelsEditor` displays catalogue order/name with keyboard-operable labeled checkboxes; permits multiple/noncontiguous selections and intentional empty assignment. Explicit Save sends the whole draft; server canonical IDs become confirmed/draft values only after response. Real browser persists selection across reload. |
| F2-AC02 | ClassSerializer adds canonical IDs to list/create/patch/join outputs. POST stays name-only, rejects any supplied assignment before creation and returns empty IDs on ordinary creation. PATCH omission preserves and [] clears. Rotate response remains code-only. Frontend types, client payload, classroom schema and mocks align. |
| F2-AC03 | AssignmentListField/AssignmentUUIDField require a JSON list of UUID strings; normalized duplicates, unknown/malformed/non-string/null inputs receive field 400 before writes. API tests reload scalar fields/relation after mixed invalid requests. Ownership lookup precedes validation; foreign teacher gets 404 and non-teacher roles retain denial. |
| F2-AC04 | Owner PATCH wraps scalar save and full M2M replacement in an explicit primary transaction with owned Class row lock. Separate PostgreSQL connections demonstrate actual lock waiting and coherent last-serialized name/is_active/complete relation, including ATOMIC_REQUESTS disabled. Failure after relation write rolls back scalar and relation changes. Primary/stale-catalogue tests reject phantom IDs and accept primary-only known IDs. |
| F2-AC05 | Loading/error/missing capability/saved ID absent from catalogue disables Save. Dirty drafts survive batch refresh; Cancel restores latest confirmed selection. Pending Save prevents duplicate submission; field/generic failure retains edits without success. Lost response reconciles through later read without an invented PATCH receipt. Teacher/batch identity changes reset editor and delayed A result cannot modify B. |
| F2-AC06 | Assignment add/remove changes only report inclusion; archived owned edits remain allowed while active report excludes archived. Tests freeze entire progress/completion/attempt/XP/session values and preserve enrollment, catalogue/lesson access and actual start/resume behavior. Built-SPA test proves assignment save/reload/report inclusion/removal without changing stored history. |
| BOTH-AC01 / integrated F1 budgets | Exact source Teacher verification passes 304 backend tests with no errors/failures/skips, 144 measured requests at list=2 / roster=4 / matrix=4, and all three built-SPA/real-API Chromium scenarios. Normal PR CI lint/type/test/build/backend/context jobs also pass; frontend reports 136 tests. |

## Resolved review findings

- Assignment catalogue uses an identity-scoped hook, projects only ID/order/name and follows all valid same-API pagination pages. It does not use per-user unlock/completion flags or impose an artificial 50-level limit; the saved 51st-level fixture is covered. Broad student useLevels/auth behavior is unchanged.
- A catalogue change cannot silently trim an unsaved selection: the complete draft is sent and invalid IDs receive a truthful field error.
- Missing PATCH capability keeps Save unavailable and now truthfully instructs page reload after the server update; initial missing GET capability instructs Refresh. This resolves the misleading recovery copy noted in the earlier review while retaining conservative capability protection and dirty state. No success is claimed for an unsupported response.
- Name-only creation has a generic API failure fallback, with no added assignment controls/wizard.
- Canonical class response IDs, lesson identity wiring and strict classroom mock behavior have explicit regressions. No new product behavior or signed scope revision was introduced to resolve these findings.

## Executed evidence independently inspected

Teacher verification [run 36864981450](https://github.com/aranya-squad/Bolt-V1/actions/runs/36864981450) is successful. Its jobs explicitly check out `3ee301a6bfe6c401da931da001a613c8a5d1c68d`.

- Downloaded backend JUnit artifact **11163460373**: 304 tests, zero errors/failures/skips, Python 3.12/PostgreSQL 16 native test path, with genuine separate stale database alias coverage.
- Downloaded measurement artifact **11163184894**: application_commit is exactly the reviewed SHA; PostgreSQL version 160015, Redis 7.4.11; 24 synthetic fixtures/144 endpoint requests; every recorded cold/warm list/roster/matrix data-query count is 2/4/4. Measurements retain the documented single-sample, application-cache and fully overlapping fixture limitations, not production latency/capacity claims.
- Read exact-source browser logs: all **three** tests pass, with no skipped F2 case. They cover real PBKDF2 login and built SPA without MSW, actual student finalization/teacher Refresh, same-SPA teacher account switch/foreign API denial, and F2 owner Save/reload/report membership/history preservation.
- Normal [CI run 36864981375](https://github.com/aranya-squad/Bolt-V1/actions/runs/36864981375) passes frontend, backend, context and build jobs. Its frontend tests use the GitHub-generated PR merge ref incorporating the reviewed head and report **136 passed**. This is combined PR evidence; it is distinct from Teacher verification's exact-head checkout. PM read jobs/logs and did not represent them as independently rerun local or manual visual checks.

## Exclusions and readiness boundary

Diff review shows no F2 changes to progress writers, student course/access implementation, user auth policy, global router, auth store/transport, infrastructure or migrations. Existing teacher screens/model/endpoints were reused. Deferred wants, ADMIN/enrollment/consent/retention policy, metric redesign, historical auth/answer-recovery recreation, tournament rules and independent prerelease reliability repairs remain outside this feature.

Coordinator should update the owning F2 handoff with this reviewed SHA, executed exact-source results and current Next Exact Action before final READY FOR HUMAN REVIEW status. Product implementation and validation are complete for the signed slice. Human dependency integration/merge, backend-before-editor release sequencing and verified production source/topology/log/health/backup evidence remain separate gates. No merge, deployment or live mutation is approved or performed by this product review.


---

# CTO final F2 review — batch assigned-level management

Reviewer: `/root/cto_reviewer`.
Named integrated source and native verification commit:
`3ee301a6bfe6c401da931da001a613c8a5d1c68d`.
Runtime/API logic remains identical to previously verified e692; the final delta
corrects compatibility guidance and adds two message assertions plus eleven MSW
route regressions. This record names the published integration head, not a helper
branch SHA.
F1 dependency/base: `865248002b95599715261be077620256e8101e8a`.
Approved scope v1.2 SHA-256:
`19697b1a3061d588b8b0ed2ebd78b3c9d375830e68469ef5951f183974d51ff8`.

Decision: **APPROVED FOR HUMAN REVIEW — F2 implementation and required bounded
verification are complete**. No unresolved CTO source or executed acceptance
finding. The earlier compatibility-recovery wording finding is resolved. This
review does not authorize merge, deployment or live mutation.

## Source, contract and lifecycle review

The owner PATCH uses the existing Class.assigned_levels relation. It selects the
owned Class row for update on primary before exposing field validation and holds
an explicit primary transaction across scalar save, complete M2M replacement
and response serialization. Unknown IDs, malformed/non-string values, explicit
null/non-array values and duplicate normalized UUIDs reject the entire request.
Omission preserves, [] clears, archived owner editing remains valid, and the last
serialized committed replacement is one coherent scalar/set state. No new
migration, learning restriction, policy service, progress write or global router
change was added. Existing name-only POST rejects supplied assignment input
before writing; class-shaped responses read canonical persisted IDs in Level.order
order. Batched list prefetch remains separate from the active Enrollment count,
avoiding multiplication by assigned levels.

The existing BatchDetail screen owns the editor; its batch/account key resets
draft state, and changed teacher hooks retain F1 issuing-identity, epoch,
cancellation and late-settlement guards. Save submits the complete draft without
silently trimming unsaved deleted options. Dirty selections survive background
reads; Cancel uses the latest confirmed set. Catalogue/batch errors, absent
backend capability and saved IDs missing from the catalogue prevent saving.
Failure preserves edits; only a valid persisted response confirms success. Lost
responses can reconcile through a read without inventing a successful receipt.

The narrow catalogue hook loads every page before publishing its projected
ID/order/name list. It ignores user-specific unlock/completion flags. All pages
use one cancellation signal; origin and exact configured endpoint path,
credentials/fragments and repeated-page checks run before a following request.
The 51st-level regression proves that existing pagination does not produce a
false missing-saved-level error. TeacherDashboard uses the same scoped catalogue.

TypeScript, additive classroom OpenAPI schemas and mock contracts were reviewed
together. Synthetic level fixture UUID normalization preserves order/labels/flags
and remaps lesson lookup keys coherently. These mocks demonstrate contract and
component behavior; real permission, persistence and concurrency claims come
from the PostgreSQL/API tests. Student learning source, shared auth transport and
durable answer/recovery services remain unchanged.

## Independent reviewer execution and hosted evidence

- Reviewer executed Node20.19.5/Vitest1.6.1 focused assignment-editor and teacher
  catalogue and MSW route suites on exact 3ee source: **42/42 tests passed**. Changed classroom
  views/serializers/assignment tests pass Ruff, and feature diff --check passes.
  Reviewer independently verified that the signed scope digest is unchanged.
- Normal PR CI associated with the named head:
  https://github.com/aranya-squad/Bolt-V1/actions/runs/36864981375 — SUCCESS.
  Its checkout is generated PR merge 29b6978, rather than exact branch head.
  Frontend job logs independently confirm **136 Vitest tests passing**;
  lint, type checking, backend and build jobs all succeeded. Coordinator also
  records local Node20 full lint/type/test/build passing.
- Native Teacher verification:
  https://github.com/aranya-squad/Bolt-V1/actions/runs/36864981450 — both jobs
  SUCCESS at exact checkout 3ee. Service containers are genuine PostgreSQL 16
  and Redis 7; no OS-identity shim or production endpoint was used.
- Backend JUnit artifact 11163460373 was independently downloaded, digest-checked
  and parsed: **304 tests, zero failures/errors/skips**. Executed cases include
  actual separate-connection row-lock serialization with ATOMIC_REQUESTS disabled,
  forced scalar/M2M rollback, genuinely available divergent reporting and catalogue
  aliases, and exact persisted history plus direct student lesson start/resume
  preservation. Archive SHA-256:
  `2a57efbd53e1ea441a6a689507215c5ea4a588bf14e8fc6e0445ded7b650135f`.
- Reporting artifact 11163184894 names exact application_commit 3ee,
  PostgreSQL 160015 and Redis 7.4.11. Reviewer checked **24 scenarios / 144 requests**:
  every observed list/roster/matrix data-query count is **2/4/4**. Every active
  count, roster level/accuracy distribution and per-lesson CLASSWORK/HOMEWORK
  completion value agrees with its short/long fixture. Archive SHA-256:
  `3a4ce0d7439e0b8d0daea0fc9a15b3b80e31c608a5f29247d73cc72e57b56c3e`.
- Browser job 110378144962 checkout/logs independently identify exact 3ee and
  show **3 cases passed, no skipped case** (24.6s):
  real student finalization/teacher Refresh, same-SPA cross-teacher isolation with
  real foreign denial, and F2 owner Save/reload/report inclusion/removal/history
  preservation. Built SPA disables MSW; seeded real PBKDF2 authentication is used.

## Resolved review finding and practical limits

The compatibility-recovery wording finding is resolved in this exact head. A
200 PATCH response missing assigned_level_ids safely latches editor incompatibility
and now says "Reload this page after the server is updated"; the initial missing
GET field says "Refresh after the server is updated", matching its ability to
recover after a new batch read. Both message branches have assertions, and no
missing-field response can claim saved. Latched PATCH incompatibility intentionally
requires remount; backend-before-editor rollout remains an integration dependency.

Catalogue pages and report queries do not promise one shared transaction during
concurrent catalogue/enrollment changes. A deletion can produce a refresh/error
or whole-write rollback rather than an acknowledged partial set. Stale alias tests
simulate lag through divergent database contents, not streaming replication.
The measured cold/warm conditions concern isolated Redis application caches;
PostgreSQL buffers were not reset. One timing observation per condition and
controlled overlapping synthetic fixtures do not establish load capacity,
statistical speedup, AWS savings or production performance. F2 additive prefetch
raises the signed list data-query bound from F1's one to two; no budget is hidden.

## Remaining human integration and release gates

Integrate the documented foundational prerequisite branches, then verified F1,
then this separate F2 branch; recheck remote heads and CI at the actual integrated
human commit. Deploy the backend assignment contract before the assignment UI.
Rollback needs no database rollback and must not clear the existing relation.
Production source/revision, health/topology/logs/backups and realistic workload
evidence remain human release gates. No main/frozen-baseline merge, release or
live infrastructure operation occurred in this review. Owning tracker/global
brief/log should record the named verified checkpoint and exact remaining gates.


---

# Head QA final acceptance — F2 batch assigned-level management

**Decision: APPROVED FOR HUMAN REVIEW.**

Reviewed source checkpoint: **`3ee301a6bfe6c401da931da001a613c8a5d1c68d`** on `feat/batch-level-assignment`, stacked on F1. Reviewer: independent Head QA agent `/root/head_qa`, 01 October 2026. Scope v1.2, `docs/scopes/teacher-workflows-v1.2.md`, SHA-256 independently rechecked as `19697b1a3061d588b8b0ed2ebd78b3c9d375830e68469ef5951f183974d51ff8`. This final amended checkpoint has an independently verified empty tree diff from the corrected `7cbdb43200b3cb3d7dd6098c1e196984b39bf535` reviewed source.

This is completed implementation acceptance supported by inspected source and executed evidence, distinct from the earlier PM/CTO/QA planning signoffs. No blocking F2 finding remains. Documentation-only publication checkpoints may retain this source approval; later runtime changes require affected checks and renewed review.

## Independently inspected final executed evidence

At the exact reviewed **`3ee301a6bfe6c401da931da001a613c8a5d1c68d`**, [Teacher verification run 36864981450](https://github.com/aranya-squad/Bolt-V1/actions/runs/36864981450) completed with both jobs successful. Both job logs independently confirm exact checkout of this SHA. The earlier successful e692 checkpoint was also independently inspected, but final acceptance relies on the new run executing the corrected source and strengthened tests.

- Backend job `110378144616`: downloaded artifact `11163460373` and parsed JUnit. **304 tests, zero failures, errors or skips**, including all 31 added assignment cases. The strengthened exact persisted-history/direct-access regression, actual separate PostgreSQL connection locking with `ATOMIC_REQUESTS` disabled, explicit rollback-after-M2M failure and genuinely available divergent stale-catalogue regression are present and passed. Archive SHA-256: `2a57efbd53e1ea441a6a689507215c5ea4a588bf14e8fc6e0445ded7b650135f`; XML SHA-256: `cdb2282733070c46e5c3edf0142bee46eb0f155d2521988f3202719ca2b5bcef`.
- Measurement artifact `11163184894`: `application_commit` is the exact reviewed SHA. Independently validated all **24 scenarios / 144 requests**, counts and returned values against fixture design. Integrated list/roster/matrix data SELECTs are **2/4/4**, with one separately counted JWT authentication SELECT and two savepoint queries. PostgreSQL **16.15**, Redis **7.4.11**. Archive SHA-256: `3a4ce0d7439e0b8d0daea0fc9a15b3b80e31c608a5f29247d73cc72e57b56c3e`; JSON SHA-256: `f3137acd16fc23db714e1d0263fb38e5900a610908c2432ee6f29a180528a0fc`.
- Browser job `110378144962`: **three Chromium cases passed**, zero intentional assignment skips. Inspected exact checkout, real built-SPA/API logs and selectors. Genuine PBKDF2 login/student finalization/inactive exclusion/explicit teacher Refresh, same-SPA teacher switch/foreign API denial, and owner assignment Save/canonical response/reload/report add-remove/history preservation are covered. These are final-source executions, not carried-forward results from e068/e692.
- [Normal CI run 36864981375](https://github.com/aranya-squad/Bolt-V1/actions/runs/36864981375) passed all backend, frontend, context and build jobs. Independently read frontend log showing **136 Vitest tests passed** under Node **20.20.2**, lint and type-check, including the corrected fallback assertions and 11 added explicitly synthetic MSW contract cases. This normal CI tested generated PR ref `29b69789c71c47105446bd0da8a3367804ccb723`, distinct from exact-head specialized verification. The generated PR test ref is not an authorized integration merge.

## Source acceptance mapping

| Signed criterion | Reviewed implementation and meaningful evidence |
|---|---|
| F2-AC01 existing editor/persisted canonical selection | Existing BatchDetail embeds one assignment fieldset; catalogue projection uses only ID/name/order and loads every safe same-endpoint page. Locked flags do not restrict report assignment. Mocked HTTP tests cover noncontiguous selections and the saved 51st level, pending submission, canonical response and intentional empty assignment. Real browser Save/reload follows persisted IDs. |
| F2-AC02 compatibility | Name-only POST remains unassigned; any explicit assignment field is rejected before class creation. PATCH omission preserves and `[]` clears. Backend and explicitly synthetic MSW cases cover list/create/PATCH/join additive canonical arrays and unchanged code-only rotation. OpenAPI changes remain confined to the touched classroom contract. |
| F2-AC03 validation/authorization | Strict list/string/UUID validation rejects null, wrong types, malformed, normalized duplicates, unknown and mixed known/unknown IDs with field errors and no scalar/relation changes. Ownership is resolved before validation; foreign/missing owner yields 404, non-teacher portal/write requests yield 403. Existing student join metadata does not grant assignment editing. |
| F2-AC04 transaction/concurrency/primary | Owner row lock and all scalar/M2M writes occur inside explicit primary atomic PATCH. Regression deliberately throws after relation mutation to verify rollback without request-level atomicity. Separate physical PostgreSQL connections demonstrably block on the owned row, then store the entire second serialized replacement with matching scalar fields. Divergent available stale catalogue is never queried for validation/serialization. |
| F2-AC05 truthful state and identity | Dirty draft survives background updates; Cancel uses latest confirmed selection; field/generic failure retains draft and retry; full unsaved draft is never silently trimmed after catalogue deletion. Loading, failed owner refresh, missing capability and missing saved catalogue entry block Save. Account/batch changes reset the editor; delayed A catalogue or PATCH cannot affect B. Lost response reconciliation uses a persisted read without manufacturing a successful write receipt. Unsupported PATCH response now explicitly requires Reload, while initial missing GET capability instructs Refresh. |
| F2-AC06 reporting-only/no learning mutation | Real endpoint add/remove/archived-owner edit tests preserve exact values of ProgressRecord, LessonCompletion, LevelCompletion, QuestionAttempt, XPEvent and ArenaSession. Every history model is populated; snapshots include IDs, scores, pointers and timestamps. Student catalogue/lesson access and actual unassigned-level start/resume remain unchanged. Archived edited class remains excluded from reports. No migration, new progress writer or unlock/eligibility rule is introduced. |
| F1-AC05, F1-AC07 integrated extension | Teacher catalogue follows existing identity/epoch/abort containment. Integrated measured list adds one batched canonical assignment prefetch, meeting ≤2; roster/matrix remain within ≤4/≤5. Existing F1 query, membership, primary and UI identity regressions continue in combined suites. |
| BOTH-AC01 | Final exact checkpoint passed genuine PostgreSQL/stale-database tests and all three built-SPA/real API browser cases; associated normal frontend/backend/context/build checks passed, including the corrected copy and new MSW contract regressions. |

## Resolved review findings

The review strengthened historical-data preservation from row counts to exact populated row snapshots and actual direct lesson start/resume. It corrected incomplete catalogue loading beyond DRF's first page without adding a pagination UI. Following-page URLs must retain the configured API origin and exact levels path, cannot contain credentials/hash, and repeated pages fail; all requests share cancellation and results are projected to reporting catalogue fields. The review also corrected unsupported-response recovery copy so the UI's instruction matches its intentional latched capability state. These changes stay within signed scope v1.2.

## Limits and human gates

Controlled evidence uses isolated PG16/Redis7 and a genuinely separate divergent database to simulate replica lag. It does not establish operational streaming replication or production frontend/backend ownership, revision, capacity or deployment correctness. Measurement has fully overlapping rosters, one timing observation per mode and Redis-only cold cache; PostgreSQL buffers are not reset, and synthetic measurements run inside rolled-back fixture transactions. It supports bounded query counts and correctness, not statistical latency promises or infrastructure sizing. Multi-page editor and failed/late response edge cases are honestly labeled mocked HTTP tests; the browser runs a representative genuine assignment lifecycle. Learning-history preservation has stronger actual database evidence than the browser's supplementary row-count check.

Human integration review must retain F1's prerequisite lineage and approved answer-recovery/auth/context prerequisites. No agent merge, deploy or live-infrastructure mutation is authorized. Backend must precede frontend during release; the fallback prevents old-server false saves. There is no destructive automatic relation/progress rollback on code rollback. Tournament rules, broad auth/reliability/retention/deletion and live-evidence work remain separate.

The coordinator should persist this signed review, update the F2 tracker, measurement report, brief and milestone log to READY FOR HUMAN REVIEW with the exact final evidence, and publish the documentation checkpoint after rechecking remote refs. Preserve newer setup work. That closes implementation and validation; it does not merge or release either feature.
