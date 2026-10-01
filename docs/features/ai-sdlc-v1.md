---
status: READY FOR HUMAN REVIEW
branch: chore/ai-context-system-v2
base_commit: ec74cf3882b8a2dafc9f9c1e0d70e24c496364d0
current_commit: c75c1f7b4e67bb71c668c4370a59918aef045ab5
last_checkpoint: 2026-10-01
owner: ai
---

# Bolt AI-SDLC V1 workflow setup

Adds prospective, non-breaking AI-SDLC + repo-backed `/feature-scoper` on top of
the existing three-role gate. No frontend/backend runtime, schema, dependency,
deployment or live-state change.

Implemented: ADR 0005; G0–G5 workflow; risk-based specialists; frozen scope + JSON
plan; standard-library G1/G2/G4/G5 gate checker + 15 focused regression cases; bootstrap/router/
workflow/decision/brief integration; human merge/deploy boundary preserved.

Grandfathered: teacher dashboard/roster correctness, current batch-level assignment,
and generally any completed/in-progress/already-scoped work unless owner opts in.

Verification: focused checker suite passed 15 tests in isolated validation and Python compilation passed.
Existing CI YAML intentionally unchanged; its advisory scripts unittest discovery
will find the new test. Backend/frontend source untouched. Hosted CI/LIVE not
claimed.

Platform limitation: GitHub can persist the workflow but cannot itself register\nnative ChatGPT slash autocomplete, install/enable a workspace skill, or edit Project\nInstructions. Canonical sources are `skills/feature-scoper/SKILL.md` and\n`docs/templates/project-instructions-ai-sdlc.md`; compatibility addendum/mirror\nfiles remain available.

## Next Exact Action\n\nHuman-review this branch; add the Project Instructions routing snippet and, if the\nChatGPT UI requires it, install/enable the feature-scoper skill. Use feature-scoper\nfor the next new feature. No merge/deploy here.
