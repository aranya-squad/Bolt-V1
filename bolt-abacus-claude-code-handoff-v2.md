# Bolt Abacus — Claude Code Handoff v2
**Date:** 2026-06-04  
**Status:** Reflects actual codebase state after previous sessions

---

## Actual Codebase State

The app is a proper Vite + React + TypeScript SPA at `frontend/`. It is **not** the CDN prototype described in the original briefing. Previous sessions completed most of Wave 1 and significant Wave 2. The app runs at `localhost:5173` with `npm run dev`.

### What exists and works
- Vite + TypeScript, feature-based folder structure (`src/features/`, `src/shared/`)
- All 12 routes wired in `src/router.tsx` with `ProtectedRoute`
- `ShellLayout` with `Sidebar` + `BottomNav` (responsive)
- TanStack Query throughout — all screens have `isLoading` / `isError` paths
- Zustand stores: `authStore` (auth state) + `sessionStore` (active session)
- MSW 2.14.6 with handlers for all 16 API endpoints (`src/mocks/handlers.ts`)
- `src/api/openapi.yaml` — complete API contract
- TypeScript types in `src/shared/types/index.ts` including `QuestionVerdict = "correct" | "wrong" | "fixed"`
- Rank names (INITIATE → LEGEND) in `src/shared/lib/rankNames.ts`
- PathOfConquest accordion (`ClassAccordion`, `TopicRow` components)
- All screen components exist: Hub, LevelSelection, PathOfConquest, TrainingArena, ArenaSetup (separate), ClassworkPage, MissionReport, Victory, InArena, Profile
- `AttemptsTable` already groups attempts by question and renders `fixed` verdict (wrench icon) when a question was retried correctly
- `formatTime.test.ts` exists — test pipeline works

### Accepted deviations from the plan

| Deviation | Decision |
|---|---|
| **Zustand instead of SessionContext + useReducer** | **Keep Zustand.** It's deeply integrated, working, and strictly better ergonomics. The plan pre-dated this code. `sessionStore` and `authStore` are the canonical state stores. |
| **TypeScript (.tsx) instead of JavaScript (.jsx)** | **Keep TypeScript.** Not up for debate. |
| **Login uses email + password, not call-sign + PIN** | **Flag for Wave 4, not a blocker now.** The form is cosmetic until real auth exists. When backend auth is built, the login UX must change to call-sign + 4-digit PIN — it's a children's product (ages 6–10), email is the wrong mental model. Note this as a required change in the auth ticket. |
| **TrainingArena is still 4-card bento → separate ArenaSetup page** | **Consolidate — this is unfinished Wave 2 work.** See Task 1 below. |

---

## What's Actually Missing (Your 3 Tasks)

### Task 1 — Consolidate TrainingArena + ArenaSetup

**Current state:** `TrainingArenaPage.tsx` is a 4-card bento grid (Flash Cards, Zen, Time Attack, The Lab). Each card navigates to `/practice/setup/:mode`, which renders `ArenaSetupPage.tsx` — a separate full page.

**Target state (per Stitch design):** Single page with three inline steps:
- **Step 01 — Choose Operation:** 3 chip-style selectors: "Addition & Subtraction" / "Multiplication" / "Division"
- **Step 02 — Combat Style:** Flash Cards / No Rush Mastery / Time Attack as checkmark-selectable cards (The Lab's custom config becomes Step 03 — it doesn't need its own card anymore)
- **Step 03 — Configuration:** Panel filtered by selected mode:
  - Flash Cards: Number of Questions, Rows per Calculation, Flash Speed (s), Audio Mode toggle
  - No Rush: Questions, Digits, Rows
  - Time Attack: Questions, Digits, Rows, Time Limit (min)
  - All modes: Include Subtraction toggle
- **Personal Best chip** below Step 03 (stub with hardcoded values for now — `usePersonalBest` query can be wired later)
- **"ENTER ARENA" CTA** at bottom — navigates to the correct session screen based on selected mode

**Implementation steps:**
1. Extract config state into `useArenaConfig` hook (`src/features/practice/useArenaConfig.ts`). This hook owns: `operation`, `mode`, `questions`, `rows`, `digits`, `timeLimitMin`, `flashSpeedMs`, `includeSub`, `audio`. All fields initialized to the same defaults currently in `ArenaSetupPage`.
2. Rebuild `TrainingArenaPage.tsx` using the 3-step inline layout. Reuse `OperationTileGrid`, `ConfigSlider`, `AdvancedToggleRow`, `Toggle` — these components already exist in `src/shared/ui/`.
3. The "ENTER ARENA" button should:
   - Call `POST /api/v1/practice/start/` (already mocked in MSW) with the config
   - On success: navigate to the correct session route based on mode (`/practice/flash`, `/practice/zen`, `/practice/time-attack`, or `/practice/custom` for The Lab)
