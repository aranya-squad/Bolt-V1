# Teacher workflows v1.2 — pre-development signoffs

All three distinct reviewers approved exact scope SHA-256 `19697b1a3061d588b8b0ed2ebd78b3c9d375830e68469ef5951f183974d51ff8` before feature coding. Scope: `docs/scopes/teacher-workflows-v1.2.md`. User authorizes scoped development after these approvals; no implementation/CI/live evidence is implied.


---

# Product Manager planning signoff — teacher feature batch

Decision: **APPROVED** for planning/implementation scope only.

Reviewer: Product Manager agent `/root/product_manager`.
Date: 01 October 2026.
Scope version: **1.2**.
Reviewed scope: `/workspace/scratch/3adb80fae809/pm-feature-scope-draft.md`.
SHA-256: `19697b1a3061d588b8b0ed2ebd78b3c9d375830e68469ef5951f183974d51ff8`.

The signed scope defines two distinct features, F1 teacher-dashboard reporting/cache correctness and F2 owner batch assigned-level reporting controls, with separate stacked branches/trackers and exclusive backend/frontend writer ownership. Needs, deferred wants, preserved existing behavior, actor ownership, UX/API/data contracts, exact acceptance IDs, edge/error/concurrency cases, meaningful test and measured query gates, dependencies/rollout/rollback and excluded human product decisions are explicit. No unresolved product blocker remains inside this constrained scope.

Resolved PM/CTO/QA findings: duplicate normalized UUIDs return 400; JSON IDs must be strings; integrated assignment-prefetched class-list query budget is ≤2; independent HTTP reads have no shared snapshot claim; assignment is reporting only; existing join metadata exposure does not grant portal/edit access; POST stays name-only and supplied assignment input is rejected; PATCH fully replaces atomically with owned row lock and coherent last-serialized-commit semantics; primary validation/report reads; dirty/save/error/capability fallback behavior; scoped late teacher query/mutation protection; catalogue projection avoids broader learning-cache work; always refetch on teacher screen mount; archived owned edit policy retained; backend precedes assignment UI and no assignment data clearing is needed for code rollback.

This approval does not assert executed tests, implemented behavior, hosted CI, production state, merge or release readiness. Feature coding may begin only once distinct CTO and Head QA agents approve this exact version/digest and the coordinator records all three before implementation. A material behavior/contract/acceptance revision requires renewed three-agent signoff under `docs/adr/0004-work-feature-planning-gate.md` and applicable AGENTS.

---

# Senior Tech Manager / CTO scope review — Bolt V1

Status: **APPROVED — pre-development technical scope signoff**.

Reviewer: `/root/cto_reviewer`, acting as Senior Tech Manager/CTO.
Frozen scope: **v1.2**, `pm-feature-scope-draft.md` (coordinator persists this exact
text as `docs/scopes/teacher-workspace-v1.md`). Independently read in full and
SHA-256 verified:

`19697b1a3061d588b8b0ed2ebd78b3c9d375830e68469ef5951f183974d51ff8`

Decision: **APPROVED** for F1 and F2 within that exact scope. No unresolved
technical planning blocker. This approval does not certify implementation,
executed checks, hosted CI, live behavior, human integration or release.

Reviewed runtime source: `b5c39ead35457948d4513e97cc3ee7b03f8943ff`, whose
application lineage includes reviewed answer recovery `6d32de6`. No source,
remote, production service or infrastructure was changed by this review.

## Proposed streams

1. Teacher roster/dashboard correctness, bounded grouped reads and teacher-cache
   identity, reusing current teacher routes/screens.
2. Owner-controlled batch assigned-level reporting configuration, reusing
   `Class.assigned_levels`, the existing level report and BatchDetail screen.

These are coherent as two reviewable feature streams on one dependency-stacked
task lineage. Their shared classroom serializers/views/hooks require one writer
per overlapping file and integrated verification; parallel writers must own
separate worktrees/files or execute sequentially.

## Architecture and ownership findings

