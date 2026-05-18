# Plan: Bolt Abacus — Architecture Scaffold

## Context

Greenfield project. PRD v1.0 is fully read. Figma (wMgk2iCT5zY3uPd1wCI9Ju) has 9 screens
all analyzed. No code exists yet. Stack is locked: Django 5 / DRF / React 18 / Vite / TypeScript /
Zustand / React Query / SimpleJWT.

**Applying `/simplify`:** The original prompt asks for 4 architecture docs, full models for
9 Django apps, TypeScript interfaces for 15+ entities, and 12+ deliverable files — all stubs.
That's spec theater. We create the minimum scaffold needed to open a PR and start building
feature 1 (auth → hub screen). Everything else is added as those features are built.

---

## P0 Blocker to Flag Before Closing This Plan

The PRD (section 10, item #1) marks the **Login/Auth screen** as a **P0 blocker** — no design
exists in Figma. We will scaffold the auth app and stub the endpoints, but the login UI cannot
be built until design delivers that screen. This must be called out in the architecture doc.

---

## What We Scaffold (Minimum Viable Structure)

### 1. Backend — Django project skeleton

**Files to create:**

```
/backend/
  manage.py
  requirements/
    base.txt          # django, djangorestframework, psycopg2, redis, celery, simplejwt, django-environ, django-cors-headers, Pillow
    development.txt   # pytest-django, factory-boy, django-debug-toolbar
    production.txt    # gunicorn, sentry-sdk
  config/
    __init__.py
    urls.py           # /api/v1/ routing, /admin/
    wsgi.py
    asgi.py
    settings/
      __init__.py
      base.py         # Full config: custom user, DRF+JWT, Redis cache, Celery, CORS, logging
      development.py  # DEBUG=True, sqlite fallback commented out (use postgres)
      production.py   # SECURE_*, ALLOWED_HOSTS, S3 stub
  apps/
    users/            # Custom User model (UUID PK), roles, JWT view stubs
      __init__.py
      models.py       # User (AbstractBaseUser), UserProfile, UserRole enum
      admin.py
      apps.py
      serializers.py  # stub
      urls.py         # /api/v1/auth/ — register, login, refresh, me
      views.py        # stub
    courses/          # Curriculum structure
      models.py       # Level, Lesson, ContentBlock (UUID PKs)
    exercises/        # Exercise definitions and session logic
      models.py       # Exercise, ExerciseConfig, ArenaSession
    progress/         # All student progress — append-only
      models.py       # ProgressRecord, XPEvent, LevelCompletion
```

**Key model decisions (from PRD):**
- `User`: UUID PK, `role` field (STUDENT/TEACHER/PARENT/ADMIN), extends `AbstractBaseUser`
- `Level`: has `order`, `name` (matches 10 Figma names), `is_locked` computed from progress
- `Exercise`: has `operation` (ADD/SUB/MUL/DIV), `digit_count`, `row_count`, `time_limit_sec`
- `ProgressRecord`: append-only (no updates, no deletes) — `score`, `accuracy`, `time_taken_sec`, `xp_earned`
- `XPEvent`: every XP award logged separately for the HUD stats (⚡🔥🏆 — mapping TBD per PRD open item #5)

Apps NOT scaffolded yet (added when features are built): `classroom`, `notifications`,
`payments`, `analytics`, `assessments`. The original prompt would create 9 empty app skeletons —
those add noise until needed.

---

### 2. Frontend — React + Vite skeleton

**Files to create:**

```
/frontend/
  package.json          # react, react-dom, typescript, vite, tailwindcss, zustand, @tanstack/react-query, axios, react-router-dom
  vite.config.ts        # path aliases (@/), proxy to :8000
  tsconfig.json         # strict, path aliases
  tailwind.config.ts    # extends tokens from tokens.css
  index.html
  src/
    main.tsx
    App.tsx
    router.tsx          # All 9 routes, lazy-loaded
    styles/
      tokens.css        # CSS custom properties from Figma (see §3 below)
    shared/
      api/
        client.ts       # Axios instance, JWT interceptor
      store/
        authStore.ts    # Zustand: current user, token
      types/
        index.ts        # User, Level, Exercise, ProgressRecord, XPEvent (5 core interfaces)
      ui/               # Empty — filled as components are built
    features/
      auth/             # Login/Register stubs (P0 — awaiting Figma auth screen)
        LoginPage.tsx
        RegisterPage.tsx
      hub/
        HubPage.tsx     # Hub screen (1:2) — 2 portal cards, hero text
      learn/
        LevelSelectionPage.tsx   # Level grid (1:58)
        PathOfConquestPage.tsx   # Vertical path (1:272)
        ClassworkPage.tsx        # Session screen (1:619)
        MissionReportPage.tsx    # Results (1:678)
      practice/
        TrainingArenaPage.tsx    # Mode selection (1:183)
        ArenaSetupPage.tsx       # Config screen (1:397)
        InArenaPage.tsx          # Active session (1:553)
        VictoryPage.tsx          # Results (1:795)
      abacus/
        components/
          Abacus.tsx             # Stub — renders placeholder
          AbacusRow.tsx
          Bead.tsx
        hooks/
          useAbacusState.ts      # Bead position Zustand slice
        utils/
          abacusCalculator.ts    # Stub: beadPositions → numeric value
        types/
          abacus.types.ts
```

**Router:** All feature pages are `React.lazy()` + `<Suspense>`. Auth guard wraps
`/hub`, `/learn/*`, `/practice/*`. Auth pages (`/login`, `/register`) redirect if
already authenticated.

---

### 3. Design tokens (from Figma analysis)

`tokens.css` will define CSS custom properties for every token confirmed in PRD §2.2:

```css
/* Colors */
--color-bg-base: #1A1A1A;
--color-bg-deep: #0F0F0F;
--color-surface: #262626;
--color-primary: #F2C94C;        /* yellow CTA, headings */
--color-accent-blue: #0EA5E9;    /* Zen Mode */
--color-accent-purple: #8B5CF6;  /* The Lab */
--color-accent-orange: #F97316;  /* Time Attack */
--color-success: #22C55E;
--color-error: #EF4444;
--color-text-primary: #FFFFFF;
--color-text-secondary: #9CA3AF;
--color-border: #3F3F46;
--color-glass: rgba(255,255,255,0.06);

/* Typography */
--font-display: 'Bebas Neue', sans-serif;   /* hero headings */
--font-body: 'Inter', sans-serif;           /* UI copy */
--font-mono: 'Space Mono', monospace;       /* math problem display — tabular nums */

/* Spacing */
--space-xs: 4px; --space-sm: 8px; --space-md: 16px;
--space-lg: 24px; --space-xl: 40px; --space-2xl: 64px;

/* Radius */
--radius-sm: 8px; --radius-md: 12px; --radius-lg: 16px; --radius-pill: 9999px;
```

`tailwind.config.ts` maps these vars into Tailwind's `theme.extend` so classes like
`bg-surface`, `text-primary`, `font-display` work throughout.

---

### 4. Config files

| File | Content |
|------|---------|
| `docker-compose.yml` | postgres:16, redis:7, backend (gunicorn dev), frontend (vite dev), celery worker |
| `.env.example` | All vars documented: `DJANGO_SECRET_KEY`, `DATABASE_URL`, `REDIS_URL`, `CORS_ALLOWED_ORIGINS`, `JWT_*` |
| `backend/config/settings/base.py` | Full DRF+JWT config, Redis cache, Celery broker, CORS, logging, custom user model ref |

---

### 5. One architecture doc

`/docs/ARCHITECTURE.md` (single file, not 4):
- Database choices and justification (Postgres + Redis; no ClickHouse yet — flagged as future)
- Django app map and why each app boundary was drawn where it is
- **P0 gap: auth screen missing from Figma** — engineering cannot build login UI until design delivers it
- Other open items from PRD §10 that block engineering: HUD icon mapping, XP formula, Flash Cards session UI, Zen Mode session UI
- Recommended build order: Auth → Hub → Level Selection → Classwork session → Practice session → Results screens

---

## What's Explicitly OUT of Scope for This Scaffold

- Separate `DATABASE_STRATEGY.md`, `API_CONTRACTS.md`, `ARCHITECTURE_GAPS.md` — folded into one doc
- Full DRF serializers and views (added when building each feature)
- Models for `classroom`, `notifications`, `payments`, `analytics`, `assessments` (added when features are built)
- ClickHouse / analytics event pipeline (flagged future scope in ARCHITECTURE.md)
- S3 media storage config (stub only in production.py — not wired)
- All 15 TypeScript interfaces from the original prompt (5 core ones; rest added with their features)
- Full pytest fixtures and factory-boy setup (added with first feature tests)

---

## Verification

After scaffold is complete:
1. `docker-compose up` → postgres, redis, backend, frontend all start without errors
2. `cd backend && python manage.py migrate` → migrations run clean
3. `cd backend && python manage.py check` → no system check errors
4. `cd frontend && npm run dev` → Vite starts, router renders hub placeholder at `/hub`
5. `cd frontend && npm run build` → TypeScript compiles with zero errors
6. All 9 routes exist in `router.tsx` and render their lazy-loaded page stub without crashing
