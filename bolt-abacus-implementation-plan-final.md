# Bolt Abacus — Implementation Plan (Final)
**Date:** 2026-06-04  
**Status:** FINAL — post adversarial review  
**Changes from v1:** 15 critique items addressed (see Critique Resolution section)

---

## Resolved Decisions

| # | Question | Decision |
|---|---|---|
| Q1 | Test Mode? | Practice = hints on, skips allowed, Fixed verdict tracked. Test = hints off, no skips, Fixed impossible, results stored per-topic as formal assessment. Student-triggered via "Take Test" CTA. |
| Q2 | Rank names vs topic names? | Both coexist. `rankName` primary label, `topicName` subtitle on level cards. |
| Q3 | Framework? | Vite + React SPA. react-router-dom v6. TanStack Query for server state (Wave 4). No SSR. |
| Icon library | Lucide vs Material Symbols? | Lucide. Remove all Material Symbols references. |

---

## Critique Resolution Log

| # | Issue | Resolution in Final Plan |
|---|---|---|
| C1 | `location.state` is wrong for session state | Replaced with `SessionContext` (`useContext` + `useReducer`). `location.state` used only for one-shot hints. |
| C2 | Types written before API exists = garbage | Wave 1 writes thin placeholder types. OpenAPI spec drafted in Wave 1 (even without backend). Types hardened in Wave 4 post-spec. |
| C3 | Screenshots ≠ QA strategy | Vitest + React Testing Library added in Wave 1. Playwright added for E2E in Wave 3. Behavioral tests for verdict logic required as exit criteria. |
| C4 | Legacy flag with no exit | `PathOfConquestLegacy.jsx` gets a hard-coded `// TODO: remove by end of Wave 5` comment and a removal ticket created on day of creation. |
| C5 | TrainingArena merge is under-scoped | `useArenaConfig` hook extracted explicitly. Component broken into composable sections. Redirect plan for `/setup` documented. |
| C6 | OpenAPI spec is Wave 4, not Wave 1 | API contract (OpenAPI draft) moved to Wave 1. MSW (Mock Service Worker) added to serve mocks in dev. Waves 1–3 code against real contract shapes. |
| C7 | JWT/cookie is backend work, not frontend | Auth contract defined in Wave 1. MSW stubs auth endpoints. `ProtectedRoute` built to real contract from Wave 1 even against stubs. |
| C8 | No error boundary or loading state strategy | `<ErrorBoundary>` + global skeleton pattern added to AppShell task in Wave 1. All TanStack Query hooks must specify `isLoading` / `isError` paths — enforced as Wave 4 exit criteria. |
| C9 | Mobile deferred to Wave 5 = full re-layout | Mobile layout defined per-screen in each Wave 2 task. AppShell Wave 1 task includes responsive breakpoint strategy. Wave 5 is validation-only, not construction. |
| C10 | Accessibility as polish = expensive retrofit | Contrast check on design tokens added to Wave 1. `aria-label` requirements added to component specs as built. WCAG audit in Wave 5 is a verification pass, not a fix pass. |
| C11 | No Tailwind build-tool migration task | `tailwind.config.js` + `postcss.config.js` setup added explicitly to Wave 1.1 with a purge sanity check. |
| C12 | ClassworkSession split across 2.5 + 3.1 | Merged into a single Wave 2 task with explicit acceptance checklist separating UI changes from logic changes. |
| C13 | `location.state` size limit for QuestionResult[] | Covered by C1 resolution — `SessionContext` holds results, not `location.state`. |
| C14 | No Vite proxy config for backend | Added to Wave 1.1: `server.proxy` config + `VITE_API_BASE_URL` env var documented. |
| C15 | No acceptance criteria or buffer | Wave exit gates added. Estimates include 20% buffer. Wave 4 estimated separately. |

---

## Target Repository Structure

