# Bolt feature delivery workflow

Working guidance for developers and agents; adapt tools and task size while preserving the boundaries in `../AGENTS.md`. This process uses existing Git, tests and application infrastructure; it does not require a new orchestration service.

## Intake and scope

Record the feature, affected roles, expected behavior, acceptance tests, base commit, dependencies, approved code areas and unresolved decisions. Read the assessment/next-steps documents when applicable. For a feature with API changes, agree fields, error semantics, compatibility and migration strategy before workers edit callers.

Keep a short plan and progress record in `docs/features/<feature>.md` on that feature's branch. Avoid a central file edited by every parallel worker; it creates merge collisions. The coordinator owns the feature plan and final handoff.

### Three-role pre-development signoff in the owner's Bolt Work sessions

For the environment/project/account identified in AGENTS, this gate is mandatory
for each new feature. It does not retroactively reopen completed feature work or
apply to other accounts/projects/tools. Planning and source/test investigation
may proceed before signoff; implementation changes may not.

1. PM authors one categorized scope using `docs/templates/feature-scope.md`:
   problem/outcome, existing behavior, needs/wants/deferred, actors/ownership,
   exact UX/API/data behavior, acceptance IDs, exclusions and unresolved decisions.
2. A distinct CTO agent checks source/architecture, contracts, concurrency,
   dependencies/base, rollout and file ownership. A distinct Head QA agent checks
   observable acceptance tests, fixtures, error/security edges and execution gates.
3. Resolve findings; freeze the scope version and SHA-256. Each of the three
   records APPROVED or BLOCKED against that identical digest. Missing, stale or
   conditional signoff with unresolved blockers means implementation stays blocked.
4. Coordinator copies scope and review evidence into the owning branch, checks
   digest/approvals and records the implementation start checkpoint. Feature
   branches remain isolated; shared-file ownership is sequenced explicitly.
5. A material change to finalized behavior/contract/acceptance criteria returns
   to all three reviewers before affected implementation. Track wants separately
   rather than slipping them into the coding scope. Ordinary implementation
   choices within the signed scope do not require repeated human permission.

Signoff means a sound, bounded plan. Executed QA/CI, independent code review,
human integration and release remain separate gates. Agent review cannot decide
unresolved human product rules, consent/security policy or production mutation.

### Prospective Bolt AI-SDLC V1

For new features started after ADR 0005 activation, the three-role gate above is
G1 inside the broader workflow in `docs/AI_SDLC.md` and
`skills/feature-scoper/SKILL.md` (with `docs/skills/feature-scoper.md` retained as\na compatibility mirror). Activation is deliberately non-retroactive:
completed, implemented or already-being-scoped features keep their current
workflow unless the owner opts them in. Preserve the current teacher
dashboard/roster-correctness and batch-level-assignment workstreams.

New AI-SDLC features use:
- `docs/features/<feature>.md`: mutable tracker/handoff;
- `docs/features/<feature>.scope.md`: frozen scope bytes;
- `docs/features/<feature>.plan.json`: approvals, risk route, Wave → Category →
  User Story → Task graph, traceability, quality evidence and publication state.

Run `scripts/check_feature_gate.py` at G1 before coding, G2 before worker dispatch,\nG4 after integrated review/QA and G5 before READY FOR HUMAN REVIEW. The checker validates recorded invariants;
it does not run agents/tests/Git or convert assertions into execution evidence.
Default parallelism is one coordinator plus at most two independent writers,
followed by integration and independent review/QA. Economical models may handle
narrow tasks; architecture, security, migration/concurrency and final review use
stronger reasoning. Worker self-approval is invalid.

## Branches and worktrees

One integration branch per reviewable feature, e.g. `feat/answer-recovery`. Use helper branches such as `task/answer-recovery-api` and `task/answer-recovery-ui` only for delegated writes. These are not independent product features; the coordinator brings their commits into the feature branch.

Create each branch/worktree from a verified commit. A portable example, run from a repository checkout after replacing the placeholders:

```bash
git worktree add -b feat/answer-recovery ../bolt-answer-recovery <approved-base-commit>
git worktree add -b task/answer-recovery-api ../bolt-answer-recovery-api <contract-commit>
git worktree add -b task/answer-recovery-ui ../bolt-answer-recovery-ui <contract-commit>
```

Use sibling directories; do not nest working copies inside the application/Docker build context. If a branch exists, inspect/reuse it rather than overwriting it. Never force-reset a worktree to establish a baseline. Worktrees share Git history/remotes but have separate checked-out files; they do not isolate databases, caches or ports.

Record upstream dependencies. Integration PRs target `main` and remain drafts while foundations are pending. Publish both the feature-only comparison against its foundation and the complete comparison against main, with human merge order. Helper branches integrate locally into the feature branch; do not open integration PRs against a protected baseline. After a prerequisite merges, update ancestry only under the agreed review policy; never force-push a reviewed branch silently. Do not use `main` as a scratch integration branch.

For the approved answer-recovery proposal, `feat-Sagar@c81416d` is frozen alongside `main`/`master`. One `chore/agent-workflow` foundation branch holds separate guidance and lockfile commits, followed by `feat/answer-recovery`. Publish the checked foundation, avoiding a separate lockfile branch whose merge depends on a failing foundation PR. No task adds commits or pushes to `feat-Sagar`.

## Delegation and file ownership

