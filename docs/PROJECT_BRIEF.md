---
last_updated: 2026-10-01
verified_application_commit: 6d32de6a94c2afb92c5bc7a4c72dffe73737d2b1
verified_context_branch: chore/ai-context-system-v2
verified_context_commit: pending-finalization
live_environment_verified: never
status: current-with-live-unknowns
---

# Bolt V1 Project Brief

This is the mandatory fast briefing for fresh AI/developer sessions. Use it to orient; inspect the actual source/live evidence before implementation or operational conclusions.

## Product

Bolt Abacus is a React/Django learning platform for abacus students and teachers. Current implemented product areas include student/teacher authentication, level/lesson learning, classwork, practice Arena modes, progress/XP, teacher classes/rosters, curated question import and answer-recovery hardening. Product direction also includes PvP/tournaments, audio, microphone answering and advanced flash-card modes, but presence in product plans does not mean a feature is implemented.

## Stack

- **Frontend [CODE]:** React 18 + TypeScript + Vite, React Router, TanStack Query/Axios, Zustand, Vitest, Playwright.
- **Backend [CODE]:** Django/DRF, SimpleJWT, drf-spectacular.
- **Data [CODE]:** PostgreSQL primary; optional read replica routing for courses/progress reads.
- **Cache/async [CODE]:** Redis + Celery worker/beat.
- **Repo deployment path [CODE]:** Gunicorn + Docker Compose production services + Caddy reverse proxy/TLS; AWS bootstrap/deploy scripts exist.
- **Frontend hosting config [CODE]:** Vercel config exists and rewrites `/api/*` to `https://api.boltabacus.com`.
- **Actual live hosting/deployed revision [UNKNOWN]:** not verified from the current authorized environment.

## Repository state

- Repository: `aranya-squad/Bolt-V1`
- Default branch: `main`
- Main head observed 2026-10-01: `cec94ea187ab3fcf571f73dd4468b1edaf0d290a`
- Frozen historical implementation baseline: `feat-Sagar@c81416d166792caada0868dff0d3242daccbedde`
- Agent workflow foundation: `chore/agent-workflow@b03d167b8b5478feb4d306ec51a5872c0b5b3951`
- Answer-recovery implementation reviewed at: `6d32de6a94c2afb92c5bc7a4c72dffe73737d2b1`
- Answer-recovery branch current head observed 2026-10-01: `88cfff2791c9adc3648a39cf39a21a73c97e1697` (documentation-only final handoff after reviewed code)
- AI context V2 setup branch: `chore/ai-context-system-v2`

Verify current refs before acting; these are observations, not permanent constants.

## DONE / verified locally

### Answer recovery [TEST + CODE]

The reviewed implementation at `6d32de6` adds:

- immutable attempt identities
- accepted receipts
- atomic/bulk replay-safe answer handling
- finalize manifests
- server-authoritative recovery/reconciliation
- same-tab/sessionStorage recovery
- conflict handling
- primary-consistent authoritative persistence reads/writes
- versioned scoring interpretation while preserving prior finalized history

Recorded evidence from the feature handoff:

- backend Ruff passed
- 251 pytest cases passed on Python 3.12 / PostgreSQL 16 / Redis 7
- frontend ESLint, TypeScript, 73 Vitest tests and Vite build passed under Node 20
- four built-SPA + real local API Chromium recovery cases passed
- independent review accepted the reviewed code SHA

Not proven by this evidence: GitHub CI, production deployment, live AWS capacity, tournament fairness, cross-device recovery or production frontend source.

### Agent workflow foundation [TEST + CODE]

A branch/worktree/handoff workflow exists in `AGENTS.md` and `docs/agent-workflow.md`. Human integration/release remains the default boundary.

## IN PROGRESS

### AI context system V2

Branch: `chore/ai-context-system-v2`

Goal: make fresh AI sessions load one fast brief, route to task-specific deep context, verify against actual code/live evidence, operate autonomously inside scope and keep context fresh without repeated human explanation.

Canonical implementation plan: `docs/AI_CONTEXT_SYSTEM_SETUP.md`.

## NEXT

