# Implementation Plan — 28-Jun Owner/Designer Feedback

**Authored:** 2026-06-29
**Source:** `docs/gap-analysis-feedback-2026-06-28.md`
**Method:** reviewed under five hats — Product Head, Sr. Engineering Manager, DevOps Head, QA Head,
CTO — using the product-refinement spec discipline (role-named stories, one acceptance criterion per
line, RBAC matrix sync, module-boundary contracts, Test-Mode gates, compliance flags).

> **Live-role reality:** GUARDIAN is deprecated in shipped code (`/auth/login` → 410 for guardian,
> `/auth/register` → 410). The active roles are **STUDENT, TEACHER, ADMIN**. This plan uses that
> reality; see CTO §F1 for the matrix reconciliation item.

---

## A. Decision gate (closed 2026-06-30)

All decisions recorded. Wave B is unblocked.

| ID | Decision | Recorded |
|---|---|---|
| D-1 | **Hide XP/streak everywhere** — Hub, FeedbackToast, ClassworkPage, MissionReportPage, VictoryPage. Option (a). | 2026-06-30 |
| D-1b | **Frontend-hide-only.** Backend `XPEvent` ledger, `finalize_session` award path, and serializers are untouched. No migration. Reversible by un-hiding. | 2026-06-30 |
| D-2 | **Accuracy + Personal Best** are the replacement student signals on Hub and VictoryPage. Both are already built (Wave 3j). | 2026-06-30 |
| D-3 | **New TEACHER build.** PDF 3 img 3 ("Level 12 – Path of Conquest – Class Dashboard Redesign") is a teacher-facing view: for a given level, show all classes assigned to that teacher with per-topic homework/classwork completion status. This is NOT `BatchDetailPage` (student roster in one class). It is a new per-level teacher dashboard. | 2026-06-30 |
| D-4 | **Fresh minimal landing page.** No legacy site recreation. | 2026-06-30 |
| D-5 | Flash cards UX: (i) card visible for `flashSpeedMs` then auto-advances ✅; (ii) student enters answer **during** display (input visible while card shows); (iii) no-answer on auto-advance = **skipped**; (iv) **one input field per session** (not per card — student types continuously, new input cleared on each advance). | 2026-06-30 |
| D-6 | Recommended bounds adopted. Multiplicand: 1–4 digits (row 1). Multiplier: 1–2 digits (row 2). Math meaning confirmed: row 1 = multiplicand digits, row 2 = multiplier digits (e.g. 3×2 = 3-digit × 2-digit number). Reference: matiks and standard abacus competition curricula use these same bounds — higher levels rarely exceed 4×2. Server validates bounds; out-of-range → 400. | 2026-06-30 |
| D-7 | (i) **ADMIN-only** import; (ii) **per-class** (each XLSX sheet = one class at one level, named `L{n} C{n}`); (iii) Source: `BOLT ALL LEVELS DATASET.xlsx` (70 class sheets + 1 Curriculum sheet, 7 levels × 10 classes). Schema per sheet: `row_index \| topic_name \| question \| operator \| answer`. Multi-row questions are comma-separated operands (e.g. `"24,16,-20"`). **Data quality note:** L1 C1 has 11 cells with Excel date serials in the question column — skip/reject those rows on import with a logged warning; all other sheets are clean; (iv) **replace existing** questions for the given level+class on re-import (idempotent). | 2026-06-30 |

**Rule:** every "TBD" above has an owner and a date. None ship as TBD.

---

## B. Product Head — epics, stories, scope

Six epics, mapped from the gap analysis. Each story names a role, entry point, and out-of-scope.
Acceptance lives in the per-ticket specs (§C) and QA matrix (§E).

### E1 — Public landing + portal chooser *(GAP)*
- **Role:** unauthenticated.
- **Story:** As an unauthenticated visitor, I land on a marketing home and can choose Student or Teacher, which routes me to the matching login.
- **In scope:** landing route `/`; portal-chooser screen; deep-links to `/login?role=student|teacher`.
- **Out of scope:** any change to auth logic, signup fields, or JWT (all shipped). No new backend.
- **Note:** login/signup forms already exist (Wave 2) — this is presentation + routing only.

