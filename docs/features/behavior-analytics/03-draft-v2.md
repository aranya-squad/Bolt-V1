# Bolt V1 — User Journey & Behaviour Analytics
## Draft 2: simplified after adversarial review

**Date:** 2026-10-15  
**Input:** 01-draft-v1.md + 02-adversarial-role-review.md + targeted second-pass source inspection.  
**Status:** revised product/architecture candidate; **NOT** G1-approved or authorized for coding.

### 1. Changed decisions since Draft 1
| Ref | Draft 1 | Draft 2 / disposition |
|---|---|---|
| P-01/E-08 | PostHog Cloud tentatively preferred | **First-party/server-first**. No external SDK, replay, autocapture or third-party child export in v1. |
| P-02 | Assume admin dashboard integration | **D0 dependency**: locate actual existing dashboard; main React has only /admin/import-questions; if no other artifact exists, propose a compact new protected admin insights route. |
| E-01/E-02 | Mixed client + server conversion claims | **Canonical session table + progress + attempts**; client events measure only screen/intent and cannot assert actual completion. |
| Q-04 | Rough abandonment rate | **48h matured server-created cohort**, with incomplete/expired/unknown states. |
| Q-01/Q-06 | Unclear duplication and percent quality | **Deduped IDs, n/N, period, low sample display and telemetry coverage.** |
| Q-02/P-01 | Privacy to be reviewed “at some point” | **P0 legal-purpose/consent gate before any new child behavior event is stored**; feature flag defaults OFF. |
| New BA verification | “Teacher first student practices” seems useful | **Not attributable on main**: ArenaSession links to student, not Class/Enrollment. A student enrolled with two teachers may practice once. Avoid attributing that to either teacher; M4 becomes first batch with >=1 enrollment. |

### 2. Final candidate metrics — only four headlines
**Reporting period for M1:** completed ISO-style calendar week (Monday–Sunday) in UTC; UI explicitly labels dates. A seven-day rolling preview may exist later, but never mix definitions. Teacher/student cohorts use UTC instants, not device clocks. Internal staff/test accounts must be excluded through an explicit QA-controlled registry or otherwise labeled unknown; no fabricated is_test_user field.

| ID / name | Numerator | Denominator / cohort | Maturity and notes |
|---|---|---|---|
| M1 — Weekly Meaningful Active Students (WMAS) | Distinct STUDENT users with >=1 qualifying ProgressRecord in the completed week | Distinct eligible STUDENT users with account by week end as contextual population only; report primary **count**, not misleading percentage | Qualifying = finalized ArenaSession + >=5 distinct questions with a non-skip attempt; initial threshold to validate against data distribution; no score/accuracy minimum; include Classwork and Arena separately in drilldown |
| M2 — 7-day First-Value Activation | Eligible new students whose first qualifying session finalizes within 168h of account creation | Eligible STUDENT signups in a *matured* signup cohort (created >=7 days ago), with non-production/demo account handling explicitly resolved | Display n/N and median time-to-value for converters; right-censor new accounts and differentiate “never started” vs “unfinished” |
| M3 — 48h Session Completion Rate | Distinct server-created sessions with submitted_at <= started_at+48h | Distinct server-created STUDENT ArenaSessions whose 48h observation window has closed | No automatic assumption that missing finalized = rage quit; split unfinalized sessions into server abandoned_at and still-open/unknown; by kind and classwork/practice |
| M4 — 14-day Teacher Onboarding Activation | Teachers who created >=1 class and have >=1 enrollment in that class within 336h of registration | Matured eligible new TEACHER signups | First-class creation and first enrollment are diagnostic steps. Do not call this “students taught”, “learning delivered” or “teacher revenue.” |

**Potential North Star:** M1 as *candidate only*, because it measures actual practice instead of login traffic. Compare with M2–M4 and quality guardrails after four trustworthy completed weeks. Keep educational-quality diagnostics: per-kind accuracy distribution from existing progress, number of skipped answers, anomalously short sessions. Never tie completion to perfect scores.

### 3. Product questions -> simplest journey views
**Student activation funnel:** eligible signup -> onboarding observed (privacy-cleared telemetry) -> Learn/Arena entry seen (privacy-cleared) -> server session created -> >=1 persisted non-skip attempt (not guaranteed for browser-buffered practice) -> finalized -> M1 qualifying threshold. Aggregate at role/cohort/mode level; no replay or individual child click trail. Onboarding viewed/mode seen cannot be backfilled historically; show “not instrumented” before activation date.

