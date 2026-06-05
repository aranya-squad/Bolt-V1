# Bolt Abacus — Stitch V2 Adoption Plan
**Authored:** 2026-06-03  
**Role:** Senior Software Architect / Product Technologist  
**Scope:** End-to-end adoption of the Google Stitch "Duplicate of V1" redesign against the current `bolt-abacus-design-system` codebase  

---

## 1. Current-State Audit

### 1.1 Frontend — Screens

| Screen | File | Status |
|---|---|---|
| Login | `screens/Login.jsx` | Implemented (call-sign + 4-digit PIN; no real auth) |
| Hub | `screens/Hub.jsx` | Implemented (top nav bar, 2-portal card layout, ambient particles) |
| Level Selection | `screens/LevelSelection.jsx` | Implemented (5×2 grid, 12 levels, current/done/locked states) |
| Path of Conquest | `screens/PathOfConquest.jsx` | Implemented (vertical Duolingo-style path, class dividers, lesson nodes) |
| Training Arena | `screens/TrainingArena.jsx` | Implemented (2×2 bento grid, 4 mode cards) |
| Arena Setup | `screens/ArenaSetup.jsx` | Implemented (operation selector, 4 sliders, 4 toggles, ENTER ARENA CTA) |
| Classwork Session | `screens/ClassworkSession.jsx` | Implemented (problem card, timer, skip/hint, keyboard input) |
| Flash Cards Session | `screens/FlashCardsSession.jsx` | Implemented (designed best-guess; not in original Figma) |
| Zen Mode Session | `screens/ZenModeSession.jsx` | Implemented (designed best-guess; not in original Figma) |
| In The Arena | `screens/InTheArena.jsx` | Implemented (focused session, ABANDON RUN, timer chip, XP bar) |
| Mission Report | `screens/MissionReport.jsx` | Implemented (3-stat grid, XP bar, question breakdown table — 2 verdict states) |
| Victory | `screens/Victory.jsx` | Implemented (3-stat bento, XP bar, Play Again / Arena buttons) |

### 1.2 Frontend — Shared Components (`components.jsx`)

| Component | Purpose |
|---|---|
| `AmbientScene` | Animated radial gradient blobs + dark bg |
| `TopNav` | Sticky top bar — wordmark, HudStats (⚡🔥🏆), LevelChip, Avatar, back button |
| `HudStats` | XP / Streak / Trophy display strip |
| `LevelChip` | "LEVEL 12" pill |
| `Avatar` | Circular avatar image |
| `BoltButton` | Primary / Ghost / Dark variants |
| `GlassCard` | Glassmorphic container, default/active/locked variants |
| `IconPlate` | Colored icon container for mode cards |
| `Heading / Body / Label / Page` | Typography primitives |
| `ProgressBar` | XP bar with optional marker |
| `Slider` | Arena setup parameter slider |
| `Toggle` | Arena setup rule toggle |
| `OperationButton` | +/−/×/÷ selector tile |
| `Chip / SyncDot` | Status chip; connection indicator |
| `Icon` | Lucide icon wrapper |

### 1.3 Design System (`DESIGN.md` / `colors_and_type.css`)

- **Tokens confirmed identical** between V1 and Stitch DESIGN.md — no token-level breaking change.
- CSS custom properties: `--y-bolt`, `--bg-noir`, `--font-display`, etc., defined in `colors_and_type.css`.
- Tailwind config inlined per HTML file; tokens map 1-to-1 with CSS vars.

### 1.4 Navigation / State

- `app.jsx` manages screen routing via a simple `onNavigate(screen, runState)` callback.
- No router library. No Redux/Zustand. State passed as prop drilling through `runState` / `setRunState`.
- No backend. No API layer. No auth service. All data is hardcoded or in-component.

### 1.5 Fragile / Undocumented Areas

- **Hardcoded question sets** in every session screen (e.g., `CLASSWORK`, `ZEN_PROBLEMS`, `PROBLEMS`). Any backend integration will require ripping these out.
- **No persistence.** XP, level progress, streak, session results — all are in-memory. Refresh resets everything.
- **Auth is cosmetic.** Login screen accepts any input and navigates to Hub.
- **`window.__BOLT_DEMO__`** global used for connection quality demo state — will conflict with any real global state management.
- **`window.Hub`, `window.TrainingArena`, etc.** — screens registered on `window` for the prototype app loader. This pattern is incompatible with any module bundler (Vite, Webpack, Next.js).

