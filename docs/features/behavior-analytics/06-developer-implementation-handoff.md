# Bolt V1 — Behaviour Analytics: Developer Implementation Handoff
## Execution-ready *plan* (no coding authorization)

**Feature ID:** BA-ANALYTICS-001 | **Plan version:** 1.0 | **Date:** 2026-10-15  
**Author perspective:** Senior Business Analyst / Product + Engineering handoff  
**Source:** [05-final-simplified-architecture.md](05-final-simplified-architecture.md)  
**Repository:** `aranya-squad/Bolt-V1`; **planning branch:** `feat/behavior-analytics-discovery-plan-2026-10-15`; source verified against `main@0d209947e44675770f6b1fd7ac271d4cc4e4e832` and separately inspected branch code.  
**Boundary:** This document is the requested **planning artifact**. No app code, tests, migrations, runtime, production queries, merge or deployment has been changed. Implementation MUST wait for frozen-scope digest + real independent PM, CTO and Head QA (and Security/Data where routed) approval and G1/G2 pass per `docs/AI_SDLC.md`. The role-based adversarial review in 02 was not separate actual agents.

### How to hand this off
Developer/technical lead starts at **W0**, not with an analytics SDK. Read AGENTS.md, BOLT_BOOTSTRAP.md, docs/PROJECT_BRIEF.md, docs/CONTEXT_INDEX.yaml, docs/AI_SDLC.md, current `docs/features/behavior-analytics.md` and [05-final-simplified-architecture.md](05-final-simplified-architecture.md). Recheck remote main, PRs and pending branch integrations before adopting file paths, assumptions or API signatures. Treat this as a **task backlog awaiting formal scope authorization**, not a substitute for the project's G1/G2 scope and execution JSON.

## 0. Implementation strategy, priorities and stop conditions

**MVP outcome:** four admin-level metrics + two server-observed funnels + transparent missing-data states, driven by the **existing** Django/Postgres records and shown in an **existing verified** admin metrics dashboard (fallback: one small new ADMIN-only route).

**Priorities:** P0 = blocks correctness/privacy/release; P1 = MVP usability/integration; P2 = nice-to-have or controlled deferral. No task creates a separate event platform or attempts to diagnose precise page-level friction by guessing.

**Safe stop conditions:** If actual admin dashboard location, eligible cohort definition, relevant child-data purpose or current branch integration state is unresolved, **do not implement affected path**. Continue independent synthetic-spec/test planning. If G1 missing/stale, no feature code. If a child-analytics risk arises, optional telemetry remains disabled and separate W5 cannot start.

### Delivery map
| Wave | Category | Output | Priority | Dependency |
|---|---|---|---|---|
| **W0** | Discovery, de-duplication & governance | Verified integrated baseline, existing admin surface, metric dictionary, privacy decision, freeze/signoffs | P0 | None |
| **W1** | Backend metric service + contract | Four source-truth metrics, two funnel count sets, one secure DRF GET, tests | P0 | W0 / G1,G2 |
| **W2** | Admin frontend, reuse-first | Existing admin metrics extended without duplication; or conditional small route | P1 | W1 contract frozen and testable |
| **W3** | QA/security/performance and human handoff | Reconciled counts and no regressions, independent review / CI evidence | P0 | W1+W2 |
| **W4** | Product metric operation | Weekly interpretation and eventual North Star decision | P1 non-code | Post-release authorized data |
| **W5** | OPTIONAL separate UX intention telemetry | Only tiny explicit events to answer an unresolved decision | P2 deferred | New scope + child privacy approvals |

**Suggested ownership:** One senior backend/data developer for W1 query service/API/tests; one frontend developer for W2. CTO/lead coordinates contracts and review. QA has independently owned fixtures/checks. At most two concurrent coding writers with disjoint files, and only after G2.

## 1. Dependency and duplication register — MANDATORY before selecting code tasks

