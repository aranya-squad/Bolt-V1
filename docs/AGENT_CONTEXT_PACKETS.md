# Bolt coding-agent context packets

**Decision (2026-10-14):** compact, selective context for bounded coding tasks. This is implementation guidance, not a substitute for PM/CTO/Head QA approval of new product features. Existing G0–G5 gates and human merge/release rules remain.

## Load in layers

1. **Always:** `BOLT_BOOTSTRAP.md`, the current `docs/PROJECT_BRIEF.md`, `docs/CONTEXT_INDEX.yaml`, and the exact task packet below. Read real source/tests for the assigned task.
2. **Only if routed:** the relevant `docs/SYSTEM_MAP.md` section, feature tracker and frozen scope, API/types contract, and a relevant recipe below.
3. **On demand:** historical logs, full ADRs, unrelated subsystems, deployment documentation or broad repository history. Do not dump all of `docs/AI_DEV_LOG.md` into every coding prompt.

## Required compact task packet (copy per worker)

```text
Task ID / user-visible outcome:
Frozen scope SHA-256 / acceptance IDs:
Base ref and exact commit:
Prerequisite task/contract:
Owned writable files or directories:
Read-only references (maximum 5 initial files):
Current behavior / interfaces / example:
Explicit non-goals and prohibited changes:
Tests to run and observable pass condition:
Environment and data safety boundary:
Return: commit SHA, changed paths, executed checks, evidence, findings, limitations.
```

No agent may silently broaden a writable path or modify another worker's contract. When task scope is unclear, escalate the precise ambiguity to the coordinator rather than guessing. A failure is evidence; never weaken assertions.

## Minimal architecture recipes

| Task class | Read first | Guardrail | Typical validation |
|---|---|---|---|
| Backend/API | `backend/apps/*/views.py`, serializers, relevant tests, `frontend/src/api/openapi.yaml` | Keep DRF auth/permissions, routes, schema/types/mocks consistent | Ruff, focused pytest, contract regression |
| Durable progress/XP | `backend/apps/progress/services.py`, exercises models/views, current attempt contract | Server authority; primary DB; transaction and idempotency; no historical rewrite | Real PostgreSQL transactions/locking with separate connections |
| React UI | target feature component, hooks, shared types/styles | No new store/policy owner; distinguish pending vs confirmed saves; keyboard/accessibility, desktop and 320px mobile | lint, type-check, Vitest, build, relevant browser case |
| Auth/account | users permission path, `authStore`, API client, protected routes | No identity/cache leakage; real hashing/JWT/refresh; no production accounts | focused backend + built-SPA/real-API test |
| Testing/CI | exact workflow, test config, source implementation | Isolated database/Redis, synthetic accounts, immutable built assets, Node20 CI alignment | run named checks; record actual run SHA and failure limits |

## Model routing and escalation

- **Economical coding-capable models:** one well-defined component, typing, focused regression, deterministic mechanical change, or documentation repair; explicit interface/examples and tests.
- **Stronger reasoning models:** PM/CTO/QA decisions, concurrency, schema migrations, security/identity, cross-stack contract design, merge conflict resolution and independent final review.
- **Escalate** after two distinct failed attempts with the same underlying defect, an unplanned migration/API policy change, unverifiable tests, or a changed source contract.
- A small model is not automatically cheaper: compare whole-task cost including review/rework, not nominal token price.

## Evidence and isolation

Use independent worktrees for parallel writers, with disjoint paths. Never run two Vite builds into the same `dist` while a Playwright preview reads it. Use a fresh isolated DB/Redis and a fixed built artifact; no live endpoint fallback. Check `package.json` for real npm script names rather than inventing commands. Record the Git SHA of the tested tree and report CI as UNKNOWN until a matching hosted run is inspected.

## Trial evaluation

Pilot on three representative scoped maintenance tasks: simple UI + test, backend contract regression, and PostgreSQL concurrency regression. Compare small versus stronger worker under the same scope, acceptance tests, branch and review policy. Capture first-pass test success, number of repair loops, reviewer defect severity, wall time, approximate total cost, and acceptance after independent review. Do not claim any model wins until evidence exists.
