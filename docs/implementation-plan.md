# Bolt Abacus — Implementation Plan (Corrected)
**Date:** 2026-06-02 | **Audit pass:** 2026-06-02
**Prerequisite:** Read `docs/gap-analysis.md` first.
**Codebase root:** `/Users/sagarshukla/Bolt_v1`

> **Audit corrections applied.** Every ticket has been verified against actual file contents. `[STALE - CORRECTED]` marks items that were wrong in the original plan. `[NEEDS PRODUCT INPUT]` marks unresolved decisions.

---

## Audit Correction Summary

| # | Original Plan Claim | Actual State | Fix Applied |
|---|---|---|---|
| 1 | Slider.tsx has `disabled` + `description` props | Neither prop exists | W4-C01: ADD props to Slider.tsx before wrapping |
| 2 | Toggle.tsx has `icon` + `sectionLabel` props | Neither prop exists | W4-C02: ADD props to Toggle.tsx before wrapping |
| 3 | AmbientScene detects `body.focus-mode` | No such detection in file | W5-T05: ADD focus-mode detection |
| 4 | ClassworkPage has TopNav to remove | ClassworkPage never imported TopNav | W3-T04: removed "remove TopNav" from DoD |
| 5 | ShellLayout wraps ALL protected routes | ClassworkPage + InArenaPage must have NO nav | W1-T04: router split into nav-shell + focus-shell groups |
| 6 | TrainingArena has 3 mode cards | Design shows 4 (Memory Master, Zen, Sonic Speed, The Lab) | W4-T02: 4 BentoModeCards |
| 7 | LevelSerializer exposes lessons | LevelSerializer has zero lesson data | W2-B02: entirely new serializer needed |
| 8 | Level rank names come from Level.name API | Level.name = "Foundations" etc., not rank labels | Add `RANK_NAMES` constant to frontend |
| 9 | seed_levels.py agnostic to xp_threshold | Explicitly sets xp_threshold=0 | W3-B03: update seed command alongside migration |
| 10 | Hero illustration mentioned nowhere in LevelSelection ticket | LevelSelection designs clearly show character below grid | W2-T04: add hero img to ticket |
| 11 | W4 had two tickets both numbered T02 | ID collision | Renumbered: components = W4-C0x, screens = W4-T0x |
| 12 | Personal Best chip not addressed | Visible in part1 Training Arena design | Added to risk/decisions — [NEEDS PRODUCT INPUT] |
| 13 | Loading/error/empty states absent from all tickets | Zero tickets for any of these | Added to DoD of relevant tickets |
| 14 | Flash Speed slider not addressed | Visible in part1 design for Flash Cards mode | [NEEDS PRODUCT INPUT] — see below |

---

## 1. Phased Rollout

### Phase 1 — Shell & Navigation (Architectural Foundation)
**Goals:** Persistent navigation shell in place. Nav-shell routes render Sidebar + BottomNav. Focus routes (active sessions) render clean with no nav. All existing page functionality preserved.

**Screens / Components:** `Sidebar`, `BottomNav`, `ShellLayout`, router split, `/profile` placeholder

**Acceptance Criteria:**
- Desktop (≥1024px): Sidebar visible on Hub, Learn, Practice, Profile routes
- Desktop: Sidebar hidden on ClassworkPage and InArenaPage (focus routes)
- Mobile (<1024px): BottomNav visible on Hub, Learn, Practice, Profile routes
- Mobile: BottomNav hidden on ClassworkPage and InArenaPage
- Active nav item highlights correctly on all routes
- Sidebar profile strip shows display_name and level from `useMe()` cache
- No layout shift, no 404s, no broken layouts

**Estimated Duration:** 3–4 days

---

### Phase 2 — Core Learning Screens + Lesson API
**Goals:** Hub, LevelSelection, and PathOfConquest (accordion) redesigned. Backend delivers lesson-level completion data. This is the highest-traffic user path.

**Screens / Components:** `LevelGridCard`, `XpProgressBar`, `BreadcrumbChip`, `ClassAccordion`, `TopicRow`, `HubPage`, `LevelSelectionPage`, `PathOfConquestPage`, `RANK_NAMES` constant. Backend: `LessonCompletion`, lessons endpoint, lesson-scoped classwork start.

**Acceptance Criteria:**
- Hub shows live Streak/Rank/XP tiles; portal cards updated
- Level grid renders 5-col at desktop, 2-col at mobile; rank labels correct; hero illustration renders
- PathOfConquest shows all lessons as accordion; classwork/homework rows show status; locked rows non-interactive
- Classwork start uses lesson-scoped endpoint
- All screens have loading skeletons and error states

**Estimated Duration:** 6–8 days (frontend + backend concurrent)

---

### Phase 3 — Session Screens + "Fixed" Verdict Backend
**Goals:** Active learning loop — session → answer → report — fully redesigned. Schema migration for multi-attempt tracking ships. XP progress endpoint lands.

**Screens / Components:** `FeedbackToast`, `ProblemCanvas`, `StatBentoCard`, `ClassworkPage`, `MissionReportPage`. Backend: `QuestionAttempt` migration, xp_threshold data migration, XP progress endpoint.

**Acceptance Criteria:**
- Classwork uses ProblemCanvas + FeedbackToast; BreadcrumbChip shows context
- Multiple attempts per question tracked (Fixed verdict derivable client-side)
- MissionReport shows StatBentoCard, grouped attempts table, Fixed verdict row type
- XP progress bar shows in report screens
- W3-B01 migration dry-run verified on staging before production deploy

**Estimated Duration:** 6–8 days

---

### Phase 4 — Arena Screens + Profile MVP
**Goals:** Practice Arena fully redesigned; Profile screen ships. Runs in parallel with Phase 3 backend.

**Screens / Components:** `BentoModeCard`, `ConfigSlider`, `AdvancedToggleRow`, `OperationTileGrid`, `TrainingArenaPage`, `ArenaSetupPage`, `InArenaPage`, `VictoryPage`, `ProfilePage`.

**Acceptance Criteria:**
- TrainingArena renders 4 BentoModeCards; mode selection routes to ArenaSetup
- ArenaSetup uses ConfigSlider for all numeric params; OperationTileGrid for op selection; SegmentedToggle has zero imports
- InArena uses ProblemCanvas + FeedbackToast
- VictoryPage uses StatBentoCard (prominent center)
- Profile: display_name editable and saves; avatar picker uses server-side presets; XP bar shows progress

**Estimated Duration:** 6–8 days

---

### Phase 5 — Polish, Accessibility + Snaking Path
**Goals:** Progressive enhancement. Snaking path node system. Deprecation sweep. Accessibility audit. Visual regression baseline.

**Estimated Duration:** 4–5 days

---

## 2. Workstream Breakdown

```
[W1] Design System + Tokens
     ├── CSS vars: --sidebar-w, --bottom-nav-h (W1-T01)
     ├── Frontend constant: RANK_NAMES map (W2-T01)
     └── spacing 3xl/4xl tokens (add to W1-T01 scope)

[W2] Navigation Shell
     ├── Sidebar (W1-T02)
     ├── BottomNav (W1-T03)
     └── ShellLayout + router split (W1-T04)

[W3] Shared Components
     ├── Wave 2: LevelGridCard, XpProgressBar, BreadcrumbChip, ClassAccordion, TopicRow
     ├── Wave 3: FeedbackToast, ProblemCanvas, StatBentoCard
     └── Wave 4: BentoModeCard, ConfigSlider, AdvancedToggleRow, OperationTileGrid

[W4] Backend
     ├── W2: LessonCompletion model, GET /lessons/, POST lesson classwork start
     ├── W3: QuestionAttempt migration, Level.xp_threshold data migration, GET /me/xp-progress/
     └── W4: PATCH /me/profile/, GET /me/avatar-presets/

[W5] Screen Redesigns (per wave)
     ├── Wave 2: HubPage, LevelSelectionPage, PathOfConquestPage
     ├── Wave 3: ClassworkPage, MissionReportPage
     └── Wave 4: TrainingArenaPage, ArenaSetupPage, InArenaPage, VictoryPage, ProfilePage

[W6] Polish / QA
     ├── Deprecation sweep (TopNav, BackLink, SegmentedToggle)
     ├── PathNode + PathClassDivider (snaking path)
     ├── AmbientScene focus-mode detection
     ├── Accessibility audit
     └── Visual regression baseline
```