**Teacher onboarding funnel:** teacher signup -> first Class.created_at -> first Enrollment.enrolled_at. Because main ArenaSession has no class reference, subsequent student practice cannot be assigned to a teacher without a separate approved attribution design. If later org/tenant models become active, redesign server-owned dimensions before partner comparisons.

**Friction diagnostic:** time between steps for converted journeys, segment classwork vs practice and desktop vs mobile when compliant, intentional back navigation vs unknown, error counts with categorical codes only. One drilldown chart, not an open-ended event/path explorer.

### 4. Source-of-truth mapping
| Fact | Existing source | Reliability notes |
|---|---|---|
| Account created / role | backend/apps/users/models.py User.created_at, role | Existing user deletion can restate cohorts; qualify actor eligibility |
| Teacher created class | backend/apps/classroom/models.py Class.created_at, teacher | Current owner relation is direct; partner org not assumed |
| Student enrolled | backend/apps/classroom/models.py Enrollment.enrolled_at, class_room | Enrollment could become inactive; measure creation then report active-state separately |
| Session started | backend/apps/exercises/models.py ArenaSession.started_at, kind, user | Resume returns existing session; dedupe by UUID |
| First persisted non-skip answer | backend/apps/progress/models.py QuestionAttempt, session relation | Practice may send only in final bulk request; absence is unknown, not proof no answers |
| Session finalized | ArenaSession.submitted_at + ProgressRecord | Prefer ProgressRecord for valid result; idempotent finalize only one result |
| Session abandoned | ArenaSession.abandoned_at, exercises/tasks.py | Asynchronous threshold based on started_at; task may be disabled live, do not equate to user abandonment |
| UX screen/intention | Proposed small React telemetry | Not existent on main; supplementary only, privacy approval necessary |
| Current admin data | frontend/src/router.tsx /admin/import-questions and Django admin | Broader dashboard user describes NOT verified on main |

### 5. Revised technical recommendation
**V1-A (recommended): first-party database-derived product metrics**, from existing Django 5/Postgres tables. Backend DRF ADMIN-only endpoint returns four summary counts, n/N, time window, freshness, and segment split; React renders one protected page or integrates into verified admin dashboard. Start with bounded time-window SQL queries and existing indices. Optimize only after staging EXPLAIN, table sizes, query timings. No analytics vendor, warehouse, new auth store, or event stream.

**V1-B (conditional): minimal first-party UI event collector** if counsel/product purpose approves minors' behavioral observations. Proposed input: event_uuid, event_name (whitelist: onboarding_finished, journey_step_seen, session_start_intent, journey_error), flow_step enum, journey_key enum, device_class optional, app_build; server sets user from JWT, role, received_at. No arbitrary props or URL, input, profile or child identifiers in payload, and no capture before proper approvals. Server validates session ownership where supplied, rate-limits, dedupes IDs, and restricts analytics to ADMIN only. New table has short retention, archive/delete automation only after approval. Off switch disables ingestion instantly. Child-data safety is a release blocker, not “soft launch.”

**Deferred:** PostHog SaaS with manual capture as optional adult-only/future fully-reviewed analysis tool. If reconsidered, evaluate EU region/contract, consent/legal basis, person identity resets, egress/DPA, deletion, pricing, sync back to admin, and no SDK auto capture/replay. Mixpanel/Amplitude likewise defer; Microsoft Clarity disallowed for Bolt's child-directed product (see FAQ).

**No need now:** OpenTelemetry traces as user analytics, Kafka, ClickHouse, Snowflake, full event-bus, per-question UX event stream, websocket dashboard, streaming ETL or feature-flag service.