| Feature / capability | Current repo evidence, checked 2026-10-15 | Dependency action | Must remain unchanged and covered |
|---|---|---|---|
| Base `main` | React 18/TS/Vite, Django DRF, Postgres, sessions, class/enrollment, XP/progress; main commit `0d209...` | Exact SHA and fresh source check; assess whether more branches have merged | Register/auth, progress scoring, exercise endpoint semantics |
| Teacher Dashboard `feat/teacher-dashboard` / PR #2 | Source and `backend/apps/classroom/tests/test_reporting.py`, tracker READY FOR HUMAN REVIEW, optimized primary-backed roster/matrix | **Inspect only**, do not cherry-pick; if integrated, reuse primary-read query/testing patterns | Roster, teacher-level reporting, ownership, query-budget fixtures |
| Batch assignment `feat/batch-level-assignment` / PR #3 | Class.assigned_levels M2M and PATCH editing in branch; tracker READY FOR HUMAN REVIEW | Don't implement or edit class assignment. If integrated run assignment tests | PATCH transaction, teacher catalogue, assignment persistence |
| Answer Recovery `feat/answer-recovery` | v2 receipt/manifest/replay-safe attempts, existing session routes, pending flush/recovery frontend stores | Don't implement new attempt beacon/submit retries. Recheck version/branch before final QA | session resume, no duplicate attempts, correct persisted results, old client compatibility |
| Daily Quests `feat/daily-quests` | `DailyQuest` linked to existing `ArenaSession`; /daily-quests/today + /start; tracker READY FOR HUMAN REVIEW | Don't create daily quest event counter. If integrated, test existing quest sessions in M1/M3 | five-question quest, no reward/score or lifecycle changes |
| Release/CI hardening / PR #4 | Draft PR, independent work | Do not modify workflow/config unless explicitly required in signed scope | Existing CI and release gating |
| `auth/me` cached HUD stats | `backend/apps/users/stats.py`, 60s per-user cache | Read reference only; don't reuse its per-user request endpoint for platform analytics | HUD totals, cache identity boundaries |
| ADMIN tool | `frontend/src/router.tsx` /admin/import-questions, Django `/admin/` | First locate separate user-described metrics dashboard; use existing entry components and permissions only | XLSX import must remain fully functional |
| Feature governance | `docs/AI_SDLC.md`, `skills/feature-scoper/SKILL.md` | Use existing scope/plan/validation scripts, no new automation scaffold | No development before G1/G2; human merge/deploy |

**Integration invariant:** Branch is *not* production. Some trackers have historical CI PASS; those do not prove the current integration tree, deployment or this feature's tests. Every branch issue must be classified as (a) already merged, (b) separate approved/pending, (c) irrelevant. Don't duplicate (b) in our plan.

## 2. Wave 0 — Pre-build audit, policy, frozen scope | P0 | BA + Tech lead + QA

### Category W0-A: Repository integration and admin route inventory

**W0-A01 — Establish exact source and outstanding-feature state**  
**Priority:** P0 | **Owner:** tech lead | **Dependencies:** none  
**Description:** Query remote main/ref heads, compare PR #2/#3/#4, `feat/answer-recovery`, `feat/daily-quests` and this docs branch. Read target files and integration/release handoffs before making an implementation branch. Build an ownership/dependency table indicating what is on selected base, still unmerged, or being tested. Confirm existing tests to use as regression, not rewrite.
**Success criteria:**
- SC-001: Evidence report gives exact base SHA, current open PR statuses, relevant feature-branch SHA and whether each capability exists in *selected* code tree.
- SC-002: Every overlap in §1 assigned **REUSE**, **INTEGRATION PREREQUISITE**, or **DEFER**, with no work item copied from existing feature scopes.
- SC-003: No branch merge, cherry-pick, deploy or modification to other feature branches is performed as part of this audit.

**W0-A02 — Locate the current admin analytics surface and preserve metrics**  
**Priority:** P0 | **Owner:** frontend lead + owner | **Dependencies:** W0-A01  
**Description:** Search app router, admin components, any connected admin repository or independent app, and current accepted deployment ownership evidence for the existing metrics dashboard described by the owner. Main only confirms /admin/import-questions and Django /admin/. Record page path, data source, existing KPI cards, permission model and code owner. Decide **reuse existing** vs **tiny fallback admin route** before W2 tickets freeze.
**Success criteria:**
- SC-004: Specific code ref/path for genuine dashboard recorded, or **NOT FOUND / UNVERIFIED** with owner-approved fallback route.
- SC-005: Existing metric labels, APIs and calculations documented so W2 neither renames nor double-adds tiles; no replace/delete of current dashboard.
- SC-006: Integration option has a named code owner and stays within existing router/auth patterns; no second admin app invented.

### Category W0-B: Data meaning and privacy