---

## 3. Per-Item Tickets

### WAVE 1 — Shell & Navigation

---

**W1-T01 — CSS dimension tokens + Page.tsx minHeight fix**

- Modify: `frontend/src/styles/colors_and_type.css` — add `--sidebar-w: 240px`, `--bottom-nav-h: 64px`, `--s-3xl: 96px`, `--s-4xl: 128px`
- Modify: `frontend/src/shared/ui/Page.tsx` line 16 — update `minHeight: calc(100vh - 77px)` → `calc(100vh)` (TopNav gone; BottomNav uses padding-bottom on shell wrapper, not Page)
- Reuses: existing `--s-*` pattern in `colors_and_type.css`
- Complexity: S | Backend: No
- DoD:
  - New vars in `:root`
  - Existing pages visually unchanged after change (regression check at 1440px)
  - `grep -r "calc(100vh - 77px)" src/` returns zero results
- Blocks: W1-T02, W1-T03

---

**W1-T02 — Create `Sidebar` component**

- Create: `frontend/src/shared/ui/Sidebar.tsx`
- Reuses: `Icon.tsx` (home, book-open, gamepad-2, user), `Avatar.tsx`, `GlassCard.tsx` (nav item hover surface)
- No props — reads `useLocation()` and `authStore` directly to avoid prop drilling
- Layout: `position: fixed; left:0; top:0; width: var(--sidebar-w); height:100vh; display: none` on mobile (< 1024px via media query)
- Four nav items: Hub (`/hub`), Learn (`/learn`), Arena (`/practice`), Profile (`/profile`)
- Active state: yellow left-border + yellow icon color via `.sidebar-active` CSS class (add to globals.css)
- Bottom: `Avatar` (24px) + display_name + `Level {current_level}` strip — data from `useMe()` (already cached)
- BOLT ABACUS wordmark at top
- Complexity: M | Backend: No
- DoD:
  - Renders at ≥1024px; `display:none` below 1024px
  - Active route highlighted on navigation
  - `role="navigation"` + `aria-label="Main navigation"` + `aria-current="page"` on active item
  - Keyboard tab order through nav items is logical
- Blocks: W1-T04

---

**W1-T03 — Create `BottomNav` component**

- Create: `frontend/src/shared/ui/BottomNav.tsx`
- Reuses: `Icon.tsx`, same 4 routes as Sidebar
- Layout: `position: fixed; bottom:0; left:0; right:0; height: var(--bottom-nav-h); display: none` at ≥1024px
- `padding-bottom: env(safe-area-inset-bottom)` for iPhone notch
- Background: `rgba(19,19,19,0.85)` + `backdrop-filter: blur(40px)`
- Active tab: yellow icon + yellow label; inactive: `--fg-sand`
- Complexity: S | Backend: No
- DoD:
  - Renders on mobile only; `display:none` at ≥1024px
  - Active tab correct on all 4 routes
  - Each button has `aria-label`
  - Safe-area padding applied
- Blocks: W1-T04

---

**W1-T04 — Create `ShellLayout` + split router into nav-shell and focus-shell groups**

> ⚠️ Highest-risk frontend commit. Branch from main. 2-person review. Merge only after Playwright smoke test passes.

- Create: `frontend/src/features/shared/ShellLayout.tsx`
  - Renders: `<Sidebar>` + `<main style={{ marginLeft:'var(--sidebar-w)', paddingBottom:'var(--bottom-nav-h)' }}>` + `<Outlet>` + `<BottomNav>`
  - On mobile: `marginLeft: 0`
  - No `variant` prop — focus-mode handled at router level (separate route group)
- Modify: `frontend/src/router.tsx` — create two protected route groups:
  ```
  <ProtectedRoute> → <ShellLayout> → Outlet
    /hub, /learn, /learn/level/:id, /practice, /practice/setup/:mode, /practice/victory/:sessionId, /profile
  
  <ProtectedRoute> (no ShellLayout)
    /learn/level/:levelId/classwork, /learn/level/:levelId/lesson/:lessonId/classwork
    /practice/session/:sessionId
  ```
- `TopNav` is no longer rendered anywhere. File NOT deleted.
- Complexity: M | Backend: No
- DoD:
  - All 10 protected pages load without 404
  - Hub, Learn, Practice, Profile: Sidebar visible at 1440px; BottomNav at 390px
  - ClassworkPage and InArenaPage: NO sidebar, NO bottom nav at any viewport
  - `Page.tsx` content area renders correctly within the sidebar margin
  - `playwright test e2e/smoke.spec.ts` passes on all routes
  - Playwright assertion: ClassworkPage at 1440px has no element with `role="navigation"`
- Blocks: all Wave 2+ frontend

---

**W1-T05 — `/profile` route placeholder**

- Create: `frontend/src/features/profile/ProfilePage.tsx` — minimal "PROFILE — COMING SOON" inside `<Page>`
- Modify: `frontend/src/router.tsx` — add `/profile` lazy route in the nav-shell group
- Complexity: S | Backend: No
- DoD: Profile tab in Sidebar/BottomNav navigates without 404. Page renders inside ShellLayout.
- Blocks: W4-T05

---

### WAVE 2 — Core Learning Screens

**Backend must ship W2-B01 + W2-B02 + W2-B03 to staging before W2-T04 can be QA'd.**

---

**W2-B01 — Add `LessonCompletion` model**

- Modify: `backend/apps/progress/models.py`
- New model:
  ```python
  class LessonCompletion(models.Model):
      user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="lesson_completions")
      lesson = models.ForeignKey("courses.Lesson", on_delete=models.CASCADE, related_name="completions")
      kind = models.CharField(max_length=16, choices=SessionKind.choices)  # CLASSWORK | HOMEWORK only
      first_completed_at = models.DateTimeField(auto_now_add=True)
      best_accuracy_pct = models.DecimalField(max_digits=5, decimal_places=2)
      best_progress_record = models.ForeignKey(ProgressRecord, on_delete=models.PROTECT, related_name="lesson_completions")
      class Meta:
          unique_together = [("user", "lesson", "kind")]
  ```
- Modify: `backend/apps/progress/services.py` `finalize_session()` — when `session.template is not None`, create/update `LessonCompletion` in addition to existing `LevelCompletion` write. Check: if `session.template` is None (practice session), skip LessonCompletion entirely.
- Complexity: M | Backend: Yes
- DoD:
  - Migration applies cleanly on empty and populated databases
  - `finalize_session()` creates `LessonCompletion` on first classwork completion for a lesson
  - Idempotent: second call with better score updates `best_accuracy_pct` and `best_progress_record`; worse score leaves record unchanged
  - `pytest apps/progress/tests/` passes
- Blocks: W2-B02

---

**W2-B02 — `GET /levels/{id}/lessons/` endpoint**

> ⚠️ N+1 risk: must use a single queryset + dict pattern, not per-lesson DB calls.

- Modify: `backend/apps/courses/views.py`, `serializers.py`, `urls.py`
- New serializer `LessonDetailSerializer` (separate from LevelSerializer, which remains unchanged):
  ```python
  # Response shape per lesson:
  {
    "id": str,
    "order": int,
    "name": str,
    "description": str,
    "classwork_completed": bool,
    "classwork_accuracy_pct": float | null,
    "homework_completed": bool,
    "is_locked": bool
  }
  ```
- `is_locked` logic: lesson with `order=1` is always unlocked; lesson N is locked if lesson N-1 has no `LessonCompletion` with kind=CLASSWORK for this user
- **N+1 prevention:** single queryset `LessonCompletion.objects.filter(user=request.user, lesson__level=level).select_related('lesson')` → build `{(lesson_id, kind): completion}` dict → serializer reads dict, never queries in a loop
- Complexity: M | Backend: Yes
- DoD:
  - `GET /levels/{level_id}/lessons/` returns ordered list with correct `is_locked` values
  - 401 on unauthenticated request
  - Test: `CaptureQueriesContext` asserts ≤ 5 DB queries for a level with 8 lessons and a user with 3 completions
  - Lesson 1 always has `is_locked: false`; lesson 2 locked if lesson 1 classwork not completed
