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
