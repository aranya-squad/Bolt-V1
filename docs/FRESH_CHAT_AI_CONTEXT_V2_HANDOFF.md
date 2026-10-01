# Bolt V1 — Fresh Chat Continuation Handoff

> Historical continuation instructions at creation. Before executing the remaining
> steps below, inspect `docs/features/ai-context-system-v2.md` and current remote
> refs; the tracker records which steps are already complete.

**Use this entire document as the first message in a fresh ChatGPT/Codex chat.**

The purpose is to let a fresh AI session continue the Bolt V1 AI-native development setup without asking the human to repeat context.

---

## NEW CHAT INSTRUCTION

You are continuing the **Bolt V1 AI Context System V2** setup.

Do not restart the project from scratch and do not ask me to repeat prior context. Inspect GitHub first, verify the branch state, read the files named below, then continue the remaining work step-by-step.

### Primary objective

Set up Bolt V1 so future AI coding sessions can:

- understand the product/system quickly but deeply;
- know what is done, in progress, next, blocked and unknown;
- inspect actual frontend, backend, API, database, CI, AWS/deployment, connectors and logs when relevant/available;
- continue existing feature branches rather than duplicating work;
- work autonomously after I give direction;
- ask me only for genuine product decisions, material scope changes, merge/release approval, destructive production/data actions or live infrastructure mutation;
- leave durable Git checkpoints so progress is trackable from any ChatGPT Project chat even if a Codex/cloud thread disappears;
- avoid AI slop by understanding existing control/data flow and source-of-truth ownership before significant edits.

Human involvement should normally be limited to:
1. starting/direction of work;
2. answering genuinely ambiguous product decisions;
3. approving merge/release/destructive or live production actions.

Everything else should be AI-executed, verified and durably documented.

---

# 1. Repository and verified branch state

Repository:

`aranya-squad/Bolt-V1`

Default branch:

`main`

Observed refs at handoff creation:

- `main@cec94ea187ab3fcf571f73dd4468b1edaf0d290a`
- `chore/continuous-dev-context@c8675e646cb2fffa13fd7ba8d867f6baf9cc5a35`
- `feat/answer-recovery@88cfff2791c9adc3648a39cf39a21a73c97e1697`
- reviewed answer-recovery code SHA: `6d32de6a94c2afb92c5bc7a4c72dffe73737d2b1`
- `chore/ai-context-system-v2@ab279fe1a55341dd616e8699bf44e42b85c673aa`

**Before doing anything, re-check the current refs.** If they moved, preserve the newer work and reconcile rather than force-resetting.

Continue on:

`chore/ai-context-system-v2`

Do not merge/deploy.

---

# 2. Human intent from the previous chat

The owner wants Bolt V1 to operate as a low-human-overhead AI-coded project.

Key intent:

- ChatGPT Project = reasoning/planning/control room.
- GitHub = durable engineering/source-of-truth state.
- Codex/cloud/local agents = execution.
- Cloud chat history must never be required for continuity.
- Every important task must be resumable from Git + canonical context docs.
- AI should inspect the **actual system**, not only summaries:
  - frontend
  - backend
  - APIs/contracts
  - database/persistence
  - CI
  - AWS/deployment
  - connectors
  - logs/observability
  - live state when available and authorized
- Summaries orient the AI; code/live evidence establishes truth.
- Avoid huge mandatory context loads. Start from a compact brief and selectively expand.
- Avoid duplicate “current state” files and stale task trackers.
- Do **not** create a global `ACTIVE_TASKS.md`; active state belongs in each feature file/branch.
- Use explicit evidence labels where useful:
  - CODE
  - LIVE
  - CI
  - TEST
  - HUMAN
  - PROPOSAL
  - UNKNOWN
- Human decisions supersede older assumptions and should be made durable.
- Review project instructions on the 15th/30th and immediately after major architecture/workflow/product/deployment/source-of-truth changes.
- Also detect stale context automatically at substantial task start instead of relying only on scheduled reminders.

---

# 3. Mandatory startup reads for this continuation task

First read completely:

1. `BOLT_BOOTSTRAP.md`
2. `docs/PROJECT_BRIEF.md`
3. `docs/CONTEXT_INDEX.yaml`
4. `docs/AI_CONTEXT_SYSTEM_SETUP.md`
5. `docs/SYSTEM_MAP.md`
6. `docs/RUNBOOK.md`
7. `AGENTS.md`
8. `docs/CLOUD_DEV_HANDOFF.md`
9. latest relevant entries in `docs/AI_DEV_LOG.md`
10. `docs/features/answer-recovery.md` only as needed for current feature-state evidence

