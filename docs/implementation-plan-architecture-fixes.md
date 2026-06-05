# Bolt Abacus — Implementation Plan: Architecture Fixes

**Date:** 2026-06-04
**Source:** `docs/architecture-review-2026-06.md` (prioritized recommendations §6)
**Format:** Wave → Category → Task (priority). Each task has explicit files + a verify step.
**For:** Claude Code execution. Read the referenced files before editing. Obey `CLAUDE.md` (surgical changes, confirm scope before touching >3 files, state plan before multi-step work).

**Wave → priority mapping:** Wave 1 = P0 (before paying users), Wave 2 = P1 (before Stage-1 scale), Wave 3 = P2 (as volume grows).

---

## Wave 1 — P0: Speed path, CDN split, doc/code reconciliation

**Exit gate:** A 40-question timed session completes with zero per-question network blocking; Practice grades client-side and submits once; Classwork/Test submit in background batches with answers still server-secret; SPA builds for CDN deploy; `npm test` and `pytest` green. No Wave 2 work until this gate passes.

| Wave | Category | Task | Priority |
|---|---|---|---|
| 1 | Backend | Add bulk attempt endpoint `POST /sessions/{id}/attempts/bulk/` in `backend/apps/exercises/views.py` + `urls.py`. Accepts `{attempts: [{question_index, answer, elapsed_ms}, ...]}`. Reuse `record_attempt` per item inside one `select_for_update` + atomic block. Validate indices in-bounds, dedupe by `(question_index, attempt_number)` server-side, return per-index verdicts. **Verify:** new test in `apps/exercises/tests/test_views.py` posts 40 attempts in one call, asserts 40 `QuestionAttempt` rows + correct verdicts + single transaction. | High |
| 1 | Backend | Tier the start payload by `SessionKind`. In `SessionMetaSerializer` (or a new field), include `answer` in `questions` **only** for Practice kinds (`FLASH_CARDS`, `ZEN`, `TIME_ATTACK`, `CUSTOM`); never for `CLASSWORK`/`HOMEWORK`. Gate via a serializer context flag set in the view. **Verify:** test asserts answers present for a ZEN session payload and absent for a CLASSWORK payload. | High |
| 1 | Frontend | Practice flow: client-side grading. In `InArenaPage.tsx` (+ Flash/Zen when built), grade against the now-included `answer` locally, advance instantly with no `submitAttempt` round-trip. Buffer results in `sessionStore`. On finish, call the bulk endpoint once, then `finalizeSession`. **Verify:** Vitest test — answering advances with no network mock call per question; one bulk call fires on completion. | High |
| 1 | Frontend | Classwork/Test flow: decouple advance from network. In `ClassworkPage.tsx`, advance optimistically on submit; buffer answers in `sessionStore`; flush to the bulk endpoint debounced (every 5 answers or 3s) and a final flush before `finalizeSession`. Keep answers server-graded (no client answer for these kinds). Move per-question verdict display to Mission Report (already renders verdicts) or keep a non-authoritative local hint only. **Verify:** Vitest — UI advances without awaiting per-question response; buffered answers flush on a timer and on finalize; retry/Fixed-verdict logic preserved. | High |
| 1 | Frontend | Add an offline-tolerant submit queue: if a bulk flush fails, retain the buffer in `sessionStore` and retry with backoff; final flush on `/submit/` is the safety net. **Verify:** test simulates one failed flush then a successful retry; no answers lost. | Med |
| 1 | Infra | CDN split: confirm `frontend` `npm run build` produces a standalone static bundle; document/serve it via CDN (Cloudflare Pages or S3+CloudFront), API on its own origin. Add `.env.production` `VITE_API_BASE_URL` pointing at the API origin. Do **not** serve the SPA from Django. **Verify:** `npm run build` succeeds; built `dist/` loads against a remote API base; document the deploy step in `docs/`. | High |
| 1 | Infra | Verify cross-origin refresh-cookie flow for the CDN/API split. Check `REFRESH_COOKIE_SAMESITE`/domain in `settings/base.py` + `CORS_ALLOWED_ORIGINS` + `withCredentials` in `client.ts` work when SPA and API are on different subdomains. **Verify:** manual/E2E — login on SPA origin, token refresh succeeds against API origin, no cookie-blocked 401 loop. | High |
| 1 | Docs | Reconcile `docs/ARCHITECTURE.md` §10 with actual code: it claims "second attempt → 409" and "skip → 422" but the code allows multi-attempt (for Fixed verdict) and accepts skips. Update the doc to match the code's (correct) behavior. **Verify:** doc no longer contradicts `SubmitAttemptView`/bulk endpoint. | High |
| 1 | Backend | Decide `MIN_ANSWER_MS` semantics: anti-cheat (reject/flag implausibly fast graded answers) or telemetry (log only). Implement the chosen behavior in the attempt/bulk path; document it. Recommended: enforce/flag for `CLASSWORK`/`TIME_ATTACK`, log-only elsewhere. **Verify:** test for the chosen behavior. | Med |

