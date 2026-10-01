# Teacher workspace scope — dashboard correctness and assigned levels

Scope version: **1.2 — final for three-agent planning signoff**, 01 October 2026. Product owner: Product Manager agent. Technical reviewer: Senior Tech Manager/CTO agent. Quality reviewer: Head QA agent. This scope is confined to the user's **ChatGPT Work / Cloud dev - Bolt v1 project and account**. The three roles must approve the same exact scope content before implementation begins. Changes to approved behavior or acceptance criteria require affected reviews again. Human integration and deployment remain separate gates. Persisted policy: `docs/adr/0004-work-feature-planning-gate.md`, applicable `AGENTS.md` environment-specific gate and `docs/agent-workflow.md`; reusable scope template: `docs/templates/feature-scope.md`.

Evidence base: actual repository source inspected at `b5c39ead35457948d4513e97cc3ee7b03f8943ff`; `docs/features/answer-recovery.md` approval scope item 5; `docs/teacher-dashboard-assessment-2026-10-01.md`; dated next-steps W4-PERF-02. Recheck remote refs and record the actual base before creating the feature branch. Neither these source observations nor future local tests prove live deployment behavior.

## Product outcome and the two features

Teachers should see accurate active student counts and completion reports in the existing portal, then choose which levels appear for each batch in those reports. These are two coherent features sharing existing screens, APIs and data. Both are delivered together as separately reviewable milestone commits; there is no third feature in this scope.

| Feature | Existing functionality [CODE] | Proposed work [APPROVED only after signoff] |
|---|---|---|
| F1 — Teacher dashboard and roster correctness | Instructor Command lists/creates batches, rotates join codes, manages external live links and links to level reports. BatchDetail shows active roster and current level/accuracy. TeacherLevelDashboard shows per-lesson CLASSWORK/HOMEWORK completion. | Make active membership agree across reports; batch SQL aggregates; primary-consistent refresh; match lesson counts by identity; isolate authenticated teacher caches and late completions; expose explicit Refresh using these existing screens. |
| F2 — Batch assigned-level management | `Class.assigned_levels` many-to-many relation exists, editable through Django admin. Level reporting already filters this relation. Teachers have no API/UI control for it. | Add owner-controlled full-set assignment through the existing BatchDetail screen and additive fields on existing class APIs. Selection controls report grouping. It does not change student learning access, progression, locking or session eligibility. |

## Categorized needs, wants and deferred work

| Category | Needs — committed scope | Wants — explicitly deferred |
|---|---|---|
| Reporting correctness | Active Enrollment denominator/numerator; owned/active/assigned class filtering; existing level/accuracy formulas; lesson_id matching. | New graduation formula, weighted/class-specific accuracy, XP/rank redesign, inactive-user exclusion policy, archived visibility redesign. |
| Performance | Measure before/after PostgreSQL endpoint SQL and latency; bounded query growth; primary aggregate reads; no per-student full stats computation. | New indexes, rollup tables, broad user history/streak optimization, capacity/AWS promises. An index requires measured plan evidence and affected scope review first. |
| Teacher UX | Reuse current dashboard, batch detail and level matrix; loading/error/empty states; accessible level checkboxes, Save/Cancel, explicit Refresh and truthful save status. | New portal, batch creation wizard, mass assignment, bulk editing, pagination/search/export, per-student assignment. |
| Assignment | Existing model; owner-only persisted set; additive class API field; atomic validation/replacement; canonical catalogue order; preserve progress. | Learning restrictions, scheduled curriculum, auto-assign by student level, assignment notifications, concurrency conflict/version UI. |
| Authentication/privacy | Teacher cache identity, hydration gates and late-completion containment for changed hooks. Preserve existing role/ownership restrictions. | Auth transport/token-generation rewrite; ADMIN rights, join roles, enrollment/reactivation or consent/retention changes. |
| Release/reliability | Focused local verification and branch handoff; explicit dependency/CI/live-evidence limitations. | Tournament rounds/fairness until rules are approved; separate prerelease repairs listed below; live infrastructure changes. |

## Actors, ownership and authoritative state