- Blocks: W2-T04, W2-T05

---

**W2-B03 — `POST /levels/{id}/lessons/{lesson_id}/classwork/start/` endpoint**

- Modify: `backend/apps/exercises/views.py`, `urls.py`
- Extract shared logic from `StartClassworkView` into `_start_session(user, lesson, kind) -> SessionMeta` helper function; reuse in both old and new view
- New `StartLessonClassworkView`: validates level_id, lesson exists in level, lesson not locked (check `LessonCompletion` for prior lessons), template exists with kind=CLASSWORK
- Old `POST /levels/{level_id}/classwork/start/` endpoint: kept intact, not modified
- Returns same `SessionMeta` shape as existing endpoint (200 on resume active session, 201 on new)
- Complexity: M | Backend: Yes
- DoD:
  - New endpoint returns SessionMeta correctly
  - 403 if lesson is locked (prior lesson classwork not completed)
  - 404 if lesson does not belong to specified level
  - 200 on resume: re-requesting while session is active returns existing session, not a new one
  - Old endpoint still works (backward compat)
- Blocks: W2-T04

---

**W2-T01 — Frontend constant: `RANK_NAMES` map + CSS tokens**

> ⚠️ [STALE - CORRECTED] Original plan had no ticket for rank names. `Level.name` = "Foundations", not rank labels.

- Create: `frontend/src/shared/lib/rankNames.ts`
  ```typescript
  export const RANK_NAMES: Record<number, string> = {
    1: "INITIATE", 2: "APPRENTICE", 3: "STRIKER", 4: "CHALLENGER",
    5: "WARRIOR", 6: "ELITE", 7: "CHAMPION", 8: "MASTER",
    9: "GRANDMASTER", 10: "LEGEND"
  };
  export const getRankName = (levelOrder: number): string =>
    RANK_NAMES[levelOrder] ?? `LEVEL ${levelOrder}`;
  ```
- Complexity: S | Backend: No
- DoD: Exported and used in `LevelGridCard` and `Sidebar` profile strip
- Blocks: W2-T02, W1-T02

---

**W2-T02 — Create `LevelGridCard` component**

- Create: `frontend/src/shared/ui/LevelGridCard.tsx`
- Reuses: `GlassCard.tsx` (container), `Chip.tsx` (status badge), `Icon.tsx` (lock, check-circle-2), `getRankName` from W2-T01
- Props: `level: Level`, `onClick?: () => void`
- States:
  - Completed: `GlassCard variant="success"`, check-circle-2 icon (gold), rank name visible
  - Current (`!level.is_locked && !level.is_completed`): yellow glow border + "Current Mission" label + "Engage" BoltButton
  - Locked: `GlassCard variant="locked"`, 0.5 opacity, lock icon, pointer-events none
- Rank name displayed below level order number using `getRankName(level.order)`
- Complexity: M | Backend: No
- DoD:
  - All 3 states render correctly
  - Locked card: pointer-events none (verified by test: click on locked card does not fire onClick)
  - `getRankName` returns correct string for levels 1–10
- Blocks: W2-T05

---

**W2-T03 — Create `XpProgressBar` and `BreadcrumbChip`**

- Create: `frontend/src/shared/ui/XpProgressBar.tsx`
  - Composes `ProgressBar.tsx` (exists, confirmed has `marker?: boolean` and `accent?` props)
  - Props: `currentXp: number`, `levelThreshold: number`, `nextLevelThreshold: number`
  - Renders: level-flanking labels "Lv N" / "Lv N+1", calls `ProgressBar` with `accent="yellow"` + `marker`
  - Handles edge case: `nextLevelThreshold === 0` (stubbed data) → renders bar at 0% fill with note
- Create: `frontend/src/shared/ui/BreadcrumbChip.tsx`
  - Composes `Chip.tsx` (exists, confirmed)
  - Props: `items: string[]`
  - Renders: "Item1 / Item2 / Item3" in `Chip` neutral tone; truncates at 3 items
- Complexity: S | Backend: No
- DoD:
  - XpProgressBar fill is `(currentXp - levelThreshold) / (nextLevelThreshold - levelThreshold) * 100%`
  - XpProgressBar handles `nextLevelThreshold === 0` gracefully (no NaN/Infinity)
  - BreadcrumbChip renders separator correctly; truncates gracefully
- Blocks: W2-T06, W3-T04

---

**W2-T04 — Create `ClassAccordion` + `TopicRow`**

- Create: `frontend/src/shared/ui/ClassAccordion.tsx`
  - Props: `lesson: LessonWithCompletion` (type defined in W2-B02 return shape), `levelId: string`
  - Renders: header (class number badge, class name, "N/M Topics" label, chevron-down icon)
  - Expand/collapse via CSS `max-height` transition (same pattern as design HTML)
  - `aria-expanded` + `aria-controls` on trigger, `id` on panel
- Create: `frontend/src/shared/ui/TopicRow.tsx`
  - Props: `type: 'classwork' | 'homework'`, `completed: boolean`, `accuracy?: number`, `locked: boolean`, `onStart: () => void`, `onDownload?: () => void`
  - Locked state: grayed out, non-interactive (pointer-events none on action buttons)
  - Status chip: "Not Attempted" / "In Progress" / "N% Accuracy" (green if ≥ 70%)
  - Download button: only rendered if `onDownload` is provided
- Reuses: `GlassCard.tsx`, `Chip.tsx`, `Icon.tsx` (check, lock, chevron-down, download), `BoltButton.tsx`
- Complexity: M | Backend: No
- DoD:
  - Accordion open/close with CSS transition
  - TopicRow locked: buttons visually disabled, click events do not fire
  - `aria-expanded` updates correctly
  - TopicRow renders all status variants (not attempted / in progress / completed with accuracy)
- Blocks: W2-T05

---

**W2-T05 — `useLessons` hook**

- Create: `frontend/src/shared/api/queries/useLessons.ts`
  - Query key: `["levels", levelId, "lessons"]`
  - Endpoint: `GET /levels/{levelId}/lessons/`
  - Return type: `LessonWithCompletion[]` (new type added to `shared/types/index.ts`)
  - `staleTime: 60_000` (1 min — completion state changes after session finalize)
  - Invalidate on `useFinalizeSession` success: `queryClient.invalidateQueries(["levels", levelId, "lessons"])`
- Modify: `frontend/src/shared/types/index.ts` — add `LessonWithCompletion` type
- Complexity: S | Backend: Yes — W2-B02
- DoD:
  - Hook returns correctly shaped data
  - Invalidation fires after session finalize (verified in PathOfConquestPage: completing classwork updates lesson status without page refresh)
- Blocks: W2-T06

---

**W2-T06 — Redesign `PathOfConquestPage`**

> ⚠️ [STALE - CORRECTED] Current implementation is a minimal level detail page (level name + 1 button). This is a near-full rebuild.

- Modify: `frontend/src/features/learn/PathOfConquestPage.tsx` — full rebuild
- Modify: `frontend/src/router.tsx` — classwork route updated to `/learn/level/:levelId/lesson/:lessonId/classwork`
- Reuses: `ClassAccordion.tsx`, `TopicRow.tsx`, `useLessons.ts`, `BreadcrumbChip.tsx`, `Skeleton.tsx`, `AmbientScene.tsx`
- `BackLink` removed
- On Engage CTA → calls `useStartClasswork` with lesson-scoped endpoint → navigate to lesson-scoped classwork route
- On Download → calls `onDownload` which is wired to materials endpoint (deferred: renders as disabled until W3+ materials endpoint ships)
- **Loading state:** while `useLessons` is loading, renders `Skeleton` grid matching accordion layout
- **Error state:** on API failure, renders `GlassCard` with "Failed to load lessons." + "Retry" BoltButton (calls `refetch()`)
- **Empty state:** if lessons array is empty, renders "No lessons available for this level" message
- Complexity: XL | Backend: Yes — W2-B02 + W2-B03
- DoD:
  - All lessons listed and ordered correctly
  - Accordion expands/collapses; chevron animates
  - Classwork CTA starts session on lesson-scoped endpoint
  - Locked lessons: accordion header grayed, TopicRows non-interactive
  - Loading skeleton renders on first load
  - Error state renders with retry
  - `BackLink` has zero imports in this file