```
bolt-abacus/
├── index.html
├── vite.config.ts            # includes server.proxy config
├── tailwind.config.js        # explicit, not CDN-inline
├── postcss.config.js
├── package.json
├── .env.development          # VITE_API_BASE_URL=http://localhost:3001
├── src/
│   ├── main.jsx              # Vite entry; mounts <App />, QueryClient, SessionProvider
│   ├── App.jsx               # Router + ProtectedRoute wiring
│   ├── types/
│   │   └── index.ts          # Thin placeholders Wave 1; hardened Wave 4
│   ├── api/
│   │   └── openapi.yaml      # API contract draft — Wave 1, backend builds against this
│   ├── mocks/
│   │   ├── handlers.ts       # MSW request handlers
│   │   └── browser.ts        # MSW browser worker setup
│   ├── context/
│   │   └── SessionContext.jsx # useReducer for active session state + results
│   ├── hooks/
│   │   ├── useSessionTimer.js
│   │   ├── useArenaConfig.js  # extracted from TrainingArena
│   │   ├── useUserProgress.js # TanStack Query wrapper
│   │   ├── useLevels.js
│   │   ├── usePersonalBest.js
│   │   └── useSubmitSession.js
│   ├── constants/
│   │   └── levels.js         # LEVELS with rankName + topicName
│   ├── components/
│   │   ├── AppShell.jsx      # Layout wrapper — SidebarNav + BottomTabBar + ErrorBoundary
│   │   ├── SidebarNav.jsx
│   │   ├── BottomTabBar.jsx
│   │   ├── TopNav.jsx        # Session screens only
│   │   ├── ErrorBoundary.jsx
│   │   ├── SkeletonCard.jsx  # Global loading skeleton primitive
│   │   ├── AmbientScene.jsx
│   │   ├── BoltButton.jsx
│   │   ├── GlassCard.jsx
│   │   ├── Icon.jsx          # Lucide wrapper only
│   │   ├── ProgressBar.jsx
│   │   ├── Slider.jsx
│   │   ├── Toggle.jsx
│   │   └── OperationButton.jsx
│   ├── screens/
│   │   ├── Login.jsx
│   │   ├── Hub.jsx
│   │   ├── LevelSelection.jsx
│   │   ├── PathOfConquest.jsx
│   │   ├── PathOfConquestLegacy.jsx  # TODO: remove end of Wave 5
│   │   ├── TrainingArena.jsx
│   │   ├── ClassworkSession.jsx
│   │   ├── FlashCardsSession.jsx
│   │   ├── ZenModeSession.jsx
│   │   ├── InTheArena.jsx
│   │   ├── MissionReport.jsx
│   │   ├── Victory.jsx
│   │   └── Profile.jsx
│   ├── styles/
│   │   └── tokens.css        # renamed from colors_and_type.css
│   └── test/
│       ├── setup.ts
│       ├── session.test.ts   # verdict logic, Fixed detection, Test Mode constraints
│       └── timer.test.ts
```

---

## Type Contracts

### Wave 1 — Thin Placeholders (write these, then stop)

```typescript
// src/types/index.ts — Wave 1 version
// These are directional. Harden after OpenAPI spec is signed off in Wave 4.

export type Verdict = 'correct' | 'wrong' | 'skipped' | 'fixed';
export type SessionMode = 'practice' | 'test';
export type PracticeMode = 'classwork' | 'flashcards' | 'zen' | 'timeattack';

export interface QuestionResult {
  question: string;
  expected: number;
  given: number | null;
  verdict: Verdict;
  fixedFrom?: number;
}

export interface SessionConfig {
  mode: SessionMode;
  practiceMode: PracticeMode;
  operation: string;
  questions: number;
  rows: number;
  digits: number;
  timeLimitMin: number;
  flashSpeedMs?: number;
  includeSub: boolean;
  audio: boolean;
}

// Placeholder shapes — will be replaced with API response types in Wave 4
export interface UserProgress {
  currentLevelNum: string;
  xpTotal: number;
  streak: number;
  trophies: number;
  levelProgress: Record<string, unknown>;
}

export interface LevelData {
  num: string;
  rankName: string;
  topicName: string;
  status: 'done' | 'current' | 'locked';
  advanced?: boolean;
}
```

