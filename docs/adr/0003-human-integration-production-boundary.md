# Human integration and live production boundary

Status: ACCEPTED
Recorded: 2026-10-01

## Context

The owner wants autonomous scoped implementation with few interruptions while retaining release and production control.

## Decision

Agents may inspect source/authorized read-only systems, edit/test approved scope, publish authorized feature branches and prepare review handoffs. Human approval is required for merge/release, live production or AWS/hosting/DNS/security mutation, secrets decisions, destructive data/backfill, irreversible operations, conflicting human decisions or material scope expansion.

## Why

Routine implementation can proceed without repeated file-count approvals. Review and operational approval remain concrete gates after evidence is assembled.

## Alternatives

Approval on every file interrupts progress. Automatic integration/deploy exceeds authorization. Treating source deployment config as live evidence hides operational risk.

## Consequences

Use IN PROGRESS/BLOCKED/READY FOR HUMAN REVIEW/MERGED/RELEASED accurately. Preserve other work, never force-push without authorization, and keep tests isolated from production. No merge/deploy occurs during this setup.

## Evidence / human approval

HUMAN: current task and handoff sections 8–9; AGENTS shared boundaries. Existing approved policy is recorded, not expanded.

## Supersession

None. New explicit human decisions require a linked replacement.
