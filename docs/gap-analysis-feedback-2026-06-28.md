# Gap Analysis — Owner/Designer Feedback (28 Jun) vs Implementation Plan v2

**Authored:** 2026-06-29
**Inputs:** `Bolt_Feedback_28june_{1..5}.pdf` (owner + designer Sandeep/Sankeerth) ·
`docs/implementation-plan-v2.md` · current `frontend/src` + `backend/apps` code state
(commit `061209e`, daily log `2026-06-29`).
**Purpose:** scoping source for new features, module changes, and bug fixes. Each item is tagged:

- **COVERED** — already in plan v2 and shipped in code.
- **PARTIAL** — partly built; specific delta remains.
- **GAP** — not in plan v2; new scope.
- **CONFLICT** — feedback reverses a decision plan v2 already shipped (needs explicit re-decision).

---

## 0. Headline

Plan v2 was an **auth / RBAC / consent / teacher-portal** program (Waves 1–4) and it shipped
almost entirely. The 28-Jun feedback is a **product/UX direction change** on the *student-facing
learning and practice loop* — a layer plan v2 barely touched. The two largest themes are net-new:

1. **Strip the XP / streak gamification layer** (home, questions, results). Plan v2 moved the
   *opposite* direction — it added a Personal Best tile (3j) and keeps `XpProgressBar` on Hub and
   Victory. This is a **CONFLICT** that must be ruled on before building.
2. **Rework the Practice/Training Arena** end-to-end: side-by-side layout, button-style config
   (not sliders), flash-card semantics (add/sub only, one-by-one timed), per-row digit config for
   mul/div, row-style question UI, reattempt-on-wrong, and a results report card. Almost all **GAP**.

Teacher portal and Join Class (feedback item 4) are the one area **already fully covered**.

---

## 1. Login / Portal (Feedback PDF 1)

| Ask | Plan v2 | Code today | Status |
|---|---|---|---|
| Marketing home ("Modern Abacus Practice Revolution", Login as Teacher/Student) | not in plan | none | **GAP** |
| "Choose your portal" portal-selection screen (Student / Teacher cards) | not in plan | none — `/` goes straight to `LoginPage` | **GAP** |
| Two login portals (student + teacher) | 2c (LoginPage rework) | `LoginPage` with a mode toggle (teacher email+pw / student call-sign+PIN) | **PARTIAL** — one toggled page, not two portal entry points |
| Basic login/signup form | 2a/2b/2c | `LoginPage`, `StudentSignupPage`, `TeacherSignupPage` shipped | **COVERED** |

**Scope to add:** a public landing page + a portal-chooser route ahead of `/login`; optionally split
the toggle into two role-scoped login routes. Auth logic itself is done — this is presentation/routing.
Note feedback: "ask previous developers for the existing Bolt Abacus website code or recreate it."

---

## 2. Home / Hub Screen (Feedback PDF 2)

| Ask | Plan v2 | Code today | Status |
|---|---|---|---|
| Remove streaks section + **disable in code** | not in plan | `HubPage` renders `Day Streak` tile; `streak_days` from stats | **CONFLICT** |
| Remove XP section + disable in code | not in plan; plan **keeps** XP (`XpProgressBar`) and **added** Personal Best (3j) | `HubPage` shows `Total XP` tile + `XpProgressBar` | **CONFLICT** |
| Add images to Learn + Practice arena cards | 2g (portal-card images) | `PortalCard` wired with `bgSrc`; **image assets missing** (`/images/hub-learn.jpg`, `/images/hub-practice.jpg`) | **PARTIAL** — code ready, assets not delivered |

**Decision required:** XP/streak removal is global (home, questions, results — see §5). It reverses
plan v2's gamification direction and touches `useXpProgress`, `XpProgressBar`, `HudStatTile` (XP +
streak tiles), `FeedbackToast` (xp delta), backend `total_xp`/`streak_days`/xp-progress endpoint.
Recommend a single "remove gamification" decision before touching code; image assets are an
independent, low-risk delivery (Sandeep to provide the abacus image assets shown in PDF 2).

---

## 3. Learn Screen (Feedback PDF 3)

| Ask | Plan v2 | Code today | Status |
|---|---|---|---|
| Follow reference UI — "Choose your level" / Path of Conquest level grid | 2h (ranks sidebar), existing PathOfConquest | `PathOfConquestPage`, `LevelSelectionPage`, `LevelGridCard` shipped | **COVERED** (verify against ref pixel-for-pixel) |
| Class Dashboard layout (per-level class/topic/homework grid, PDF 3 img 3) | partially overlaps teacher portal (3f) | `BatchDetailPage` roster exists; the topic/homework class-dashboard layout does not | **PARTIAL / GAP** — confirm whether this is the teacher class view or a new student learn layout |
| Import Sankeerth's CSV question bank | not in plan | no CSV ingestion path found | **GAP** — content/data pipeline |

**Scope to add:** a question-bank import (CSV → backend questions) and a visual pass to match the
reference. Confirm ownership of the "class dashboard" mock — it reads as a teacher artifact and may
already be covered by `BatchDetailPage`.

---

## 4. Join Class & Teacher Dashboard (Feedback PDF 4)

| Ask | Plan v2 | Code today | Status |
|---|---|---|---|
| Create Join Class feature | 3c (backend) + 3g (`JoinClassPage`) | `POST classes/join/` + `JoinClassPage` shipped | **COVERED** |
| Create Teacher Dashboard (simpler is fine) | 3a–3f | `TeacherDashboardPage`, `CreateBatchModal`, `BatchDetailPage` shipped | **COVERED** |