- Blocks: W3-T04

---

**W2-T07 — Redesign `LevelSelectionPage`**

- Modify: `frontend/src/features/learn/LevelSelectionPage.tsx`
- Reuses: `LevelGridCard.tsx` (W2-T02), `Skeleton.tsx`, `AmbientScene.tsx`
- Grid: CSS Grid `repeat(5, 1fr)` at ≥1024px, `repeat(2, 1fr)` at <1024px, `repeat(1, 1fr)` at <640px
- `GlassCard` usages replaced by `LevelGridCard`
- `BackLink` removed (sidebar provides navigation context)
- **Hero illustration:** `<img src="/hero-character.png" alt="" aria-hidden="true" className="hero-illustration" />` below the grid. Asset to be placed at `frontend/public/hero-character.png` (requires design team to provide file)
- **Loading state:** skeleton grid matching 5-col layout
- **Error state:** "Failed to load levels." + Retry (already partially exists — ensure it uses GlassCard styling)
- Complexity: M | Backend: No (existing `useLevels()`)
- DoD:
  - Grid renders at correct column counts (verified at 1440px, 768px, 390px)
  - All 3 card states render correctly
  - Rank names display (INITIATE → LEGEND)
  - Hero illustration renders; if asset missing, no layout break (img with `alt=""`)
  - BackLink: zero imports
- Notes: Hero illustration asset URL `[NEEDS PRODUCT INPUT]` if designer hasn't provided the file

---

**W2-T08 — Redesign `HubPage`**

- Modify: `frontend/src/features/hub/HubPage.tsx`
- Reuses: `HudStatTile.tsx` (existing, no changes needed), `GlassCard.tsx`, `BoltButton.tsx`, `XpProgressBar.tsx` (W2-T03), `AmbientScene.tsx`
- **Remove `TopNav` import** (confirmed present in HubPage.tsx)
- Hero greeting: Avatar (48px, from `user.profile.avatar_url`) + "Welcome back, {display_name}"
- Stats strip: 3 `HudStatTile` (Streak / Current Rank / Total XP) using existing component with no changes
- XP progress bar: `XpProgressBar` — if `xp_threshold === 0` (stubbed), shows with 0% fill (graceful degradation until W3-B02+W3-B03 land)
- Portal cards: min-height 280px, existing navigation behavior preserved
- Complexity: M | Backend: No
- DoD:
  - TopNav: zero imports in this file
  - Stats tiles show live data from `useMe()`
  - XP bar renders without crash even when `xp_threshold === 0`

---

### WAVE 3 — Session Screens + "Fixed" Verdict

**W3-B01 must be deployed before W3-T03/T04/T05 can ship.**

---

**W3-B01 — `QuestionAttempt` multi-attempt schema migration**

> ⚠️ CRITICAL — Highest-risk migration in the project. Two-step mandatory. Do NOT collapse into one.

- Modify: `backend/apps/progress/models.py`
  - Add `attempt_number = models.PositiveSmallIntegerField(null=True)` (nullable initially)
  - Do NOT change unique_together yet
- Create migration `0004_question_attempt_add_attempt_number`:
  - AddField: `attempt_number` nullable
  - `RunPython`: verify row count before backfill; `UPDATE` all existing rows SET `attempt_number = 1`; verify row count after backfill equals before
- Create migration `0005_question_attempt_new_unique`:
  - `AlterUniqueTogether`: remove `[("session", "question_index")]`; add `[("session", "question_index", "attempt_number")]`
  - Add index on `(session, question_index)` for query performance
  - Set `attempt_number null=False` (after backfill, no nulls remain)
- Modify: `backend/apps/exercises/views.py` `SubmitAttemptView`:
  - Remove the idempotent early-return guard (lines that check `existing_attempt` and return cached result)
  - Add: `attempt_number = QuestionAttempt.objects.filter(session=session, question_index=question_index).count() + 1`
  - Create `QuestionAttempt` with the new `attempt_number`
  - Return `is_correct` for the current attempt
- Modify: `backend/apps/exercises/views.py` `SessionReportView`:
  - Return all attempts ordered by `(question_index, attempt_number)` (not just one per question)
- Complexity: L | Backend: Yes
- Migration protocol:
  1. Run on staging DB clone with production-volume data first
  2. `pg_dump` production before running
  3. Deploy app code that handles BOTH old (unique on question_index) and new schema during migration window — NOT required here since this is a test app, but note for future
  4. Run 0004, verify row count, then run 0005
  5. Deploy new app code only after both migrations complete
- DoD:
  - Submit same `question_index` twice in a session → 2 rows with `attempt_number` 1 and 2
  - `SessionReportView` returns both rows ordered correctly
  - Existing `pytest apps/progress/` and `pytest apps/exercises/` test suites pass
  - New test: assert that submitting a wrong answer then correct answer returns `is_correct=True` on the second call
- Blocks: W3-T03, W3-T04

---

**W3-B02 — `GET /me/xp-progress/` endpoint**

- Modify: `backend/apps/users/views.py`, `serializers.py`, `urls.py`
- Extract current `get_stats()` logic in `UserMeSerializer` into a standalone `get_user_stats(user) -> dict` function; reuse in both `MeView` and new `XpProgressView`
- Response:
  ```json
  {
    "total_xp": 4500,
    "current_level": 12,
    "xp_to_next_level": 1200,
    "current_level_threshold": 3500,
    "next_level_threshold": 4400,
    "streak_days": 7
  }
  ```
- Level thresholds: `Level.objects.filter(order__in=[current_level, current_level+1])` — requires W3-B03 to have real values
- Same Redis cache key as `MeView` stats: `user_stats:{user_id}` (60s TTL)
- Complexity: S | Backend: Yes
- DoD:
  - Returns correct values when `Level.xp_threshold` is populated (W3-B03 must ship first)
  - Returns graceful defaults when `xp_threshold=0` (shows `xp_to_next_level: 0`, progress bar at 0)
  - 401 on unauthenticated
  - Cache used on repeated calls within 60s
- Blocks: W2-T08 (full XP bar), W4-T05

---

**W3-B03 — Populate `Level.xp_threshold` + update seed command**

> ⚠️ [STALE - CORRECTED] Original plan did not include seed_levels.py update. seed_levels.py explicitly sets xp_threshold=0. If not updated, re-running seed resets all values.

- Create: `backend/apps/courses/migrations/0003_level_xp_threshold_data.py`
  - `RunPython`: for levels 1–10, set `xp_threshold` to: `[0, 200, 500, 900, 1400, 2000, 2700, 3500, 4400, 5500]`
  - `reverse_code`: set all back to 0
  - Comment: "# Threshold values provisional — update when XP formula finalized per ARCHITECTURE.md §2 Q4"
- Modify: `backend/apps/courses/management/commands/seed_levels.py`
  - Update `xp_threshold` values in the seed data dict to match the migration values
  - Running `seed_levels` after the migration must produce identical threshold values
- Complexity: S | Backend: Yes
- DoD:
  - Migration applies cleanly. `Level.objects.get(order=2).xp_threshold == 200`
  - Running `python manage.py seed_levels` after migration does not reset values to 0
  - Reversible: `python manage.py migrate courses 0002` resets to 0
- Blocks: W3-B02

---

**W3-T01 — Create `FeedbackToast` and `ProblemCanvas`**

- Create: `frontend/src/shared/ui/FeedbackToast.tsx`
  - Props: `verdict: 'correct' | 'wrong' | null`, `xpDelta: number`, `onDismiss?: () => void`
  - Positioned: `position: absolute` overlay at bottom of ProblemCanvas
  - Auto-dismiss: 600ms `setTimeout` → calls `onDismiss`. Timer cleared on unmount (cleanup in useEffect)
  - Success (correct): green border glow, `check-circle-2` icon, "+{xpDelta} XP" text
  - Error (wrong): red border glow, `x-circle` icon, "RECALCULATE" text
  - `verdict === null`: renders nothing (avoid layout shift)