---

## Wave 2 — P1: Managed data tier, CI, metric definitions

**Exit gate:** Postgres is managed with automated backups; deploy is reproducible from a documented path/IaC; PRs run lint + type-check + tests automatically; "time taken" is defined and consistent across report and personal-best.

| Wave | Category | Task | Priority |
|---|---|---|---|
| 2 | Infra | Move Postgres to managed (RDS / Cloud SQL / managed PG, smallest instance). Enable automated snapshots + PITR. Update `DATABASE_URL` handling; confirm `settings/production.py` + migrations run against it. **Verify:** `manage.py migrate` clean on managed DB; a snapshot exists; restore tested once. | High |
| 2 | Infra | Move Redis to managed (ElastiCache / Memorystore, smallest node). Point `REDIS_URL`. **Verify:** cache + JWT denylist + `user_stats` invalidation work against managed Redis. | Med |
| 2 | Infra | Add reproducible deploy: minimal `terraform/` (VM/managed services/LB) or a documented `deploy.sh`. Stand up 2 app instances behind a load balancer for rolling deploys. **Verify:** a deploy runs end-to-end from the documented path; rolling restart serves with no downtime. | High |
| 2 | DevOps | Add CI (GitHub Actions): on PR run backend `pytest` + frontend `lint` + `type-check` + `vitest`; on main build + deploy. **Verify:** a PR triggers the pipeline; a red test blocks merge. | High |
| 2 | Backend | Define "time taken" explicitly. Today `finalize_session` sums per-attempt `elapsed_ms` (excludes idle gaps). Decide sum-of-elapsed vs wall-clock (`submitted_at - started_at`) for `ProgressRecord.time_taken_sec` and the personal-best tiebreaker in `_is_better_record`. Implement consistently; document. **Verify:** test asserts the chosen definition for a session with idle gaps. | Med |
| 2 | Backend | Tune Gunicorn for concurrency: raise workers toward `2×vCPU+1`, evaluate `gthread` workers; benchmark before/after with a load of concurrent timed sessions. Update `docker/Dockerfile.prod`. **Verify:** documented before/after p95 latency under simulated concurrent sessions. | Med |
| 2 | Infra | Add CDN caching for read-mostly endpoints (`GET /levels/`, similar) with short TTLs; ensure per-user lock-state endpoints stay uncached or vary correctly by user. **Verify:** cache headers correct; no cross-user data leakage on cached responses. | Low |

---

## Wave 3 — P2: Elastic scale, async workers, hot-table partitioning

**Exit gate:** App tier autoscales; background jobs run on Celery; reads can be served from a replica; hot append-only tables have a partitioning plan ready to trigger.

| Wave | Category | Task | Priority |
|---|---|---|---|
| 3 | Infra | Containerize on a managed orchestrator (ECS Fargate / Cloud Run / GKE Autopilot). Autoscale app instances on CPU/RPS. (Stateless design — should be config, not code.) **Verify:** load test triggers scale-out and back-in; no session affinity required. | High |
| 3 | Backend | Stand up Celery worker + beat (broker already configured in `settings/base.py`). Implement the abandonment sweep (mark sessions `abandoned_at` after >2× time limit) and move XP/progress aggregation off the request path. **Verify:** beat schedules the sweep; an abandoned session gets flagged; aggregation produces same numbers as the synchronous path. | Med |
| 3 | Backend | Add a Postgres read replica; route read-mostly endpoints (`/levels/`, `/progress/me/`, reports) to it via a Django DB router; writes to primary. **Verify:** reads hit replica (logged), writes hit primary, no stale-read regressions on post-write reads (route those to primary). | Med |
| 3 | Backend | Partition `XPEvent` and `QuestionAttempt` by month (model comments already anticipate this). Add the migration + partitioning strategy; trigger when tables approach ~10M rows. **Verify:** partition migration applies; queries use partition pruning; append-only constraints preserved. | Low |
| 3 | Backend | Redis-backed leaderboard / personal-best caching layer; invalidate on finalize (extend the existing `user_stats` invalidation pattern). **Verify:** personal-best reads served from cache; correct value after a new best is set. | Low |

---

## Cross-cutting rules (all waves)

- Surgical diffs: every changed line traces to a task. Confirm scope before touching >3 files (per `CLAUDE.md`).
- All new TanStack Query usages keep `isLoading`/`isError` paths.
- All writes to append-only progress tables go only through `apps/progress/services.py`. Do not bypass it from the bulk endpoint.
- Answers for `CLASSWORK`/`HOMEWORK` never leave the server. Any code path that could leak them is a bug, not a trade-off.
- Update `docs/ARCHITECTURE.md` whenever behavior changes so doc/code don't drift again.
