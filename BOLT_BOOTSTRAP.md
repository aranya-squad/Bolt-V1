# Bolt V1 AI Bootstrap

This is the stable entry point for ChatGPT, Codex Cloud and other coding agents working on Bolt V1.

## Start here

For any substantial Bolt task:

1. Inspect the current GitHub repository/ref state.
2. Read `docs/PROJECT_BRIEF.md`.
3. Run `python scripts/check_context_freshness.py` when available; compare the
   brief with relevant recent source commits. Structural checks cannot establish
   semantic freshness or live state.
4. Read `docs/CONTEXT_INDEX.yaml` and load only the deeper context relevant to the task.
5. Inspect the actual code/schema/tests/CI and, when relevant and authorized, live infrastructure/logs before making conclusions or changes.

Do not begin implementation from summaries alone.

For a cold-start verification, inspect refs through `git ls-remote` or GitHub's
branch/ref endpoints. Commit-detail tools may return patches containing prior
answers. Record startup-only answers before reading any commit diff, setup
handoff, feature tracker, historical assessment or previous validation report.
Then follow selective routes and record the source trace before comparing with
the setup requirements. If prior answers were exposed early, label the run
contaminated and repeat in a clean session; checker success cannot repair that
evidence gap.

## Evidence order

Prefer truth in this order:

1. authorized live evidence actually inspected
2. current repository code/configuration
3. Git/branch/PR state
4. active feature handoff in `docs/features/`
5. `docs/PROJECT_BRIEF.md`
6. `docs/SYSTEM_MAP.md` / `docs/RUNBOOK.md`
7. accepted ADRs / `docs/DECISIONS.md`
8. `docs/AI_DEV_LOG.md`
9. chat/project memory
10. historical plans/assessments

Explicit new human decisions override older decisions; update the durable docs when that happens.

## Evidence labels

Use `CODE`, `LIVE`, `CI`, `TEST`, `HUMAN`, `PROPOSAL`, and `UNKNOWN` when the distinction matters. Never present CODE/TEST/PROPOSAL as LIVE.

## Working rules

- Continue existing work/branches when they already own the requested feature.
- Understand the current control flow, data flow, source of truth, persistence/API/auth boundaries and relevant tests before major edits.
- Reuse existing stores/services/contracts; do not create duplicate ownership.
- Prefer the smallest coherent change; avoid speculative abstractions and unrelated cleanup.
- Use feature/task branches. Do not merge/release/deploy or make destructive production/infra changes unless explicitly approved.
- Once task scope is clear, work autonomously within it. Do not ask again merely because several files must change.
- Ask only for genuinely ambiguous product behavior, conflicting explicit human decisions, material scope expansion, destructive data/backfill, live production mutation, secrets/security-policy decisions, merge, release or irreversible operations.
- Checkpoint meaningful milestones with a durable commit and feature handoff.
- Update `docs/PROJECT_BRIEF.md` only when global project state actually changes.
- Active feature state belongs in `docs/features/<feature>.md`, not a duplicate global task file.

## Task completion

Before marking work READY FOR HUMAN REVIEW:

- requested behavior is implemented
- affected checks pass
- cross-stack contracts/types/schema/mocks are consistent where applicable
- migrations/config/API implications are explicit
- no checks were weakened to create green results
- feature handoff is current and includes `Next Exact Action`
- the work is committed/pushed to an authorized branch
- live evidence is either verified or clearly UNKNOWN

READY FOR HUMAN REVIEW is not MERGED. MERGED is not RELEASED.

## Lost cloud task

If a cloud conversation/workspace disappears, recover from GitHub:
- inspect branches/commits
- inspect the feature handoff
- inspect PROJECT_BRIEF and latest relevant AI_DEV_LOG entry
- continue from the last durable checkpoint

Never assume inaccessible uncommitted cloud workspace state survived.

## Context maintenance

At substantial task start, compare the brief's verification metadata with relevant recent commits. Refresh stale context without requiring the human to notice it.

A scheduled Project Instructions review on the 15th and 30th is a safety net. Also flag/update context immediately after major architecture, workflow, product, deployment, source-of-truth or human-decision changes.

Use `docs/DECISIONS.md` and `docs/adr/README.md` for durable rationale.
See `docs/AI_CONTEXT_SYSTEM_SETUP.md` for the one-time V2 setup design and `docs/agent-workflow.md` for deeper multi-agent/worktree guidance.
