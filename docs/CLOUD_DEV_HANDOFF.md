# Bolt V1 — Cloud Development Handoff

## Startup

Inspect current remote refs; read `BOLT_BOOTSTRAP.md`, `docs/PROJECT_BRIEF.md`
and `docs/CONTEXT_INDEX.yaml`. Check freshness, then load the active feature doc
and task-specific source/operations context. Confirm branch/base, approved scope
and verifiable acceptance criteria before editing. Follow `AGENTS.md` boundaries;
load `docs/agent-workflow.md` for deeper worktree/integration guidance as needed.

## Durable checkpoints

At meaningful implementation/contract/verification milestones, or a blocker:

1. Update the owning `docs/features/<feature>.md`: status, branch, base/current or
   reviewed commit, checkpoint date, owner, completed/remaining/blocked, exact
   checks and `Next Exact Action`.
2. Commit scoped work and publish to the authorized feature branch after checking
   remote refs/diff. Preserve newer work; never force-reset it.
3. Append a concise milestone to `docs/AI_DEV_LOG.md`; update
   `docs/PROJECT_BRIEF.md` only when global state changes.

An exact SHA inside a file names an already-existing inspected checkpoint. The
containing commit is obtained from Git/GitHub file history; self-referential SHAs
are impossible. On resumption verify the remote head rather than trusting snapshots.

At completion report branch/final commit, status, changed areas, exact checks,
API/migration/config/rollback implications, evidence gaps and next exact action.
Do not merge or deploy. Do not weaken checks or claim local TEST as CI/LIVE.

## Status semantics

- **IN PROGRESS**: implementation/verification still active.
- **BLOCKED**: a named decision/access/dependency prevents required work.
- **READY FOR HUMAN REVIEW**: scope and local verification complete; unmerged.
- **MERGED**: human integration confirmed by Git/PR evidence.
- **RELEASED**: production deployment independently confirmed by LIVE evidence.

A local test pass never implies MERGED/RELEASED. Feature docs own active state;
PROJECT_BRIEF summarizes global state; the dev log is chronological history.
For source/evidence precedence use BOLT_BOOTSTRAP, not a second hierarchy here.

## If a cloud task disappears

The environment and conversation are separate. Never assume inaccessible
uncommitted files, databases or processes survived.

1. Inspect published branches/commits and current refs.
2. Read the relevant feature handoff and latest relevant dev-log entries.
3. Compare candidate branch/checkpoint to main and recorded prerequisites.
4. Resume committed/verified work on its owning branch even if the thread is gone.
5. If the only work was inaccessible/uncommitted, recover from the last durable
   checkpoint; reproduce missing evidence instead of inventing completion.

Current global state: `docs/PROJECT_BRIEF.md`. Answer recovery:
`docs/features/answer-recovery.md`. Context setup:
`docs/features/ai-context-system-v2.md`. Read each on its owning branch.
