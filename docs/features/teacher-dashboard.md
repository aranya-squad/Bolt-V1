---
status: IN PROGRESS
branch: feat/teacher-dashboard
base_commit: ec74cf3882b8a2dafc9f9c1e0d70e24c496364d0
current_commit: e7b81dc4dc258f5efa62d256952a38a901729b97
last_checkpoint: 2026-10-01
owner: coordinator
planning_gate: bolt-work-three-role-v1
scope_file: docs/scopes/teacher-workflows-v1.2.md
scope_sha256: 19697b1a3061d588b8b0ed2ebd78b3c9d375830e68469ef5951f183974d51ff8
pm_signoff: APPROVED
cto_signoff: APPROVED
qa_signoff: APPROVED
implementation_started: true
---

# Teacher dashboard and roster correctness — F1

## Goal / approved scope

Implement only F1 in the frozen `docs/scopes/teacher-workflows-v1.2.md`.
Three distinct agents approved the same v1.2 digest before any feature coding:
PM `/root/product_manager`, CTO `/root/cto_reviewer`, QA `/root/head_qa`.
Full findings/resolutions are in `docs/reviews/teacher-workflows-scope-v1.2.md`.
User authorizes development after these approvals; no extra generic human gate.

Active enrollment/reporting agreement, batched primary read queries, preserved
metrics/ownership, identity-scoped teacher queries/late settlements, lesson-ID
matching and truthful Refresh in existing screens. No assignment code in F1.
F2 will have its own stacked branch/tracker after F1 integration.

## Completed

- Rechecked remote refs; no existing dashboard/assignment branch or newer setup.
- Setup closed at ec74cf3 under owner G acceptance; historical evidence retained.
- Frozen categorized PM scope and CTO/QA signoffs copied with matching digest.
- Source evidence/runtime prior lineage preserved; baseline measured before feature code.
- Baseline run36861089263 at82fd045: all24fixtures/144requests complete; list3–22, roster cold27–752/warm7–152, matrix6–44 data queries. Detailed values/timings/plans/limits: `docs/verification/teacher-reporting-2026-10-01.md`.
- Three-role signoff plus completed measurement released source writers for F1.
- Local Python3.12/Django5.0.6 dependencies and Node20.19.5/frontend lockfile
  dependencies provisioned; baseline TypeScript and 73 Vitest tests pass.
  Native PostgreSQL16.15/Redis7.4.11 ran in isolated CI; local root cannot run PostgreSQL and no identity shim was used.

## In Progress

F1 source integrated;273backend tests (zero skipped) and94frontend tests pass.
Measured query budgets1/4/4 hold across all144requests. CTO/QA source findings
fixed without weakening tests. Real built-SPA/API finalization browser rerun pending
a test-only correction respecting the existing200ms minimum-answer rule.
F2 may start from this integrated and checked source; neither feature is READY
until required browser/integrated acceptance is executed.

## Verification / acceptance

F1-AC01..08 and BOTH-AC01 in frozen scope govern delivery. Planning approval is
not executed QA evidence. Required: 5/10/50/150 student and 1/5/20 class cold/warm
SQL/value/latency before/after, primary/router + ownership/report fixture tests,
real committed finalization, frontend account-switch/delayed response tests,
lint/types/Vitest/build, full backend suite and built-SPA real API integration.

## Ownership / dependencies

Coordinator owns tracker/integration/runtime allocation. One backend writer owns
classroom source/tests; one frontend writer owns frontend source/schema/mocks/
tests. No concurrent writers share files. Each F2 writer resumes only from the
integrated F1 checkpoint. Base ec74cf3 includes unmerged baseline → workflow →
recovery → continuous context → context setup. Human integration targets main,
draft while prerequisites pending. Feature-only range ec74cf3..this branch;
full comparison main..this branch. No main/feat-Sagar commits/pushes or deploy.

## Risks / blockers / deferred work

No unresolved product decision in signed F1. Required runtime checks may block
readiness if provisioning fails; report exact evidence rather than weakening gates.
Hosted CI/live revision/topology/log/health remain UNKNOWN. Tournament rules,
historical auth/recovery recreation, enrollment/consent/admin changes and prerelease
image/health/deletion/auth repairs are excluded. F2 is separately tracked.

## Next Exact Action

Integrate F1 backend/frontend task commits, run candidate SQL/replica/browser CI,
record named review and create F2 stacked branch after F1 checkpoint.
Do not mark READY until required implemented/tested outcomes and named review pass.
