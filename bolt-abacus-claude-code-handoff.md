# Bolt Abacus — Claude Code Handoff Prompt

Copy everything below this line and paste it as your first message to Claude Code.

---

## Project Briefing

You are implementing **Bolt Abacus** — a web-based abacus math learning portal for children in Grades 1–4. The aesthetic is esports/gaming: dark charcoal backgrounds, glassmorphism cards, yellow (#facc15) primary accent, gaming vocabulary ("Training Arena", "Path of Conquest"). Think edtech meets pro gaming dashboard — not cartoon.

Your working directory is this repo. Read `CLAUDE.md` before doing anything. Then read these two files in full before writing a single line of code:

1. `bolt-abacus-implementation-plan-final.md` — the complete implementation plan. This is your specification. Every task, every decision, every wave sequence is in here.
2. `bolt-abacus-stitch-adoption-plan.md` — the gap analysis between the current prototype and the new Stitch designs. This explains *why* each change is being made.

---

## Current Codebase State

The existing code in `bolt-abacus-design-system/project/ui_kits/bolt-abacus-app/` is a **browser prototype** — not a production app. It uses:
- Vanilla React loaded via CDN `<script>` tags
- All screens registered as `window.ScreenName = ScreenName` globals
- A `switch()` string for routing (`onNavigate("hub")`)
- Prop-drilled `runState` / `setRunState` for session state
- Tailwind pulled from CDN, config inlined per HTML file
- Zero persistence, hardcoded question arrays, cosmetic auth

You are migrating this to a real Vite + React application. The visual output should be pixel-faithful to the existing prototypes — the architecture underneath changes completely.

---

## Non-Negotiable Rules

1. **Read the plan before coding.** `bolt-abacus-implementation-plan-final.md` defines wave sequencing. Do not start Wave 2 screen migrations until all Wave 1 tasks are complete and the exit gate is passed.

2. **Wave 1 exit gate:** `npm run dev` serves the app at `localhost:5173`, all 12 routes render without error, `npm test` passes.

3. **SessionContext, not location.state.** All session data (question results, config, timer) lives in `src/context/SessionContext.jsx` using `useReducer`. Never store `QuestionResult[]` arrays in `location.state` — React Router history has size limits and the data evaporates on refresh.

4. **OpenAPI spec first, then MSW mocks, then code.** The API contract lives at `src/api/openapi.yaml`. All five endpoints must be stubbed in MSW before Wave 4 frontend work begins. FE and BE develop in parallel against the same spec.

5. **Tailwind via build tool, not CDN.** Set up `tailwind.config.js` + `postcss.config.js` in Wave 1.1. Run a purge sanity check (verify all existing utility classes survive tree-shaking) before migrating any screen.

6. **Icons: Lucide only.** The current codebase uses Lucide via a `<Icon>` wrapper. The Stitch design files use Material Symbols — ignore that, it was a prototype convenience. Remove all `<span class="material-symbols-outlined">` usages. Do not install Material Symbols.

7. **Accessibility is not optional.** Run a contrast check on design tokens in Wave 1 before building any component. Every interactive element needs `aria-label`. Every new component needs keyboard navigation. Do not defer this to Wave 5.

8. **Mobile layout is designed per screen in Wave 2.** Do not build desktop-only screens and defer mobile to "a later pass." Each screen task in Wave 2 has a mobile spec — implement it then.

9. **ErrorBoundary + loading states are required.** Every TanStack Query hook usage must have an `isLoading` path (show `<SkeletonCard>`) and an `isError` path (show error message + retry button). A screen with no error handling is a bug.

10. **PathOfConquestLegacy.jsx gets a hard removal date.** When you create it, add the comment: `// TODO: delete — hard deadline Wave 5 exit. Create removal ticket before this file is committed.` Do not create open-ended legacy flags.

---

## Start Here — Wave 1 Task Order

Work through these in sequence. Do not parallelise within Wave 1.

### 1.1 — Vite + Tooling Setup
```bash
npm create vite@latest bolt-abacus -- --template react
cd bolt-abacus
npm install react-router-dom@6 lucide-react @tanstack/react-query vitest @testing-library/react msw
```

Configure in order:
- `tailwind.config.js` — content glob: `./src/**/*.{jsx,tsx,js,ts}`
- `postcss.config.js`
- `vite.config.ts` — add `resolve.alias: { '@': '/src' }`, `server.proxy: { '/v1': process.env.VITE_API_BASE_URL }`, Vitest config
- `.env.development` — `VITE_API_BASE_URL=http://localhost:3001`

Purge sanity check: copy a representative block of HTML from the existing prototype into a temp JSX file, run `npm run build`, confirm classes aren't stripped.

### 1.2 — Design Token Check
Open `bolt-abacus-design-system/project/colors_and_type.css`. Copy it to `src/styles/tokens.css`. Before writing any component, check these specific pairings for WCAG AA contrast (4.5:1 body text, 3:1 large text):
- `#facc15` (yellow) on `#131313` (background)
- `#e5e2e1` (on-surface) on `#201f1f` (surface-container)
- `rgba(255,255,255,0.05)` glass card text — this will likely fail; document and flag

### 1.3 — Module Refactor
Migrate all files from `bolt-abacus-design-system/project/ui_kits/bolt-abacus-app/` into `src/`. Convert `window.X = X` to `export default X`. Remove `window.__BOLT_DEMO__` and `demo?.skeleton` branches. Do not change any logic — this is a mechanical migration.

### 1.4 — Router
Wire react-router-dom in `App.jsx`. Routes:
```
/                    → Login (public)
/hub                 → Hub (protected, AppShell)
/learn               → LevelSelection (protected, AppShell)
/learn/:levelNum     → PathOfConquest (protected, AppShell)
/learn/:levelNum/classwork → ClassworkSession (protected, bare)
/practice            → TrainingArena (protected, AppShell)
/practice/arena      → InTheArena (protected, bare)
/practice/flashcards → FlashCardsSession (protected, bare)
/practice/zen        → ZenModeSession (protected, bare)
/report              → MissionReport (protected, AppShell)
/victory             → Victory (protected, bare)
/profile             → Profile (protected, AppShell)
/setup               → redirect to /practice
```
`ProtectedRoute` is a stub for now — just renders children. Real auth check in Wave 4.

### 1.5 — SessionContext
Create `src/context/SessionContext.jsx` with the `useReducer` shape defined in the plan. Actions: `START_SESSION`, `RECORD_RESULT`, `TICK`, `END_SESSION`. Wrap `<App>` in `<SessionProvider>`.

### 1.6 — AppShell + Navigation
Build `SidebarNav`, `BottomTabBar`, `AppShell`, `ErrorBoundary`, `SkeletonCard`. AppShell at this stage just renders the sidebar + main area — screens will be wrapped in it in Wave 2.

### 1.7 — MSW + API Spec
Write `src/api/openapi.yaml` with all 5 endpoints. Write `src/mocks/handlers.ts` with realistic stub responses for all 5. Start MSW in `main.jsx` when `import.meta.env.DEV`.

### 1.8 — Types + Constants
Write thin placeholder types in `src/types/index.ts`. Update `src/constants/levels.js` — add `rankName` to each level (INITIATE, APPRENTICE, STRIKER, CHALLENGER, WARRIOR, ELITE, CHAMPION, MASTER, GRANDMASTER, LEGEND for levels 01–10).

### 1.9 — Wave 1 Exit Gate
Verify: `npm run dev` → all 12 routes render. `npm test` → passes. No `console.error` from React. No CDN script tags remain in `index.html`. No `window.ScreenName` references remain. Commit.

---

## Key Design Decisions Reference

**Test Mode** (ClassworkSession):
- Toggle via chip in session header
- In test mode: hide Hint button, hide Skip button
- Fixed verdict tracking: if `firstAttemptWrong === true` and second answer is correct → `verdict: 'fixed'`, `fixedFrom: firstAnswer`
- Fixed is impossible in test mode (no retry shown)
- Skipped: `verdict: 'skipped'`, `given: null`

**Verdict enum:** `'correct' | 'wrong' | 'skipped' | 'fixed'`

**Level cards (LevelSelection):**
- `rankName` = primary label (large, yellow on current card)
- `topicName` = subtitle (small, muted, below rank name)
- Both fields present on every card

**TrainingArena consolidation:**
- ArenaSetup merged inline as Step 03 config panel
- State managed by `useArenaConfig` hook
- "ENTER ARENA" dispatches `START_SESSION` to `SessionContext`, then navigates
- Config panel fields shown/hidden by selected mode

**PathOfConquest accordion:**
- Each Class is a collapsible row
- Expanded: topic grid with Classwork + Homework columns per topic
- `testStatus` per topic: `'not_taken'` → "Take Test" | `'passed'` → green check | `'retake'` → "Retake"
- `homeworkUnlocked` controls whether Homework column is interactive

---

## File Reference Map

| What you want | Where to find it |
|---|---|
| Full implementation plan | `bolt-abacus-implementation-plan-final.md` |
| Gap analysis (Stitch vs current) | `bolt-abacus-stitch-adoption-plan.md` |
| Existing screen prototypes | `bolt-abacus-design-system/project/ui_kits/bolt-abacus-app/screens/` |
| Existing shared components | `bolt-abacus-design-system/project/ui_kits/bolt-abacus-app/components.jsx` |
| Design tokens | `bolt-abacus-design-system/project/colors_and_type.css` |
| Design system spec | `bolt-abacus-design-system/project/uploads/DESIGN (1).md` |
| Stitch design HTML files | `bolt-abacus-design-system/project/ui_kits/bolt-abacus-app/previews/` |
| PRD | `bolt-abacus-design-system/project/research/PRD-extracted.md` |
| Behavioral guidelines | `CLAUDE.md` |

---

## What NOT to Do

- Do not use `location.state` to pass session results between screens.
- Do not install Next.js, Remix, or any SSR framework.
- Do not add Redux, Zustand, or Jotai. `SessionContext` + TanStack Query is the full state story.
- Do not add Material Symbols or any icon library other than Lucide.
- Do not defer mobile layout work to Wave 5 — implement it in each Wave 2 screen task.
- Do not skip the Tailwind purge sanity check — silent class stripping is a multi-hour debugging rabbit hole.
- Do not write TypeScript interfaces that model backend responses before the OpenAPI spec exists.
- Do not create a legacy flag (localStorage feature flag, etc.) without a hard removal deadline noted in a comment.

---

Start with Wave 1.1. Ask if anything in the plan is ambiguous before implementing — it is cheaper to clarify than to rebuild.