- `backend/apps/classroom/views.py` owns class list/create, owner PATCH, roster,
  join and level reporting; `serializers.py` owns current wire shapes.
- `Class.assigned_levels` already exists; no migration or new policy state is
  necessary. Its current sole product use is filtering the teacher level report.
- Membership authority is active `Enrollment`; level report also requires owned,
  active class and assigned level. Preserve current archive visibility elsewhere,
  existing teacher permission and owner 404. ADMIN/consent/join rules are excluded.
- Current roster calls `get_user_stats` per member (XP/streak/best-accuracy work)
  then another average aggregate. Current level report includes inactive members,
  bypasses its enrollment prefetch with `.values_list`, and repeats aggregates
  per class. ClassSerializer active count also bypasses ordinary prefetch.
- Preserve exact metric definitions: CLASSWORK LevelCompletion count + 1 capped
  at 10; mean of all ProgressRecord accuracy values rounded to one decimal;
  unique LessonCompletion presence per user/lesson/kind, counted separately in
  each class a shared student belongs to. No progress/history write belongs here.
- `backend/config/dbrouter.py` sends courses/progress reads to an optional
  replica. Reporting aggregates, level validation and assignment writes must
  explicitly use `default`; do not modify the global router or recovery service.
- Three teacher query hooks have account-independent keys. Captured issuing
  identity plus hydration/token gating, request cancellation and late-result
  guards are necessary; keys alone do not prove late query/mutation isolation.

## Required contract decisions

- Add `assigned_level_ids` to existing Batch responses, including the existing
  JoinClass response produced by the same serializer. Older clients may ignore
  this additive field. New assignment UI requires backend capability first;
  a missing field must show an unavailable editor rather than pretend [] was
  saved. Existing name-only create remains valid.
- POST remains name-only, produces [] assignments, and explicitly rejects an
  `assigned_level_ids` input with 400 before creating a class. PATCH omission
  preserves; [] explicitly clears. Assignment controls live on BatchDetail.
- null/non-array/malformed UUID/unknown UUID/duplicate normalized UUID returns
  400. Mixed invalid name+assignment updates leave both values unchanged.
- Responses reload/present persisted IDs in canonical Level.order order, not
  request order. Unknown catalogue entries are validated on primary.
- PATCH transaction takes the owned Class row lock and serializes complete-set
  replacements; the last serialized commit wins. Do not union concurrent sets,
  invent an optimistic conflict/version API or rely on ATOMIC_REQUESTS alone.
- Owned archived classes may still be configured, following current PATCH
  semantics; they remain excluded from the active report.
- The picker uses only catalogue id/name/order. Assignment is reporting
  configuration, with no student unlock, lesson eligibility or learning changes.
  Existing useLevels user-specific flags must not determine picker eligibility.

## Query/test and release requirements

- Combined class-list query budget is <=2 data queries after adding level
  prefetch (annotated active count + levels), roster <=4, level report <=5,
  excluding measured auth/transaction overhead. Test multi-level assignments do
  not inflate counts through joins. POST/PATCH single-object counts stay correct.
- Baseline and candidate measurements need isolated PostgreSQL 16/Redis 7 with
  synthetic 5/10/50/150 students and 1/5/20 classes, overlapping/inactive members
  and varied histories. Record cold/warm cache SQL counts, timings and plans;
  bounded SQL count is not production latency/capacity evidence.
- Explicit primary routing tests must expose replica lag rather than silently
  relying on absent replica configuration. Static committed-fixture count/roster
  equality is required; independent HTTP requests cannot promise one atomic
  snapshot during concurrent enrollment/finalization.
- Assignment tests need complete-set persistence, invalid mixed-request atomicity,
  roles/ownership/archived semantics, duplicate normalization, omission/empty
  behavior and separate-connection PostgreSQL concurrent replacement evidence.
- Frontend tests need late A query/mutation after B login, lesson-id mapping,
  editor load/save/error/dirty states and backend capability fallback. Existing
  UI labels/counts update after explicit refresh and successful owned mutation.
