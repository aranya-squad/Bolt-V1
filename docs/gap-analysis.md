# Bolt Abacus — Gap Analysis
**Date:** 2026-06-02 | **Audit pass:** 2026-06-02
**Codebase root:** `/Users/sagarshukla/Bolt_v1`
**Design files root:** `/Users/sagarshukla/Bolt_v1/design_files/`

> Items marked **[REVISED]** were corrected during the audit pass. Original claims that were wrong are struck through.

---

## Design File Catalog

### part1/ — 11 screens (all HTML + PNG)
| Directory | Screen Name | Notes |
|---|---|---|
| `bolt_abacus_hub_reversed_colors/` | Bolt Abacus – Home (reversed sidebar) | Desktop sidebar + mobile bottom nav. 2 portal cards only (no stats HUD strip — this variant is simpler than part2) |
| `classwork_practice/` | Bolt Abacus – Classwork (active session) | Full-screen, no nav. Progress bar, timer chip, math problem, Skip/Next CTAs. Breadcrumb chip "Level 4 / Class 2 / Topic 1" |
| `classwork_report_full_page_scroll/` | Bolt Abacus – Results (full-scroll table) | Sidebar layout. Mission Passed. 3-stat grid. 30-row question table: columns Verdict/Question/Your Answer. 4 verdict types: Correct (green, check_circle), Wrong (red, cancel), Skipped (zinc, do_not_disturb_on), **Fixed (orange, build)** |
| `classwork_report_internal_scrollbar/` | Bolt Abacus – Results (internal scroll) | Same as above with `max-h-[500px] overflow-y-auto` table |
| `in_the_arena/` | BOLT ABACUS – Focused Practice | No nav. Multi-row number stack (1452 / -834 / +210), large input, ENGAGE CTA, FeedbackToast (+150 XP, RECALCULATE) |
| `level_selection_with_sidebar_and_ranks_1/` | Path of Conquest – Level Selection | Desktop sidebar. 5-col grid. Levels 1–3 completed (check), Level 4 current (glow + "Current Mission"), 5–10 locked (grayscale + lock). **Rank labels: INITIATE, APPRENTICE, STRIKER, CHALLENGER, WARRIOR, ELITE, CHAMPION, MASTER, GRANDMASTER, LEGEND** |
| `level_selection_with_sidebar_and_ranks_2/` | Path of Conquest – Level Selection (hero) | Same grid + hero character illustration below the grid |
| `path_of_conquest_interactive_classes/` | Path of Conquest – Level 12 (vertical class list) | Sidebar. Vertical accordion list. Class header shows class name + "3/4 Topics Mastered". Active class expanded showing topic nodes: completed (check), active (pulsing play_arrow card), locked (dimmed). Download Materials per row |
| `path_of_conquest_vertical_classes/` | Path of Conquest – Learn (snaking nodes) | Full-width top nav. Snaking path nodes. Class dividers show progress (3/4). **Bottom nav has 4 items including Profile** |
| `the_training_arena_protocol_selection/` | Bolt Abacus – Training Arena (protocol setup) | Full-width top nav. 3 operation buttons (Addition active, Multiplication/Division disabled). 3 mode radios: Flash Cards, No Rush Mastery, Time Attack. Right-side config panel: Questions slider, Rows slider, Flash Speed slider. Personal Best chip ("14.2s / Flash, +12% XP") |
| `victory/` | Practice Results – BOLT ABACUS (Victory) | No nav. 3-stat bento (Accuracy, Score/Perfect, Speed). XP progress bar "+450 XP". Play Again + Arena buttons |