Then inspect actual repository code/config where needed. Existing docs are evidence, not automatic truth.

Historical/deeper references only when needed:

- `docs/ARCHITECTURE.md`
- `docs/assessment01-10-2026.md`
- `docs/next-steps01-10-2026.md`
- historical deploy/implementation plans

---

# 4. Work already completed — DO NOT blindly redo it

On `chore/ai-context-system-v2`, six commits already added the initial context spine.

Current branch is **6 commits ahead** of `chore/continuous-dev-context`.

Already created:

### `docs/AI_CONTEXT_SYSTEM_SETUP.md`

One-time V2 implementation design/specification.

### `BOLT_BOOTSTRAP.md`

Stable AI operating entry point containing:

- startup flow
- evidence hierarchy
- autonomy boundaries
- anti-slop rules
- lost-cloud-task recovery
- task completion expectations
- context maintenance behavior

### `docs/PROJECT_BRIEF.md`

Fast cold-start briefing containing:

- product/stack
- repository state
- DONE
- IN PROGRESS
- NEXT
- BLOCKED/unknown
- invariants
- environment summary
- task context router

### `docs/CONTEXT_INDEX.yaml`

Machine-readable task router and change-impact map for:

- frontend
- backend
- API
- persistence
- answer recovery
- auth
- classroom
- CI/build
- AWS/deploy
- architecture
- feature continuation

It also contains human/autonomous approval boundaries.

### `docs/SYSTEM_MAP.md`

Operational architecture map derived from actual code, including:

- frontend runtime/routing/API/store ownership
- Django app responsibilities
- data/persistence ownership
- auth flow
- classroom flow
- classwork/practice flow
- answer recovery/finalization flow
- API boundary
- scoring/finalization critical path
- distinction between current operational map and historical `ARCHITECTURE.md`

### `docs/RUNBOOK.md`

Operational/local/CI/deployment/logging guide containing:

- local Compose
- backend/frontend verification
- GitHub Actions behavior
- production Compose/Caddy/Gunicorn config
- Vercel config
- AWS scripts
- live UNKNOWNs
- logs/observability mapping
- debugging flow
- connector/tool matrix
- secrets policy
- deployment approval boundary
- live verification checklist

Important discovered fact already documented:

`aws-resume-deploy.sh` reflects the newer Caddy-only ingress model better than the one-time `aws-deploy.sh`. The older bootstrap script still contains stale direct-port-8000 assumptions and must **not** be run blindly.

---

# 5. Existing application state to preserve

The answer-recovery implementation is already substantial and must not be recreated.

Reviewed code commit:

`6d32de6a94c2afb92c5bc7a4c72dffe73737d2b1`

Final answer-recovery branch head:

`88cfff2791c9adc3648a39cf39a21a73c97e1697`

Recorded verification:

- backend Ruff passed;
- 251 pytest cases passed on Python 3.12/PostgreSQL 16/Redis 7;
- frontend ESLint passed;
- TypeScript passed;
- 73 Vitest tests passed;
- Vite build passed;
- four built-SPA + real-local-API Chromium recovery scenarios passed;
- independent review accepted the reviewed implementation SHA.

This work is **READY FOR HUMAN REVIEW**, not merged/released.

Do not turn local tests into GitHub CI or production claims.

Important current invariants:

- durable progress/attempt/XP writes belong in `backend/apps/progress/services.py`;
- answer recovery is same-tab/sessionStorage scoped, not cross-device;
- server/persisted answer state is authoritative;
- historical finalized results must not be silently rewritten;
- ordinary learning persistence is separate from tournament fairness/timing/concurrency;
- test environments must never fall back to production resources.

---

# 6. Remaining setup work — execute in this order

Create a progress tracker first:

`docs/features/ai-context-system-v2.md`

This feature file is the durable tracker for this setup task.

Use metadata similar to:

```md
---
status: IN PROGRESS
branch: chore/ai-context-system-v2
base_commit: c8675e646cb2fffa13fd7ba8d867f6baf9cc5a35
current_commit: <current>
last_checkpoint: 2026-10-01
owner: ai
---

# AI Context System V2

## Goal
...

## Completed
...

## In Progress
...

## Remaining
...

## Verification
...

## Known Risks / Unknowns
...

## Human Decisions Required
...

## Next Exact Action
...
```

Update this file at every meaningful milestone so any other ChatGPT chat can inspect GitHub and track progress.

## Step A — audit and normalize canonical sources