Start with the coordinator plus at most two implementation agents for independent backend/frontend tasks. Add a reviewer after integration where available. More agents are not automatically faster; use one developer/agent for tightly coupled or small changes.

Each assignment must contain: task ID, goal, accepted contract, branch/worktree, base commit, writable files/directories, checks, and excluded actions. Agents read shared code but write only their owned areas. If two agents need the same file, the coordinator assigns one owner or sequences the edits.

The coordinator owns the written contract/schema, integration commits, feature status and final review. Assign TypeScript API types to the frontend writer rather than editing them concurrently. Agents commit completed task changes on their task branches and return commit hashes/check results. The coordinator inspects diffs, cherry-picks reviewed commits into the feature worktree, resolves conflicts and verifies the combined result. Do not share one writable checkout among concurrent workers.

Check approval, foundation reproducibility and contract feasibility before implementation agents start. After implementation, validate the integrated commit, obtain independent review and prepare handoff evidence. See the feature plan's G0–G5 gates. Agents cannot waive a failing acceptance gate or enlarge scope to hide an unrelated blocker.

## Runtime isolation

For every worktree that starts services/tests, allocate unique local database/test-database names, API/frontend ports and Redis DB index/key prefix. Workers should use separate dependency environments or immutable shared installations; do not run concurrent installations into one shared virtualenv/node_modules directory.

When using Compose, use distinct project names plus reviewed local port/database overrides; the existing Compose file hardcodes ports and is not isolated merely by changing project name. Keep overrides/private environment files untracked. If Celery is involved, isolate broker queues and use at most one intended beat scheduler; ordinary unit tests can retain eager execution.

Discover installed tools on each machine. Prefer the repository's existing dependency and local Compose paths when available; use an equivalent documented setup when Docker is unavailable. Store secrets through supported private settings. Do not copy cloud credentials or a workstation's literal DSNs into a handoff. Record runtime allocations without credentials; reviewers need separate test resources too. Git configuration/hooks may be shared across worktrees: inspect before changing them and avoid imposing workstation-wide tools to enforce this process.

## Review and validation

Use existing commands from the correct directory, with isolated local environment settings:

```bash
# backend/
ruff check .
pytest

# frontend/
npm ci
npm run lint
npm run type-check
npm run test
npm run build
```

`npm ci` requires the tracked lockfile. A fresh-checkout failure must be fixed in a scoped foundation change or reported, not hidden by an ad-hoc install. Review lockfile resolutions against available resolved dependencies: wildcard package ranges can upgrade even when package.json is unchanged. Check the current CI versions; local service/version differences are limitations to report. Never substitute a test environment pointing to production.

Add focused regression tests for the change. For API integrity, cover replay, conflicting identity, invalid batches, authorization and relevant concurrent writes. For UI persistence, test lost responses, rejected writes, reload, logout, reconnect and finalization. Use a built SPA/real local API for end-to-end claims, because development currently starts MSW. Mock tests remain useful but test a different boundary.

Review the final commit/diff and API/schema/types consistency. Reject duplicate services/stores, unjustified dependencies, ignored types, disabled checks, broad swallowed exceptions, placeholder implementations and unrelated formatting. Tests assert behavior across the relevant boundary, with deterministic fake timers or transactional barriers for timing/races. Preserve legacy limitation tests explicitly; new-contract assertions must not inherit duplicate-row expectations under misleading names.

State what was executed and its result; do not claim GitHub CI passed from local checks. In the current repository CI is triggered by PRs and main pushes; a feature-branch push alone is not CI evidence. A blocked GitHub API means CI/PR status is unverified, even when native Git push works. Use staging/load/restore tests only under a separate suitable authorization and never deploy to AWS within a feature task.

## GitHub and developer handoff

Push only the authorized task/feature branches. Inspect branch/worktree, staged paths, base and remote refs before publication; stage explicit paths and push an explicit allowed branch ref. Stop if recorded baselines changed. Create a draft PR targeting main if tooling/access supports it; otherwise include a PR-ready title/body and compare URLs in the handoff. Do not report a PR number that was not created. Do not push or target `feat-Sagar` for this delivery.

The handoff should include branch/base/current commits, scope, test evidence, reproduction steps, screenshots/traces when useful, API compatibility, migrations/data implications, rollback constraints, dependencies/merge order and remaining risks. A blocked checkpoint may be pushed as an explicitly labeled draft when authorized; it must not be labeled ready to merge.

Human reviewers decide on merge/release. Record known automatic hosting triggers; do not assume every non-main branch is free of external integrations. Do not modify triggers or run deployment scripts to finish a feature.

## Continuing across workstations or sessions

At each meaningful checkpoint, record approved scope/version, base/current commits, active task ownership, runtime allocations, exact validation commands/results, outstanding decisions and the next command/task. Record locations of private environment configuration without its contents. Push authorized useful checkpoints before handoff. A local worktree, database or uncommitted change may not survive a new cloud task; GitHub commits and feature status are the durable continuation record. Resume by checking remote refs and the handoff, not by assuming a previous worker or server is still running.

Within approved scope, continue useful independent tasks while waiting for optional answers. For a required product/API decision, pause only dependent work and identify the precise question. Do not repeatedly ask permission for routine approved changes. Tasks run while the environment/session is active; this workflow does not create a daemon that keeps working after the platform stops the task.