---

## Session State Architecture

`location.state` is **not used for session data**. All mutable session state lives in `SessionContext`.

```jsx
// src/context/SessionContext.jsx
const initialState = {
  config: null,           // SessionConfig
  results: [],            // QuestionResult[]
  currentQuestion: 0,
  secondsElapsed: 0,
  levelContext: null,     // { levelNum, classId, topicId }
};

function sessionReducer(state, action) {
  switch (action.type) {
    case 'START_SESSION':   return { ...initialState, config: action.config, levelContext: action.levelContext };
    case 'RECORD_RESULT':   return { ...state, results: [...state.results, action.result] };
    case 'TICK':            return { ...state, secondsElapsed: state.secondsElapsed + 1 };
    case 'END_SESSION':     return { ...state, completed: true };
    default:                return state;
  }
}
```

Session screens dispatch to `SessionContext`. Results screens (`MissionReport`, `Victory`) read from `SessionContext`. On session start, `START_SESSION` clears previous state.

---

## API Contract (Draft — Wave 1)

Write `src/api/openapi.yaml` in Wave 1. Backend builds against this. Revise if backend needs changes — but changes go through the spec first.

```yaml
openapi: "3.0.0"
paths:
  /v1/auth/login:
    post:
      requestBody:
        content:
          application/json:
            schema:
              properties:
                callSign: { type: string }
                pin: { type: string, maxLength: 4 }
      responses:
        200:
          headers:
            Set-Cookie:
              schema: { type: string }   # httpOnly JWT cookie
              
  /v1/users/{userId}/progress:
    get:
      responses:
        200:
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserProgress'
                
  /v1/levels:
    get:
      responses:
        200:
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/LevelData' }
                
  /v1/sessions:
    post:
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SessionResult'
      responses:
        201:
          content:
            application/json:
              schema:
                properties:
                  sessionId: { type: string }
                  xpEarned: { type: number }
                  newStreak: { type: number }
                  levelUpTriggered: { type: boolean }
                  
  /v1/users/{userId}/personal-best:
    get:
      responses:
        200:
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PersonalBest'
```

---

## Wave Plan — Final

### Wave 1 — Foundation
**Exit gate:** All tasks complete, `npm run dev` serves the app at `localhost:5173`, all 12 screen routes render without error, `npm test` runs and passes (even if tests are just stubs). No Wave 2 work begins until this gate is passed.

