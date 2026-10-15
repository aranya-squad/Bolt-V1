---
last_updated: 2026-10-15
verified_application_commit: cec94ea187ab3fcf571f73dd4468b1edaf0d290a
verified_context_commit: cec94ea187ab3fcf571f73dd4468b1edaf0d290a
verified_context_branch: main
live_environment_verified: never
status: current-with-live-unknowns
---

# Bolt V1 project brief — main application baseline
This brief describes the reviewed **main application baseline** before the governance-only PR #5 merge. Reinspect refs/source at each session. Backend: Django/DRF; frontend: React/TypeScript/Vite; persistence: PostgreSQL; cache/async: Redis/Celery. Deployment configuration: Caddy, Gunicorn, Docker Compose and Vercel settings. Production deployment revision/health/ownership is UNKNOWN.

The branch `chore/ai-context-system-v2` contains an independent context program. Answer recovery, teacher dashboard, batch assignment and Daily Quests have separately reviewed/tested branches but were not integrated into `main` when this isolated PR was prepared. Do not assume they have been merged because their plans appear in a project discussion.

The AI-SDLC governance files on main describe future operating rules, not shipped feature code. Future work uses the exact current Git state, not a hardcoded head from this file.

## Immediate next action
For a new feature, read AGENTS and `docs/AI_SDLC.md`; obtain 3-role planning signoffs before coding. For an existing feature, inspect its actual branch and reviewer-approved dependencies. All merge and release actions are human-owned.