---

## 2. Gap Analysis — Stitch V2 vs. Current Codebase

### Legend: `✓ Keep` | `△ Modify` | `★ New` | `✗ Remove`

---

### 2.1 Navigation Architecture

| Decision | Current | Stitch V2 | Status |
|---|---|---|---|
| Primary nav pattern | `TopNav` — horizontal bar, sticky top | **Left sidebar** (desktop) + **bottom tab bar** (mobile) for Hub, Level Selection, Path of Conquest, Report screens | △ Modify — major structural change |
| Nav items | Wordmark + HUD stats + LevelChip + Avatar | Home / Learn (The Quest) / Practice (The Arena) / Profile — with active state indicator | △ Modify |
| Mobile nav | Not designed in V1 | Bottom tab bar: Home, The Quest, The Arena, Profile | ★ New |
| `TopNav` component | Used on every screen | Retained only on session screens (Classwork, Arena, In The Arena) where nav is intentionally suppressed | △ Modify (scope reduction) |

**Architect's note:** This is the single most invasive structural change. The sidebar/bottom-tab pattern affects the layout container of 7 of 12 screens. It must be treated as a layout refactor, not a style tweak. Plan for it in Wave 1.

---

### 2.2 Screen-by-Screen Reconciliation

#### Hub (`bolt_abacus_hub_reversed_colors`)

| Element | Current | Stitch V2 | Status |
|---|---|---|---|
| Background | Radial gradient ambient blobs | Same pattern, identical | ✓ Keep |
| Hero text | "WELCOME BACK, CHAMPION!" centered | Same, now with `animate-pulse` + italic | △ Minor tweak |
| Portal cards | Icon + Title + Body only | Adds **background image** (photo) with grayscale/ungrayscale hover, gradient overlay | △ Modify — image sourcing needed |
| Layout | Full-screen, centered content | Same grid layout, now inside sidebar layout wrapper | △ Modify (wrapper only) |
| HUD stats | In TopNav right slot | Removed from top nav area on Hub; sidebar shows avatar + level only | △ Modify |

#### Level Selection (`level_selection_with_sidebar_and_ranks`)

| Element | Current | Stitch V2 | Status |
|---|---|---|---|
| Page header | "PATH OF CONQUEST" centered | Same | ✓ Keep |
| Level grid | 5-column grid, level # + topic name | **Level rank names** replacing topic names (INITIATE, APPRENTICE, STRIKER, CHALLENGER, WARRIOR, ELITE, CHAMPION, MASTER, GRANDMASTER, LEGEND) | △ Modify — data model change |
| Level card states | Done / Current / Locked | Same 3 states, same visual treatment | ✓ Keep |
| Advanced levels section | Levels 11–12 with "ADVANCED REALMS" divider | Not visible in Stitch screen (may be out of viewport or deferred) | ✓ Keep as-is, monitor |

**Architect's note on rank names:** The Stitch design replaces curriculum topic names (e.g., "THE LITTLE FRIEND") with gamified rank labels (INITIATE → LEGEND). This is a **product decision with backend implications** — if any API will store or surface `levelName`, it needs to know which schema wins. Flag for product sign-off before engineering touches it.

#### Path of Conquest (`path_of_conquest_class_dashboard_redesign`)

| Element | Current | Stitch V2 | Status |
|---|---|---|---|
| Layout pattern | Vertical node path (Duolingo-style circles + connecting line) | **Accordion/card layout** — each Class is a collapsible row; expanded class shows Classwork + Homework topic grid | △ Modify — significant UX pattern change |
| Class header | Horizontal divider pill "CLASS 1 — 3/4" | Horizontal row with "Class N", "Let's Go!", "Report" button, expand/collapse chevron | △ Modify |
| Lesson nodes | Circular 64×64 nodes connected by vertical line | **Topic grid inside expanded class card** — Classwork (Try Again / Take Test) + Homework per topic | △ Modify — layout and interaction completely different |
| Active lesson expansion | Single expanded card below active node | Entire Class row expands to show full topic matrix | △ Modify |
| Homework unlock | Shown as ghost button on lesson card | Separate "Homework" column in topic grid, unlocks per-topic | △ Modify — data model impact |
| Classes 6–7 | Always shown as locked nodes | Shown as collapsed rows with lock icon; no topics visible | ✓ Keep (same logical state, different visual) |

