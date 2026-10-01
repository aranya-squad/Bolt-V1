# Versioned learning persistence and recovery ownership

Status: ACCEPTED
Recorded: 2026-10-01

## Context

Uncertain answer acknowledgements and retries can lose work or duplicate credit. Existing finalized history is audit evidence; replica reads can be stale.

## Decision

Durable attempt/progress/XP writes stay in backend/apps/progress/services.py. V2 uses immutable identities, atomic receipts and finalize manifests with primary-consistent reads. The server is authoritative; client recovery is bounded same-tab sessionStorage. New scoring uses a version marker; historical finalized results are preserved.

## Why

Existing transactions, constraints and stores give one ownership path without new tables/services. Validated receipts prove accepted work; HTTP success alone is insufficient.

## Alternatives

A second writer/store duplicates policy. Cross-device recovery requires additional scope. Historical backfill changes audit meaning. Client timing does not prove tournament fairness.

## Consequences

Preserve backend-first compatibility rollout and explicit conflict handling. Test persistence boundaries. Tournament timing/concurrency and auth race hardening remain separate work; closing a tab is outside durability guarantees.

## Evidence / human approval

HUMAN: approved contract in docs/features/answer-recovery.md. CODE: reviewed 6d32de6a94c2afb92c5bc7a4c72dffe73737d2b1. TEST: recorded feature verification; not new CI/LIVE evidence or a new review approval.

## Supersession

None. New explicit human decisions require a linked replacement.
