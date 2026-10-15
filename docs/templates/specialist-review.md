# Specialist review template

Use only when the AI-SDLC risk router requires this specialist. Review the exact
frozen scope digest used by PM/CTO/Head QA.

Record feature, specialist role, reviewer/agent ID, scope path/version/SHA-256,
source/contract evidence and timestamp. For each finding record severity
(BLOCKER/MUST-FIX/ADVISORY), evidence, impact, resolution and whether it changes
behavior/contract/acceptance. Material scope change returns to G1.

Decision is APPROVED only with no required blocker in this specialist domain;
otherwise BLOCKED with exact unresolved items. Approval is not test/CI/merge/
deployment/production evidence.

## Decision

Record exactly one:
- `APPROVED` — reviewed the exact frozen scope digest; no blocking finding remains.
- `BLOCKED` — affected implementation may not start/continue.
- `NOT_REQUIRED` — valid only when risk routing marks this specialist optional.

Record the exact scope SHA-256 beside APPROVED/BLOCKED. A material scope digest
change makes the decision stale and requires review again when the domain remains
required.