- Create: `frontend/src/shared/ui/ProblemCanvas.tsx`
  - Props: `questionText: string`, `questionNumber: number`, `total: number`, `verdict?: 'correct' | 'wrong' | null`
  - Renders: `GlassCard` container, question text in `--font-mono` at 56px, progress context chip "Q {n}/{total}"
  - Verdict border animation: CSS class swap on verdict change (centralizes inline styles currently spread across ClassworkPage + InArenaPage)
  - No input — caller renders input separately below the canvas
- Reuses: `GlassCard.tsx`, `Chip.tsx`, `Icon.tsx`
- Complexity: M | Backend: No
- DoD:
  - FeedbackToast: success and error variants render with correct colors and icons
  - FeedbackToast: auto-dismiss fires after 600ms; `onDismiss` called once
  - FeedbackToast: timer cleaned up on unmount (no memory leak)
  - ProblemCanvas: question renders in mono font; verdict border animates on prop change
- Blocks: W3-T04, W4-T03

---

**W3-T02 — Create `StatBentoCard`**

- Create: `frontend/src/shared/ui/StatBentoCard.tsx`
- Props: `value: string`, `label: string`, `valueColor?: string`, `variant?: 'default' | 'prominent'`
- `default` variant: visually identical to existing `ResultStatTile` (keeps backward compat — `ResultStatTile` is kept and `StatBentoCard default` matches it pixel-for-pixel until Wave 5 cleanup)
- `prominent` variant: larger value (2.4rem), `GlassCard` wrapper with `--glass-05` background, glowing border via `var(--glow-primary-md)`
- Reuses: `GlassCard.tsx`
- `ResultStatTile.tsx` kept intact alongside this — not deleted until Wave 5
- Complexity: S | Backend: No
- DoD:
  - `default` renders without visual regression vs current ResultStatTile (screenshot comparison)
  - `prominent` has glow border and larger value
- Blocks: W3-T05, W4-T04

---

**W3-T03 — Update `AttemptsTable` for multi-attempt grouping**

> Depends on W3-B01 deploying to staging first. Do not ship frontend before backend.

