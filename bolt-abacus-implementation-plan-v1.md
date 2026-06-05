# Bolt Abacus — Implementation Plan v1 (Pre-Critique Draft)
**Date:** 2026-06-04  
**Status:** DRAFT — pending adversarial review  
**Incorporates:** Stitch gap analysis, Q1 (Test Mode spec), Q2 (rank names coexist), Q3 (Vite + React)

---

## Resolved Decisions

| # | Question | Decision |
|---|---|---|
| Q1 | What is Test Mode? | Practice-mode: hints on, skips allowed, Fixed verdict tracked. Test-mode: hints off, skips count as Skipped, no Fixed state, results stored separately per-topic as formal assessment. Student-triggered via "Take Test" CTA in Path of Conquest. |
| Q2 | Rank names vs topic names? | Both coexist. `LevelData` carries `rankName` (INITIATE→LEGEND) and `topicName` (FOUNDATIONS, THE BIG FRIEND…). Level cards show rank name as primary, topic name as subtitle. |
| Q3 | Target framework? | **Vite + React SPA**. React Router v6 for routing. TanStack Query for server state when backend lands in Wave 4. No SSR. Static bundle deployable to Cloudflare Pages / S3. |
| Icon library | Lucide vs Material Symbols? | **Lucide** (already wrapped in `<Icon>`). Remove all Material Symbols references from Stitch HTML — they were prototype convenience, not a decision. |

---

## Repository Structure (Target State After Wave 1)

```
bolt-abacus/
├── index.html
├── vite.config.ts
├── package.json
├── tsconfig.json (or jsconfig.json)
├── src/
│   ├── main.jsx               # Vite entry; mounts <App />
│   ├── App.jsx                # Router shell
│   ├── types/
│   │   └── index.ts           # Canonical type contracts
│   ├── constants/
│   │   └── levels.js          # LEVELS array with rankName + topicName
│   ├── components/            # All shared primitives (migrated from components.jsx)
│   │   ├── AmbientScene.jsx
│   │   ├── AppShell.jsx       # NEW: sidebar + bottom tab layout wrapper
│   │   ├── SidebarNav.jsx     # NEW
│   │   ├── BottomTabBar.jsx   # NEW
│   │   ├── TopNav.jsx         # Retained for session screens only
│   │   ├── BoltButton.jsx
│   │   ├── GlassCard.jsx
│   │   ├── Icon.jsx
│   │   ├── ProgressBar.jsx
│   │   ├── Slider.jsx
│   │   ├── Toggle.jsx
│   │   └── ...
│   ├── screens/
│   │   ├── Login.jsx
│   │   ├── Hub.jsx
│   │   ├── LevelSelection.jsx
│   │   ├── PathOfConquest.jsx
│   │   ├── TrainingArena.jsx  # Merged with ArenaSetup
│   │   ├── ClassworkSession.jsx
│   │   ├── FlashCardsSession.jsx
│   │   ├── ZenModeSession.jsx
│   │   ├── InTheArena.jsx
│   │   ├── MissionReport.jsx
│   │   ├── Victory.jsx
│   │   └── Profile.jsx        # NEW stub
│   ├── hooks/
│   │   └── useSessionTimer.js # Extracted from ClassworkSession
│   └── styles/
│       └── tokens.css         # colors_and_type.css renamed + moved
```

---

## Type Contracts (Wave 1 — Write First, Code Against)