**Architect's note:** The vertical node path → accordion pattern is a meaningful UX regression risk. The original Duolingo pattern communicates *linear progression* clearly. The accordion can make it feel like a content directory rather than a journey. Push back with design and validate with a teacher/parent in a prototype review before committing engineering time.

#### Training Arena (`the_training_arena_protocol_selection`)

| Element | Current | Stitch V2 | Status |
|---|---|---|---|
| Layout | 2×2 bento grid, separate ArenaSetup screen for config | **Single-screen setup** — operation selector + mode selector + configuration all inline, ArenaSetup screen merged in | △ Modify — screen consolidation |
| Operation selector | In ArenaSetup only | Moved to Training Arena as step 01 | △ Modify |
| Mode selection | 4 mode cards (tap to navigate) | 3 checkmark-selectable styles (Flash Cards, No Rush, Time Attack); Custom Challenge ("The Lab") appears to be removed or merged | △ Modify — "The Lab" fate unclear |
| Configuration panel | Full ArenaSetup screen (4 sliders + 4 toggles) | Inline below mode selector, same fields, contextually filtered by mode | △ Modify |
| Personal Best widget | Not present | "PERSONAL BEST 14.2s / Flash +12% XP" stat chip | ★ New — requires stored historical data |
| Bottom mobile nav | Not present | Shows: Home / The Quest / The Arena / Profile | ★ New |

**Architect's note on "The Lab":** The Stitch Training Arena screen shows only 3 modes with checkmarks, no "Custom Challenge / The Lab" card. Either The Lab was folded into the Configuration panel (if all 3 modes share the same config), or it was cut. This needs explicit product clarification before ArenaSetup.jsx is deleted.

#### Classwork Session (`classwork_practice_1` / `classwork_practice_2`)

| Element | Current | Stitch V2 | Status |
|---|---|---|---|
| Breadcrumb | "Level X > Classwork" pill | "Level 4 / Class 2 / Topic 1 · Classwork" — deeper path context | △ Modify |
| **"Test Mode" indicator** | Not present | Appears in V2: "Test Mode" toggle/chip in header | ★ New — new mode state, product definition needed |
| Timer chip | Timer HUD (MM:SS + clock icon) | Same, repositioned | ✓ Keep |
| Progress indicator | "Q 5/30" fraction | "10 of 30" text (V2 variant shows it inline) | △ Minor tweak |
| Problem card | Glassmorphic card, vertical math layout | Same structure | ✓ Keep |
| Controls | Submit / Skip / Hint | "Skip" + "Next" (Hint removed or renamed) | △ Minor tweak |
| Sidebar nav | Not present | Left sidebar with Home / Learn / Practice nav | △ Modify (layout wrapper) |

**Architect's note on "Test Mode":** This is undefined in the PRD. A "Test Mode" toggle on a Classwork screen implies different scoring rules, no hints, possibly no skipping. This is a **new product concept** that needs spec before any implementation. Do not guess.

#### Mission Report (`classwork_report_internal_scrollbar`)

| Element | Current | Stitch V2 | Status |
|---|---|---|---|
| Stats grid | Score / Accuracy / Time (3 cards) | Same 3 cards | ✓ Keep |
| XP bar | Present | Present | ✓ Keep |
| Question breakdown table | 2 verdict states: Correct / Wrong | **4 verdict states: Correct / Wrong / Skipped / Fixed** | △ Modify — data model change |
| "Fixed" state | Not present | Orange `build` icon, "Fixed" label — implies self-correction mechanic | ★ New concept — requires product definition |
| Table scrolling | Full-page scroll | **Internal scrollable container** (`max-h-[500px] overflow-y-auto`) | △ Modify |
| Sidebar nav | Not present | Left sidebar | △ Modify (layout wrapper) |

**Architect's note on "Fixed":** A "Fixed" verdict implies the student initially got it wrong, then self-corrected within the session. This requires tracking *intermediate* answer states per question — the current `results[]` array only stores a single `given` value. This is a data model change that affects both frontend session logic and any future backend API schema.