4. Delete `ArenaSetupPage.tsx` after consolidation. Add a redirect in `router.tsx` from `/practice/setup/:mode` → `/practice` so no dead links exist.
5. Mobile: steps stack vertically, config panel full width at ≤ 768px.

---

### Task 2 — ClassworkSession: Test Mode + Fixed/Skipped Verdicts

**Current state of `ClassworkPage.tsx`:**
- Server-driven: `useStartClasswork` → `useSubmitAttempt` → `useFinalizeSession`
- `submitAttempt` returns `AttemptVerdict { question_index, is_correct, xp_delta }` — no retry logic
- No Test Mode UI, no hint button, no skip button
- Breadcrumb shows "LEARN / CLASSWORK" — missing level/class/topic depth
- Input only accepts positive integers (`.replace(/[^0-9]/g, "")`) — negative answers are blocked (may need revisiting for subtraction results)

**What needs to be added:**

#### 2a — Test Mode chip
Add a "Test Mode" toggle chip in the session header (right side, near the progress counter).

```tsx
// State: add to ClassworkPage
const [testMode, setTestMode] = useState(false);
```

- Chip appearance: pill, outline style when inactive / yellow filled when active. Label: "TEST MODE".
- In test mode:
  - Hide or disable the Hint button (if one is added — see below)
  - Hide the Skip button (if one is added)
  - The Fixed verdict path is blocked (see 2b)

#### 2b — Fixed verdict tracking
The backend already stores all attempts via `POST /sessions/:id/attempts/`. The `SessionReport.question_verdicts` field already returns `"correct" | "wrong" | "fixed"` from the server — `AttemptsTable` already renders it.

The **client side** currently does not retry on wrong answers. Add retry logic:

```tsx
// After a wrong verdict is dismissed:
// Instead of always advancing to the next question,
// allow one retry on the same question if NOT in test mode.
const [retriedThisQuestion, setRetriedThisQuestion] = useState(false);

const handleVerdictDismiss = () => {
  setVerdict(null);
  setInput("");
  
  const wasWrong = !verdict?.is_correct;
  const canRetry = wasWrong && !testMode && !retriedThisQuestion;
  
  if (canRetry) {
    // Stay on same question for one retry
    setRetriedThisQuestion(true);
    // Optionally show a brief "Try again" hint
    return;
  }
  
  // Advance to next question
  setRetriedThisQuestion(false);
  if (sessionMeta && currentIndex + 1 >= sessionMeta.questions.length) {
    handleFinalize();
  } else {
    setCurrentIndex((i) => i + 1);
  }
};
```

The second attempt submission goes to the same `submitAttempt` mutation with `attempt_number: 2` implicit in the server state. The backend already tracks this and will return `"fixed"` in `question_verdicts` for that question in the report.

In test mode: skip the retry path entirely — wrong = advance immediately.

#### 2c — Skip button
Add a Skip button (ghost, small, below the answer input).

```tsx
const handleSkip = () => {
  if (testMode) return; // skip is hidden in test mode — belt + suspenders
  submitAttempt(
    { question_index: currentIndex, answer: -999999, elapsed_ms: Date.now() - questionStartMs.current },
    { onSuccess: (v) => { setVerdict(v); } }
  );
  // The server will record this as wrong; client advances on dismiss
};
```

Note: The MSW handler for attempts uses expected answer lookup. Update `src/mocks/handlers.ts` to treat `answer: -999999` as a skip signal — return `{ is_correct: false, xp_delta: 0 }` and mark the attempt as skipped in the mock report.

For the `"skipped"` verdict in `AttemptsTable` and `MissionReportPage`:
- Add `"skipped"` to `QuestionVerdict` type in `src/shared/types/index.ts`
- Add a `"skipped"` row rendering in `AttemptsTable` (zinc/muted color, dash in answer column, `minus-circle` Lucide icon in the verdict column)
- Add to the MSW mock report data so it's testable immediately

#### 2d — Breadcrumb depth
Update `BreadcrumbChip` usage in `ClassworkPage` from `["LEARN", "CLASSWORK"]` to `["LEVEL " + levelId, "CLASSWORK"]`. If lesson context is available via the route or session meta, show `["LEVEL " + levelId, "LESSON " + lessonOrder, "CLASSWORK"]`.

#### 2e — Input accepts negative numbers
The current input strips everything but `0-9`. Abacus subtraction problems can produce negative intermediate results. Change the filter:

```tsx
onChange={(e) => setInput(e.target.value.replace(/[^0-9-]/g, "").replace(/(?!^)-/g, ""))}
```

This allows a leading minus sign only.

---

### Task 3 — Behavioral Unit Tests for Verdict Logic

The test pipeline is set up (Vitest, `test-setup.ts` exists). `formatTime.test.ts` exists and passes. No tests exist for session logic.

