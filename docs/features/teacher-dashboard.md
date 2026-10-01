---
status: READY FOR HUMAN REVIEW
branch: feat/teacher-dashboard
base_commit: ec74cf3882b8a2dafc9f9c1e0d70e24c496364d0
current_commit: 865248002b95599715261be077620256e8101e8a
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

## Completion / readiness

No F1 implementation remains. PM, CTO and Head QA each APPROVED the exact
reviewed source8652480 with independently inspected runtime evidence; full role
records: `docs/reviews/teacher-dashboard-final-2026-10-01.md`.

- Named-head Teacher verification36862766356:273backend tests with no skips,
  all144measurements at1/4/4dataqueries, and two built-SPA/realPBKDF2API browser
  cases pass. The assignment browser case is explicitly reserved for F2.
- Normal CI36862766238 passes backend/frontend/build/context. Node20 lint,
  TypeScript,94Vitest and Vite production build pass, also run by coordinator.
- Native stale-database alias simulates divergent replica data and proves
  primary reads; it is not an actual streaming-replication topology test.
- Scope1.2 remains unchanged. Review routing/lifecycle/schema/mock findings were
  repaired and affected/full checks rerun. No writer/history policy changed.

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
Named PR CI is verified above; actual live revision/topology/log/health remain UNKNOWN. Tournament rules,
historical auth/recovery recreation, enrollment/consent/admin changes and prerelease
image/health/deletion/auth repairs are excluded. F2 is separately tracked.

## Next Exact Action

Human-review draft PR#2 and integrate its documented prerequisites before F1.
Recheck CI against the exact human-selected integration revision. F2 is being
implemented on its owning stacked branch `feat/batch-level-assignment`; no F1
setup restart or duplicated recovery/auth work is required. Human release must
verify deployed frontend/backend revisions, topology/health/logs/backups and
backend-first capability rollout. No merge/deploy/live action was performed.