1. Verify all newly-created context files against the actual branch/code.
2. Fix factual mistakes if found.
3. Ensure volatile state is concentrated in `PROJECT_BRIEF.md`, not duplicated everywhere.
4. Ensure historical docs are clearly distinguished from operational/current docs.

Do not delete historical evidence casually.

## Step B — decisions/ADR layer

Create:

- `docs/DECISIONS.md`
- `docs/adr/README.md`

Create only a small number of useful ADRs for already-important durable decisions. Do not create dozens of retrospective ADRs.

At minimum consider recording rationale for:

- repository/Git as durable task state;
- operational `SYSTEM_MAP.md` vs historical `ARCHITECTURE.md`;
- answer-recovery v2 contract/persistence ownership if useful;
- human-owned merge/release/live-production mutation boundary.

Each ADR should capture:
- context
- decision
- why
- alternatives
- consequences
- evidence/human approval
- supersession link if any

## Step C — migrate old context entry points

### `AGENTS.md`

Change startup behavior so fresh sessions begin with:

1. `BOLT_BOOTSTRAP.md`
2. `docs/PROJECT_BRIEF.md`
3. `docs/CONTEXT_INDEX.yaml`

Then selectively load deep docs.

Do **not** require every session to read giant historical assessment/next-step docs.

Preserve important branch/deploy/data safety boundaries.

### `docs/CURRENT_STATE.md`

Migrate any unique useful current-state content into `PROJECT_BRIEF.md`.

Then reduce CURRENT_STATE to a compatibility pointer explaining that PROJECT_BRIEF is now the canonical current-state briefing.

### `docs/CLOUD_DEV_HANDOFF.md`

Simplify it to use bootstrap/brief/context-router as the startup path.

Preserve:
- cloud task disappearance recovery;
- durable Git checkpoint rules;
- feature status semantics;
- no assumption that uncommitted inaccessible cloud workspace survived.

### `docs/AI_DEV_LOG.md`

Keep it as chronological history.

Append a new milestone entry for AI Context System V2.

Do not make the full log mandatory startup reading.

### `docs/ARCHITECTURE.md`

Do not rewrite it blindly.

Clearly label it historical/design architecture where sections are stale, and point operational work to `docs/SYSTEM_MAP.md`.

If there are still-current sections, keep them.

## Step D — standardize active feature handoff

Update the top of `docs/features/answer-recovery.md` with machine-readable/current metadata if safe and useful:

- status
- branch
- reviewed code commit
- current branch head
- last checkpoint
- owner
- Next Exact Action

Do not rewrite the verified detailed content.

## Step E — context freshness tooling

Create:

`scripts/check_context_freshness.py`

Requirements:

- standard-library only if practical;
- verify required canonical files exist;
- parse enough YAML/front-matter without adding a heavy dependency;
- verify PROJECT_BRIEF has freshness metadata;
- verify referenced commit format/basic existence when local git is available;
- verify active feature docs include:
  - status
  - branch
  - current/base or reviewed commit where relevant
  - next exact action
- verify compatibility docs point to new canonical files;
- verify BOLT_BOOTSTRAP references valid canonical docs;
- produce clear warnings/errors.

Do not contact production.

Add focused tests for the checker if practical.

## Step F — CI integration, warning-only

Integrate context freshness into `.github/workflows/ci.yml` as a **non-blocking warning initially**.

The context checker must not destabilize normal CI while this workflow is new.

Prefer something like:

- run checker;
- emit warnings;
- do not fail application CI initially.

Document exactly how/when it could later become blocking.

## Step G — final cold-start validation

Simulate a fresh agent with minimal initial context.

Verify it can accurately answer:

1. What is Bolt?
2. What is implemented?
3. What is in progress?
4. What is next?
5. What is blocked or live-unknown?
6. What is the frontend/backend/API/data architecture?
7. Where do I inspect an API bug?
8. Where do I inspect a production backend outage?
9. Which actions require human approval?
10. How do I resume a disappeared cloud task?
11. Which document owns active feature state?
12. What source wins when docs conflict with code/live evidence?

Then make it trace one real feature path from UI → API → persistence.

Record the result in `docs/features/ai-context-system-v2.md`.

## Step H — final consistency check

Before declaring setup complete:

- inspect final branch diff;
- ensure no secrets are present;
- ensure no production mutation occurred;
- ensure no duplicate source-of-truth files were introduced;
- ensure all links/paths are valid;
- ensure PROJECT_BRIEF is concise enough for cold start;
- ensure deep docs are only loaded selectively;
- ensure human/AI approval boundaries are consistent everywhere;
- ensure context checker is warning-only in CI;
- run relevant documentation/tool tests.

