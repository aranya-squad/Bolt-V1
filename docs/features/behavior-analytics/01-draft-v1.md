# Bolt V1 — User Journey & Behaviour Analytics
## Draft 1: product discovery and technical options (PROVISIONAL)

**Date:** 2026-10-15  
**Task type:** read-only architecture/product discovery; this document is a new planning file, not code or production evidence.  
**Repository:** aranya-squad/Bolt-V1; baseline main after governance PR #5 (latest observed commit 0d209947e44675770f6b1fd7ac271d4cc4e4e832).  
**Status:** INITIAL DRAFT — must survive adversarial review. No G1 approvals or permission to implement.

### 1. Product problem
Bolt knows a student's session results, but not reliably whether a person saw a screen, misunderstood a choice, hit a blocker, or deliberately left. Leadership wants journeys and friction, summarized as 3–4 actionable admin metrics, with a North Star *chosen later from evidence*, not prematurely declared.

Primary decisions: (a) where does first-time activation fail; (b) which started classwork/practice flows fail to finish and why; (c) do students come back for purposeful learning; (d) does a new teacher produce learning activity among enrolled students?

**Do not confuse:** student learning analytics (educational performance), product UX telemetry (journey friction), and business conversion metrics (teacher onboarding). No exam scores, price events, ad attribution, or invasive recordings in the first iteration.

### 2. Benchmark: copy the pattern, not the platform
| Product/service | Publicly described practice | Bolt-aligned adaptation | Do NOT copy |
|---|---|---|---|
| Khan Academy | Teacher activity, skill/mastery, assignment completion views | Detect started vs completed classwork; relate aggregate friction to learning outcomes | Full skill-mastery reporting rebuild |
| Quizlet Class Progress | Started/completed study sessions and most-missed concepts | Mode-wise session conversion; diagnostic missed-technique trends if existing data supports it | Individually ranked children or new assessment system |
| Duolingo | DAU/return engagement and systematic experiments | Measure purposeful weekly learning and 7-day activation; use data to prioritize one fix at a time | Daily streak as North Star or large A/B platform |
| Amplitude | Defined funnels, retention cohorts and paths | Consistent event dictionary, exact denominators, segmented funnels | Generic “track everything” |
| PostHog | Funnel/path reporting plus session-linked events | Candidate for low-engineering-cost exploration | Automatic click/form collection and replay for children |
| Microsoft Clarity | Replay/heatmap product | **Exclude**: Clarity says not for services targeting under 18 | Any Clarity instrumentation |

