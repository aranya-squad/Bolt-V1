# Teacher dashboard reassessment — 01 October 2026

**PROPOSAL, assessment complete; implementation not authorized or started.**
Inspected source at `ce544953295b386b5a8cfff532240d1732692131`, runtime equal
to reviewed recovery `6d32de6a94c2afb92c5bc7a4c72dffe73737d2b1`.
This dated assessment does not own active feature state. If approved, create
`docs/features/teacher-dashboard.md` on its implementation branch.

## Recommendation and dependencies

Reassess `feat/teacher-dashboard` next, as directed by the approved
`docs/features/answer-recovery.md` Approval scope item 5 and Confirmed context.
Recovery is handed off, not merged. Context setup remains IN PROGRESS because
the fresh G test was contaminated; this independent assessment does not close it.
No teacher-dashboard or tournament-rounds branch exists in the current complete
eight-branch GitHub response. Historical auth branch `c2421de` is already an
ancestor of this runtime lineage; do not recreate that work or answer recovery.

Smallest useful slice: make existing batch counts, active rosters and assigned
level completion matrices agree, eliminate per-student/per-class aggregate SQL,
and prevent teacher query caches from crossing authenticated identities. Keep
the existing routes/screens/API fields and metric definitions.

After scope approval, prefer the human-integrated main containing the frozen
baseline → workflow foundation → answer recovery → continuous context → context
V2 lineage. Recheck refs and record the exact base at branch creation. If work
must begin before integration, stack `feat/teacher-dashboard` from the final
verified setup descendant of `c93ececacff1ec17991f68d2e5dc5c20f229f07c`;
record all prerequisites and compare both feature-only and full-main ranges.
Draft integration PR targets main; humans integrate. Never target frozen feat-Sagar.

## Existing functionality and concrete gaps (CODE)

| Area | Existing behavior | Gap / proposed work |
|---|---|---|
| Instructor command | `TeacherDashboardPage` lists batches, creates them, rotates codes, edits/launches external live links, links to levels | Reuse screen; optimize counts and identity-scoped cache. Live link is not an in-app classroom or tournament. |
| Batch roster | `BatchDetailPage` shows call sign, rank label, level and accuracy via `useRoster` | Backend filters active enrollments but computes full user XP/streak stats per student just to retrieve current level; accuracy adds a separate aggregate. Batch heading comes from cached batch list. |
| Level matrix | `TeacherLevelDashboardPage` shows lesson CLASSWORK/HOMEWORK counts via `useTeacherLevelDashboard` | Active owned assigned classes only, but student IDs include inactive enrollments. `.values_list()` bypasses prefetched objects and completion aggregation occurs once per class. UI matches lesson stats by array index instead of lesson_id. |
| Class count | `ClassSerializer.get_student_count` counts active enrollments | Filtering inside serializer bypasses ordinary enrollment prefetch, adding one count per class. |
| Authorization | `IsAuthenticated, IsTeacher`, own-class lookups; non-owner roster/patch/rotate return 404 | Preserve. ADMIN is admitted by frontend route but rejected by backend teacher permission; do not expand access without W0-PROD-03 matrix. |
| Browser server state | Query keys are `['batches']`, `['roster', batchId]`, `['teacher-level-dashboard', levelId]`; level data stays fresh for two minutes | QueryClient is app-wide; auth store clears recovery, not this cache. Scope teacher keys to user ID, gate on hydrated authentication, and test account switch. Broader auth transport races remain separate. |

## Proposed implementation scope

1. Class list: filtered `Count` of active enrollments, exposed through the existing
   student_count field. Keep POST/PATCH serializer responses correct with an
   explicit single-object fallback or shared read helper; no per-object list fallback.
2. Roster: select students/profiles once; fetch grouped CLASSWORK LevelCompletion
   counts and grouped ProgressRecord average accuracy once each for active student
   IDs. Pass computed maps to RosterStudentSerializer. Do not call get_user_stats
   from roster, compute XP/streak/best accuracy, or combine multiplicative joins.
3. Level dashboard: fetch active enrollments for the whole owned/active/assigned
   class set with a filtered Prefetch/to_attr or batched enrollment query. Aggregate
   lesson/kind completions for the union of students once, then count each active
   student in each class they belong to. Keep zero-student/zero-completion rows and
   ordered lesson lists; exclude inactive enrollment from both denominator/numerator.