1. Complete/verify the AI context V2 files, freshness tooling and cold-start test on `chore/ai-context-system-v2`.
2. Human-review/integrate the workflow foundation and answer-recovery work in the documented dependency order.
3. Verify normal GitHub CI through the appropriate PR/integration path.
4. Confirm actual production frontend source/deployed revision and live AWS topology before making production claims or release changes.
5. Keep tournament timing/fairness/concurrency/load work separate from ordinary learning-session persistence.
6. Choose the next product feature from current human direction + relevant backlog/next-step evidence after integration state is verified.

## BLOCKED / HUMAN OR LIVE EVIDENCE NEEDED

- **Production frontend ownership/deployed revision [UNKNOWN]:** repository contains bundled frontend and Vercel configuration, but actual deployed source was not verified in the earlier audit.
- **Live AWS topology/current resources [UNKNOWN]:** repo scripts describe an AWS path, but live resources were not authenticated/verified by the earlier assessment.
- **Production logs/observability availability [UNKNOWN]:** source config emits JSON logs to stdout and optional Sentry, but actual log destinations/retention are not verified.
- **Tournament product rules [HUMAN]:** event duration, authoritative timing/scoring rules, reconnect/fairness behavior and related requirements must be approved before tournament-scale implementation is treated as complete.

## Critical invariants

- Durable progress/attempt/XP writes are owned by `backend/apps/progress/services.py`; avoid parallel write paths.
- `QuestionAttempt`, `ProgressRecord` and `XPEvent` are append-only/audit-oriented records.
- Do not silently rewrite or reinterpret historical finalized results.
- Session answers are server-authoritative; client clocks/acknowledgements do not by themselves prove competition fairness.
- Recovery currently provides same-tab/sessionStorage durability, not cross-device/multi-tab sync.
- Ordinary learn/practice persistence and tournament fairness are separate concerns.
- Test environments must not fall back to production resources.
- Repo deployment configuration is not proof of live deployment state.

## Environments

| Environment | Known state | Evidence |
|---|---|---|
| Local dev | Compose: Postgres 16, Redis 7-alpine, Django :8000, Vite :5173 | CODE |
| CI | PRs + pushes to main; backend Ruff/pytest on Py3.12/Postgres16/Redis7; frontend Node20 lint/type/test; build artifact | CODE |
| Preview/staging | No single canonical environment verified | UNKNOWN |
| Production backend | Repo defines Compose web/worker/beat/Caddy, RDS/ElastiCache/S3-oriented settings/scripts | CODE only |
| Production frontend | Vercel config exists; actual deployed source/revision not verified | CODE + UNKNOWN |
| AWS live resources | not verified in current evidence | UNKNOWN |

## Context router

- **Frontend/UI:** `docs/SYSTEM_MAP.md#frontend` + relevant feature doc + actual `frontend/src`.
- **Backend/API:** `docs/SYSTEM_MAP.md#backend`, API section, relevant app URLs/views/serializers/services.
- **Persistence/recovery/scoring:** relevant feature doc + `backend/apps/progress/services.py` + exercises contract/views/models + frontend recovery store/hooks.
- **Auth:** SYSTEM_MAP auth flow + users app + frontend auth store/routes/API client.
- **Teacher/classes:** classroom app + teacher frontend + relevant routes/hooks.
- **Question/curriculum:** courses/exercises generators/import path + product/curriculum docs when explicitly required.
- **CI/build:** `.github/workflows/ci.yml` + `docs/RUNBOOK.md`.
- **AWS/deploy/outage/logs:** `docs/RUNBOOK.md` + actual deploy config/scripts + live provider/log evidence when authorized.
- **Architecture decision:** `docs/DECISIONS.md` / ADRs + SYSTEM_MAP + affected code.
- **Feature continuation:** active `docs/features/<feature>.md`, especially its `Next Exact Action`.

## Source-of-truth note

`docs/ARCHITECTURE.md` was last broadly authored before the October implementation work and contains valuable design history, but it is not the operational current-state authority. Use `docs/SYSTEM_MAP.md` for current operational architecture and treat ARCHITECTURE as historical/design context unless re-verified section-by-section.