```typescript
// src/types/index.ts

type Verdict = 'correct' | 'wrong' | 'skipped' | 'fixed';

type SessionMode = 'practice' | 'test';

type QuestionResult = {
  question: string;       // e.g. "33 + 11 − 11"
  expected: number;
  given: number | null;   // null = skipped
  verdict: Verdict;
  fixedFrom?: number;     // original wrong answer, only when verdict === 'fixed'
};

type SessionConfig = {
  mode: SessionMode;
  practiceMode: 'classwork' | 'flashcards' | 'zen' | 'timeatttack';
  operation: '+' | '−' | '×' | '÷';
  questions: number;
  rows: number;
  digits: number;
  timeLimitMin: number;
  includeSub: boolean;
  zigZag: boolean;
  sameDigits: boolean;
  audio: boolean;
  flashSpeedMs?: number;  // Flash Cards only
};

type SessionResult = {
  sessionId: string;      // uuid, assigned client-side pre-backend
  userId: string;
  levelNum: string;       // "04"
  classId: string;        // "c2"
  topicId: string;        // "t1"
  config: SessionConfig;
  results: QuestionResult[];
  totalTime: number;      // seconds
  xpEarned: number;
  completedAt: string;    // ISO8601
};

type LevelData = {
  num: string;            // "04"
  rankName: string;       // "CHALLENGER"
  topicName: string;      // "THE LITTLE FRIEND"
  status: 'done' | 'current' | 'locked';
  advanced?: boolean;
};

type TopicProgress = {
  topicId: string;
  classworkStatus: 'not_started' | 'in_progress' | 'complete';
  testStatus: 'not_taken' | 'passed' | 'retake';
  homeworkUnlocked: boolean;
  homeworkStatus: 'not_started' | 'complete';
};

type UserProgress = {
  userId: string;
  currentLevelNum: string;
  xpTotal: number;
  streak: number;
  trophies: number;
  levelProgress: Record<string, TopicProgress[]>; // keyed by levelNum
};

type PersonalBest = {
  userId: string;
  byMode: Record<string, {
    bestAccuracy: number;
    bestTimePerQuestion: number;
    xpDelta: number;      // +/- vs previous best
  }>;
};
```

---

## Wave Plan — Detailed Task Breakdown

### Wave 1 — Foundation (Do not write screen code until this is done)
**Goal:** Every Wave 2+ task has a stable base to build on. No screen migrations yet.

#### 1.1 — Project Setup
- Initialize Vite + React project: `npm create vite@latest bolt-abacus -- --template react`
- Install dependencies: `react-router-dom@6`, `lucide-react`, `@tanstack/react-query` (install now, wire in Wave 4)
- Move `colors_and_type.css` → `src/styles/tokens.css`; import in `main.jsx`
- Copy all existing assets (`/assets/icons/`, `/assets/images/`) into `src/assets/`
- Configure `vite.config.ts`: set `base: './'`, alias `@` → `src/`

#### 1.2 — Module Refactor
- Split `components.jsx` into individual files under `src/components/`, one component per file, using ES module exports
- Remove ALL `window.ScreenName = ScreenName` registrations
- Remove `window.__BOLT_DEMO__` global and all `demo?.skeleton` branching
- Split each `screens/*.jsx` into individual files under `src/screens/`
- Verify no CDN `<script>` tags remain

#### 1.3 — Router
- Wire `react-router-dom` in `App.jsx`:
  - `/` → `Login`
  - `/hub` → `Hub` (inside `AppShell`)
  - `/learn` → `LevelSelection` (inside `AppShell`)
  - `/learn/:levelNum` → `PathOfConquest` (inside `AppShell`)
  - `/learn/:levelNum/classwork` → `ClassworkSession` (bare layout)
  - `/practice` → `TrainingArena` (inside `AppShell`)
  - `/practice/arena` → `InTheArena` (bare layout)
  - `/practice/flashcards` → `FlashCardsSession` (bare layout)
  - `/practice/zen` → `ZenModeSession` (bare layout)
  - `/report` → `MissionReport` (inside `AppShell`)
  - `/victory` → `Victory` (bare layout)
  - `/profile` → `Profile` (inside `AppShell`)
- Replace all `onNavigate(screen)` calls with `useNavigate()` from react-router-dom
- Pass `runState` via `location.state` (React Router) instead of prop drilling

