# Bolt V1 — Behaviour Analytics & User Journey Intelligence
## Final implementation plan — Lead BA synthesis (planning only)

**Document version:** 1.0 / 2026-10-15  
**Feature ID:** BA-ANALYTICS-001  
**Repository:** [aranya-squad/Bolt-V1](https://github.com/aranya-squad/Bolt-V1)  
**Planning branch:** feat/behavior-analytics-discovery-plan-2026-10-15  
**Baseline:** main; latest inspected governance commit 0d209947e44675770f6b1fd7ac271d4cc4e4e832; current source examined through GitHub file reads.  
**Classification:** New prospective feature; **read-only investigation with documentation-only branch writes**.  
**Review provenance:** CTPO, Head of Engineering and Head QA adversarial *role perspectives* synthesized in 02-adversarial-role-review.md; a distinct runnable agency/reviewer workforce was unavailable. This Lead BA synthesis is another role-based drafting pass, **not a separately executed agent or actual independent signoff**.  
**Approval:** PM PENDING | Senior Tech Manager/CTO PENDING | Head QA PENDING | Security/Privacy PENDING | Data/Integrity PENDING. No frozen SHA-256 scope and no G1/G2 pass.  
**Change boundary:** No application code, migrations, tests, infrastructure, production data, deployments or merge are to be changed under this request.

---

## 0. Executive decision
**Build the smallest trustworthy insight loop, not an analytics platform.**

1. Measure four outcomes using records Bolt already owns: weekly meaningful learning, new-student first value, session completion and new-teacher onboarding.
2. Surface them in the actual ADMIN dashboard once its source is located. The inspected main frontend exposes an admin XLSX import route but **no verified custom metrics dashboard**. Treat the owner's dashboard as possibly external, unmerged or in another environment until mapped.
3. Add one server-side funnel for student progression and one for teacher onboarding; distinguish start, persistence, completion, and delayed/incomplete states.
4. Only if the core data cannot explain a high-value drop-off, and only after explicit minor-data purpose/consent approval, add **very small first-party UX event instrumentation**. Do not add PostHog, Clarity, replay or general autocapture to child flows in V1.
5. Review the data for four complete comparable weeks; then decide whether Weekly Meaningful Active Students should become the North Star. Do not pick growth vanity metrics before reliable learning-value measurements exist.

**Guiding rule:** Source-of-truth beats instrumentation. Backend completion records make stronger claims than pageviews; missing client telemetry does not prove no user action. Analytics must never affect learning or scores.

## 1. Readiness assessment: exactly what exists
| Area | Observed main implementation | Opportunity / gap | Evidence |
|---|---|---|---|
| Frontend | React 18 + TypeScript/Vite, React Router, Zustand, TanStack Query, Axios | Simple admin route and explicit client intent signals feasible | frontend/package.json; frontend/src/router.tsx; frontend/src/shared/api/client.ts |
| Student journeys | Signup, onboarding (localStorage flag), Learn, lesson/classwork, Practice setup/active session, results | Before-session navigation and misunderstanding not reliably measured | frontend/src/features/onboarding/OnboardingPage.tsx; frontend/src/features/practice/TrainingArenaPage.tsx |
| Session lifecycle | ArenaSession user/kind/started_at/submitted_at/abandoned_at, question attempts, final ProgressRecord | Derive starts, attempts and completions without new event duplication | backend/apps/exercises/models.py; backend/apps/progress/models.py; backend/apps/progress/services.py |
| Practice capture | Frontend buffers and bulk-submits attempts at finishing/flush points | Unsent answers on crash/tab close make first-attempt data incomplete | frontend/src/features/practice/InArenaPage.tsx; backend/apps/exercises/views.py |
| Stale abandonment | Celery beat configuration and task mark overdue sessions | Task runtime LIVE status unknown; “abandoned” is inferred, not user-declared | backend/apps/exercises/tasks.py; backend/config/settings/base.py |
| Teachers | Class.teacher, Class.created_at; Enrollment.enrolled_at, student | Teacher-to-first-class-to-first-enrollment is reliably measurable | backend/apps/classroom/models.py |
| Institution attribution | ArenaSession.user, template; **no Class FK** | Cannot credit completed student work to a specific teacher/institute on main; avoid false KPI | backend/apps/exercises/models.py; backend/apps/classroom/models.py |
| Admin | Django /admin/ plus React /admin/import-questions; ADMIN RBAC capability | User-reported additional metrics dashboard NOT verified on main; source-location task mandatory | backend/config/urls.py; frontend/src/router.tsx; frontend/src/features/admin/AdminImportPage.tsx |
| Cache / async | Redis, Celery, optional DB replica config | Reuse if already operational; do not add a pipeline just to show four metrics | backend/config/settings/base.py |
| Product governance | Three-role exact-scope approval + risk-based security/data review before coding | This research is pre-G1; not implementation authorization | AGENTS.md; docs/AI_SDLC.md; skills/feature-scoper/SKILL.md |

**Evidence boundaries:** Repository code is not proof of production deployment, database rows, runtime schedules, consent operational compliance, complete branch integration, admin dashboard ownership or query performance. No production system was queried or changed.

## 2. What comparable products do, and what Bolt should borrow
| Reference | Verifiable practice | Specifically relevant to Bolt | Scope choice |
|---|---|---|---|
| [Khan Academy reporting](https://support.khanacademy.org/hc/en-us/articles/360031129891-What-reporting-options-are-available-on-Khan-Academy-for-teachers-to-track-student-performance) | Assignment completion, activity and mastery context | A teacher/admin needs a complete/incomplete learning picture | Borrow session completion and content-mode breakdown, NOT a mastery rebuild |
| [Quizlet Class Progress](https://quizlet.com/features/teacher-class-progress) | Started/completed activity, difficult terms | Start->finish and recurring error patterns can prioritize UX/content adjustments | Borrow starts/completions; concept diagnostics later |
| [Duolingo strategy](https://investors.duolingo.com/company-strategy-overview-0) and [experimentation](https://blog.duolingo.com/improving-duolingo-one-experiment-at-a-time/) | Purposeful engagement, improving retention through iteration | Review meaningful weekly practice and test UX changes sequentially | Borrow measurement cadence; defer full A/B platform |
| [Amplitude](https://www.amplitude.com/docs/analytics/charts/funnel-analysis/funnel-analysis-build) | Event-sequenced funnels and drop-off | Explicit denominator and conversion window are essential | Borrow metric methodology, NOT its full tool suite |
| [PostHog](https://posthog.com/docs) | Product funnels, sessions, paths and SDKs | Useful option if Bolt eventually needs deeper exploration | Defer third-party child traffic; evaluate separately |
| [Clarity](https://learn.microsoft.com/clarity/faq/) | Replay and heatmaps | FAQ says not to use on sites/apps targeting under 18 | Exclude |

**Product principle:** For six-to-twelve-year-old learners, a funnel should tell us which screen or lesson is confusing without recording the child's screen, keystrokes or raw responses.

## 3. Scope split (NEEDS / WANTS / DEFERRED / NON-GOALS)
### NEEDS — mandatory candidate for a future scoped implementation
- **N-01 — Metrics contract:** four fully defined KPIs with eligibility, conversions, missing/unknown states, minimum denominators and reporting periods (AC-01, AC-02).
- **N-02 — Authoritative aggregation:** source-derived student/teacher/session counts, protected by server-side ADMIN auth and tests (AC-03, AC-04).
- **N-03 — Journey diagnostics:** one student acquisition-to-first-value funnel and one teacher first-enrollment funnel; avoid false “abandonment” and teacher attribution (AC-05).
- **N-04 — Minimal admin surface:** four cards, a funnel/trend below, labels for n/N/freshness/source, sensible filters, empty and low-volume states (AC-06).
- **N-05 — Quality and governance:** privacy assessment, performance, reconciliation, deterministic QA, rollback/disable behavior and exact-scope signoff before coding (AC-07 through AC-10).

### WANTS — not part of minimum delivery
Optional eligible-device breakdown, time-to-value percentile, weekly return cohort matrix, error-code drilldowns, accessible export, and interviews linked to observed dropoff. Prioritize only after core baseline is credible.

### DEFERRED — only on justified trigger
- **D-01:** First-party UX observation events if server records cannot explain a product-significant gap and privacy review approves them.
- **D-02:** PostHog/Amplitude/Mixpanel evaluation for adult/teacher-only or separately lawful analytics; avoid all silent SDK defaults and child export.
- **D-03:** Event warehouse, exhaustive path exploration, experiments, product flags, live real-time dashboards or attribution to partner institutes after partner data models are demonstrably live.
- **D-04:** Advanced educational mastery attribution, new question mastery taxonomy and raw behavior trails for individual children.

### NON-GOALS
No screen replay, heatmaps, mouse tracking, raw clicks, keystrokes, audio/microphone capture, answer contents, targeted advertising, behavioral scoring of children, leaderboard surveillance, third-party pixels on child flows, changes to lesson/scoring algorithms, exposing platform metrics to teachers/parents/partners, new payment or subscription tracking, or production backfills in this task.

## 4. Four KPI definitions and actionable questions
**Reporting convention:** UTC source timestamps; dashboard renders a clear range and timezone label. Choose a single calendar-week rule (Monday 00:00 through next Monday 00:00 UTC). Source-based metrics use DB data; no client clock for authoritative counts. Filters are optional role-safe mode and cohort only; never infer institution at runtime.

### M1 — Weekly Meaningful Active Students (candidate later North Star)
**Question:** Do students return to actually practise?  
**Numerator / main displayed value:** Number of distinct eligible STUDENT users with >=1 qualifying completed session whose submitted_at falls inside a completed UTC week. **No arbitrary denominator is required for the headline count.**  
**Qualifying completed session (proposed):** ArenaSession has submitted_at and ProgressRecord; >=5 distinct question_index values with at least one non-skip QuestionAttempt per question; include CLASSWORK, HOMEWORK if implemented in usage, FLASH_CARDS, ZEN, TIME_ATTACK and CUSTOM, report mode breakdown. No minimum accuracy; struggling learners still count.  
**Guardrails:** count of all finalized sessions (including shorter ones), median accuracy and sample size; validate threshold against actual session configurations on synthetic/staging fixture before locking.  
**Decision:** if M1 stalls while signup rises, fix practice engagement/return, not promotion volume.

### M2 — Seven-day First Value Activation
**Question:** Can new students reach their first useful practice quickly?  
**Numerator:** Eligible students whose *first qualifying completed* session was finalized between their User.created_at and strictly before created_at + 168h.  
**Denominator:** Eligible new STUDENT registrations in a signup cohort with a fully elapsed seven-day observation window. Count students only once; account creation outside a cohort does not enter it.  
**Diagnostics:** did not start / started no persisted attempt / attempted not finalized / finalized but below qualifying threshold / activated. For browser-buffered practice, “no persisted attempt” is NOT “didn't try.”  
**Decision:** if user signups are strong but activation is low, investigate onboarding, teacher assistance and mode setup.

### M3 — Forty-eight-hour Server Session Completion Rate
**Question:** Of journeys that made it into a server-created session, what fraction reach completion?  
**Numerator:** Distinct eligible STUDENT session UUIDs whose submitted_at occurs within 48h after started_at and have a matching ProgressRecord.  
**Denominator:** Distinct eligible STUDENT ArenaSessions created in the chosen start-date cohort, *only* those already >=48h old when the report is computed. Each resumed session counts once.  
**Interpretation:** show finalized, expired/abandoned_at, still open/unknown and late-completed separately. “No result after 48h” is an incomplete server session, **not** a definitive deliberate dropoff. For practice, unsent browser answers remain unknown.  
**Decision:** if M3 drops in one mode, inspect steps, errors and resumption—not student motivation.

### M4 — Fourteen-day Teacher Onboarding Activation
**Question:** Do new teachers get to a functioning enrolled class?  
**Numerator:** Eligible newly created TEACHER users for whom at least one owned Class.created_at and at least one associated Enrollment.enrolled_at occurred within 336h after teacher User.created_at; enrollment after the class was created.  
**Denominator:** Eligible teacher account registrations in a signup cohort whose full 14 days elapsed.  
**Diagnostics:** first class created, first student enrolled, elapsed time to each, teacher created through staff/import/partner flow if provenance exists.  
**Important limitation:** A student may enroll with multiple teachers; current ArenaSession is not linked to a class, so “teacher caused student practice” is NOT a valid metric on main.  
**Decision:** if enrollment stalls, focus onboarding/help/setup rather than new student gameplay.

**Eligibility rules (must freeze before SQL):** authenticated STUDENT/TEACHER; clear policy on user soft-deactivation and deleted rows; known synthetic/demo/internal identities filtered through an approved list, not emails or IP heuristics; disclose historical quality gaps; pre-existing imported users tracked separately if timestamps unreliable. Existing schema may lack a reliable internal/test tag; the baseline task must resolve exclusion with fixtures and human ownership, not conjure a column.

**North Star decision (later):** If M1 is stable, trustworthy, and reacts to real improvements without incentivizing low-quality/fake sessions, propose M1 as North Star. Review with guardrails for completion, accuracy, at-risk students and teacher setup. Four complete comparable weeks minimum; avoid optimizing solely for usage if learning quality worsens.

## 5. Journey flows, funnels and the drop-off taxonomy
### Student funnel S1 — source-first
| Step | Fact | Source | Trust | Explanation |
|---|---|---|---|---|
| S1 | Eligible student registered | User.created_at | AUTHORITATIVE | Cohort denominator; privacy and eligible actor checks |
| S2 | First session created | ArenaSession.started_at | AUTHORITATIVE | Entry into practice/learn runtime, one UUID even if resumed |
| S3 | First persisted non-skip attempt | QuestionAttempt | AUTHORITATIVE but INCOMPLETE coverage | Practice's buffered answers may be lost if browser closes |
| S4 | Finalized server-side | ProgressRecord + submitted_at | AUTHORITATIVE | Successful server save, not necessarily a “meaningful” threshold |
| S5 | First-value session qualifies | >=5 distinct attempted questions | DERIVED | M2 activation |
| S6 | Returns on a later completed week | second qualifying session in a later week | DERIVED | Diagnostic only, NOT fifth top-line card |

**Funnel window:** S1->S5 within 7 x 24 hours for the activation funnel. For in-session S2->S4 use 48 hours. Do not combine numerators from different mature windows or backfill imaginary UX views before tracking exists. If a student visits Learn repeatedly without starting a session, the backend sees no visit — describe this as a known missing observation, not a false funnel step.

### Teacher funnel T1 — fully source-derived
TEACHER User.created_at -> first owned Class.created_at -> first Enrollment.enrolled_at within 14 days. Split “teacher never created class” from “class has no enrollments.” Report step counts and conversion n/N; do not attribute sessions to teacher.

### Drop-off classes, NOT judgments about students
- **Unexposed:** interface step not tracked (e.g., pre-instrumentation). Not counted as failure.
- **No server start:** signed-in eligible student with no ArenaSession in the activation window; cause UNKNOWN.
- **Started, zero persisted answers:** no QuestionAttempt; on practice this might be unsent buffering, not inactivity.
- **Started, persisted attempt, no finalized result:** server attempted / incomplete within matured 48h window.
- **Expired by server heuristic:** abandoned_at set; do not claim explicit user exit.
- **Finalized below qualifying threshold:** short/light sessions; separate from no completion.
- **Returned / meaningful:** qualifying first-value and repeat use.

This vocabulary deliberately avoids labeling a child “disengaged” because their phone crashed.

## 6. Architecture selection — frontend + backend + admin
### Option decision matrix (qualitative design judgment, NOT tested benchmark)
| Option | Fit to existing stack | Journey depth | Child-data exposure | New ops/build burden | Decision |
|---|---|---|---|---|---|
| **A: Existing Django/Postgres records + small React admin** | Excellent | Strong server funnel; no page visibility | No *new* third-party processor; processing rules still apply | Low-to-medium | **PICK FOR CORE** |
| B: A + tiny first-party optional UX collector | Excellent | Adds pre-session friction/intent | Child-behavior collection still needs legal-purpose gate | Medium, migrations and retention | **CONDITIONAL LATER** |
| C: PostHog Cloud manual event integration | Technical SDK compatible | Strong funnel/path exploration | Third-party data recipient, identity/retention/DPA questions | SDK + billing + admin API bridge | Defer until valid use case |
| D: Mixpanel / Amplitude | Technical SDK compatible | Strong funnel/cohort features | Similar external processor risk | Integrations + admin bridge | Defer |
| E: GA4 / Clarity and replay | Weak student-product fidelity | Superficial traffic and playback | Clarity explicitly under-18 restricted | Easy script but unacceptable tradeoff | Reject |

**Why A wins now:** Bolt already retains canonical session creation, saved attempts, finalized progress, class ownership, and enrollment. Four management questions can mostly be answered without another vendor, another identity model, or giant click datasets. Hosting the analytics in the same data plane also makes the ADMIN dashboard integration straightforward once that dashboard is located. First-party does **not** automatically make collection lawful: legal purpose, minimization, protection and rights remain prerequisites.

### Backend design proposal — future code only
**Prefer a bounded read service** (suggestion: backend/apps/analytics/services.py or an appropriately owned reporting module after confirming repo conventions) and a protected DRF endpoint. Do not write learning/progress calculations into analytics; consume existing append-only records read-only.

Proposed route: GET /api/v1/admin/product-insights/?period_start=YYYY-MM-DD&period_end=YYYY-MM-DD&session_group=ALL|CLASSWORK|PRACTICE

Response conceptual shape (not yet an OpenAPI contract):
- period: UTC inclusive start, exclusive end, observation_as_of, freshness_label;
- metrics: M1 count; M2 numerator/denominator/rate; M3 numerator/denominator/rate with incomplete/late/unknown; M4 numerator/denominator/rate;
- funnels: student and teacher step counts with maturation windows;
- segments: kind/group; coverage warnings / missing_data;
- suppression: hidden low-n segmented cells when policy sets k threshold; admin sees no individual identifying row in this response.

**Authentication:** IsAuthenticated + IsAdmin on backend, not just React RoleRoute. Restrict arbitrary dates (recommend last 90 days at first), bounded number of segments, avoid N+1 queries, and add explicit max API response size. No teacher/partner/customer analytics API in V1. Avoid IP/user agent in returned metrics. Requests should never join against another tenant based solely on a passed tenant ID.

**Query strategy:** use COUNT DISTINCT user/session and filtered aggregates using existing fields, indexed bounded ranges and prefiltered join sets. Determine actual counts and query plans on isolated representative PostgreSQL; do NOT assume known performance. Avoid hot transactional writes for analytics. Current DB has optional replica routing; review router policy for consistent reads, replica lag/freshness and transactional sessions. If observed cost becomes high, use existing Celery for *scheduled aggregated snapshots* as a later optimization (not prerequisite); no Kafka/new warehouse.

**Historical limitation:** existing records give baseline learning/teacher funnel data but no historical page views, settings confusion, UI error intent or pre-login attribution. Never fabricate a “last 30 days onboarding screen dropoff” graph from absence of an event that was never tracked.

### Frontend design proposal — future code only
Integration decision: first find the admin dashboard reported by the owner (branch/app/ref/route/data owner). If it exists elsewhere, integrate only after contract mapping and explicit branch dependencies. If main is truly the target, use a new protected ADMIN-only /admin/product-insights route and a self-contained page, no change to student navigation.

**Single-page wireframe in words:** top date selector/refresh marker; four consistent cards with count, n/N (where relevant), prior comparable period and confidence/low sample caveat; second row with Student Journey horizontal five-step funnel and Teacher Onboarding three-step funnel; compact Classwork vs Arena breakdown below. Loading, empty-data, backend-error, permission-denied, insufficient sample and “not instrumented” are first-class states. Desktop layout first, tablet/mobile legible, keyboard accessible. No individual student explorer and no endless filter builder.

**Data fetching:** reuse existing Axios apiClient with JWT/refresh, TanStack Query with stable key containing period and filter, avoid leaking cached admin response across logouts/account switches; verify client caching and authorization. Do not persist analytic datasets in Zustand or localStorage. Every numeric label must specify whether it is a count, percentage, distinct users or sessions. Avoid auto-refresh until measured need.

### Optional UI event collection (only after explicit approval)
If W1/W2 show a high-impact, unexplained setup-to-start gap:
- event names max 4: journey_step_seen, onboarding_finished, session_start_intent, journey_blocked;
- enum properties only: flow (STUDENT_ONBOARDING / LEARN / PRACTICE), step (allowlisted), error_code (fixed list, no message), app_build, device_class (coarse and optional);
- server-derived user ID and role from authenticated request, received_at UTC; per-event UUID for idempotent unique constraint; optional session UUID must be ownership checked;
- POST /api/v1/analytics/events/ with per-actor throttling, request size/batch ceiling, reject unrecognized props; never trust client teacher/organization IDs;
- per-journey in-memory correlation token only if legally justified; no persistent cross-site fingerprint; if no reliable server start correlation, show intent and server start as **separate counts**, not exact user-conversion;
- aggregate only, max retention proposal 30 days raw / 90 days de-identified summaries **subject to security/legal retention approval**; row deletion/subject-right tests and kill switch;
- on errors/network outage, silently fail without delaying learning. Avoid retries that create duplicates; account switch clears ephemeral tracking state.
- never capture raw paths with IDs, form data, screenshots, DOM, mistakes/answers, join codes, email, DOB, consent details, localStorage auth state, audio or microphone.

**Default:** disabled, including all student accounts, until explicit jurisdiction-specific legal/purpose/consent authorization. Do not substitute a client checkbox for necessary legal analysis. Teacher/adult-specific tracking should still respect privacy, not automatically turn on globally.

## 7. Child-data / legal / institutional guardrails
**Stop condition:** No incremental child UX telemetry, replay or third-party event export unless the approved legal basis and education-only purpose, actor notice/consent, retention/deletion, data processing roles, and cross-border handling are documented. Get specialist Security/Privacy + Data/Integrity approval in the real G1 gate.

- India: DPDP Act child restrictions (including tracking/behavioural monitoring), phased implementation and any narrowly applicable educational institution exception must be assessed by qualified counsel; Bolt being a private learning platform/provider is **not automatically** within an educational-institution exception. [MeitY DPDP Rules](https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa?pageTitle=Digital-Personal-Data-Protection-Rules-2025%C3%AF%C2%BF%C2%BC).
- U.S.: COPPA applies to many child-directed websites; FTC guidance limits use of school authorization to school-benefit educational purposes, not unrelated commercial profiling. [FTC COPPA FAQ](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions).
- International: GDPR/GDPR-K/UK GDPR rules, parental rights and regional restrictions require market-specific mapping. Contract and hosting reviews are separate from technical SDK feasibility. PostHog offers EU cloud and a DPA but that fact is **not permission to transmit child data**. [PostHog privacy](https://posthog.com/docs/privacy).
- Product guardrail: operational education metrics must not be repurposed for advertising, manipulation or child-targeted behavioral optimization; only aggregated UX improvement with documented safeguards.
- Access guardrail: ADMIN-only scope, no names/IDs in charts, low-cohort cell suppression (proposed k=10 unique users subject to approval), no third-party sharing, access logs for reporting endpoint if necessary, deletion and retention testability, and a manual feature kill switch for new collection.
- User model currently has DOB, ConsentRecord and EnrollmentConsent concepts. Treat existing source as design evidence, **not confirmation that real jurisdictions/consents are current or valid**.

## 8. Detailed delivery plan: waves -> categories -> stories -> tasks
Estimates are **relative complexity (S/M/L)**, not delivery promises. Dependencies and approvals precede work. Every stage below describes work for a **future authorized implementation**, not actions already executed.

### Wave 0 — G0 inventory, definitions and gates (P0; S–M)
**Outcome:** source-of-truth and compliance map complete, four KPIs approved as exact measurable definitions.
| Task | Category / user story | Technical or research work | Exit criteria |
|---|---|---|---|
| W0.1 | Readiness — BA locates existing admin | Inspect target admin dashboard branch/application/route/data source; list existing KPIs and reusable UI; recheck remote refs | Exact paths/ref or marked UNKNOWN, no replacement claimed |
| W0.2 | Data — BA can trust denominators | Inspect real source and isolated synthetic fixtures for legacy session kinds, test/demo user provenance, signup/teacher timestamps, multi-enrollment, inactive users | Eligibility and data-quality matrix, no hardcoded guesses |
| W0.3 | Product — CTPO can prioritize | Freeze candidate M1–M4, mode groups, 5-question threshold (or evidence-backed revision), maturation windows, north-star criteria, baseline questions | Four definitions map to AC IDs |
| W0.4 | Privacy — owner knows collection limits | Counsel/security assessment by target geography, minors, education purpose, aggregation and optional events, consent rights and deletion | Written approval/refusal; optional telemetry remains OFF if unresolved |
| W0.5 | Technical — Engg can size | Examine backend SQL/query paths, DB replica router, Celery actual intended role, admin auth and test patterns, FE auth cache; estimate volume | Architecture Decision Record: first party default, no unneeded services |
| W0.6 | Governance — implementation cannot drift | Create canonical frozen scope.md + plan.json and feature tracker, same scope digest PM/CTO/QA + Security/Data approvals; run G1/G2 checkers | **G1/G2 PASS required to start ANY coding** |

**Hold:** user-reported dashboard source and privacy purpose are unresolved integration decisions. Unaffected metric specification may proceed, but no unauthorized UI event capture.

### Wave 1 — Server metrics service and tests (P0; M)
**Outcome:** Four reliable source-derived metrics; no client SDK or new analytics tables.
| Task | Category / user story | Work | Acceptance |
|---|---|---|---|
| W1.1 | Backend source/read models | Implement scoped aggregate query/service for M1 qualifying session distinct answers, M2 matured signup, M3 48h cohort and M4 first class+enrollment | AC-01, AC-02 |
| W1.2 | Auth and API contract | ADMIN-only GET response; period bounds, structured errors, no user-level rows, explicit freshness and definitions; update OpenAPI + frontend types/mocks in coordinated task | AC-03, AC-04 |
| W1.3 | Data integrity | Define late completion, missing attempt, skip-only, deleted accounts, test/admin users, multiple enrollments; server-only grouping; no double counts on resume | AC-01, AC-05 |
| W1.4 | Performance | Add synthetic realistic data; measure staging PostgreSQL EXPLAIN ANALYZE, query latency, indices only where justified; cap query windows | AC-08 |
| W1.5 | Backend QA | Focused pytest + permissions + boundary/fixed-clock transaction cases; Ruff; test existing student game/progress unchanged | AC-01 to AC-05, AC-09 |

**Out of scope in W1:** New tables/events, fancy dashboard, teacher-to-practice attribution, production schema backfill.

### Wave 2 — Admin dashboard minimum (P1; S–M)
**Outcome:** Leaders see four numbers and where the known funnel breaks.
| Task | Category / user story | Work | Acceptance |
|---|---|---|---|
| W2.1 | Frontend integration | Reuse confirmed admin surface; otherwise isolated ADMIN /admin/product-insights page and nav entry; preserve /admin/import-questions | AC-06 |
| W2.2 | UX/reporting | 4 KPI tiles, Student S1–S5 and Teacher T1 step display, classwork vs practice split, period/denominator/freshness, no-data/suppression | AC-06, AC-10 |
| W2.3 | Client data integrity | TanStack Query key per period, clear admin cache on identity switch/logout, explicit loader/error/403, a11y responsive | AC-04, AC-06 |
| W2.4 | Contract checks | Types, MSW unit tests, accessible browser cases; backend response contract and real-API isolated smoke when authorized | AC-06, AC-09 |
| W2.5 | Validate decisions | Have PM/teacher operations inspect 2–3 synthetic funnel scenarios and say which product action they would take | AC-10 |

### Wave 3 — Conditional first-party intent instrumentation (P1, blocked unless justified; M)
**Trigger:** Product has a high-impact unexplained gap between entering Learn/Arena and creating a server session, W1/W2 cannot answer it, and privacy/legal specialist has approved specific events and affected jurisdictions. Otherwise **skip this wave**.
| Task | Category / user story | Work | Acceptance |
|---|---|---|---|
| W3.1 | Product/Privacy | List exact non-sensitive questions the four events answer; actor purpose/consent and retention decisions; explicit child tracking stop conditions | AC-07 |
| W3.2 | Backend minimal event boundary | OPTIONAL new ProductJourneyEvent schema; server-owned actor, enum-only payload, unique event UUID, rate/size limits, ADMIN-only aggregation | AC-03, AC-07 |
| W3.3 | Frontend UX instrumentation | Emit only meaningful steps/intent/block codes after authorization; never collect all clicks or raw URLs; no disruptive retry | AC-07 |
| W3.4 | Data lifecycle | TTL deletion with job evidence, deletion request compatibility, no immortal raw logs, switch-off, safe schema migration and rollback design | AC-07, AC-09 |
| W3.5 | Negative/security QA | Reject answer text, email, IP, arbitrary props; cross-user session spoof, burst uploads, offline/retry, account-switch, no-consent, off-flag | AC-03, AC-07, AC-09 |

**Warning:** A new event table is not “read-only” as deployed; it belongs to a separate approved coding phase, not the current document-only request.

### Wave 4 — Independent QA, staged adoption and handoff (P0 release quality; M)
| Task | Category | Work | Acceptance |
|---|---|---|---|
| W4.1 | QA semantic truth | Independently recompute four metrics from synthetic raw source rows; reconcile mode/time/cohort definitions | AC-01, AC-02, AC-05 |
| W4.2 | Security/data review | Validate actual privacy rules, admin permissions, child suppression, no PII and required optional-consent gates | AC-03, AC-07 |
| W4.3 | Performance/ops | Confirm index/latency thresholds from stage, Celery state if used, cache freshness, monitoring/error budget, graceful failure | AC-08, AC-09 |
| W4.4 | User acceptance | Admin can accurately distinguish non-use, incomplete session and onboarding friction using known fixture examples | AC-06, AC-10 |
| W4.5 | Release gate | Reviewed exact integrated SHA, G4/G5 evidence, branch-only push, human-controlled merge/deploy, flag/rollback instructions | AC-09 |

**Release sequence proposal (requires separate human approval):** isolated fixtures -> restricted internal ADMIN sandbox -> limited authorized analytics endpoint -> compare 2–4 weeks of metric reconciliation -> broader admin exposure. For optional telemetry, separate privacy-approved feature flag and purge/delete verification first. No silent child collection.

### Wave 5 — Product decision cadence, not another engineering product (P1; S)
Weekly 30-minute review with BA/Product/teacher operations: choose one largest meaningful dropoff, distinguish data issue vs product hypothesis, assign one small UX or curriculum fix, define expected impact and guardrail, re-evaluate next comparable cohort. Monthly: review all four KPIs, data coverage, and whether M1 is safe to promote. Avoid building experiments, cohorts builder or notifications unless an observed decision requires them.

## 9. Traceability: need -> acceptance -> likely test
| AC | Need | Testable result / verification plan |
|---|---|---|
| AC-01 | N-01/N-02 | Fixed-clock PostgreSQL fixture returns exact M1–M4 numerator/denominator counts, >=5 distinct non-skip threshold and count dedupe |
| AC-02 | N-01 | Immature 7d/14d signups and 48h sessions never enter denominator; UTC boundaries use half-open intervals; late events labeled |
| AC-03 | N-02/N-05 | Non-admin/student/teacher 403 on analytics API; no PII, child rows or cross-tenant/client-selected IDs; negative auth cases |
| AC-04 | N-02 | Response schema/version/freshness and period bounds stable; duplicates, idempotent finalize and refresh don't inflate metrics |
| AC-05 | N-03 | All session kinds including FLASH_CARDS and Test Mode, missing buffered practice attempts, skip-only and stale Celery cases classified accurately |
| AC-06 | N-04 | Four cards + two truthful funnels, same n/N as backend, explicit missing data and instrumented-since, desktop/mobile/a11y states |
| AC-07 | N-05/(D-01) | No new child UI telemetry while OFF/not authorized; if enabled, only allowlisted fields, dedupe, retention and deletion tested |
| AC-08 | N-05 | Measured query performance with representative isolated PostgreSQL volume meets agreed SLO; no unexpected scans/hot-path writes |
| AC-09 | N-05 | Ruff/pytest, TypeScript/ESLint/Vitest/build, selected built-SPA real-API smoke isolated from LIVE; exact commit and CI status reported without invention |
| AC-10 | N-04/N-05 | BA/Product can use count-based examples to identify UX decision; low-n safety and ambiguity labels verified |

**QA adversarial fixtures:** one student registered at 23:59 UTC; two sessions started and one resumed; wrong retry with duplicate attempts; five attempts to same question vs five distinct; five skips; invalid fast submissions; flashcards with all unanswered; session completed at +49h; browser answer buffered then tab lost; abandoned_at task not run; teacher creates two classes; one student belongs to two teachers; enrollment created after 14d; teacher account imported; account deleted; admin->student switch; UI events double-fire in StrictMode; analytics API 401, 403 and stale-cache tests. For each fixture write expected count before code.

## 10. Measurement quality, security and operations checklist
- **Numerator/denominator audit:** verify against independent SQL fixture and source records; chart shows exact range and qualifying criteria.
- **Right-censoring:** never compute incomplete signup/session observation periods as failure.
- **Data lineage:** authoritative DB vs client observation visually distinguished. No retroactive UX funnel coverage.
- **Cardinality:** dedupe by user/session ID, count distinct attempted question indices and enforce half-open windows.
- **Role and institution boundaries:** ADMIN only; future partner dimension requires actual server-owned org mapping.
- **Reliability:** reporting outage cannot block classwork/session finalization; optional collector best effort and off by default.
- **Performance:** use bounded queries and check indexes; avoid new writes on question submission hot path. If snapshots become necessary, schedule safely.
- **Retention:** define operational source retention separately from optional UX events and immutable consent records. Purge needs proof, not a comment.
- **Consent/law:** counsel's jurisdiction-specific approval required before new child behavioral events; default OFF in all deployments.
- **Dashboards:** show missing/unknown, low n and freshness rather than misleading precision.
- **Provider cost:** PostHog currently advertises 1M free events/month, but pricing is not a product justification; avoid third-party dependency by default. [Pricing](https://posthog.com/pricing).
- **Verification:** never state CI VERIFIED, deployed or live based on source docs. Record exact checks once implementation is authorized and tests are actually run.

## 11. Decision log and unresolved dependencies
| ID | Decision / open issue | Current stance | Owner / when |
|---|---|---|---|
| DEC-01 | Product analytics platform | First-party existing Postgres/DRF + React admin | Proposed; formal CTO/PM approval at G1 |
| DEC-02 | Third-party SDK for students | No SDK/replay/autocapture in minimum release | Security/privacy + human approval required to revisit |
| DEC-03 | North Star | M1 candidate, not yet selected | Product/CTPO after four complete stable weeks |
| DEC-04 | Teacher activation | First Class + first Enrollment within 14d, not student learning attribution | PM validate; existing schema supports |
| DEC-05 | Actual admin dashboard location | UNKNOWN on main beyond import; explicit discovery required | Frontend owner in W0.1 |
| DEC-06 | Meaningful threshold | >=5 distinct non-skip question indices, **provisional** | Data/PM confirm from distributions in W0 |
| DEC-07 | Demo/test actor filter | UNKNOWN reliable identifier | BA/Engg resolve before any historical KPI |
| DEC-08 | Child telemetry legality/purpose | UNRESOLVED; OFF until specialist/counsel review | Security/legal owner before W3 |
| DEC-09 | Existing deployed Celery and DB replica | UNKNOWN | Operations owner before trusting job-freshness/performance |
| DEC-10 | Multi-institute/partner segmentation | Deferred, no assumption main supports tenant FK | Product/Engg after actual integration |
| DEC-11 | UI timezone display and low-n policy | UTC reporting; k=10 suggested suppression | PM/Security signoff |
| DEC-12 | Release | Human controlled; this branch documentation-only | Human owner later |

## 12. Definition of done for THIS request
- [x] Inspect current repository guidelines, refs, main/frontend/backend/auth/session/progress/classroom/admin sources.
- [x] Research comparable learning/analytics products and technical providers using published references.
- [x] Produce Draft 1 with product metrics, journeys and technical alternatives.
- [x] Record adversarial CTPO / Head Engineering / Head QA role-perspective findings, caveat that no separately callable agents participated.
- [x] Produce narrower Draft 2 reflecting criticisms.
- [x] Produce final Lead BA wave/task/priority/acceptance plan.
- [ ] Independent PM/CTO/QA/Security/Data signoff on a frozen digest — **deliberately pending**.
- [ ] G1/G2 pass — **deliberately pending; no coding requested**.
- [ ] Runtime tests, staging/live database scans, telemetry setup, new dashboard code, migrations or deployment — **not performed**.
- [ ] Merge or deployment — **not authorized**.

**Next exact action:** Human reviews the final metric definitions and W0 open decisions. In a separately approved development session, confirm actual admin dashboard target, lawful analytics purpose and test/demo cohort policy, freeze scope, obtain genuine same-digest reviewer approvals, run G1/G2, then start W1 backend measurement implementation. Do **not** start W3 merely because it appears in a plan.

---

### Reference index
**Repository baseline:** [AGENTS.md](https://github.com/aranya-squad/Bolt-V1/blob/main/AGENTS.md), [AI-SDLC](https://github.com/aranya-squad/Bolt-V1/blob/main/docs/AI_SDLC.md), [router](https://github.com/aranya-squad/Bolt-V1/blob/main/frontend/src/router.tsx), [ArenaSession](https://github.com/aranya-squad/Bolt-V1/blob/main/backend/apps/exercises/models.py), [QuestionAttempt/ProgressRecord](https://github.com/aranya-squad/Bolt-V1/blob/main/backend/apps/progress/models.py), [Class/Enrollment](https://github.com/aranya-squad/Bolt-V1/blob/main/backend/apps/classroom/models.py), [practice buffering](https://github.com/aranya-squad/Bolt-V1/blob/main/frontend/src/features/practice/InArenaPage.tsx), [abandonment task](https://github.com/aranya-squad/Bolt-V1/blob/main/backend/apps/exercises/tasks.py), [backend settings](https://github.com/aranya-squad/Bolt-V1/blob/main/backend/config/settings/base.py).

**External product and privacy:** [Khan Academy](https://support.khanacademy.org/hc/en-us/articles/360031129891-What-reporting-options-are-available-on-Khan-Academy-for-teachers-to-track-student-performance), [Quizlet](https://quizlet.com/features/teacher-class-progress), [Duolingo](https://investors.duolingo.com/company-strategy-overview-0), [Amplitude](https://www.amplitude.com/docs/analytics/charts/funnel-analysis/funnel-analysis-build), [PostHog docs](https://posthog.com/docs), [PostHog privacy](https://posthog.com/docs/privacy), [Clarity restriction](https://learn.microsoft.com/clarity/faq/), [FTC COPPA FAQ](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions), [India MeitY DPDP Rules](https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa?pageTitle=Digital-Personal-Data-Protection-Rules-2025%C3%AF%C2%BF%C2%BC).
