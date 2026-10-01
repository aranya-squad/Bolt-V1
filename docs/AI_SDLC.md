# Bolt AI-SDLC V1

Status: ACCEPTED workflow policy; prospective only.
Recorded: 2026-10-01.

## Purpose

Turn a raw feature idea into a scoped, challenged, testable and reviewable feature
branch while keeping human ownership of material product decisions, merge and
release. This is small-team governance built on Git and existing Bolt tooling, not
a new orchestration service.

## Applicability

Applies in the owner's Cloud dev - Bolt v1 Project/account Work sessions to new
feature development started after ADR 0005 activation. Do not retrofit completed,
in-progress or already-being-scoped work unless the owner opts it in. Known
grandfathered work: teacher dashboard/roster correctness and existing batch level
assignment. Tiny bug/maintenance work may use normal workflow unless explicitly
sent through `/feature-scoper` or it introduces new product behavior.

## Roles and risk routing

Always: SDLC Coordinator, Product Manager, Senior Tech Manager/CTO, Head QA.
Coordinator does not self-approve mandatory reviews. Add specialists only when
triggered:
- Frontend/UX for major interaction/navigation/responsive/accessibility state.
- Security for auth/authz, ownership/roles, student PII, uploads, integrations,
  secrets, privilege, destructive operations, abuse/rate limiting/security policy.
- Data/Integrity for progress/scoring/XP/history, migrations/backfills,
  concurrency/locking/reconciliation or tournament fairness.
- DevOps for CI/deployment/runtime/infrastructure contracts; live mutation still
  needs separate human authorization.

Workers receive bounded tasks; independent reviewer inspects the integrated commit.
Worker self-approval is invalid.

## Artifacts

Each new AI-SDLC feature owns:
1. `docs/features/<feature>.md` mutable tracker/handoff.
2. `docs/features/<feature>.scope.md` frozen signed scope bytes.
3. `docs/features/<feature>.plan.json` approvals, risk route, acceptance graph,
   Wave → Category → User Story → Task execution, evidence and publication state.

NEEDS are mandatory; WANTS are excluded unless promoted before freeze; DEFERRED is
later work; NON-GOALS explicitly exclude behavior. Every NEED maps to acceptance
IDs; every task maps to acceptance IDs or a declared prerequisite.

## G0 — Context/intake

Verify refs/base, bootstrap/brief/router, existing source/contracts/tests and
whether the request is a prospective new feature. No runtime edits.

## G1 — Frozen specification

Require exact scope SHA-256, categorized requirements, acceptance IDs, zero
blockers, PM APPROVED, CTO APPROVED, Head QA APPROVED and every required specialist
APPROVED against that same digest.

`python scripts/check_feature_gate.py --scope docs/features/<feature>.scope.md --plan docs/features/<feature>.plan.json --gate G1`

No feature implementation before G1 PASS.

## G2 — Execution plan

Require G1 authorization plus Wave → Category → Story → Task nesting, dependencies,
exclusive writable paths, checks, owner/model class and full Need→AC→Task
traceability. Default <=2 concurrent writers. Run checker with `--gate G2`.

## G3 — Implementation

Workers get task ID, scope digest, branch/base, dependencies, writable paths,
acceptance/prerequisite refs, checks and exclusions. They return commit SHA,
changed files, actual checks and limitations. Coordinator rejects unauthorized
scope/files.

## G4 — Integration/quality

Coordinator integrates reviewed task commits. Independent code review + Head QA
validate the exact integrated commit. Repeat required specialist review when the
implementation materially affects that risk domain. Repair concrete findings;
repeated architectural failures escalate to coordinator/CTO. Material scope change
returns to G1.

## G5 — Human handoff

All required ACs pass, tasks complete, independent review PASS, QA PASS, required
security PASS, final commit recorded, authorized feature branch pushed, no blocker,
status READY FOR HUMAN REVIEW, merged=false and deployed=false. Run checker with
`--gate G5`. AI stops here; a human developer decides merge and deployment.

## Human pause conditions

Pause only for genuine user-facing ambiguity, conflict with explicit owner
direction, material scope expansion/Want promotion, destructive migration/backfill,
secrets/security-policy choice, live production/AWS/DNS/hosting mutation,
merge/release/deploy or another irreversible out-of-scope action. State the exact
decision/options/tradeoffs and continue unaffected work where possible. Never
silently override owner intent. Material scope change creates a new digest and G1.

## Model routing

Use stronger reasoning for coordinator/PM/CTO/QA/security/final review and
cross-stack, concurrency, migration or architecture work. Economical coding models
may handle narrow code, tests, typings, small components and mechanical docs.

## Checker boundary

`scripts/check_feature_gate.py` validates artifact consistency only. It does not
run product tests, inspect GitHub, verify agent independence or prove claims typed
into JSON. Existing application CI is unchanged.