Sources: [Khan Academy reporting](https://support.khanacademy.org/hc/en-us/articles/360031129891-What-reporting-options-are-available-on-Khan-Academy-for-teachers-to-track-student-performance), [Quizlet Class Progress](https://quizlet.com/features/teacher-class-progress), [Duolingo strategy](https://investors.duolingo.com/company-strategy-overview-0), [Amplitude funnel docs](https://www.amplitude.com/docs/analytics/charts/funnel-analysis/funnel-analysis-build), [PostHog](https://posthog.com/docs), [Microsoft Clarity FAQ](https://learn.microsoft.com/clarity/faq/).

### 3. Current implementation evidence (CODE, not LIVE)
- Frontend: React 18, TypeScript, Vite, React Router, Zustand, TanStack Query, Axios. Routes include /onboarding, /learn, /learn/level/:levelId, /practice, /practice/session/:sessionId, /teacher and /admin/import-questions. References: frontend/package.json; frontend/src/router.tsx.
- Backend: Django 5/DRF, PostgreSQL, Redis/Celery. References: backend/requirements/base.txt; backend/config/settings/base.py.
- Server facts: ArenaSession.started_at, submitted_at, abandoned_at, kind and user; QuestionAttempt rows; append-only ProgressRecord for finalized sessions. References: backend/apps/exercises/models.py, backend/apps/progress/models.py, backend/apps/progress/services.py.
- Session code: StartClassworkView, StartLessonClassworkView, StartPracticeView; BulkSubmitAttemptView; FinalizeSessionView. Practice buffers answers in the browser before bulk submit; a tab-close can lose unsent attempts, creating an observational blind spot. References: backend/apps/exercises/views.py; frontend/src/features/practice/InArenaPage.tsx.
- Existing stale-session Celery task checks timeouts measured from started_at, then marks abandoned_at; do not call this a verified “user quit” signal, and verify task scheduling in deployment before relying on it. Reference: backend/apps/exercises/tasks.py.
- There is student HUD progress via users/stats.py. The main frontend admin route found is **question import**, not a product metrics dashboard; Django's /admin/ is separate. The user's existing metrics dashboard may be another branch/app/environment: **unverified integration dependency**, never assume absent in production.
- Main currently has STUDENT, TEACHER, ADMIN UI routes, a User model with DOB/consent-related entities, and an existing RBAC boundary. Parent/guardian, partner organizations, and institution-specific curricula must be checked against actual integration branches rather than inferred from future plans.
- Main's feature governance requires same-digest PM/CTO/Head QA approval before coding. Source: AGENTS.md; docs/AI_SDLC.md; skills/feature-scoper/SKILL.md.

### 4. Four proposed top-line metrics (definitions to vet)
| ID | Metric | Provisional definition | Product action |
|---|---|---|---|
| M1 | Weekly meaningful active students | Unique STUDENT accounts with >=1 finalized classwork or practice session in a rolling 7-day window, with >=5 attempted (non-skip) questions | Verify recurring genuine learning; candidate later North Star |
| M2 | First-value activation in 7 days | New students who reach M1 qualifying session within 7 x 24h of account creation / eligible new students | Diagnose sign-up/onboarding/first practice |
| M3 | Session completion | Sessions finalized within defined window / server-created sessions, by kind and origin | Diagnose lesson/practice abandonment |
| M4 | New-teacher activation | Newly registered teachers with at least one enrolled student's qualifying completed session within 14 days / new eligible teachers | Diagnose B2B onboarding friction |

Supporting drilldowns only: onboarding-to-start funnel, returning activated users, time to first value, reason-code distribution, classwork vs Arena split, desktop/mobile category. No fifth KPI tile yet.

**Open definitional gaps:** (i) qualifying historical sessions without attempt evidence; (ii) registration-to-first-session lag and learner timezone; (iii) practice session reset, resume and tab-close; (iv) teachers created through migration/admin; (v) thresholds for “enrolled”/test actors. Resolve before implementation.

### 5. Journey maps
**Student:** registration/consent -> onboarding shown -> onboarding finished -> Learn or Arena viewed -> lesson/practice configuration seen -> start attempted -> ArenaSession created on server -> first answer attempted -> session finalized -> meaningful return. An “abandonment” label requires an expired observation window; immediate navigation away is not conclusive.

**Teacher:** registration -> teacher portal viewed -> batch created -> student joins -> enrolled student meaningfully practices. If no student has joined, that is a different failure from “student joined but never practiced.”

**Investigation views:** funnel bar by step and counts, biggest drop-off, time to next step, segment by role/journey/mode, trend by calendar week. Keep sample size and instrumentation coverage visible.

### 6. Candidate event contract
Minimum client-side signals, collected only if authorized: screen_step_seen, onboarding_finished, start_clicked, journey_error (allowlisted code). All other milestone events should be calculated from authoritative Django records rather than mirrored as browser analytics “completed” claims.

Proposed allowed fields: event_uuid, event_name (enum), flow_key, step_key (enum), app_version, device_class (desktop/tablet/mobile), server_recorded_at; optional session UUID only if owned by authenticated user. Identity is server-attached, not from an untrusted client user ID. No free text, answer content, IP, DOB, full URL, call sign, email, keystrokes or DOM capture. Instrumentation must never block learning.

Draft1 suggests a single analytic event collector to facilitate explicit funnel tracking; rates are calculated from a mixed server-authoritative and client-provisional dataset with clear source labels. Avoid relying on session replays to explain children.

### 7. Technical option survey
| Option | Strength | Cost/complexity | Data/privacy risk | Draft 1 view |
|---|---|---|---|---|
| A. PostHog Cloud, manual events + curated server events | Funnels, retention, paths quickly; JS and Python SDKs; 1M events/month free at time of research | SDK + identity + hosted service + query-to-admin integration | External processor for child-related behavior; IP/autocapture defaults must be audited; deletion and residency | **Tentative favorite for rapid product exploration, subject to legal/privacy review** |
| B. First-party Django/PostgreSQL aggregate + small allowlisted UI telemetry | Reuses authoritative data and existing admin auth; no external vendor | Engineer 2–3 funnels, storage/retention and aggregation; constrain scope | Lower external exposure but still child behavioral processing and security responsibilities | Strong fallback |
| C. Mixpanel/Amplitude | Mature funnel/retention tools | More vendor integration and billing/ops complexity | Same minor-data due diligence; another analytics surface | Defer |
| D. GA4/Clarity or generic replay | Generic traffic/recording | Easy plug-in | Poor fit for educational journeys; Clarity under-18 restriction | Reject |

Technical items to validate BEFORE choosing: current admin dashboard code/location; whether anonymous pre-login flow is needed; backend volume/cardinality; deletion policy; minor consent/purpose coverage; foreign transfer; telemetry delivery failures; partner segmentation and permissions; event-to-canonical-session join.

Vendor sources: [PostHog pricing](https://posthog.com/pricing), [manual capture and privacy](https://posthog.com/docs/privacy), [PostHog SDK](https://posthog.com/docs/libraries/python). Published plans and prices can change; do not turn current rates into a budget guarantee.

### 8. Draft implementation outline (NOT AUTHORIZED)
1. **D0 | Inventory/readiness** — locate real admin metrics dashboard and existing telemetry, validate main/feature refs, inspect tests, record data/consent policy and benchmark decisions.
2. **D1 | Metric dictionary** — finalize M1–M4 definitions, eligibility, cohort windows, exclusions, edge cases, data ownership, sampling and late-event handling; align teacher/student flows.
3. **D2 | Architecture decision** — timeboxed proof of a server-record-derived funnel and optional PostHog manual event pilot using synthetic data only; score build vs buy against child privacy, admin integration and maintainability. No third-party child export without explicit approval.
4. **D3 | Instrumentation** — minimum explicit frontend step signals, authoritative session queries/aggregates, single ingestion endpoint or approved vendor SDK. No replay.
5. **D4 | Admin** — one minimal page with four metric cards, segmented start->completion funnel, trend, data freshness, numerator/denominator, thresholds for low volume.
6. **D5 | QA + rollout proposal** — tests for event duplication, refresh/resume, completed vs abandoned, cohorts, auth/tenancy, mobile, child privacy; shadow validation against DB totals; staged flag and kill switch; human decision for deployment.
7. **D6 | Learn** — weekly metric review: baseline -> hypothesis -> small UX fix -> remeasure; choose North Star only after data quality passes and at least four comparable weeks of observations.

### 9. Risk register for adversarial review
- R1 P0: minors' behavioral tracking, India DPDP/COPPA/GDPR: counsel/privacy sign-off and appropriately scoped consent/purpose BEFORE optional telemetry.
- R2 P0: no verified existing admin metrics code on main, so “add four cards” may imply new admin UI or integration with an external system.
- R3 P1: PostHog person/session stitching or auto-capture may leak student identifiers; disable by default and prefer first-party if uncertain.
- R4 P1: practice browser-buffered attempts and stale abandonment can bias dropoff rates.
- R5 P1: inconsistent funnel denominator may create false product decisions.
- R6 P1: tenant/institution isolation once multi-curriculum partnerships are integrated.
- R7 P2: cost explosion with unbounded events or overengineered dashboards.

### 10. Requested review questions
**CTPO:** Are these the smallest four questions relevant to current stage? Is vendor analytics necessary?  
**Head of Engineering:** Which option integrates safely with this exact React/Django/Postgres/Celery stack and existing admin? Is delivery credible without a queue/new warehouse?  
**Head QA:** Can the funnel be trusted across retries, refreshes, timezones, backfills, privacy, roles, and stale sessions?

**Status:** No implementation, no production changes, no G1 approval. This draft intentionally keeps the vendor decision provisional.
