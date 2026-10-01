# Prospective Bolt AI-SDLC V1 and /feature-scoper intake

Status: ACCEPTED
Recorded: 2026-10-01

## Context

The owner wants new feature ideas to pass through source-backed specification,
product/technical/QA challenge, conditional specialist review, frozen success
criteria, structured decomposition, bounded lower-cost coding workers,
independent review/repair and verification, ending at a pushed feature branch.
Current/in-flight work must not be broken or restarted.

## Decision

Adopt Bolt AI-SDLC V1 prospectively for new features started after this ADR's
activation commit in the owner's Cloud dev - Bolt v1 Project/account Work sessions.
The repo-backed `/feature-scoper` routes raw ideas through G0–G5 in
`docs/AI_SDLC.md`. ADR 0004 PM+CTO+Head QA approval remains mandatory as G1;
specialists are risk-routed. Freeze exact scope bytes, use standard-library gate
checks, Wave → Category → User Story → Task planning, normally <=2 writers,
independent integrated-code review and QA, and stop at pushed READY FOR HUMAN
REVIEW. Human developers own merge and deployment.

The rollout is not retroactive. Completed, in-progress or already-being-scoped
features retain their current workflow unless explicitly opted in. Teacher
dashboard/roster-correctness and current batch-level-assignment are grandfathered.

## Why

This reduces ambiguity/rework without enterprise orchestration infrastructure.
Deterministic gates expose approval/traceability failures without a new service or
dependency; conditional specialists keep simple work lightweight.

## Consequences

New features create tracker + frozen scope + JSON plan. Material behavior/contract/
acceptance changes require new digest/reapproval. Existing CI/application runtime
is unchanged. The checker validates records, not truth of claimed test/reviewer
evidence. ADR 0003 human integration/release boundaries remain.

## Evidence / human approval

HUMAN: owner message 2026-10-01 requests this non-breaking next-feature workflow
and a `/feature-scoper`-style intake that pauses for required human input/approval/
direction and does not override owner direction unless specified.

## Supersession

Extends ADRs 0003/0004 prospectively; does not invalidate existing feature status.
