# Bolt V1 — Adversarial CTPO / Head of Engineering / Head QA review
## Review of Draft 1, with required improvements for Draft 2

**Date:** 2026-10-15  
**Source:** 01-draft-v1.md on this branch; same reviewed initial document.  
**Review status:** ADVERSARIAL ROLE-BASED REVIEW, NOT FORMAL G1 SIGNOFF.  
**Independence disclosure:** Separately runnable CTPO/Engineering/QA agent sessions were unavailable in this environment. The following are explicitly separated adversarial role perspectives prepared in one assistant session, **not fabricated autonomous agent outputs or independent approvals**. The Lead BA synthesis that follows must not describe these as independent signed approvals.

### Overall verdict
**REVISE BEFORE SCOPING.** Draft1 is directionally useful but tries to buy a product analytics tool before proving the existing database cannot answer most high-value questions. The child-data issue, missing admin dashboard integration evidence, and event double-counting would make an analytics launch unsafe or misleading.

## A. CTPO review — value vs current stage
| Finding | Severity | Challenge | Requirement for Draft 2 |
|---|---|---|---|
| P-01 | P0 | “Rapid exploration” is not sufficient justification for sending child journeys to SaaS analytics. | Choose first-party DB-derived aggregates as default; make third-party a future evaluated option requiring human privacy/legal clearance. |
| P-02 | P0 | The request says “existing admin metrics,” but main has only admin XLSX import as bespoke frontend admin route. | Introduce admin integration discovery gate; never invent existing dashboard components. |
| P-03 | P1 | Too many dimensions early; no specific decisions or owners. | Four headlines only; one student funnel and one teacher onboarding funnel; each must have a weekly product action. |
| P-04 | P1 | Meaningful learning uses >=5 attempted questions, yet classwork and modes may differ. Threshold could hide genuine sessions. | Label >=5 as proposed initial filter, verify historical distribution and count every eligible type; keep raw completion count alongside qualifying value. |
| P-05 | P1 | Teacher activation conflates teacher self-onboarding with student usage, subject to teacher's teaching cadence. | Use 14-day first enrolled-student meaningful activity and separately expose “batch created” diagnostic. Segment direct vs invited/admin-created teachers when data supports it. |
| P-06 | P2 | Picking a North Star while metrics are not proven would be performative. | Mark candidate only, require 4 complete stable cohort weeks and review of quality/education guardrails. |
| P-07 | P2 | Generic path discovery, feature experimentation and learning concepts are premature. | Defer paths/heatmaps/replay/experiments; reserve space for next iteration without implementation now. |

**CTPO disposition:** CONDITIONAL PASS for *planning only*, if P-01 through P-07 are reflected in Draft 2. No signature on a frozen implementation scope.

## B. Head of Engineering review — backend/frontend and ops
| Finding | Severity | Challenge | Required change |
|---|---|---|---|
| E-01 | P0 | Frontend “start_clicked” is not equivalent to server-created session; mirroring server milestones in PostHog creates drifting counts. | One canonical truth: ArenaSession, QuestionAttempt, ProgressRecord. UI telemetry is labeled intent/observation only. |
| E-02 | P0 | Existing practice buffers attempts locally then bulk-submits; network/tab close can produce zero server attempts. | Funnel stops at “session server-created” unless canonical first attempt persisted; show “unknown/unsent” rather than falsely classifying disengagement. |
| E-03 | P1 | Every journey click can grow Postgres quickly; no need for a warehouse or ClickHouse now. | Allowlist 3–4 client event types, fixed properties, bounded rate/size, retention; start with existing indexed tables; measure explain plans before new indices. |
| E-04 | P1 | Server sessions have late finalizations and stale-abandonment async; task presence does not prove live Celery. | Define closed maturation windows, as-of time and 48h lag for session denominators; finalization and abandon classified by server timestamps, never client clock. |
| E-05 | P1 | Admin metrics endpoint could introduce expensive full-table joins and leakage. | One admin-only read endpoint, aggregation limited to date ranges, safe filters, response caching where measured. Require DB EXPLAIN and row estimates. |
| E-06 | P1 | Optional DB replica routes must be considered; Celery/Redis operational state is unverified. | Explicit primary/replica source plan, read freshness; no new service/queue as prerequisite. |
| E-07 | P1 | Future partner organizations are not shown as shipped on main. | Treat org_id as future server-owned dimension; do not invent an organization FK or expose tenant data by request param now. |
| E-08 | P1 | Adding an analytics SDK now would require a second identity lifecycle, cookie/storage policy and outbound egress. | No SaaS SDK in first release; architecture note for adapter if later approved. |
| E-09 | P2 | User identity is persisted in Zustand; SDK init on route changes can leak prior user's identity. | First-party collector server-authenticated; tests for logout/account-switch and no client identity injection. |

**Head Engineering disposition:** REJECT Draft1 vendor-first default; APPROVE first-party server-first alternative for further scoping, contingent on privacy gate and exact implementation contracts.

