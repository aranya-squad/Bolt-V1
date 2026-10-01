# Bolt AI-SDLC V1

Bolt AI-SDLC V1 is the lightweight agentic delivery workflow for **new feature development** in the owner's Cloud dev - Bolt v1 Project/account Work sessions. It extends ADR 0004 and uses existing Git, tests, feature branches and handoffs; it does not add an orchestration service.

## Adoption boundary

HUMAN decision, 2026-10-01: this workflow is prospective. It applies to feature ideas initiated after the adoption checkpoint. Work already in progress at adoption, including teacher dashboard/roster correctness and existing batch-level assignment, remains on its current ADR 0004 planning path unless the owner explicitly opts it in.

Never reopen, invalidate or reformat completed/current work solely to satisfy this process.

## Human authority

Human direction is authoritative. Agents may challenge a proposal with evidence and alternatives, but do not silently override an explicit product, workflow, risk or release decision.

Pause for human input only when a material decision cannot safely be inferred: conflicting product rules, meaningful user-visible ambiguity, destructive migration/backfill, secrets/security policy, live production mutation, irreversible operations, material scope expansion, merge or release. Continue independent work where possible.

A material change to frozen behavior, contract or acceptance criteria creates a new scope version/digest and requires renewed affected approval.

## Entry points

Use `feature-scoper` for raw new-feature ideas. The same workflow is intended when the user invokes `@feature-scoper`, types the Project trigger `/feature-scoper`, or explicitly asks to run the Bolt feature SDLC.

The coordinator first classifies the request as:
- covered new feature;
- continuation of existing/grandfathered work; or
- bug/maintenance work.

Do not turn continuation work into a new feature merely to trigger this process.

## Roles

One SDLC Coordinator owns feature state, scope lifecycle, planning, integration, evidence and handoff.

Mandatory pre-development reviewers:
1. Product Manager — problem/outcome, actors, NEEDS/WANTS/DEFERRED/NON-GOALS, UX behavior and acceptance criteria.
2. Senior Tech Manager/CTO — source-backed architecture, contracts, ownership, compatibility, concurrency, dependencies, rollout and file ownership.
3. Head QA — observable acceptance coverage, fixtures, failure/auth/concurrency cases, regressions and executed evidence.

All three must approve the same frozen scope SHA-256.

Risk-routed specialists:
- Frontend/UX for UX-heavy interaction/navigation/state/responsive/accessibility changes.
- Security for auth/authz, PII, roles/ownership, secrets, uploads, public endpoints, permission escalation, destructive actions, integrations, abuse/rate-limiting or security policy.
- Data/Integrity for scoring/XP/progress history, migrations/backfills, authoritative persistence, concurrency/locking, audit records or competition integrity.
- Operations for deployment/topology/queues/caches/provider behavior when operational contracts change.

Specialists are conditional, not mandatory ceremony.

## Artifacts

Covered features use:
- `docs/features/<feature>.md` — tracker/handoff.
- `docs/features/<feature>.scope.md` — frozen human-readable scope; SHA-256 is computed from file bytes.
- `docs/features/<feature>.plan.json` — machine-readable execution and gate state, based on `docs/templates/feature-plan.json`.
- optional specialist notes based on `docs/templates/specialist-review.md`.

JSON keeps the checker dependency-free.

## Scope structure

The PM scope explicitly separates NEEDS, WANTS, DEFERRED and NON-GOALS. Every Need maps to one or more acceptance criteria. Acceptance criteria describe observable outcomes.

## Execution hierarchy

Feature → Wave → Category → User Story → Task

Every task identifies acceptance IDs or a prerequisite reason, dependencies, model class, writable paths, checks and status.

Normally use one coordinator plus at most two parallel coding workers. Use stronger reasoning for coordination, PM/CTO/QA/specialist review, cross-stack architecture, concurrency, migrations and final review. Use lower-cost coding-capable workers for narrow low-risk implementation/test tasks.

## Gates

### G0 — Context
Verify current refs/base, inspect actual existing behavior/source, and record dependencies.

### G1 — Frozen scope
Before implementation:
- categorized scope complete;
- SHA-256 recorded;
- PM, CTO and Head QA each APPROVE the same digest;
- every required specialist APPROVED against that digest;
- zero unresolved blocking findings.

Run:
`python scripts/check_feature_gate.py docs/features/<feature>.plan.json --gate G1`

### G2 — Execution plan
Before worker coding:
- acceptance IDs map into stories/tasks;
- waves/categories/stories/tasks are valid;
- task dependencies are valid and acyclic;
- ownership/model class are explicit;
- plan digest matches frozen scope.

Run with `--gate G2`.

### G3 — Implementation
Workers implement only assigned tasks. They must not expand scope, change signed contracts, weaken checks, edit excluded paths, merge, deploy or self-certify the feature. Each returns commit SHA, changed files, checks/results and limitations. Coordinator integrates reviewed task commits.

### G4 — Integrated quality
Require:
- all planned tasks PASS;
- all acceptance criteria PASS;
- independent code review PASS;
- Head-QA execution review PASS;
- security final review PASS or NOT_REQUIRED;
- zero unresolved blocking findings.

Run with `--gate G4`.

Use bounded repair: finding → scoped repair → affected checks → re-review. Repeated/architectural failure escalates instead of looping indefinitely.

### G5 — Human handoff
Require:
- G4 PASS;
- authorized feature branch committed and pushed;
- final head SHA recorded;
- current tracker;
- explicit migration/API/config/rollout/limitation notes;
- READY FOR HUMAN REVIEW handoff.

Run with `--gate G5`.

AI stops at READY FOR HUMAN REVIEW. It must not merge to main, deploy, mutate live infrastructure or claim production verification. Human developers inspect the branch and decide merge/release.

## Deterministic validation

`scripts/check_feature_gate.py` validates recorded repository facts: scope digest, reviewer agreement, specialist routing, blockers, AC traceability, dependency structure, completion status, final review and handoff state. It does not replace semantic review, executed tests, hosted CI or human merge/release.

At adoption this checker is **not** a blocking application CI job. Existing CI/runtime behavior remains unchanged.
