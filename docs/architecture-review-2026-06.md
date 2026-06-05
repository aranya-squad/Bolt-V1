# Bolt Abacus — Architecture Review & Rating

**Date:** 2026-06-04
**Reviewer scope:** Full backend (`backend/`) + frontend (`frontend/`), handoff docs, ARCHITECTURE.md
**Lens:** ed-tech platform running live/timer-based numerical quizzes, speed prioritized over UI; 100–200 users now, thousands later; local now, cloud (AWS/GCP) next.

---

## TL;DR

**Overall: 82 / 100.** This is a well-engineered codebase with unusually disciplined data integrity, auth, and documentation — above the bar for a pre-revenue product. The architecture is fundamentally sound and will scale.

The one place it is **at odds with your stated priority (speed)** is the answer-submission path. There is also one **factual correction** to your premise:

> You asked for "30–50 questions preloaded into the browser rather than fetching each one by one."
> **Questions are already preloaded in a single call.** `StartClasswork`/`StartPractice` generate the full set server-side and `SessionMetaSerializer` returns all of them at once. There is no per-question fetch today.

What *is* per-question is the **answer submission** (`POST /sessions/{id}/attempts/` fires once per question). That round-trip — not question loading — is the latency cost during a timed test. And answers are deliberately withheld from the browser for anti-cheat. So the real design question is not "preload questions" (done) but **"how do we remove the per-answer round-trip from the critical path without shipping answers to cheaters."** That is the central recommendation below.

---

## 1. Scorecard

| Area | Score | One-line verdict |
|---|---:|---|
| Data model & integrity | 92 | Append-only, UUID PKs, DB constraints, row-level locking — excellent. |
| Auth & security | 88 | JWT rotation + denylist + httpOnly refresh + throttling. Strong. |
| Anti-cheat design | 85 | Correct instinct; needs to be tiered per session type (see §3). |
| Backend API design | 78 | Clean REST, but the per-attempt chattiness fights the speed goal. |
| Frontend architecture | 85 | Feature-based, React Query + Zustand, loading/error paths everywhere. |
| **Speed for timer tests (your stated priority)** | **70** | Per-question network round-trip is the weak point. Fixable. |
| Scalability / cloud-readiness | 75 | Good bones (stateless, Redis, Docker); deployment topology not yet wired. |
| DevOps & observability | 70 | Sentry + JSON logs + health intent; CI/CD and IaC not present in repo. |
| Testing | 78 | Harness solid, coverage partial. |
| Docs / handoff quality | 95 | Genuinely excellent; ADR-grade reasoning throughout. |
| **Weighted overall** | **82** | Ship-ready foundation; tune the hot path before scale. |

---

## 2. What the handoff/design docs got right (validated against the code)

These are real strengths, confirmed in the source — keep them.

- **Append-only progress tables** (`ProgressRecord`, `QuestionAttempt`, `XPEvent`) with `save()`/`delete()` overrides that *raise* on mutation. This is the right call for an assessment product where scores must be auditable. Most teams retrofit this painfully; you have it on day one.
- **Server-side answer authority.** `questions_json` holds answers; `questions_for_client()` strips them. Grading is computed server-side in `record_attempt`. Correct for graded work.
- **Concurrency correctness.** `select_for_update()` on the session in both `SubmitAttemptView` and `finalize_session`, plus `ATOMIC_REQUESTS=True`, plus the `unique_together (session, question_index, attempt_number)` constraint. The "Fix 8 concurrency bugs" commit shows this was taken seriously. Double-XP and race-on-finalize are genuinely guarded.
- **Deterministic seeding.** `(seed, config)` reproduces a question set — enables retake, audit replay, and reproducible tests for free.
- **Idempotent finalize.** Re-POSTing `/submit/` returns the existing record instead of erroring or double-awarding.
- **Auth hygiene.** SimpleJWT with `ROTATE_REFRESH_TOKENS`, `BLACKLIST_AFTER_ROTATION`, httpOnly refresh cookie, short 15-min access token, per-endpoint throttle rates (`login 5/min`, `register 3/hour`, `attempt 120/min`). This is better than most production apps.
- **Lock enforcement** at both level and lesson granularity (`LevelCompletion` / `LessonCompletion`) computed server-side, not trusted from the client.
- **Frontend discipline.** Every TanStack Query hook has `isLoading`/`isError` paths (a stated hard rule, and it holds in `ClassworkPage`/`InArenaPage`). Single-flight token refresh in `client.ts` prevents the concurrent-401 thundering herd.