**No new scope.** Feedback explicitly says "ok if not this detailed, make it simpler" — current build
already matches or is simpler than the mock. Only a visual alignment pass if desired.

---

## 5. Practice / Training Arena (Feedback PDF 5) — largest delta

| # | Ask | Plan v2 | Code today | Status |
|---|---|---|---|---|
| 5.1 | Config layout **side-by-side** (not stacked) | not in plan | `TrainingArenaPage` is vertical steps, `maxWidth: 600` | **GAP** |
| 5.2 | Adjust values via **buttons** (5.2 style), replace sliders | not in plan | `ConfigSlider` (range sliders) for questions/digits/rows/speed/time | **GAP** — replace component |
| 5.3 | Flash cards **exclusive to add/sub** | not in plan | `FLASH_CARDS` mode accepts any operation | **GAP** — constrain operation when mode = flash |
| 5.4 | Flash cards appear **one-by-one, stay on screen by set time** (matiks-style) | not in plan; `flashSpeedMs` config exists but unused in play | `InArenaPage` is a single manual-input flow; no auto-advancing flash display | **GAP** — net-new play mode UX |
| 5.5 | Mul/div: **digits row 1 and row 2 separately customisable** (5.3) | not in plan | single `digits` + `rows`; mul/div locked to 2 rows; no per-row digit count | **GAP** — frontend config + backend question gen |
| 5.6 | Question UI: **equation → rows** (5.4) | not in plan | `ProblemCanvas` renders `"{question} = ?"` equation style | **GAP** — new question renderer |
| 5.7 | Wrong answer: **keep same question, allow reattempt** | not in plan | `InArenaPage` advances on any submit (correct or wrong) | **GAP / BUG** — no reattempt loop |
| 5.8 | Add **Skip** button (practice) | 2i added skip for **classwork** (`ClassworkPage.handleSkip` + `is_skip`) | no skip control in `InArenaPage` (practice) | **PARTIAL** — extend classwork skip to practice arena |
| 5.9 | **Remove XP** for correct/wrong | not in plan | `FeedbackToast` shows `xpDelta`; verdict carries `xp_delta` (already 0) | **CONFLICT** (ties to §2) |
| 5.10 | Results: **remove XP** | not in plan | `VictoryPage` renders `XpProgressBar` | **CONFLICT** (ties to §2) |
| 5.11 | Results: **all-questions report card** (5.5) | 2i built `AttemptsTable` for `MissionReportPage` (classwork) | `VictoryPage` (practice) has score/accuracy/time only — no per-question table | **PARTIAL** — reuse `AttemptsTable` on `VictoryPage` |

This is effectively a **Practice module rebuild**: config screen (layout + buttons + flash/mul-div
rules), in-session play (flash timing, row question UI, reattempt + skip), and results (report card,
no XP). The flash-card and per-row-digit asks also require **backend question-generation changes**,
not just UI.

---

## 6. Cross-cutting: the XP / streak removal

Feedback removes XP and streaks in **three** places (home §2, questions §5.9, results §5.10). Because
plan v2 deliberately invested in gamification, treat this as one program decision, not three edits.
Surfaces touched if approved:

- Frontend: `HubPage` (XP + streak tiles, `XpProgressBar`), `VictoryPage` (`XpProgressBar`),
  `FeedbackToast` (xp delta), `XpProgressBar.tsx`, `useXpProgress`, `HudStatTile` usages.
- Backend: `total_xp`, `streak_days`, xp-progress endpoint, `xp_delta` on attempt verdicts.
- Plan v2 conflict: 3j Personal Best tile stays (accuracy-based, not XP) — keep it; it is the
  intended replacement signal.

Recommend a config flag or clean removal decision recorded against plan v2 §1 before coding.

---

## 7. Suggested scoping buckets (for backlog)

**A. Quick wins (presentation only, low risk)**
- Deliver Hub card image assets (§2). 
- Practice config: side-by-side layout (§5.1).
- Practice results: drop in existing `AttemptsTable` report card on `VictoryPage` (§5.11).

**B. Decisions needed before build**
- Global XP/streak removal — confirm + record (§2, §6, §5.9, §5.10) [CONFLICT with plan v2].
- "Class dashboard" mock ownership: teacher view vs new student learn layout (§3).
- Public landing + portal-chooser: recreate vs reuse legacy site (§1).

**C. Practice module rework (feature work, FE + BE)**
- Slider → button config component (§5.2).
- Flash cards: add/sub only + one-by-one timed play using `flashSpeedMs` (§5.3, §5.4).
- Mul/div per-row digit config — FE config + BE question gen (§5.5).
- Row-style question renderer replacing equation `ProblemCanvas` (§5.6).
- Reattempt-on-wrong loop + practice skip button (§5.7, §5.8).

**D. Content / data**
- Sankeerth CSV question-bank import pipeline (§3).

**E. Already done (no action)**
- Join Class + Teacher Dashboard (§4); login/signup forms (§1); Path of Conquest level grid (§3).

---

## 8. Coverage summary

| Feedback area | COVERED | PARTIAL | GAP | CONFLICT |
|---|---|---|---|---|
| 1 Login/Portal | signup/login forms | toggle vs two portals | landing + portal-chooser | — |
| 2 Home | — | card images | — | remove XP + streak |
| 3 Learn | level grid | class dashboard | CSV import | — |
| 4 Join/Teacher | full | — | — | — |
| 5 Practice | — | skip, report card | layout, buttons, flash, per-row digits, row UI, reattempt | remove XP (×2) |

**Bottom line:** ~1 of 5 feedback areas is fully covered by plan v2 (Teacher/Join). The rest is new
student-loop UX scope, with the XP/streak reversal as the key decision gating Home, Questions, and
Results.