| Wave | Category | Task | Priority |
|---|---|---|---|
| 1 | Infra | Initialize Vite + React project. Install: `react-router-dom@6`, `lucide-react`, `@tanstack/react-query`, `vitest`, `@testing-library/react`, `msw`. Configure `tailwind.config.js` + `postcss.config.js` with content glob `./src/**/*.{jsx,tsx}`. Run purge sanity check — verify all existing Tailwind classes survive. | High |
| 1 | Infra | Configure `vite.config.ts`: `base: './'`, `@` alias → `src/`, `server.proxy` pointing at `VITE_API_BASE_URL` (defaults to `http://localhost:3001`). Create `.env.development` and `.env.production` with `VITE_API_BASE_URL`. | High |
| 1 | Infra | Set up Vitest + React Testing Library: `src/test/setup.ts`, configure in `vite.config.ts`. Write one smoke test (`App renders without crashing`) to confirm the pipeline works. | High |
| 1 | Design System | Run contrast check on all design tokens in `tokens.css` against WCAG 2.1 AA (4.5:1 for normal text, 3:1 for large text). Document any failing pairs. Fix token values or note as known exceptions before any component is built. | High |
| 1 | Frontend | Split `components.jsx` → individual files in `src/components/`. One component per file. ES module `export default`. Remove ALL `window.ScreenName` globals. Remove `window.__BOLT_DEMO__` and all `demo?.skeleton` branching. Remove Material Symbols import and all `<span class="material-symbols-outlined">` usages. | High |
| 1 | Frontend | Split each `screens/*.jsx` → `src/screens/`. ES module exports. No logic changes — just the file split and export syntax. | High |
| 1 | Frontend | Wire `react-router-dom` in `App.jsx`. Define all 12 routes. Wrap non-session routes in `<AppShell>` (stub component — renders `{children}` only at this stage). Wrap all routes except `/` in `<ProtectedRoute>` (stub — just renders children for now). Replace all `onNavigate()` calls with `useNavigate()`. | High |
| 1 | Frontend | Build `SessionContext`: `useReducer` with `START_SESSION`, `RECORD_RESULT`, `TICK`, `END_SESSION` actions. Wrap `<App>` in `<SessionProvider>`. This replaces `location.state` and `runState` prop drilling for all session data. | High |
| 1 | Frontend | Build `AppShell`: renders `<SidebarNav>` (desktop, hidden on mobile), `<BottomTabBar>` (mobile, hidden on desktop), `<ErrorBoundary>`, and `<main>` content area. Responsive breakpoint: `md` (768px). Define responsive layout rules now — these must not be revisited per-screen. | High |
| 1 | Frontend | Build `SidebarNav`: 256px, sticky full-height. Items: Home → `/hub`, The Quest → `/learn`, The Arena → `/practice`, Profile → `/profile`. Active state: yellow left border + yellow text + `rgba(250,204,21,0.1)` bg. Bottom: Avatar + call-sign + "Level N". Aria: `<nav aria-label="Main navigation">`, each link has `aria-current="page"` when active. | High |
| 1 | Frontend | Build `BottomTabBar`: 4 tabs matching sidebar. `padding-bottom: env(safe-area-inset-bottom)`. Each tab: `role="tab"`, `aria-label`, `aria-selected`. Active tab: yellow icon + yellow label. `display: none` on `md+`. | High |
| 1 | Frontend | Build `ErrorBoundary` component. Build `SkeletonCard` (glass card with shimmer animation — reusable loading state for any card-shaped content). Both used by AppShell. | High |
| 1 | Frontend | Create stub `Profile.jsx`: avatar, call-sign, Level N, XP total — all hardcoded. This unblocks BottomTabBar from being a dead link. Add `aria-label="Profile page"` to main landmark. | Med |
| 1 | Docs | Write `src/api/openapi.yaml` — full API contract draft for all 5 endpoints. This is a contract document, not a backend implementation task. Backend builds against this. Frontend mocks against this. | High |
| 1 | Infra | Set up MSW: `src/mocks/handlers.ts` mocking all 5 endpoints with realistic stub data. `src/mocks/browser.ts` for dev. Start MSW in `main.jsx` when `import.meta.env.DEV`. | High |
| 1 | Docs | Write thin placeholder types in `src/types/index.ts`: `Verdict`, `SessionMode`, `PracticeMode`, `QuestionResult`, `SessionConfig`, `LevelData`, `UserProgress` (permissive shapes — no `Record<string, unknown>` police yet). Add comment: `// TODO Wave 4: harden against real API response shapes`. | Med |
| 1 | Frontend | Update `src/constants/levels.js`: add `rankName` field to each level entry (INITIATE → LEGEND for levels 1–10, names TBD for 11–12). Keep existing `topicName` field. | Med |

---

### Wave 2 — Core Screen Migrations
**Exit gate:** All 7 screens render correctly at 1280px (desktop) AND 375px (mobile) in Storybook or browser. No `console.error` from React in any screen. `npm test` still passes.