### part2/ — 6 HTML screens + 2 image-only
| Directory | Screen Name | Notes |
|---|---|---|
| `arena_setup_operation_selection/` | Practice Setup – Custom Setup | No nav. **4-tile** operation grid (+, -, ×, ÷). Sliders: Time Limit, Questions, Digits, Rows. Advanced toggles: Include Subtraction, Zig-Zag, Same Digits, Audio Mode. ENTER ARENA CTA |
| `bolt_abacus_hub/` | Bolt Abacus – Home (top-nav variant) | Top nav. 3-cell stats HUD (Streak "7 Days", Current Rank "Level 12", Total XP "4500" with icons local_fire_department / military_tech / electric_bolt). 2-portal grid (LEARN, PRACTICE ARENA). Mobile: 4-item bottom nav |
| `classwork_report_with_breakdown/` | Bolt Abacus – Results (with XP bar) | 3-stat cards + XP progress bar + 5-row table. Verdict labels: Correct/Wrong (simplified) |
| `level_selection_with_sidebar_and_ranks/` | Path of Conquest – Level Selection | Identical to part1 grids with sidebar |
| `path_of_conquest_sidebar_expanded_classes/` | Path of Conquest – Learn (sidebar accordion) | Left sidebar + collapsible class accordion. Path nodes show accuracy chips. **Decorative animated floating abacus elements in background** |
| `the_training_arena/` | Training Arena (bento card selection) | Top nav with HUD stats. **2×2 bento grid of 4 mode cards: Memory Master (Flash Cards/yellow), Zen Mode (blue), Sonic Speed (Time Attack/red), The Lab (Custom/purple)** |
| `the_left_part_of_the_reference_image.../` | Image-only: Young student character | Asset reference, no HTML |
| `the_right_part_of_the_reference_image.../` | Image-only: High-energy arena scene | Asset reference, no HTML |

### part3/ — 6 entries (image-only, no HTML)
Raw design reference images (PNG only). Duplicates of part2 images.

---

## 1. Executive Summary

### High-Level Delta
The design files represent a substantially more visual, gamified, and navigation-rich interface than what the current codebase implements. The codebase has correct domain logic, data models, and routing but the UI layer is a skeletal functional implementation.

### Magnitude of Change: **LARGE**

Top 5 risk areas (updated post-audit):
1. **Navigation shell + focus-mode routing** — ShellLayout must wrap nav-shell routes but NOT ClassworkPage or InArenaPage. Router must be split into two groups.
2. **PathOfConquestPage scope** — currently a single-button detail page; design shows multi-class accordion with per-topic rows + lesson-level API.
3. **Profile screen entirely missing** — no route, page, API, or design (last confirmed gap).
4. **QuestionAttempt schema migration** — unique constraint change is append-only model with existing production rows; two-step migration required.
5. **"Fixed" verdict** — requires multi-attempt tracking via `attempt_number` field (model change + migration).

---

## 2. Screen-by-Screen Gap Table

| Screen | Exists in Code? | Current File Path | Design Source | Gap Type | Complexity |
|---|---|---|---|---|---|
| Hub / Home | Yes | `frontend/src/features/hub/HubPage.tsx` | part2: `bolt_abacus_hub/` | Redesign — stats HUD strip, portal card blobs, remove TopNav | M |
| Level Selection | Yes | `frontend/src/features/learn/LevelSelectionPage.tsx` | part1: `level_selection_*_1/` and `_2/` | Redesign — 5-col grid, rank labels, hero illustration, glow states | L |
| Path of Conquest (accordion) | Partial | `frontend/src/features/learn/PathOfConquestPage.tsx` | part1: `path_of_conquest_interactive_classes/`; part2: `path_of_conquest_sidebar_expanded_classes/` | Near-full rebuild — current is level title + 1 CTA | XL |
| Path of Conquest (snaking path) | No | — | part1: `path_of_conquest_vertical_classes/` | New visual variant (Wave 5 progressive enhancement) | XL |
| Classwork (active session) | Yes | `frontend/src/features/learn/ClassworkPage.tsx` | part1: `classwork_practice/` | Redesign — glassmorphic ProblemCanvas, breadcrumb chip, Skip+Next CTAs | L |
| Classwork Report / Mission Report | Yes | `frontend/src/features/learn/MissionReportPage.tsx` | part1: `classwork_report_full_page_scroll/`; part2: `classwork_report_with_breakdown/` | Redesign — StatBentoCard, XP bar, Fixed verdict column | M |
| Training Arena (mode selection) | Yes | `frontend/src/features/practice/TrainingArenaPage.tsx` | part2: `the_training_arena/` | Redesign — **4 BentoModeCards** (Memory Master/Zen/Sonic Speed/The Lab) **[REVISED: was "3 cards"]** | M |
| Arena Setup (configuration) | Yes | `frontend/src/features/practice/ArenaSetupPage.tsx` | part2: `arena_setup_operation_selection/` | Redesign — ConfigSlider replaces SegmentedToggle, OperationTileGrid, advanced toggles, Flash Speed slider for FLASH_CARDS mode | M |
| In Arena (active practice) | Yes | `frontend/src/features/practice/InArenaPage.tsx` | part1: `in_the_arena/` | Redesign — ProblemCanvas, FeedbackToast, ENGAGE CTA, HUD chips | L |
| Victory (practice result) | Yes | `frontend/src/features/practice/VictoryPage.tsx` | part1: `victory/` | Redesign — 3-stat StatBentoCard (center elevated), XP bar | M |
| Login | Yes | `frontend/src/features/auth/LoginPage.tsx` | Not in designs | No design coverage | Unknown |
| Register | Yes | `frontend/src/features/auth/RegisterPage.tsx` | Not in designs | No design coverage | Unknown |
| Profile | No | Does not exist | Referenced in bottom nav across 4 screens | New screen — no design for content | XL |
| Homework session flow | No | Does not exist | Referenced in PathOfConquest accordion | New screen — partial design coverage (entry point shown, not session/report) | XL |