### E2 — Home/Hub de-gamification + card images *(CONFLICT + PARTIAL)*
- **Role:** STUDENT.
- **Story:** As a student on the Hub, I see my progress without XP or streaks, with imagery on the Learn and Practice cards.
- **In scope:** remove XP tile, streak tile, and `XpProgressBar` from Hub (gated by D-1); keep Personal Best + Levels + Current Level; deliver the two card image assets.
- **Out of scope:** deleting the `XPEvent` ledger (see SrEM §C-E2 — hide, don't drop). No backend schema change.
- **Compliance flag:** No (display-only; progress data untouched).

### E3 — Learn screen visual conformance + class dashboard *(COVERED/PARTIAL)*
- **Role:** STUDENT (level grid); TEACHER (class dashboard, pending D-3).
- **Story:** As a student, my Path-of-Conquest level grid matches the reference; (pending D-3) as a teacher I see the per-class topic/homework dashboard.
- **In scope:** visual pass on `PathOfConquestPage`/`LevelGridCard`; class-dashboard only if D-3 says new build.
- **Out of scope:** level/curriculum data model changes (deferred to E4).

### E4 — Question bank CSV import *(GAP)*
- **Role:** ADMIN or TEACHER (pending D-7).
- **Story:** As an admin, I import Sankeerth's CSV so questions populate the curriculum/practice pools.
- **In scope:** CSV schema validation; import endpoint; idempotent re-import.
- **Out of scope:** authoring UI; per-question editing.
- **Compliance flag:** No (no PII) — but content-integrity validation required.

### E5 — Practice/Training Arena rework *(largest; mostly GAP)*
- **Role:** STUDENT.
- **Stories (one per ticket, see §C):** side-by-side config; button config (not sliders); flash cards add/sub-only and one-by-one timed; mul/div per-row digits; row-style question UI; reattempt-on-wrong + skip; results report card; XP removed from questions + results.
- **Out of scope:** classwork session flow (separate module path — but verify MissionReport compatibility, §D); leaderboards.
- **Session-flow + Test-Mode gates:** mandatory — see §D.

### E6 — Teacher Dashboard + Join Class *(COVERED — no build)*
- Shipped in Wave 3 (`TeacherDashboardPage`, `CreateBatchModal`, `BatchDetailPage`, `JoinClassPage`, `POST classes/join/`). Action: **visual alignment pass only**, if any. Feedback explicitly allows "simpler."

---

## C. Sr. Engineering Manager — decomposition, module boundaries, sequencing

### Module impact map (cross-boundary reads go through API contracts, never shared state)

| Epic | Frontend slice | Backend module(s) | New cross-module endpoint? |
|---|---|---|---|
| E1 | `features/landing` (new), `features/auth` | none | no |
| E2 | `features/hub` | `users/stats` (stop surfacing xp/streak) | no |
| E3 | `features/learn` | `courses` (+ `classroom` if D-3=teacher) | only if class dashboard → existing roster endpoint |
| E4 | admin/teacher tool | `courses` (question store) | import endpoint in `courses` |
| E5 | `features/practice` | `exercises` (config + gen), `progress` (verdict, report) | report card uses existing session-report endpoint |

**Boundary rule applied:** the practice results report card reads from the **existing session-report
endpoint** (`SessionReportView`, already feeding `MissionReportPage`'s `AttemptsTable`) — the frontend
must not join `exercises` + `progress` itself.

### E2 — XP/streak removal (frontend-hide-only; D-1b)
- `XPEvent` is an **append-only ledger**; `total_xp`/`streak_days` are computed in `apps/users/stats.py`. **Backend is untouched** — no migration, no serializer change, no award-path change. The ledger keeps accruing. This is the simplest reversible path (un-hide to restore).
- **Complete frontend surface list** (verified by grep — all must be covered or XP leaks somewhere):
  - `HubPage` — Total XP tile, Day Streak tile, `XpProgressBar`.
  - `VictoryPage` — `XpProgressBar` (E5-T8).
  - `FeedbackToast` — `xpDelta` prop. **Shared by `InArenaPage` AND `ClassworkPage`** — editing it touches both flows; regression-test classwork (see §E).
  - `ClassworkPage` — XP references (per D-1 scope).
  - `MissionReportPage` — XP references (per D-1 scope).
  - `useXpProgress` query + `XpProgressBar.tsx` component — leave the files (no other consumer once unmounted) but `// ponytail:` mark them dead-until-unhidden; do not delete (reversibility, and avoids touching the query client).
- **Decision dependency:** the classwork surfaces (`ClassworkPage`, `MissionReportPage`) are only in scope if **D-1 = (a) hide everywhere**. If D-1 = (b), explicitly leave them and note the known inconsistency in the ticket.
- Removed-import hygiene: each page edit must drop now-unused imports (`useXpProgress`, `XpProgressBar`) per CLAUDE.md surgical-change rule.
- Keep the Personal Best (3j) and Levels/Current-Level tiles — they are the intended replacement signal (D-2).

### E5 — practice rework ticket list (intra-epic order matters)
| Ticket | Scope | Touches | Order | Notes |
|---|---|---|---|---|
| E5-T1 | Config layout side-by-side; **must collapse to stacked at 375px** | `TrainingArenaPage` | 1 | merges with T2/T5 region — see merge-order note |
| E5-T2 | Replace `ConfigSlider` with button stepper (5.2 style) | new `ConfigStepper`, `TrainingArenaPage` | 1 | **Verify `ConfigSlider`/`Slider` have no other consumer before deleting** (grep showed `Slider.tsx`, `ConfigSlider.tsx`, `SegmentedToggle.tsx`); remove orphaned component only if unused elsewhere |
| E5-T3 | Flash cards: add/sub-only + one-by-one timed play (D-5) | `useArenaConfig`, `InArenaPage`, `exercises` gen | 3 (after D-5) | `flashSpeedMs` is currently **collected but unused in play** — net-new play branch in `InArenaPage` |
| E5-T4 | Mul/div per-row digits (5.3, D-6) | `useArenaConfig`, config UI, `exercises` question gen + start-session serializer | 3 (after D-6) | **backend + API contract change** — see contract note below |
| E5-T5 | Row-style question renderer (5.4) | new `RowProblemCanvas`, `InArenaPage` | 2 | replaces `ProblemCanvas` (`"{q} = ?"`); keep `ProblemCanvas` if classwork still uses it |
| E5-T6 | Reattempt-on-wrong + skip in arena (non-flash) | `InArenaPage`, bulk-submit payload | 2 | **server verdict logic already done** — see contract note |
| E5-T7 | Results report card on `VictoryPage` | `VictoryPage` only | 2 | **reuse confirmed** — `useSessionReport` is already called on Victory; render `report.attempts` + `report.question_verdicts` via the existing `AttemptsTable`. No backend work |
| E5-T8 | Remove XP from question + results UI | `FeedbackToast`, `VictoryPage` | folds into E2/D-1 | shared `FeedbackToast` → classwork regression risk |

**Verified API-contract notes (do not skip — these change estimates):**
- **E5-T7 is small.** `SessionReportView` (`exercises/views.py:492`) already groups attempts per
  `question_index` and emits `correct | wrong | fixed | skipped` for *any* `ArenaSession`. Victory
  already fetches it. The work is purely rendering the table + handling the **not-yet-finalized (400)**
  and **empty-attempts** states.
- **E5-T6 needs a sequencing contract, not new verdict logic.** Today `InArenaPage` buffers exactly
  one attempt per question (`{question_index, answer, elapsed_ms}`, no `attempt_number`) and advances
  on any submit. "Fixed" is impossible until the client sends **multiple attempts per `question_index`
  with incrementing `attempt_number`**, which the bulk-submit view + report grouping already consume.
  So E5-T6 = (i) on wrong, keep the same question and clear the verdict instead of advancing; (ii) push
  a new attempt with `attempt_number + 1`; (iii) advance only on correct or skip. No migration; `is_skip`
  already exists (Wave 2i).
- **E5-T4 contract:** define the new config fields (e.g. `digits_row1`, `digits_row2`) in the
  start-session request, give them **server-side defaults** so existing/other clients don't break, and
  **validate bounds server-side** (D-6). Question generation in `exercises` must honor them.
- **E5-T3 server constraint:** flash⇒add/sub must be **enforced on the backend** start-session view, not
  only hidden in the UI — a crafted request with `mode=FLASH_CARDS, operation=MUL` must be rejected or
  coerced. UI hiding alone is a validation gap.

**State-machine edge case (E5-T2/T3 + `useArenaConfig`):** switching `mode → FLASH_CARDS` while
`operation` is MUL/DIV must **coerce `operation` to a valid add/sub value** (e.g. `MIXED`), or the
config submits an invalid combo. `setMode` must reconcile dependent fields; add a unit check.

**Merge-order note:** E5-T1, E5-T2, E5-T5 all edit the same arena region (`TrainingArenaPage` /
`InArenaPage`). Land T1+T2 together (config screen) and T5+T6 together (play screen) to avoid serial
rebase churn; T7/T8 are isolated.

**Red-flag check (passed):** E5-T4 changes question generation **and** names its endpoint + validation.
E5-T6 touches verdicts **and** specifies Test-Mode behavior (§D). E5-T3 and E5-T4 are blocked on
D-5/D-6 rather than shipping with assumptions.

### Recommended wave cut
- **Wave A (no decisions blocked):** E1 (after D-4), E2 card images, E5-T1, E5-T2, E5-T5, E5-T7.
- **Wave B (decision-gated):** E2 XP/streak removal (D-1), E5-T3 (D-5), E5-T4 (D-6), E5-T6, E4 (D-7), E3 class dashboard (D-3).
- One logical change per PR. E5-T4 (backend gen) and E5-T6 (verdict logic) each ship with their own tests.

---

## D. Session-flow & Test-Mode gate (non-negotiable — applies to E5-T6, E5-T3)

Per the session-integrity rules, any ticket touching verdicts must state mode behavior. The arena
practice loop is `START_SESSION → [SUBMIT_ATTEMPT → verdict] → END_SESSION → VictoryPage`.

| Mode | Reattempt on wrong | "Fixed" verdict | Skip |
|---|---|---|---|
| Arena — Zen / Time Attack / The Lab | ✅ keep same question, allow retry (E5-T6) | ✅ first wrong → second correct = `fixed` | ✅ skip button (E5-T6) |
| Arena — **Flash Cards** | ❌ no retry per card | ❌ never `fixed` | ❌ no skip (timed auto-advance) |

- E5-T6 implements reattempt + skip **only for non-flash arena modes**. Flash cards keep no-retry/no-skip — do not regress.
- **Server verdict logic already exists** (`SessionReportView`): `fixed` = first attempt wrong, last attempt correct, grouped by `question_index`. The arena gap is purely client-side attempt sequencing (`attempt_number`), per §C E5-T6 contract note. No backend change for verdicts.
- `xp_delta` already 0 in arena verdicts; E5-T8 removes the XP UI, not the verdict path.
- `END_SESSION` must dispatch exactly once (existing `isFinalizingRef` guard) — verify no double-submit after adding reattempt; the guard `if (verdict) return` in `handleSubmit` must be re-examined since reattempt now *clears* the verdict to allow another submit on the same index.
- Verdict values stay `correct | wrong | fixed | skipped` — `skipped` schema already exists (`is_skip`, Wave 2i). Reuse it for arena skip; **no new migration** for skip.

**Reattempt edge cases (specify in E5-T6):**
- A wrong→retry **does not consume a new question** — stay on the same `question_index`; question count and the "Q n / N" progress are unchanged until the index resolves (correct or skip).
- **Time Attack:** reattempts are allowed but the session still ends when the timer hits 0 (existing timer-expiry → `handleFinalize`); an in-progress reattempt at expiry is finalized with whatever attempts were buffered.
- **Zen / The Lab (no timer):** unbounded reattempts are acceptable; END_SESSION only on last index resolved.
- **Skip mid-reattempt:** skipping after one or more wrong attempts records `is_skip=true` and advances; report shows `skipped` (skip takes precedence — matches `group[0].is_skip` rule).
- **Buffered-attempt flush:** the pending-attempts buffer must carry the full per-index attempt sequence; verify the bulk-flush retry path still sends them in `attempt_number` order after reattempts.

---

## E. QA Head — acceptance test matrix

### Standard (every E1–E5 ticket)
- [ ] Happy path at 1280px and 375px.
- [ ] Empty, loading, and error states render — no blank screen, no 500.
- [ ] Zero `console.error`/React warnings on the target screen.

### E1 — landing/portal
- [ ] Logged-in STUDENT hitting `/` → `/hub`; logged-in TEACHER hitting `/` → `/teacher` (role-aware, not hardcoded `/hub`).
- [ ] Unauthenticated `/` renders the landing **without** redirecting to `/login` (regression: `/` is currently inside `ProtectedRoute`).
- [ ] During auth hydration, `/` shows the skeleton, not a flash of the landing then a redirect.
- [ ] Portal chooser routes to the correct login with role preselected.
- [ ] Deep-link to a protected route while unauthenticated still redirects to `/login?next=` (not to the new landing).
- [ ] `/login` while already logged in still redirects by role (verify `PublicRoute` change didn't regress).

### E2 — Hub de-gamification
- [ ] No XP tile, streak tile, or XP bar rendered on Hub.
- [ ] Personal Best + Levels + Current Level still render with real values and the empty `—` state.
- [ ] Card images load lazily; missing-asset path degrades (no layout break — existing `onError`).
- [ ] STUDENT-only route still gates (TEACHER JWT → redirect, not blank).
- [ ] **Regression — `FeedbackToast` is shared:** classwork session feedback still renders correctly after `xpDelta` removal (no broken layout, no leftover XP label).
- [ ] **Regression — classwork:** if D-1 = hide-everywhere, `ClassworkPage` + `MissionReportPage` show no XP; if D-1 = practice-only, classwork XP intentionally remains (documented).
- [ ] No `console.error` from removed `useXpProgress`/`XpProgressBar` imports (orphan-import check).
- [ ] Backend `/auth/me` + stats payload unchanged (FE-hide-only — contract not broken for any other consumer).

### E5 — practice (session-flow sub-checklist)
- [ ] `verdict: 'correct'` on first correct.
- [ ] `verdict: 'wrong'` on first wrong — **same question stays**, retry allowed (non-flash).
- [ ] `verdict: 'fixed'` on second correct after wrong (non-flash).
- [ ] `verdict: 'skipped'` on skip (non-flash); skip button absent in Flash Cards.
- [ ] Flash Cards never produce `fixed`; card auto-advances on `flashSpeedMs` (D-5 behavior).
- [ ] Flash Cards only offer add/sub operations (mul/div hidden in flash mode).
- [ ] Mul/div per-row digit config respected by generated questions (E5-T4) within D-6 bounds.
- [ ] `END_SESSION` fires exactly once after reattempt added — no double submission.
- [ ] Wrong→retry does **not** advance the question index or the "Q n / N" counter.
- [ ] Buffered attempts flush in `attempt_number` order; report shows `fixed` for first-wrong-then-correct.
- [ ] Time Attack: timer expiry during a reattempt finalizes cleanly (no hang, single finalize).
- [ ] VictoryPage report card lists every question with its verdict; table scrolls within max height at 375px.
- [ ] VictoryPage handles **session-not-yet-finalized (400)** and **zero-attempts** without crashing.
- [ ] No XP shown on question feedback or VictoryPage.
- [ ] VictoryPage reads from the session report endpoint, not `location.state`.
- [ ] Config screen: side-by-side at 1280px collapses to stacked at 375px (no overflow/clipping).
- [ ] Button stepper enforces min/max bounds (cannot step below/above range); keyboard-accessible.
- [ ] Switching to Flash Cards with MUL/DIV selected coerces operation to add/sub (no invalid submit).
- [ ] Backend rejects/coerces `mode=FLASH_CARDS, operation=MUL` even if sent directly (not UI-gated only).
- [ ] Mul/div per-row digit config produces questions within D-6 bounds; out-of-bounds request → 400.

### E4 — CSV import (compliance/content-integrity)
- [ ] Malformed CSV rejected with row-level error, no partial import.
- [ ] Re-import is idempotent (no duplicate questions).
- [ ] Import action gated to the D-7 role; other roles → 403, no data leak.

### RBAC (E1, E4, any route change)
- [ ] STUDENT cannot reach TEACHER/ADMIN routes (STUDENT JWT test).
- [ ] New routes appear in the route→role table (§F) before dev.
- [ ] Backend permission class and frontend `ProtectedRoute` updated in the same PR.

---

## F. CTO — architecture risks, conflicts, go/no-go

### F1 — RBAC matrix reconciliation *(must-do, not optional)*
The product-refinement §3 matrix and the route table still list GUARDIAN as active; shipped code
returns 410 for guardian. **Action:** update the guidelines + route table to STUDENT/TEACHER/ADMIN,
mark guardian rows "removed (deprecated, plan v2 §1e)." Until reconciled, any RBAC ticket references a
phantom role — a spec defect.

### F2 — Direction reversal on gamification *(strategic)*
Plan v2 invested in XP (`XPEvent` ledger, `XpProgressBar`, Personal Best). The feedback strips it from
the student-visible surface. This is coherent **if** D-2 names the replacement signal (accuracy +
Personal Best). Recommendation: **frontend-hide-only (D-1b), backend untouched** — the ledger keeps
accruing, no migration, no API contract change, reversible by un-hiding. This is *simpler* than a
FE/BE feature flag (which introduces a sync-failure mode where BE stops awarding but FE still reads a
now-empty value). Do not over-engineer a flag; a clean conditional render is enough.

### F3 — Practice rework is the real cost center
E5 spans frontend (layout, components, question renderer, play loop) **and** backend (question
generation for flash add/sub-only and mul/div per-row digits). E5-T4 is the only item needing a
backend question-gen change — schedule it with its own tests and a `exercises` contract review. Treat
E5 as a module-level refactor, not a set of tweaks.

### F4 — Updated route → role table (keep current; new routes added by this plan)
| Route | Allowed roles | Status |
|---|---|---|
| `/` | **was** STUDENT/ADMIN (`→ /hub` inside `ProtectedRoute`); **becomes** public landing | **CHANGED (E1)** |
| `/portal` (chooser) | unauthenticated | **new (E1)** |
| `/login`, `/register/*` | unauthenticated | shipped |
| `/hub`, `/learn/*`, `/practice/*`, `/profile`, `/join-class` | STUDENT, ADMIN | shipped |
| `/teacher/*` | TEACHER, ADMIN | shipped |
| `/admin/import` (CSV) | ADMIN (or TEACHER per D-7) | **new (E4, pending D-7)** |
| guardian routes | removed | deprecated |

### F6 — Routing topology change is a real refactor, not a route add *(must-read before E1)*
E1 cannot just "add a landing route." Verified against `router.tsx` + `PublicRoute.tsx`:
- `/` currently resolves to `<Navigate to="/hub">` **inside** `ProtectedRoute → RoleRoute(STUDENT/ADMIN) → ShellLayout`. Moving `/` to a public landing means lifting it out of the protected tree.
- `PublicRoute` **hardcodes** the logged-in redirect to `/hub` — a logged-in TEACHER landing on `/` or `/login` would be sent to `/hub` (then bounced to `/teacher`). E1 must introduce a **role-aware redirect helper** (`STUDENT/ADMIN → /hub`, `TEACHER → /teacher`) used by both the landing and `PublicRoute`.
- Regression surface: the existing `/ → /hub` convenience for logged-in students, the `?next=` deep-link redirect, and the hydration skeleton (don't flash the landing then redirect). All three are in the E1 QA list.
- Keep it simple: one shared `roleHome(user)` function; do not build a generic redirect framework.

### F7 — Rollout, monitoring, rollback
- **No DB migration in this plan** if D-1b (FE-hide-only) and E5 ship as scoped — *except* E5-T4 (per-row digit config) and E4 (CSV import), which add fields/data. Those two ship behind their own PRs with backward-compatible server defaults; rollback = revert PR (E5-T4 fields are additive/defaulted; E4 import is data-additive and idempotent, so a bad import is re-runnable, not corrupting).
- **Frontend rollout:** E1 (routing) and E2 (XP hide) are pure FE — rollback = redeploy previous bundle. Ship E1 and the XP-hide as **separate deploys** so a routing regression and a gamification regression can be rolled back independently.
- **Monitoring:** after E5-T6 ships, watch for (a) a spike in session-finalize errors (double-submit/finalize races), (b) sessions with abnormally high attempt counts per question (reattempt loop not terminating), (c) `SessionReportView` 400s (finalize-vs-report race). After E4, log per-row import rejects.
- **Sequence guard:** E5-T8 (remove XP from arena UI) must not land before E2's `FeedbackToast` change is settled — they edit the same shared component; land them in one PR or strictly order them.

### F5 — Go/no-go
- **Green to start now (Wave A):** E2 card images, E5-T1, E5-T2, E5-T5, E5-T7. No decisions, no schema, reversible. *(E1 moved to Wave B — see below.)*
- **Promoted out of Wave A:** **E1** depends on the F6 routing refactor + D-4; treat it as decision-and-design-gated, not a quick win.
- **Hold for decisions (Wave B):** E1 (D-4 + F6), E2 XP removal (D-1/D-1b/D-2), E5-T3 (D-5), E5-T4 (D-6), E5-T6 session-flow review, E4 (D-7), E3 class dashboard (D-3).
- **Blocker if skipped:** F1 matrix reconciliation — do this before any RBAC-touching ticket in E1/E4.

---

## G. One-page summary

| Epic | Status vs plan v2 | Decision gate | Backend work | Start |
|---|---|---|---|---|
| E1 Landing + portal | GAP | D-4 + F6 routing refactor | none (FE routing only) | Wave B |
| E2 Hub de-XP + images | CONFLICT + PARTIAL | D-1, D-1b, D-2 | none (FE-hide-only) | images A / XP B |
| E3 Learn conformance | COVERED/PARTIAL | D-3 | maybe (class dashboard) | B |
| E4 CSV import | GAP | D-7 | yes (`courses` import + validation) | B |
| E5 Practice rework | mostly GAP | D-5, D-6 | yes (E5-T4 gen + flash constraint) | split A/B |
| E6 Teacher/Join | COVERED | — | none | done |

**Critical path:** close D-1/D-1b/D-2 (XP direction + mechanism) and D-5/D-6 (practice play rules) —
they gate the two heaviest epics. E1 is no longer a quick win: it carries the F6 routing-topology
refactor. Genuine Wave-A quick wins are narrower than first scoped: card images, config layout/stepper
(E5-T1/T2), row renderer (E5-T5), and the Victory report card (E5-T7, confirmed reuse).

**Senior-engineer approval status:** *Conditional.* Approved to start Wave A. Wave B is **blocked**
until D-1/D-1b/D-2/D-3/D-4/D-5/D-6/D-7 are recorded and F1 (RBAC reconciliation) is done. The three
findings that most change estimates: (1) E5-T7 is a small reuse, not a build; (2) E5-T6 needs an
`attempt_number` sequencing contract, not new verdict logic; (3) E1 is a routing refactor (F6), not a
route add.
