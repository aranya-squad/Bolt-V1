# [Project] — Implementation Plan
**Date:** YYYY-MM-DD | **Audit pass:** YYYY-MM-DD
**Prerequisite:** Read `docs/gap-analysis.md` first.
**Codebase root:** `/path/to/project`

> **Audit corrections applied.** Every ticket has been verified against actual file contents. `[STALE - CORRECTED]` marks items wrong in the original plan. `[NEEDS PRODUCT INPUT]` marks unresolved decisions. `[UNVERIFIED — needs manual check]` marks claims that could not be traced to a file:line.

---

## Audit Correction Summary

| # | Original Plan Claim | Actual State | Fix Applied |
|---|---|---|---|
| 1 | | | |

---

## 1. Phased Rollout

### Phase 1 — [Name]
**Goals:** [One sentence.]

**Screens / Components:** [List]

**Acceptance Criteria:**
- [Criterion]

**Estimated Duration:** X–Y days

---

### Phase 2 — [Name]
**Goals:** [One sentence.]

**Screens / Components:** [List]

**Acceptance Criteria:**
- [Criterion]

**Estimated Duration:** X–Y days

---

## 2. Workstream Breakdown

```
[W1] [Workstream name]
     ├── [Task] (ticket ID)
     └── [Task] (ticket ID)

[W2] [Workstream name]
     ├── [Task]
     └── [Task]
```

---

## 3. Per-Item Tickets

### WAVE 1 — [Name]

---

**W1-T01 — [Ticket title]**

| Field | Value |
|---|---|
| Modify | `path/to/file.tsx` — description of change |
| Create | `path/to/new/file.tsx` |
| Reuses | `ExistingComponent.tsx` |
| Complexity | S / M / L |
| Backend | Yes / No |
| Blocks | W1-T02 |
| **Acceptance Check** | `grep -r "old-pattern" src/` returns zero results |

DoD:
- [ ] [Verifiable condition]
- [ ] [Verifiable condition]

---

**W1-T02 — [Ticket title]**

| Field | Value |
|---|---|
| Modify | `path/to/file.tsx` |
| Complexity | S / M / L |
| Backend | Yes / No |
| **Acceptance Check** | [Single command or manual step that fails if ticket is incomplete] |

DoD:
- [ ] [Verifiable condition]

---

### WAVE 2 — [Name]

---

**W2-T01 — [Ticket title]**

| Field | Value |
|---|---|
| Create | `path/to/file.tsx` |
| Complexity | S / M / L |
| Backend | Yes / No |
| **Acceptance Check** | [Command or step] |

DoD:
- [ ] [Verifiable condition]

---

## 4. Open Decisions

| # | Decision | Options | Owner | Blocking? |
|---|---|---|---|---|
| D1 | [Decision needed] | A / B | [Name] | Yes / No |

---

## 5. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| [Risk] | H / M / L | H / M / L | [Mitigation] |

---

## 6. Wave Completion Log

Fill this in after each wave finishes. Before starting the next wave, paste the wave's diff and ask Opus: *"Review Wave N diff against plan tickets W{N}-*. Flag any ticket merged without meeting its DoD."*

| Wave | Tickets Completed | Drift Notes | Opus Review |
|---|---|---|---|
| W1 | | | PASS / PASS-WITH-NOTES / FAIL |
| W2 | | | PASS / PASS-WITH-NOTES / FAIL |
| W3 | | | PASS / PASS-WITH-NOTES / FAIL |
| W4 | | | PASS / PASS-WITH-NOTES / FAIL |
| W5 | | | PASS / PASS-WITH-NOTES / FAIL |

**Drift note format:** `[ticket-id] [what changed] — [reason]`
Example: `W2-T03 split into T03a/T03b — accordion scope larger than estimated`

**If Opus flags FAIL:** do not start the next wave. Resolve the failing ticket or explicitly defer it with `// TODO(debt): [reason]` in code and a note in this log.