---

## 3. Component-Level Gaps

### New Components Needed

| Component Name | Purpose | Key Props | Wave |
|---|---|---|---|
| `Sidebar` | Persistent desktop nav | reads authStore + useLocation internally | W1 |
| `BottomNav` | Mobile 4-tab nav | reads useLocation internally | W1 |
| `ShellLayout` | Nav shell wrapper for router | wraps `<Outlet>` — no variant prop; focus-mode handled at router level | W1 |
| `LevelGridCard` | Single level card in 5-col grid | `level: Level`, `rankName: string`, `onClick?` | W2 |
| `XpProgressBar` | XP progress bar extending ProgressBar | `currentXp, levelThreshold, nextLevelThreshold` | W2 |
| `BreadcrumbChip` | Compact breadcrumb chip | `items: string[]` | W2 |
| `ClassAccordion` | Collapsible class section | `lesson: LessonWithCompletion`, `levelId: string` | W2 |
| `TopicRow` | Single classwork/homework row | `type, completed, accuracy?, locked, onStart, onDownload?` | W2 |
| `FeedbackToast` | Brief success/error overlay | `verdict: 'correct'|'wrong'|null`, `xpDelta: number` | W3 |
| `ProblemCanvas` | Glassmorphic problem container | `questionText, questionNumber, total, verdict?` | W3 |
| `StatBentoCard` | Stat card extending ResultStatTile | `value, label, valueColor?, variant: 'default'|'prominent'` | W3 |
| `BentoModeCard` | Arena mode selection card | `mode: SessionKind`, `label, description, icon, accentColor, onClick` | W4 |
| `ConfigSlider` | Slider wrapper with glass card + disabled | `label, icon?, min, max, value, onChange, suffix?, step?, disabled?, description?` | W4 |
| `AdvancedToggleRow` | Toggle wrapper with icon + section label | `label, hint?, value, onChange, icon?, sectionLabel?` | W4 |
| `OperationTileGrid` | 4-tile op selector managing selection state | `value: Op, onChange: (op: Op) => void` | W4 |
| `PathNode` | Snaking path node | `status, topicName, accuracy?` | W5 |
| `PathClassDivider` | Section divider between class groups on path | `className, progress: {done, total}` | W5 |

### **[REVISED]** Existing Components Requiring Updates