## C. Head QA review — validity and failure cases
| Finding | Severity | Failure / adversarial test | Draft 2 requirement |
|---|---|---|---|
| Q-01 | P0 | Refresh/retry doubles screen or start events; denominator grows, dropoff appears worse. | Deduplicate event UUIDs and server session IDs; define event occurrence vs distinct person/session metric. |
| Q-02 | P0 | Child/student data sent before consent policy check. | Collection disabled until purpose/consent review and config verified; automated no-PII tests; kill switch. |
| Q-03 | P0 | A teacher can query student journeys outside authorized classes or admin metrics endpoint has no role protection. | ADMIN-only global view; no teacher-level raw telemetry; 403 and cross-user negative tests. |
| Q-04 | P1 | Old unfinished session counted instantly as “quit”; Celery may not run; valid sessions might resume. | Unknown/in-progress bucket until maturation window; distinguish inferred timeout from intentional exit. |
| Q-05 | P1 | Test/admin accounts, imported accounts, employees and bots pollute cohorts. | Document explicit eligibility/exclusion taxonomy and data quality “unknown” bucket. |
| Q-06 | P1 | Percentage without numerator, denominator or sample size creates false precision. | Always show n/N, exact date range, freshness, eligibility rule and low-n suppression. |
| Q-07 | P1 | Week-2 retention measured before every cohort member has a complete return window creates survivorship bias. | Use mature signup/activation cohorts; dates in UTC, visual period in consistent configured timezone, never mix. |
| Q-08 | P1 | Counts may differ after deletion, backdated sessions or idempotent finalize requests. | Canonical queries + reconciliation cases; deletion propagation and documented historical restatement. |
| Q-09 | P1 | Browser blocked analytics, offline sessions or HTTP errors undercount intent. | Coverage indicator and no claim that missing client event = no user action. |
| Q-10 | P2 | Only happy paths tested; test mode, FLASH_CARDS, skips and different session kinds change the meaning of “meaningful.” | Cross-mode matrix, skip logic, tests for mixed attempts and disabled answer tracking. |

**Head QA disposition:** BLOCKED until clear acceptance criteria, privacy policy, deterministic cohort fixtures and server-vs-client distinction exist. No executed tests claimed.

## D. Cross-role disagreements and resolution
1. **PostHog vs first-party:** Draft1 tentatively favored PostHog; Engineering and CTPO reject vendor-first for a child-centric early-stage product. **Resolution: first-party/server-first; no third-party analytics SDK, session replay, heatmaps, click autocapture or raw event export in first release.**
2. **First-answer event:** Product wants explainable abandonment; Engineering says practice answers may remain browser buffered and QA says telemetry cannot certify persistence. **Resolution: use backend first-attempt as canonical when present; optional single provisional client first-interaction count only after legal review, explicitly not a score.**
3. **Dashboard:** Product assumes existing admin analytics; repository does not show it. **Resolution: Gate D0 must locate the genuine dashboard or state it is external/unmerged. Default to one small /admin/product-insights route rather than forcing integration with a nonexistent page.**
4. **Teacher B2B dimension:** Keep one teacher activation headline, but don't overbuild the full teacher lifecycle. Batch creation and enrollment are simple supporting checks, not extra tiles.
5. **Data privacy vs analytics scope:** Privacy is not solved by self-hosting. A first-party event table can still be impermissible. **Resolution: Phase 0 review sets jurisdictions, lawful purpose/consent and child tracking restrictions; server-derived educational operations metrics may proceed only within an approved purpose, while all new UX telemetry stays OFF otherwise.**

## E. Simplification mandate to the Lead BA
| Category | Remove / simplify | Keep |
|---|---|---|
| Scope | Arbitrary paths, A/B tests, session replay, raw per-child journeys, in-app surveys, heatmaps | 4 admin metrics, one student funnel, one teacher funnel |
| Stack | PostHog install, event bus, external warehouse, Kafka/ClickHouse, new identity provider | Existing Django/DRF + PostgreSQL, thin React instrumentation after compliance gate |
| Events | Broad autocapture and “click everything” | 2–4 explicit product UX events, allowlist, TTL, optional telemetry OFF by default |
| Reporting | Multi-page analytics portal and fancy cohort builder | Compact admin page + CSV deferred; numerator/denominator, freshness, sensible filters |
| Reliability | Immediate abandonment count, frontend completion assertions | Matured server sessions, dedupe, quality reconciliation, missing-data bucket |
| Signoff | Treat these notes as approval | Create frozen G1 scope later; actual independent PM/CTO/QA + Security/Data signoffs still required |

## F. Checks requested of Draft 2 (document review, not test execution)
- All four KPI definitions supply numerator, denominator, audience, window, exclusions and “unknown.”
- Every funnel step labels authoritative vs provisional provenance and handles practice unsent buffer.
- One table maps source files and existing services to planned data flows.
- Stage gates separate zero-new-tracking read-only baseline from child UX telemetry.
- Explicit test matrix covers sessions, modes, retries, permissions and PII.
- Source links, admin dashboard gap, operational UNKNOWNs and no-live boundary are preserved.
- Feature governance is obeyed: planning docs ≠ G1 signoffs; no coding starts.

**Review outcome:** Draft 2 must be smaller, safer and falsifiable. Independently staffed approvals remain PENDING.