- Add contract documentation for touched classroom endpoints in the currently
  incomplete OpenAPI YAML, types and mocks. No whole-schema cleanup.
- Real built-SPA + isolated API integration must include teacher assignment,
  report inclusion/removal, active/inactive roster and committed finalization
  refresh. Mock-only tests are not real API evidence.

Expected minimal affected areas: classroom views/serializers plus a small
reporting helper only if needed; focused classroom tests; three teacher query
hooks and one identity/key helper; BatchDetail assignment editor; existing teacher
pages' refresh/lesson-id mapping; Batch types, classroom mocks and touched API
schema; isolated integration fixtures/config and owning feature documents.

Runtime availability observed here: Python 3.12.14, Node 24.19.0; no Django,
PostgreSQL/Redis service or client in the default interpreter/PATH. These are
test-provisioning concerns, not passing evidence. Target Node 20 where practical,
record deviations, and keep final readiness blocked by required unexecuted
database/browser checks if the isolated runtime cannot be provisioned.

## Scope exclusions

Answer recovery, historical auth, broader transport refresh races, enrollment
management/consent, admin access, metric redesign, tournament rules, non-reporting
assignment restrictions and prerelease platform repairs are separate. No merge,
deploy, live mutation or production endpoint measurement is authorized here.

## Final signoff evidence and resolved findings

- v1.2 distinguishes current functionality from proposed F1/F2, categorizes
  committed needs/deferred wants, records observable acceptance criteria, source
  ownership and two sequentially stacked feature branches.
- Accepted POST name-only plus explicit unsupported assignment input 400;
  PATCH-only editor, UUID strings/normalized duplicate 400, omission/empty
  semantics and canonical persisted output are agreed before coding.
- Class-list budget explicitly separates F1 <=1 from integrated F2 <=2 data
  queries; multiple assignments must not inflate enrollment counts.
- Primary reads/validation, explicit atomic row locking, separate-connection
  concurrency tests and preserved immutable learning history are required.
- Teacher cache and late query/mutation containment, always-refetch-on-mount,
  identity-scoped catalogue, dirty form handling and capability fallback are
  explicit. The student join response's additive metadata is distinguished from
  teacher portal or assignment mutation permission.
- Rollout requires backend capability before the editor; rollback needs no
  migration/data clearing. Existing relation/report behavior remains valid.
- Environment-specific three-role policy is persisted in ADR 0004, AGENTS,
  agent-workflow and a reusable scope template; it makes no account-enforcement
  or wider universal-policy claim.

The coordinator may start implementation only after PM and Head QA also approve
this identical version/hash and the approval/start checkpoint is persisted. A
material scope/contract/acceptance revision requires renewed three-role review.

---

# Head QA scope review — teacher feature batch, 01 October 2026

Reviewer: Head QA agent `/root/head_qa`. Evidence inspected: repository runtime/source at `b5c39ead35457948d4513e97cc3ee7b03f8943ff`, applicable `AGENTS.md`, bootstrap/brief/router, dated dashboard assessment, classroom models/views/serializers/tests, progress completion models/services, router/test settings, teacher pages/hooks/types/auth/client, course catalogue views/hooks, CI and the existing recovery real-API Playwright harness.

**Final review status: APPROVED for implementation planning against scope v1.2 and the exact SHA-256 recorded below. This is a planning signoff, not executed runtime validation.** Initial changes requested were resolved in the reviewed final scope. No runtime code was edited by this reviewer. Implementation can begin only after PM and CTO approve the same scope digest and the coordinator records all three approvals.

## Evidence and testability findings

