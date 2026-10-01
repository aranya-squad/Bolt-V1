# Prospective Bolt AI-SDLC V1

Status: ACCEPTED
Recorded: 2026-10-01

## Context

The owner wants raw feature ideas in this Project to move through a repeatable lightweight SDLC: source-backed scoping, PM/CTO/QA challenge, risk-triggered specialist review, frozen success criteria, decomposed execution, bounded lower-cost coding workers, independent review/repair, deterministic gate checks, feature-branch push, then a hard stop for human merge/release.

ADR 0004 already requires PM/CTO/Head-QA signoff before new feature coding in this environment.

## Decision

Adopt `docs/AI_SDLC.md` prospectively for feature ideas initiated after this decision. Existing work already in progress at adoption, including teacher dashboard/roster correctness and existing batch-level assignment, remains on its current ADR 0004 path unless the owner explicitly opts it in.

Covered new features use a frozen `<feature>.scope.md`, machine-readable `<feature>.plan.json`, mandatory PM/CTO/Head-QA approval of the same SHA-256, conditional specialist review, bounded worker tasks, independent integrated review, executed QA and deterministic G0/G1/G2/G4/G5 validation.

AI may inspect, plan, implement, test, repair, commit and push authorized feature branches within signed scope. It stops at READY FOR HUMAN REVIEW. Human developers retain merge, release, deployment, production mutation and unresolved material product/security decisions.

Human direction is authoritative. Agents may challenge it with evidence but may not silently override it.

## Skill entry point

The version-controlled workflow source is `skills/feature-scoper/SKILL.md`. Explicit `@feature-scoper` should use that skill when installed. The Project trigger `/feature-scoper` means the same workflow even on clients without a native custom slash-command surface.

Installing/enabling a ChatGPT skill is a user/workspace action; repository source control does not itself enable it in the UI.

## Why

This adds requirements-to-tests traceability while preserving Bolt's small-team constraints and current human integration boundary.

## Alternatives

Large enterprise orchestration was rejected as too heavy. One agent scoping/building/self-approving was rejected for weak independent challenge. Mandatory specialists on every feature were rejected as bureaucracy. Retroactive migration was rejected because current work must not break.

## Consequences

New covered feature ideas gain stronger planning evidence before code. Existing runtime/application code, CI jobs, current feature scopes, merge order and deployment behavior are unchanged.

## Evidence / human approval

HUMAN: owner requested on 2026-10-01 that Bolt AI-SDLC V1 be implemented without breaking current work, apply from the next feature development onward, and expose a dedicated feature-scoper skill that pauses for human decisions/approval/direction and does not override them unless explicitly instructed.

## Supersession

Extends ADR 0004 and ADR 0003 without weakening their boundaries.
