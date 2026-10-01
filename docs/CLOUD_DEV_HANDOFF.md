# Bolt V1 — Cloud Development Handoff

Use this file when starting, resuming or handing off work between ChatGPT Project, Codex Cloud, local development and other coding agents.

## Start-of-task protocol

1. Fetch the repository and inspect remote refs.
2. Read `AGENTS.md`.
3. Read `docs/CURRENT_STATE.md` and the latest entries in `docs/AI_DEV_LOG.md`.
4. Read `docs/agent-workflow.md`.
5. Read the active feature file under `docs/features/`.
6. Confirm the base commit and branch before editing.
7. Define a narrow task goal and verifiable acceptance criteria.
8. Reproduce an existing bug before fixing it when applicable.

Do not assume a previous cloud workspace, database, terminal process or uncommitted file still exists.

## Standard task prompt footer

For non-trivial cloud tasks, append the following instructions:

```text
Before finishing:
1. Keep work on the authorized task/feature branch; do not merge or deploy.
2. Run the relevant repository checks and record exactly what ran.
3. Commit useful completed work with scoped commit messages.
4. Update the active docs/features/<feature>.md handoff.
5. Append a concise entry to docs/AI_DEV_LOG.md.
6. Update docs/CURRENT_STATE.md only if the actual repository/project state changed.
7. Report:
   - branch and final commit
   - files/areas changed
   - tests/checks and results
   - migrations/API/config changes
   - unresolved risks or decisions
   - exact next recommended task
```

## Mid-task checkpoints

Create a durable checkpoint when any of these occurs:

- a contract/API decision is finalized;
- backend and frontend ownership is split;
- a meaningful implementation slice passes tests;
- an external dependency blocks further work;
- a cloud session may end before completion.

A checkpoint should be a scoped commit plus an update in the feature handoff. Do not rely on a chat transcript alone.

## How ChatGPT Project should consume results

When resuming in this ChatGPT Project, provide or reference the branch/commit. The project can then inspect GitHub commits, diffs, PR state and the durable docs rather than requiring the original cloud conversation.

Preferred state hierarchy:

1. Git commit/tree
2. active `docs/features/<feature>.md`
3. `docs/CURRENT_STATE.md`
4. `docs/AI_DEV_LOG.md`
5. cloud-task/chat transcript

The transcript is useful context but is not canonical because it may disappear from navigation or become unavailable across surfaces.

## Completion states

Use one of these labels in feature handoffs:

- **IN PROGRESS** — implementation is still active.
- **BLOCKED** — a specific external decision/access/dependency is required.
- **READY FOR HUMAN REVIEW** — scoped implementation and local verification are complete; not yet merged.
- **MERGED** — human integration is complete.
- **RELEASED** — production deployment has been independently confirmed.

Never collapse READY FOR HUMAN REVIEW into MERGED or RELEASED.

## Current answer-recovery handoff

As of 01 October 2026:

- Foundation: `chore/agent-workflow@b03d167`
- Reviewed feature: `feat/answer-recovery@6d32de6a94c2afb92c5bc7a4c72dffe73737d2b1`
- Status: **READY FOR HUMAN REVIEW**
- GitHub CI: not verified from the originating task
- Production deployment: not performed by the task
- Canonical feature handoff: `docs/features/answer-recovery.md`

## If a Codex Cloud chat disappears from the sidebar

Treat the cloud environment and the task conversation as separate things. The environment can still exist while a task thread is no longer visible in the expected navigation.

Recovery procedure:

1. Check the repository for newly published branches/commits.
2. Inspect the active feature handoff and latest AI dev log.
3. Compare candidate feature branches against `main`.
4. If the work is committed and verified, continue from that branch even if the original cloud thread is unavailable.
5. If the work is only in an inaccessible/uncommitted cloud workspace, do not assume it survived; restart from the last durable Git checkpoint.

For this repository, the 01 October answer-recovery work is durably present on GitHub, so continuing development does not depend on recovering the original sidebar chat.