- Existing classroom endpoint tests use APIClient plus JWT access tokens and cover basic ownership/create/patch/roster/join behavior. They do not assert level-dashboard output, SQL query growth, inactive enrollment completion exclusion or assigned-level mutation. New regressions must use the actual database/query path rather than mocked serializer methods.
- Current class count issues one filtered enrollment count per class. Roster calls `get_user_stats` plus accuracy aggregate per student. Level dashboard obtains all enrollment IDs including inactive rows and separately aggregates completions for each class. The frontend matches completion rows by array index and teacher hooks use identity-independent cache keys.
- `assigned_levels` exists as a Class↔Level M2M. Current create/patch/read contracts do not expose it. No schema migration or progress-history rewrite is necessary for the proposed assignment editor.
- Current optional replica router sends courses/progress reads to replica. Reporting refresh and assignment ID validation must explicitly use primary; source-level routing inspection is necessary but not sufficient to prove read-after-commit behavior.
- Course `useLevels` cache is identity-independent while responses contain per-user `is_locked`/`is_completed`. The assignment editor must use only catalogue ID/name/order and cannot reinterpret those flags as teacher assignment or student eligibility. Scope any shared-cache correction explicitly.
- Existing MSW handlers/OpenAPI YAML do not cover classroom endpoints. Add only the affected classroom contract and deterministic synthetic fixtures; mock success is not a real-API claim.
- Current normal Playwright config uses Vite dev; existing recovery integration config builds and previews the real SPA with a loopback API and synthetic guarded fixture database. Teacher evidence must follow the built-SPA path with MSW disabled, real auth, and local services. The existing recovery fixture itself lacks teachers/classes and will need a separate bounded teacher fixture extension/harness.
- This reviewer executed only source/environment inspection. Python Django, pytest, psycopg and redis imports are unavailable; no psql/postgres/initdb/redis-server/docker executable was found. Node/npm are available. No application tests, SQL measurements, timing, EXPLAIN or end-to-end checks have run in this review.

## Resolved scope requirements

1. Define correctness at an unchanged committed fixture snapshot. Three separate HTTP responses cannot promise one atomic cross-request snapshot while students enroll/finalize concurrently. After a committed change, explicit refresh must fetch primary committed results; no live push or cross-request snapshot token is implied.
2. Define the reporting metrics exactly: active `Enrollment.is_active`; `current_level=min(CLASSWORK LevelCompletion count+1,10)`; unweighted mean of all ProgressRecord.accuracy_pct, rounded one decimal, null without history; unique LessonCompletion presence by user/lesson/kind; shared student counts once in each active owned class. Keep User.is_active/archived visibility/role policy unchanged.
3. Define freshness: explicit refresh, initial/remount behavior, background failures, disabled fetching during auth hydration/logout, and exact invalidations after assignment/class mutations. Error and empty states must remain distinct. Refresh failure must show a truthful stale-data warning or error while preserving already fetched data; it cannot report successful freshness.
4. Define teacher identity keys at mutation start, not settlement. Test teacher A→logout→B, late A GET resolution, and late A mutation resolution. No A data may render in B's keys/pages and no A callback may treat B's state as its own. Broad token-refresh/account-generation races remain a separately documented prerequisite risk, not silently repaired in this slice.
5. Assignment wire contract in revised v1.1: PATCH optional `assigned_level_ids`; omission preserves set; [] clears; null/non-list/non-string member/malformed/unknown/duplicate IDs reject the whole request with 400 and field errors. Normalize UUIDs before duplicate validation. POST remains name-only and explicitly supplied assignment input returns field 400 before creating anything. Other PATCH fields and M2M must not partially mutate on any validation failure. Use a primary transaction and owned Class row lock for PATCH; concurrent replacements use last-serialized-commit-wins, yielding one complete submitted set rather than interleaved/union membership. Owner-only writes preserve existing non-owner 404/non-teacher 403/unauthenticated 401. Archived owned edits remain allowed under the existing PATCH policy. Existing student join class metadata may include canonical assignment IDs; it does not grant teacher portal/edit permission or alter join eligibility.
6. Save only on explicit editor Save; Cancel/network/validation failures preserve the saved state and avoid premature UI success. Inline field plus fallback error must work. Disable duplicate submission while saving. Canonical read IDs follow Level.order; repeated unchanged save is safe; unassignment removes report inclusion while retaining all history/unenrolled data.
7. Agree bounded query budgets after both features, not the pre-assignment proposal: class list ≤2 data queries when using bounded assignment prefetch; roster ≤4; level matrix ≤5. Authentication and transaction queries are measured and reported separately. Test multiple assigned levels × multiple enrollments to catch count multiplication. Single-object POST/PATCH fallback cost is separate from list growth.