The accepted deviations in the handoff (Zustand over useReducer, TypeScript over JS, consolidating ArenaSetup) are all reasonable and well-justified.

---

## 3. The central issue: speed vs. anti-cheat on the answer path

### 3.1 What happens today during a 40-question timed test

1. `POST /practice/start/` → server generates 40 questions, returns all 40 (no answers) in **one** response. Good.
2. For each question: user types answer → `POST /sessions/{id}/attempts/` → server grades, returns verdict → UI shows feedback → next question. **40 round-trips.**
3. `POST /sessions/{id}/submit/` → finalize, compute XP, return report.

Each step-2 round-trip sits **in the critical path of the timer**. On a good connection that's ~50–150 ms; on mobile/3G in a tier-2/3 Indian city (your likely audience) it can be 300–800 ms per question. Over 40 questions that's real felt latency, and worse, it couples answering speed to network jitter — which is exactly wrong for a speed-first numerical drill where the abacus skill being measured is sub-second mental math.

### 3.2 Why "just preload the answers" (your suggestion) is risky as-stated

If answers ship to the browser, anyone with DevTools open can read them. For **Practice** (Zen/Time Attack/Flash Cards/Custom) where the score is a personal-best toy, that's acceptable. For **Classwork and Test Mode** — which gate level progression and are described in the plan as "formal assessment stored per-topic" — client-side answers mean the leaderboard, level unlocks, and any future report-card/parent-facing metric become trivially forgeable. Once revenue and report cards are involved, that's a credibility problem, not a hypothetical.

### 3.3 Recommendation: tier the design by session kind

This gives you the speed you want *and* keeps integrity where it matters. The model already has `SessionKind`, so this is a natural split.

