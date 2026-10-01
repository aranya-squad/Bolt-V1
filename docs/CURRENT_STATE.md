# Bolt V1 — Current Development State

Last updated: 01 October 2026

This file is the quick starting point for humans, ChatGPT project work, Codex Cloud tasks, and other coding agents. It is intentionally concise; detailed evidence stays in the linked feature/assessment documents.

## Repository and branch state

- Repository: `aranya-squad/Bolt-V1`
- Default branch: `main`
- Current production/integration baseline on `main`: `cec94ea187ab3fcf571f73dd4468b1edaf0d290a`
- Frozen prior implementation baseline: `feat-Sagar@c81416d166792caada0868dff0d3242daccbedde`
- Agent workflow foundation: `chore/agent-workflow@b03d167`
- Reviewed answer-recovery implementation: `feat/answer-recovery@6d32de6a94c2afb92c5bc7a4c72dffe73737d2b1`
- Continuation branch for durable project context: `chore/continuous-dev-context`

The answer-recovery branch is reviewed and published but is not merged into `main`. Human integration, GitHub CI verification, deployment and production validation remain pending.

## What is implemented on the reviewed feature branch

Answer recovery and persistence hardening is implemented across backend and frontend. The reviewed branch adds immutable attempt identities, atomic receipts, resume/reload recovery, finalize manifests, conflict handling, server-authoritative persistence checks, and versioned scoring behavior without adding a new runtime service or database table.

Recorded local verification on the reviewed commit:

- Backend Ruff passed.
- 251 pytest cases passed on Python 3.12, PostgreSQL 16 and Redis 7.
- Frontend ESLint, TypeScript, 73 Vitest tests and Vite build passed under Node 20.
- Four built-SPA / real-local-API Chromium recovery scenarios passed.
- GitHub CI was not verified from that cloud task.
- No AWS deployment, public load test or production-data migration was performed.

See `docs/features/answer-recovery.md` for the complete contract, evidence and handoff.

## Architecture snapshot

- Frontend: React + TypeScript + Vite.
- Backend: Django + Django REST Framework.
- Data: PostgreSQL.
- Cache/background infrastructure: Redis + Celery.
- Production HTTP/deployment components in repository: Gunicorn, Caddy and Docker Compose.
- API namespace: `/api/v1`.
- Durable answer/progress writes belong in `backend/apps/progress/services.py`.
- Existing architecture document: `docs/ARCHITECTURE.md`.

## Current product/engineering priorities

1. Human-review and integrate the workflow foundation and answer-recovery work in the documented order.
2. Verify GitHub CI on the integration PR(s).
3. Confirm the actual production frontend source/deployment ownership before releasing frontend changes.
4. Keep tournament timing/fairness work separate from ordinary learn/practice answer recovery.
5. Validate 100–150 simultaneous-user tournament requirements with an explicit ruleset and measured load tests before changing AWS capacity.
6. Preserve historical scoring/results; do not silently backfill or reinterpret old attempts.

## Durable continuation rules

Before starting a new cloud task or coding session, read:

1. `AGENTS.md`
2. `docs/CURRENT_STATE.md`
3. `docs/AI_DEV_LOG.md`
4. `docs/agent-workflow.md`
5. the active feature file under `docs/features/`
6. `docs/assessment01-10-2026.md` and `docs/next-steps01-10-2026.md` when planning larger changes

Every substantial task should end with a concise update to `docs/AI_DEV_LOG.md` and, when the actual project state changes, this file.

## Known open boundaries

- Do not merge or deploy automatically.
- Do not modify live AWS resources from an ordinary feature task.
- Do not treat local test success as GitHub CI or production evidence.
- Do not claim competition fairness from ordinary lesson/practice persistence tests.
- Do not rely on cloud-chat history as durable state; Git commits and these handoff docs are canonical.