#### Victory (`victory`)

| Element | Current | Stitch V2 | Status |
|---|---|---|---|
| Header | "VICTORY!" hero text + mode label | Same | ✓ Keep |
| Stats bento | Accuracy / Score / Avg Speed | Same 3 stats with same layout | ✓ Keep |
| XP bar | Present | Present | ✓ Keep |
| Action buttons | "PLAY AGAIN" (primary) + "ARENA" (ghost) | "Play Again" + "Arena" — same intent | ✓ Keep |
| No sidebar | Correct — session results screen should suppress nav | No sidebar in Stitch Victory either | ✓ Keep |

#### Not in Stitch (Current screens with no Stitch counterpart)

| Screen | Current Status | Recommendation |
|---|---|---|
| `ArenaSetup.jsx` | Standalone screen | Merge content into Training Arena; keep component logic, remove as route |
| `Login.jsx` | Standalone screen | No Stitch equivalent — keep until real auth is designed |
| `InTheArena.jsx` | Active practice session | No Stitch counterpart shown — keep as-is |
| `ZenModeSession.jsx` | Zen mode session | No Stitch counterpart shown — keep as-is |
| `FlashCardsSession.jsx` | Flash cards session | No Stitch counterpart shown — keep as-is |

---

### 2.3 New Items (Must Be Built from Scratch)

| Item | Category | Notes |
|---|---|---|
| Left sidebar nav component | Frontend | Desktop: 64px collapsed or 256px expanded; active state per route |
| Bottom tab bar component | Frontend | Mobile: 4 tabs — Home / The Quest / The Arena / Profile; safe-area-aware |
| Sidebar layout wrapper | Frontend | Replaces `<Page>` as outermost layout shell for all non-session screens |
| "Test Mode" feature | Frontend + Backend | Toggle state, scoring rule changes, hint suppression — needs spec |
| "Fixed" verdict state | Frontend + Backend | Per-question self-correction tracking; `results[]` schema change |
| Personal Best widget | Frontend + Backend | Requires persisted historical session data per user per mode |
| Background image assets for Hub portal cards | Design / Infra | 2 photographic images needed; must be CDN-hosted or bundled |
| Level rank names data | Backend / Data | INITIATE → LEGEND mapping per level; replaces or augments topic names |
| Profile screen | Frontend | Nav links to "Profile" on mobile/sidebar but no screen exists in either V1 or Stitch |

---

### 2.4 Remove / Deprecate

| Item | Risk |
|---|---|
| `ArenaSetup.jsx` as standalone route | Low — merge content into Training Arena; no data retention concern |
| `TopNav` as universal layout component | Medium — must remain for session screens; remove from non-session screens carefully to avoid visual regression |
| Vertical node path in `PathOfConquest.jsx` | Low visual, **medium UX risk** — validate with users before removing; consider feature-flagging |
| `window.Hub` / `window.*` screen registration pattern | Blocker for any bundler adoption — must be resolved if migrating to React/Vite/Next |

---

## 3. Risk & Dependency Callouts

### 3.1 Breaking Changes

| Change | Risk Level | Mitigation |
|---|---|---|
| Sidebar/bottom-tab layout wrapper | **High** — touches every non-session screen's DOM structure | Build layout wrapper first, migrate screens one by one behind a feature flag |
| `results[]` schema gaining "Fixed" and "Skipped" states | **High** — any future API contract built on the current 2-state model breaks | Define schema v2 now; version the session result payload |
| Level name model (topic names → rank names) | **Medium** — ambiguous whether these replace or coexist with topic names | Product must decide; freeze the data model before frontend touches level cards |
| Training Arena consolidation (removing ArenaSetup route) | **Low** — purely additive UX; old route can redirect | Implement consolidation after Training Arena rework is stable |

### 3.2 Data / Persistence (Pre-Backend)

There is currently **zero persistence.** Before any backend sprint:

- Define the canonical **session result payload** now (including "Fixed"/"Skipped" states, Test Mode flag, topic/class/level hierarchy path).
- Define the **user progress schema** (level unlock state, XP total, streak, personal best per mode).
- Define the **level data schema** (level number, rank name, topic name, class count, lesson count).