| Wave | Category | Task | Priority |
|---|---|---|---|
| 2 | Frontend | **Hub**: Wrap in `AppShell`. Remove `TopNav`. Add background photo images to portal cards with `loading="lazy"`, `srcset` for 1x/2x, `grayscale → color` hover via CSS filter transition. Animate hero with `animation: pulse` + `font-style: italic`. Mobile: portal cards stack vertically (grid-cols-1 on mobile, grid-cols-2 on md+). | High |
| 2 | Frontend | **LevelSelection**: Wrap in `AppShell`. Update `LevelCard` to render `rankName` as primary label and `topicName` as subtitle (smaller, muted, below rank name). Done/current/locked state logic unchanged. Mobile: 2-column grid on mobile (currently 5-column desktop). | High |
| 2 | Frontend | **PathOfConquest** (Accordion Rebuild): Wrap in `AppShell`. Replace vertical node path with accordion. Each Class row: class name + "Let's Go!" CTA + "Report" button + chevron. Expanded: topic grid — Topic name \| Classwork (Try Again / Take Test per `testStatus`) \| Homework (locked until classwork complete). Locked classes: collapsed row, lock icon, not expandable. Keep old code as `PathOfConquestLegacy.jsx` with comment `// TODO: delete — removal ticket #[TBD], hard deadline: Wave 5 exit`. Mobile: single-column accordion, full-width rows. | High |
| 2 | Frontend | **TrainingArena** (Consolidated): Wrap in `AppShell`. Extract `useArenaConfig` hook for all config state (operation, mode, questions, rows, digits, timeLimitMin, flashSpeedMs, includeSub, audio). Render inline: Step 01 (operation chips), Step 02 (3 mode cards — Flash Cards / No Rush / Time Attack — checkmark selectable), Step 03 (config panel filtered by selected mode: Flash Cards shows Questions + Rows + Flash Speed + Audio; No Rush shows Questions + Digits + Rows; Time Attack shows Questions + Digits + Rows + Time Limit; all show Include Subtraction). Personal Best chip: hardcoded stub for now. "ENTER ARENA": dispatches `START_SESSION` to `SessionContext`, then navigates to correct session screen. Add redirect: `/setup` → `/practice`. Mobile: steps stack vertically, config panel full-width. | High |
| 2 | Frontend | **ClassworkSession** (UI + Logic — single task): Update breadcrumb to `Level N / Class N / Topic N · Classwork`. Add "Test Mode" chip in header. Chip click dispatches to `SessionContext` toggling `config.mode`. In test mode: hide Hint button, hide Skip button. Rename "Submit" → "Next". Track Fixed verdict: add `firstAttemptWrong` ref per question; if first submission wrong and second correct, record `verdict: 'fixed'`, `fixedFrom: firstAnswer`. Track Skipped: `verdict: 'skipped'`, `given: null`. In test mode: Fixed is impossible (no retry shown), Skipped counted via question advance without answer. On session complete: dispatch `END_SESSION` to `SessionContext`. Navigate to `/report`. Acceptance checklist: [ ] Hint hidden in test mode [ ] Skip hidden in test mode [ ] Fixed verdict recorded correctly [ ] Skipped verdict recorded correctly [ ] Results in SessionContext after completion. Mobile: problem card full-width, submit button above 60% viewport height. | High |
| 2 | Frontend | **MissionReport**: Wrap in `AppShell`. Read results from `SessionContext` (not `location.state`). Add Skipped (zinc/muted, `do_not_disturb_on` icon) and Fixed (orange, `build` icon) verdict rows to breakdown table. Make table internally scrollable: `max-height: 500px; overflow-y: auto` with custom scrollbar styling. Mobile: stats grid 1-column stacked; table horizontal scroll. | High |
| 2 | QA | Per-screen mobile validation: after each screen above, test at 375px in browser devtools. Document any breakpoints that need component-level fixes. Fix inline — do not defer to Wave 5. | High |

---

### Wave 3 — Session Logic + Testing
**Exit gate:** `npm test` passes with behavioral coverage for verdict tracking, timer hook, and Test Mode constraints. E2E smoke test completes a full Classwork session and lands on MissionReport with correct verdict counts.