### 6. Privacy and security prerequisites
- India: DPDP section 9 child-data tracking/behavioural restrictions and narrow educational exemptions require counsel assessment of *Bolt as a vendor vs educational institution* and applicability timing; no assumed exemption. Rule status is phased.
- U.S.: COPPA and FTC's school-authorization limitations require scope-of-use and notices review; school authorization is not a blanket product growth permission.
- Other markets: GDPR/UK GDPR-K, parental consent thresholds, deletion and data-subject rights reviewed before storing identifiers.
- Internal first-party analytics is still regulated processing. Reject full URL, referrer query strings, answers, DOB, email, join codes, session replay, screenshots, audio, mouse-movement streams, unnecessary IP/device fingerprinting. Avoid selling/cross-site tracking.
- ADMIN-only aggregates; do not expose row-level child trajectories or teacher-visible platform-wide data. Minimum cell size for segments (suggested suppress if <10 unique users, subject to security/privacy signoff). No client-controlled org_id filters; server-owned joins only.
- Purge and deletion policy for telemetry separate from legally retained consent evidence; never mutate immutable ConsentRecord/EnrollmentConsent. Define if de-identified aggregate history is preserved, how deleted accounts affect historical counts, and who may access logs.

### 7. Incremental plan before formal G1
| Wave | Scope and outputs | Priority | Blocking gate |
|---|---|---|---|
| W0 — Evidence and privacy | Source/ref/current-admin discovery, risk legal decisions, baseline SQL specification, data distributions | P0 | no live data touched during THIS planning task; later sandbox and counsel approval |
| W1 — Four backend metrics | Bounded aggregate queries, eligibility rules, REST response shape, API RBAC, deterministic fixtures and staging query performance | P0 | G1 approval, W0 definitions |
| W2 — Admin read-only insights | Integrate existing verified admin, else create minimal admin page: 4 cards + one funnel + freshness/low-n | P1 | W1 reconciled |
| W3 — Opt-in intent telemetry | Two to four explicit journey events, server validation, retention and consent gating; only when justified by unresolved dropoff | P1 CONDITIONAL | privacy + purpose documented; W1/W2 validated |
| W4 — Interpretation and decision | Monthly cohort comparison, qualitative teacher interviews, priority UX issue backlog, North Star decision only after stable data | P1 | four complete stable weeks |

**Scope control:** If W1 answers the product problem sufficiently, W3 is not auto-approved. No feature coding begins in this planning task. Real feature development must generate frozen docs/features/<feature>.scope.md + .plan.json, explicit same-hash PM/CTO/QA + specialist Security/Data approvals and pass G1/G2. These role notes do not satisfy that gate.

### 8. Acceptance criteria for future scope
- AC-01 M1–M4 reproduce expected counts on synthetic PostgreSQL fixtures, including retry, duplicate session, multi-teacher enrollment and skip-only sessions.
- AC-02 No user except ADMIN accesses aggregate endpoint, even via direct API; no student-level rows returned.
- AC-03 Incomplete 48h session cohort and immature 7d/14d user cohorts excluded from denominators.
- AC-04 Every KPI shows n/N or count, period, source, eligibility, last refresh; low-n segments suppressed or hidden.
- AC-05 Classwork, practice, FLASH_CARDS, Test Mode, skips, transient network loss, refresh/resume and abandoned_at cases produce explicit expected states.
- AC-06 If telemetry is included: whitelist and schema reject arbitrary fields; double dispatch doesn't double count; account switch/logout don't link children; no capture before approval/consent; disabled collection produces no requests.
- AC-07 Staging SQL execution plan and latency under representative cardinality, with explicit threshold agreed before implementation; no production EXPLAIN or live queries by this task.
- AC-08 Reconcile daily aggregate counts with direct source SQL and instrumented coverage, show UNKNOWN where insufficient evidence.
- AC-09 No tests, CI, live analytics, tenant-isolation policy or role approvals are claimed merely because this document exists.

### 9. Open items for Lead BA finalization
1. Locate the actual “existing admin dashboard” implementation; show path/ref or mark UNKNOWN, default no destructive integration.
2. Confirm admin-facing definitions owner and desired locale; default UTC for counts to avoid timezone drift.
3. Determine whether historical production data can be viewed only after separate authorization. This plan is **source-only**.
4. Decide any new under-18 UX telemetry purpose/consent with counsel, including India vs US vs EU policies.
5. Test eligibility strategy for demo/internal accounts — do not silently exclude via email string matching.
6. Determine staging query p95 and anticipated event volume before adding migration/index/retention jobs.

**Draft 2 outcome:** Prefer minimum measurable value with existing tables. Optional event collection is deferred until necessary and lawful. Ready for Lead BA consolidation, not for implementation.
