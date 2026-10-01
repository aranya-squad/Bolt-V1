---
last_updated: 2026-10-01
verified_application_commit: 6d32de6a94c2afb92c5bc7a4c72dffe73737d2b1
evidence: CODE+TEST
operational_canonical: true
---

# Bolt V1 System Map

This is the operational architecture map for current development. It is derived from the code on the answer-recovery implementation lineage, not merely from historical design plans. Use it to find the real ownership/control flow, then inspect the referenced source before editing.

## System overview

```text
Browser SPA (React/Vite)
  ├─ React Router
  ├─ TanStack Query / Axios
  ├─ Zustand auth/session/recovery state
  └─ sessionStorage recovery queue
           │ HTTPS / JSON / JWT access token + HttpOnly refresh cookie
           ▼
Django + DRF /api/v1
  ├─ users
  ├─ classroom
  ├─ courses
  ├─ exercises
  └─ progress write service
           │
     ┌─────┴────────┐
     ▼              ▼
PostgreSQL        Redis
primary source    cache + Celery broker/result
of durable truth
     │
 optional read replica for courses/progress reads
```

Production source configuration also defines Gunicorn, Celery worker/beat and Caddy; see `docs/RUNBOOK.md`. Live deployment topology is UNKNOWN until inspected.

# Frontend

## Runtime

[CODE] `frontend/src/main.tsx` creates a React Query client and mounts the app.

Important caveat: development mode starts MSW from `frontend/src/mocks/browser`. Therefore Vite-dev behavior can be mock-backed. Do not call a frontend test "real API integration" unless it runs against a built/preview SPA with MSW absent and a real local API.

[CODE] `frontend/src/App.tsx` performs auth hydration. If a persisted user exists, it calls `/auth/me/`; the Axios interceptor handles refresh/expiry.

## Routing

[CODE] `frontend/src/router.tsx` defines:

Public:
- `/`
- `/login`
- `/register/student`
- `/register/teacher`

Student/admin:
- `/onboarding`
- `/hub`
- `/learn`
- `/learn/level/:levelId`
- classwork/report routes
- `/practice`
- `/practice/session/:sessionId`
- `/profile`
- `/join-class`

Teacher/admin:
- `/teacher`
- `/teacher/batch/:batchId`
- `/teacher/level/:levelId`

Admin:
- `/admin/import-questions`

Route access is enforced client-side by `ProtectedRoute` and `RoleRoute`; server permissions remain authoritative.

## API client and auth transport

[CODE] `frontend/src/shared/api/client.ts`:

- base URL: `${VITE_API_BASE_URL}/api/v1`, or same-origin when the env var is blank
- attaches in-memory access token as Bearer auth
- sends credentials for refresh cookie
- serializes concurrent 401 refreshes through a singleton refresh request
- refresh timeout is 10 seconds
- auth expiry suspends recovery and clears active identity state via the auth store

[CODE] `frontend/src/shared/store/authStore.ts`:

- access token stays in memory
- user identity is persisted under `bolt-auth`
- recovery state is cleared when user identity changes
- logout warns before discarding unsaved recovery work

## Server-state queries

[CODE] Query hooks live under `frontend/src/shared/api/queries/`, including levels, lessons, practice, classwork, session/report, classroom/roster, teacher dashboards and answer recovery.

## Client state ownership

- `authStore.ts`: authentication identity/access token lifecycle
- `sessionStore.ts`: active gameplay/recovery orchestration, network flushing/finalization, status/conflict state
- `answerRecovery.ts`: pure validation/persistence/reconciliation helpers and sessionStorage format

Do not create another session/recovery store without an explicit architecture decision.

# Backend

## Application composition

[CODE] `backend/config/settings/base.py` installs:

- `apps.users`
- `apps.courses`
- `apps.exercises`
- `apps.progress`
- `apps.classroom`

The API namespace is `/api/v1/` and app URL modules are included from `backend/config/urls.py`.

## App responsibilities

### users

