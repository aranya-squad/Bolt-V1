---
status: READY FOR HUMAN REVIEW
branch: chore/ai-context-system-v2
base_commit: ec74cf3882b8a2dafc9f9c1e0d70e24c496364d0
current_commit: 8028d0c9f61c632a09fb5af384de6ae351c734b2
last_checkpoint: 2026-10-01
owner: ai
---

# Bolt AI-SDLC V1 workflow setup

Adds prospective, non-breaking AI-SDLC + repo-backed `/feature-scoper` on top of
the existing three-role gate. No frontend/backend runtime, schema, dependency,
deployment or live-state change.

Implemented: ADR 0005; G0–G5 workflow; risk-based specialists; frozen scope + JSON
plan; standard-library gate checker + 8 focused regression cases; bootstrap/router/
workflow/decision/brief integration; human merge/deploy boundary preserved.

Grandfathered: teacher dashboard/roster correctness, current batch-level assignment,
and generally any completed/in-progress/already-scoped work unless owner opts in.

Verification: focused checker suite passed 8 tests in isolated drafting validation.
Existing CI YAML intentionally unchanged; its advisory scripts unittest discovery
will find the new test. Backend/frontend source untouched. Hosted CI/LIVE not
claimed.

Platform limitation: GitHub can persist the workflow but cannot register native
ChatGPT slash autocomplete or edit Project Instructions. Use
`docs/PROJECT_INSTRUCTIONS_AI_SDLC_ADDENDUM.md` so future chats route
`/feature-scoper`; "run feature-scoper" also works.

Next exact action: human-review this branch; add the Project Instructions routing
snippet; use feature-scoper for the next new feature. No merge/deploy here.
