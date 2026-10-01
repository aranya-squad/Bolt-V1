---
status: IN PROGRESS
branch: feat/batch-level-assignment
base_commit: 865248002b95599715261be077620256e8101e8a
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

## Completed / in progress

F1 source integrated and checked at8652480:273native backend tests with no
skips,94Node20 frontend tests/lint/types/build,144candidate measurements meet
1/4/4data-query budgets. F1 corrected real-browser rerun remains pending; F1
readiness is not presumed. F2 now uses separate integration/backend/frontend
worktrees with exclusive ownership and the already approved scope.

## Acceptance / verification

F2-AC01..06 and BOTH-AC01 in the frozen scope govern completion. Required:
string-only UUID normalization/duplicate/type/unknown validation, POST denial,
foreign404 before validation, actual roles, atomic scalar+M2M rollback, owner row
locking and two-connection replacements with ATOMIC_REQUESTS disabled, preserved
progress/access/enrollment, canonical API/types/schema/mocks, frontend dirty/
Cancel/retry/capability/catalogue/account behavior, full backend suite, Node20
lint/types/Vitest/build and built-SPA realAPI all three teacher tests. Integrated
list query budget becomes2; roster4/matrix<=5 still hold.

## Ownership / dependencies

Coordinator owns tracker/integration/test infrastructure. Backend writer owns
classroom source/assignment tests; frontend writer owns frontend. Each started
from exact integrated F1 base8652480, preserving earlier source/history.
Feature-only range8652480..this branch; full comparison main..this branch.
Draft PR targets main with dependencies baseline → workflow → recovery →
continuous context → contextV2 → F1 → F2. Backend capability must precede frontend
rollout. Code rollback preserves existing relation; no data clearing/migration.

## Risks / blockers / deferred

No unresolved product decision in signed slice. Missing executed runtime evidence
keeps status IN PROGRESS. Human integration and actual live release evidence are
separate. Tournament rounds, historical auth/recovery recreation, enrollment/
consent/admin policy and prerelease reliability repairs remain separate.

## Next Exact Action

Integrate exclusive F2 backend/frontend commits, execute native full-suite/
concurrency/query/router and real built-SPA API checks, obtain named code reviews
and publish review readiness only after required evidence passes. No merge/deploy.