**W0-B01 — Freeze candidate metric dictionary and eligibility policy**  
**Priority:** P0 | **Owner:** PM/Lead BA + Data/QA | **Dependencies:** W0-A01  
**Description:** Inspect User, Class, Enrollment, ArenaSession, QuestionAttempt and ProgressRecord. Write versioned M1–M4 definitions with exact UTC inclusive/exclusive boundaries, actor exclusions, >=5 distinct non-skip attempts *as a hypothesis*, mature 7d/14d/48h windows and late/inconsistent state taxonomy. Investigate pilot/internal/test accounts without relying on emails or role inference. Resolve active/inactive and deleted account/reporting behavior. Validate whether DailyQuest short fixed five-question sessions are included without any separate quest counter.
**Success criteria:**
- SC-007: Every KPI specifies unit, exact numerator, denominator or null, reporting cohort, eligibility, observation lag, source tables and at least 2 negative examples.
- SC-008: Registration-to-first-value/teacher windows are based on true User.created_at; 48h session window based on ArenaSession.started_at; same entity never counted twice per numerator.
- SC-009: Formal owner resolution for meaningful-activity threshold and non-production exclusions, or explicitly P0 BLOCKED; no silent fallback that contaminates dashboard.

**W0-B02 — Clarify allowed educational analytics and child privacy**  
**Priority:** P0 | **Owner:** privacy/legal + security + product owner | **Dependencies:** W0-B01  
**Description:** Record lawful purpose and approved access for aggregating existing child session data, applicable country requirements and data minimization. Establish no optional behavioral UI telemetry in baseline; admin-only aggregates with cell-size suppression rule (suggest suppress segments <10 distinct people, needs approval), deletion/retention and audit requirements. Consult jurisdiction-specific guidance (DPDP phased rules, COPPA, GDPR/UK where applicable) rather than assuming an exemption.
**Success criteria:**
- SC-010: A written and named privacy/legal decision covers base operational metric queries, cohort eligibility, masking and handling of deletion/consent evidence.
- SC-011: No new event/cookie, browser fingerprint, child screen replay, raw answer/PII forwarding, or third-party analytics SDK authorized by this task.
- SC-012: If counsel has not approved production use, keep endpoint/page release disabled and classify gate **BLOCKED**, not "safe because aggregated".

### Category W0-C: Existing formal feature gating

**W0-C01 — Produce/freeze proper AI-SDLC artifacts and obtain authentic approvals**  
**Priority:** P0 | **Owner:** PM/CTO/Head QA, Security/Data | **Dependencies:** W0-A02, B01, B02  
**Description:** Derive `docs/features/behavior-analytics.scope.md` (freeze exact bytes with SHA-256), `docs/features/behavior-analytics.plan.json` (AC mappings and Wave→Category→Story→Task), and update feature tracker per existing template. Have separately executing PM, Senior Tech Manager/CTO and Head QA examine same digest; route Security/Data due to student data. Do not claim prior role-perspective critique counts as these signoffs.
**Success criteria:**
- SC-013: Same scope digest approved by **actual independent** mandatory roles; no open blocker and explicit security/data decisions recorded.
- SC-014: Existing `scripts/check_feature_gate.py --gate G1` passes on actual artifacts, followed by G2 passing with exclusive ownership/acceptance traceability.
- SC-015: No feature code starts before passing gates; a material scope change re-freezes/re-approves.

**W0 exit:** SC-001..015 satisfied. If missing the genuine admin page, owner explicitly accepts small fallback and that decision is incorporated in G1. If legal basis unresolved, base product data exposure is blocked. W1/W2 should not begin by assuming pending branches are main.

## 3. Wave 1 — Backend metrics with existing schema and endpoint style | P0

**General non-duplication rule:** W1 reads User/Class/Enrollment/ArenaSession/QuestionAttempt/ProgressRecord; **does not edit** `backend/apps/progress/services.py`, exercise creation/attempt/finalize endpoints, Classroom CRUD or answer recovery contracts. Reuse current DRF settings/auth and a small query helper. No new tables/migrations by default.

### Category W1-A: Canonical query implementation

**W1-A01 — M1 source-derived weekly meaningful activity**  
**Priority:** P0 | **Owner:** backend/data | **Dependencies:** W0-C01  
**Description:** Create a bounded query returning distinct student IDs with finalized session+ProgressRecord in completed UTC week and >=5 **distinct** non-skipped persisted question indices. Separate by session.kind for diagnostic counts, dedupe person in overall count. Handle record inconsistency as quality warning, no automatic repair.
**Success criteria:**
- SC-101: Synthetic student with five non-skip attempts to *one question* does **not** qualify; student with five distinct attempted indices and valid finalized record qualifies once even after multiple sessions.
- SC-102: Quest-linked ZEN session counts only once via ArenaSession (if DailyQuest integrated); Test Mode and other eligible kinds counted by same rules, no extra quest event.
- SC-103: Completed UTC week boundaries exclude future/incomplete week, half-open [start,end) exact; no student PII returned by aggregate endpoint.