Only an authenticated `TEACHER` can use teacher reporting/list/editor endpoints or mutate assignments for their own classes. Existing class-shaped join responses may expose assignment metadata under the existing enrollment rules; receiving that metadata grants no editing or teacher-portal access. Current teacher API permission behavior remains: unauthenticated requests receive existing authentication denial; non-teacher roles including ADMIN receive existing role denial; another teacher's class mutation/roster returns 404. No new ADMIN or student action is introduced.

`Enrollment.is_active` determines membership. An enrolled user's `User.is_active` does not gain a new exclusion rule. The class list continues to include the owner's archived classes; owned archived roster access and assignment editing remain allowed because the current owner PATCH permits archived edits. The level dashboard continues to exclude archived classes. One student active in two owned classes counts once in each class.

PostgreSQL primary owns assignments, enrollment and completion history. React Query and Redis are caches. Reporting uses explicit primary reads for classroom/courses/progress inputs, without changing the global router. Assignment is class-level reporting metadata; removal never deletes a completion, ProgressRecord, enrollment or question attempt.

Preserve these metric rules:

- Current level is `min(CLASSWORK LevelCompletion count + 1, 10)`, default 1. Completion gaps remain possible; this is not a new graduation judgement.
- Roster accuracy is arithmetic mean of all the student's persisted `ProgressRecord.accuracy_pct`, rounded to one decimal; no history is null. It is not weighted by answer count and is not scoped to the class.
- Completion is the presence of unique `(user, lesson, kind)` LessonCompletion. Retakes do not create additional student counts. Empty rosters/lessons stay visible with zero counts.

## UX and API contract

### F1 — refresh and read behavior

Reuse `/teacher`, `/teacher/batch/:batchId`, `/teacher/level/:levelId`. Add a Refresh control per screen: dashboard refetches batches; BatchDetail refetches batches/roster; level dashboard refetches its matrix. During refresh use existing content with a visible loading state, then latest successfully fetched data; a failed refresh displays an error/retry state and does not claim new values. Independent endpoint requests do not promise one shared transactional snapshot. At a fixed committed data state their membership counts must agree; concurrent enrollment changes may legitimately occur between responses.

Changed teacher queries have an identity-scoped key, are enabled only after auth hydration finishes with token + authenticated TEACHER identity, and always refetch on screen mount even inside the allowed stale window (`refetchOnMount: "always"`). A two-minute stale window is allowed between explicit refreshes; refetch on window focus only when stale, no periodic polling. Save/create/patch/code-rotation invalidations target the issuing teacher's keys; changes affecting assigned/active class inclusion invalidate the teacher's level matrices. Capture issuing identity, use query cancellation signals and reject/discard late completion when identity no longer matches; a late A response/mutation never populates or invalidates B's keys. This is scoped teacher cache protection, not a guarantee about broader existing refresh-token races.

### F2 — assigned-level editor

BatchDetail gains one Assigned levels section. Fetch available levels from the existing `/levels/` catalogue, with teacher-identity-scoped cache and hydrated auth gate. Display only level order/name/ID; user-specific completion/unlock fields must not govern or appear in assignment choices. Any existing level can be selected, including multiple/noncontiguous levels; none selected is valid. Selection order has no product meaning. Reuse existing components/styles, labeled keyboard-operable checkboxes, Save and Cancel; no new page.

The editor initializes from persisted assigned IDs. Loading/failure of the batch/catalogue disables Save and shows retry; missing/foreign class never exposes an editable control. A confirmed assigned ID missing from available catalogue options shows a catalogue-refresh error and disables Save rather than silently dropping it. Draft state resets on authenticated teacher or batch identity change. Background refetches do not overwrite dirty selection. Cancel returns to the latest confirmed persisted selection. Save is disabled while unchanged or pending; failure preserves edits and exposes field-specific or generic errors; success displays persisted server selection and confirms the write only after the response. A lost response has no success claim; refetch/retry can reconcile the persisted set. Assignment replacement retry is naturally a full-set replacement, not a second distinct assignment. CreateBatchModal remains name-only; its generic error fallback must be truthful if an API failure has no `name` error.

Existing `/api/v1` routes gain this additive contract:

| Operation | `assigned_level_ids` behavior |
|---|---|
| GET `/classes/` | Read-only UUID string array on each class, in `Level.order` order; unassigned is `[]`. Prefetch once for the list. |
| POST `/classes/` | Existing name-only creation is preserved and produces no assignments. Assignment input is not supported here; explicitly supplied `assigned_level_ids` returns field 400 before any class write. Configure levels afterward through owner PATCH. |
| PATCH `/classes/{id}/` | Optional UUID string array replacing the complete set; omitted preserves; `[]` clears. Existing name/live_session_link/is_active behavior remains. |
| Class-shaped create/patch/join responses | Return additive canonical `assigned_level_ids`. `/classes/join/` enrollment behavior is otherwise unchanged. Rotate response remains join_code-only. |

PATCH assignment is an array of UUID **strings**. Explicit null, non-list, non-string member (integer/null/object), malformed UUID, duplicate UUID after canonical UUID normalization, or unknown/deleted level IDs returns 400 with `assigned_level_ids` error. Valid uppercase UUID spellings are normalized consistently. Any invalid assignment rejects the entire request, including accompanying name/link/active changes. Foreign ownership is rejected before exposing field-validation details. Known IDs are validated against primary; no artificial ten-level maximum is added to a model without that schema limit. Validation/write uses existing Django/DRF facilities, not a new assignment service.

PATCH locks the owned Class row and atomically updates scalar fields and replaces the relation. Concurrent valid replacements are serialized; the last committed replacement is the complete persisted set with coherent scalar fields, without interleaved union/partial selection. No optimistic conflict/version contract is introduced. Concurrent deletion of referenced catalogue rows is outside ordinary teacher feature ownership; any resulting failure must roll back the whole write rather than acknowledge partial assignment.

Update TypeScript class types, client hooks, mocks and the relevant classroom schema paths together. Older clients ignoring additive fields continue to work. A class payload missing `assigned_level_ids` shows an unavailable/update-needed editor, with Save disabled; it must not infer `[]` or falsely claim success against an older backend that ignores unknown PATCH fields. Backend contract must precede assignment frontend rollout. Code rollback needs no database rollback: the existing relation remains valid; an older backend hides editor capability while its existing report filter continues using persisted assignments. Do not clear assignments as a rollback step. No deployment is performed in this task.

## Exact acceptance criteria

| ID | Observable result and evidence required |
|---|---|
| F1-AC01 | Fixed committed fixture: class `student_count` equals active roster length, including classes with multiple assigned levels so joins cannot multiply membership; level `total_students` and CW/HW counts exclude inactive enrollments; owned archived/unassigned/foreign classes are excluded from level matrix. |
| F1-AC02 | No-history/profile-missing/zero-student/zero-lesson cases are valid; gap/cap level rules and arithmetic accuracy hold with unequal session sizes and multiple unrelated XP/completion rows. Retakes do not inflate lesson counts. Shared students count once in each class. |
| F1-AC03 | List, roster and matrix retain wire shape/ownership/error semantics; a changed reporting read uses primary despite an available stale replica. After real committed finalization, explicit Refresh observes the new accuracy/completion. |
| F1-AC04 | Matrix cells match `lesson_id`, even if server lesson-stat array is reordered or lacks a lesson. Missing stat renders zero for that lesson; no positional mixing. |
| F1-AC05 | Hydration/logged-out/non-teacher hooks do not fetch teacher data. A → logout → B, including delayed A queries and mutation settlements, renders no A batch/roster/matrix and never invalidates B keys. Teacher catalogue used by F2 has the same isolation. |
| F1-AC06 | Before/after isolated PostgreSQL measurement covers 5/10/50/150 active students; 1/5/20 owned classes; overlaps/inactive enrollments and short/long completion histories. Record cold/warm SQL, endpoint overhead, rows and elapsed times separately; inspect relevant EXPLAIN ANALYZE/BUFFERS. No source-only performance claim. |
| F1-AC07 | Data-query budgets excluding separately measured auth/transaction overhead: F1 class list ≤1; roster ≤4; level matrix ≤5. Counts do not grow per student/class. After F2 adds batched assignment serialization, integrated class list ≤2; roster ≤4; matrix ≤5. Empty shortcuts may use fewer. Meaningful query assertions lock budgets/slope, not undocumented authentication query counts. |
| F1-AC08 | Existing three screens support explicit Refresh, honest loading/failure/empty/null states and refetch on mount; relevant owner mutations invalidate batch/matrix keys. No live-update/polling promise. |
| F2-AC01 | Existing owner BatchDetail displays saved assignments using existing catalogue labels/order; a teacher can select multiple/noncontiguous levels, Save, refresh/reload and see identical canonical persisted IDs. Unassigned is an intentional valid state. |
| F2-AC02 | POST name-only creates none and supplied assignment input returns 400 without creating a class; PATCH omitted preserves; empty array clears. Existing name-only callers retain behavior. Class list/create/patch/join outputs include canonical ID arrays; rotate-code output remains unchanged. |
| F2-AC03 | Null/non-list/non-string-member/malformed/duplicate-normalized/unknown/mixed-valid+unknown PATCH inputs return field 400 and write nothing, including accompanying scalar changes. Teacher B cannot edit Teacher A; student/ADMIN roles cannot gain assignment mutation or teacher-portal access. Existing join response metadata exposure remains unchanged apart from the additive IDs. |
| F2-AC04 | Scalar+replacement PATCH is atomic; two separate-connection concurrent replacements produce one complete valid set and coherent scalar fields matching a serialized replacement, not a union or partial set, including with ATOMIC_REQUESTS disabled. Validation/reporting uses primary. |
| F2-AC05 | Save failure preserves draft, renders specific/generic errors and does not claim saved. Cancel restores confirmed selection. Loading/missing owner data/missing capability field/unavailable saved catalogue entry prevents Save. Dirty state survives background refresh; teacher/batch change resets draft. Late mutation settlement cannot affect another account. |
| F2-AC06 | Assignment add places an active owned class into the existing corresponding level report; removal removes it after successful mutation/refetch. Archived assignment edits remain allowed but archived class stays absent from matrix. Add/remove never changes stored student progress or existing learning access/locks. |
| BOTH-AC01 | Focused database/ownership/concurrency/router tests, frontend lint/type-check/Vitest/build and classroom Ruff/pytest pass. Built SPA with real isolated API covers owner assignment and report refresh after real student finalization, inactive exclusion and cross-teacher denial. Mock-only UI tests are labeled. |