4. Existing UI: map stats by lesson_id; scope the three teacher query hooks to
   authenticated user ID. Ensure applicable batch changes invalidate the level
   matrix as well as batch data. Show freshly fetched values after an explicit
   refresh/remount; choose the background freshness policy before implementation.
5. Preserve durable write ownership in progress.services. This slice is read-side
   reporting: no new progress writer, recovery mechanism, database table/migration,
   live infrastructure, pagination contract or new portal screen.

## Metrics and authoritative state to preserve

- Membership: `classroom.Enrollment.is_active`; level dashboard also requires
  class is_active, teacher ownership and assigned_levels membership. Class-list
  inclusion of archived classes and roster access to an owned archived class stay
  as they currently work. User.is_active is a separate unresolved policy.
- Current level: `min(CLASSWORK LevelCompletion count + 1, 10)` from users.stats,
  default 1. This is not proof that every lesson in those levels is complete.
- Accuracy: arithmetic mean of all persisted ProgressRecord.accuracy_pct values
  for that user, rounded to one decimal; no history gives null. It is not a weighted
  question-level percentage, latest/best result or class-specific score.
- Lesson completion: presence of unique `(user, lesson, kind)` LessonCompletion;
  not the number of attempts or retakes. Existing finalized history stays unchanged.
- PostgreSQL owns enrollment/completion/results. Redis and React Query are caches.
  Optional router sends courses/progress reads to replica while classroom is primary;
  a batched cross-app reporting query must choose one database explicitly. Proposed
  small-slice default: primary for these reporting aggregates so refreshed results
  reflect committed finalization. Validate using router tests; do not change the
  global router or recovery services.

## Measured cost evidence and measurement gate

`docs/assessment01-10-2026.md` D14 records **29 SQL statements at 5 students and
54 at 10** for a cold-cache synthetic roster. These are historical measurements,
not measurements rerun in this assessment and not production capacity evidence.
Actual current serializer still has four cold get_user_stats queries plus one
accuracy aggregate per student; warm stats still leave one accuracy query per
student. Class list and level matrix have source-backed per-class query growth.

This environment has Python 3.12 but no Django, PostgreSQL client/service or Redis
client discovered; no new application benchmark was executed. Do not invent
50/150-student counts, latency, EXPLAIN plans, improvement percentages or AWS savings.

First implementation checkpoint must measure current and candidate endpoints
against isolated PostgreSQL 16/Redis 7 using synthetic 5/10/50/150-student rosters,
1/5/20 owned classes, overlaps/inactive enrollments, and short/long completion
histories. Record cold/warm cache SQL counts separately from auth/transaction
overhead, rows returned, wall time and relevant EXPLAIN ANALYZE/BUFFERS. Counts
must stay bounded independent of student/class count; latency must be reported,
not inferred from counts. Add an index only if measured plans justify it.

Proposed data-query budgets, excluding auth/transaction overhead: class list ≤1;
roster ≤4 (owner, enrollment/profile, level counts, accuracy); level matrix ≤5
(level, lessons, classes, active enrollments, completion rows). Empty shortcuts
may use fewer. Establish actual endpoint overhead from measured baseline and
lock that separately; these budgets are acceptance proposals, not passing results.

## Acceptance criteria and meaningful tests

- Batch count and roster length agree for the same class at the same committed
  snapshot. Level matrix excludes inactive enrollments from totals and completions.
  Inactive/unassigned/other-teacher classes never enter level aggregates.
- Empty roster, no profile/history, inactive member with completions, student
  shared across owned classes, foreign teacher/student and unassigned level are
  explicit fixtures. No broader role or enrollment/consent rule changes.
- Accuracy regression uses unequal session sizes and multiple completion/XP rows
  to catch accidental weighting and join multiplication. Level count semantics
  include gaps and cap at 10. Repeat finalization/retakes do not increase unique
  lesson counts or rewrite old results.
- CaptureQueriesContext/assertNumQueries compares 5/10/50/150 and 1/5/20 class
  fixtures with cache cold/warm; per-student/per-class SQL slope disappears.
  Route assertions exercise actual auth/ownership responses. These are database
  integration tests, not merely mocked serializers.
- Router test makes stale replica reads observable; refreshed dashboard/roster
  must use the chosen primary path after a committed real progress finalization.