**W1-A02 — M2 seven-day new-student activation**  
**Priority:** P0 | **Owner:** backend/data | **Dependencies:** W1-A01  
**Description:** Reuse same *qualifying-session predicate* from W1-A01, not a second slightly different metric implementation. Evaluate first qualifying finalized session within 168h of User.created_at only for signup cohorts old enough to have matured.
**Success criteria:**
- SC-104: Signup at as-of minus 6 days 23h excluded from numerator **and** denominator; matured signup at +168h boundary handled according to frozen half-open contract.
- SC-105: One qualifying session twice does not double-count a student; zero sessions and not-yet-qualified result appear in diagnostics without inventing “onboarding abandonment.”
- SC-106: Changing qualification predicate in one shared query definition changes both M1 and M2 consistently under versioned tests.

**W1-A03 — M3 completion window and honest incomplete states**  
**Priority:** P0 | **Owner:** backend/data | **Dependencies:** W0-B01  
**Description:** Use existing ArenaSession timestamps and ProgressRecord relationship. Cohort by session *start*, matured 48h. Report on-time completed and three other categories (late-finalized, server-abandoned, open/unknown); classify inconsistencies explicitly. Never mark a missing persisted practice attempt as user never tried.
**Success criteria:**
- SC-107: The same resume/reload session UUID remains one denominator; repeated finalize remains one completion.
- SC-108: Finalized at +47h with progress counts; at +49h is **late**, not on-time. Session younger than 48h excluded from final rate.
- SC-109: Abandoned_at is labeled server-derived inference; without Celery worker it is unknown/incomplete, not intention to quit; buffered and lost browser practice never falsely asserts no input.

**W1-A04 — M4 class enrollment activation without attribution errors**  
**Priority:** P0 | **Owner:** backend/data | **Dependencies:** W0-B01  
**Description:** Use TEACHER User.created_at, owned Class.created_at and related Enrollment.enrolled_at within 14d. Use EXISTS or distinct teacher aggregation; don't call teacher roster HTTP and don't join student exercise sessions as teacher results. Preserve historical first enrollment regardless of later is_active state, with optional active-now diagnostic only if approved.
**Success criteria:**
- SC-110: Two classes/ten enrollments yield one activated teacher; no enrollments yield zero; class/enrollment after 336h excluded; immature teacher omitted.
- SC-111: One student registered in two teachers' classes never causes a student session to be credited to both teachers; **no session/class FK or assignment migration** added.
- SC-112: Classroom CRUD, enrollment and assigned-level behavior unchanged; independent classroom/teacher reporting suites still pass on chosen tree.

### Category W1-B: API, schema and security

**W1-B01 — ADMIN-only Insights GET and API contract**  
**Priority:** P0 | **Owner:** backend/API + frontend contract owner | **Dependencies:** W1-A01..A04  
**Description:** Add one read-only API handler to existing DRF `api/v1/` namespace (suggest `GET /api/v1/admin/insights/`, final path frozen at G1), using `IsAuthenticated` and existing `IsAdmin`. Server validates period selection, bounded history, timezone convention and safe enumerated mode, with no arbitrary user/teacher/org lookup. Include schema revision, source/freshness, n/N/unknown statuses, two funnel count sets; no raw child rows. Update OpenAPI and typed DTO, not auth mechanism.
**Success criteria:**
- SC-113: Anonymous 401; STUDENT/TEACHER 403; ADMIN can query bounded valid period; malformed dates, >approved max range or arbitrary filters rejected with 400.
- SC-114: API returns *only aggregate counts* and metadata; never email, DOB, call sign, IP, join code, question text, raw answer, session/user UUID lists.
- SC-115: Four metric outputs match source fixture SQL exactly, show numerator/denominator nullability, UTC period and definition version; invalid data yields explicit quality status rather than 500 or zero.
- SC-116: Existing `/api/v1/auth/me/`, classes, sessions, report and import endpoints remain byte-compatible in their public responses except separately approved integrations.