| File Path | What Changes | Audit Finding |
|---|---|---|
| `frontend/src/features/hub/HubPage.tsx` | Remove TopNav import (confirmed present), add stats HUD strip, portal blobs | **[CONFIRMED]** TopNav IS imported here |
| `frontend/src/features/learn/LevelSelectionPage.tsx` | Remove BackLink (confirmed present), replace GlassCard with LevelGridCard, 5-col grid, hero illustration `<img>` | **[CONFIRMED]** BackLink IS imported |
| `frontend/src/features/learn/PathOfConquestPage.tsx` | Full rebuild — currently just level title + 1 START CLASSWORK button + BackLink | **[CONFIRMED]** Current file is a minimal detail page |
| `frontend/src/features/learn/ClassworkPage.tsx` | Add ProblemCanvas, FeedbackToast, BreadcrumbChip. **No TopNav to remove** (it was never imported) | **[REVISED]** ClassworkPage has no TopNav import |
| `frontend/src/features/learn/MissionReportPage.tsx` | Replace ResultStatTile with StatBentoCard, add XP bar, update table for Fixed verdict | |
| `frontend/src/features/practice/TrainingArenaPage.tsx` | Replace 3-col GlassCards with **4** BentoModeCard grid | **[REVISED]** 4 modes, not 3 |
| `frontend/src/features/practice/ArenaSetupPage.tsx` | Replace SegmentedToggle with ConfigSlider/OperationTileGrid/AdvancedToggleRow; add Flash Speed slider for FLASH_CARDS mode | **[REVISED]** Flash Speed slider needed for Memory Master mode |
| `frontend/src/features/practice/InArenaPage.tsx` | Add ProblemCanvas, FeedbackToast, ENGAGE CTA | |
| `frontend/src/features/practice/VictoryPage.tsx` | Replace ResultStatTile with StatBentoCard (prominent), XP bar | |
| `frontend/src/shared/ui/Page.tsx` | Update minHeight from `calc(100vh - 77px)` to `100vh` (desktop) / `calc(100vh - var(--bottom-nav-h))` (mobile) | **[CONFIRMED]** 77px hardcoded on line 16 |
| `frontend/src/shared/ui/AttemptsTable.tsx` | Group attempts by question_index — currently shows flat rows | **[CONFIRMED]** Current impl is flat |
| `frontend/src/shared/ui/Slider.tsx` | **Add** `disabled?: boolean` and `description?: string` props (these do NOT currently exist) | **[REVISED]** Props are absent, must be added not just used |
| `frontend/src/shared/ui/Toggle.tsx` | **Add** `icon?: string` slot and `sectionLabel?: string` prop (these do NOT currently exist) | **[REVISED]** Props are absent, must be added |
| `frontend/src/shared/ui/AmbientScene.tsx` | **Add** `body.focus-mode` class detection — currently absent | **[REVISED]** AmbientScene does NOT currently detect focus-mode |
| `frontend/src/router.tsx` | Split protected routes into nav-shell group and focus-shell group; add `/profile` route | |
| `backend/apps/courses/management/commands/seed_levels.py` | Update xp_threshold values to match data migration — currently hardcodes 0 | **[REVISED]** seed_levels.py explicitly sets xp_threshold=0; must be updated alongside migration |

### Components to Deprecate

| File Path | Deprecated After | Reason |
|---|---|---|
| `frontend/src/shared/ui/TopNav.tsx` | Wave 1 | Sidebar + BottomNav replace it |
| `frontend/src/shared/ui/BackLink.tsx` | Wave 2 | Sidebar provides navigation context |
| `frontend/src/shared/ui/SegmentedToggle.tsx` | Wave 4 | ConfigSlider + OperationTileGrid replace its uses in ArenaSetupPage |

---

## 4. Flow-Level Gaps

### Student — Learn Flow

**Current flow:**
`/hub` → `/learn` (level grid) → `/learn/level/:id` (title + CTA) → `/learn/level/:id/classwork` → `/learn/level/:id/report/:sessionId`

**Design flow:**
`/hub` → `/learn` (level grid) → `/learn/level/:id` (class accordion) → `/learn/level/:levelId/lesson/:lessonId/classwork` → `/learn/level/:levelId/lesson/:lessonId/report/:sessionId`

New steps: Topic-scoped routing, "Next Mission" CTA advancing to next lesson, Download Materials per lesson.

### Student — Practice (Arena) Flow

**Current flow:**
`/practice` (3 mode cards) → `/practice/setup/:mode` → `/practice/session/:sessionId` → `/practice/victory/:sessionId`

**Design flow:**
`/practice` (4 bento cards) → `/practice/setup/:mode` (mode-scoped config) → `/practice/session/:sessionId` → `/practice/victory/:sessionId`

### Profile Flow — New
No current implementation. `/profile` route does not exist.

### Homework Flow — New (Partial Design Coverage)
PathOfConquest shows Homework rows per lesson. No homework session screen or homework results screen is designed. Backend has SessionKind.HOMEWORK and ExerciseTemplate with kind=HOMEWORK. Frontend flow is entirely missing.

### Teacher / Admin / Guardian Flows
No design coverage. Backend models (Role enum, Class, Enrollment, Guardianship) are complete. No frontend work triggered.

---

## 5. Design System Gaps

### **[REVISED]** Token Deltas