Write tests in `src/features/learn/__tests__/classwork.test.ts`:

```
Test suite: Verdict logic
  ✓ correct answer on first attempt → verdict 'correct', advances to next question
  ✓ wrong answer, practice mode → stays on same question (retry offered)
  ✓ wrong answer then correct → second attempt recorded, advances to next question
  ✓ wrong answer then wrong again → advances to next question (no second retry)
  ✓ wrong answer, test mode → advances immediately (no retry)
  ✓ skip action → answer -999999 submitted, advances to next question
  ✓ skip action, test mode → skip button not rendered (test via component render)
  ✓ last question correct → handleFinalize called
  ✓ last question finalize → navigate to /learn/level/:id/report/:sessionId
```

Write tests in `src/shared/ui/__tests__/AttemptsTable.test.tsx`:

```
Test suite: AttemptsTable rendering
  ✓ renders 'fixed' wrench icon for fixed verdict
  ✓ renders retry row indented under parent question
  ✓ renders 'skipped' with dash and muted color
  ✓ empty attempts array renders nothing
```

Use `@testing-library/react` + Vitest. Mock TanStack Query with a simple wrapper. No Playwright tests needed for these — unit tests are sufficient.

---

## Acceptance Criteria (all 3 tasks)

Before marking this work done, verify:

- [ ] `npm run dev` — app loads, no console errors
- [ ] `npm test` — all tests pass including new verdict logic tests  
- [ ] TrainingArena: single-page flow, no navigation to ArenaSetup, "ENTER ARENA" starts a session
- [ ] `/practice/setup/:mode` redirects to `/practice` (no 404)
- [ ] `ArenaSetupPage.tsx` deleted
- [ ] ClassworkPage: Test Mode chip toggles correctly
- [ ] ClassworkPage: wrong answer in practice mode shows retry, second correct answer advances
- [ ] ClassworkPage: wrong answer in test mode advances immediately (no retry)
- [ ] ClassworkPage: Skip button hidden in test mode, visible in practice mode
- [ ] MissionReport: Skipped verdict rows render with muted color and dash
- [ ] `QuestionVerdict` type includes `"skipped"`
- [ ] Mobile: TrainingArena steps stack vertically at 375px

---

## File Map for This Session

| What you need | Where it is |
|---|---|
| Training Arena page | `src/features/practice/TrainingArenaPage.tsx` |
| Arena Setup page (to delete) | `src/features/practice/ArenaSetupPage.tsx` |
| Classwork session | `src/features/learn/ClassworkPage.tsx` |
| Mission Report | `src/features/learn/MissionReportPage.tsx` |
| Attempts table | `src/shared/ui/AttemptsTable.tsx` |
| All shared UI components | `src/shared/ui/` |
| TanStack Query hooks | `src/shared/api/queries/` |
| Zustand session store | `src/shared/store/sessionStore.ts` |
| TypeScript types | `src/shared/types/index.ts` |
| MSW handlers | `src/mocks/handlers.ts` |
| MSW mock data | `src/mocks/data.ts` |
| Router (for redirects) | `src/router.tsx` |
| Existing tests | `src/shared/lib/formatTime.test.ts` |
| Design spec (gap analysis) | `../bolt-abacus-stitch-adoption-plan.md` |
| Full implementation plan | `../bolt-abacus-implementation-plan-final.md` |

---

## Hard Rules (do not deviate without flagging)

1. **State management is Zustand.** Use `sessionStore` and `authStore`. Do not introduce React context, `useReducer`, or any additional state library.
2. **TypeScript only.** No `.js` or `.jsx` files.
3. **No new dependencies** without a comment explaining why the existing toolkit can't handle it.
4. **Every TanStack Query hook usage has `isLoading` and `isError` render paths.** Non-negotiable.
5. **Test Mode constraints are enforced in two places:** UI (buttons hidden/disabled) AND logic (retry path skipped). Belt and suspenders — one layer being bypassed shouldn't break correctness.
6. **`"skipped"` must be added to `QuestionVerdict` in `types/index.ts` before rendering it in any component.** TypeScript will catch any mismatches downstream.
7. **Start with the type changes** (`QuestionVerdict`, MSW mock update) before touching component code. This makes TypeScript your safety net throughout.

---

## What Is NOT In Scope This Session

- Real backend / real auth (Wave 4 — stays MSW-mocked)
- Login UX change to call-sign + PIN (required in Wave 4, not now)
- Performance optimization, lazy loading (Wave 5)
- PathOfConquestLegacy removal (Wave 5)
- i18n (`src/i18n.ts` exists — don't touch it)

Start with Task 2a (add `"skipped"` to types and update MSW), then Task 1 (TrainingArena consolidation), then Task 2b–2e (ClassworkPage logic), then Task 3 (tests). Read the existing files before modifying them.