**W1-B02 — Performance without a new service**  
**Priority:** P1 | **Owner:** backend/data + operations reviewer | **Dependencies:** W1-B01  
**Description:** Benchmark bounded queries on isolated PostgreSQL using production-like *synthetic* volume and `EXPLAIN (ANALYZE, BUFFERS)` in staging only. Reuse existing indexes where sensible, capture p95 under expected concurrent admin usage. Propose **no new Redis cache, materialized tables, Celery job, replica, warehouse or index migration** unless metrics show a concrete need and separately signed change.
**Success criteria:**
- SC-117: Actual query count, plans, row count, p50/p95, test hardware and chosen SLO are recorded (threshold signed before measurement; **do not invent latency PASS**).
- SC-118: Admin endpoint stays bounded and doesn't grow as N+1 per student/teacher. Existing optimized teacher primary-query budgets are not regressed by touching their code.
- SC-119: If SLO fails, evidence-backed minimal optimization ticket documented and approved; no silent extra infrastructure.

### Category W1-C: Backend regression and QA evidence

**W1-C01 — Deterministic source-truth unit/integration tests**  
**Priority:** P0 | **Owner:** QA/backend independent of query implementer | **Dependencies:** W1-A/B  
**Description:** Write frozen expected counts on synthetic PostgreSQL fixtures for four KPIs, two funnel steps, eligibility, late states and role negatives. Test with same DB engine semantics as production, not SQLite substitutions, and no live DB.
**Success criteria:**
- SC-120: All SC-101..116 covered with readable fixtures and expected count table signed by QA; discrepancies treated as code/spec defects.
- SC-121: Existing backend tests (progress/services, exercises/test_views + test_tasks, classroom/test_views, user auth/permissions) pass unchanged on chosen integrated tree.
- SC-122: If Answer Recovery, teacher reporting, batch assignment or Daily Quests are integrated, run their respective existing **feature-specific regression tests** and preserve identities, query budgets, session scoring and page behavior. If unmerged, mark those tests **NOT APPLICABLE TO HEAD**, do not copy the feature code/tests into this branch.

**W1 exit:** M1–M4 + both funnels available in a read-only, authorized source-derived endpoint, with correct fixtures, schema, role denial and acceptable measured cost. No new child UX tracking.

## 4. Wave 2 — Minimal admin UI integrating existing resources | P1

### Category W2-A: Routing and shared UI reuse

**W2-A01 — Integrate exactly one ADMIN insights surface**  
**Priority:** P1 | **Owner:** frontend | **Dependencies:** W0-A02, W1-B01  
**Description:** If owner verifies a current admin metrics page, extend its existing layout/state/API convention. Otherwise add only a lazy-loaded `/admin/insights` route under existing `ProtectedRoute` + `RoleRoute allow=["ADMIN"]`, reuse `Page`, `GlassCard`, `PageSkeleton`, existing apiClient/query patterns. Don't modify `AdminImportPage` behavior, teacher portal, onboarding or gameplay pages.
**Success criteria:**
- SC-201: No duplicate existing KPI tile/endpoint, no second admin shell, no student/teacher link to platform insights; existing admin metrics remain intact.
- SC-202: Frontend non-admin route redirects/denies **and** server 403 is separately tested; authenticated refresh/account switch doesn't show prior admin data to a student/teacher.
- SC-203: Same UI works on normal laptop and 320px mobile width with accessible labels and keyboard navigation.

**W2-A02 — Four decision-ready metric cards**  
**Priority:** P1 | **Owner:** frontend | **Dependencies:** W2-A01  
**Description:** Render M1..M4 only, respecting API's definition/version and exact period. Show M1 primary count, M2/M3/M4 percent+numerator/denominator, mature window and freshness. Avoid recomputing or rounding business definitions inconsistently on frontend. Show zero-data vs unavailable as different states.
**Success criteria:**
- SC-204: Exactly four headline cards with correct n/N and timeline, display correct UTC week/7d/48h/14d labels; hover/help text gives user a definition and explains limitations.
- SC-205: No "0%" on N=0, no implied complete comparison for immature cohort, no hidden unsupported device/tenant segmentation.
- SC-206: Low-n suppression and state from API applied consistently across cards and breakdowns.

**W2-A03 — Two small truthful funnels, not a new explorer**  
**Priority:** P1 | **Owner:** frontend | **Dependencies:** W2-A02  
**Description:** Student server-observed (signup→session created→persisted attempt→qualified finalized) and teacher (signup→class created→enrollment) funnels, with consistent cohort, clear conversion windows and denominator count. Show one highest reliable measured drop-off, NOT a guessed reason. No arbitrary custom event builder, charts SDK necessary if basic HTML/CSS bars/table sufficient.
**Success criteria:**
- SC-207: Funnel counts never imply onboarding/page seen from absent instrumentation; "NOT MEASURED" for client-only steps.
- SC-208: Practice unsent buffered answers are labeled unknown, not lack of child attempt; teacher second enrollment doesn't double count.
- SC-209: Same API fixture renders same funnel counts in UI and an accessible text/table representation.