| Token Area | Design HTML | Codebase | Gap |
|---|---|---|---|
| Body font | `"Inter"` only in design HTML | `"Lexend", "Inter"` in CSS var AND **Lexend IS loaded in index.html** | No gap — Lexend is intentionally loaded. Design HTML just doesn't reference it explicitly. |
| Display numbers font | Plus Jakarta Sans (display-lg) | JetBrains Mono in `--font-mono` | Classwork/Arena numbers use mono; design uses display font. Visual difference. |
| Spacing `3xl`/`4xl` | `3xl: 96px`, `4xl: 128px` in path designs | Not in token set | Add `--s-3xl: 96px`, `--s-4xl: 128px` |
| Border radius | Design uses `rounded-2xl` (≈16px) | `--r-xl: 24px` | Minor mismatch on largest cards |

### Level Rank Name System **[NEW — NOT IN ORIGINAL ANALYSIS]**

The designs display rank labels (INITIATE, APPRENTICE, STRIKER, CHALLENGER, WARRIOR, ELITE, CHAMPION, MASTER, GRANDMASTER, LEGEND) that do NOT correspond to `Level.name` in the database ("Foundations", "The Big Friend", etc.). This requires a frontend constant:

```typescript
// frontend/src/shared/lib/rankNames.ts
export const RANK_NAMES: Record<number, string> = {
  1: "INITIATE", 2: "APPRENTICE", 3: "STRIKER", 4: "CHALLENGER",
  5: "WARRIOR", 6: "ELITE", 7: "CHAMPION", 8: "MASTER",
  9: "GRANDMASTER", 10: "LEGEND"
};
```

