# Bolt contributor and agent guidelines

Applies to this repository across local workstations, cloud tasks and developer agents. These shared boundaries are mandatory; the delivery workflow is a recommended default that contributors may simplify for a small task. Explicit task instructions and platform security requirements take precedence. Do not silently weaken agreed branch, deployment or data boundaries through local preferences.

## Project context

Bolt is a React/TypeScript/Vite learning SPA backed by Django/DRF, PostgreSQL and Redis, with Celery for background work and Gunicorn/Caddy/Compose for the documented deployment. Reuse the existing stack and `/api/v1` contracts. Durable answer/progress writes belong in `backend/apps/progress/services.py`; preserve database constraints and append-only history.

Start substantial sessions with `BOLT_BOOTSTRAP.md`, `docs/PROJECT_BRIEF.md`
and `docs/CONTEXT_INDEX.yaml`, in that order. Verify remote refs and freshness,
then load only relevant feature docs, SYSTEM_MAP, RUNBOOK, decisions and source.
Historical assessments/plans and the full AI_DEV_LOG are selective references,
not mandatory startup loads. Current evidence wins over historical summaries.
`Bolt-V1/frontend` is the approved working source for this lineage; verify actual
hosting source/revision before production release. CI builds `frontend/` here.

## Shared boundaries

- Work on task branches. Do not commit, merge or push to `main`/`master`, change branch protection, merge PRs or publish a release. For this delivery, `feat-Sagar@c81416d` is also a frozen baseline: no new commits/pushes or PRs targeting it. Human reviewers own integration and production release.
- Do not run AWS deployment/provisioning/teardown, change live resources, run migrations on production or load-test public services in a feature task. Read-only cloud investigation also needs an appropriate authorized scope and secure access.
- Never commit secrets, credentials, real student data, private account exports, local environment files or dependency/build directories. Use secret-free templates and synthetic fixtures; do not print credentials in diagnostics.
- Do not force-push, reset someone else's work or delete remote branches without explicit authorization. Preserve pre-existing local changes. Record the base commit and review dependencies before creating a task branch.
- Make only approved changes. Ask about a material scope change, unresolved product rule or incompatible contract/migration. Once a scope is approved, proceed with its routine implementation and verification without repeated approvals based merely on file count.
- Keep ordinary lessons/practice behavior separate from tournament rules. Client clocks, grading claims and elapsed times are not authoritative competition evidence. Acknowledged accepted answers must have durable PostgreSQL records.

## Recommended six-step delivery

### Mandatory planning gate for the owner's Bolt Work environment

HUMAN decision, 2026-10-01: for new feature requests from the account that issued
this rule, in ChatGPT Work/cloud sessions within the **Cloud dev - Bolt v1**
Project, do not start feature implementation before three distinct agents sign
off the same finalized scope: **Product Manager**, **Senior Tech Manager/CTO**,
and **Head QA**. This is an environment/project/account-scoped requirement, not
a new universal requirement for other accounts, projects or developer tools.
Use the supplied session context to identify applicability; no account identifier
was inspected or inferred. Never claim this rule is enforced by account detection.

The PM defines categorized needs, wants and exclusions, existing versus proposed
behavior, roles, acceptance criteria and unresolved product decisions. CTO
verifies architecture, contracts, dependencies, rollout and implementation limits;
QA verifies testability, edge cases and required evidence. Record reviewer agent
identities, exact scope version/SHA-256, APPROVED/BLOCKED decisions and resolutions
in the owning feature handoff before assigning implementation. Revisions affecting
behavior, contract or acceptance criteria require all three to re-sign the revised
scope. Planning approval is not evidence of passing tests or human merge/release
approval. If a role is unavailable, keep implementation blocked and say why.

User direction plus the three signoffs authorizes routine coding within that
scope; do not add an extra generic human scope-confirmation gate. Escalate genuine
unresolved product decisions/material expansions under the shared boundaries.
See `docs/agent-workflow.md` and `docs/templates/feature-scope.md` for the record.

### Bolt AI-SDLC V1 — prospective feature flow

HUMAN decision, 2026-10-01: Bolt AI-SDLC V1 applies prospectively to new feature
development started after the commit recording ADR 0005 in this owner's Cloud dev
- Bolt v1 Project/account Work sessions. Do not retroactively re-plan, re-sign,
re-task or reopen completed, in-progress or already-being-scoped work unless the
owner explicitly opts it in. The current teacher dashboard/roster-correctness and
existing batch-level-assignment workstreams are grandfathered under the prior
three-role gate.

