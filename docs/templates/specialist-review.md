# AI-SDLC specialist review

Record feature, frozen scope version/path/SHA-256, specialist role, reviewer identifier, timestamp and source/contract areas inspected.

## Routing reason

Why this specialist is REQUIRED or NOT REQUIRED. Risk routing must be concrete, not generic ceremony.

## Findings

For each finding record severity, evidence, affected acceptance/contract, and one of: BLOCKING, REQUIRED-FIX, ADVISORY, RESOLVED.

## Decision

Record exactly one:
- APPROVED — reviewed the exact frozen scope digest and no blocking finding remains.
- BLOCKED — implementation affecting this area may not start/continue.
- NOT_REQUIRED — valid only when routing says this role is optional.

If the scope digest changes materially, this decision is stale.