This constant is used in LevelGridCard and Sidebar (user's rank label).

### Iconography

Designs use Google Material Symbols Outlined. Codebase uses Lucide React. **Decision: Lucide stays.** Mapping for Hub stats:

| Design icon (Material) | Lucide equivalent | Used in |
|---|---|---|
| `electric_bolt` | `zap` | XP stat |
| `local_fire_department` | `flame` | Streak stat |
| `military_tech` | `trophy` | Rank/levels stat |

Already mapped in existing `HudStatTile.tsx` — no new work needed.

### Asset Needs

| Asset | Used In | Status |
|---|---|---|
| Hero character illustration | LevelSelectionPage (below grid) | Not in codebase — needs a static image asset in `frontend/public/` |
| Decorative animated abacus | PathOfConquest background (part2) | Not in codebase — CSS+JS animated SVG, Wave 5 enhancement |

---

## 6. UX Pattern Gaps

### Navigation Changes (Updated Post-Audit)

| Pattern | Current Code | Design | Fix |
|---|---|---|---|
| Desktop nav | `TopNav` (horizontal) | Left sidebar 240px | ShellLayout with Sidebar |
| Mobile nav | None | 4-item BottomNav | ShellLayout with BottomNav |
| **Focus screens (Classwork, InArena)** | No nav suppression needed (no nav exists) | No nav shown — "clean" mode | **Router-level grouping: focus routes excluded from ShellLayout** |
| Profile link | Does not exist | 4th nav item | New route + ProfilePage |
| Back navigation | BackLink component | Sidebar provides context; "Abandon Run" button in focus screens | BackLink deprecated after Wave 2 |

### **[NEW]** Missing States — Not Addressed in Original Plan

The following states are visible in designs or required for a production app but have NO tickets:

**Loading states needed:**
- PathOfConquestPage: skeleton while fetching lessons API
- ProfilePage: skeleton while loading user data
- MissionReportPage: already has `useSessionReport` which can show skeleton

**Error states needed:**
- PathOfConquestPage: "Failed to load lessons. Retry." when W2-B02 endpoint fails
- LevelSelectionPage: already has error handling but no visual spec

**Empty states needed:**
- PathOfConquestPage: level with no lessons loaded (edge case)
- HubPage: new user with 0 XP and 0 streak

---

## 7. Backend / API Implications

### New Data Requirements

| Requirement | Design Evidence | Current Backend Coverage |
|---|---|---|
| Per-lesson completion state | PathOfConquest accordion topic rows | `LevelCompletion` is level-granular. `LessonCompletion` model does not exist |
| Homework unlock logic | Locked homework row until classwork done | No unlock predicate exists |
| Topic progress percentage | "75% Progress", "98% Accuracy" chips | No per-lesson accuracy in any endpoint |
| Download materials per lesson | "Download Materials" per topic row | `Material` model exists but FK is on `Level`, not `Lesson`. No endpoint |
| Profile PATCH | Profile page edit | No PATCH endpoint on `MeView` — GET only |
| XP progress toward next level | XP progress bar in report + profile | No `xp_to_next_level` computed field. `Level.xp_threshold` is stubbed at 0 |
| Next lesson navigation | "Next Mission" CTA | No "next lesson" relationship in API |
| **Personal Best per mode** | "PERSONAL BEST 14.2s / Flash" chip in Training Arena | **No endpoint exists. `ProgressRecord` exists but no per-mode aggregation endpoint.** |

### New Endpoints Needed

| Endpoint | Purpose | Priority | Wave |
|---|---|---|---|
| `GET /levels/{id}/lessons/` | Lessons + per-user completion state | P0 | W2-B02 |
| `POST /levels/{id}/lessons/{lessonId}/classwork/start/` | Lesson-scoped classwork start | P0 | W2-B03 |
| `POST /levels/{id}/lessons/{lessonId}/homework/start/` | Homework session start | P1 | W4+ |
| `GET /me/xp-progress/` | XP progress toward next level | P1 | W3-B02 |
| `PATCH /me/profile/` | Update display_name, avatar_url | P2 | W4-B01 |
| `GET /me/avatar-presets/` | Return allowlisted avatar URLs | P2 | W4-B01 |
| **`GET /me/personal-bests/`** | Per-mode personal best stats | P2 | **[NEEDS PRODUCT INPUT]** — see §8 |

---

## 8. Risks and Open Questions

### **[NEEDS PRODUCT INPUT]** — Decision Required Before Build

1. **Personal Best chip in Training Arena:** The `the_training_arena_protocol_selection/` design shows a "PERSONAL BEST 14.2s / Flash, +12% XP" chip on the Training Arena screen. This requires a new backend endpoint aggregating best session stats per mode per user. Is this required for MVP Training Arena, or can it be deferred? *If deferred, the chip is hidden and the rest of the screen ships without it.*

2. **Flash Speed slider:** The part1 design shows a Flash Speed (0.1–2.0s) slider specific to Flash Cards (Memory Master) mode. The part2 design (`arena_setup_operation_selection/`) does not show this slider. Since part2 is the canonical ArenaSetupPage, does Flash Speed need to appear when mode=FLASH_CARDS? *If yes, add as a conditional ConfigSlider in ArenaSetupPage. If no, omit.*

3. **PathOfConquest: accordion vs snaking path as launch-day default.** Wave plan defers snaking path to Wave 5 as progressive enhancement. Confirm: accordion is the launch-default and snaking path ships as `?view=path` query param behind no formal feature flag.

4. **"Fixed" verdict product definition.** "Fixed" = student submitted a wrong answer then submitted the correct answer on a re-attempt within the same session. Confirm this definition before W3-B01 migration is designed.

5. **Homework session design.** PathOfConquest shows Homework rows per lesson but no Homework active session screen or Homework results screen is designed. Confirm whether homework sessions reuse ClassworkPage/MissionReportPage, or if new screens are needed.

6. **Decorative abacus animation** (part2 `path_of_conquest_sidebar_expanded_classes/`). This uses JS-generated floating SVG abacus elements. Is this required at PathOfConquest launch, or is it a Wave 5 polish item?

### Technical Risks

1. **Router split (ShellLayout vs focus routes):** Splitting protected routes into nav-shell and focus-shell groups in `router.tsx` touches all route definitions. High-blast-radius change — see W1-T04 in implementation plan.

2. **QuestionAttempt migration:** Two-step migration mandatory. Do not collapse. See W3-B01.

3. **N+1 on lessons API:** `GET /levels/{id}/lessons/` risks 80+ queries if completion lookups happen in a loop. Must use queryset + dict pattern.

4. **Level.xp_threshold seed_levels.py conflict:** W3-B03 adds a data migration to populate thresholds. But `seed_levels.py` explicitly sets `xp_threshold=0`. If seed is re-run after the migration, all thresholds reset to 0. The seed command must be updated in the same sprint as the migration.

### Missing Design Coverage

- Login screen (no design)
- Register screen (no design)
- Homework active session and results (no design)
- Profile screen content (referenced in nav, no interior design)
- Error / 404 screen (no design)
- Onboarding / first-time user flow (no design)
- Guardian consent flow (no design)
- Teacher dashboard (no design)
- Connection quality / offline screen (referenced by ConnectionChip — no design)
- Personal Best data display (chip shown, no backing screen or API spec)