### Category W2-B: API/UX resilience and tests

**W2-B01 — Error, loading, freshness and existing-feature tests**  
**Priority:** P1 | **Owner:** frontend + QA | **Dependencies:** W2-A01..03  
**Description:** Implement pending, empty, forbidden, 5xx, missing data, stale-freshness and low-volume UX; use MSW for component contract tests only, keep real API smoke for role boundary. Reuse existing React query cache identity hygiene and recovery/auth test suite.
**Success criteria:**
- SC-210: No data and zero value are visually distinct; API error never displays yesterday's data as current; account-switch clears/hides admin-only insights.
- SC-211: TypeScript type-check, ESLint, Vitest, Vite build pass at exact integration head; built SPA/real DRF API smoke confirms genuine ADMIN access/role denial (not MSW-only).
- SC-212: Existing teacher pages, Practice Arena, Learn, login/onboarding, admin import and answer-recovery UI flows pass their existing regression checks; no new duplicate click/session-tracking logic added.

**W2 exit:** a lightweight admin decision screen integrated in the genuine dashboard or approved route, without touching unrelated UI, and transparent about funnel limits.

## 5. Wave 3 — Cross-feature QA, performance, release gate | P0

### Category W3-A: Independent QA and source reconciliation

**W3-A01 — Adversarial cross-mode/source-data verification**  
**Priority:** P0 | **Owner:** Head QA / independent reviewer | **Dependencies:** W1,W2  
**Description:** Freeze a spreadsheet/fixture truth table for all M1–M4. Cover skip-only, five repeats on one question, five distinct attempts, early/late finalize, browser answers lost before bulk submit, recovered v2 attempts, account created just before UTC boundary, multi-enrollment, DailyQuest one-to-one session, teacher after-14-day enrollment, cancelled/disabled class, stale Celery/replica, unexpected user deletion, out-of-window cohort.
**Success criteria:**
- SC-301: Independent SQL/count computation agrees with API+UI on every case; mismatches logged with root cause and repaired only within signed scope.
- SC-302: No sensitive child data in payload/logs; basic low-n suppression and no client-selected tenant/org ID leakage.
- SC-303: Baseline normal unit/integration/end-to-end checks run with **exact commands, counts, environment and SHA** recorded. A historical PR green check is not accepted as this feature's CI.

**W3-A02 — Existing feature non-duplication regression matrix**  
**Priority:** P0 | **Owner:** Head Engineering + QA | **Dependencies:** W0-A01, W3-A01  
**Description:** Run a cross-feature “do not recreate” audit against selected integration commit. Verify classes, teacher dashboards, assignments, answer recovery and quests when present. Avoid copying their tests merely to tick metrics checkboxes; link to their already existing tests and run them. If a branch not integrated, mark its acceptance **blocked-by-integration / not applicable**, not missing analytics scope.
**Success criteria:**
- SC-304: Existing `GET /classes/`, `/classes/{id}/roster/`, `/classes/levels/{id}/dashboard/`, join and assignment PATCH (when integrated), session start/attempt/bulk/finalize/report, daily quest APIs (when integrated), and `auth/me` retain prior behavior and statuses.
- SC-305: Teacher query performance tests `backend/apps/classroom/tests/test_reporting.py`, batch tests `test_assignments.py`, answer recovery tests `test_answer_recovery.py` plus frontend recovery tests, daily quests `test_daily_quests.py` are **run if present on integrated tree**. If not present, acceptance notes branch and integration prerequisite, not added duplicated code.
- SC-306: Git diff against appropriate base contains only approved analytics files, contracts/tests and intentional admin UI additions; **no duplicate progress/mode/teacher subsystem rewrites**, no dependency upgrade “because analytics”.

### Category W3-B: Performance/privacy/independent signoff

