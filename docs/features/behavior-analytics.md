# Feature tracker — Behaviour Analytics / Journey Intelligence

**Feature:** BA-ANALYTICS-001  
**Status:** FINAL SIMPLIFICATION + DEVELOPER HANDOFF COMPLETE — IMPLEMENTATION NOT AUTHORIZED  
**Date:** 2026-10-15  
**Repository:** aranya-squad/Bolt-V1  
**Branch:** feat/behavior-analytics-discovery-plan-2026-10-15 (created from current main)  
**Task:** repository **code read-only**; add only these new Markdown planning documents. No code, migration, tests, production data or deployment mutations.

## Read documents in order
1. [Draft 1 — research and options](behavior-analytics/01-draft-v1.md)
2. [Adversarial CTPO / Head Engg / Head QA review](behavior-analytics/02-adversarial-role-review.md)
3. [Draft 2 — revised and simplified](behavior-analytics/03-draft-v2.md)
4. [Lead BA plan (prior synthesis)](behavior-analytics/04-final-lead-ba-plan.md)
5. **[Final simplification/architecture recommendation](behavior-analytics/05-final-simplified-architecture.md)** — authoritative latest product/architecture recommendation
6. **[Developer implementation handoff](behavior-analytics/06-developer-implementation-handoff.md)** — detailed waves, categories, tasks, priorities, success criteria and cross-feature non-duplication checks

## Owner-oriented summary
Four proposed dashboard metrics: Weekly Meaningful Active Students (candidate North Star, **not selected**), 7-day first-value activation, matured 48-hour session completion, and 14-day teacher class+enrollment activation.

**Recommended future architecture:** source-first reporting from existing Django/Postgres ArenaSession + QuestionAttempt + ProgressRecord + Class + Enrollment, with one ADMIN-only DRF read endpoint and one compact React insights page. Use optional first-party explicit UI intent signals only when a measured gap justifies them AND legal/purpose/child-data reviews allow collection. No Clarity, child session replay, autotracking or SaaS SDK in minimum V1.

**Source gap:** main exposes frontend /admin/import-questions and Django admin; an additional existing metrics dashboard the owner mentions is not verified in inspected main code. Locate real implementation before writing UI.

**Source limitation:** ArenaSession does not reference a Class, so do not count a multi-enrolled student's practice as teacher-attributable. The teacher KPI measures first class and first enrollment instead.

## Latest final-pass finding (2026-10-15)
- No new analytics provider, event table, click recorder, database or job is needed for the **baseline four metrics**; reuse Django/Postgres and existing ADMIN/React structures.
- Recheck PR #2 teacher dashboard, PR #3 batch assignment, PR #4 CI/release hardening, plus Answer Recovery and Daily Quests branches. Do not reimplement their existing service/routes, write to progress state, or duplicate already tested features.
- Teacher KPI intentionally measures first class+enrollment, not unattributable student practice; student pre-start page abandonment remains **NOT MEASURED** without separately approved telemetry.
- The actual admin metrics dashboard requested by the owner was not verified in inspected main; this is a W0 discovery blocker before UI implementation.
- This planning branch added only Markdown files. No tests, G1/G2 gates or independent agent reviews have been run for this feature.

## Governance status
- Formal PM approval: **PENDING**.
- Formal Senior Tech Manager/CTO approval: **PENDING**.
- Formal Head QA approval: **PENDING**.
- Required Security/Privacy and Data/Integrity assessment: **PENDING**.
- Frozen scope SHA-256: **NOT CREATED**; research/planning draft is not G1.
- G1/G2 implementation gates: **NOT RUN**.
- Actual runtime, staging, CI or LIVE verification: **NOT PERFORMED**.
- Merged/deployed: **NO**.

**Reviewer provenance:** The three adversarial sections and final Lead BA synthesis are analytical role-based passes in the available assistant session, not separate verifiable agent executions or signoffs. Do not represent them as independent agent approvals in later work.

## Immediate follow-up (separate authorized feature work only)
1. Recheck refs and locate the actual admin dashboard.
2. Validate account eligibility, timing windows, meaningful session threshold with synthetic/staging fixtures.
3. Record jurisdiction-specific permission/purpose and retention decisions for any minors' telemetry.
4. Freeze the accepted exact scope and create the canonical .scope.md and .plan.json with genuine PM/CTO/QA and required specialist signoffs.
5. Only after G1/G2 proceed with backend Wave 1; keep Wave 3 event capture conditional.
6. Preserve human-owned merge and deployment boundaries.

## Reference
Follow [AI_SDLC.md](../AI_SDLC.md), [AGENTS.md](../../AGENTS.md), [BOLT_BOOTSTRAP.md](../../BOLT_BOOTSTRAP.md) and current code over this snapshot. Correct relative links for repo-root docs from this tracker are [docs/AI_SDLC.md](../AI_SDLC.md) and [AGENTS.md](../../AGENTS.md).
