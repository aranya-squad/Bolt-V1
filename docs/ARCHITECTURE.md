# Bolt Abacus — Architecture

> **Status:** v1.1 — senior-architect revision of the original scaffold plan
> **Last updated:** May 2026
> **Audience:** Engineers building from this document. Read **§1 (Review Notes)** before reading anything else — it lists exactly what changed from the original plan and why.

---

## Table of Contents

1. [Review Notes — What Changed and Why](#1-review-notes)
2. [P0 Open Questions That Block Scaffold](#2-p0-open-questions)
3. [Stack Decisions — Justified](#3-stack-decisions)
4. [System Architecture](#4-system-architecture)
5. [Backend Architecture](#5-backend-architecture)
6. [Frontend Architecture](#6-frontend-architecture)
7. [Data Architecture](#7-data-architecture)
8. [Auth, Roles & Children's Data Compliance](#8-auth-roles-compliance)
9. [Question Generation & Curriculum Strategy](#9-question-generation)
10. [Anti-Cheat & Session Integrity](#10-anti-cheat)
11. [API Contracts](#11-api-contracts)
12. [Testing Strategy](#12-testing-strategy)
13. [Performance Budget](#13-performance-budget)
14. [Accessibility Plan](#14-accessibility)
15. [Internationalization](#15-i18n)
16. [DevOps & CI/CD](#16-devops)
17. [Security](#17-security)
18. [Revised Build Order](#18-build-order)
19. [Deferred Work (with Triggers)](#19-deferred-work)
20. [Verification Checklist](#20-verification)

---

<a name="1-review-notes"></a>
## 1. Review Notes — What Changed and Why

The original plan was a good first pass on file structure but had a systemic flaw: it applied `/simplify` to *avoid difficult thinking*, not to avoid *unnecessary deliverables*. Simplification should remove noise. The original removed concerns that are load-bearing on day 1.

### 1.1 What was kept from the original plan

| Decision | Status | Why |
|---|---|---|
| One ARCHITECTURE.md instead of four docs | ✅ Kept | Correct call. Four docs drift. |
| UUID primary keys | ✅ Kept | Correct for distributed/auditable systems. |
| Append-only progress records | ✅ Kept | Correct for analytics + integrity. |
| Custom `User` model from day 1 | ✅ Kept | Cannot be added later without painful migration. |
| Defer `payments`, `notifications`, `analytics` apps | ✅ Kept | Real YAGNI. |
| Postgres + Redis (no ClickHouse yet) | ✅ Kept | Right call until event volume justifies it. |
| Lazy-loaded routes + path aliases | ✅ Kept | Standard. |
| Tokens-as-CSS-vars + Tailwind `theme.extend` | ✅ Kept | Single source of truth. |
| Flagging missing login screen as P0 blocker | ✅ Kept | Correctly identified. |

### 1.2 What was changed or added

| Issue in original | Resolution in this revision |
|---|---|
| **No compliance plan for child users (ages 5–10)** | Added §8.3 — COPPA/GDPR-K/DPDP-aligned auth design. Required before any login UI ships. |
| **Stubbed `abacus/` feature with no design backing** | Flagged as P0 ambiguity in §2. Either it's dead code (delete) or design owes us a spec. No code until resolved. |
| **No question generator design** | Added §9 — full generator architecture, seeding strategy, Classwork vs. Practice distinction. |
| **Multi-role relations missing** | Added §8.2 — `Family`, `Class`, `Enrollment`, `Guardianship` join models scaffolded from day 1. |
| **No per-question tracking** | Added `QuestionAttempt` model alongside `ProgressRecord` (§7.2). Mission Report breakdown table requires this. |
| **No anti-cheat / server validation** | Added §10 — session token model, server-validated answer submission, XP awarded server-side only. |
| **No API contract strategy** | Added §11 — drf-spectacular + auto-generated TS client. No drift. |
| **Frontend testing completely deferred** | Added §12 — Vitest + Playwright + axe-core wired in the scaffold. Tests added with each feature, but the test harness ships in the scaffold. |
| **No i18n wiring** | Added §15 — react-i18next + Django gettext from day 1. English-only at launch, structure ready for Hindi/Telugu/Tamil. |
| **No performance budget** | Added §13 — explicit JS bundle limits, Lighthouse CI in pipeline. |
| **No accessibility tooling** | Added §14 — axe-core in unit tests, manual screen-reader pass per feature, color-contrast verified for `#F2C94C` on `#1A1A1A`. |
| **No CI/CD plan** | Added §16 — GitHub Actions: lint, type-check, test, build, deploy preview. |
| **No rate limiting / JWT rotation** | Added §17 — DRF throttling + refresh-token rotation + sliding session for kids. |
| **Build order led with auth (P0-blocked)** | Revised order in §18: foundation → backend core → frontend shell → hub → Classwork → reports → practice flow. Auth login UI scheduled when design unblocks. |

### 1.3 Stack tradeoffs not acknowledged in the original

The original treated the stack as "locked" with no commentary. As a senior architect, the stack is fine **but here's what you're trading off** so the team knows:

- **Django + DRF**: Mature, batteries-included, great admin (curriculum team will use it). Cost: heavier than FastAPI; ORM queries in N+1 are easy to miss. Mitigated by `django-debug-toolbar` in dev and explicit `select_related`/`prefetch_related` in every list view.
- **SimpleJWT**: Simple to wire. Cost: stateless tokens mean we can't easily revoke without a denylist. Mitigated by §17.3 (Redis-backed refresh denylist).
- **Zustand + React Query**: Lightweight. Cost: more boilerplate than Redux Toolkit for complex domains. Acceptable because this product has small domain state (auth, session, abacus if it exists) and most state is server-derived (React Query handles it).
- **Vite**: Fast dev, great DX. Cost: build output isn't as battle-tested as webpack for some edge-case polyfill needs. Acceptable.

---

<a name="2-p0-open-questions"></a>
## 2. P0 Open Questions That Block Scaffold

These are the questions that must be answered before the scaffold PR can be merged. The original plan flagged item #1 only.

| # | Question | Owner | Why it blocks scaffold |
|---|---|---|---|
| 1 | **Login screen design** — no Figma asset exists | Design | Cannot build auth UI; can build endpoints. **Mitigated**: see §8.4 for dev-only placeholder login. |
| 2 | **Is there an on-screen abacus widget?** No Figma screen shows one. PRD §9.2 implies math is text-rendered. Original plan stubbed `abacus/` regardless. | Product + Design | Either it's a major missing feature (then design owes a spec, and we need significant effort: bead physics, touch, a11y, anti-cheat for bead manipulation) or it's dead code (then delete `abacus/`). |
| 3 | **HUD icon mapping (⚡🔥🏆)** | Product | Affects `XPEvent` event types and the `me` endpoint payload. Stub with placeholder enums for now. |
| 4 | **XP formula** — per-correct, per-session, streak bonuses, level thresholds | Product | Affects `Level.xp_threshold` field and `XPEvent` calculation. Stub with constants in `apps/progress/xp_rules.py`. |
| 5 | **Is Custom Setup operation single-select or multi-select?** Figma shows single. PRD §10 item #10 says PM doc may intend multi. | Product | Affects `ArenaSessionConfig.operation` (FK vs M2M). Default to single per Figma; flag for change. |
| 6 | **Parental consent model** — opt-in flow, who registers the child? | Product + Legal | Affects entire signup flow. **Default**: guardian registers and creates child sub-accounts. See §8.3. |

**Action**: Items 1–6 should be answered before the end of Sprint 0. Items 3–6 can be stubbed with sensible defaults so engineering is not blocked.

---

<a name="3-stack-decisions"></a>
## 3. Stack Decisions

### 3.1 Confirmed stack

```
Backend:    Python 3.12, Django 5.0, DRF 3.15, SimpleJWT 5.3
            Postgres 16, Redis 7, Celery 5 (later)
            drf-spectacular (OpenAPI), django-cors-headers
            pytest-django, factory-boy

Frontend:   Node 20 LTS, React 18, TypeScript 5.4, Vite 5
            Tailwind 3.4, Zustand 4, TanStack Query 5
            React Router 6, axios, react-i18next
            Vitest, Playwright, @axe-core/playwright

Infra:      Docker Compose (dev), GitHub Actions (CI)
            Sentry (prod errors), Lighthouse CI (perf)
            S3-compatible storage (prod PDFs/avatars)
```

### 3.2 Deliberately deferred

| Tech | Trigger to add |
|---|---|
| Celery + Celery Beat | First async job (email, PDF gen, scheduled XP recompute). Wired in `base.py` but not started. |
| WebSockets / Channels | Live classroom features (multi-student). Not in v1. |
| ClickHouse / event warehouse | When `XPEvent` table > 50M rows or analytics queries > 2s. |
| Feature flags (Unleash/LaunchDarkly) | When first A/B test is requested. Currently use Django settings constants. |
| S3 + CloudFront for PDFs | When prod deploys. Dev uses local volume. |

---

<a name="4-system-architecture"></a>
## 4. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (Chrome 120+, Firefox 120+, Safari 17+)            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  React 18 SPA (Vite-built)                           │   │
│  │  - React Router (lazy routes)                        │   │
│  │  - Zustand (auth, session-local state)               │   │
│  │  - TanStack Query (server cache)                     │   │
│  │  - i18next (locale)                                  │   │
│  │  - Auto-generated TS client (from OpenAPI)           │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │ HTTPS (JWT in Authorization header)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Nginx (reverse proxy, prod only)                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Gunicorn workers → Django 5 + DRF                          │
│                                                              │
│  apps/                                                       │
│   ├─ users         (auth, profile, roles, guardianship)     │
│   ├─ courses       (Level, Lesson, ContentBlock)            │
│   ├─ exercises     (Exercise templates, generator, sessions)│
│   ├─ progress      (ProgressRecord, QuestionAttempt, XP)    │
│   └─ classroom     (Class, Enrollment) — minimal in v1      │
│                                                              │
│  drf-spectacular → /api/v1/schema/ → frontend TS client     │
└─────────────────────────────────────────────────────────────┘
        │                            │                  │
        ▼                            ▼                  ▼
┌───────────────────┐      ┌──────────────────┐    ┌──────────────┐
│  Postgres 16      │      │  Redis 7         │    │  S3 / Volume │
│  - All domain     │      │  - Session cache │    │  - PDFs      │
│  - Append-only    │      │  - JWT denylist  │    │  - Avatars   │
│    progress       │      │  - Rate limit    │    │              │
│  - Partitioned    │      │  - Celery broker │    │              │
│    XPEvent        │      │    (future)      │    │              │
└───────────────────┘      └──────────────────┘    └──────────────┘
```

### 4.1 Request lifecycle (Classwork session example)

1. Student lands on `/learn/level/4/classwork`.
2. Frontend calls `POST /api/v1/sessions/classwork` with `{ level_id: 4 }`.
3. Backend: validates enrollment + level unlock state → creates `ArenaSession` row → generates 30 questions deterministically (seeded from session UUID + level config) → returns `{ session_id, questions[] }` with **answers stripped**.
4. Frontend stores `session_id` in Zustand session slice. Renders question 1.
5. Per question: student types answer → frontend `POST /api/v1/sessions/{id}/attempts` with `{ question_index, answer, elapsed_ms }`.
6. Backend validates against stored answer → writes `QuestionAttempt` → returns `{ verdict, xp_delta }`.
7. After last question: backend computes session score → writes `ProgressRecord` + cumulative `XPEvent` → returns Mission Report payload.
8. Frontend navigates to `/learn/level/4/report` and renders.

**Why this matters**: answers never reach the client except as the `QuestionAttempt` response. XP is computed server-side only. See §10.

---

<a name="5-backend-architecture"></a>
## 5. Backend Architecture

### 5.1 Directory layout

```
/backend/
├── manage.py
├── pyproject.toml
├── requirements/
│   ├── base.in
│   ├── development.in
│   ├── production.in
│   └── (compiled .txt files generated by pip-compile)
├── config/
│   ├── __init__.py
│   ├── urls.py
│   ├── wsgi.py
│   ├── asgi.py
│   └── settings/
│       ├── __init__.py
│       ├── base.py
│       ├── development.py
│       ├── production.py
│       └── test.py           ← added: fast in-memory-like DB config for tests
├── apps/
│   ├── users/
│   │   ├── models.py          # User, Profile, Guardianship, ConsentRecord
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── permissions.py     # IsStudent, IsGuardianOfStudent, IsTeacherOfStudent
│   │   ├── managers.py        # UserManager
│   │   └── tests/
│   ├── courses/
│   │   └── models.py          # Level, Lesson, ContentBlock, Material(PDF)
│   ├── exercises/
│   │   ├── models.py          # ExerciseTemplate, ArenaSession, ArenaSessionConfig
│   │   ├── generators/
│   │   │   ├── __init__.py
│   │   │   ├── base.py        # Abstract QuestionGenerator
│   │   │   ├── procedural.py  # For Practice (Custom Setup / Time Attack / Zen)
│   │   │   └── curated.py     # For Classwork/Homework (curriculum-tied)
│   │   └── tests/
│   ├── progress/
│   │   ├── models.py          # ProgressRecord, QuestionAttempt, XPEvent, LevelCompletion
│   │   ├── xp_rules.py        # XP formula (stubbed pending product decision)
│   │   └── tests/
│   └── classroom/
│       └── models.py          # Class, Enrollment (minimal)
├── docs/
│   └── ARCHITECTURE.md        # This file
└── docker/
    ├── Dockerfile.dev
    └── Dockerfile.prod
```

### 5.2 Why `classroom` IS scaffolded now

The original plan deferred `classroom` to "added when features are built." That's wrong because:

- A student needs to be in a `Class` to be assigned `Level`s by a teacher.
- A parent needs to be linked to a student via `Guardianship`.
- Access control (`IsTeacherOfStudent`, `IsGuardianOfStudent` permissions) depends on these relations existing on day 1.

The `classroom` app ships with minimal models (`Class`, `Enrollment`) only. Class scheduling, attendance, announcements — those are deferred.

### 5.3 App responsibilities

| App | Owns | Does NOT own |
|---|---|---|
| `users` | Auth, User, Profile, Guardianship, ConsentRecord, role enums | Class membership (→ classroom), session activity (→ progress) |
| `courses` | Level, Lesson, ContentBlock, Material (PDF) | Sessions (→ exercises), per-student state (→ progress) |
| `exercises` | ExerciseTemplate, ArenaSession, generators | Per-question results (→ progress) |
| `progress` | ProgressRecord, QuestionAttempt, XPEvent, LevelCompletion | Anything mutable (it's append-only) |
| `classroom` | Class, Enrollment | Teacher dashboards (deferred) |

### 5.4 Settings layering

```python
# config/settings/base.py
# - Default to safe production-grade settings
# - All secrets via django-environ
# - Custom AUTH_USER_MODEL = "users.User"
# - DRF: JWT auth, drf-spectacular, throttling, pagination
# - LOGGING: structured JSON via python-json-logger

# config/settings/development.py
# - DEBUG = True
# - Postgres via docker-compose (NEVER sqlite — schema drift)
# - django-debug-toolbar enabled
# - Permissive CORS for localhost:5173

# config/settings/production.py
# - SECURE_* directives (HSTS, SSL redirect)
# - Sentry SDK
# - S3 for media via django-storages
# - Restricted CORS

# config/settings/test.py
# - PASSWORD_HASHERS = ["MD5PasswordHasher"]  # speed only
# - CELERY_TASK_ALWAYS_EAGER = True
```

The original plan said "sqlite fallback commented out." Dev must use the same DB as prod or migrations diverge.

---

<a name="6-frontend-architecture"></a>
## 6. Frontend Architecture

### 6.1 Directory layout

```
/frontend/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── playwright.config.ts       ← added
├── vitest.config.ts           ← added
├── index.html
├── public/
│   └── locales/               ← added: i18n JSON
│       └── en/
│           ├── common.json
│           ├── hub.json
│           ├── learn.json
│           └── practice.json
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── router.tsx
    ├── i18n.ts                ← added: react-i18next bootstrap
    ├── styles/
    │   ├── tokens.css
    │   └── globals.css
    └── shared/
    │   ├── api/
    │   │   ├── client.ts      # axios instance + JWT interceptor + refresh
    │   │   └── queries/       # TanStack Query hooks per domain
    │   │       ├── useMe.ts
    │   │       ├── useLevels.ts
    │   │       └── useSession.ts
    │   ├── store/
    │   │   ├── authStore.ts
    │   │   └── sessionStore.ts ← added: in-session local state
    │   ├── types/
    │   │   └── index.ts
    │   ├── ui/                 # design-system primitives (filled as features need them)
    │   ├── hooks/
    │   └── lib/
    └── features/
        ├── auth/
        │   ├── LoginPage.tsx   # dev placeholder; awaiting Figma
        │   └── RegisterPage.tsx
        ├── hub/
        │   └── HubPage.tsx
        ├── learn/
        │   ├── LevelSelectionPage.tsx
        │   ├── PathOfConquestPage.tsx
        │   ├── ClassworkPage.tsx
        │   └── MissionReportPage.tsx
        ├── practice/
        │   ├── TrainingArenaPage.tsx
        │   ├── ArenaSetupPage.tsx
        │   ├── InArenaPage.tsx
        │   └── VictoryPage.tsx
        └── shared/
            ├── NotFoundPage.tsx
            ├── PageSkeleton.tsx
            ├── ProtectedRoute.tsx
            └── PublicRoute.tsx
```

`abacus/` is NOT scaffolded — see §2 Q2.

### 6.2 State management — three layers

| Layer | Tech | Holds | Lifetime |
|---|---|---|---|
| **Server state** | TanStack Query | Levels, Profile, Session metadata, Reports | Stale-while-revalidate per query |
| **Global client state** | Zustand (`authStore`) | Current user, JWT (memory only), refresh token (httpOnly cookie) | Persisted to `localStorage` for user identity only |
| **Session-local state** | Zustand (`sessionStore`) | Active question index, local answer buffer, timer ms remaining | Cleared on session end / unmount |

Rule: anything the server can recompute → React Query. Anything ephemeral to one screen flow → sessionStore. Auth identity → authStore.

### 6.3 Design system primitives (day-1 interfaces)

- `<Button variant="primary|ghost|outline">` — yellow/transparent/bordered
- `<Card>` — glassmorphic surface
- `<Pill>` — small status indicators (timer, question counter, verdict)
- `<StatBlock>` — score/accuracy/time blocks reused on Mission Report + Victory
- `<XPBar>` — progress bar reused on results screens
- `<LevelBadge>` — circular icon with state (completed/current/locked)

These ship as TypeScript interface + Tailwind class skeletons and get implementations as features need them.

### 6.4 Router structure

```tsx
// router.tsx
const router = createBrowserRouter([
  { path: '/login', element: <PublicRoute><LoginPage /></PublicRoute> },
  { path: '/register', element: <PublicRoute><RegisterPage /></PublicRoute> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/', element: <Navigate to="/hub" /> },
      { path: '/hub', element: <HubPage /> },
      { path: '/learn', element: <LevelSelectionPage /> },
      { path: '/learn/level/:levelId', element: <PathOfConquestPage /> },
      { path: '/learn/level/:levelId/classwork', element: <ClassworkPage /> },
      { path: '/learn/level/:levelId/report/:sessionId', element: <MissionReportPage /> },
      { path: '/practice', element: <TrainingArenaPage /> },
      { path: '/practice/setup/:mode', element: <ArenaSetupPage /> },
      { path: '/practice/session/:sessionId', element: <InArenaPage /> },
      { path: '/practice/victory/:sessionId', element: <VictoryPage /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
```

All feature pages are `React.lazy()` + `<Suspense fallback={<PageSkeleton />}>`.

---

<a name="7-data-architecture"></a>
## 7. Data Architecture

### 7.1 Core entities (abbreviated)

```python
# apps/users/models.py
class User(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=16, choices=Role.choices)  # STUDENT/GUARDIAN/TEACHER/ADMIN
    date_of_birth = models.DateField(null=True, blank=True)  # required for STUDENT, used for COPPA
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

class Guardianship(models.Model):
    guardian = models.ForeignKey(User, related_name='guarded_students', on_delete=models.CASCADE)
    student = models.ForeignKey(User, related_name='guardians', on_delete=models.CASCADE)
    consent_record = models.ForeignKey('ConsentRecord', on_delete=models.PROTECT)
    class Meta:
        unique_together = [('guardian', 'student')]

class ConsentRecord(models.Model):
    """Immutable record of parental consent — needed for COPPA/GDPR-K/DPDP."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    guardian_email = models.EmailField()
    student_dob = models.DateField()
    consent_given_at = models.DateTimeField()
    consent_method = models.CharField(max_length=32)
    ip_address = models.GenericIPAddressField()
    jurisdiction = models.CharField(max_length=8)  # US, EU, IN
```

```python
# apps/exercises/models.py
class ArenaSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    kind = models.CharField(max_length=16)  # CLASSWORK, HOMEWORK, ZEN, TIME_ATTACK, CUSTOM
    seed = models.BigIntegerField()          # deterministic question generation seed
    questions_json = models.JSONField()      # full question set with answers — NEVER served to client
    started_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    abandoned_at = models.DateTimeField(null=True, blank=True)
```

```python
# apps/progress/models.py
class QuestionAttempt(models.Model):
    """Per-question record. Append-only. Required for Mission Report breakdown."""
    session = models.ForeignKey(ArenaSession, related_name='attempts', on_delete=models.CASCADE)
    question_index = models.PositiveSmallIntegerField()
    expected_answer = models.IntegerField()
    submitted_answer = models.IntegerField()
    is_correct = models.BooleanField()
    elapsed_ms = models.PositiveIntegerField()
    submitted_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        unique_together = [('session', 'question_index')]

class XPEvent(models.Model):
    """Every XP delta, granular for HUD stats. Append-only."""
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    event_type = models.CharField(max_length=32)   # SESSION_COMPLETE, STREAK_BONUS, LEVEL_UP
    delta = models.IntegerField()
    source_session = models.ForeignKey(ArenaSession, null=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)
```

### 7.2 Append-only enforcement

`ProgressRecord`, `QuestionAttempt`, and `XPEvent` must not support updates or deletes. Enforced three ways:

1. **Service layer**: Only `apps/progress/services.py::record_*` functions write to these tables.
2. **Django admin**: No `ModelAdmin` with update/delete for these models.
3. **DB triggers (prod)**: `BEFORE UPDATE OR DELETE` triggers raise an exception. Migration adds these.

### 7.3 Partitioning strategy (future)

`XPEvent` grows ~35 rows/session/user/day. At 10k DAU: ~130M rows/year. Plan: partition by month using PostgreSQL declarative partitioning. Migration script added when prod load justifies it (see §19).

---

<a name="8-auth-roles-compliance"></a>
## 8. Auth, Roles & Children's Data Compliance

### 8.1 Roles

| Role | Can do |
|---|---|
| `STUDENT` | Play sessions, view own progress, view assigned levels |
| `GUARDIAN` | Register/manage 1+ STUDENT accounts, view their progress, give/revoke consent |
| `TEACHER` | View students in their Classes, assign levels, view aggregate reports |
| `ADMIN` | All curriculum management via Django admin |

### 8.2 Relations

```
Guardian (User) ──────────────────────────── Guardianship ──> Student (User)
                         └──> ConsentRecord (immutable)

Teacher (User) ──> Class <── Enrollment ──> Student (User)
                     └──> assigned_levels (M2M to Level)
```

### 8.3 Children's data compliance (COPPA/GDPR-K/DPDP)

This is non-negotiable for ages 5–10:

1. **Guardian registers first**, then creates child sub-accounts. No direct child signup.
2. `ConsentRecord` is immutable. Records consent method + jurisdiction at signup.
3. **Data minimization**: child accounts collect display name + DOB only.
4. **No marketing or social features** for child accounts in v1.
5. **Right to deletion**: guardian can request deletion. Cascade clears all child PII.
6. **Audit log**: every guardian action on a child account writes to `AuditEvent`.

Must be reviewed by legal counsel before launch.

### 8.4 Dev workaround for missing login Figma

- `LoginPage.tsx` ships as an unstyled functional form with a "DEV LOGIN — production design pending" banner.
- Auth endpoints (`register`, `login`, `refresh`, `me`) are fully built and tested.
- When Figma ships, swap the UI without touching the API.

### 8.5 JWT strategy

- **Access token**: 15 min, JWT in memory (Zustand), never `localStorage`.
- **Refresh token**: 7 days, opaque, stored in httpOnly secure cookie.
- **Rotation**: every refresh issues a new token; old one added to Redis denylist.
- **Idle timeout for STUDENT**: 30 min of inactivity → force re-login.

---

<a name="9-question-generation"></a>
## 9. Question Generation & Curriculum Strategy

### 9.1 Two generator types

| Generator | Used by | Behavior |
|---|---|---|
| `CuratedGenerator` | Classwork, Homework | Reads `ExerciseTemplate.config_json`, applies curriculum rules per lesson |
| `ProceduralGenerator` | Custom, Time Attack, Zen, Flash Cards | Generates from runtime config (digits, rows, operation) |

### 9.2 Deterministic seeding

Every `ArenaSession` carries a `seed: BigInteger`. The same `(seed, config)` always produces the same questions. This enables reproducible test fixtures, audit replay, and "Retake Session" (same questions).

```python
# apps/exercises/generators/procedural.py
import random

class ProceduralGenerator:
    def __init__(self, seed: int, config: dict):
        self.rng = random.Random(seed)
        self.config = config

    def generate(self) -> list:
        return [self._one(i) for i in range(self.config['question_count'])]

    def _one(self, idx: int) -> dict:
        op = self.config['operation']
        lo = 10 ** (self.config['digits'] - 1)
        hi = 10 ** self.config['digits'] - 1
        operands = [self.rng.randint(lo, hi) for _ in range(self.config['rows'])]
        if op == 'ADD':
            answer = sum(operands)
            text = ' + '.join(map(str, operands))
        # SUB, MUL, DIV with safeguards (no division by zero, no negative results for v1)
        return {'text': text, 'answer': answer, 'operation': op}
```

### 9.3 Answer security

Answers are in `ArenaSession.questions_json` server-side only. The API strips answers before responding to the client. See §10.

---

<a name="10-anti-cheat"></a>
## 10. Anti-Cheat & Session Integrity

### 10.1 Threats and mitigations

| Threat | Mitigation |
|---|---|
| Modifying JS to mark all answers correct | Answers never sent to client; verdict computed server-side |
| Submitting answers instantly to skip timing | Server records `submitted_at`; rejects implausibly fast submissions |
| Replaying a session for higher XP | `LevelCompletion.best_progress_record` keeps the best; XP only on first completion |
| Brute-forcing answers (submit, see verdict, retry) | One submission per `question_index`; second returns 409 |
| Generating fake `XPEvent` rows via API | No client-writable endpoint; XP written only by `apps/progress/services.py` |

### 10.2 Session progression

A session can only advance in order (`question_index = N + 1`). Skipping returns 422.

### 10.3 Abandonment

Session with no attempts for > 2× the time limit is marked `abandoned_at` by a Celery beat task (wired in scaffold, job added in feature work).

---

<a name="11-api-contracts"></a>
## 11. API Contracts

### 11.1 OpenAPI as source of truth

`drf-spectacular` generates `/api/v1/schema/`. Frontend uses `openapi-typescript` to compile to `src/shared/api/generated/types.ts`. CI fails if schema drifts between BE and FE.

### 11.2 Error format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable summary",
    "fields": { "operation": ["Must be one of ADD, SUB, MUL, DIV."] },
    "trace_id": "01HXYZ..."
  }
}
```

### 11.3 Core endpoints (v1)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/auth/register` | Guardian-only signup |
| `POST` | `/api/v1/auth/register-student` | Guardian creates child sub-account |
| `POST` | `/api/v1/auth/login` | Returns access + sets refresh cookie |
| `POST` | `/api/v1/auth/refresh` | New access + rotated refresh |
| `POST` | `/api/v1/auth/logout` | Refresh-token denylist |
| `GET` | `/api/v1/auth/me` | Current user + profile + HUD stats |
| `GET` | `/api/v1/levels/` | All levels with per-user lock state |
| `GET` | `/api/v1/levels/{id}/` | One level + lessons + completion |
| `POST` | `/api/v1/sessions/classwork/` | Create Classwork session |
| `POST` | `/api/v1/sessions/practice/` | Create Practice session |
| `GET` | `/api/v1/sessions/{id}/` | Session metadata + next question index |
| `POST` | `/api/v1/sessions/{id}/attempts/` | Submit one answer |
| `POST` | `/api/v1/sessions/{id}/submit/` | Finalize, return report |
| `POST` | `/api/v1/sessions/{id}/abandon/` | Explicit abandonment |
| `GET` | `/api/v1/progress/me/` | Aggregate stats for HUD |
| `GET` | `/api/v1/health/` | Service health (db + redis) |

---

<a name="12-testing-strategy"></a>
## 12. Testing Strategy

Test harness ships with scaffold; tests are added per feature.

### 12.1 Backend

| Layer | Tool | Target |
|---|---|---|
| Unit (services, generators, XP rules) | pytest | 90% |
| Integration (DRF views, permissions) | pytest + DRF `APIClient` | 80% |
| Migrations | `django-test-migrations` | 100% (no missing) |

### 12.2 Frontend

| Layer | Tool | Target |
|---|---|---|
| Unit (utilities, hooks) | Vitest | 80% |
| Component | Vitest + @testing-library/react | 70% |
| E2E (critical flows) | Playwright | 5 happy paths minimum |
| Accessibility | @axe-core/playwright | 0 WCAG 2.1 AA violations |

### 12.3 Critical E2E flows (must pass to merge)

1. Guardian signs up → creates child → child logs in → lands on hub
2. Child completes a Classwork session → sees Mission Report
3. Child completes a Practice session → sees Victory screen
4. Child abandons mid-session → session is marked abandoned
5. Locked level cannot be entered via direct URL

---

<a name="13-performance-budget"></a>
## 13. Performance Budget

| Metric | Budget | Tool |
|---|---|---|
| Initial JS (gzip, route `/hub`) | ≤ 200 KB | Vite bundle analyzer + Lighthouse CI |
| LCP (4G throttled) | ≤ 2.5s | Lighthouse CI |
| TTI (4G throttled) | ≤ 3.0s | Lighthouse CI |
| Per-route lazy chunk | ≤ 80 KB gzip | Vite bundle analyzer |
| API p95 latency (auth, levels, session create) | ≤ 200ms | DRF middleware → Sentry |
| API p95 latency (attempt submission) | ≤ 100ms | DRF middleware → Sentry |
| Animation frame rate | ≥ 60 fps | Chrome DevTools |

CI fails if Lighthouse scores drop below thresholds.

---

<a name="14-accessibility"></a>
## 14. Accessibility Plan

PRD §9.2 requires WCAG 2.1 AA.

### 14.1 Color contrast (verified)

- `#F2C94C` on `#1A1A1A` — **11.7:1** — passes AA for all text sizes
- `#9CA3AF` on `#1A1A1A` — **7.4:1** — passes AA
- `<Button variant="primary">` text must be `#1A1A1A` on `#F2C94C` background

### 14.2 Tooling

- `eslint-plugin-jsx-a11y` — fails build on common a11y mistakes
- `@axe-core/playwright` — every E2E test asserts zero violations
- Manual screen-reader pass (NVDA + VoiceOver) per feature

### 14.3 Specific requirements

- Math problems are text `<span>` not images
- Locked levels use icon + dimmed state, not color alone
- Timer HUD uses `aria-live="polite"`
- Keyboard navigation: hub cards reachable by Tab, activate by Enter/Space

---

<a name="15-i18n"></a>
## 15. Internationalization

### 15.1 Approach

- Frontend: `react-i18next`, namespace-per-feature (`common`, `hub`, `learn`, `practice`)
- Backend: Django `gettext` for validation errors + emails
- v1 launch: English (`en`) only
- Designed-for v1.x: Hindi, Telugu, Tamil, Kannada

All UI strings in `public/locales/en/*.json` from day 1. Translation pipeline added when language #2 is requested.

### 15.2 Caveats

- Bebas Neue doesn't cover Devanagari/Telugu/Tamil — per-script font mapping needed (deferred)
- Math display must use locale-appropriate digit separators

---

<a name="16-devops"></a>
## 16. DevOps & CI/CD

### 16.1 Local development

`docker-compose.yml` brings up: postgres:16, redis:7, backend (Django dev server), frontend (Vite dev).

### 16.2 CI pipeline (GitHub Actions)

1. **Backend**: ruff lint, mypy, pytest with Postgres service, generate OpenAPI schema
2. **Frontend**: eslint, tsc, vitest, vite build, Playwright E2E
3. **Schema diff**: backend-generated vs. checked-in `openapi.yml` — fail on drift
4. **Lighthouse CI**: fail on regression beyond §13 thresholds
5. **Security**: pip-audit + npm audit --audit-level=high

### 16.3 Environments

| Env | Trigger |
|---|---|
| Local | `docker-compose up` |
| Preview | PR open (Vercel FE, Fly.io/Render BE) |
| Staging | Merge to `main` |
| Production | Manual promote from staging |

---

<a name="17-security"></a>
## 17. Security

### 17.1 Rate limiting

| Endpoint | Anon | Authed |
|---|---|---|
| `/api/v1/auth/login` | 5/min/IP | — |
| `/api/v1/auth/register*` | 3/hour/IP | — |
| `/api/v1/sessions/*/attempts` | — | 2/sec/user |
| Everything else | — | 60/min/user |

### 17.2 Password rules

- Guardian/Teacher: 10 chars, mixed case, number or symbol
- Student: 6 chars minimum (age-appropriate), guardian-only reset

### 17.3 JWT refresh denylist

Redis key `jwt:denylist:{jti}` with TTL = remaining lifetime. Middleware checks on every request.

### 17.4 Security headers (prod)

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'; img-src 'self' data: https:; ...
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

### 17.5 Secrets

`.env` gitignored. CI/prod: GitHub Actions secrets injected as env vars. `django-environ` reads from env; nothing hardcoded.

---

<a name="18-build-order"></a>
## 18. Revised Build Order

### Phase 0 — Foundation (Sprint 0)

1. Repo init, docker-compose, .env.example, CI skeleton
2. Backend: settings layering, custom User model, migrations, `/api/v1/health/`
3. Frontend: Vite scaffold, tokens.css, Tailwind config, router with empty pages
4. drf-spectacular wired; OpenAPI schema generated; TS types compiled
5. Vitest + Playwright + axe wired with one passing smoke test

**Exit criteria**: §20 verification checklist passes.

### Phase 1 — Identity (Sprint 1)

6. `User`, `Profile`, `Guardianship`, `ConsentRecord` models + migrations
7. Auth endpoints (register guardian, register student, login, refresh, me)
8. Dev-only `LoginPage.tsx` and `RegisterPage.tsx`
9. Auth store, ProtectedRoute, JWT refresh interceptor
10. Tests: integration tests for permissions; E2E for signup → login

### Phase 2 — Hub (Sprint 1, parallel)

11. `HubPage.tsx` — mostly static, fed by `useMe()` (stubbed HUD counts initially)
12. UI primitives: `<Button>`, `<Card>`, `<PortalCard>`

### Phase 3 — Learn (Sprints 2–3)

13. `Level`, `Lesson`, `Material`, `LevelCompletion` models + admin
14. `LevelSelectionPage`, `PathOfConquestPage`
15. `ExerciseTemplate` + `CuratedGenerator` for Classwork
16. `ArenaSession` + `QuestionAttempt` endpoints
17. `ClassworkPage` + `MissionReportPage`

### Phase 4 — Practice (Sprints 4–5)

18. `TrainingArenaPage`, `ArenaSetupPage`
19. `ProceduralGenerator`
20. `InArenaPage`, `VictoryPage`

### Phase 5 — Polish (Sprint 6+)

21. PDF downloads (signed URLs from S3 in prod)
22. Resume-where-left-off
23. HUD stat icons connected to real XP events (pending product spec)
24. Real login UI when Figma delivers

---

<a name="19-deferred-work"></a>
## 19. Deferred Work (with Triggers)

| Item | Triggered by |
|---|---|
| Abacus widget feature folder | §2 Q2 resolved with "yes, build it" |
| Flash Cards session UI | Figma design lands |
| Zen Mode session UI | Figma design lands |
| Levels 11–12 content | Curriculum team delivers |
| Audio Mode (TTS) | Product confirms TTS engine |
| Mobile portrait responsive | Explicit Figma mobile breakpoints |
| Multi-language translation | First non-English market commitment |
| Indic script display font | Same trigger as multi-language |
| ClickHouse for analytics | XPEvent > 50M rows OR analytics > 2s p95 |
| S3 + CloudFront | First prod deploy |
| Celery workers | First async job |
| WebSocket / real-time | Multi-student classroom features specced |
| Feature flag system | First A/B test |
| XPEvent table partitioning | Approaching 10M rows |
| Full teacher dashboard | Teacher beta cohort |
| Full guardian dashboard | Guardian beta cohort |

---

<a name="20-verification"></a>
## 20. Scaffold Verification Checklist

### Backend
- [ ] `docker-compose up` brings up postgres + redis + backend cleanly
- [ ] `python manage.py migrate` runs cleanly on empty DB
- [ ] `python manage.py check --deploy` reports zero issues
- [ ] `python manage.py spectacular --file openapi.yml` produces valid OpenAPI
- [ ] `pytest` runs with at least one passing smoke test per app
- [ ] `ruff check .` clean
- [ ] `mypy apps/ config/` clean (allow missing imports for now)
- [ ] `/api/v1/health/` returns 200 with `{ "status": "ok", "db": "ok", "redis": "ok" }`
- [ ] `/api/v1/auth/register` accepts a guardian signup and returns a valid JWT pair

### Frontend
- [ ] `npm run dev` starts Vite at `http://localhost:5173`
- [ ] `npm run build` produces dist/ with zero TS errors
- [ ] `npm run lint` clean
- [ ] `npm run test` runs Vitest with at least one passing test
- [ ] `npm run e2e` runs Playwright with smoke test passing
- [ ] All 10 routes render their placeholder pages without crashing
- [ ] `<Button variant="primary">` renders yellow `#F2C94C`
- [ ] Hub text comes from `locales/en/hub.json`
- [ ] OpenAPI types compile and `useMe()` is typed end-to-end

### Cross-cutting
- [ ] CI green on PR: lint, type-check, tests, build, OpenAPI diff, Lighthouse, security scan
- [ ] `docs/ARCHITECTURE.md` checked in and updated when decisions change
- [ ] `.env.example` documents every variable

---

## Appendix A — Figma Frame Reference

| Frame ID | Screen | Implemented in |
|---|---|---|
| `1:2` | Bolt Abacus Hub | `features/hub/HubPage.tsx` |
| `1:58` | Level Selection | `features/learn/LevelSelectionPage.tsx` |
| `1:183` | Training Arena | `features/practice/TrainingArenaPage.tsx` |
| `1:272` | Path of Conquest | `features/learn/PathOfConquestPage.tsx` |
| `1:397` | Arena Setup | `features/practice/ArenaSetupPage.tsx` |
| `1:553` | In the Arena | `features/practice/InArenaPage.tsx` |
| `1:619` | Classwork Practice | `features/learn/ClassworkPage.tsx` |
| `1:678` | Classwork Report | `features/learn/MissionReportPage.tsx` |
| `1:795` | Victory! | `features/practice/VictoryPage.tsx` |
| **(missing)** | Login / Register | `features/auth/*Page.tsx` (dev placeholder) |
| **(missing)** | Flash Cards session | deferred |
| **(missing)** | Zen Mode session | deferred |

---

## Appendix B — Revision History

| Version | Date | Changes |
|---|---|---|
| 1.0 | May 2026 | Initial scaffold plan |
| 1.1 | May 2026 | Added compliance, anti-cheat, question generation, multi-role relations, testing harness, i18n, performance budget, CI/CD, security — see §1.2 |