**W3-B01 — Query performance, security and data-purpose signoff**  
**Priority:** P0 | **Owner:** CTO, Security/Data, QA | **Dependencies:** W3-A  
**Description:** Measure representative volume, primary/replica freshness boundary, access controls; verify purpose/retention decision and legal hold semantics. For V1 baseline no new telemetry deletion process is required; no raw analytics event store exists. No application scoring or enrollment writes from reporting GET.
**Success criteria:**
- SC-307: Query plans and p95 evidence meet pre-agreed budget or accepted bounded optimization; endpoint remains GET/read-only and learning flow latency unaffected.
- SC-308: ADMIN only, no personal identifiers in response; no analytics behavior capture, SDK/cookie/replay or third-party event egress in MVP.
- SC-309: Source-data access and aggregation purpose/legal clearance is documented by authorized stakeholders before any production enablement.

**W3-B02 — Exact-SHA quality handoff, rollback and human approval**  
**Priority:** P0 | **Owner:** coordinator / independent reviewer | **Dependencies:** W3-B01  
**Description:** Check repository's actual `scripts/check_feature_gate.py` G4/G5 on signed artifacts, required CI at exact code revision (only assert if available), `scripts/agent_env_preflight.py --strict-e2e` before isolated full API tests where relevant, record branch/base/commits, limitations, migrations (none expected), API schema and client compatibility. Keep feature flag/route visibility revert plan. Owner decides merge/release separately.
**Success criteria:**
- SC-310: Exact integrated SHA, test commands/output, head-based CI run IDs (or UNKNOWN), reviewer decisions, open risks and Next Exact Action recorded.
- SC-311: Rollback instructions disable admin view/GET safely without modifying original progress/account/class data; no destructive migration.
- SC-312: Status at most **READY FOR HUMAN REVIEW** after actual G4/G5, never claim MERGED/DEPLOYED from docs; no production or release mutation by development workers without human instruction.

**W3 exit:** Independently verified source-truth metric quality + existing feature compatibility + security + measured cost, ready for human merge/release decision.

## 6. Wave 4 — Outcome/usage after a separately approved release | P1, NOT CODE

### Category W4-A: Product learning loop

**W4-A01 — Establish four comparable complete weeks**  
**Priority:** P1 | **Owner:** product/BA | **Dependencies:** human-authorized deployment with accurate data  
**Description:** Weekly review all four metrics with fixed definition_version, sample size, recent errors, teacher/parent support evidence and what changed in product. Track hypothesis -> user impact -> next small UX change; no extra tracking requests unless they alter a concrete decision.
**Success criteria:**
- SC-401: Four mature, comparable calendar weeks with reconciled counts and documented changes in eligibility/data definition.
- SC-402: Team can identify a top actionable friction point using verified funnel+support evidence, and avoids attributing UX causes without instrumentation.
- SC-403: Product owner explicitly selects or rejects M1 as future North Star using educational-quality/retention/business guardrails; not automatically labeled North Star on day one.

## 7. Wave 5 — OPTIONAL explicit intent telemetry (OUTSIDE BASE FEATURE) | P2 / defer

### Category W5-A: Only if a documented missing step changes a decision

**W5-A01 — New scoped business question and privacy gate**  
**Priority:** P2 deferred | **Owner:** PM/Privacy/Security | **Dependencies:** W4 shows an unresolved pre-start funnel blind spot  
**Description:** State exact decision blocked by missing screen/intent data, e.g., cannot distinguish onboarding exit from API failure; compare low-cost interviews/QA logs first. Separate frozen scope/G1/G2 for approved purpose and data policy. Never roll this automatically into W1.
**Success criteria:** SC-501 documented user decision, explicit allowed audience/fields/consent/retention/rights; otherwise W5 BLOCKED/DEFERRED.

**W5-A02 — Minimal first-party whitelist *only if approved***  
**Priority:** P2 | **Owner:** frontend/backend | **Dependencies:** W5-A01 plus independent Security/Data approvals  
**Description:** Up to four strictly enumerated events, no arbitrary properties, no replay/heatmap, no answers/PII, authenticated server identity only, best-effort send, hard OFF switch and short approved retention. No external SDK as baseline.
**Success criteria:** SC-502 default OFF means zero requests/writes; duplicates dedupe; invalid freeform payloads rejected; account switches don't cross-link; deletion/retention proof; event coverage shown distinctly from canonical session steps. No gameplay blocking.

## 8. Cross-feature acceptance matrix (reuse tests, avoid duplicate development)