Building these contracts on paper first — even as TypeScript interfaces in a `types/` file — unblocks parallel FE/BE work.

### 3.3 Cross-Cutting Concerns

**Auth:** Login is cosmetic. If "Test Mode" implies teacher-initiated sessions, that introduces a role model (student vs. teacher) that affects the entire auth design. Clarify before writing any auth code.

**Accessibility:** The sidebar introduces focus-trap requirements when open on mobile. The bottom tab bar needs `aria-label` on every tab. The "Fixed"/"Skipped" verdict states need screen-reader announcements. None of these are in the Stitch prototype — they must be designed in.

**Responsive / Mobile:** Stitch introduces mobile for the first time (bottom tab bar). The current codebase has zero mobile breakpoints. This is a meaningful new scope addition — estimate it separately and do not let it block desktop delivery.

**Performance:** Background images on Hub portal cards introduce the first non-icon assets. Establish a lazy-loading and `srcset` pattern from day one rather than retrofitting it.

**Icon library swap:** V1 uses Lucide icons (custom `<Icon>` wrapper). Stitch HTML uses Google Material Symbols (`<span class="material-symbols-outlined">`). These are different libraries with different APIs and subset coverage. Pick one and standardize across the codebase — do not run both.

**"The Lab" / Custom Challenge fate:** Stitch Training Arena shows 3 selectable modes and omits the purple "Custom Challenge" card. If The Lab is cut, `ArenaSetup.jsx` and the `lab` navigation path can be removed. If it's kept as an inline config, the component logic must be refactored in-place. This decision gates the Training Arena wave.

### 3.4 What Blocks Parallel FE/BE Work

- **Session result schema must be finalized before** Classwork Session, Mission Report, or any backend session API is touched.
- **Level data schema must be finalized before** Level Selection or Path of Conquest screens are rebuilt.
- **"Test Mode" must be specced before** Classwork Session is modified.
- **Profile screen must be designed before** the bottom tab bar links to it (currently a dead link in Stitch).

---

## 4. Wave-Based Execution Plan

> **Wave cut rationale:**
> - Wave 1: Foundation changes that unblock everything else (layout shell, schema contracts, icon decision).
> - Wave 2: High-traffic, high-visibility screens — the ones students hit every session.
> - Wave 3: Setup and results screens — correct but less urgent.
> - Wave 4: New capabilities that require backend data (Personal Best, Test Mode, Fixed state).
> - Wave 5: Mobile, polish, and cleanup.

---