When a new chat message begins with `/feature-scoper`, or the owner explicitly
asks to run feature-scoper, treat the supplied text as raw intake and follow the\ncanonical `skills/feature-scoper/SKILL.md` plus `docs/AI_SDLC.md`;\n`docs/skills/feature-scoper.md` remains a compatibility mirror. Do not jump to coding.
The coordinator verifies refs/source, runs risk routing, obtains PM + CTO + Head QA
approval of one exact scope digest, creates the execution plan, validates G1/G2,
then assigns bounded implementation work.

The coordinator never substitutes its own approval for a mandatory independent
role. Frontend/UX, Security, Data/Integrity or DevOps review is conditional on the
risk router. Human input is requested only for genuine product ambiguity/conflict,
material expansion, destructive data/live operations, secrets/security-policy
choices, merge/release/deploy or other irreversible decisions. Explicit owner
direction is authoritative; agents may challenge it with evidence but must not
silently override it.

AI-SDLC stops after an authorized feature branch is verified, committed and pushed
as `READY FOR HUMAN REVIEW`. Agents do not merge to `main`, deploy or mutate
production as part of this flow. See ADR 0005.

1. Define the behavior, roles, acceptance criteria, dependencies and permitted code areas. Reproduce a reported defect before fixing it. Request approval when the task owner requires a planning gate.
2. Create one integration branch/worktree per reviewable feature from a recorded base. If foundations are unmerged, document prerequisites, merge order and feature-only/full comparison ranges. Integration PRs target `main` and remain drafts while prerequisites are pending; helper branches integrate locally into the feature branch.
3. Delegate bounded independent tasks when authorized and supported. Give each writing agent its own worktree/branch, an agreed contract and exclusive file ownership. A single developer can follow the same process sequentially.
4. The coordinator integrates task commits on the feature branch, reviews the combined diff and runs meaningful checks. Reviewers work against a named commit and do not concurrently edit another agent's worktree.
5. Push the authorized feature branch and prepare a draft PR when available; otherwise publish a PR-ready handoff. Include behavior, tests, limitations, migrations/API rollout, dependencies and exact merge order. Passing tests and readiness claims must be backed by executed evidence.
6. Hand the branch and results to the developer. They review/test and decide whether to merge into `main`; agents do not perform that merge or deployment.

See `docs/agent-workflow.md` for worktree/resource isolation and continuation details. Keep feature plans/status in `docs/features/<feature>.md` on the owning branch. Local tooling/paths may vary; shared behavior and review evidence should not.

## Verification defaults

- Backend: existing Ruff and pytest, with PostgreSQL/Redis and focused regressions for changed behavior. Use separate connections/transactional tests for database races; forced authentication and MD5 test hashing do not prove real authentication/throttle behavior.
- Frontend: existing ESLint, TypeScript, Vitest and Vite build. Use Playwright against a built SPA and a real local API for integration claims. Vite dev currently enables MSW; label mock-only coverage honestly.
- Match agreed CI/runtime versions where practical and record deviations. Use isolated local/test databases, Redis namespaces and service ports for parallel worktrees. Tests must never fall back to production endpoints.
- Run checks appropriate to the change; do not add tests that merely mirror implementation. Repeat broader checks after meaningful integration changes or failures, not without a reason.
- Review API/types/mocks/schema together when their contract changes. Prefer additive migrations, report historical-data implications and rehearse required rollback locally. Never rewrite historical results as an incidental bug fix.

## Code and publication gates

- Trace each changed file to approved behavior or a declared prerequisite. Reuse current services and libraries; avoid duplicate policy/state implementations, speculative abstractions and unrelated cleanup.
- Do not hide failures with ignored type errors, disabled checks, broad swallowed exceptions or weakened assertions. Tests must check observable outcomes; a test named “idempotent” is insufficient evidence if it asserts duplicate rows.
- Agree API identity, errors, older-client compatibility and storage/auth behavior before parallel implementation. Acknowledgements must be validated; pending work cannot silently disappear after a failed response, logout or timer expiry.
- Review the exact integrated commit. Record actual commands/results and unresolved findings; subsequent changes need affected checks rerun. Missing required evidence keeps the handoff a draft. Independent agent review supports, rather than replaces, human review.
- Before commit/push, inspect current branch, worktree, base and staged diff; stage explicit paths and use an explicit authorized remote branch/ref. Compare remote base refs with the recorded baseline. Stop for unexpected ref changes instead of overwriting them. Do not publish generated artifacts or secrets.

## Communication and continuation

Use plain language, concrete evidence and scoped commits. Separate completed, untested and blocked work. A new environment should discover its tools and configure private local settings rather than assuming `/workspace`, a shared virtualenv or Docker availability.

Persist approved scope, task ownership, completed commits, checks, unresolved decisions and the next action in the feature handoff. Work autonomously within approval while the task is running; pause dependent work when an unanswered decision is required. A cloud chat/workspace is not an always-running background service. Resume from GitHub and the recorded handoff when a task/session ends.
