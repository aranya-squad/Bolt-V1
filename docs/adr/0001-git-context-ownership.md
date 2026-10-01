# Git owns continuity; selective context owns orientation

Status: ACCEPTED
Recorded: 2026-10-01

## Context

Cloud threads/workspaces can disappear, while duplicate current-state files drift.

## Decision

Keep durable engineering state in Git commits and the owning feature doc. Start with BOLT_BOOTSTRAP, PROJECT_BRIEF and CONTEXT_INDEX. SYSTEM_MAP describes verified operational ownership; ARCHITECTURE preserves historical design. CURRENT_STATE is a compatibility pointer.

## Why

A compact startup avoids repeated large history loads; source verification avoids implementing stale plans. One active owner per feature avoids conflicting task lists.

## Alternatives

Chat-only state loses continuity; mandatory full history wastes context; a global ACTIVE_TASKS file duplicates feature state.

## Consequences

Record milestone checks/next actions and publish authorized branches. Update the brief only for global changes. Historical plans remain available; structural freshness tooling cannot certify semantic truth.

## Evidence / human approval

HUMAN: instructions in docs/FRESH_CHAT_AI_CONTEXT_V2_HANDOFF.md sections 2, 6 and 10. CODE: existing context spine and branch lineage; no new product decision is inferred.

## Supersession

None. New explicit human decisions require a linked replacement.