| Wave | Category | Task | Priority |
|---|---|---|---|
| 1 | Design System | Decide on a single icon library: Lucide (current) vs. Material Symbols (Stitch). Remove the losing library. Create a `<BoltIcon>` adapter if switching so callsites don't all change at once. | High |
| 1 | Design System | Replace all `window.ScreenName = ScreenName` global registrations with ES module exports. This is a prerequisite for any bundler migration and prevents namespace collisions. | High |
| 1 | Frontend | Build `SidebarLayout` component: left 256px sidebar (desktop), collapsible to icon-only; includes wordmark, nav links (Home / The Quest / The Arena / Profile), avatar + level at bottom. | High |
| 1 | Frontend | Build `BottomTabBar` component: 4-tab mobile nav bar, safe-area-inset-bottom aware, active tab indicator, keyboard-navigable. Stub "Profile" tab to a placeholder screen. | High |
| 1 | Frontend | Build `AppShell` layout wrapper: renders `SidebarLayout` + `BottomTabBar` on non-session screens; renders bare layout on session screens (Classwork, InTheArena, etc.). Replaces current `<Page>` on non-session routes. | High |
| 1 | Docs | Define TypeScript interfaces (or JSDoc typedefs if staying vanilla JS) for: `SessionResult` (with verdict enum: correct/wrong/skipped/fixed), `UserProgress`, `LevelData`, `SessionConfig`. Commit to repo as `types/index.ts`. | High |
| 1 | Docs | Product sign-off doc: (a) rank name model — do rank names (INITIATE→LEGEND) replace or augment topic names? (b) "The Lab" — kept as inline config or cut? (c) "Test Mode" — what rules change? | High |
| 2 | Frontend | Migrate `Hub.jsx` into `AppShell`: remove `TopNav`, add portal card background images with lazy loading, apply `animate-pulse` + italic to hero heading. | High |
| 2 | Frontend | Migrate `LevelSelection.jsx` into `AppShell`: update level cards to display rank names (INITIATE → LEGEND) per product sign-off; keep done/current/locked state logic intact. | High |
| 2 | Frontend | Rebuild `PathOfConquest.jsx` as accordion layout: each Class is a collapsible row with "Let's Go!", "Report" button, expand chevron. Expanded row shows topic grid (Classwork + Homework columns per topic). Keep vertical node path behind a `FEATURE_FLAG_LEGACY_PATH` flag until validated with users. | High |
| 2 | Frontend | Rebuild `TrainingArena.jsx` as single-screen setup: inline operation selector (step 01), inline mode selector with checkmarks (step 02: Flash Cards / No Rush / Time Attack), inline configuration panel (step 03). Remove navigation to `ArenaSetup` route. | High |
| 2 | Frontend | Update `ClassworkSession.jsx` breadcrumb to show full path "Level N / Class N / Topic N · Classwork". Add "Test Mode" chip as a visual-only stub pending spec. Rename "Next" CTA per Stitch (currently "Submit"). | Med |
| 3 | Frontend | Update `MissionReport.jsx`: add "Skipped" (zinc/muted) and "Fixed" (orange) verdict states to breakdown table; make table internally scrollable (`max-h-[500px] overflow-y-auto`); migrate into `AppShell`. | High |
| 3 | Frontend | Update `MissionReport.jsx` `results[]` data shape to include `verdict: 'correct' | 'wrong' | 'skipped' | 'fixed'` and `fixedFrom?: string` (original wrong answer). Propagate change upstream through `ClassworkSession.jsx`. | High |
| 3 | Frontend | Update `ClassworkSession.jsx` session logic to track "Skipped" state (already partially implemented via `skipped` param) and "Fixed" state (re-attempt after wrong). Update `results[]` construction accordingly. | Med |
| 3 | Frontend | Add "PERSONAL BEST" stat chip to Training Arena as a UI-only stub (hardcoded value for now). Wire to real data in Wave 4. | Med |
| 3 | Frontend | Create stub `Profile.jsx` screen so the bottom tab bar "Profile" link is not a dead end. Minimal content: avatar, call-sign, level, XP total. | Med |
| 3 | Design System | Audit and remove any Lucide vs. Material Symbols remnants after icon library decision. Ensure `<BoltIcon>` or chosen wrapper is used consistently across all 12 screens. | Med |
| 3 | QA | Visual regression test pass: screenshot every screen at 1280px (desktop) and 768px (tablet breakpoint) before and after `AppShell` migration to catch layout regressions. | High |
| 4 | Backend | Design and implement `POST /sessions` endpoint: accepts `SessionResult[]` payload per `types/index.ts` contract. Returns persisted session ID. | High |
| 4 | Backend | Design and implement `GET /users/:id/progress` endpoint: returns `UserProgress` — level unlocks, XP, streak, trophy count. | High |
| 4 | Backend | Design and implement `GET /users/:id/personal-best` endpoint: returns best time, accuracy, score per practice mode. | Med |
| 4 | Backend | Design and implement `GET /levels` endpoint: returns `LevelData[]` — level number, rank name, topic name, class count, lesson count, unlock condition. | High |
| 4 | Frontend | Wire `TrainingArena.jsx` Personal Best widget to `GET /users/:id/personal-best`. Replace hardcoded stub. | Med |
| 4 | Frontend | Implement real auth: replace cosmetic Login with JWT or session-cookie auth against a real identity provider. Define whether student login (PIN) and teacher login (password) are the same flow or separate entry points. | High |
| 4 | Frontend | Wire `Hub.jsx` → `LevelSelection.jsx` → `PathOfConquest.jsx` to real `UserProgress` from API, replacing all hardcoded level/lesson states. | High |
| 4 | Frontend | Wire session screens (ClassworkSession, InTheArena, FlashCardsSession, ZenModeSession) to `POST /sessions` on completion. | High |
| 4 | Migration | Migrate TopNav HUD stats (⚡ XP, 🔥 Streak, 🏆 Trophies) from hardcoded values to live `UserProgress` data. | Med |
| 4 | Backend | Implement "Test Mode" rules engine once spec is complete: different scoring, no hints, no skips (or restricted skips), separate result storage. | Med |
| 5 | Frontend | Full mobile responsive pass: test all screens at 375px. Confirm bottom tab bar renders correctly, sidebar is hidden, session screens reflow properly on narrow viewports. | Med |
| 5 | Frontend | Remove `FEATURE_FLAG_LEGACY_PATH` and the old vertical node path code from `PathOfConquest.jsx` after user validation confirms accordion is preferred. | Low |
| 5 | Frontend | Remove `ArenaSetup.jsx` route and file after Training Arena consolidation is stable. Add redirect from any bookmarked `/setup` path to `/training`. | Low |
| 5 | Frontend | Remove `window.__BOLT_DEMO__` global and all demo-mode branching code once real data is wired in. | Low |
| 5 | QA | Full WCAG 2.1 AA audit: focus order for sidebar/bottom-tab, screen reader announcements for verdict state changes (Correct/Wrong/Skipped/Fixed), live region for timer HUD. | Med |
| 5 | Infra | Establish image CDN pipeline for Hub portal card backgrounds (and any future photographic assets). Implement `srcset` + `loading="lazy"` from the start. | Med |
| 5 | Docs | Update `CLAUDE.md` project section with final stack choice (framework, router, test runner, build command). | Low |

