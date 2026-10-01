# Bolt V1 — AI Context System V2 Setup

Status: one-time implementation specification; current setup status/verification
is owned by `docs/features/ai-context-system-v2.md`.
Created: 2026-10-01.
Target branch: `chore/ai-context-system-v2`.

## Goal

Make fresh ChatGPT/Codex sessions understand Bolt quickly and deeply, then selectively inspect the real code, API, tests, CI, deployment configuration, live infrastructure and logs when relevant. Human input should normally be limited to work direction, genuinely ambiguous product decisions, and approval for merge/release/destructive production actions.

## Design

Steady-state cold start:

```text
Project instructions (<800 chars)
  -> BOLT_BOOTSTRAP.md
  -> docs/PROJECT_BRIEF.md
  -> docs/CONTEXT_INDEX.yaml
  -> task-specific SYSTEM_MAP / RUNBOOK / ADR / feature context
  -> actual code / schema / tests / CI / live evidence
```

Summaries orient the agent; current code and live evidence establish truth.

## Canonical evidence hierarchy

1. Authorized, actually-inspected live-system evidence
2. Current repository code/configuration at the target commit
3. Current Git/branch/PR state
4. Active `docs/features/<feature>.md`
5. `docs/PROJECT_BRIEF.md`
6. `docs/SYSTEM_MAP.md` and `docs/RUNBOOK.md`
7. accepted ADRs / `docs/DECISIONS.md`
8. `docs/AI_DEV_LOG.md`
9. project/chat memory
10. historical plans and assessments

An explicit new human decision supersedes an older one, but durable docs must then be updated.

## Evidence labels

Use where a distinction matters:

- `CODE`: verified from current repository implementation
- `LIVE`: verified against a live environment
- `CI`: verified by CI
- `TEST`: verified/reproduced in a local or test environment
- `HUMAN`: explicit owner decision
- `PROPOSAL`: suggested but not approved
- `UNKNOWN`: evidence unavailable

Never silently promote CODE/TEST/PROPOSAL into LIVE.

## Required steady-state files

- `BOLT_BOOTSTRAP.md`: stable operating rules; no volatile branch SHAs.
- `docs/PROJECT_BRIEF.md`: single fast startup briefing: DONE / IN PROGRESS / NEXT / BLOCKED / risks / environment truth.
- `docs/CONTEXT_INDEX.yaml`: task router plus documentation change-impact rules.
- `docs/SYSTEM_MAP.md`: operational architecture derived from actual code.
- `docs/RUNBOOK.md`: local/CI/deployment/AWS/logs/connectors/operations.
- `docs/DECISIONS.md`: compact decision index.
- `docs/adr/*.md`: rationale for significant accepted decisions.
- `docs/features/<feature>.md`: feature working memory, verification and exact continuation point.
- `docs/AI_DEV_LOG.md`: chronological milestone history; not mandatory full startup reading.

Do not create a global ACTIVE_TASKS file. Current task state belongs to feature branch + feature doc; PROJECT_BRIEF only summarizes it.

## Startup procedure for significant tasks

1. Inspect repository/remote refs and relevant feature branches.
2. Read `BOLT_BOOTSTRAP.md` and `docs/PROJECT_BRIEF.md`.
3. Check context freshness against recent commits.
4. Use `docs/CONTEXT_INDEX.yaml` to load only relevant deep context.
5. Inspect actual code/schema/tests/CI and live evidence when the task requires it.
6. Before major edits, establish:
   - affected systems
   - existing control flow
   - existing data flow
   - source of truth
   - persistence/API/auth boundaries
   - likely files
   - existing tests
   - live evidence needed
   - risks
7. Establish a task contract: goal, success criteria, allowed scope, excluded scope, branch/base, approval boundaries, required verification.
8. Execute autonomously inside that contract.
9. Checkpoint at meaningful milestones.
10. Update global context only when global state actually changes.
11. Hand off branch/commit/status/tests/live evidence/risks/next exact action.

## Autonomy

After task direction is approved, agents may without repeated approval:

- inspect repo/history/docs
- use available read-only logs/systems
- create task/feature branches
- edit code/tests within scope
- run local/test services and checks
- update feature/context docs
- commit/push authorized feature branches
- prepare draft review handoffs

Ask the human only for:

- genuinely ambiguous user-facing product behavior
- conflicting explicit human decisions
- material scope expansion
- destructive data migration/backfill
- live production mutation
- AWS/hosting/DNS/security-policy mutation
- secrets/credential decisions
- merge to protected integration/main
- production release
- irreversible destructive operations

Do not ask merely because the implementation spans multiple files.

## Definition of Done

A feature may be marked READY FOR HUMAN REVIEW only when requested behavior is implemented, relevant checks pass, affected existing flows are checked, cross-stack contracts are consistent, migrations/config/API impacts are documented, no checks were weakened, the feature doc is current, durable commits exist, limitations are explicit, and required live evidence is either verified or clearly UNKNOWN.

READY FOR HUMAN REVIEW is not MERGED. MERGED is not RELEASED.

## Anti-slop rules

- Do not code from summaries alone.
- Reuse existing service/store/contract ownership; avoid duplicate implementations.
- Do not redesign unrelated architecture while fixing a feature.
- Avoid speculative abstractions and dependencies.
- Test observable behavior across the real boundary that changed.
- Mock-only tests do not prove full integration.
- Repo deploy config does not prove live production state.
- Do not record assumptions as facts.
- Keep context sources few and canonical.
- Understand existing control/data flow before major changes.
- Preserve historical/audit data unless explicitly approved.

## Context freshness

At substantial task start, compare the brief's verification commit with recent relevant commits. Refresh stale sections automatically before relying on them.

Implement `scripts/check_context_freshness.py` to validate context metadata and pointers. Integrate it into CI as warning-only initially; make blocking only after the workflow proves stable.

Scheduled 15th/30th project-instruction review is a safety net, not the main freshness mechanism.

## Existing-doc migration

- `docs/CURRENT_STATE.md`: migrate current content into PROJECT_BRIEF, then reduce to compatibility pointer.
- `docs/AI_DEV_LOG.md`: retain as history; read only relevant/latest entries.
- `docs/CLOUD_DEV_HANDOFF.md`: simplify around bootstrap/brief/router while preserving lost-task recovery.
- `docs/agent-workflow.md`: retain as deep workflow guidance, not mandatory for trivial tasks.
- `docs/ARCHITECTURE.md`: audit against code; mark historical/design reference where stale. SYSTEM_MAP becomes operational architecture source.
- dated assessment/next-step files: preserve as historical evidence/planning and route only when relevant.

## Cold-start validation

Before this setup is considered complete, verify that a fresh agent can accurately answer with a small context load:

1. What is Bolt?
2. What is implemented now?
3. What is in progress?
4. What comes next?
5. What is blocked/unknown?
6. What is the frontend/backend/API/data architecture?
7. Where should an API bug be investigated?
8. Where should a production backend outage be investigated?
9. Which actions require human approval?
10. How is a disappeared cloud task resumed?
11. Which document owns active feature state?
12. What source wins when docs conflict with code/live evidence?

Then inspect one real feature and identify its actual code path.

## Permanent Project instructions

Use this compact bootstrap in ChatGPT Project Instructions:

```text
Bolt V1 AI dev control room. At any substantial Bolt task start, inspect GitHub and read BOLT_BOOTSTRAP.md + docs/PROJECT_BRIEF.md first; use docs/CONTEXT_INDEX.yaml to load only relevant SYSTEM_MAP, RUNBOOK, decisions/ADRs, feature docs, code, APIs, tests, CI and live logs/infra when authorized. Repo/live evidence overrides summaries/memory. Continue existing branches/work; avoid duplicate implementations. Use feature branches; no merge/release/destructive prod or infra mutation without approval. Understand existing control/data flow before major edits, then work autonomously within scope. Checkpoint meaningful milestones and refresh feature/global context when state changes. Human decisions override older assumptions; detect stale context at task start and review instructions on 15th/30th.
```

The long setup document is implementation/history only. Normal future tasks start at BOLT_BOOTSTRAP + PROJECT_BRIEF.