| Wave | Category | Task | Priority |
|---|---|---|---|
| 3 | Frontend | **InTheArena, FlashCardsSession, ZenModeSession**: Apply `QuestionResult` verdict enum to `results` in all three screens. Read/dispatch from `SessionContext`. On completion dispatch `END_SESSION`, navigate to `/victory`. Flash Cards: no Fixed state (no retry per card). Zen Mode: Fixed state applies. Handle `time === null` in Zen Mode on Victory (show "—" for speed stat). | High |
| 3 | Frontend | **Extract `useSessionTimer`**: `{ seconds, running, pause, resume, reset }`. Remove duplicated timer logic from ClassworkSession, InTheArena, ZenModeSession. Timer dispatches `TICK` to `SessionContext`. | Med |
| 3 | QA | Write Vitest unit tests for: (a) `sessionReducer` — all action types; (b) Fixed verdict detection logic — first wrong, second correct → `fixed`; first wrong, second wrong → `wrong`; (c) Test Mode constraints — Skip returns `skipped`, no Fixed possible; (d) `useSessionTimer` — tick, pause, resume, reset. Minimum: 15 test cases covering these paths. | High |
| 3 | QA | Set up Playwright. Write one E2E smoke test: load `/`, login with stub credentials, navigate to Classwork, answer 3 questions (1 correct, 1 wrong-then-correct (Fixed), 1 skipped), confirm MissionReport renders with 3 rows and correct verdict icons. | High |
| 3 | Frontend | **Victory screen hardening**: Read from `SessionContext`. Handle all `PracticeMode` variants. Handle `time === null` (Zen: show "—" speed stat). Conditional header text: "VICTORY!" if perfect score, "RUN COMPLETE" otherwise. | Med |

---

### Wave 4 — Backend + Real Data
**Exit gate:** All 5 API endpoints working against a real server. MSW disabled in production build. All hardcoded data arrays removed. Full login flow functional with real JWT.

| Wave | Category | Task | Priority |
|---|---|---|---|
| 4 | Backend | Implement backend server (stack TBD by team). Implement all 5 endpoints per `src/api/openapi.yaml`. Any deviation from the spec must go through a spec PR first. | High |
| 4 | Docs | Harden `src/types/index.ts` to match real API response shapes. Replace all `Record<string, unknown>` placeholders with concrete types from actual API responses. | High |
| 4 | Backend | Implement `POST /v1/auth/login`: returns JWT in `httpOnly`, `SameSite=Strict` cookie. Configure CORS for the Vite dev origin. Decide and document token refresh strategy (silent refresh vs. re-login). | High |
| 4 | Frontend | Implement `ProtectedRoute` against real auth: check for valid session (call `GET /v1/auth/me` or decode cookie client-side); redirect to `/` on failure. Handle auth expiry gracefully (show "Session expired, please log in again" — not a blank screen). | High |
| 4 | Frontend | Wire `useLevels()` TanStack Query hook. Replace `LEVELS` constant in `LevelSelection` and `PathOfConquest` with live data. Define `isLoading` render path (show `SkeletonCard` grid). Define `isError` render path (show error message with retry button). | High |
| 4 | Frontend | Wire `useUserProgress()` hook. Replace hardcoded `xp=8450, streak=7, trophies=14` in `SidebarNav` and `TopNav` with live `UserProgress`. Wire `PathOfConquest` topic grid `testStatus` and `homeworkUnlocked` fields to live progress data. | High |
| 4 | Frontend | Wire `useSubmitSession()` mutation. Call on session completion in all 5 session screens. On success: invalidate `useUserProgress` query (forces refetch — XP + streak update). On error: show non-blocking toast ("Progress not saved — check connection"), do not block navigation to results screen. | High |
| 4 | Frontend | Wire `usePersonalBest()` hook. Replace hardcoded Personal Best stub in `TrainingArena` with live data. | Med |
| 4 | Frontend | Replace hardcoded question arrays (`CLASSWORK`, `PROBLEMS`, `FLASH_PROBLEMS`, `ZEN_PROBLEMS`) with either: (a) a question generation API endpoint, or (b) a static question bank fetched per session config from `GET /v1/questions?level=04&mode=classwork`. Decision required before this task starts. | High |
| 4 | QA | Disable MSW in production build (`import.meta.env.PROD` guard). Verify no mock data leaks into production. Run full Playwright E2E suite against real backend. | High |
| 4 | QA | Each TanStack Query hook must have an `isLoading` path (skeleton) and `isError` path (error message + retry). Review pass across all screens — any query without both paths is a bug, not a "nice to have." | High |