## Acceptance-to-test matrix

| Acceptance family | Meaningful automated evidence | Fixture and failure edge |
|---|---|---|
| Counts and membership | Django endpoint tests compare class student_count, roster length, matrix denominator at a fixed committed fixture; primary reads recorded | Active/inactive enrollments; zero students; owned archived class; inactive/unassigned/foreign class excluded from level matrix; User.is_active remains existing policy |
| Roster metric stability | Endpoint assertions on rounded/null averages and count-based current level | Unequal session sizes; multiple ProgressRecord/XP/LevelCompletion rows; gap in completed levels; >9 completions cap; absent profile/history; joins cannot multiply average/count |
| Completion stability | Level-dashboard API assertions across class/student/lesson/kind | Inactive student with completed work; student in overlapping owned classes; other-teacher-only student; missing completions; separate CW/HW; retakes/finalize replay keep unique count and old rows unchanged |
| Query cost | CaptureQueriesContext around real endpoint data path; compare 5/10/50/150 students and 1/5/20 classes, cold/warm cache; separate endpoint overhead | Report fixture sizes, returned rows, all query counts, timings, EXPLAIN ANALYZE/BUFFERS on representative largest reads; query count slope is bounded, timing improvement is measured not inferred |
| Primary/replica behavior | Router + actual query-alias assertions with intentionally stale replica representation; committed progress finalize then report refresh | Capture default and replica connections; reporting/catalogue validation must not consume stale replica progress; do not use mirrored alias as false evidence of stale-read correctness |
| Authorization | Real APIClient/JWT negative endpoints plus built SPA two-teacher navigation | Anonymous 401; STUDENT/GUARDIAN/ADMIN according to current backend 403; nonowner/missing class 404; no foreign data/mutation |
| UI lesson identity | Vitest render reordered/missing/extra lesson stat IDs | Counts attach to matching lesson_id, never array position; empty classes/lessons, null accuracy, loading and API error distinct |
| Freshness and account isolation | Hook/page tests with one QueryClient; delayed promises and mutations; real browser account switch | A data preloaded then B signs in; late A GET/mutation completes; hydration/no token suppresses protected fetch; refresh succeeds or shows failure; retry is possible |
| Assignment API compatibility | Django create/patch/read regressions with DB reload and canonical read order | POST name-only creates none, supplied IDs reject before creating; PATCH omit preserves; [] clears; valid IDs save; invalid/mixed-valid unknown/malformed/null/non-list/non-string/duplicate reject without scalar or M2M mutation; existing client bodies still accepted; class-shaped join metadata adds IDs without new join policy |
| Assignment concurrency | PostgreSQL transactional test with separate connections and coordinated concurrent PATCH | Final stored name/fields and M2M reflect one complete winning commit; no partial set/union; ordinary unrelated PATCH preserves omitted assignment; test with ATOMIC_REQUESTS disabled verifies local transaction boundary |
| Assignment UI | Vitest editor state + built SPA actual save/reload flow | Open current values; select/deselect; Cancel; successful saved summary only after server response; validation/transport failure retain draft; no levels loading/error/empty list; pending submission disabled; saved ID missing from catalogue blocks Save; old backend missing assignment field disables unavailable editor; small-screen keyboard operation |
| Combined reporting | Real local API plus built SPA flow, inspect persistence | Teacher edits owned batch assignments; reload persists; relevant level report includes/excludes class; active synthetic student finalizes classwork through real progress service; refresh shows accuracy and CW count; inactive student's history never enters total; no existing progress rows deleted |
| Scope boundaries | Diff/path review and migration check | No new table/migration unless approved; no duplicate progress writer, new portal, auth policy, consent, retention, tournament, infrastructure or production operations |

## Execution gates