---

## 5. Assumptions

1. **No backend exists yet.** The current codebase is a purely frontend prototype. All backend work in Waves 4+ is net-new.
2. **Framework is staying vanilla React + HTML for now.** The `window.*` registration pattern and inline `<script>` loading suggest no bundler. Wave 1 module refactor is a prerequisite for any framework migration. If a migration to Next.js or Vite is planned, it should happen in Wave 1 — doing it later is more expensive.
3. **The Stitch file is a design iteration, not a finalized spec.** Several features (Test Mode, Fixed verdict, The Lab fate, Profile screen) appear without product definition. I've treated them as "stub now, spec later" items.
4. **Target deployment is desktop-first (1280px+), with mobile as Wave 5 scope.** This matches the PRD and the Stitch screens, where mobile is additive (bottom tab bar) rather than the primary layout.
5. **Design tokens are stable.** The Stitch DESIGN.md is identical to V1. No token-level changes were assumed.
6. **One team is working on this (not parallel FE/BE squads initially).** If two teams are running in parallel, Wave 1 schema contracts and Wave 4 backend work can be started concurrently from the start of Wave 2.

---

## 6. Top 3 Questions Before the Team Commits

**Q1 — What is "Test Mode" and what does it change?**
The Stitch Classwork screen shows a "Test Mode" chip that has no definition anywhere in the PRD or existing codebase. Before Wave 2 touches `ClassworkSession.jsx`, you need a one-pager: what rules change (hints disabled? skips blocked? separate result ledger? teacher-gated?). Building the wrong logic here will require a data migration and a re-release.

**Q2 — Do rank names (INITIATE → LEGEND) replace topic names, or coexist with them?**
The Stitch Level Selection shows INITIATE, APPRENTICE, STRIKER, CHALLENGER, WARRIOR, ELITE, CHAMPION, MASTER, GRANDMASTER, LEGEND — with no topic name visible. The PRD has explicit topic names (FOUNDATIONS, THE BIG FRIEND, etc.) confirmed by Figma. If rank names replace topic names, any curriculum content linked to topic names (PDF downloads, lesson assignments) needs a data migration. If they coexist, the card UI needs both, which changes the card layout design. Either answer is fine — but there's only one right answer and it needs to come from product + curriculum before a single line of data model code is written.

**Q3 — What is the target framework and module system?**
The current codebase loads screens from `window` globals, with Tailwind pulled from CDN and React from CDN. This is a prototype loading pattern — it cannot scale to production without a bundler. Wave 1 assumes a module refactor (ESM exports). But if the team plans to migrate to Next.js, Remix, or a Vite/React SPA, that decision shapes every subsequent architectural choice (routing library, state management, SSR vs. CSR, image optimization pipeline). Committing to a framework in the first week is 10x cheaper than migrating mid-way through Wave 2.
