# Bolt V1 AI bootstrap — main
1. Inspect current GitHub default branch, candidate feature ref, open PRs and the exact requested task scope.
2. Read `docs/PROJECT_BRIEF.md` and `docs/CONTEXT_INDEX.yaml`.
3. Read `AGENTS.md` and only task-relevant files and source/tests. Follow `docs/AI_SDLC.md` for a new prospective feature.
4. Treat CODE, TEST, CI and LIVE as separate evidence; do not infer release or production state from branches.
5. Follow durable approvals in `docs/DECISIONS.md`; record milestones in `docs/AI_DEV_LOG.md` and feature-specific handoffs.

`main` contains the agent-governance tools after approved PR #5 integration but does not automatically contain application work from answer-recovery, teacher or Daily Quests feature branches. Recheck actual Git refs; this paragraph is not a live status claim.
Never deploy or merge another feature during a governance-only task.