- Baseline before changing reporting queries: isolated Python 3.12/PostgreSQL 16/Redis 7, explicit local settings and synthetic data. Measure current endpoints and candidate on comparable fixtures; historical 29/54 roster SQL counts are references, not this run's baseline.
- Completion: classroom pytest, backend Ruff, frontend lint/type-check/Vitest/build, touched contracts/mocks, migration drift check, bounded query assertions and a built-SPA/real-API teacher scenario. Required smoke includes actual authentication; MD5-only unit tests do not establish production auth correctness.
- Run full backend suite if shared serializer/model/query plumbing changes; rerun recovery checks only when recovery/auth/write/contracts actually change, unless integration reveals regression. Do not broaden tests without an unresolved reason.
- If local runtime cannot be provisioned, commit implementation/tests as IN PROGRESS or DRAFT with exact commands and missing prerequisites, and use authorized hosted CI for backend/frontend verification. Hosted CI currently lacks teacher built-SPA real-API coverage; add a bounded integration job or report that gate pending. No READY claim based solely on lint/mocks/unit tests.
- Attach executed command/result/count/version evidence to each owning feature tracker. Scope approval does not imply implementation approval, merged status, release or live capacity evidence.

## Product decisions versus technical choices

The PM/CTO/QA may adopt existing-policy-preserving defaults for this bounded batch: active enrollment, existing formulas, per-class shared counts, primary reporting reads, reporting-only assigned levels through owner PATCH, name-only POST, [] clearing and duplicate=400. These become explicit approved rules after three-agent signoff. They are not a reason to stop for new human permission.

Material changes to student access/unlock rules, true graduation metrics, User.is_active filtering, ADMIN capabilities, reactivation/retention/consent, assignment-based eligibility or tournament rules are excluded and require a new scope/signoff. Choosing an annotated Count vs grouped helper, bounded prefetch, map construction or atomic serializer implementation is a routine technical decision within scope.

## Final signoff record

Decision: **APPROVED**.

Exact scope inspected in full: `/workspace/scratch/3adb80fae809/pm-feature-scope-draft.md`, **version 1.2 — final for three-agent planning signoff**, dated 01 October 2026.

SHA-256 verified by `sha256sum`:

`19697b1a3061d588b8b0ed2ebd78b3c9d375830e68469ef5951f183974d51ff8`

Approval covers **F1 Teacher dashboard and roster correctness** and **F2 Batch assigned-level management** only. The final exact scope resolves membership/formula/query/identity/freshness requirements, PATCH-only assignment validation and atomic concurrency, older-backend capability handling, join metadata wording, backend-before-frontend contract ordering and nondestructive code rollback. It includes categorized needs/deferred wants, observable acceptance criteria, targeted files, separate owning branches/trackers, test fixtures, required real database/browser checks, dependencies and explicit readiness limitations. There is no remaining blocking product decision in this bounded slice.

Fresh mounts must fetch even within the two-minute stale window; query cache isolation tests include delayed A query and mutation completions after B login. Assignment UI must not infer an empty saved set from a missing backend field or silently discard an assigned ID missing from catalogue options. PostgreSQL concurrent replacement evidence must use separate connections and preserve one complete winning set with coherent scalar fields.

**This approval authorizes implementation only after all three matching planning signoffs are recorded.** It does not certify runtime correctness, test success, measured improvement, CI, merge, deployment or live behavior. This reviewer has not executed application tests or benchmarks. Required runtime evidence remains pending and must be attached to the named implementation commits before readiness. Material changes to the approved behavior/acceptance criteria require renewed affected review; changing the scope content invalidates this digest-based approval.

Review iteration: v1.0 supplied optional POST assignments; revised v1.1 deliberately simplifies to PATCH-only assignment with explicitly rejected POST assignment input. QA accepts that narrower contract. v1.1 also separates `feat/teacher-dashboard` and stacked `feat/batch-level-assignment` owning trackers while requiring exclusive backend/frontend file ownership and integrated verification. No feature implementation has begun in the reviewed evidence.
