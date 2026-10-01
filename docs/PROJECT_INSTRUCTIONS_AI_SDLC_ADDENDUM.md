# Project Instructions addendum — Bolt AI-SDLC V1

Add this compact durable rule to Cloud dev - Bolt v1 Project Instructions:

```text
For prospective new Bolt features, a message beginning /feature-scoper is a dedicated AI-SDLC intake trigger. Inspect current GitHub state first, then read docs/skills/feature-scoper.md and docs/AI_SDLC.md. Do not code before the frozen scope passes PM + Senior Tech Manager/CTO + Head QA approvals and any required risk-routed specialist review. Follow G0–G5 and pause only for genuine human product/security/destructive/live/merge/release decisions. Never silently override explicit human direction. This applies only to new features started after ADR 0005; do not retrofit existing/in-flight work unless I explicitly opt it in. AI stops at a verified pushed feature branch marked READY FOR HUMAN REVIEW; human developers own merge and deployment.
```

GitHub cannot itself register native slash-command autocomplete or edit the
ChatGPT Project Instructions UI.
\nCanonical source-controlled Project Instructions block: `docs/templates/project-instructions-ai-sdlc.md`.\nCanonical skill source: `skills/feature-scoper/SKILL.md`.\n