---

### Wave 5 — Validation, Accessibility, Polish, Cleanup
**Exit gate:** Lighthouse ≥ 90 on Performance + Accessibility on desktop. WCAG 2.1 AA verified. All legacy code removed. `CLAUDE.md` updated.

| Wave | Category | Task | Priority |
|---|---|---|---|
| 5 | QA | Mobile validation pass: test every screen at 375px. This should be confirming fixes done in Wave 2 — not discovering new problems. Document any issues found; fix immediately. | High |
| 5 | QA | WCAG 2.1 AA verification audit (not a fix pass — fixes should have happened incrementally): focus order through sidebar + bottom tab, screen reader announcement for verdict changes (`aria-live="polite"` on feedback region), timer HUD `role="timer"` + `aria-label`, math problems readable as text by screen reader. | Med |
| 5 | Frontend | `React.lazy` + `<Suspense>` for all non-Hub screens. Add `SkeletonCard` as Suspense fallback. | Med |
| 5 | Frontend | Remove `PathOfConquestLegacy.jsx`. Confirm accordion is correct via teacher/parent user feedback before this task runs. | Low |
| 5 | Frontend | Remove all remaining hardcoded stubs, `// TODO` dev shortcuts, and dead code. Remove `demo?.skeleton` if any survived. | Low |
| 5 | Docs | Update `CLAUDE.md` project section: Engine: Vite + React, Router: react-router-dom v6, State: SessionContext + TanStack Query, Test: Vitest + Playwright, Build: `npm run build`, Deploy: Cloudflare Pages / S3 static. | Low |

---

## Critical Path

```
Wave 1 (ALL tasks, in order: Infra → Design System → Components → Context → Router → Docs)
  │
  └─► Wave 2 (screens can be parallelised across developers once AppShell is done)
        │
        └─► Wave 3 (session logic + tests — must come after session screens are stable)
              │
              ├─► Wave 4 Backend (can start in parallel from Wave 3 start, building against openapi.yaml)
              └─► Wave 4 Frontend (starts after Wave 3 exit gate; wires hooks into screens)
                    │
                    └─► Wave 5 (validation only — no new features)
```

MSW allows FE and BE to run in parallel from Wave 3 onward. The critical path dependency is the OpenAPI spec (Wave 1) — that's the handoff point between FE and BE.

---

## Estimates (with 20% buffer)

| Wave | Raw Estimate | +20% Buffer | Notes |
|---|---|---|---|
| Wave 1 | 3–4 days | **4–5 days** | Most setup is mechanical but error-prone |
| Wave 2 | 5–7 days | **6–9 days** | TrainingArena consolidation is the longest single task |
| Wave 3 | 2–3 days | **3–4 days** | Faster once SessionContext is solid |
| Wave 4 FE | 4–5 days | **5–6 days** | Assumes backend exists and is responding |
| Wave 4 BE | 8–14 days | **10–17 days** | Highly variable — depends on backend stack, auth complexity, question API design |
| Wave 5 | 2–3 days | **3–4 days** | Should be mostly verification |
| **Total (FE)** | | **~21–29 days** | |
| **Total (FE+BE, solo)** | | **~31–45 days** | |

Wave 4 FE and BE are listed separately because they can overlap. A solo developer doing both should treat Wave 4 BE as the long pole and keep FE work (hooks + wiring) ready to merge the moment each endpoint is live.
