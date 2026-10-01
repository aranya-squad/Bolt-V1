---
status: READY FOR HUMAN REVIEW
branch: feat/batch-level-assignment
base_commit: 865248002b95599715261be077620256e8101e8a
current_commit: 3ee301a6bfe6c401da931da001a613c8a5d1c68d
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

# Batch assigned-level management — F2

## Goal / approved scope

Implement only F2 under frozen `docs/scopes/teacher-workflows-v1.2.md`.
PM `/root/product_manager`, CTO `/root/cto_reviewer`, QA `/root/head_qa`
approved the exact digest before any feature coding. Their role records are in
`docs/reviews/teacher-workflows-scope-v1.2.md`. No product blocker remains.

Reuse existing BatchDetail and Class.assigned_levels M2M. Owner PATCH replaces
the full UUID-string set atomically; omitted preserves, empty clears. POST
remains name-only and rejects assignment input. Add canonical IDs to class
responses, narrow teacher catalogue hook, accessible Save/Cancel editor with
dirty/error/old-backend handling. Assignment affects reporting only, preserving
student access, history and enrollment. No migration/new endpoint/dependency.

## Completed

F1 is independently READY FOR HUMAN REVIEW: source8652480, published handoff
00038d7043ffa2db8bd62a45d3d82c1573083683, draft PR#2. F2 is complete at named
source3ee301a6bfe6c401da931da001a613c8a5d1c68d. No setup or feature implementation
remains in these two signed slices. Final PM/CTO/Head QA implementation decisions
are recorded in `docs/reviews/batch-level-assignment-final-2026-10-01.md`.

Backend owner PATCH locks the primary Class row before validation and atomically
commits scalar fields, full assignment replacement and response. Canonical class
responses use batched primary assignment reads. BatchDetail reuses its existing
screen for Save/Cancel; teacher-scoped catalogue reads all pages, preserves dirty
drafts and handles errors, account changes and older backend capability honestly.
Type/schema/synthetic mock contracts agree. Existing student access, enrollment,
finalized history and recovery services are unchanged.

## Acceptance / verification

F2-AC01..06 and BOTH-AC01 PASS against frozen scope1.2. Native exact-head
[Teacher verification36864981450](https://github.com/aranya-squad/Bolt-V1/actions/runs/36864981450)
passes both jobs:304 backend tests, zero failures/errors/skips;24fixtures /
144requests with correct values and data-query counts2/4/4 (list/roster/matrix);
three built-SPA/realAPI Chromium cases. Assignment tests include actual roles,
foreign404 before validation, POST rejection, normalized UUID/type/unknown/duplicate
validation, rollback, separate-connection row-lock serialization with
ATOMIC_REQUESTS disabled, nonempty durable history and direct lesson start/resume
preservation. Available divergent database alias tests exercise primary routing.

[Normal CI36864981375](https://github.com/aranya-squad/Bolt-V1/actions/runs/36864981375)
passes Ruff/backend, Node20 lint/types/**136Vitest**/build. Normal CI tests a generated
PR merge ref; the specialized suite checks out exact3ee. Coordinator full local
Node20 checks also pass. Eleven MSW route cases are mock contract evidence only;
real persistence/ownership/concurrency evidence comes from the API/PG tests.
Full measurement provenance/timings/plans/limits are in
`docs/verification/teacher-reporting-2026-10-01.md`.
Final documentation validation:18checker regressions pass; strict/default and
advisory freshness modes each report zero errors/warnings; diff/path checks pass.
These structural checks do not independently certify G freshness or live behavior.

## Ownership / dependencies

Coordinator owns tracker/integration/test infrastructure. Backend writer owns
classroom source/assignment tests; frontend writer owns frontend. Each started
from exact integrated F1 base8652480, preserving earlier source/history.
Feature-only range8652480..this branch; full comparison main..this branch.
Draft PR targets main with dependencies baseline → workflow → recovery →
continuous context → contextV2 → F1 → F2. Backend capability must precede frontend
rollout. Code rollback preserves existing relation; no data clearing/migration.

## Risks / blockers / deferred

No unresolved product decision or source/verification blocker remains in the
signed slice. Measurements are overlapping synthetic rosters with one timing
sample per condition; Redis cold cache does not reset PostgreSQL buffers. Divergent
alias tests simulate lag, not streaming replication. Catalogue pages/report reads
do not promise one concurrent snapshot. An incompatible PATCH acknowledgement
requires page reload after backend update; missing initial GET capability can
recover on Refresh. These limits meet the signed requirements.

Human dependency integration, exact integrated-revision CI and live release
evidence remain. Backend capability must precede editor rollout. Separate reliability
repairs: real-hasher login dummy path, account-deletion/audit integrity, clean
non-root image, HTTP health/HTTPS alignment, broader auth refresh races, artifact/
source ownership, live logs/backups/topology and isolated load/cost evidence.
Tournament rounds remain deferred until rules are approved. No merge/deploy or
live mutation occurred. Newer independent setup work at c75c1f7b4e67bb71c668c4370a59918aef045ab5
was observed and preserved; its prospective AI-SDLC explicitly grandfathers F1/F2.

## Next Exact Action

Human-review draft PR#3 and the signed final reviews. Recheck current refs, then
integrate foundational branches → F1 → F2 in documented order, preserving newer
governance work. Run required CI on the actual selected integration revision.
Before release verify production frontend source/deployed revision, backend
topology/health/logs/backups and rollout compatibility. Rollback code without
clearing Class.assigned_levels. No further feature coding is needed for this slice.
