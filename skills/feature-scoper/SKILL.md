---
name: feature-scoper
description: Run Bolt V1's prospective AI-SDLC for a raw new-feature idea: inspect current repo evidence, scope and challenge it, require PM/CTO/Head-QA signoff of one SHA-256, route specialists by risk, decompose into waves/categories/stories/tasks, implement through bounded workers when authorized, review/repair/test, push the feature branch, and stop at READY FOR HUMAN REVIEW. Preserve existing work and human decisions.
---

# Bolt feature-scoper

Use only for Bolt V1. Repository evidence wins over chat memory.

## Classify first

1. Inspect current remote refs.
2. Read BOLT_BOOTSTRAP.md, docs/PROJECT_BRIEF.md and docs/CONTEXT_INDEX.yaml.
3. Read docs/AI_SDLC.md and relevant feature/source context.
4. Classify the request as covered new feature, continuation of existing/grandfathered work, or bug/maintenance.
5. Never restart or retroactively migrate current work merely because this skill was invoked.

## Human authority

Treat explicit human direction as authoritative. Challenge with evidence when useful, but never silently override it.

Pause only for the smallest necessary human decision when implementation depends on unresolved material behavior, conflicting human decisions, destructive data/backfill, security/consent policy, live production mutation, secrets, irreversible operations, material scope expansion, merge or release. Continue independent work where possible.

If frozen behavior/contract/acceptance changes, create a new scope version/digest and rerun affected approval before implementation continues.

## Phase 1 — source-backed scope

Create/update:
- docs/features/<feature>.md
- docs/features/<feature>.scope.md
- docs/features/<feature>.plan.json

PM authors a scope from docs/templates/feature-scope.md with problem/outcome; actors; current source-backed behavior; NEEDS; WANTS; DEFERRED; NON-GOALS; UX/API/data/auth/persistence behavior; acceptance IDs; dependencies; risks; rollout/rollback where relevant.

Inspect actual source/tests. Do not infer implemented behavior from plans alone.

## Phase 2 — challenge and freeze

Run three distinct mandatory reviews against the same candidate scope:
- Product Manager
- Senior Tech Manager/CTO
- Head QA

Route Frontend/UX, Security, Data/Integrity or Operations review only when docs/AI_SDLC.md warrants it.

Resolve findings. If a remaining issue needs human product/security direction, pause rather than inventing the rule.

Freeze the scope, compute SHA-256, and record decisions against that exact digest in the plan. Any BLOCKED/stale/missing required review blocks implementation.

Run:
python scripts/check_feature_gate.py docs/features/<feature>.plan.json --gate G1

Do not code until G1 passes.

## Phase 3 — execution planning

Decompose signed NEEDS into:

Feature → Waves → Categories → User Stories → Tasks

Every Need maps to acceptance criteria; every acceptance criterion maps into story/task coverage. Every task records dependencies, model class, writable paths, checks, status, and acceptance IDs or prerequisite reason.

Prefer one coordinator plus at most two parallel coding workers. Use economical coding-capable workers for narrow low-risk tasks and stronger reasoning for architecture, cross-stack contracts, migrations/concurrency, QA/review and ambiguous repairs.

Run G2 before assigning coding workers.

## Phase 4 — implementation

Give workers only bounded task contracts: task ID, signed scope digest, branch/worktree/base, goal, dependencies, writable paths, acceptance IDs, checks and exclusions.

Workers must not change scope, merge, deploy, modify live infrastructure, weaken checks or touch unowned shared contracts. Each returns commit SHA, changed files, checks/results and limitations. Coordinator reviews/integrates.

## Phase 5 — independent review, QA and repair

Review the exact integrated commit independently for scope traceability, architecture/ownership, API/schema/types/mocks, error paths, regressions, unrelated changes, disabled checks, swallowed failures and dependency changes.

Head QA verifies acceptance criteria with appropriate unit/integration/E2E evidence. Required security review must be resolved.

Use bounded repair:
finding → scoped fix → affected checks → independent re-review.

Escalate repeated or architectural failures. Never expand scope to make a failing test disappear.

Run G4.

## Phase 6 — publish and stop

Recheck refs/branch, run required checks, update tracker/plan, record migrations/API/config/rollout/limitations, commit and push only the authorized feature branch, and record exact pushed head SHA.

Run G5.

When G5 passes, report READY FOR HUMAN REVIEW and stop. Do not merge main, deploy, change production or claim live verification. Give the human branch/head, scope digest, changed areas, checks, acceptance results, risks and merge-order notes.

## Failure behavior

A failing gate means BLOCKED. Repair it or request the precise human decision. Never weaken the gate or fabricate reviewers, test execution, CI, live evidence, commits or push state.
