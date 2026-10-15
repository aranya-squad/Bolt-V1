# Bolt cloud development handoff
Start with `BOLT_BOOTSTRAP.md`, `docs/PROJECT_BRIEF.md`, `docs/CONTEXT_INDEX.yaml`, and current remote refs. Confirm branch, base, uncommitted work, active scope and tests. Record each feature's acceptance IDs and PM/CTO/Head QA approvals.

At a checkpoint: keep changes on the authorized branch, commit scoped work, preserve external refs, record test commands/results, limitations and Next Exact Action in the owning feature tracker. Append a concise entry to `docs/AI_DEV_LOG.md`. `docs/CURRENT_STATE.md` points to the brief; avoid duplicate status copies.

READY FOR HUMAN REVIEW != MERGED != RELEASED. Never deploy, mutate live data, force-push somebody else's branch or merge integration branches without owner authorization.

Lost cloud session: recheck GitHub first; do not assume inaccessible uncommitted workspace survives. Use the exact latest evidence, not chat memory.