#### 1.4 — Type Contracts
- Create `src/types/index.ts` with all types from the "Type Contracts" section above
- Create `src/constants/levels.js` with updated `LEVELS` array — add `rankName` field to each entry alongside existing `topicName`

#### 1.5 — AppShell + Navigation Components
- Build `src/components/SidebarNav.jsx`:
  - 256px desktop left sidebar
  - Items: Home (→ `/hub`), The Quest (→ `/learn`), The Arena (→ `/practice`), Profile (→ `/profile`)
  - Active state: yellow left border + yellow text + `rgba(250,204,21,0.1)` background
  - Bottom: Avatar + call-sign + "Level N" subtitle
  - Sticky, full viewport height
- Build `src/components/BottomTabBar.jsx`:
  - 4 tabs matching sidebar items
  - `padding-bottom: env(safe-area-inset-bottom)` for iOS safe area
  - Hidden on `md:` and above (Tailwind breakpoint or CSS media query)
  - Active tab: yellow icon + yellow label
- Build `src/components/AppShell.jsx`:
  - Renders `<SidebarNav>` (hidden on mobile) + `<BottomTabBar>` (hidden on desktop) + `<main>` content area
  - Non-session screens wrap their content in `<AppShell>`
  - Session screens use bare layout (no shell)

#### 1.6 — Stub Profile Screen
- Create `src/screens/Profile.jsx`: avatar, call-sign, Level N, XP total — all hardcoded for now
- This unblocks BottomTabBar from being a dead link

---

### Wave 2 — Core Screen Migrations
**Goal:** Every screen the student sees in a typical session is rebuilt against the new layout and data contracts.

#### 2.1 — Hub
- Wrap in `<AppShell>`
- Remove `<TopNav>` from Hub
- Add background photo images to portal cards (LEARN + PRACTICE) with `grayscale → color` hover transition
- Source 2 placeholder images; configure `loading="lazy"` from day one
- Apply `animate-pulse` + `font-style: italic` to hero heading
- Hero text, gradient rule, portal card layout: keep as-is

#### 2.2 — Level Selection
- Wrap in `<AppShell>`
- Update `LevelCard` to render `rankName` as primary label (large, yellow on current) and `topicName` as subtitle (small, muted)
- Done/Current/Locked state logic: no change
- Advanced levels section: keep as-is

#### 2.3 — Path of Conquest (Accordion Rebuild)
- Wrap in `<AppShell>`
- Replace vertical node path with accordion layout:
  - Each `Class` row: class name pill + "Let's Go!" CTA + "Report" button + expand/collapse chevron
  - Expanded class: topic grid with columns — Topic name | Classwork (Try Again / Take Test) | Homework (locked until classwork complete)
  - `testStatus` per topic drives "Take Test" vs "Retake" vs green checkmark
  - Locked classes: row with lock icon, no expand
- **Feature flag:** Keep old vertical path code in `PathOfConquestLegacy.jsx`; render it if `localStorage.getItem('LEGACY_PATH') === 'true'`; remove in Wave 5 after validation
- "Download Materials" link: keep per topic row

#### 2.4 — Training Arena (Consolidated)
- Wrap in `<AppShell>`
- Merge `ArenaSetup.jsx` content inline below mode selector:
  - Step 01: Operation selector (Addition+Sub / Multiplication / Division chips)
  - Step 02: Mode selector — Flash Cards / No Rush Mastery / Time Attack as checkmark-selectable cards (purple "The Lab" card removed as standalone; its config fields are now the Step 03 panel)
  - Step 03: Configuration panel — fields shown/hidden contextually by selected mode:
    - Flash Cards: Questions, Rows, Flash Speed, Audio Mode
    - No Rush: Questions, Digits, Rows
    - Time Attack: Questions, Digits, Rows, Time Limit
    - All modes: Include Subtraction toggle
  - Personal Best chip: hardcoded stub `14.2s / +12% XP` for now; wire in Wave 4