## Meaningful tests and fixtures

Backend tests use synthetic teachers, active/inactive enrollments, shared students, no profile/history, distinct lesson/kind completions, unequal session sizes, foreign/archived/unassigned classes and canonical duplicate UUID variants. Query evidence runs PostgreSQL 16/Redis 7; compare cold/warm endpoint measurement with controlled authentication. Use actual authenticated route tests for permission behavior; use separate database connections and transactional tests for replacement locks. At least one committed real finalization must demonstrate refreshed primary reporting without constructing only serializer inputs.

Frontend component/hook tests exercise loading/error/empty, reordered/missing lesson stats, null accuracy, dirty editor refresh/cancel/retry, HTTP field/generic failures, successful response canonicalization, disabled save before current data, teacher/batch switching and delayed requests/mutations. Add classroom mocks/contract fixtures because current handlers do not implement these endpoints. Built-SPA Playwright runs against real local API, not Vite dev/MSW, with two teachers and one completing active student plus an inactive member. Homework counts receive database fixture coverage; no new homework journey is introduced just to satisfy E2E.

Run the full backend suite at integrated completion because shared classroom serialization/query plumbing changes. Relevant broader recovery browser checks run if shared write/auth/session files change or integration exposes a concern. Existing answer recovery, auth implementations and finalized history are dependencies, not work to repeat. Record commands, versions, counts, timings and any failure/unexecuted gate in the owning handoffs. Runtime provisioning is underway; availability is not a presumed blocker. If required checks cannot execute, readiness stays DRAFT/IN PROGRESS with the precise unexecuted gate.

## Files, dependencies and implementation ownership

Prefer human-integrated main containing frozen baseline → workflow → answer recovery → continuous context → closed context V2. If work begins before that integration, record the final authorized setup descendant as exact base; create `feat/teacher-dashboard` for F1 from it. Create F2 `feat/batch-level-assignment` stacked on the integrated F1 commit because both touch shared classroom/hooks files. Each has a distinct feature tracker (`docs/features/teacher-dashboard.md`, `docs/features/batch-level-assignment.md`), exact base, prerequisites and feature-only/full-main comparison ranges. This scope owns approved requirements; each tracker owns only its feature's active progress. No commit/push to main or frozen feat-Sagar; no force push. Publish authorized feature branches; draft/PR-ready handoffs target main and state prerequisite integration order, with backend contract preceding F2 frontend rollout.