Owns:
- custom user/profile
- roles
- auth/login/refresh/logout
- call-sign student login
- student/teacher registration
- account/profile operations
- immutable legacy ConsentRecord and audit events

Key endpoints:
- `health/`
- `auth/register-student/`
- `auth/register-teacher/`
- `auth/login/`
- `auth/callsign-login/`
- `auth/refresh/`
- `auth/logout/`
- `auth/me/`
- profile/XP/delete-account endpoints

Guardian registration/login is retained in code for compatibility/deprecation behavior; current product flow is teacher/batch-attested enrollment.

### classroom

Owns:
- teacher classes/batches
- join codes
- enrollment
- teacher/school-attested `EnrollmentConsent`
- rosters
- teacher level dashboard data

Key endpoints:
- `classes/`
- `classes/join/`
- `classes/<id>/`
- roster/rotate-code
- teacher level dashboard

Ownership checks are server-side; teacher views query classes owned by the authenticated teacher.

### courses

Owns:
- Level
- Lesson
- instructional ContentBlock
- downloadable Material
- level/lesson read APIs and user-specific completion context

Level context is cached in Redis and invalidated by the progress finalization service.

### exercises

Owns:
- ExerciseTemplate
- CuratedQuestion
- ArenaSession
- question generation/session start
- attempt contract validation
- session metadata
- attempt/bulk attempt APIs
- session submit/finalize API
- reports
- curated XLSX question import
- stale-session Celery task

The full server question set including answers is stored in `ArenaSession.questions_json`; `questions_for_client()` strips answers.

### progress

Owns durable learning history:
- QuestionAttempt
- ProgressRecord
- XPEvent
- LevelCompletion
- LessonCompletion

**Write ownership invariant:** durable progress writes go through `backend/apps/progress/services.py`. Do not directly create/update these records from unrelated views/services.

# Data and persistence

## PostgreSQL

[CODE] PostgreSQL is the durable source of truth.

Important append-only/audit behavior:
- `QuestionAttempt` cannot be updated/deleted
- `ProgressRecord` cannot be updated/deleted
- `XPEvent` cannot be deleted
- consent records are immutable by model contract

`QuestionAttempt` identity is `(session, question_index, attempt_number)`; nullable historical attempt numbers exist, so recovery capability/versioning must preserve safe fallback behavior.

## Primary/replica routing

[CODE] If `REPLICA_DATABASE_URL` is set, `PrimaryReplicaRouter` may route `courses` and `progress` reads to a replica. All writes go to primary.

Authoritative answer/recovery/finalization operations explicitly require primary-consistent reads. Do not introduce a replica read into a lock/replay/finalize path without proving consistency.

## Redis

[CODE] Redis is used for:
- Django cache
- user/level context caches
- Celery broker/result backend
- JWT-related/cache-backed behavior as configured by the application

Do not assume live Redis topology or authentication from source alone.

# API and request boundaries

## Backend API

[CODE] Canonical server routes come from Django URL modules.

[CODE] `frontend/src/api/openapi.yaml` is the checked-in client-facing schema artifact. Backend drf-spectacular is also configured and admin-only schema/docs endpoints exist.

When API behavior changes, review together:
- URL/view
- serializer/contract logic
- OpenAPI
- frontend types/client/hooks
- mocks
- regression tests

Do not accept an API change as complete if only one side was updated.

# Authentication and roles

```text
Login/signup UI
  ↓
Axios API client
  ↓
Django auth endpoint
  ↓
access token in response + refresh token HttpOnly cookie
  ↓
access token held in Zustand memory
  ↓
401 -> serialized refresh -> retry once
```

Roles in the backend model:
- STUDENT
- GUARDIAN
- TEACHER
- ADMIN

Client role gates improve UX but are not security boundaries.

Student auth supports call-sign + PIN. Teacher signup is gated by `TEACHER_SIGNUP_SECRET`; empty means fail-closed.

# Classroom and teacher flow