- Remove `/setup` route; add redirect from `/setup` → `/practice`
- "ENTER ARENA" CTA navigates based on selected mode: `/practice/flashcards`, `/practice/zen`, `/practice/arena`

#### 2.5 — Classwork Session
- Update breadcrumb: `Level {N} / Class {N} / Topic {N} · Classwork`
- Add `mode: SessionMode` to session state; default `'practice'`
- Add "Test Mode" chip to header — clicking it flips `mode` to `'test'`; in test mode: hide Hint button, disable Skip, set max skips to 0
- Update "Submit" → "Next" label per Stitch
- No other logic changes in this wave

#### 2.6 — Mission Report
- Wrap in `<AppShell>`
- Add "Skipped" (zinc muted, `do_not_disturb_on` icon) and "Fixed" (orange, `build` icon) verdict states to breakdown table
- Make breakdown table internally scrollable: `max-height: 500px; overflow-y: auto`
- Update `results[]` consumption to use `QuestionResult.verdict` enum instead of `result.correct` boolean

---

### Wave 3 — Session Logic Hardening
**Goal:** Session screens correctly track and emit all verdict states. Data flows correctly from session → results screen.

#### 3.1 — ClassworkSession verdict tracking
- Track "Fixed": if student's first submission is wrong and second submission is correct on the same question, verdict = `'fixed'`, `fixedFrom` = first wrong answer. Requires adding a `firstAttempt` ref per question.
- Track "Skipped": already partially implemented; ensure `verdict: 'skipped'`, `given: null`
- In Test Mode: skip tracking, max 0 skips enforced at UI level (Skip button hidden), Fixed verdict impossible
- Pass complete `QuestionResult[]` to `MissionReport` via router `location.state`

#### 3.2 — InTheArena / FlashCardsSession / ZenModeSession
- Apply same verdict enum to `results[]` in all three session screens
- Flash Cards: no Fixed state (no retry per card); Skipped if timer expires without answer (if Time Attack mode)
- Zen Mode: Fixed state applies (untimed, retry is the point); no Skipped unless student explicitly skips
- Pass results to `Victory` via `location.state`

#### 3.3 — Victory screen hardening
- Read `SessionResult` from `location.state`; render correct accuracy, score, avg speed
- Handle case where `time === null` (Zen Mode — show "—" instead of speed stat)

#### 3.4 — Extract `useSessionTimer` hook
- Timer logic is copy-pasted across `ClassworkSession`, `InTheArena`, `ZenModeSession`
- Extract into `src/hooks/useSessionTimer.js`: `{ seconds, running, pause, resume, reset }`

#### 3.5 — QA: Visual regression pass
- Screenshot every screen at 1280px and 768px before and after Wave 2 migrations
- Confirm: no layout overflow, no z-index conflicts with sidebar, no TopNav rendered on AppShell screens

---

### Wave 4 — Backend + Real Data
**Goal:** Replace all hardcoded data with API-driven state.

#### 4.1 — API Design
- Define OpenAPI spec for:
  - `POST /sessions` — accepts `SessionResult`; returns `{ sessionId, xpEarned, newStreak, levelUpTriggered }`
  - `GET /users/:id/progress` — returns `UserProgress`
  - `GET /users/:id/personal-best` — returns `PersonalBest`
  - `GET /levels` — returns `LevelData[]` with full class/topic tree
  - `POST /auth/login` — accepts `{ callSign, pin }`; returns JWT
- All endpoints versioned under `/v1/`

#### 4.2 — Auth
- Replace cosmetic Login with real JWT auth: `POST /v1/auth/login` with call-sign + 4-digit PIN
- Store JWT in `httpOnly` cookie (not localStorage — OWASP recommendation for child-facing apps)
- Add `ProtectedRoute` wrapper in React Router: redirect to `/` if no valid session