Two implementation agents have exclusive ownership: one backend writer and one frontend writer. Each produces F1 commits first. Coordinator integrates and checks F1, then each writer produces F2 commits from that integrated checkpoint. Shared files are never edited by competing agents/worktrees at the same time. Independent frontend/backend work may run together with the agreed contract; reviews inspect named integrated commits.

| File area | F1 responsibility | F2 responsibility / sequencing |
|---|---|---|
| `backend/apps/classroom/views.py`, `serializers.py`; small `reporting.py` only if needed | Read aggregates, active sets, primary reads, count maps. | Assignment validation/serialization/atomic writes. F2 modifies only after F1 changes are integrated; one backend writer owns these shared files at a time. |
| `backend/apps/classroom/tests/test_views.py`; focused reporting/assignment test modules | Correctness, ownership, budgets, router refresh. | Assignment API, atomicity/concurrency and no progress/access change. Dedicated test files may proceed independently with agreed fixtures. |
| `frontend/src/shared/api/queries/useBatches.ts`, `useRoster.ts`, `useTeacherLevelDashboard.ts` | Identity/freshness/invalidation and cancellation guards. | Extend batch payload for IDs; issuing-owner mutation behavior. Shared useBatches edits happen sequentially after F1. |
| `frontend/src/features/teacher/TeacherDashboardPage.tsx`, `BatchDetailPage.tsx`, `TeacherLevelDashboardPage.tsx` | Refresh/states/lesson-ID mapping. | Existing BatchDetail assignment editor. BatchDetail integration sequential after F1. |
| Teacher catalogue hook using existing `/levels/`; `frontend/src/shared/types/index.ts` | Existing shared API contract remains consistent. | Identity-scoped catalogue projected to IDs/order/names, Batch field added; no student unlock redesign. |
| `frontend/src/features/teacher/CreateBatchModal.tsx` | Existing behavior preserved. | Only generic failure fallback; no assignment controls in create modal. |
| `frontend/src/mocks/handlers.ts`, `frontend/src/api/openapi.yaml`, teacher tests/e2e | Teacher read fixtures and contract. | Additive assignment fixtures/schema; restrict schema edits to the affected classroom routes/types. Shared edits have one owner sequentially. |
| Feature handoff/scope docs, PROJECT_BRIEF/AI_DEV_LOG milestone | Coordinator owns approved scope and F1 status/evidence in teacher-dashboard tracker. | F2 tracker owns assignment status/evidence on stacked branch; shared scope referenced from both, without duplicate active state. |

No migrations, new database tables, new runtime dependencies, global router changes, progress writer changes, new API endpoint or service, AWS mutation or deployment is planned. `users/stats.py` supplies preserved formulas but is not a change target. File expansion is permitted only when necessary to implement/test these explicit criteria; new product behavior needs fresh signoff.

## Product decisions and separate work

The three agents can approve the exact defaults above without a further generic human approval. There is **no blocking unresolved product decision within this slice**. Reviewers must flag a genuine contradictory source decision before coding. New ADMIN permissions, joins/reactivation, consent/retention policy, archived visibility, account inactivity policy, metric redesign and assignment-based learning restrictions require separate human decisions and new scope; they do not delay the constrained reporting slice.

Keep these prerelease reliability repairs separate: malformed dummy PBKDF2 login hash/real-hasher checks; account-deletion/audit integrity; clean Docker context/non-root image verification; internal HTTP health vs HTTPS/Compose/bootstrap alignment; broader auth refresh identity races; CI artifact/source ownership; live logs/backup/topology; realistic isolated load/cost evidence. Reproduce current defects before fixing them. Tournament rounds stay deferred until eligibility/content/timing/reconnect/attempt/scoring/tie/organizer rules are approved.

## Signoff request and completion boundary

PM, CTO and Head QA must each approve the exact same final scope version and SHA-256 content digest, recorded in the owning feature handoffs before implementation. This final text is not an implementation permission until all three reviews agree. Coordinator publishes the final scope and approvals, then records measurements before feature code. Meaningful milestones receive commit checkpoints and updated next action.

Done means both bounded features and required executed checks are complete on the published authorized branch, with a named reviewed commit and truthful limitations. READY FOR HUMAN REVIEW does not mean merged, deployed, hosted CI verified or production capacity/live behavior established.
