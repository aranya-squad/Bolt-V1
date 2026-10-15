# Bolt V1 — Behaviour Analytics: Final Simplification & Architecture Decision

**Document:** 05 — FINAL simplification review (supersedes implementation preference in earlier drafts, which remain as history)  
**Date:** 2026-10-15 | **Feature:** BA-ANALYTICS-001  
**Repository:** [aranya-squad/Bolt-V1](https://github.com/aranya-squad/Bolt-V1)  
**Planning branch:** `feat/behavior-analytics-discovery-plan-2026-10-15`  
**Base:** `main`, observed latest `0d209947e44675770f6b1fd7ac271d4cc4e4e832`; branch has planning-only commits.  
**Status:** final *recommendation*, **not** frozen scope/three-agent approval. Code read-only; documentation writes only. No deployment/test run/live-data access.

> **Evidence hierarchy:** Inspected application code on main; separately inspectable feature branches and issue/PR status; current product operations, actual production metrics dashboard and deployment version **unverified**. Source-path suggestions must be rechecked against the **chosen integration head**, especially after PR #2/#3 or Answer Recovery/Daily Quests merges. Do not treat a branch marked READY FOR HUMAN REVIEW as merged or live.

## 1. Final product recommendation

**Ship one small source-first analytics feature, not an event analytics platform.** Reuse existing records to calculate four metrics, expose them via one strict ADMIN-only read contract, and place the results in the **verified existing admin metrics view** once located. If that view is not in this repository, add the smallest appropriate ADMIN-only page without copying the import tool or Django admin. First release needs **no browser tracking SDK, no new event table, no background analytics queue, no new identity solution, no special analytics database and no change to gameplay writes**.

The first deliverable can answer:
1. Are students learning meaningfully each week?
2. Do new students reach first value within seven days?
3. Do started sessions complete within a fair, mature observation window?
4. Do teachers reach first class enrollment within 14 days?

It cannot yet truthfully answer *which exact pre-start screen caused abandonment*; that needs either qualitative investigation or specifically permitted opt-in telemetry later. Mark such steps **NOT MEASURED**, not "0" or "dropped". Weekly Meaningful Active Students is a **possible later North Star**, not selected.

## 2. Proven infrastructure already available — reuse vs rebuild

| Existing, verified area | Main source/route | How analytics can reuse it | What NOT to implement again |
|---|---|---|---|
| User accounts & roles | `backend/apps/users/models.py` User(role,created_at); `/api/v1/auth/me/` | Student/teacher signup cohorts and server-side ADMIN auth | Registration, auth, account roles, new identity mapping |
| Classroom & enrollment | `backend/apps/classroom/models.py` Class(teacher,created_at), Enrollment(enrolled_at,class_room,student); `/api/v1/classes/`, `/api/v1/classes/join/` | Teacher-first-class and first-enrollment funnel | Class setup, enrollment, joins, another teacher onboarding backend |
| Session lifecycle | `backend/apps/exercises/models.py`; `/api/v1/practice/start/`, lesson/classwork start, `/api/v1/sessions/{id}/submit/` | Unique starts by UUID, completed-at timestamps, type/kind | Event-copy of "started", "completed"; altering exercise APIs |
| Attempts & results | `backend/apps/progress/models.py` QuestionAttempt, ProgressRecord; `backend/apps/progress/services.py` | Validate attempted question indices, completed learning and educational guardrails | New attempt ledger or duplicate scoring/progress update |
| Existing HUD stats | `backend/apps/users/stats.py`; cached `auth/me/` stats | Reuse *metric definitions* only where appropriate, e.g. current level/accuracy as context | Don't aggregate user-scoped cached HUD endpoint across accounts or extend it into a global analytics endpoint |
| Admin permissions | `backend/apps/users/permissions.py` IsAdmin; `frontend/src/features/shared/RoleRoute.tsx` and protected router | Server IsAuthenticated+IsAdmin, frontend RoleRoute ADMIN | New RBAC system, relying on frontend hiding alone |
| Admin UI entry | `frontend/src/router.tsx` has `/admin/import-questions`, `frontend/src/features/admin/AdminImportPage.tsx` | Route convention, basic UI building blocks and API client | **Don't reuse import form** as analytics or claim it is the metrics dashboard |
| Django admin | `backend/config/urls.py` `/admin/` | Optional low-UI-cost internal reporting location if owner confirms | Bespoke replacement of Django admin |
| API contracts and query hooks | `frontend/src/api/openapi.yaml`, `frontend/src/shared/api/client.ts`, existing query hooks | One typed GET + reusable Axios/TanStack patterns and MSW | Another API client, cache manager or request-layer SDK |
| Optional infra | PostgreSQL default + optional replica, Django, Redis, Celery (settings) | Start with bounded SQL on primary; only add cache/async **after measured need** | Warehouse, event bus, ETL, mandatory Redis/Celery analytics tasks |

**Why first-party matters here:** the platform serves children and may operate in several jurisdictions. An internal aggregate endpoint is still personal data processing, but avoids another vendor receiving a behavioral event stream by default. Any *new* optional child interaction logging needs an explicit legally reviewed educational purpose and controls.

## 3. Other branches already building related capabilities — protect them

**Latest ref inspection (2026-10-15):** `main` still showed the governance merge as latest commit; the following branch features are separate, not assumed integrated. PR #2 (teacher dashboard), #3 (batch assignments), and #4 (release/CI hardening) were open at inspection. Active branch state changes must be rechecked just before coding.

| Separate work | Observed status/evidence | Intersection with analytics | Non-duplication rule |
|---|---|---|---|
| `feat/teacher-dashboard` / PR #2 | `docs/features/teacher-dashboard.md` marked READY FOR HUMAN REVIEW; `backend/apps/classroom/views.py`, `tests/test_reporting.py` use batched **primary** reporting and ownership/perf fixtures | Overlaps teacher cohorts and aggregate efficiency | **Never rebuild roster or per-level student progress, modify teacher reporting endpoints, or repeat its optimization tasks.** Borrow stable primary-read/query-budget test techniques and Class/Enrollment models only. |
| `feat/batch-level-assignment` / PR #3 | `docs/features/batch-level-assignment.md` marked READY FOR HUMAN REVIEW; reuses Class.assigned_levels M2M + PATCH and teacher UI | Might influence teacher activation journey in future | **Don't add assignment controls or enrollment schema for analytics.** Teacher activation stays teacher -> Class -> Enrollment, irrespective of levels. |
| `feat/answer-recovery` | `docs/features/answer-recovery.md` describes ready-for-review v2 answer receipts, session resumption and stored pending answer manifests; v2 attempts API builds on existing session URLs | Critical to meaning of persisted-answer and completion stages | **Don't reimplement answer delivery/retry/resume or write to its frontend store.** Read confirmed QuestionAttempt/ProgressRecord only, and reuse its tests at integration; allow historical old-session undercapture. |
| `feat/daily-quests` | `docs/features/daily-quests.md` marked READY FOR HUMAN REVIEW; DailyQuest model and /daily-quests/today + /start, linked existing ZEN/test-mode session | May change what counts as “meaningful” student session | **Do not create a second Daily Quest, DAU/streak source, quest session event stream or quest counter.** Qualifying work counts via ArenaSession once. If branch integrates, only optional diagnostic `DailyQuest.session_id` lookup distinguishes quest-origin ZEN; don't double-count. |
| `chore/ai-sdlc-harness-improvements-2026-10-14` and current main governance | `docs/AI_SDLC.md`, `skills/feature-scoper/SKILL.md`, scripts/check_feature_gate.py | Required feature planning/signoff | **Don't build another QA/agent-gate framework.** Consume current templates/checker and independent approvals. |
| Existing session and classroom tests on main | exercises test_views/test_tasks; classroom test_views, frontend Vitest/Playwright | Regression baselines | **Add only metric-specific tests; run existing suites unchanged.** Do not clone tests or weaken assertions to "pass" analytics. |

### Integration order warning
Teacher branch docs report **stacked dependencies** including Answer Recovery, teacher reporting, and batch assignment. Daily Quests likewise appears on its own branch. Do not cherry-pick their implementations into analytics. The developer must refresh and select the authorized current integrated head, reconcile API/data contracts, and obtain human-approved merge order. A docs branch built on `main` is not an integration branch.

## 4. Four metrics retained, with minimum viable definitions

Use **server-derived facts**, UTC half-open time windows, fixed cohort age and distinct-person/session counting; provide numerator/denominator, filters, as-of and definition version. Exclude only genuinely identified synthetic/demo/staff actors by a **documented** policy; if unknown, label unknown instead of guessing from email patterns.

| ID | Metric and value | Data inputs | Edge rules |
|---|---|---|---|
| **M1** | **Weekly Meaningful Active Students** — distinct STUDENT accounts with >=1 qualifying completed session in last **completed UTC Mon–Sun week**; primary unit count, **not ratio** | User + ArenaSession + ProgressRecord + QuestionAttempt | Initial qualifying rule: >=5 distinct non-skip question indices within a finalized session; validate against actual lesson lengths and new five-question quests before freeze. Multiple modes/users never inflate total. |
| **M2** | **First Value Activation (7d)** — matured new STUDENT signups with first M1-qualifying session finalized before +168h / all eligible matured new student signups | User.created_at; qualifying sessions | Only registrations whose full window elapsed; count one student once; no session / unfinished / finished but too short are diagnostics. |
| **M3** | **Session Completion (48h)** — unique STUDENT sessions finalized with ProgressRecord within +48h / server-started sessions whose full 48h window elapsed | ArenaSession.started_at/submitted_at; ProgressRecord; optional abandoned_at | Resume same UUID once; abandoned_at may be Celery inference, **not deliberate quit**. Separate late-finalized, abandoned, still-open/unknown. Mode breakdown. |
| **M4** | **Teacher Onboarding Activation (14d)** — new TEACHER signups that create a Class and achieve an Enrollment within 336h / matured new teacher signups | User.created_at, Class.created_at/teacher, Enrollment.enrolled_at | Teacher first-enrolled-class, **not teaching outcomes**. Student in multiple classes cannot be attributed to a teacher's session without new approved identity link. |

**M1 quality trade-off:** five distinct non-skip attempts is **not guaranteed to represent learning quality**; it is a defensible initial volume filter. The developer must compare distribution of shorter lessons, Daily Quests and practice modes using **synthetic / separately authorized staging** before PM freezes it. If this threshold materially misclassifies valid short lessons, raise a narrow definition decision; don't unilaterally alter the product metric.

**North Star decision:** after four complete comparable weeks with reconcilable data and quality guardrails, decide whether M1 is fit. Do not implement a live automatic North Star selector.

## 5. Two funnels: reuse records; be honest about blind spots

**Student (available in V1):** signup User -> server-created ArenaSession -> persisted first non-skip QuestionAttempt -> finalized ProgressRecord -> qualified session. The persisted first attempt is **unreliable as the timing of the child's action** in main practice flows because answers are buffered and may bulk-save later. After Answer Recovery merge, server receipts improve reliability but historical records remain incomparable. Funnel stages must say **server-observed**, not “opened screen.” A funnel step count must be same-cohort and ordered within agreed windows.

**Teacher (available in V1):** eligible TEACHER registration -> owned Class created -> linked Enrollment within 14 days. The existing optimized roster and per-level dashboard are **not** the admin aggregate journey; use source tables, not HTTP calls to every teacher's roster endpoint.

**Not yet observable:** screen impression, onboarding completed (current onboarding uses localStorage), intent to start a session when API fails, where users click, and reason for leaving a page. Browser-only behavior is optional, not a precondition for M1–M4.

## 6. Chosen minimal architecture

~~~text
                  Existing PostgreSQL authoritative tables
         User / Class / Enrollment / ArenaSession / QuestionAttempt /
                            ProgressRecord
                                 |
                   New bounded read-only SELECTs
           (no session/progress writes; primary for initial parity)
                                 |
           Small DRF ADMIN-only GET /api/v1/admin/insights/
                                 |
               Existing apiClient + TanStack Query
                                 |
     VERIFIED admin metrics UI (or one minimal ADMIN-only route)
                  Four KPI cards + two funnels
~~~

**Backend:** propose a narrowly owned reporting/query service (either a small dedicated `backend/apps/analytics/` app if new app truly needed, or a minimal module under existing package where ownership clearly fits), plus one URL handler. Prefer a **small existing-app module** first to avoid an additional Django app/migration; confirm repository owners' preferred boundary in G1. Reuse `IsAdmin` server permission and existing `backend/config/urls.py` `api/v1/` inclusion conventions. No POST collector, event table, schema migration, cron job, Redis/Celery job, replica switch or new dependency in base W1.

**Frontend:** reuse existing protected ADMIN route family, shared UI primitives and hooks. **Do not expose raw student or teacher rows**; all response fields aggregate counts or suppressed small cohorts. Do not replace dashboard components already in use or teacher-specific pages.

**Efficiency:** compute at requested bounded interval (initial 4 completed weeks, max 90 days as a proposal to freeze) with `Exists`, subqueries, filtered Count, not unbounded raw attempts into browser. Reconcile counts on isolated PostgreSQL with real-mode fixtures; use EXPLAIN on synthetic/staging only. Cache daily summaries or read replica **only if measured** and with freshness invalidation. Primary-pinned reporting patterns from teacher work are useful, but avoid retrofitting that branch.

**Minimal read response contract idea (shape subject to G1):**
~~~json
{
  "definition_version": "1.0",
  "reporting_timezone": "UTC",
  "as_of": "2026-10-15T00:00:00Z",
  "period": {"start": "...", "end_exclusive": "..."},
  "metrics": [
    {"id": "M1", "value": 0, "numerator": 0, "denominator": null, "status": "ok"}
  ],
  "funnels": {"student": [], "teacher": []},
  "data_quality": {"complete": true, "notes": [], "source": "canonical_db"}
}
~~~
Use a stable schema in actual OpenAPI contract; never use sample zero as real measured value. Approval may instead require 4 explicit metric keys for easy frontend contracts.

## 7. Simplified delivery gates, avoiding premature extras

| Gate | Deliverable | Why now | Gate result |
|---|---|---|---|
| **G0** | Recheck refs / PRs; identify real admin metrics page; inspect main+tested features; agree child-data lawful purpose; identify demo accounts | Prevent integration duplication, inaccurate data, privacy surprise | RESEARCH / BLOCKING DECISIONS |
| **G1/G2** | Freeze signed NEED scope, acceptance IDs, tasks and single scope SHA-256; independent PM/CTO/Head QA + Security/Data if required | Already mandated by project, don't replace | **NO CODING until PASS** |
| **W1** | One DB source-derived reporting service + ADMIN-only read endpoint + tests | All four KPIs and both funnels obtainable from current tables | MUST |
| **W2** | Integrate into verified existing admin, or one compact fallback admin screen | Makes analysis actionable with minimum UI | MUST |
| **W3** | Independent QA, DB reconciliation, perf benchmark, release handoff | Prevent mistaken conclusions or data exposure | MUST |
| **W4** | Optional manual research or *separately approved* handful of first-party UX events | Only if pre-start dropoff cannot be understood | **DEFER / CONDITIONAL** |
| **W5** | Weekly product interpretation / later North Star decision | Measurement is a means to improve UX | OPERATING PROCESS |

**Removed from the mandatory first release:** vendor tools (PostHog/Amplitude/Mixpanel), Clarity/heatmaps/session replay, click tracking, auto events, Kafka/ETL/warehouse, background aggregates, persistent analytics tables, realtime graphing, event schema registry, teacher-specific dashboard rebuilds, new progress backend, extra teacher attribution link, custom experimentation infrastructure, new feature flags service.

## 8. Risks / decisions with explicit owners

| ID | Priority | Owner decision | Consequence if unresolved |
|---|---|---|---|
| R1 | P0 | Owner + Admin/Frontend engineer: locate actual admin metrics dashboard, including possible other repository/branch | W2 integration design cannot be frozen; fallback new route conditional |
| R2 | P0 | Product + Data: eligible cohort (demo/test/staff), active/inactive, imported accounts, meaningful >=5 threshold | Four metric counts may be misleading; implementation blocked on definition |
| R3 | P0 | Legal/Privacy/Security: legitimate educational operational analytics use of existing identifiable child records and any geographic obligations | No production rollout; optional UX events always OFF until separately authorized |
| R4 | P0 | PM/CTO/QA/Security/Data: genuine independent G1 scope-signoff and G2 task mapping | No coding authorized by this documentation |
| R5 | P1 | Engineering: branch integrations, available session receipt version, teacher reporting tests and DailyQuest FK | Prevent conflict, duplicate work and historical metric drift |
| R6 | P1 | Engineering/QA: query volumes, p95, primary vs replica, Celery runtime | Query efficiency & freshness tradeoffs unproven |
| R7 | P1 | Security/BA: low-n masking (suggest n<10), no user-level payload, deletion/recomputation policy | Student privacy/data-quality acceptance cannot pass |

## 9. Minimal success contract (not executed yet)

- **SC-01** Four and only four top-level KPIs, n/N where applicable, stable definition_version, UTC period/as-of, mature cohort handling and explicit empty/unknown status.
- **SC-02** SQL-derived counts match independent fixture counts including repeated answers, exact session UUID resume, skips, 48h late results, multi-class students, 7d/14d censoring, DailyQuest-origin sessions if integrated.
- **SC-03** STUDENT/TEACHER/anonymous cannot read platform insights (401/403 appropriately); aggregate response never contains PII or per-child data. Small cohorts suppressed/annotated under policy.
- **SC-04** Existing auth, sessions, score/XP, progress/recovery, teacher rosters/assignments and quests behave **exactly as before**, confirmed by their existing tests on the **actual chosen integration tree**.
- **SC-05** Existing admin metric tiles are not deleted or duplicated; if dashboard source is unverified the fallback is a clearly owned new minimal route, not a guessed overwrite.
- **SC-06** Real-API/mocked component tests verify loading/error/no-data and desktop/mobile usage, no frontend-only permission boundary.
- **SC-07** Isolated representative-volume SQL plan/latency and reconciliation satisfy agreed threshold; no dependency on new infrastructure in baseline.
- **SC-08** Actual independent required role signoffs and G1/G2 happen before code; no merge/deploy/production action without human authorization.

**Read next:** [06-developer-implementation-handoff.md](06-developer-implementation-handoff.md), with task-by-task dependencies, owner/module routes, checks and exact success criteria.

## 10. Documentation provenance

Preceding review package: [Draft 1](01-draft-v1.md), [adversarial role perspectives](02-adversarial-role-review.md), [Draft 2](03-draft-v2.md), [Lead BA synthesis v3](04-final-lead-ba-plan.md). Prior role perspectives are explicitly **not independent runnable agents or signatures**. All dates, source checks and PR statuses in this file are snapshots, not substitute for fresh development-session verification. Approval and release state remain PENDING / NOT MERGED / NOT DEPLOYED.