#### 4.3 — Wire TanStack Query
- Configure `QueryClient` in `main.jsx`
- `useUserProgress()` hook: `GET /v1/users/:id/progress` — used by Hub, LevelSelection, PathOfConquest, SidebarNav (XP/streak/trophy display)
- `useLevels()` hook: `GET /v1/levels` — used by LevelSelection, PathOfConquest
- `usePersonalBest()` hook: `GET /v1/users/:id/personal-best` — used by TrainingArena
- `useSubmitSession()` mutation: `POST /v1/sessions` — called on session completion in all 5 session screens

#### 4.4 — Replace Hardcoded Data
- `LEVELS` constant in `levels.js`: remove; consume from `useLevels()`
- `CLASSWORK` / `PROBLEMS` / `FLASH_PROBLEMS` / `ZEN_PROBLEMS` arrays: replace with question generation API or static question bank fetched per session config
- HUD stats (XP, streak, trophies) in `SidebarNav` + `TopNav`: replace hardcoded `xp=8450, streak=7` with `UserProgress` data

#### 4.5 — Personal Best widget
- Wire `TrainingArena` Personal Best chip to `usePersonalBest()` data

---

### Wave 5 — Mobile, Polish, Cleanup

#### 5.1 — Mobile Responsive Pass
- Test all screens at 375px viewport
- Confirm: sidebar hidden, bottom tab bar visible, session screens reflow (problem card at full width, submit button above keyboard fold)
- Fix any overflow or font-size issues at mobile breakpoints

#### 5.2 — Accessibility Audit
- Focus trap for mobile sidebar if opened as a drawer
- `aria-label` on all BottomTabBar tabs
- `role="status"` live region for timer HUD (screen reader reads time remaining)
- `aria-live="polite"` on verdict feedback (Correct / Wrong / Skipped / Fixed announcements)
- Math problems rendered as text, not images — confirm screen reader reads operands correctly

#### 5.3 — Performance
- Lazy-load all non-Hub screens with `React.lazy` + `<Suspense>`
- Add `loading="lazy"` + `srcset` to Hub portal card images
- Target Lighthouse score ≥ 90 on desktop (Performance + Accessibility)

#### 5.4 — Cleanup
- Remove `PathOfConquestLegacy.jsx` after user validation confirms accordion is preferred
- Remove `/setup` redirect (already handled in Wave 2, confirm clean)
- Remove all `demo?.skeleton` remnants
- Remove Feature Flag `LEGACY_PATH` localStorage check

#### 5.5 — Docs
- Update `CLAUDE.md` project section with: engine (Vite + React), router (react-router-dom v6), state (TanStack Query), test runner (Vitest), build command (`npm run build`), deploy target
- Add `README.md` to `src/types/` explaining the session result schema and verdict rules

---

## Critical Path (What Blocks What)

```
Wave 1.1 (Vite setup)
  └─► Wave 1.2 (Module refactor)
        └─► Wave 1.3 (Router)
              └─► Wave 2.x (All screen migrations — can parallelize per screen)
                    └─► Wave 3.x (Session logic hardening)
                          └─► Wave 4.3 (TanStack Query wire-up)

Wave 1.4 (Types) ──────────────────────────► Wave 4.1 (API design — use same types)
Wave 1.5 (AppShell) ───────────────────────► Wave 2.x (All AppShell screens)
Wave 4.1 (API spec) ───────────────────────► Wave 4.2 / 4.3 / 4.4 (can parallelize FE+BE)
```

Wave 1 tasks 1.1 through 1.6 must all complete before any Wave 2 work begins. Within Wave 2, screens can be assigned to different developers in parallel. Wave 4 FE and BE can run concurrently once the API spec (4.1) is signed off.

---

## Estimated Scope by Wave (Solo Developer, Full Days)

| Wave | Scope |
|---|---|
| Wave 1 | 3–4 days |
| Wave 2 | 5–7 days |
| Wave 3 | 2–3 days |
| Wave 4 | 8–12 days (includes backend) |
| Wave 5 | 3–4 days |
| **Total** | **~21–30 days** |
