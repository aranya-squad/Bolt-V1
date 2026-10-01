# Durable decisions

A compact index of accepted decisions, not an active task/status tracker.
New explicit human decisions supersede old ones; record evidence and link the
replacement ADR. Code/live observations establish what exists; a divergence from
an accepted policy needs investigation, not silent policy replacement.

| ADR | Decision | Evidence/status |
|---|---|---|
| [0001](adr/0001-git-context-ownership.md) | Git checkpoints + per-feature handoff; compact startup; operational map separate from historical design | Accepted HUMAN workflow |
| [0002](adr/0002-learning-persistence-recovery.md) | Existing progress service owns durable writes; versioned server-authoritative same-tab recovery | Accepted HUMAN contract + CODE/recorded TEST |
| [0003](adr/0003-human-integration-production-boundary.md) | Autonomous authorized branch work; human merge/release/live mutation | Accepted HUMAN boundary |

Authoring/status/supersession convention: `docs/adr/README.md`.