```text
Teacher signup/login
  ↓
TeacherDashboard
  ↓
GET/POST /classes/
  ↓
Class + join_code
  ↓
Student signup/join with join code
  ↓
Enrollment + EnrollmentConsent
  ↓
Roster / teacher level dashboard
```

The enrollment consent path is teacher/school-attested and append-only. Historical guardian models remain in the schema but are not the current primary flow.

# Learning and practice flow

## Classwork

```text
ClassworkPage
  ↓
start level/lesson classwork API
  ↓
StartClassworkView / StartLessonClassworkView
  ↓
ExerciseTemplate + CuratedGenerator
  ↓
ArenaSession with frozen config/seed/questions
  ↓
Session metadata returned without answers
```

Level/lesson locking is enforced server-side using completion records.

## Practice

```text
TrainingArenaPage
  ↓
practice/start
  ↓
StartPracticeView
  ↓
ProceduralGenerator or mode-specific behavior
  ↓
ArenaSession
  ↓
InArenaPage
```

Current session kinds include CLASSWORK, HOMEWORK, FLASH_CARDS, ZEN, TIME_ATTACK and CUSTOM. This enum does not imply every planned future product mode (PvP/tournaments/audio/dual-track) is fully implemented.

# Answer submission, recovery and finalization

This is a critical path.

```text
InArenaPage / ClassworkPage
  ↓
useAnswerRecovery()
  ↓
sessionStore
  ├─ enqueue PendingAttempt
  ├─ persist recovery state to sessionStorage
  └─ flush / finish
         ↓
useSession submitBulk/finalize
         ↓
POST /sessions/:id/attempts/bulk/
POST /sessions/:id/submit/
         ↓
exercises attempt_contract / views
         ↓
progress.services.record_attempt / finalize_session
         ↓
PostgreSQL append-only attempt + result + XP/completion records
         ↓
accepted receipt/result returned
         ↓
client validates receipt/result before dropping pending state
```

Key rules [CODE+TEST]:

- v2 attempts carry immutable question/attempt identity
- response success alone is not enough; receipt payload is validated
- exact accepted replays are safe
- identity conflicts are explicit
- pending work remains until accepted/handled
- finalization validates the expected accepted-attempt manifest
- final result validation is explicit
- server session state/deadline is authoritative on resume
- recovery storage is bounded and scoped to the same user/session/context
- current browser durability is sessionStorage/same-tab, not cross-device
- newly finalized scoring stores a scoring version marker
- historical finalized results are not rewritten

Canonical detailed handoff: `docs/features/answer-recovery.md`.

# Session finalization and scoring

[CODE] `progress.services.finalize_session`:

- takes a primary DB row lock on the session
- rejects already submitted/abandoned sessions
- derives per-question verdicts from persisted attempts
- uses total session questions as score denominator
- computes active thinking time from persisted attempt elapsed values
- serializes completion/best-record updates with row locks
- creates append-only ProgressRecord and XPEvent
- updates completion records
- invalidates Redis caches after commit
- marks the ArenaSession submitted
- sets `scoring_version: 2` in frozen session config for new finalization

Any change here can alter historical interpretation, concurrency behavior and XP. Treat it as a high-impact change.

# CI/build boundary

See `docs/RUNBOOK.md` for exact commands. Current CI is PR/main based; a feature-branch push alone is not CI evidence.

# Deployment/runtime boundary

Repository code defines a production path using Gunicorn + Compose web/worker/beat + Caddy, with AWS-oriented scripts/settings and Vercel frontend config. The repository contains multiple historical deployment documents/scripts that are not fully consistent with one another. `docs/RUNBOOK.md` records which source is currently more operationally relevant and what remains UNKNOWN live.

# Historical architecture document

`docs/ARCHITECTURE.md` contains useful design intent but includes older assumptions and deferred items. It is not the operational current-state authority.

For implementation:
1. use this SYSTEM_MAP to locate ownership
2. verify the actual code
3. consult ARCHITECTURE for historical rationale only when useful
4. add/update an ADR when intentionally changing an architectural decision
