---
name: feature-scoper
description: Run Bolt V1's complete prospective AI-SDLC for a raw new-feature idea. Inspect current repo evidence, produce and challenge a PM scope, require PM/CTO/Head-QA signoff of one SHA-256, route specialists by risk, create waves/categories/stories/tasks, implement through bounded workers when authorized, review/repair/test, push the feature branch, and stop at READY FOR HUMAN REVIEW. Preserve existing work and explicit human decisions.
---

# Bolt feature-scoper

Use this skill only for Bolt V1. Repository evidence wins over chat memory.

## 1. Classify before acting

1. Inspect current remote refs before writes.
2. Read `BOLT_BOOTSTRAP.md`, `docs/PROJECT_BRIEF.md`, and
   `docs/CONTEXT_INDEX.yaml`.
3. Read `docs/AI_SDLC.md` and relevant current feature/source context.
4. Decide whether the request is:
   - a new feature covered by AI-SDLC V1;
   - continuation of existing/grandfathered work; or
   - a bug/maintenance task.
5. Never restart or retroactively migrate current work merely because this skill
   was invoked. Migrate an existing feature only when the human explicitly says so.

## 2. Respect human authority

Explicit human direction is authoritative. Challenge it with evidence when useful,
but never silently override it or invent a missing product/security rule.

Pause for the smallest necessary human decision only when implementation depends on
genuinely unresolved material behavior, conflicting human decisions, destructive
data/backfill, security/consent policy, live production mutation, secrets,
irreversible operations, material scope expansion, merge, or release.

Do not add a generic human confirmation gate once the feature was requested and
required agent signoffs are complete. Continue independent work when possible.

A material human change to frozen behavior, contract, acceptance criteria,
security policy, or persistence semantics requires a revised version/digest and
renewed affected review before affected implementation continues.

## 3. Intake and source-backed PM scope

Create/update:

- `docs/features/<feature>.md`
- `docs/features/<feature>.scope.md`
- `docs/features/<feature>.plan.json`

PM authors one categorized scope from the repository template with problem/outcome,
actors, source-backed current behavior, NEEDS, WANTS, DEFERRED, NON-GOALS,
UX/API/data/auth/persistence behavior, Acceptance Criteria, dependencies, risks,
and rollout/rollback where relevant.

Do not infer implemented behavior from prior plans alone. Inspect actual source and
tests.

## 4. Challenge and freeze

Run three distinct mandatory reviews against the same candidate scope:

- Product Manager
- Senior Tech Manager / CTO
- Head QA

Route Frontend/UX, Security, Data/Integrity, or Operations specialist review only
when `docs/AI_SDLC.md` says the risk warrants it.

Resolve findings. If a blocking issue requires a human product/security decision,
pause at that exact decision rather than inventing a rule.

Freeze the scope, compute SHA-256, and record each mandatory/specialist decision
against that exact digest in `<feature>.plan.json`.

Any BLOCKED, stale, or missing required review keeps implementation blocked.

Run:

`python scripts/check_feature_gate.py docs/features/<feature>.plan.json --gate G1`

Do not code until G1 passes.

## 5. Build the execution plan

Decompose only signed NEEDS into:

**Feature → Waves → Categories → User Stories → Tasks**

Every Need maps to Acceptance Criteria. Every AC maps into at least one story/task.
Each task records dependencies, model class, writable paths, checks, status, and
Acceptance IDs or an explicit prerequisite reason.

Prefer one coordinator plus at most two parallel coding workers. Use economical
coding-capable workers for narrow, low-risk tasks; use stronger reasoning for
architecture, cross-stack contracts, migrations/concurrency, QA/review, and
ambiguous repairs.

Run the G2 checker. Do not assign coding workers until it passes.

## 6. Implement bounded tasks

Give each worker only:

- task ID;
- frozen scope digest;
- branch/worktree/base;
- goal and dependencies;
- writable paths;
- Acceptance IDs;
- checks;
- exclusions.

Workers must not change scope, merge, deploy, modify production, weaken checks, or
touch unowned shared contracts.

Each returns commit SHA, changed files, checks/results, and limitations.

The coordinator reviews and integrates task commits onto the feature branch.

## 7. Independently review, QA, and repair

Review the exact integrated commit independently for scope traceability,
architecture/ownership, API/schema/types/mocks, error paths, regression risk,
unrelated changes, disabled checks, broad swallowed failures, and dependency
changes.

Head QA verifies Acceptance Criteria with the appropriate unit/integration/E2E
evidence. Required specialist findings must be resolved.

Use a bounded repair loop:

**finding → scoped fix → affected checks → independent re-review**

Escalate repeated/architectural failures to the coordinator or stronger model.
Never enlarge scope to make a failing test disappear.

Run the G4 checker.

## 8. Publish and stop

Before handoff:

- recheck remote refs and branch;
- run required repository checks;
- update feature tracker/plan evidence;
- record migrations/API/config/rollout/limitations;
- commit and push only the authorized feature branch;
- record the exact pushed head SHA.

Run the G5 checker.

When G5 passes, report `READY FOR HUMAN REVIEW` and stop.

Do not merge `main`, deploy, mutate production, or claim live verification.
Give the human branch/head, scope digest, changed areas, checks, Acceptance results,
risks, migrations/API/config effects, and exact review/merge-order notes.

## Failure behavior

A failed gate is a useful `BLOCKED` state, not permission to weaken the gate.
Record the reason and either repair it or request the precise human decision.

Never fabricate reviewer identity, test execution, CI state, live evidence,
commit SHAs, or push state.