- Modify: `frontend/src/shared/types/index.ts` — add `attempt_number: number` to `QuestionAttempt` interface
- Modify: `frontend/src/shared/ui/AttemptsTable.tsx`
  - Group attempts by `question_index` (existing behavior = flat rows, 1 per question)
  - First row for each question_index: renders question text normally
  - Subsequent rows (attempt_number > 1): renders `↳ Retry #N` in question column
  - All attempt rows show submitted_answer + is_correct verdict
  - "Fixed" verdict derived: `question_index` group has first attempt `is_correct=false` AND any later attempt `is_correct=true` → show orange "Fixed" chip on the corrected attempt row
  - Lucide icon for Fixed: `wrench` (not `build` — that's Material Symbols)
- Reuses: `Chip.tsx` (attempt count badge, Fixed verdict)
- Complexity: M | Backend: Yes — W3-B01 required
- DoD:
  - Flat rows (single attempt per question): renders identically to current behavior
  - Multi-attempt rows: first attempt shown, retry attempts shown as sub-rows
  - "Fixed" verdict: orange `wrench` Chip on the corrected attempt
  - Mobile: table horizontally scrollable, not broken
- Blocks: W3-T04, W3-T05

---

**W3-T04 — Redesign `ClassworkPage`**

> ⚠️ [STALE - CORRECTED] ClassworkPage never had a TopNav import — no removal needed.

- Modify: `frontend/src/features/learn/ClassworkPage.tsx`
- Modify: `frontend/src/shared/api/queries/useClasswork.ts` — update `useStartClasswork` to use lesson-scoped URL `POST /levels/{levelId}/lessons/{lessonId}/classwork/start/`; add `lessonId` param
- Route: already updated to `/learn/level/:levelId/lesson/:lessonId/classwork` in W1-T04 router split
- Reads: `useParams<{ levelId: string; lessonId: string }>()`
- Reuses: `ProblemCanvas.tsx`, `FeedbackToast.tsx`, `BreadcrumbChip.tsx`, `ProgressBar.tsx`, `BoltButton.tsx`
- Changes:
  - Timer bar: use `ProgressBar` component (not inline div) with `accent="yellow"`, `value={timeLeft}`, `max={timeLimitMs}`
  - Question: render via `ProblemCanvas`
  - Verdict feedback: use `FeedbackToast`
  - Breadcrumb: `BreadcrumbChip items={["Level N", "Class M"]}` — level and lesson order from route params + cached level data
  - All existing session logic (timer tick, question advance, finalize on last question, finalize on time-out) preserved verbatim — do not touch
  - Answer input: keep existing input behavior (focus, enter-key submit)
- Complexity: L | Backend: Yes — W2-B03 + W3-B01
- DoD:
  - Session starts on lesson-scoped endpoint
  - Breadcrumb shows "Level N / Class M"
  - ProblemCanvas renders question
  - FeedbackToast appears on answer submit; auto-dismisses in 600ms
  - Timer bar uses ProgressBar component
  - All existing tests pass
  - Zero references to TopNav in this file
- Blocks: W3-T05

---

**W3-T05 — Redesign `MissionReportPage`**

- Modify: `frontend/src/features/learn/MissionReportPage.tsx`
- Reuses: `StatBentoCard.tsx` (W3-T02, `default` variant for parity), `AttemptsTable.tsx` (W3-T03), `XpProgressBar.tsx` (W2-T03), `BoltButton.tsx`, `AmbientScene.tsx`
- Changes:
  - 4 `ResultStatTile` → 4 `StatBentoCard variant="default"` (visual parity maintained at this stage)
  - `AmbientScene` added
  - `BackLink` removed
  - XP progress bar section added below stat cards — uses `XpProgressBar`; data from `useXpProgress` hook (new, calls W3-B02 endpoint); degrades gracefully if endpoint not available
  - Table: `AttemptsTable` updated component renders Fixed verdict
  - RETRY button navigates to lesson-scoped classwork URL: `/learn/level/${levelId}/lesson/${lessonId}/classwork` — lessonId available via session report's `session.template.lesson.id` (add to `SessionReport` type and `SessionReportView` response if not already present — **verify backend returns lesson_id in report**)
  - "RETURN TO HUB" button preserved
- Complexity: M | Backend: No (existing `useSessionReport`)
- DoD:
  - Stat cards render correctly
  - XP bar: shows "Loading..." while fetching, correct value when loaded, no crash if endpoint 404s
  - AttemptsTable shows Fixed verdict when applicable
  - RETRY routes to correct lesson-scoped URL
  - BackLink: zero imports

---

### WAVE 4 — Arena Screens + Profile MVP

---

**W4-B01 — `PATCH /me/profile/` + `GET /me/avatar-presets/` endpoints**

- Create: `backend/apps/users/constants.py`
  ```python
  PRESET_AVATAR_URLS = [
      "/avatars/bolt-1.png", "/avatars/bolt-2.png", ...  # 8–12 entries
  ]
  ```
  Note: actual avatar image files must be placed at `backend/static/avatars/` or served from CDN. `[NEEDS PRODUCT INPUT]` — confirm avatar asset delivery method.
- Modify: `backend/apps/users/views.py` — add `ProfileUpdateView` (PATCH), `AvatarPresetsView` (GET, no auth required)
- Modify: `backend/apps/users/serializers.py` — add `ProfileUpdateSerializer` that validates `avatar_url` is in `PRESET_AVATAR_URLS`
- Modify: `backend/apps/users/urls.py` — add routes
- After PATCH: call `cache.delete(f"user_stats:{user.id}")` to bust stats cache
- Complexity: S | Backend: Yes
- DoD:
  - `PATCH /me/profile/` with valid `display_name` updates Profile; returns updated Profile object
  - `PATCH /me/profile/` with `avatar_url` not in PRESET_AVATAR_URLS returns 400
  - `GET /me/avatar-presets/` returns list without auth
  - Stats cache busted after successful PATCH
- Blocks: W4-T05

---

**W4-C01 — Extend `Slider.tsx` with `disabled` and `description` props**

> ⚠️ [STALE - CORRECTED] Original plan said "extend to ConfigSlider" as if props existed. They don't exist. Must ADD them to Slider.tsx first.

- Modify: `frontend/src/shared/ui/Slider.tsx`
  - Add `disabled?: boolean` prop — when true: `pointer-events: none`, `opacity: 0.4`, range input `disabled` attribute set
  - Add `description?: string` prop — when provided, render a `<p className="t-body-sm" style={{ color: 'var(--fg-sand)' }}>` below the slider
- Create: `frontend/src/shared/ui/ConfigSlider.tsx`
  - Wraps `Slider.tsx` in a `GlassCard` container
  - Passes all Slider props through
  - The GlassCard provides the glassmorphic card wrapper visible in designs
  - Props: same as Slider + `disabled?` + `description?`
- Complexity: S | Backend: No
- DoD:
  - `disabled` Slider: pointer-events none, visually dimmed, input attribute set
  - `description` renders below slider in muted color
  - ConfigSlider: visually matches design (GlassCard wrapper around slider)
  - Existing Slider usages (if any) unaffected
- Blocks: W4-C02

---

**W4-C02 — Extend `Toggle.tsx` + create `AdvancedToggleRow` and `OperationTileGrid`**

> ⚠️ [STALE - CORRECTED] Toggle.tsx has no icon or sectionLabel. Must ADD to Toggle first.

- Modify: `frontend/src/shared/ui/Toggle.tsx`
  - Add `icon?: string` prop — when provided, render `Icon` component left of label
  - Add `sectionLabel?: string` prop — when provided, render a section header `<p className="t-label">` above the toggle row
- Create: `frontend/src/shared/ui/AdvancedToggleRow.tsx`
  - Wraps `Toggle.tsx` in a `GlassCard` row
  - Passes all Toggle props through
  - The GlassCard provides the glass card row visible in designs
- Create: `frontend/src/shared/ui/OperationTileGrid.tsx`
  - Composes `OperationButton.tsx` (confirmed: `selected` is passed as prop, selection not managed internally)
  - Props: `value: Op`, `onChange: (op: Op) => void` where `Op = '+' | '-' | '×' | '÷'`
  - Manages selected state: `selected={value === op}` for each OperationButton
  - Layout: 2×2 CSS grid
- Complexity: M | Backend: No
- DoD:
  - Toggle `icon` renders Icon left of label when provided
  - Toggle `sectionLabel` renders header above row when provided
  - Existing Toggle usages (ArenaSetupPage) unaffected (both new props are optional)
  - OperationTileGrid: only one op selected at a time; `onChange` fires with new value on click
  - OperationTileGrid: keyboard accessible (tab to each button, space/enter to select)
- Blocks: W4-T02

---

**W4-C03 — Create `BentoModeCard`**

> ⚠️ [STALE - CORRECTED] Design shows 4 mode cards, not 3.

- Create: `frontend/src/shared/ui/BentoModeCard.tsx`
- Props: `mode: SessionKind`, `label: string`, `description: string`, `icon: string`, `accentColor: string`, `plateColor: 'yellow' | 'blue' | 'orange' | 'purple'`, `onClick: () => void`
- **Is a `<button>` element**, not `<div>` — keyboard focusable, no extra ARIA needed
- Reuses: `GlassCard.tsx`, `IconPlate.tsx`, `Icon.tsx` (arrow-right)
- Hover: `translateY(-4px)` + colored box-shadow matching `accentColor`
- Complexity: M | Backend: No
- DoD:
  - 4 color variants render (yellow/blue/orange/purple) — verified by rendering all 4 in a test
  - Hover effect works on mouse; focus-visible ring on keyboard
  - `onClick` fires on click and Enter/Space keypress
- Blocks: W4-T01

---

**W4-T01 — Redesign `TrainingArenaPage` (4 BentoModeCards)**

> ⚠️ [STALE - CORRECTED] Original plan said 3 mode cards. Design shows 4.

- Modify: `frontend/src/features/practice/TrainingArenaPage.tsx`
- Reuses: `BentoModeCard.tsx` (W4-C03), `AmbientScene.tsx`
- 4 BentoModeCards:
  - Memory Master: `mode="FLASH_CARDS"`, yellow, `brain` icon (or closest Lucide: `zap`)
  - Zen Mode: `mode="ZEN"`, blue, `wind` icon
  - Sonic Speed: `mode="TIME_ATTACK"`, orange, `timer` icon
  - The Lab: `mode="CUSTOM"`, purple, `settings` icon
- `BackLink` removed; `GlassCard` wrappers removed
- `AmbientScene` with `["orange", "blue", "purple"]` accents
- Clicking card navigates to `/practice/setup/{mode}`
- Complexity: S | Backend: No
- DoD:
  - All 4 cards render
  - Clicking each routes to correct setup URL
  - Hover effects work
  - BackLink: zero imports

---

**W4-T02 — Redesign `ArenaSetupPage` (ConfigSlider + OperationTileGrid)**

- Modify: `frontend/src/features/practice/ArenaSetupPage.tsx`
- Reuses: `ConfigSlider.tsx` (W4-C01), `OperationTileGrid.tsx` (W4-C02), `AdvancedToggleRow.tsx` (W4-C02), `BoltButton.tsx`
- Replace all `SegmentedToggle` usages:
  - OPERATION: `SegmentedToggle` → `OperationTileGrid`
  - TIME LIMIT: `SegmentedToggle` → `ConfigSlider` (min:1, max:60, suffix:"min"); ZEN mode: `ConfigSlider disabled={true}` (or hidden)
  - QUESTIONS: `SegmentedToggle` → `ConfigSlider` (min:5, max:50, step:5)
  - DIGITS: `SegmentedToggle` → `ConfigSlider` (min:1, max:5)
  - ROWS: `SegmentedToggle` → `ConfigSlider` (min:2, max:10); disabled when op is MUL or DIV
- Advanced toggles section: 4 `AdvancedToggleRow` (Include Subtraction, Zig-Zag Pattern, Same Digits, Audio Mode)
- **[NEEDS PRODUCT INPUT] Flash Speed slider:** If mode=FLASH_CARDS, add `ConfigSlider` for Flash Speed (min:0.1, max:2.0, step:0.1, suffix:"s"). Awaiting product decision — implement only if confirmed.
- CTA: "ENTER ARENA" with `rocket` Lucide icon (not `rocket_launch` — that's Material Symbols)
- `SegmentedToggle` has zero imports in this file after this change
- Complexity: M | Backend: No (existing `useStartPractice()` unchanged)
- DoD:
  - All config params functional via new components
  - ROWS disabled correctly when op is MUL/DIV
  - ZEN mode: time limit not configurable
  - `SegmentedToggle` zero imports verified by grep
  - Existing `useStartPractice()` API call payload unchanged

---

**W4-T03 — Redesign `InArenaPage`**

- Modify: `frontend/src/features/practice/InArenaPage.tsx`
- Reuses: `ProblemCanvas.tsx` (W3-T01), `FeedbackToast.tsx` (W3-T01), `BoltButton.tsx`, `ProgressBar.tsx`
- Timer bar: `ProgressBar` component with `accent="yellow"`
- Question: `ProblemCanvas`
- Verdict feedback: `FeedbackToast`
- Session kind chip: `Chip tone="neutral"` showing mode name
- "Abandon Run": small `BoltButton variant="ghost"` top-left — navigates back with `window.confirm("Abandon this run?")` for accidental-click prevention
- All existing timer/finalize/question-advance logic preserved verbatim
- Complexity: M | Backend: No
- DoD:
  - Session plays correctly end-to-end
  - FeedbackToast appears on answer; auto-dismisses
  - Abandon: confirm dialog appears; on confirm navigates to `/practice`; on cancel stays in session
  - ProblemCanvas renders question text correctly

---

**W4-T04 — Redesign `VictoryPage`**

- Modify: `frontend/src/features/practice/VictoryPage.tsx`
- Reuses: `StatBentoCard.tsx` (W3-T02, `prominent` variant for center card), `AttemptsTable.tsx` (W3-T03), `XpProgressBar.tsx` (W2-T03), `BoltButton.tsx`, `AmbientScene.tsx`
- 4 `ResultStatTile` → layout: 3 `StatBentoCard` (Accuracy + Score/Perfect + Speed); center card uses `variant="prominent"`
- XP bar: `XpProgressBar` at bottom
- CSS-only confetti burst on mount: `@keyframes confetti-burst` — scale + opacity fade of 8 pseudo-elements, no library
- `AmbientScene` with `["yellow", "orange"]` accents
- Complexity: M | Backend: No
- DoD:
  - 3 stat cards; center card visually elevated
  - Confetti animates on mount; does not loop
  - XP bar renders (degrades gracefully if xp_threshold=0)
  - PLAY AGAIN / RETURN TO HUB work correctly

---

**W4-T05 — Build `ProfilePage` MVP**

- Modify: `frontend/src/features/profile/ProfilePage.tsx` (replaces Wave 1 placeholder)
- Create: `frontend/src/shared/api/queries/useProfile.ts`
  - Read: wraps `useMe()` for user data
  - Write: mutation wrapping `PATCH /me/profile/`
  - Presets: `useQuery` for `GET /me/avatar-presets/`
- Create: `frontend/src/shared/api/queries/useXpProgress.ts`
  - Query key: `["me", "xp-progress"]`
  - Endpoint: `GET /me/xp-progress/`
  - `staleTime: 60_000`
  - Invalidate after `useFinalizeSession` success
- Reuses: `GlassCard.tsx`, `BoltButton.tsx`, `Avatar.tsx` (80px size), `XpProgressBar.tsx`, `HudStatTile.tsx`, `Chip.tsx`, `AmbientScene.tsx`, `FeedbackToast.tsx` (save confirmation)
- Layout:
  - Avatar section: large `Avatar` + display_name (editable `<input>`) + "Save" BoltButton
  - Avatar picker: grid of preset thumbnails from `GET /me/avatar-presets/`; selected state via local state; "Save" calls PATCH
  - Stats section: XP bar, streak `HudStatTile`, levels completed `HudStatTile`
  - Logout: `BoltButton variant="ghost"` calling `authStore.logout()` + navigate to `/login`
- Complexity: L | Backend: Yes — W4-B01 + W3-B02
- DoD:
  - Display name edit: input value changes; Save calls PATCH; FeedbackToast shows "Saved!" on success / error message on failure
  - Avatar picker: selecting a preset updates local state; Save calls PATCH with avatar_url; invalid URL handled server-side
  - XP bar: uses `useXpProgress` data; degrades if endpoint returns error
  - Logout: clears auth state, redirects to `/login`
  - Loading state: Skeleton rendered while `useMe()` is loading
  - Error state: if profile fails to load, shows "Failed to load profile. Retry."

---

### WAVE 5 — Polish, Accessibility, Snaking Path

---

**W5-T01 — `PathNode` + `PathClassDivider` (snaking path)**

- Create: `frontend/src/shared/ui/PathNode.tsx`, `frontend/src/shared/ui/PathClassDivider.tsx`
- Feature access: `?view=path` query param on `/learn/level/:id` shows path; default remains accordion
- `PathNode` states: completed (gold fill, check icon), current (pulse-glow animation), locked (gray, lock icon), available (outlined)
- SVG bezier connector line: alternates left/right offset for snake
- Mobile: vertical list only (no left/right stagger)
- Reuses: existing `useLessons()` data
- Complexity: XL | Backend: No
- DoD: Path renders correctly. Accordion default unaffected. Mobile-safe.

---

**W5-T02 — Deprecation sweep**

- Add `// @deprecated — Stitch V1. Delete after Wave 5 QA sign-off.` to: `TopNav.tsx`, `BackLink.tsx`, `SegmentedToggle.tsx`
- Verify: `grep -r "import.*TopNav" src/features/` → zero results
- Verify: `grep -r "import.*BackLink" src/features/` → zero results
- Verify: `grep -r "import.*SegmentedToggle" src/features/` → zero results
- Complexity: S | Backend: No

---

**W5-T03 — Accessibility audit**

- Modify: `Sidebar.tsx`, `BottomNav.tsx`, `BentoModeCard.tsx` (already `<button>`), `ClassAccordion.tsx`
- Sidebar: `role="navigation"`, `aria-label="Main navigation"`, active item `aria-current="page"`
- BottomNav: `aria-label` on each button
- ClassAccordion: `aria-expanded`, `aria-controls`, associated `id` on panel
- Complexity: M | Backend: No
- DoD: axe-core reports 0 critical violations on all 12 pages

---

**W5-T04 — Visual regression baseline**

- Create: `frontend/e2e/visual/` + Playwright snapshot tests for 12 pages at 1440px + 390px
- `npm run test:visual` command
- CI: fail on diff > 0.1%
- Complexity: M | Backend: No

---

**W5-T05 — `AmbientScene` focus-mode detection**

> ⚠️ [STALE - CORRECTED] AmbientScene does NOT currently detect body.focus-mode. This must ADD the behavior.

- Modify: `frontend/src/shared/ui/AmbientScene.tsx`
  - On mount, and on each render: check `document.body.classList.contains('focus-mode')`
  - If focus-mode active: set `particleCount` to 0 internally (override prop value)
  - Use `MutationObserver` on `document.body` attributes to reactively detect class changes
  - Cleanup: disconnect MutationObserver on unmount
- Also: raise default `particleCount` from 4 to 6 on desktop (check `window.innerWidth > 1024`)
- Complexity: S | Backend: No
- DoD:
  - In focus mode (ClassworkPage/InArenaPage): particles absent; blobs absent
  - Outside focus mode: particles render
  - MutationObserver disconnected on unmount (no leak)
  - Note: ClassworkPage and InArenaPage currently do NOT set `body.focus-mode`. If this class is not set, AmbientScene detection has no effect. Confirm whether ClassworkPage/InArenaPage should set this class on mount. **[NEEDS PRODUCT INPUT]** — or the check is irrelevant since those pages don't include AmbientScene at all.

---

## 4. Dependency Graph / Critical Path

```
CRITICAL PATH (must not slip):

W1-T01 → W1-T02 → W1-T03 → W1-T04 ←— highest-risk frontend commit
                                    └→ All Wave 2–5 frontend unblocked

W2-B01 (LessonCompletion model)
  → W2-B02 (GET /lessons/)       ← N+1 risk — queryset+dict required
  → W2-B03 (POST lesson classwork start)
  → W2-T05 (useLessons hook)
  → W2-T06 (PathOfConquestPage)
  → W3-T04 (ClassworkPage lesson-scoped)

W3-B03 (xp_threshold data migration + seed_levels update)
  → W3-B02 (GET /me/xp-progress/)
  → W4-T05 (ProfilePage XP bar)

W3-B01 (QuestionAttempt migration) ← highest-risk backend commit, 2-step mandatory
  → W3-T03 (AttemptsTable multi-attempt)
  → W3-T04 (ClassworkPage)
  → W3-T05 (MissionReportPage Fixed verdict)

W4-C01 → W4-C02 → W4-T02 (ArenaSetupPage)
W4-C03 → W4-T01 (TrainingArenaPage)

PARALLEL TRACKS (Wave 3 and Wave 4 can run concurrently):
  Track A: W3-B01 → W3-T01 → W3-T04 → W3-T05
  Track B: W4-B01 → W4-C01 → W4-C02 → W4-C03 → W4-T01/T02/T03/T04 → W4-T05
```

---

## 5. Backend Sprint Timing

| Frontend Wave | Backend Must Ship Before Wave QA | Backend Work to Start With |
|---|---|---|
| Wave 1 | No backend dependency | Begin W2-B01 in parallel |
| Wave 2 | W2-B01 + W2-B02 + W2-B03 on staging | All three in sprint alongside Wave 1 frontend |
| Wave 3 | **W3-B01 migration window: START of Wave 3 sprint, not end** | W3-B03 → W3-B02 as pre-req chain |
| Wave 4 | W4-B01 (profile PATCH + presets) | Can ship mid-Wave 3 — simple endpoint |
| Wave 5 | No new backend | Performance audit: W2-B02 N+1 check, W3-B01 query regression |

---

## 6. Risk Register

| # | Risk | Impact | Probability | Mitigation |
|---|---|---|---|---|
| 1 | W1-T04 router split breaks all protected routes | HIGH | MEDIUM | Branch + 2-person review. Playwright smoke on all routes before merge. ShellLayout wraps only `<Outlet>`. |
| 2 | W3-B01 migration corrupts production data | CRITICAL | LOW (2-step) / HIGH (1-step) | Two migrations mandatory (0004 then 0005). `RunPython` verifies row count. `pg_dump` before production. No rolling deploy during migration. |
| 3 | W2-B02 N+1 query on lessons endpoint | MEDIUM | HIGH if unaddressed | Single queryset + Python dict pattern. `CaptureQueriesContext` test asserts ≤ 5 queries. |
| 4 | seed_levels.py re-run resets xp_threshold to 0 | MEDIUM | CERTAIN if not fixed | W3-B03 updates seed command in same PR as migration. |
| 5 | ProfilePage avatar security bypass | MEDIUM | LOW | Server-side allowlist in constants.py. Frontend presets fetched from server, not hardcoded. |
| 6 | Hero illustration asset not available | LOW | MEDIUM | `<img>` with `alt=""` — no layout break if file missing. Placeholder until design provides asset. |
| 7 | Flash Speed slider scope unclear | LOW | — | [NEEDS PRODUCT INPUT] — implement only after decision |

---

## 7. Component Reuse Map

| Existing Component | Action | Result | Wave |
|---|---|---|---|
| `Slider.tsx` | EXTEND (add disabled, description props) | `ConfigSlider.tsx` wraps it | W4-C01 |
| `Toggle.tsx` | EXTEND (add icon, sectionLabel props) | `AdvancedToggleRow.tsx` wraps it | W4-C02 |
| `OperationButton.tsx` | COMPOSE (2×2 grid + selection state management) | `OperationTileGrid.tsx` | W4-C02 |
| `ProgressBar.tsx` | COMPOSE (add labeled flanks, XP context) | `XpProgressBar.tsx` | W2-T03 |
| `ResultStatTile.tsx` | COEXIST (StatBentoCard default = visual match) | `StatBentoCard.tsx` (adds prominent variant) | W3-T02 |
| `GlassCard.tsx` | USE as-is — wrapper for all new components | — | W2–W4 |
| `HudStatTile.tsx` | REUSE as-is | — | W2 (Hub) |
| `BoltButton.tsx` | REUSE as-is | — | all waves |
| `Chip.tsx` | REUSE as-is | `BreadcrumbChip.tsx` wraps it | W2 |
| `Icon.tsx` | REUSE as-is (Lucide stays) | — | all waves |
| `Avatar.tsx` | REUSE as-is | — | W1 (Sidebar), W4 (Profile) |
| `IconPlate.tsx` | REUSE in BentoModeCard | — | W4 |
| `AmbientScene.tsx` | EXTEND (add focus-mode detection in W5) | — | W2+, W5-T05 |
| `AttemptsTable.tsx` | UPDATE for multi-attempt grouping | — | W3-T03 |
| `TopNav.tsx` | DEPRECATE after W1 | delete post-W5 QA | W5 |
| `BackLink.tsx` | DEPRECATE after W2 | delete post-W5 QA | W5 |
| `SegmentedToggle.tsx` | DEPRECATE after W4 | delete post-W5 QA | W5 |
| `Page.tsx` | UPDATE minHeight calc | — | W1 |

---

## 8. Testing Strategy

### Per-Component Unit Tests (Vitest + React Testing Library)

| Component | Key Test Cases |
|---|---|
| `Sidebar` | Active route highlighted; profile strip shows cached user data; hidden at 767px |
| `BottomNav` | Active tab correct; 4 items; hidden at 1024px |
| `LevelGridCard` | All 3 states render; locked card does not fire onClick |
| `ClassAccordion` | Toggle expand/collapse; aria-expanded updates |
| `TopicRow` | Locked row: button click does not fire; status badge variants |
| `ConfigSlider` | disabled: pointer-events none; description renders below slider |
| `AdvancedToggleRow` | icon renders; sectionLabel renders; Toggle behavior unchanged |
| `OperationTileGrid` | Only one op selected; onChange fires with correct value |
| `FeedbackToast` | Auto-dismiss after 600ms; success/error variants; timer cleanup on unmount |
| `ProblemCanvas` | Question text renders; verdict border class applied on prop change |
| `StatBentoCard` | default matches ResultStatTile; prominent has glow class |
| `XpProgressBar` | Fill % correct; handles `nextLevelThreshold=0` without crash |
| `BentoModeCard` | Is `<button>`; onClick on click and Enter; 4 color variants |

### Integration Tests (Playwright)

| Flow | Scenario |
|---|---|
| Learn flow | Login → Hub → Level grid → Level detail accordion → Start classwork → Submit all → Mission report → RETRY |
| Practice flow | Login → Training Arena 4 cards → Setup config → Start session → Submit all → Victory |
| Profile flow | Login → Profile tab → Edit display_name → Save → Verify persisted |
| Multi-attempt | ClassworkPage: submit wrong answer → submit correct answer → Mission report shows Fixed verdict |
| Locked states | Locked level in grid: click does not navigate. Locked TopicRow: Engage button not clickable |

### Manual QA Checklist Per Phase

**Phase 1 (Shell):**
- [ ] Sidebar: visible at 1440px on Hub/Learn/Practice/Profile routes
- [ ] Sidebar: hidden at 767px
- [ ] BottomNav: visible at 767px on Hub/Learn/Practice/Profile routes
- [ ] BottomNav: hidden at 1440px
- [ ] ClassworkPage at 1440px: no sidebar, no bottom nav (focus mode confirmed)
- [ ] InArenaPage at 1440px: no sidebar, no bottom nav
- [ ] Active route highlighted correctly after navigation
- [ ] Sidebar profile strip shows display_name and level

**Phase 2 (Hub + Level Selection + PathOfConquest):**
- [ ] Level grid: 5 columns at 1440px, 2 at 768px, 1 at 390px
- [ ] Rank names correct: L1=INITIATE, L10=LEGEND
- [ ] Current level card has glow and "Current Mission" label
- [ ] PathOfConquest accordion: expands/collapses; chevron animates
- [ ] Locked lesson accordion: header grayed, TopicRow buttons non-interactive
- [ ] Classwork Engage starts session on lesson-scoped endpoint (check network tab)
- [ ] PathOfConquest loading skeleton renders on API call
- [ ] PathOfConquest error state renders with Retry on simulated API failure

**Phase 3 (Session Screens):**
- [ ] ClassworkPage: breadcrumb shows "Level N / Class M"
- [ ] FeedbackToast appears on answer; disappears after 600ms
- [ ] Multi-attempt: wrong then correct → AttemptsTable shows Fixed
- [ ] XP bar renders in MissionReport (with or without real threshold data)

**Phase 4 (Arena + Profile):**
- [ ] TrainingArena: 4 bento cards render with correct labels and colors
- [ ] ArenaSetupPage: SegmentedToggle has zero imports (grep check)
- [ ] Profile: display_name edit + save works (verified via network call)
- [ ] Profile: selecting preset avatar calls PATCH with allowlisted URL
- [ ] Logout: clears auth state, redirects to /login

---

## 9. Migration / Back-Compat Notes

**Route change (lesson-scoped classwork):** Old route `/learn/level/:id/classwork` kept in router until Wave 3 QA sign-off. New route `/learn/level/:levelId/lesson/:lessonId/classwork` added alongside. Old `StartClassworkView` endpoint kept intact — never removed until new endpoint is stable.

**ArenaSetupPage SegmentedToggle removal:** Pure frontend visual change. `useStartPractice()` payload unchanged. `SegmentedToggle` deleted from `ArenaSetupPage` only — not from shared/ui until Wave 5 deprecation sweep confirms zero other usages.

**BackLink deprecation:** Remove imports per-page as each page ships. Delete file in Wave 5 after all imports confirmed zero.

**No feature flags needed:** App has no production users requiring A/B stability. All changes are additive (new components) or full-page replacements (not inline modifications). The `ShellLayout` approach is the only structural risk, handled by the 2-person router review in W1-T04.

**W3-B01 data migration:** Append-only model means existing `QuestionAttempt` rows cannot be updated — only new rows can be added. The backfill in migration 0004 uses `RunSQL` or `RunPython` to SET `attempt_number=1` on all existing rows. After migration, the unique constraint is on `(session, question_index, attempt_number)`, so all existing rows (with `attempt_number=1`) remain uniquely constrained.
