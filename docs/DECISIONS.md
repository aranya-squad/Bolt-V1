# Bolt V1 — approved development governance
- [Human-owned integration/release](adr/0003-human-integration-production-boundary.md): no automatic merges, deployments or production changes.
- [Mandatory three-role planning](adr/0004-work-feature-planning-gate.md): owner/project/account-scoped PM, CTO and Head QA frozen-scope approval before new features.
- [Prospective AI-SDLC](adr/0005-bolt-ai-sdlc-v1.md): G0–G5, risk-based specialists, bounded agent work, evidence-backed handoffs; never retrofit in-flight features automatically.
- Compact coding-agent packets and exact-SHA GitHub CI verifier are in `docs/AGENT_CONTEXT_PACKETS.md` and `scripts/verify_ci_evidence.py`.
Architectural or product decisions must be verified against actual current code/owner input. Historical recovered documentation is not live evidence.