| Original feature being preserved | Existing route/service | Known tests / evidence source | Analytics acceptance |
|---|---|---|---|
| Auth & user stats | `auth/register-student`, `auth/register-teacher`, `auth/me`; users/stats.py | users/tests/test_auth.py, tests/test_permissions.py, existing frontend auth tests | Do not change login/roles/HUD calculations (SC-116, 121, 212) |
| Practice/lesson lifecycle | `practice/start`, classwork/start, sessions/attempts, sessions/submit, report | exercises/tests/test_views.py; progress/tests/test_services.py | Distinct sessions & attempts read-only; no scoring changes (SC-101..109, 121, 304) |
| Abandonment marking | exercises/tasks.py Celery beat nominal 5m | exercises/tests/test_tasks.py | Interpret only; don't change task and don't assert live schedule (SC-109, 121) |
| Teacher classroom/roster | `classes/`, `classes/join`, `classes/{id}/roster`, `classes/levels/{id}/dashboard` | classroom/tests/test_views.py; teacher branch test_reporting.py | No new roster or class REST; first enrollment only (SC-110..112, 304..305) |
| Batch assigned levels | existing Class.assigned_levels, PATCH when merged | batch branch test_assignments.py | No change assigned levels/auth/transactions (SC-112, 305) |
| Answer Recovery | existing session URLs, v2 receipt/manifest if merged | answer branch exercises/tests/test_answer_recovery.py, FE recoveryPages.test.tsx | No loss/duplicate identity, no overwrite recovery store (SC-107, 121, 212, 305) |
| Daily Quests | five-question linked ZEN session if merged | daily quest branch exercises/tests/test_daily_quests.py | Count underlying ArenaSession once, no new "quest event" (SC-102, 305) |
| Admin XLSX import | `admin/import-questions` in existing app | existing API/frontend import tests (locate at integration baseline) | Never replace import page or its POST; no duplicate admin shell (SC-201, 212) |

**Tester instructions:** First collect tests *present on the integrated commit*, run those; do not demand tests for unmerged branches against `main`, and do not call missing branch features a defect of analytics. Treat existing feature tests as regressions, not new acceptance work or an excuse to re-scope those systems.

## 9. Traceability summary (IDs -> goal)

| Business NEED | Scope | Task IDs | Success criteria |
|---|---|---|---|
| N-01 Trustworthy definitions and cohort rules | M1–M4 + unknown/eligibility | W0-B01, W1-A01..04 | SC-007..009, SC-101..112 |
| N-02 Canonical data source and protected read API | Reuse Postgres, no extra write path | W1-B01, W1-B02, W1-C01 | SC-113..122 |
| N-03 Journey/drop-off diagnostics | Student and teacher *server-observed* funnels | W1-A01..04, W2-A03 | SC-105, SC-109, SC-207..209 |
| N-04 Admin insights with existing resource reuse | 4 KPIs + 2 funnels + states | W0-A02, W2-A01..03, W2-B01 | SC-004..006, SC-201..212 |
| N-05 Safety, quality and no duplicate features | Existing test suites, privacy, release boundary | W0-C01, W3-A01..B02 | SC-010..015, SC-301..312 |
| DEFERRED separate child UX event capture | Only if pre-start problem justifies and authorized | W5-A01..02 | SC-501..502; *not included in baseline* |

## 10. Final developer Definition of Done

The initial implementation is complete **only** when:
1. Actual approved scope digest and 3 mandatory independent reviewers (plus specialists) are recorded, project G1/G2 passed **before** coding.
2. The existing admin dashboard or agreed fallback has one four-KPI/two-funnel view with correct source/truth labels, mature cohorts and reproducible data definitions.
3. All four aggregate metrics match approved PostgreSQL fixture expected values, n/N and UTC dates.
4. No one except ADMIN can retrieve metrics; backend response is aggregate-only, small-cohort and privacy requirements documented and tested.
5. No pre-start click/onboarding/replay tracker has been silently installed; optional events are separate scope.
6. Exact integrated code tree preserves student learning, teacher reporting, batch assignments, answer recovery, Daily Quest, admin import and auth, **when those features are actually integrated**, with existing regression suites passing.
7. Performance is measured in isolated representative staging, any caching/index change justified by evidence; no new infrastructure without a new approval.
8. QA verifies exact code commit, normal CI evidence is documented or UNKNOWN, G4/G5 passes before handoff, and **human controls all merge/deploy actions**.

**Immediate next action for developer:** Execute W0-A01 / W0-A02 (fresh integrated branch + actual admin dashboard discovery); finalize W0-B01/B02 with owner, Data and Privacy, then generate signed G1/G2 artifacts. **Do not open PostHog, add event capture, build metric APIs, or change production before gates.**

**Planning status:** DONE for this requested review/handoff. **Code implementation, formal approvals, QA execution, merge, production: NOT DONE.**