**Practice modes (Zen, Time Attack, Flash Cards, Custom) — optimize for raw speed:**
- Ship questions **with answers** in the start payload. Grade in the browser instantly (zero latency per question — this is the "preload everything" you asked for, and it's safe here).
- **Batch-submit** the whole result set once at the end via a single `POST /sessions/{id}/attempts/bulk/` (or fold it into `/submit/`). One round-trip for the entire session instead of N.
- Personal-best is "honor system" — fine for self-practice.

**Classwork & Test Mode — keep answers server-side, but kill the round-trip:**
- Keep shipping questions **without** answers (unchanged).
- Buffer answers locally as the student plays; the UI advances **immediately** on input (optimistic, no spinner) — it does not wait on the network.
- Submit answers in the background, **debounced/batched** (e.g. every 5 answers or every 3 s) and a final flush on `/submit/`. Grading and verdicts still happen server-side; the student just isn't blocked by them mid-test. Show the per-question verdict at the end on the Mission Report (which already renders verdicts) rather than after each question, OR keep instant client-side "looks right/wrong" hints only in Practice.
- This removes 40 round-trips from the timed path while keeping answers secret and scores authoritative.

**Net effect:** the timed experience becomes network-independent in both tiers, you ship the single-payload preload you wanted for Practice, and graded work stays cheat-resistant. This is the single highest-leverage change in this review.

### 3.4 Smaller correctness/robustness notes on the hot path

- `MIN_ANSWER_MS` is only **logged**, never enforced (`SubmitAttemptView` warns but still records). Decide: is it anti-cheat or telemetry? If anti-cheat, flag/reject; if telemetry, fine as-is but document it.
- The anti-cheat doc (§10.1/10.2) claims "one submission per question_index, second returns 409" and "skipping returns 422." **The code does neither** — it allows multiple attempts (by design, for the Fixed-verdict retry feature) and accepts any in-bounds index. The doc and code have drifted; reconcile them so the next engineer isn't misled. The code's behavior is the correct one for the retry feature; fix the doc.
- `elapsed_total` in `finalize_session` is the **sum of per-attempt elapsed_ms**, not wall-clock session time. For a timed test these differ (idle time between questions is excluded). Confirm that's the intended "time taken" metric for the report and personal-best tiebreaker; if you want wall-clock, use `submitted_at - started_at`.

---

## 4. Scalability & cloud deployment (lean now, scale later)

The codebase is **stateless and horizontally scalable** by construction (JWT auth, no server session affinity, Redis for cache/locks-via-DB, DB as the only stateful tier). That's the hard part and it's done. What's missing is the deployment topology. Here is a staged path that runs cheap now and scales when revenue arrives, with **no rewrite** between stages.

### Stage 0 — Launch (100–200 users): one small box, ~$15–40/mo
- **Single VM** (AWS Lightsail / EC2 t4g.small, GCP e2-small, or E2E/Hetzner equivalent) running Docker Compose: Django+Gunicorn, Postgres, Redis, Caddy/Nginx as TLS reverse proxy.
- **Frontend served as static files from a CDN** (Cloudflare Pages / S3+CloudFront / Netlify — free tier). The SPA is already a pure Vite build; this is the biggest speed win for the price and it's free. Do this from day one — don't serve the SPA from Django.
- Managed Postgres optional at this size; co-located Postgres on the VM is fine for 200 users if you take backups. **Do turn on automated snapshots.**
- This comfortably serves 200 users. Don't over-build here.

### Stage 1 — Traction (1–5k users): split tiers, still cheap
- Move Postgres to **managed** (RDS / Cloud SQL / managed PG) — db_t4g.micro/small. This is the highest-value upgrade: backups, PITR, failover handled for you.
- Move Redis to **managed** (ElastiCache / Memorystore, smallest node).
- Run the Django container behind a load balancer with **2 app instances** (still small). Now you have rolling deploys and no single point of failure on the app tier.
- Keep the SPA on CDN. Add CDN caching for `GET /levels/` style read-mostly endpoints with short TTLs.

### Stage 2 — Scale (10k+ users): elastic
- **Containerize on a managed orchestrator**: ECS Fargate / Cloud Run / GKE Autopilot. Autoscale app instances on CPU/RPS. Your stateless design makes this a config change, not a code change.
- **Postgres read replica(s)**; route `/levels/`, `/progress/me/`, report reads to the replica, writes to primary.
- Move XP/progress aggregation and the abandonment sweep to **Celery workers** (already wired in settings; just stand up the worker + beat).
- Consider partitioning `XPEvent` / `QuestionAttempt` by month (the model comment already anticipates this) once tables pass ~10M rows.

### Cloud-readiness gaps to close before Stage 1
- **Gunicorn is sync with 4 workers, 30 s timeout.** Fine for short JSON endpoints. For thousands of concurrent timed tests, raise worker count to `2×vCPU+1` and consider `gthread` workers or move I/O-bound endpoints to ASGI/uvicorn. Benchmark before tuning.
- **No CDN/static strategy is wired** — `collectstatic` runs but the SPA isn't on a CDN in any config. Wire this (Stage 0).
- **CORS/cookie domains** are env-driven (good) but the refresh cookie is `SameSite=Lax` with `withCredentials`. Verify cross-subdomain (app on CDN domain, API on api.domain) cookie flow end-to-end before launch — this is a common production-day surprise.
- **No IaC.** A single `terraform/` or even a documented `deploy.sh` would make Stage transitions reproducible. Not urgent at Stage 0; do it before Stage 1.
- **No CI/CD in the repo** despite the doc describing GitHub Actions. Add at minimum: lint + type-check + test on PR, build + deploy on main. Cheap insurance.

---

## 5. Best-practice cross-check (timer-based numerical quiz platforms)

| Best practice for speed-first quiz/test platforms | Status here | Action |
|---|---|---|
| Preload the full question set in one request | **Done** | None — already single-payload. |
| Don't block the timer on per-answer network calls | **Not done** | §3.3 — batch/optimistic submission. |
| Client-side grading for low-stakes practice | Not done | §3.3 — ship answers for Practice only. |
| Server-authoritative grading for graded/assessment work | **Done** | Keep. |
| Static SPA on CDN, API separate | Partially (SPA is static, not on CDN) | Stage 0 — put SPA on CDN. |
| Optimistic UI / instant feedback | Partial (waits on verdict) | Decouple advance from network. |
| Idempotent submit / retry safety | **Done** | Keep. |
| Rate limiting on submission endpoints | **Done** (`attempt 120/min`) | Keep. |
| Time integrity (server clock, not client) | Partial (`elapsed_ms` from client; `MIN_ANSWER_MS` only logged) | Enforce server-side timing for graded tests. |
| Offline tolerance for flaky mobile networks | **Not done** | Local answer buffer + retry queue (falls out of §3.3 naturally). |
| Aggregate stats cached, not recomputed per request | Partial (`user_stats` cache key invalidated on finalize) | Good pattern; extend to leaderboards. |
| Question bank scales without per-request CPU spikes | **Done** (procedural + curated generators, cheap) | Keep. |

The headline: you are doing the *integrity* best-practices better than typical, and the *latency* best-practices below typical. Since your stated priority is speed, §3.3 is where the points are.

---

## 6. Prioritized recommendations

**P0 — do before onboarding paying users**
1. Decouple answering from the network: client-side grading + batch submit for Practice; optimistic-advance + background batched submit for Classwork/Test (§3.3).
2. Put the SPA on a CDN, API on its own origin (§4 Stage 0). Verify the cross-origin refresh-cookie flow.
3. Reconcile ARCHITECTURE.md §10 with actual attempt/skip behavior (§3.4). Pick whether `MIN_ANSWER_MS` is enforced or telemetry.

**P1 — before Stage 1 scale**
4. Managed Postgres + automated backups/PITR. Add a `terraform/` or documented deploy path.
5. Add CI (lint, type-check, test on PR).
6. Decide and document the "time taken" definition (sum-of-elapsed vs wall-clock) for reports and personal-best.

**P2 — as volume grows**
7. Stand up Celery worker + beat (abandonment sweep, async XP aggregation).
8. Read replica + route reads; partition `XPEvent`/`QuestionAttempt` past ~10M rows.
9. Leaderboard/personal-best caching layer in Redis.

---

## 7. ADR-style summary of the key decision

**Decision:** Tier the answer-submission path by `SessionKind` — client-graded + batch-submitted for Practice; server-graded + optimistic/background-batched for Classwork & Test — instead of the current uniform per-attempt server round-trip.

**Context:** Speed is the stated product priority; the audience is on variable mobile networks; scores gate progression and will feed parent-facing reports once revenue starts.

**Consequences (positive):** Timed experience becomes network-independent; matches the "preload" intent; one round-trip per session instead of N; integrity preserved where it counts; offline tolerance falls out for free.

**Consequences (negative / trade-offs):** Two code paths instead of one (more complexity); Practice scores become honor-system (acceptable — they're personal toys); per-question verdicts in graded mode move to end-of-session unless you keep a non-authoritative instant hint. Reversible: both paths still flow through the same `record_attempt`/`finalize_session` write layer, so you can tighten or loosen per kind later.

**Status:** Recommended. Not yet implemented.
