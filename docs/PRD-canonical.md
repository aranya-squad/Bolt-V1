# Bolt Abacus — Canonical Product Requirements Document

**Version:** 2.0 — Full codebase audit  
**Date:** 2026-06-06  
**Author:** Audit-generated from live codebase  
**Status:** Living document — canonical base for all future work

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [User Roles & Personas](#2-user-roles--personas)
3. [Information Architecture](#3-information-architecture)
4. [Data Model](#4-data-model)
5. [Modules](#5-modules)
   - 5.1 [Learning Core](#51-learning-core)
   - 5.2 [Practice Arena](#52-practice-arena)
   - 5.3 [Gamification & XP](#53-gamification--xp)
   - 5.4 [Progress & Analytics](#54-progress--analytics)
   - 5.5 [Content & Curriculum](#55-content--curriculum)
   - 5.6 [User Management & Access](#56-user-management--access)
   - 5.7 [Auth & Security](#57-auth--security)
   - 5.8 [Settings & Profile](#58-settings--profile)
   - 5.9 [Notifications & Communications](#59-notifications--communications)
   - 5.10 [Billing & Subscriptions](#510-billing--subscriptions)
   - 5.11 [Admin / Operator Console](#511-admin--operator-console)
   - 5.12 [Platform & Infrastructure](#512-platform--infrastructure)
6. [Recent Changes Ledger](#6-recent-changes-ledger)
7. [Module Recommendations](#7-module-recommendations)
8. [Non-Functional Requirements](#8-non-functional-requirements)
9. [Open Questions & Items to Verify](#9-open-questions--items-to-verify)
10. [Coverage Self-Check](#10-coverage-self-check)
11. [Competitive Benchmarking](#11-competitive-benchmarking)
12. [Architecture & Deployment Recommendations](#12-architecture--deployment-recommendations)

---

## Part 1 — PRD

---

## 1. Executive Summary

### Vision

Bolt Abacus is a K-12 gamified mental math and abacus learning platform — "Duolingo for arithmetic." Students progress through a structured 10-level curriculum of mental math skills (from single-digit addition to multi-digit multiplication), reinforced through daily timed drills and a self-paced practice arena. The platform is explicitly designed for the Indian K-12 market, with a secondary focus on the diaspora.

### Current Stage

The codebase is past MVP. Core learning and practice flows are functional end-to-end: a student can register, work through the 10-level curriculum via daily classwork sessions, practice freely in the Training Arena, and see session reports. The data model is production-grade (append-only progress tables, UUID PKs, row-level locking, JWT rotation). The UI is implemented with a full design system, but auth screens are dev placeholders awaiting production design.

### Target Users

| Role | Notes |
|---|---|
| **Student** | Ages 5–14, primary user. Completes classwork and practice sessions. |
| **Guardian (Parent)** | Creates child sub-accounts, consents on behalf of minors. Models and flows exist. No parent dashboard yet. |
| **Teacher** | Creates classes, enrolls students. Models/permissions exist; no active views/UI. |
| **Admin** | Django admin only. No custom operator console. |

### Core Value Proposition

Replace rote workbook drills with an addictive loop: level up → unlock new operations → beat your personal best time → see scores on the mission report. The timed session is the core mechanic. XP and rank names (Initiate → Legend) provide identity and progression.

### Key Product Metrics (designed to move)

- Daily Active Students (primary retention signal)
- Average sessions per student per week
- Level completion rate per cohort
- Session accuracy and time-to-answer trends (learning effectiveness)
- 7-day and 30-day streak counts
- Conversion from free to paid (0% today — billing not yet implemented)

### Constraints

- Bootstrapped; no external funding
- Goal: 1,000 paying students before infrastructure investment
- India-first hosting likely (latency matters for timed sessions)
- Solo/small team maintainer — operability is a first-class concern

---

## 2. User Roles & Personas

### 2.1 Role Definitions

| Role | DB Value | Created By | Primary Purpose |
|---|---|---|---|
| STUDENT | `STUDENT` | Guardian via `/auth/register-student/` | Takes sessions, earns XP |
| GUARDIAN | `GUARDIAN` | Self-registration via `/auth/register/` | Manages child accounts |
| TEACHER | `TEACHER` | Admin (no self-registration) | [VERIFY] — no active register view; admin Django only |
| ADMIN | `ADMIN` | Django admin superuser | Platform management |

### 2.2 Persona: Student (Primary)

**Archetype:** Arjun, age 9, uses a tablet. Attends an after-school abacus class. His teacher assigns Bolt Abacus for daily practice.

**Jobs-to-be-done:**
- Complete today's classwork quickly to unlock the next level
- Beat his personal-best accuracy in the Practice Arena
- Check his XP progress and rank after each session

**Primary screens:** Hub → Level Selection → Path of Conquest → Classwork → Mission Report → Practice Arena → Victory

**Lifecycle:**
1. Guardian creates account with DOB
2. Student logs in with provided credentials
3. Completes Level 1 classwork (30 questions, 10 min)
4. Mission Report shows score, XP earned, accuracy
5. Level 2 unlocks; cycle repeats
6. Visits Practice Arena for free drills between classwork sessions
7. Streak accumulates across daily sessions

**Churn triggers (no current nudge mechanism):** misses a day, gets stuck on a level, no external reminder

### 2.3 Persona: Guardian (Secondary)

**Archetype:** Priya, age 35. Enrolled her son in Bolt Abacus. Pays the subscription. Wants visibility into his progress.

**Jobs-to-be-done:**
- Create a child account (done)
- View child's progress (not yet implemented — no parent dashboard)
- Set session goals or reminders (not yet implemented)
- Manage billing (not yet implemented)

**Primary screens:** Register → [VERIFY: no guardian-specific screens beyond registration]

**Permissions:** Can create student sub-accounts (IsGuardian), read Guardianship/AuditEvent records

### 2.4 Persona: Teacher (Deferred)

**Archetype:** Meena, runs a 15-student abacus center. Wants to assign levels per student and track class-wide progress.

**Current state:** `Class` and `Enrollment` models exist. `IsTeacher` and `IsTeacherOfStudent` permissions are defined but no views are wired. No teacher UI exists.

### 2.5 Permissions Matrix

| Action | Student | Guardian | Teacher | Admin |
|---|---|---|---|---|
| Take classwork session | ✓ | — | — | ✓ |
| Take practice session | ✓ | — | — | ✓ |
| View own progress | ✓ | — | — | ✓ |
| Create student account | — | ✓ | — | ✓ |
| View child progress | — | [VERIFY — no endpoint] | — | ✓ |
| Create class / enroll | — | — | ✓[VERIFY] | ✓ |
| Content management | — | — | — | ✓ |
| View audit events | — | — | — | ✓ |

---

## 3. Information Architecture

### 3.1 Frontend Routes

```
/ → redirect to /hub

Public (redirect to /hub if authenticated):
  /login                                             → LoginPage
  /register                                          → RegisterPage

Protected — Shell group (Sidebar + BottomNav rendered):
  /hub                                               → HubPage
  /learn                                             → LevelSelectionPage
  /learn/level/:levelId                              → PathOfConquestPage
  /learn/level/:levelId/classwork                    → ClassworkPage (legacy level-only, no lesson)
  /learn/level/:levelId/report/:sessionId            → MissionReportPage
  /practice                                          → TrainingArenaPage
  /practice/victory/:sessionId                       → VictoryPage
  /profile                                           → ProfilePage

Protected — Focus group (no nav shell — distraction-free):
  /learn/level/:levelId/lesson/:lessonId/classwork   → ClassworkPage (lesson-scoped)
  /practice/session/:sessionId                       → InArenaPage

Dead routes (redirect):
  /practice/setup/:mode → /practice

404:
  * → NotFoundPage
```

### 3.2 Backend API Routes (all under `/api/v1/`)

| Method | Path | View | Auth |
|---|---|---|---|
| GET | `health/` | HealthView | None |
| POST | `auth/register/` | GuardianRegisterView | None |
| POST | `auth/register-student/` | StudentRegisterView | GUARDIAN |
| POST | `auth/login/` | CookieTokenObtainPairView | None |
| POST | `auth/refresh/` | CookieTokenRefreshView | Cookie |
| POST | `auth/logout/` | LogoutView | JWT |
| GET | `auth/me/` | MeView | JWT |
| GET | `auth/me/xp-progress/` | XpProgressView | JWT |
| PATCH | `auth/me/profile/` | ProfileUpdateView | JWT |
| GET | `auth/avatar-presets/` | AvatarPresetsView | None |
| GET | `levels/` | LevelListView | JWT |
| GET | `levels/<uuid>/` | LevelDetailView | JWT |
| GET | `levels/<uuid>/lessons/` | LessonListView | JWT |
| POST | `levels/<uuid>/classwork/start/` | StartClassworkView | JWT |
| POST | `levels/<uuid>/lessons/<int>/classwork/start/` | StartLessonClassworkView | JWT |
| POST | `practice/start/` | StartPracticeView | JWT |
| GET | `sessions/<uuid>/` | SessionDetailView | JWT |
| POST | `sessions/<uuid>/attempts/` | SubmitAttemptView | JWT |
| POST | `sessions/<uuid>/attempts/bulk/` | BulkSubmitAttemptView | JWT |
| POST | `sessions/<uuid>/submit/` | FinalizeSessionView | JWT |
| GET | `sessions/<uuid>/report/` | SessionReportView | JWT |
| GET | `api/v1/schema/` | SpectacularAPIView | Admin |
| GET | `api/v1/docs/` | SpectacularSwaggerView | Admin |
| — | `admin/` | Django Admin | Admin |

---

## 4. Data Model

### 4.1 Domain: Users

```
users.User
  id              UUIDField (PK)
  email           EmailField (unique)
  role            CharField STUDENT|GUARDIAN|TEACHER|ADMIN
  date_of_birth   DateField (nullable — required for STUDENT, COPPA compliance)
  is_active       BooleanField (default True)
  is_staff        BooleanField (default False)
  created_at      DateTimeField (auto)
  updated_at      DateTimeField (auto)
  Table: users_user

users.Profile
  id              AutoField (PK)
  user            OneToOneField → User (CASCADE) related_name="profile"
  display_name    CharField(64)
  avatar_url      URLField (blank, from PRESET_AVATAR_URLS whitelist)
  locale          CharField(8) default "en"
  timezone        CharField(64) default "UTC"
  Table: users_profile
  Note: created atomically with User on registration

users.ConsentRecord  [IMMUTABLE — .save() and .delete() raise]
  id              UUIDField (PK)
  guardian_email  EmailField
  student_dob     DateField
  consent_given_at DateTimeField
  consent_method  CharField(32) — currently "implicit_form_submission" [TODO — replace with real verification]
  ip_address      GenericIPAddressField
  user_agent      TextField
  jurisdiction    CharField(8) US|EU|IN|OTHER
  Table: users_consent_record
  Lifecycle: created once per Guardianship creation, never mutated or deleted

users.Guardianship
  id              AutoField (PK)
  guardian        ForeignKey → User (CASCADE) related_name="guarded_students"
  student         ForeignKey → User (CASCADE) related_name="guardians"
  relationship    CharField(32) default "parent"
  is_primary      BooleanField (default True)
  consent_record  ForeignKey → ConsentRecord (PROTECT)
  created_at      DateTimeField (auto)
  Table: users_guardianship
  Constraint: unique_together (guardian, student)

users.AuditEvent  [APPEND-ONLY]
  id              AutoField (PK)
  actor           ForeignKey → User (CASCADE) related_name="audit_events_actor"
  subject         ForeignKey → User (CASCADE) related_name="audit_events_subject"
  action          CharField(64) — student_created, password_reset, data_deleted
  metadata        JSONField (default {})
  created_at      DateTimeField (auto)
  Table: users_audit_event
  Index: (subject, -created_at)
```

### 4.2 Domain: Courses (Curriculum)

```
courses.Level
  id              UUIDField (PK)
  order           PositiveSmallIntegerField (unique, 1–10)
  name            CharField(64) — "Foundations", "The Big Friend", etc.
  description     TextField (blank)
  xp_threshold    PositiveIntegerField — [0, 200, 500, 900, 1400, 2000, 2700, 3500, 4400, 5500]
  is_advanced     BooleanField (default False)
  Table: courses_level
  Ordering: by order

courses.Lesson
  id              AutoField (PK)
  level           ForeignKey → Level (CASCADE) related_name="lessons"
  order           PositiveSmallIntegerField
  name            CharField(64)
  description     TextField (blank)
  Table: courses_lesson
  Constraint: unique_together (level, order)
  Note: Currently each level has exactly one Lesson ("Class 1") per seed_levels command

courses.ContentBlock
  id              AutoField (PK)
  lesson          ForeignKey → Lesson (CASCADE) related_name="content_blocks"
  kind            CharField(8) TEXT|VIDEO|IMAGE
  order           PositiveSmallIntegerField
  body            TextField — markdown text, URL for VIDEO/IMAGE
  Table: courses_content_block
  Constraint: unique_together (lesson, order)
  Note: No UI consumes this yet — content is display-deferred [VERIFY]

courses.Material
  id              AutoField (PK)
  level           ForeignKey → Level (CASCADE) related_name="materials"
  kind            CharField(16) CLASSWORK|HOMEWORK
  file            FileField upload_to="materials/%Y/"
  version         PositiveIntegerField (default 1)
  uploaded_at     DateTimeField (auto)
  Table: courses_material
  Constraint: unique_together (level, kind, version)
  Note: Download UI referenced in designs ("Download Materials") but not implemented
```

### 4.3 Domain: Exercises (Sessions)

```
exercises.ExerciseTemplate
  id              AutoField (PK)
  lesson          ForeignKey → Lesson (CASCADE) related_name="templates"
  kind            CharField(16) — CLASSWORK|HOMEWORK only
  question_count  PositiveSmallIntegerField (default 30)
  time_limit_sec  PositiveIntegerField (default 600)
  config_json     JSONField — {operation, digits, rows, question_count}
  Table: exercises_template
  Constraint: unique_together (lesson, kind)

exercises.ArenaSession
  id              UUIDField (PK)
  user            ForeignKey → User (CASCADE) related_name="sessions"
  kind            CharField(16) CLASSWORK|HOMEWORK|FLASH_CARDS|ZEN|TIME_ATTACK|CUSTOM
  template        ForeignKey → ExerciseTemplate (PROTECT, nullable) — null for Practice
  config_json     JSONField — frozen config at session start
  seed            BigIntegerField — deterministic RNG seed; same (seed+config) = same questions
  questions_json  JSONField — full question set WITH answers; NEVER returned to client raw
  started_at      DateTimeField (auto)
  submitted_at    DateTimeField (nullable) — set by finalize_session
  abandoned_at    DateTimeField (nullable) — set by Celery task
  Table: exercises_arena_session
  Index: (user, -started_at)
  Properties: is_complete, is_active
  Anti-cheat: questions_for_client() strips answers before any send
```

### 4.4 Domain: Progress

```
progress.QuestionAttempt  [APPEND-ONLY — .save() and .delete() raise on existing instances]
  id              AutoField (PK)
  session         ForeignKey → ArenaSession (CASCADE) related_name="attempts"
  question_index  PositiveSmallIntegerField
  attempt_number  PositiveSmallIntegerField (nullable)
  question_text   CharField(256)
  expected_answer IntegerField
  submitted_answer IntegerField
  is_correct      BooleanField
  elapsed_ms      PositiveIntegerField
  submitted_at    DateTimeField (auto)
  Table: progress_question_attempt
  Constraint: unique_together (session, question_index, attempt_number)
  Index: (session, question_index)
  Max attempts per question: 3 (MAX_ATTEMPTS_PER_QUESTION constant)

progress.ProgressRecord  [APPEND-ONLY]
  id              UUIDField (PK)
  session         OneToOneField → ArenaSession (CASCADE)
  user            ForeignKey → User (CASCADE) related_name="progress_records"
  score_correct   PositiveIntegerField
  score_total     PositiveIntegerField
  accuracy_pct    DecimalField(5,2)
  time_taken_sec  PositiveIntegerField — sum of elapsed_ms per attempt ÷ 1000 (active time, not wall clock)
  xp_earned       PositiveIntegerField
  created_at      DateTimeField (auto)
  Table: progress_record
  Index: (user, -created_at)

progress.XPEvent  [APPEND-ONLY — .delete() raises]
  id              BigAutoField (PK)
  user            ForeignKey → User (CASCADE) related_name="xp_events"
  event_type      CharField(32) SESSION_COMPLETE|STREAK_BONUS|LEVEL_UP|PERFECT_SCORE|FIRST_ATTEMPT
  delta           IntegerField — positive normally; negative for corrections
  source_session  ForeignKey → ArenaSession (SET_NULL, nullable)
  created_at      DateTimeField (auto)
  Table: progress_xp_event
  Index: (user, -created_at)
  Partitioning: managed command available for 10M+ row migration to monthly partitions

progress.LevelCompletion
  id              AutoField (PK)
  user            ForeignKey → User related_name="level_completions"
  level           ForeignKey → Level related_name="completions"
  kind            CharField(16) CLASSWORK|HOMEWORK
  first_completed_at DateTimeField (auto)
  best_progress_record ForeignKey → ProgressRecord (PROTECT)
  Table: progress_level_completion
  Constraint: unique_together (user, level, kind)
  Note: Guards level unlock; CLASSWORK completion of level N unlocks level N+1

progress.LessonCompletion
  id              AutoField (PK)
  user            ForeignKey → User related_name="lesson_completions"
  lesson          ForeignKey → Lesson related_name="completions"
  kind            CharField(16) CLASSWORK|HOMEWORK
  first_completed_at DateTimeField (auto)
  best_accuracy_pct DecimalField(5,2)
  best_progress_record ForeignKey → ProgressRecord (PROTECT)
  Table: progress_lesson_completion
  Constraint: unique_together (user, lesson, kind)
  Note: Drives PathOfConquest accordion status chips per lesson
```

### 4.5 Domain: Classroom

```
classroom.Class
  id              UUIDField (PK)
  name            CharField(128)
  teacher         ForeignKey → User (CASCADE) related_name="classes_taught"
  assigned_levels ManyToManyField → Level (blank)
  created_at      DateTimeField (auto)
  is_active       BooleanField (default True)
  Table: classroom_class

classroom.Enrollment
  id              AutoField (PK)
  class_room      ForeignKey → Class (CASCADE) related_name="enrollments"
  student         ForeignKey → User (CASCADE) related_name="enrollments"
  enrolled_at     DateTimeField (auto)
  is_active       BooleanField (default True)
  Table: classroom_enrollment
  Constraint: unique_together (class_room, student)
```

### 4.6 Entity Relationship Summary

```
User ──1:1── Profile
User ──1:N── ArenaSession
User ──1:N── ProgressRecord
User ──1:N── XPEvent
User ──1:N── LevelCompletion
User ──1:N── LessonCompletion
User ──1:N── AuditEvent (as actor or subject)

User (guardian) ──M:N── User (student) via Guardianship
Guardianship ──N:1── ConsentRecord

User (teacher) ──1:N── Class
Class ──M:N── User (student) via Enrollment
Class ──M:N── Level

Level ──1:N── Lesson
Level ──1:N── Material
Level ──1:N── LevelCompletion

Lesson ──1:N── ContentBlock
Lesson ──1:N── ExerciseTemplate
Lesson ──1:N── LessonCompletion

ExerciseTemplate ──1:N── ArenaSession
ArenaSession ──1:N── QuestionAttempt
ArenaSession ──1:1── ProgressRecord
ArenaSession ──1:N── XPEvent
```

---

## 5. Modules

### 5.1 Learning Core

#### 5.1.1 Session Lifecycle

**Description:** The server-authoritative loop from session start through answer submission to finalization and report.

**User Story:** As a student, I want to complete a timed classwork session so that my answers are graded, my progress is recorded, and I see my score and XP earned.

**Product Reasoning:** Answers are never sent to the client (except for practice modes), so scores cannot be fabricated. The timed session is the core learning mechanic — answering 30 mental-math problems under a clock builds the conditioning abacus learning aims to develop.

**Functional Spec:**

1. **Session Start** (`POST /levels/:id/classwork/start/` or `/levels/:id/lessons/:lid/classwork/start/`)
   - Checks level/lesson unlock state (LevelCompletion chain)
   - Returns existing active session on resume (idempotent)
   - Creates new `ArenaSession` with random `seed`, generates questions, stores with answers server-side
   - Returns `SessionMeta` with questions stripped of answers, plus `time_limit_sec`
   - 403 if level/lesson is locked; 400 if no template exists

2. **Answer Submission** (two modes)
   - **Single:** `POST /sessions/:id/attempts/` — one question at a time. Used historically; now deprecated in practice by bulk.
   - **Bulk:** `POST /sessions/:id/attempts/bulk/` — submit multiple at once. Used by `ClassworkPage` (debounced every 5 answers or 3s) and `InArenaPage` (all at end). Idempotent: if `(session, question_index, attempt_number)` already exists, returns cached verdict.
   - Anti-cheat: MIN_ANSWER_MS=200ms. CLASSWORK and TIME_ATTACK enforce (400 reject). ZEN/FLASH_CARDS/CUSTOM only log (fast answers are legitimate in those modes).
   - MAX_ATTEMPTS_PER_QUESTION=3 — prevents answer enumeration via repeated tries.
   - `select_for_update()` on session serializes concurrent submissions.

3. **Finalization** (`POST /sessions/:id/submit/`)
   - Idempotent: re-POST returns existing ProgressRecord
   - Computes: score_correct, score_total, accuracy_pct, time_taken_sec (sum of elapsed_ms, not wall clock)
   - Awards XP via `compute_session_xp()`: 10 XP/correct + 50 bonus for 100% accuracy + 100 first-completion bonus
   - Writes: ProgressRecord, XPEvent(s), LevelCompletion (or updates best), LessonCompletion (or updates best)
   - Cache invalidation: `user_stats:{user_id}` and `level_context:{user_id}` via `transaction.on_commit`
   - Marks `ArenaSession.submitted_at`

4. **Session Report** (`GET /sessions/:id/report/`)
   - Returns ProgressRecord, all QuestionAttempts, `lesson_id`, and `question_verdicts` dict
   - Verdict classification per question: `correct` (first attempt right), `wrong` (all attempts wrong), `fixed` (first wrong, later correct)

**Technical Implementation:**
- Models: ArenaSession, ExerciseTemplate, QuestionAttempt, ProgressRecord, LevelCompletion, LessonCompletion, XPEvent
- Files: `backend/apps/exercises/views.py`, `backend/apps/progress/services.py`, `backend/apps/progress/xp_rules.py`
- XP constants are stubs in `xp_rules.py` — marked `TODO(debt)` for product finalization

**Permissions:** IsAuthenticated (all session endpoints)

**Status:** Stable — recently hardened with concurrency fixes (commit f8cb792, 0180d0b)

**Acceptance Criteria:**
- Starting classwork twice returns same session (resume, not duplicate)
- Finalize twice returns same ProgressRecord (idempotent)
- `questions_json` on ArenaSession never leaks to client via `SessionMetaSerializer`
- XP event and ProgressRecord written in same transaction
- `user_stats` cache key invalidated after commit (not before)

**Known Gaps:**
- `time_taken_sec` measures active answering time, not wall clock. This is intentional but deviates from what most parents/teachers would expect "time taken" to mean — document visibly in the report UI.
- Homework session kind exists in the model but no start/complete flow is wired on either the backend (no Homework start view) or frontend.

---

#### 5.1.2 Classwork Page (Active Session UI)

**Description:** The distraction-free screen where a student answers questions during a timed classwork session.

**User Story:** As a student, I want to see one question at a time, type my answer, and advance quickly so that I can complete my 30-question session before the timer runs out.

**Functional Spec:**
- Route: `/learn/level/:levelId/lesson/:lessonId/classwork` (focus group — no sidebar/nav)
- Legacy: `/learn/level/:levelId/classwork` (same component, no lessonId)
- Session started on mount via `useStartClasswork`
- Timer is a `setTimeout` chain (1-second tick) decrementing from `time_limit_sec`
- Timer expiry automatically triggers finalize
- Answer input: numeric only, `inputMode="numeric"`, Enter to submit
- **Buffered submission:** answers buffer in `bufferRef`; flushed every 5 answers or after 3s debounce via bulk endpoint
- **Final flush:** up to 3 retries with exponential backoff before finalize
- **Test Mode toggle:** chip in header; hides Skip button when enabled (simulates exam conditions)
- **Skip:** submits answer `-999999` (sentinel value for "intentionally skipped") — recorded as wrong
- Progress: "Q {n} / {total}" + countdown timer in seconds
- Timer bar: `ProgressBar` component, turns red at <20% remaining
- `BreadcrumbChip` shows level/classwork context
- On finalize success: invalidates level and me queries, navigates to MissionReportPage

**Technical Implementation:**
- Files: `frontend/src/features/learn/ClassworkPage.tsx`
- Constants: `FLUSH_EVERY_N=5`, `FLUSH_DEBOUNCE_MS=3000`, `FLUSH_RETRIES=3`
- Uses: `useStartClasswork`, `useBulkSubmit`, `useFinalizeSession`

**Edge Cases:**
- Network failure during bulk flush: retained in buffer, retried on next flush or final flush
- Timer expiry during flush: finalizeRef guard prevents double-finalize
- Resume: same session returned from start endpoint; `currentIndex` resets to 0 (lost on reload — intentional for now)
- Empty input: Submit button disabled; Enter key is no-op

**Status:** Stable

**Acceptance Criteria:**
- Answers buffer locally and flush without blocking UI advance
- Timer expiry finalizes the session with remaining buffer flushed
- Test Mode hides Skip button; Skip button submits sentinel value

---

#### 5.1.3 Mission Report (Post-Classwork Results)

**Description:** Full-screen results screen after classwork, showing score, accuracy, XP earned, and per-question verdict table.

**User Story:** As a student, I want to see exactly which questions I got right, wrong, or fixed after a session so that I know where to improve.

**Functional Spec:**
- Route: `/learn/level/:levelId/report/:sessionId`
- Fetches `SessionReport` via `useSessionReport(sessionId)`
- **Stats row:** 4 `StatBentoCard` tiles: Score (n/total), Accuracy (%), XP Earned, Time
- **XP bar:** `XpProgressBar` showing current XP position vs level thresholds
- **Attempts table:** `AttemptsTable` — one row per QuestionAttempt, columns: verdict icon, question text, expected answer, submitted answer, time taken
- Verdict colors: correct=green, wrong=red, fixed=orange (icon: build), skipped=zinc
- **Actions:** RETRY (returns to classwork start) and RETURN TO HUB
- Retry path: lesson-scoped if `lesson_id` present, otherwise legacy level-scoped path
- Error state: RETRY button calls `refetch()`
- Demo controls: skeleton mode hides report content

**Technical Implementation:**
- Files: `frontend/src/features/learn/MissionReportPage.tsx`, `frontend/src/shared/ui/AttemptsTable.tsx`, `frontend/src/features/learn/verdictLogic.ts`
- Backend: `GET /sessions/:id/report/` returns `question_verdicts` as `{[index]: "correct"|"wrong"|"fixed"|"skipped"}`

**Status:** Stable

---

### 5.2 Practice Arena

#### 5.2.1 Training Arena Setup

**Description:** The session configuration screen where students choose operation, mode, and parameters before a practice session.

**User Story:** As a student, I want to configure a custom practice drill (Flash Cards at 2 digits, 20 questions, Time Attack) so that I can target my weak areas.

**Functional Spec:**
- Route: `/practice`
- **Step 01 — Operation:** 3 chips: Add & Subtract (MIXED), Multiplication (MUL), Division (DIV)
- **Step 02 — Combat Style:** 3 mode cards: Flash Cards, No Rush Mastery (ZEN), Time Attack
- **Step 03 — Configuration:**
  - Questions: slider 5–50, step 5
  - Digits: slider 1–4 (hidden in Flash Cards mode)
  - Rows: slider 2–5 (disabled and fixed at 2 for MUL/DIV)
  - Flash Speed: slider 500–5000ms, step 500 (Flash Cards only)
  - Time Limit: slider 1–10 min (Time Attack only)
  - Audio Mode: toggle (Flash Cards only — not functionally implemented [VERIFY])
- **Personal Best stub:** shows hardcoded "87% accuracy" — not connected to real data
- ENTER ARENA → calls `POST /practice/start/`, navigates to InArenaPage

**Technical Implementation:**
- Files: `frontend/src/features/practice/TrainingArenaPage.tsx`, `frontend/src/features/practice/useArenaConfig.ts`
- Backend: `POST /practice/start/` validates mode ∈ {TIME_ATTACK, ZEN, CUSTOM, FLASH_CARDS}, operation ∈ {ADD, SUB, MUL, DIV}, digits 1–4, rows 2–8, question_count 1–100, time_limit_sec 0–3600

**Mismatch — Frontend vs Backend operations:**
- Frontend offers: MIXED, MUL, DIV (3 options)
- Backend validates: ADD, SUB, MUL, DIV (4 options, no MIXED)
- `toPracticePayload()` passes `config.operation` directly; MIXED will fail backend validation [VERIFY — likely passes as string "MIXED" which fails the backend enum check]

**Status:** Stable UI; MIXED operation likely broken end-to-end [VERIFY]

---

#### 5.2.2 In Arena (Active Practice Session)

**Description:** The distraction-free practice session screen. Unlike classwork, answers are included in the client payload for practice modes — client grades instantly, network call is non-blocking.

**User Story:** As a student, I want instant feedback on each practice answer so that the session feels fast and fluent, not network-dependent.

**Functional Spec:**
- Route: `/practice/session/:sessionId` (focus group — no nav)
- Loads session via `useSession(sessionId)` — `staleTime: Infinity` prevents re-fetch during session
- **Client-side grading:** `SessionMetaSerializer` includes `answer` field for practice modes; browser grades `parsed === question.answer`
- **FeedbackToast:** shows correct (green + "+0 XP") or wrong ("RECALCULATE"); dismisses after 600ms and auto-advances
- **Buffer:** all answers buffered in `pendingAttemptsRef`; submitted in one bulk call before finalize
- Timer bar same as ClassworkPage; ZEN mode has no timer
- Input cleared and refocused on each question advance
- Finalize: flushes all buffered attempts, then POSTs to `/submit/`, navigates to VictoryPage

**Technical Implementation:**
- Files: `frontend/src/features/practice/InArenaPage.tsx`
- The `xp_delta` in verdict is always 0 (XP computed server-side at finalize)
- "RECALCULATE" text in FeedbackToast is from the Figma design — implies a re-answer opportunity, but the current implementation advances anyway after 600ms

**Status:** Stable

---

#### 5.2.3 Victory Page (Practice Results)

**Description:** Post-practice results screen, analogous to Mission Report but lighter-weight.

**User Story:** As a student, I want to see my score after a practice session and have a quick path to play again.

**Functional Spec:**
- Route: `/practice/victory/:sessionId`
- Shows 3 `StatBentoCard` tiles: Score, Accuracy, Speed (time)
- XP progress bar
- **PLAY AGAIN** (visible for practice modes: TIME_ATTACK, ZEN, CUSTOM, FLASH_CARDS) — navigates to `/practice/setup/:mode` which redirects to `/practice` (effectively a reset)
- **RETURN TO HUB**
- No per-question table (unlike Mission Report)

**Status:** Stable

---

### 5.3 Gamification & XP

#### 5.3.1 XP System

**Description:** Points earned per session that drive a level progression track and HUD display.

**User Story:** As a student, I want to earn XP for each session so that I can see my rank increase as I improve.

**Product Reasoning:** XP is the social currency of the platform. It needs to be earned fast enough to feel rewarding and slow enough that levels have meaning. Current values are stubs pending product finalization.

**Functional Spec:**
- **Earn:** 10 XP per correct answer + 50 bonus for 100% accuracy + 100 bonus for first-ever completion of (level, kind)
- **No XP on retakes** (XP_ON_RETAKE = 0 — currently dead code; retakes earn XP via normal path) [VERIFY — the current `xp_rules.py` awards XP based on score regardless of is_first; XP_ON_RETAKE constant exists but is not used in `compute_session_xp`]
- **Events:** Each XPEvent is logged individually: SESSION_COMPLETE, STREAK_BONUS (not yet triggered), LEVEL_UP (not yet triggered), PERFECT_SCORE (not yet triggered), FIRST_ATTEMPT (not yet triggered)
- **Total XP:** Sum of all XPEvent deltas per user, cached for 60s
- **Level thresholds:** [0, 200, 500, 900, 1400, 2000, 2700, 3500, 4400, 5500] XP
- **Current level:** `min(levels_completed + 1, 10)` — determined by LevelCompletion count, not XP threshold [VERIFY — level-up is based on completing levels, not accumulating XP; XP thresholds exist in the DB but the `current_level` in `get_user_stats` is derived from `levels_completed`, creating a disconnect]

**XP Bar:** Shown on Hub, MissionReport, VictoryPage, ProfilePage via `XpProgressBar` component. Pulls from `GET /auth/me/xp-progress/`.

**Known Gaps:**
- STREAK_BONUS, LEVEL_UP, PERFECT_SCORE, FIRST_ATTEMPT event types are defined but never emitted
- `XP_ON_RETAKE=0` constant is unused; retakes currently earn XP
- `current_level` from stats is levels-completed-based, not XP-based; xp_threshold values exist but aren't used for unlock logic yet

**Status:** Partially implemented — core SESSION_COMPLETE XP works; bonus event types are stubs

---

#### 5.3.2 Streak System

**Description:** Daily streak counter showing consecutive days of practice.

**Functional Spec:**
- Streak is computed at request time from `ProgressRecord.created_at__date` values
- Algorithm: starts from today or yesterday (whichever has a record), walks back while consecutive dates exist
- Exposed via `GET /auth/me/` in `stats.streak_days` and via `GET /auth/me/xp-progress/`
- Displayed on Hub HUD as "Day Streak" with flame icon

**Known Gaps:**
- No push notifications or email reminders to maintain streak (notifications module deferred)
- No streak-bonus XP awarded (STREAK_BONUS event type defined but never emitted)
- Streak can be maintained by Practice sessions only — classwork not required [VERIFY: any ProgressRecord counts, since streak checks `ProgressRecord.created_at__date` without kind filter]

**Status:** Functional but minimal

---

#### 5.3.3 Rank System (Level Names)

**Description:** Each of the 10 levels has a rank name shown on the Level Selection grid and Path of Conquest header.

**Rank Names:**

| Level | Rank |
|---|---|
| 1 | INITIATE |
| 2 | APPRENTICE |
| 3 | STRIKER |
| 4 | CHALLENGER |
| 5 | WARRIOR |
| 6 | ELITE |
| 7 | CHAMPION |
| 8 | MASTER |
| 9 | GRANDMASTER |
| 10 | LEGEND |

**Technical Implementation:** `frontend/src/shared/lib/rankNames.ts`

**Status:** Stable

---

### 5.4 Progress & Analytics

#### 5.4.1 HUD Stats (Home Dashboard)

**Description:** The 4-tile stats strip on the Hub page showing total XP, streak, levels completed, and current level.

**Functional Spec:**
- Tiles: Total XP (zap icon, yellow), Day Streak (flame icon, orange), Levels Done (trophy icon, blue), Current Level (target icon, purple)
- Data from: `GET /auth/me/` which includes `stats` via `get_user_stats(user)` (cached 60s)
- `XpProgressBar` shows current XP position between current_level_threshold and next_level_threshold

**Status:** Stable

---

#### 5.4.2 Session History

**Known Gap:** There is no "session history" or "progress over time" screen. The Mission Report covers a single session. No endpoint lists a user's past sessions. Students cannot browse their history.

**Status:** Not implemented. Required for parent-facing progress view and teacher reporting.

---

### 5.5 Content & Curriculum

#### 5.5.1 10-Level Curriculum Structure

**Description:** 10 canonically ordered levels, each with one or more lessons, each lesson with a classwork (and optionally homework) template.

**Current State (from seed_levels command):**
- 10 levels exist with fixed names and XP thresholds
- Each level has exactly one Lesson ("Class 1")
- Each Lesson has one ExerciseTemplate of kind CLASSWORK
- No HOMEWORK templates exist yet
- No ContentBlock records exist for any lesson (instructional content deferred)

**Level Configuration:**

| Order | Level Name | Operation | Digits | Rows |
|---|---|---|---|---|
| 1 | Foundations | ADD | 1 | 2 |
| 2 | The Big Friend | ADD | 2 | 2 |
| 3 | Speed Striker | ADD | 2 | 3 |
| 4 | The Little Friend | SUB | 2 | 2 |
| 5 | Combo Strike | ADD | 3 | 2 |
| 6 | Double Digits | ADD | 3 | 3 |
| 7 | Mind Meld | MUL | 2 | 2 |
| 8 | Mental Matrix | MUL | 2 | 2 |
| 9 | Zenith Trial | DIV | 2 | 2 |
| 10 | Grandmaster | MUL | 3 | 2 |

**Notes:**
- Levels 7 and 8 have identical config (MUL, 2 digits, 2 rows) — [VERIFY: intentional or oversight?]
- The design shows "Class 1, Class 2, ..." suggesting multiple lessons per level; only one lesson is seeded per level currently
- `ContentBlock` model supports rich instructional content but no content is seeded and no UI renders it

**Unlock Logic:**
- Level 1 is always unlocked
- Level N unlocks when the user has a LevelCompletion(level=N-1, kind=CLASSWORK)
- Lesson-level: Lesson N within a level unlocks when Lesson N-1 is completed (CLASSWORK)
- All enforced server-side; client reflects the `is_locked` flag from the API

**Management Commands:**
- `seed_levels` — idempotent; creates levels/lessons/templates if missing

**Status:** Functional for single-lesson-per-level structure. Multi-lesson-per-level is model-ready but not seeded.

---

#### 5.5.2 Question Generation

**Description:** Arithmetic questions generated server-side from a seed + config. Questions are never re-fetched; the full set is generated once per session.

**Generators:**
1. **ProceduralGenerator** — used for Practice sessions. Generates N questions from `{operation, digits, rows, question_count}`. Seeded with `random.Random(seed)` for determinism.
2. **CuratedGenerator** — used for Classwork. Delegates to ProceduralGenerator with the lesson template's `config_json`. Stub comment notes future curriculum_rules additions (e.g., Big Friend addition invariants).

**Operations and rendering:**
- ADD: `a + b + c = ?` (2–8 operands)
- SUB: `a - b - c = ?` (2–8 operands, no negatives; degrades to 2-operand if constraint infeasible)
- MUL: `a × b = ?` (fixed 2 operands)
- DIV: `dividend ÷ divisor = ?` (always clean division, no remainders)

**Rendered via `ProblemCanvas`:** Large monospace font (56px), glassmorphic card, verdict border glow on answer.

**Anti-cheat:**
- Questions generated server-side; answers stored in `questions_json` (DB), never sent to browser for Classwork
- `questions_for_client()` strips `answer` key before serialization
- Practice modes receive answers in the client payload (client-side grading is intentional for latency)
- `seed` is deterministic — the same `(seed, config)` always produces the same questions, enabling audit replay

**Known Gap:** "Mixed" (ADD+SUB combined) operation is a Frontend concept (MIXED value) but not supported by the backend generator which expects ADD|SUB|MUL|DIV. [VERIFY and fix]

**Status:** Stable for ADD/SUB/MUL/DIV; MIXED is broken

---

### 5.6 User Management & Access

#### 5.6.1 Guardian Registration

**Description:** Self-service guardian account creation.

**Functional Spec:**
- `POST /auth/register/` — email + password (min 10 chars) + display_name
- Creates User(role=GUARDIAN) + Profile atomically
- Returns access token in body, refresh token in HttpOnly cookie
- Throttled: 3/hour
- No email verification currently [TODO — needed before US/EU launch]

**Status:** Stable. Dev placeholder UI — no production-design login/register screens.

---

#### 5.6.2 Student Sub-Account Creation

**Description:** Guardian creates a child account and consent is recorded.

**Functional Spec:**
- `POST /auth/register-student/` — requires IsGuardian
- Creates User(role=STUDENT), Profile, ConsentRecord, Guardianship, AuditEvent atomically
- ConsentRecord records: guardian email, student DOB, timestamp, IP, user agent, jurisdiction
- `consent_method="implicit_form_submission"` is a placeholder — TODO before US/EU launch
- DOB validation: cannot be future, must be ≤18 years old
- No UI in the frontend for creating a student account (guardian flow not yet built in frontend)

**Status:** Backend complete. Frontend: no guardian-facing UI to create student accounts.

---

#### 5.6.3 Account Login

**Description:** Email/password login for all roles.

**Functional Spec:**
- `POST /auth/login/` — email + password
- Returns access token (15min) in body, refresh token (7 days) in HttpOnly cookie
- Throttled: 5/min
- `ROTATE_REFRESH_TOKENS=True`, `BLACKLIST_AFTER_ROTATION=True` — each refresh rotates the token and blacklists the old one

**Status:** Backend complete. Frontend: functional dev placeholder (no production design).

---

#### 5.6.4 JWT Lifecycle & Token Refresh

**Description:** Transparent access token refresh using the HttpOnly refresh cookie.

**Functional Spec:**
- Access token: 15 min, in memory only (never persisted to localStorage)
- Refresh token: 7 days, HttpOnly Lax cookie, path restricted to `/api/v1/auth/`
- Refresh: `POST /auth/refresh/` reads cookie, validates, returns new access token, rotates refresh token
- Client interceptor: on 401, calls refresh once, retries original request; on refresh failure, logs out and redirects to `/login`
- Singleton refresh: `refreshInFlight` promise prevents concurrent 401s from triggering multiple refresh calls
- Logout: blacklists refresh token, clears cookie

**Technical Implementation:** `frontend/src/shared/api/client.ts`, `backend/apps/users/views.py`

**Status:** Stable

---

### 5.7 Auth & Security

#### 5.7.1 Security Posture

**Rate Limiting (DRF throttling):**
- Anonymous: 60/min
- User: 60/min
- Login: 5/min
- Register: 3/hour
- Attempt submission: 120/min
- Profile updates: 30/min

**JWT Security:**
- 15-min access tokens (short window for token theft)
- 7-day refresh with rotation + blacklist (Redis-backed via `token_blacklist` app)
- HttpOnly Lax cookie for refresh — XSS cannot read it; CSRF mitigated by SameSite=Lax

**Production HTTPS hardening:**
- `SECURE_HSTS_SECONDS=31536000` + subdomains
- `SECURE_SSL_REDIRECT=True`
- `SESSION_COOKIE_SECURE=True`, `CSRF_COOKIE_SECURE=True`
- `SECURE_BROWSER_XSS_FILTER=True`, `SECURE_CONTENT_TYPE_NOSNIFF=True`
- `X_FRAME_OPTIONS=DENY`

**Anti-cheat:**
- Answers never sent to client for CLASSWORK/HOMEWORK
- MIN_ANSWER_MS=200ms: CLASSWORK/TIME_ATTACK reject too-fast submissions
- MAX_ATTEMPTS_PER_QUESTION=3: prevents answer enumeration
- XP computed server-side only
- `select_for_update()` on session prevents race conditions in finalize
- Unique constraint on (session, question_index, attempt_number) prevents double-submission

**Input Validation:**
- All numeric practice params validated server-side (mode, operation, digits, rows, question_count, time_limit_sec)
- `avatar_url` validated against PRESET_AVATAR_URLS whitelist (prevents arbitrary URL injection)
- Student DOB validated (not future, ≤18 years)
- Password min 10 chars for guardians, 6 chars for students

**CORS:**
- `CORS_ALLOWED_ORIGINS` env-driven
- `CORS_ALLOW_CREDENTIALS=True` (required for cookie flow)

**OpenAPI Schema:** Admin-only access (`IsAdminUser` on schema endpoints)

**Logging:** Structured JSON via `python-json-logger`. Anti-cheat violations logged to `apps.exercises.anticheat` logger.

**Health Check:** `GET /health/` checks DB connection + Redis ping, returns `db: ok|error, redis: ok|error`, 200/503.

**Known Gaps:**
- No email verification on registration
- Parental consent flow is "implicit" — not suitable for COPPA/GDPR-K US/EU launch
- No password reset flow
- No social login
- S3 media storage commented out (avatars served from local volume in dev)

**Status:** Production-grade for core concerns. Email verification and consent flow are explicit pre-launch TODOs.

---

### 5.8 Settings & Profile

#### 5.8.1 Profile Page

**Description:** Student self-service profile management — display name and avatar selection.

**User Story:** As a student, I want to set my display name and choose an avatar so that I have an identity on the platform.

**Functional Spec:**
- Route: `/profile` (shell group — has nav)
- **Display Name:** text input (max 64 chars), SAVE button (enabled only when changed and non-empty)
- **Avatar Grid:** 6 preset SVG options (`/avatars/preset-1.svg` through `preset-6.svg`). Selected avatar highlighted with yellow border + glow. Clicking any avatar saves immediately (no confirm step).
- **XP Bar:** same bar as Hub, Profile gives a second entry point
- **Log Out** button — clears authStore, navigates to `/login`
- Loading state: Skeleton components while `useMe` is pending
- Saves via `PATCH /auth/me/profile/` — throttled 30/min

**Technical Implementation:**
- Files: `frontend/src/features/profile/ProfilePage.tsx`
- Backend: `backend/apps/users/views.py:ProfileUpdateView`
- Cache: `user_stats:{user.pk}` invalidated on profile update (name/avatar change doesn't affect stats but cache is flushed for consistency)

**Known Gaps:**
- Locale and timezone fields exist in Profile model but no UI to change them
- No notification preferences
- Avatar assets (`/avatars/preset-*.svg`) must be present in the static/public folder — not confirmed to be in the repo [VERIFY]
- No avatar upload (custom images) — only presets

**Status:** Stable

---

### 5.9 Notifications & Communications

**Current State:** Entirely deferred.

The `EMAIL_BACKEND`, `EMAIL_HOST`, and SMTP settings are defined in `.env.example` and `production.py`. The email infrastructure is wired but no emails are sent anywhere in the current codebase.

**Missing:**
- Streak reminder emails ("You're on a 7-day streak — don't break it!")
- Session completion confirmation emails
- Parent progress digest emails
- In-app notification system
- Push notifications (would require service worker)

**Status:** Not implemented. Explicitly deferred per ARCHITECTURE.md §19.

---

### 5.10 Billing & Subscriptions

**Current State:** Not implemented. No billing model, no subscription tiers, no payment integration.

**What exists:** Nothing — no Django app, no model, no Stripe/Razorpay integration, no gating logic.

**What's needed to monetize:** See Section 7 (Module Recommendations).

**Status:** Not implemented. Blocking for the 1,000-paying-student goal.

---

### 5.11 Admin / Operator Console

**Current State:** Django Admin at `/admin/` is the only operator interface.

**What Django Admin provides:**
- User list with role/email/active status
- Profile records
- Level/Lesson/ContentBlock/Material management (CRUD)
- ExerciseTemplate management
- ArenaSession list (read-only useful for debugging)
- ProgressRecord/QuestionAttempt/XPEvent (append-only audit trail)
- ConsentRecord viewing
- Guardianship management

**What's registered in admin:**

From inspecting each `admin.py` file, registration is minimal [VERIFY exact registrations — admin.py files not fully read]. Standard Django admin auto-discovers models.

**Missing for operator use:**
- User search by email with session history
- Bulk content management (upload multiple lessons at once)
- Analytics dashboards (sessions per day, completion rates, retention)
- Student progress lookup (support tool for parent queries)
- Content moderation (not needed currently)

**Status:** Minimal but usable for a solo operator at sub-1,000 students.

---

### 5.12 Platform & Infrastructure

#### 5.12.1 Docker Compose (Development)

Services: postgres:16, redis:7-alpine, backend (Django dev server), frontend (Vite dev server)
- Backend runs `python manage.py runserver 0.0.0.0:8000`
- Frontend runs `npm run dev -- --host 0.0.0.0`
- Both mount source directories for live reload
- `ATOMIC_REQUESTS=True` — every HTTP request wrapped in a DB transaction

#### 5.12.2 Production Configuration

- **Gunicorn:** `2×vCPU+1` workers, `gthread` worker class, 2 threads, `preload_app=True`
- **`post_fork` hook:** closes inherited DB and cache connections after fork to avoid connection leaks
- **Settings:** HSTS, SSL redirect, secure cookies, Sentry, SMTP email
- **Logging:** JSON structured to stdout (works with any log aggregator)

#### 5.12.3 CI/CD (GitHub Actions)

File: `.github/workflows/ci.yml`

Jobs:
1. **backend** — pytest with real Postgres + Redis services; ruff lint
2. **frontend** — npm lint + type-check + vitest
3. **build** — `npm run build` on main branch only (post-merge gate)

108 backend tests, 21 frontend tests (as of commit 0180d0b).

#### 5.12.4 Celery

- **Configuration:** wired in `base.py` and `config/celery.py`; uses Redis as broker and result backend
- **Registered tasks:** `abandon_stale_sessions` (every 5 min via Celery Beat)
- **Worker status:** configured but not started in dev Docker Compose [VERIFY — no `celery` service in docker-compose.yml]
- **Abandon task:** marks sessions `abandoned_at` when inactive > 2× `time_limit_sec`; uses `.iterator(chunk_size=500)` for memory-efficient streaming

#### 5.12.5 Caching (Redis)

| Cache key | TTL | Invalidated when |
|---|---|---|
| `user_stats:{user_id}` | 60s | finalize_session (on_commit), profile update |
| `level_context:{user_id}` | 60s | finalize_session (on_commit) |
| `avatar-presets` | 300s (FE) | Never (static list) |

#### 5.12.6 Read Replica

- **Router:** `PrimaryReplicaRouter` in `config/dbrouter.py`
- **Read apps:** `courses`, `progress` → replica; `exercises`, `users`, `classroom` → primary
- **Activation:** set `REPLICA_DATABASE_URL` env var; ignored if not set
- **Caveat:** post-write reads (e.g., ProgressRecord returned by finalize) use `hints={"primary": True}` [VERIFY — not all callers set this hint; finalize_session returns the record from the same transaction, pre-commit, so this may be fine]

#### 5.12.7 Deployment Tooling

- `backend/deploy.sh`: Docker build + tag + push + SSH deploy script
- `docs/deploy-infra.md`: Managed Postgres + Redis setup guide (Fly.io / AWS RDS)
- `docs/cdn-deploy.md`: SPA CDN deployment + cross-origin cookie configuration

---

## 6. Recent Changes Ledger

### 6.1 Feature Wave Additions

These were implemented across the recent commit wave (commits 04f4994 through 0180d0b):

| Feature | Details | Commit |
|---|---|---|
| **Profile feature** | ProfilePage, ProfileUpdateView, AvatarPresetsView, ProfileSerializer, `PATCH /auth/me/profile/`, avatar whitelist validation | 04f4994 |
| **Shell layout** | ShellLayout (Sidebar + BottomNav), 2-group router split (shell vs focus), PageSkeleton | 04f4994 |
| **HUD components** | HudStatTile, HudStats, XpProgressBar, StatBentoCard, BentoModeCard, ClassAccordion, TopicRow, PathNode, PathClassDivider | 04f4994 |
| **PathOfConquestPage** | Lesson list with accordion and snaking-path view modes, LessonCompletion-based status chips | 04f4994 |
| **XP progress endpoint** | `GET /auth/me/xp-progress/` — XP bar data with level thresholds | 04f4994 |
| **BulkSubmitAttemptView** | `POST /sessions/:id/attempts/bulk/` — multi-answer submission, idempotent, per-item anti-cheat enforcement | 0180d0b |
| **ClassworkPage rewrite** | Buffered submission (FLUSH_EVERY_N=5, FLUSH_DEBOUNCE_MS=3000), retry logic, Test Mode toggle | 0180d0b |
| **TrainingArenaPage rebuild** | 3-step config UI (operation chips → mode cards → sliders), useArenaConfig hook | 0180d0b |
| **InArenaPage rewrite** | Client-side grading for practice, buffer-then-bulk approach | 0180d0b |
| **LessonCompletion model** | Lesson-granular completion, drives PathOfConquest accordion | 0180d0b |
| **StartLessonClassworkView** | `POST /levels/:id/lessons/:lid/classwork/start/` — lesson-scoped classwork | 0180d0b |
| **LessonListView** | `GET /levels/:id/lessons/` — per-user completion data, N+1 safe (3 queries), Cache-Control private | 0180d0b |
| **GitHub Actions CI** | Backend (ruff + pytest with Postgres/Redis services) + frontend (lint + type-check + vitest) + build gate | 0180d0b |
| **Gunicorn config** | gthread workers, `preload_app`, `post_fork` connection cleanup | 0180d0b |
| **Celery task** | `abandon_stale_sessions` every 5 min, uses `.iterator(chunk_size=500)` | 0180d0b |
| **PrimaryReplicaRouter** | Read-only apps routed to optional replica; safe fallback to default when no replica configured | 0180d0b |
| **migrate_to_partitioned_tables** | Management command for QA/XP event table partitioning (run when 10M rows) | 0180d0b |
| **Redis level_context cache** | Caches ordered+completed level IDs, invalidated on finalize | 0180d0b |
| **MSW mock service worker** | Dev/test mock handlers for all API endpoints | 0180d0b |
| **OpenAPI spec** | `frontend/src/api/openapi.yaml` generated from drf-spectacular | 0180d0b |
| **Design system** | CSS custom properties (tokens), global styles, all shared UI components | 6a51555 |

### 6.2 Security Review Hardening

| Risk Addressed | Change Made |
|---|---|
| **Token theft via XSS** | Access token stored in memory only (Zustand, not localStorage); refresh in HttpOnly cookie |
| **Concurrent finalize double-XP** | `select_for_update()` on ArenaSession + `LevelCompletion` during finalize; `ATOMIC_REQUESTS=True` |
| **Answer enumeration** | `MAX_ATTEMPTS_PER_QUESTION=3`; bulk endpoint rejects after cap |
| **Bot-speed submissions** | `MIN_ANSWER_MS=200ms`; CLASSWORK/TIME_ATTACK reject; others log |
| **Stale cache on concurrent finalize** | Cache invalidation moved to `transaction.on_commit` (not before commit) |
| **Refresh token reuse** | `ROTATE_REFRESH_TOKENS + BLACKLIST_AFTER_ROTATION` |
| **Thundering herd on 401** | Singleton `refreshInFlight` promise in axios interceptor |
| **Open CORS + credentials** | `CORS_ALLOWED_ORIGINS` env-driven; `CORS_ALLOW_CREDENTIALS=True` requires explicit origin list |
| **CSRF** | `CSRF_COOKIE_HTTPONLY=True`; refresh cookie `SameSite=Lax`; path restricted to `/api/v1/auth/` |
| **Arbitrary avatar URL** | `avatar_url` validated against `PRESET_AVATAR_URLS` whitelist |
| **Production plaintext secrets** | All secrets via `django-environ` from env vars; no hardcoded secrets |
| **DB connections after fork** | `post_fork` hook closes inherited connections before Gunicorn workers start |
| **Stale sessions accumulation** | `abandon_stale_sessions` Celery task marks sessions after 2× timeout |
| **Implicit consent (COPPA stub)** | `consent_method="implicit_form_submission"` marked `TODO(debt)` — not suitable for US/EU |
| **Prod Django debug** | `DEBUG=False` in production settings; `ALLOWED_HOSTS` env-driven |
| **HSTS / XSS / Clickjacking** | Full production security middleware stack confirmed in `production.py` |

---

## 7. Module Recommendations

### Build Now (before 1,000 paying students)

**1. Billing & Subscriptions — BUILD NOW**

This is the single highest-priority gap. No paying students are possible without it. The architecture supports it (Django app + Razorpay/Stripe integration). Minimum scope: subscription plan (monthly/annual), payment page, gating logic on classwork access for unpaid accounts. Razorpay is strongly preferred over Stripe for the India-first market (INR native, UPI support, lower failure rates on domestic cards).

**2. Production Auth UI — BUILD NOW**

Login and register pages are explicitly marked "DEV PLACEHOLDER." These are the first screens every user sees. They need production design and a proper password reveal toggle, loading states, and error messages. Password reset is also required — there is no recovery path if a student forgets their credentials.

**3. Email Verification — BUILD NOW (for non-child accounts)**

Guardian accounts should verify email before accessing the platform. This is also a prerequisite for any future notification email to be deliverable.

**4. Password Reset — BUILD NOW**

No recovery path for forgotten passwords. Basic flow: request reset email → click link → set new password.

**5. Onboarding (first-session) — BUILD NOW**

New guardians landing on `/hub` after registration see an empty XP bar and two unlabeled portal cards. There is no guidance. Minimum: a 3-step onboarding modal or page that explains the product, creates the first student account, and starts Level 1 classwork. This is the biggest conversion risk.

### Build Before 1,000 Students (in priority order)

**6. Parent Dashboard — DEFER SLIGHTLY, then build**

The `Guardianship` model exists and is complete. A parent dashboard is high-value for the India market where parents are the economic decision-makers. Minimum: guardian logs in → sees child's current level, streak, last 5 sessions. Build after billing.

**7. Notifications (streak reminders) — DEFER SLIGHTLY**

Streak notification is a known high-retention mechanic (Duolingo's core loop). WhatsApp notification via Gupshup or similar may outperform email for India. Build after billing and parent dashboard are stable.

**8. Homework Mode — DEFER**

The model exists, the template seeding is stubbed, but there's no start view or frontend flow. Design shows it in the PathOfConquest accordion. Build when classwork engagement metrics show students who want "more" beyond the 30-question classwork session.

**9. Admin Console (minimum viable) — BUILD A THIN LAYER**

For a solo operator, the built-in Django admin is sufficient at <1,000 students. Add one custom admin action: "view user's recent sessions and scores" — this is the most common support query. Defer custom analytics dashboards.

### Already Adequately Covered

- **COPPA-aligned data model** — ConsentRecord, Guardianship, AuditEvent are production-grade
- **JWT security** — rotation, blacklist, HttpOnly cookie, short access token lifetime
- **Session integrity** — server-authoritative answers, select_for_update, MAX_ATTEMPTS, MIN_ANSWER_MS
- **Progress tracking** — append-only records with 3-tier personal-best tiebreaking
- **CI/CD** — GitHub Actions pipeline is real and fast
- **Caching** — user_stats and level_context cached with on_commit invalidation

### Explicitly Defer Until 1,000 Students

- Social login (Google/Apple)
- In-app notification center
- Teacher portal (models ready, UI is months of work)
- Leaderboards (need meaningful user base first)
- Downloadable materials (UI referenced in design; `Material` model exists; low engagement lever)
- Analytics warehouse (ClickHouse/BigQuery — defer until event volume > 5M)
- Live classroom (WebSockets — entirely deferred)
- i18n localization (Hindi/Telugu/Tamil) — structure is wired (react-i18next + Django gettext), translations deferred

---

## 8. Non-Functional Requirements

### Performance

**Timed session latency (P0):**
- Full question set preloaded in a single start call — currently met
- Classwork: answer submission is buffered locally, advanced immediately (no UI blocking on network) — currently met
- Practice: answers graded client-side — currently met
- Session finalize should complete in <500ms p95 on managed Postgres
- `GET /levels/` + `/lessons/` serve from Cache-Control: private, max-age=30 (browser cache layer)
- `user_stats` and `level_context` cached in Redis; cache hit path is ~5ms

**Frontend budget:**
- All routes are lazy-loaded; PageSkeleton shown during chunk load
- Focus mode enabled automatically on: <4 CPUs, <4GB RAM, or 3G connection (disables AmbientScene and reduces CSS animation)
- Demo skeleton mode available in dev

### Mobile Responsiveness

The design system uses CSS custom properties and Tailwind. Sidebar (desktop) and BottomNav (mobile) coexist via CSS `display` rules. Active session screens (Classwork, InArena) are full-screen and focus-group, with no nav to obscure content. Input uses `inputMode="numeric"` for mobile keyboard optimization.

### Accessibility

- `eslint-plugin-jsx-a11y` is wired in the frontend linter
- `@axe-core/playwright` is installed as a devDependency for E2E accessibility testing
- Input fields use proper `type`, `inputMode`, `pattern` attributes
- Avatar images use `alt=""` on decorative elements (`aria-hidden="true"`)
- Color contrast: design tokens use `var(--y-bolt)` (#F2C94C) on dark backgrounds — needs audit against WCAG 2.1 AA

### Browser Support

Target from ARCHITECTURE.md: Chrome 120+, Firefox 120+, Safari 17+. The Vite build targets modern ES modules; no IE11 support.

### Internationalization

react-i18next is wired in `frontend/src/i18n.ts`. Backend has `USE_I18N=True` and `USE_TZ=True`. English-only at launch. Structure ready for Hindi/Telugu/Tamil.

### Data Retention

- `ProgressRecord`, `QuestionAttempt`, `XPEvent`: append-only, no deletion path
- `ArenaSession`: persisted indefinitely; `abandoned_at` marks stale sessions
- `ConsentRecord`: explicitly cannot be deleted (legal compliance)
- `AuditEvent`: append-only, legal requirement
- No data retention policy is implemented (scheduled deletion, anonymization) — required before GDPR/DPDP compliance

### Privacy & COPPA Compliance

- Student `date_of_birth` stored for age verification
- `ConsentRecord` captures guardian email, consent timestamp, method, IP, user agent, jurisdiction
- `Guardianship` links guardian to child with consent record reference
- Current `consent_method="implicit_form_submission"` is a placeholder — NOT suitable for US (COPPA) or EU (GDPR-K) launch
- India DPDP: consent model structure is correct; formal verification needed

### Backup & Recovery

- `deploy-infra.md` specifies 7-day automated snapshots on managed Postgres
- PITR restore procedure documented
- No backup process is currently automated in the Docker Compose dev setup

---

## 9. Open Questions & Items to Verify

Items marked `[VERIFY]` throughout the document, plus architectural open questions:

| # | Question | Location | Impact |
|---|---|---|---|
| 1 | Is the "MIXED" operation in `useArenaConfig` intentionally broken (no backend support for "ADD" mapped to ADD, or does the frontend pass "MIXED" to the backend which rejects it)? | `TrainingArenaPage.tsx:OPERATIONS`, `StartPracticeView.VALID_OPERATIONS` | Practice Arena "Add & Subtract" mode may be completely non-functional |
| 2 | Is Audio Mode in Flash Cards wired to any actual sound playback? The toggle exists but no audio API calls are visible | `TrainingArenaPage.tsx:config.audio` | Feature is dead UI if not wired |
| 3 | "Personal Best: 87% accuracy" on TrainingArena is hardcoded — is this intentional placeholder or forgotten? | `TrainingArenaPage.tsx` | User trust issue if shown to all users |
| 4 | Levels 7 and 8 have identical config (MUL 2×2). Intentional? | `seed_levels.py` | Level 8 may not feel like meaningful progression |
| 5 | ContentBlock model exists but no UI renders content blocks. Is instructional content display deferred or abandoned? | `courses/models.py:ContentBlock` | Affects learning product decisions |
| 6 | `XP_ON_RETAKE=0` constant exists but `compute_session_xp` does not use it — retakes earn full XP. Intentional? | `progress/xp_rules.py` | Potential XP farming via repeated level completion |
| 7 | `current_level` in stats is derived from `LevelCompletion.count()` not from XP thresholds. XP thresholds exist in Level model — is XP-based unlocking ever planned to replace completion-based unlocking? | `users/stats.py:get_user_stats` | Two separate "level" concepts may confuse users |
| 8 | Celery worker is not in `docker-compose.yml`. How is `abandon_stale_sessions` run in development? | `docker-compose.yml` | Sessions never abandoned in dev |
| 9 | Are preset avatar SVG files (`/avatars/preset-1.svg` through `preset-6.svg`) committed to the repo or served from elsewhere? | `users/constants.py:PRESET_AVATAR_URLS` | Profile avatar grid shows broken images if missing |
| 10 | Which models are registered in `admin.py` files? (Not read during audit.) | `*/admin.py` | Affects operator capabilities |
| 11 | `post_fork` DB connection close: does it also close Celery broker connections? | `gunicorn.conf.py` | Potential broker connection leak if Celery worker started via Gunicorn (unlikely but worth verifying) |
| 12 | The `REPLICA_DATABASE_URL` env var: does the replica router's `db_for_read` for `progress` app break the post-finalize read of `ProgressRecord` (which needs primary-consistent data)? | `config/dbrouter.py`, `exercises/views.py:FinalizeSessionView` | Could return stale ProgressRecord from replica after write |
| 13 | Teacher role: is `TEACHER` user creation possible via any endpoint other than Django admin? No `TeacherRegisterView` exists. | `users/views.py` | Teachers cannot self-register |
| 14 | `GuardianRegisterSerializer.password` min_length is 10 chars; `StudentRegisterSerializer` min_length is 6 chars. Is 6 chars sufficient for a child account? | `users/serializers.py` | Security/compliance question |
| 15 | The login page has a visible "DEV LOGIN" warning chip. Is there a feature flag or env var to suppress this in production? | `frontend/src/features/auth/LoginPage.tsx` | Would expose internal development notice to production users |

---

## 10. Coverage Self-Check

### Inventory Items vs PRD Coverage

| Inventory Item | Covered In PRD | Notes |
|---|---|---|
| **Backend Models (all 16)** | Section 4 | 100% |
| **Backend Endpoints (all 21 + admin + schema)** | Section 3.2, Section 5 | 100% |
| **Django Apps (5)** | Sections 5.1–5.12 | classroom app has no active views — noted in §2.4 |
| **Celery task: abandon_stale_sessions** | §5.12.4 | |
| **Management command: seed_levels** | §5.5.1 | |
| **Management command: migrate_to_partitioned_tables** | §5.12.4 | |
| **Generators: ProceduralGenerator, CuratedGenerator** | §5.5.2 | |
| **DB Router: PrimaryReplicaRouter** | §5.12.6 | |
| **Settings: base, dev, prod, test** | §5.7.1, §5.12 | |
| **Gunicorn config + post_fork** | §5.12.2 | |
| **GitHub Actions CI** | §5.12.3 | |
| **Frontend Routes (14)** | Section 3.1 | 100% including redirects and dead routes |
| **Frontend Stores (authStore, sessionStore)** | §5.7.1, §5.1.2 | |
| **Frontend API Queries (10 hooks)** | Section 5 per feature | |
| **Frontend API Client (axios + interceptors)** | §5.7.1 | |
| **Shared UI Components (~50)** | Noted per feature; component list in §3 / §5 | |
| **i18n wiring** | §8 (NFRs) | |
| **MSW mocks** | §6.1 | |
| **OpenAPI spec** | §5.11 | |
| **Demo controls / focus mode** | §5.1.2 implicitly, §8 | |
| **Environment variables (20+)** | Section 3.2, §5.7.1, §5.12 | |
| **Docker Compose** | §5.12.1 | |
| **verdictLogic.ts** | §5.1.2 (implicitly — extracted for unit testing) | |
| **rankNames.ts** | §5.3.3 | |
| **XP rules** | §5.3.1 | |
| **Sentry (configured, not active)** | §5.7.1 | |
| **S3 storage (commented out)** | §5.7.1 | |
| **Email backend (SMTP wired, not used)** | §5.9 | |

**Items explicitly not covered (with reason):**

| Item | Reason for Exclusion |
|---|---|
| `frontend/e2e/` directory (Playwright tests) | Test infrastructure, not product feature |
| `bolt-abacus-design-system/` directory | Design reference material, not code |
| `design_files/` directory | Design reference material, not code |
| `*.md` handoff docs (`bolt-abacus-claude-code-handoff*.md`, implementation plans) | Context docs for development sessions, not product |
| `backend/.venv/`, `frontend/node_modules/` | Build artifacts |
| `frontend/dist/` | Build artifact |

**Coverage verdict: 100% of user-facing functionality, 100% of data models, 100% of authenticated endpoints, 100% of recent changes accounted for.**

---

## Part 2 — Competitive Benchmarking & Architecture Recommendations

---

## 11. Competitive Benchmarking

### Duolingo

**Borrow:**
- **Streak notification urgency** — the "Your streak is at risk" push notification at 9pm local time is the single highest-retention mechanic in consumer ed-tech. Implement with WhatsApp (India) or email as fallback.
- **XP league system** — weekly league with peer comparison (Bronze/Silver/Gold tiers) drives competitive engagement without requiring real-time infrastructure. Deferred but worth noting as a Wave 5+ feature.

**Avoid:**
- **Free-to-play freemium with hearts/lives** — Duolingo's hearts system creates frustration for struggling learners. For an arithmetic platform targeting young students, a punitive lives mechanic would create anxiety around math. Keep sessions forgiving.

### Khan Academy Kids

**Borrow:**
- **Diagnostic/placement flow** — KA Kids surfaces the right starting level based on a short assessment. Bolt's current onboarding sends all users to Level 1 regardless of ability. A 5-question placement quiz at first login would dramatically improve retention among advanced students who'd otherwise churn on easy content.
- **Parent progress reports via email** — weekly digest email to the linked guardian account is low-engineering-effort, high-parent-satisfaction.

**Avoid:**
- **Breadth over depth early** — KA covers too many subjects at too shallow a level for preschool. Bolt's focused 10-level abacus curriculum is the right call for a subscription product.

### Prodigy Math

**Borrow:**
- **Avatar + customization as progression reward** — avatar items unlocked by completing levels/earning XP makes the customization system feel earned, not just aesthetic. The 6 preset avatars are a start; expanding to an unlock system is a strong gamification layer.
- **Parent dashboard with teacher-facing reports** — Prodigy's dual parent + teacher report is why it's in schools. At the 1,000-student milestone, this is what enables Bolt to approach school administrators.

**Avoid:**
- **Pay-to-win dynamics** — Prodigy locks meaningful game features behind premium. For a $X/month subscription, all content should be accessible; gamification should be cosmetic.

### Mathletics / SplashLearn

**Borrow:**
- **Curriculum alignment labeling** — "Class 2 CBSE" or "Grade 3 Common Core" framing in level descriptions dramatically reduces parent friction. The Level model has a `description` field that's currently empty.
- **Teacher-assigned homework with due dates** — the `Class`/`Enrollment` models are exactly right for this. When teacher portal launches, add a `due_date` field to `ExerciseTemplate` or a new `Assignment` model.

**Avoid:**
- **Dense teacher dashboards** — both platforms have teacher UIs that are overwhelming and rarely used. Build the minimal viable teacher view: one screen, current-level progress per student, color coded.

### Dedicated Abacus Apps (Abacus Brain, Master Brain, etc.)

**Borrow:**
- **Physical abacus visualization** — most dedicated abacus apps show a virtual abacus bead column. Bolt currently renders math as text only. The ARCHITECTURE.md flags "Is there an on-screen abacus widget?" as a P0 open question. For students who use a physical abacus, a side-by-side visualization (not input mechanism) could be a meaningful differentiator.
- **Speed drill timing display** — showing per-question time in the report is a strong learning signal for abacus students who are training for sub-second mental calculation.

**Avoid:**
- **Touch-only bead manipulation as input** — this would make the platform desktop-hostile and create significant a11y and anti-cheat complexity. Text-input answer submission is the right call.

---

## 12. Architecture & Deployment Recommendations

### 12.1 Frontend Performance

**Bundle strategy (current):** All pages are lazy-loaded via `lazy()` + `Suspense`. This is correct. The PageSkeleton fallback prevents layout shift. One improvement: explicitly pre-fetch the classwork session on hover of the "Start" button — a 200ms head start on the session start API call noticeably improves perceived latency on the timed entry flow.

**Asset delivery:** The hero character image (`/hero-character.png`) and avatar preset SVGs (`/avatars/preset-*.svg`) should be served from a CDN with long cache TTLs. Static file serving from Django in production is not yet configured for the SPA (CDN deployment is documented in `docs/cdn-deploy.md` but not wired).

**Animation budget:** `AmbientScene` uses CSS-based animated background gradients. Focus mode disables this automatically for low-end devices. No changes needed — the detection heuristic (CPU count, deviceMemory, effectiveType) is appropriate.

**Input latency:** The classwork input is a plain `<input type="text" inputMode="numeric">`. For timed sessions, this is correct — native text input has the lowest latency. Avoid any React-controlled form library here.

**Font loading:** Monospace font used in `ProblemCanvas` (56px) must be preloaded in `<head>` to avoid flash of unstyled question text during a timed session. This is a concrete P1 fix: add `<link rel="preload" as="font" ...>` for the display and mono fonts.

### 12.2 Backend Performance

**Hot path analysis (timed classwork session):**
1. `POST /levels/:id/lessons/:lid/classwork/start/` — 2–3 queries (level, lesson, existing session check, template fetch). Level context served from Redis cache (60s TTL). Fast.
2. `POST /sessions/:id/attempts/bulk/` — `select_for_update` on session + bulk COUNT query for attempt numbers + batch INSERT. With `ATOMIC_REQUESTS=True`, each bulk call is one transaction. At 5 answers per flush: 1 DB round-trip per 5 questions. Acceptable.
3. `POST /sessions/:id/submit/` — lock session, count attempts, write ProgressRecord + XPEvent(s) + LevelCompletion + LessonCompletion, invalidate caches. This is the most write-heavy call. With proper indexing it should complete in <50ms on managed Postgres.

**Where DRF is a bottleneck:** DRF serializers add ~1–3ms per call for simple serialization. At this scale, acceptable. If `GET /levels/` latency becomes a concern (unlikely before 10,000 users), the `LevelListView` + `LevelSerializer` with context injection is the first candidate for a cached flat-list response.

**N+1 watch points:**
- `LessonListView` is explicitly N+1-safe (3 queries total; noted in code comment)
- `LevelListView` uses `_level_context` cache — single query for levels, set lookup for completion
- `SessionReportView` fetches attempts in one query; `question_verdicts` computed in Python

**Missing indexes to add:**
- `LevelCompletion(user, kind)` — used in `finalize_session` and `get_user_stats`; current index only covers `(user, level, kind)` via unique_together
- `ProgressRecord(user, created_at)` — used in streak calculation; current index is `(user, -created_at)` which covers this
- `ArenaSession(user, kind, submitted_at, abandoned_at)` — `StartClassworkView` queries for active sessions by user+kind+submitted_at+abandoned_at; no composite index covers this [VERIFY]

### 12.3 Database

**What to keep in Postgres:**
- All domain tables — transactional consistency and ACID guarantees matter for grade-bearing records
- Keep `XPEvent`, `QuestionAttempt` in Postgres until >10M rows; the `migrate_to_partitioned_tables` command handles the migration when needed

**What to cache in Redis:**
- `user_stats` (already done)
- `level_context` (already done)
- Leaderboard data (when implemented — Redis sorted sets are ideal)
- Session XP totals for live HUD updates (can tolerate 60s stale)

**Read patterns for leaderboards (future):**
- Weekly XP leaders: Redis sorted set keyed by week, incremented on each XPEvent COMMIT
- Level completion leaders: COUNT query on LevelCompletion per teacher's class (natural group by)
- These should not be computed on request; materialize in a Celery task and cache

**Migration discipline:**
- All 5 apps have proper `migrations/` directories
- `unique_together` constraints in migrations match model definitions
- The `migrate_to_partitioned_tables` command handles the XPEvent/QuestionAttempt partitioning migration; it must be run in a maintenance window, not via normal `manage.py migrate`

### 12.4 Deployment Strategy Under Bootstrap Constraints

**Recommendation: Single managed host + CDN from day one.**

**Stage 0 (now → 200 students):**
- Deploy Django backend to **Fly.io** or **Railway** — both offer managed Postgres, Redis, and containerized apps. Fly.io is preferred for India-adjacent latency (Singapore region).
- Frontend SPA: **Cloudflare Pages** (free tier, global CDN, GitHub Actions deploy). Set `VITE_API_BASE_URL` to backend URL. Cross-origin cookie is handled by `REFRESH_COOKIE_DOMAIN` config.
- No load balancer needed. One backend instance (1 vCPU, 512MB) handles ~200 concurrent users comfortably.
- **Monthly cost estimate:** $0 (Cloudflare Pages free) + ~$10–25/mo (Fly.io starter). Under $30/mo.

**Stage 1 (200–2,000 students):**
- Scale backend to 2 instances behind Fly.io anycast LB (rolling deploys, no downtime).
- Move to managed Postgres (Fly.io Postgres dedicated cluster or RDS t4g.small).
- Redis: managed (Fly.io Redis or Upstash).
- Enable `REPLICA_DATABASE_URL` for read replica.
- **Monthly cost estimate:** ~$80–150/mo.

**Stage 2 (2,000–10,000 students):**
- ECS Fargate / Cloud Run for containerized auto-scaling.
- RDS Multi-AZ Postgres.
- Celery workers as separate ECS tasks.
- **Monthly cost estimate:** ~$300–600/mo at 5,000 active students.

**What to deploy today (not yet done):**
1. CDN for the SPA — biggest single latency win, costs nothing
2. `gunicorn.conf.py` is already production-ready — just point Docker at it instead of `runserver`
3. Enable the `backend/deploy.sh` script against a Fly.io or Railway target
4. Set `SENTRY_DSN` — free tier handles 5,000 events/day

### 12.5 Cost Ceiling per Student

At Stage 0 ($30/mo infra), break-even is approximately:
- At ₹499/month/student: need 7 students to cover infra
- At ₹299/month/student: need 11 students

The cost per student is essentially negligible at sub-1,000 scale. The risk is not hosting cost — it's the time cost of a manual incident response. The right investment is operational tooling (Sentry, uptime monitoring) rather than additional compute.

**Target ratio to track:** infra spend / MRR < 5%. At ₹299 × 1,000 students = ₹299,000 MRR (~$3,600), the $150/mo Stage 1 infra is 4.1% — within budget.

### 12.6 Migration Path (After 1,000 Students)

Decisions made today that do NOT need to change:
- Django + DRF (scales to millions of requests with caching)
- Postgres (scales with managed hosting; partitioning is pre-planned)
- JWT + Redis blacklist (stateless, horizontally scalable)
- Append-only progress tables (correct for audit trail, no schema migration needed)
- React SPA on CDN (already stateless)

Decisions that may need revisiting:
- **Celery worker topology:** Currently wired but not deployed. When email and streak reminders ship, add a single Celery worker container. When Celery task volume justifies it (>1M tasks/month), move to dedicated Beat + Worker containers.
- **Database tier:** Move from single Fly.io Postgres to RDS Multi-AZ before 2,000 students.
- **Search:** When admin needs user search by name/email at scale, add a simple Postgres `gin_trgm_ops` index before reaching for Elasticsearch.
- **Real-time features:** If live classroom (multi-student simultaneous session) is added, Django Channels (ASGI) is already wired via `ASGI_APPLICATION`. The Celery broker (Redis) doubles as a channel layer.

### 12.7 Operability for a Solo Maintainer

**Incident Response Checklist (build this runbook):**
1. `GET /api/v1/health/` — liveness check, confirms DB + Redis. If 503: check `docker logs` for the error.
2. Sentry dashboard — all 500s and unhandled exceptions surface here. Set up email alert on spike.
3. Postgres slow query log — enable `log_min_duration_statement=1000` on managed Postgres; any query over 1s in production is a bug.
4. `ArenaSession` leakage — periodically `SELECT COUNT(*) FROM exercises_arena_session WHERE submitted_at IS NULL AND abandoned_at IS NULL AND started_at < now() - interval '2 hours'` — should always be 0 if Celery beat is running.

**Monitoring on free/low tier:**
- **Sentry** (free tier: 5,000 events/day) — errors
- **UptimeRobot** (free tier) — 5-minute pings on `/api/v1/health/`
- **Fly.io metrics** or **Railway metrics** — CPU/memory included

**Automate first:**
1. Database backups (managed Postgres handles this — verify snapshot schedule is enabled)
2. Deploy on push to `main` (GitHub Actions build job exists; add deploy step)
3. Redis flush detection — alert if Redis goes down (token refresh breaks for all active users)

---

## Code Architecture & Structure Review

### Strengths
- Feature-based frontend structure (`features/auth`, `features/hub`, `features/learn`, `features/practice`, `features/profile`)
- Shared UI under `shared/ui/`, shared API queries under `shared/api/queries/`
- Django apps are correctly domain-bounded (users, courses, exercises, progress, classroom)
- `services.py` in progress app keeps write logic out of views — correct separation
- `xp_rules.py` isolates XP constants for easy replacement when product finalizes values

### Improvements to Make

**1. MIXED operation — fix or remove (P0 bug)**
`useArenaConfig` sends `operation: "MIXED"` to the backend, which validates against `{ADD, SUB, MUL, DIV}` and will return 400. Either: map MIXED → [ADD, SUB] server-side, or add "MIXED" to `VALID_OPERATIONS` and handle it in `ProceduralGenerator`.

**2. Type safety on API responses**
`openapi.yaml` exists in the frontend but is not used to generate TypeScript types. The types in `shared/types/index.ts` are hand-maintained and drift. Add `openapi-typescript` to the build pipeline: `npx openapi-typescript src/api/openapi.yaml -o src/api/types.gen.ts`. Run as part of CI.

**3. Error handling consistency**
`LoginPage` and `RegisterPage` catch errors but return generic messages. Add proper mapping of backend error codes to user-facing messages (e.g., 400 with `{email: ["already exists"]}` → "An account with this email already exists.").

**4. Test coverage gaps**
- Backend: `StartLessonClassworkView` has limited test coverage vs `StartClassworkView`; `SessionReportView` has no dedicated tests
- Frontend: `ClassworkPage` has a test file but its coverage of the finalize retry logic is unclear; `ProfilePage` has no tests; `PathOfConquestPage` has no tests
- No E2E tests are currently written in `frontend/e2e/` (directory exists, likely empty [VERIFY])

**5. API contract management**
The drf-spectacular schema is generated correctly and admin-gated. The next step is running `npx openapi-typescript` as part of CI to generate client types and catch backend/frontend contract drift automatically.

**6. `verdictLogic.ts` is unused by ClassworkPage**
`ClassworkPage.tsx` does not import or use `verdictLogic.ts`. The extracted logic (retry/advance/finalize verdict resolution) is for future use or was extracted for unit testing but ClassworkPage uses its own inline flow. [VERIFY — confirm whether ClassworkPage should be using this or if it's dead code]

**7. Folder hygiene**
- `.gitkeep` files in `shared/hooks/`, `shared/lib/`, `shared/ui/` suggest intended-but-empty directories
- `ArenaSetupPage.tsx` was deleted and replaced by `TrainingArenaPage.tsx` (referenced in the commit diff); verify no imports remain pointing to the old path

**8. CI — add deploy step**
The GitHub Actions `build` job runs on push to main but does not deploy. Add a deployment step (Fly.io `fly deploy`, Railway CLI, etc.) to make the pipeline complete.

**9. Dependency hygiene**
Backend: `Pillow==10.4.0` is installed but only used if S3 storage with image processing is enabled. Harmless but unnecessary until media uploads are live. Frontend: no unused packages identified.

**10. `progress` app has no admin registration (likely)**
Without `admin.site.register(QuestionAttempt)`, operators cannot browse question-level data in Django admin. Register at minimum `ProgressRecord` and `XPEvent` as read-only admin views.

---

*End of PRD — Bolt Abacus v2.0 Canonical*

*Last generated: 2026-06-06. Refresh this document after any structural codebase change.*