Commit final checkpoint.

Do not merge.

---

# 7. Context-system Definition of Done

This setup is READY FOR HUMAN REVIEW only when:

- `BOLT_BOOTSTRAP.md` is the stable entry point;
- `PROJECT_BRIEF.md` gives a fast accurate status briefing;
- `CONTEXT_INDEX.yaml` routes task-specific context;
- `SYSTEM_MAP.md` maps actual current code ownership/flows;
- `RUNBOOK.md` maps local/CI/deploy/AWS/logs/connectors and clearly marks live unknowns;
- decisions/ADR layer exists without over-documenting;
- old entry-point docs are migrated/de-duplicated;
- active feature docs have exact continuation points;
- freshness checker exists;
- CI runs it warning-only;
- fresh-agent cold-start validation passes;
- feature tracker is current;
- final branch/commit is durable;
- no merge/deploy/live infra mutation occurred.

---

# 8. Autonomy rules for this task

Proceed autonomously through all routine implementation steps above.

You do not need to ask permission to:

- read repo/docs/history;
- inspect available GitHub information;
- create/update files on `chore/ai-context-system-v2`;
- run local/static checks;
- update documentation;
- create context tooling/tests;
- commit/push this feature branch;
- prepare a review handoff.

Stop and ask me only if:

- a real product/architecture decision cannot be resolved from existing human decisions/evidence;
- two explicit human decisions conflict;
- you need to merge;
- you need to deploy;
- you need to mutate AWS/hosting/DNS/production;
- you need to handle secrets/credentials;
- you need a destructive migration/backfill;
- the task requires a material scope expansion outside the approved AI-context setup.

Do not ask because “more than 3 files” are involved. This task is explicitly multi-file.

---

# 9. Live environment / connector behavior

For this setup task:

- read-only inspection is allowed when an appropriate connector/access is available;
- do not invent access that is not present;
- if AWS/Vercel/Sentry/log access is unavailable, record `UNKNOWN`;
- do not block the repository context system merely because live access is unavailable;
- do not mutate live services.

Future operational tasks should use RUNBOOK + actual live evidence when authorized.

---

# 10. Progress tracking requirement

This is essential.

At each meaningful milestone:

1. commit durable work to `chore/ai-context-system-v2`;
2. update `docs/features/ai-context-system-v2.md`;
3. include:
   - Completed
   - Verification
   - Remaining
   - Blocked/Human Decisions Required
   - Next Exact Action
   - current commit SHA

This makes progress visible from any ChatGPT Project conversation by inspecting GitHub.

Do not rely on this chat transcript as the only task history.

---

# 11. Final response required from the fresh chat

When finished, give a compact engineering handoff containing:

- final branch
- final commit
- status: READY FOR HUMAN REVIEW / BLOCKED
- files created/changed
- what was migrated/deprecated
- context checker result
- CI integration behavior
- cold-start validation result
- tests/checks executed
- live systems actually verified
- remaining UNKNOWNs
- any genuine human decisions needed
- exact next recommended action

Do not claim MERGED or RELEASED.

---

# 12. Project Instructions after setup

The ChatGPT Project instruction field is limited to ~800 characters.

Use a compact bootstrap only; keep the deep context in GitHub.

Recommended instruction:

```text
Bolt V1 AI dev control room. At any substantial Bolt task start, inspect GitHub and read BOLT_BOOTSTRAP.md + docs/PROJECT_BRIEF.md first; use docs/CONTEXT_INDEX.yaml to load only relevant SYSTEM_MAP, RUNBOOK, decisions/ADRs, feature docs, code, APIs, tests, CI and live logs/infra when authorized. Repo/live evidence overrides summaries/memory. Continue existing branches/work; avoid duplicate implementations. Use feature branches; no merge/release/destructive prod or infra mutation without approval. Understand existing control/data flow before major edits, then work autonomously within scope. Checkpoint meaningful milestones and refresh feature/global context when state changes. Human decisions override older assumptions; detect stale context at task start and review instructions on 15th/30th.
```

After the V2 setup is finished, add the final `BOLT_BOOTSTRAP.md` as a ChatGPT Project Source if convenient.

Do not upload every deep repository document as a Project Source; that would duplicate GitHub and create sync drift.

---

# 13. Immediate first action for the fresh chat

Start by replying with a very short status confirming you have:

- verified the repo/branch refs;
- read the mandatory startup files;
- created or are about to create `docs/features/ai-context-system-v2.md`;
- identified the first remaining implementation step.

Then proceed with the work instead of waiting for another human prompt.