- Frontend component/hook tests cover empty/loading/error, reordered lesson_stats,
  null accuracy, and teacher A → logout → teacher B without A's cached classes.
  API mocks support the existing wire shapes; no mock-only API integration claim.
- Built SPA + real isolated API Playwright case: teacher opens existing screens;
  a synthetic active student completes classwork through the real persistence
  path; refresh displays correct roster accuracy/lesson count; inactive student
  is excluded. Cross-teacher navigation reveals no foreign data. Include homework
  if supported fixture/start path exists; don't manufacture a new homework feature.
- Execute classroom pytest/Ruff and frontend lint/type-check/Vitest/build; broader
  recovery checks only if a shared contract/write/auth file actually changes.

## Expected affected files

| Files | Purpose |
|---|---|
| `backend/apps/classroom/views.py`, `serializers.py` | Batched read queries, active membership, serialization maps |
| `backend/apps/classroom/tests/test_views.py`; proposed query/dashboard regression module | Correctness, authorization, SQL budgets, router behavior |
| Proposed `backend/apps/classroom/reporting.py` only if needed | One small shared reporting helper; avoid a new framework or duplicate stats policy |
| `frontend/src/shared/api/queries/useBatches.ts`, `useRoster.ts`, `useTeacherLevelDashboard.ts` | Identity-scoped keys, enabled gates/invalidation/freshness |
| `frontend/src/features/teacher/TeacherLevelDashboardPage.tsx` | Match by lesson_id |
| Existing teacher pages and proposed teacher tests/e2e case | Minimal refresh behavior and real integration coverage |
| `frontend/src/mocks/handlers.ts`; types/OpenAPI if contract actually changes | Preserve existing API shapes; inspect schema coverage before adding unrelated schema work |
| Future owning tracker; PROJECT_BRIEF/AI_DEV_LOG at milestones | Durable approved scope/progress, without duplicating current state |

`backend/apps/users/stats.py` is inspected input for metric semantics, not a
planned change: broad streak/history optimization from W4-PERF-02 is deferred
because this roster no longer needs that computation. Models/router/recovery
services/auth write flows are expected to remain unchanged.

## Unresolved product decisions

For the proposed slice, recommend active Enrollment only, current metric formulas,
per-class counting of shared students, and explicit primary reporting reads. Scope
approval should confirm those defaults and the refresh expectation. No prior chat
claim is used as approval for implementation.

Separately decide ADMIN portal rights/join eligibility/consent/retention under
W0-PROD-03; archived-class visibility, inactive-account exclusion, reactivation,
assignment controls, metric redesign (true level graduation, weighted accuracy,
class-specific history, XP rank) require separate scope. Assignment model/read
filter exists, but current create/patch API exposes no assigned_levels control.
Do not silently add that workflow. Live link does not provide in-app teaching.

## Separate prerelease reliability repairs

- W1-API-01: malformed unknown-call-sign PBKDF2 dummy hash remains in
  `backend/apps/users/backends.py`; real-hasher/malformed-input/throttle tests.
- W1-API-02: reproduce account deletion/audit integrity and repair mechanical
  failures; retained data/consent policy changes wait for W0-PROD-03.
- W1-PLAT-01: no backend Docker context exclusion was found; Dockerfile COPY . .
  and lack of non-root setup require clean image/canary layer verification.
- W1-PLAT-02: internal HTTP health probe vs production HTTPS middleware;
  bootstrap still advertises public :8000 and omits current Caddy shape. Validate
  isolated image/Compose/bootstrap; do not run live scripts.
- Broader auth refresh/account-generation races, runtime/deployed revision,
  CI artifact provenance, logging/health/backup evidence and realistic load/cost
  verification are independent reliability/release work. Reproduce current
  defects rather than assuming every dated finding remains unresolved.

Tournament rounds stay deferred until eligibility, content, timing/deadline,
reconnect/grace, attempts/skips, scoring/ties and organizer rules are approved.

## Next exact action

Finish clean G verification first to close context setup; obtain approval of this
concrete dashboard scope, recheck refs/base and create the owning feature tracker.
First dashboard implementation milestone is the synthetic SQL/value baseline,
followed by read-query corrections and existing-screen verification. No dashboard
code, merge, deployment, live measurement or new enrollment product flow is part
of this assessment.
