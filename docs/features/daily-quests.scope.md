# Daily Quests — Today’s Bolt Mission

Scope version: 1.0. Feature ID: `daily-quests`.
Owner direction: create one short, achievable, level-appropriate student mission
on the Hub, reusing content, session recovery and rewards; preserve earned
progress after missed days. Run prospective Bolt AI-SDLC with distinct PM, CTO and
Head QA approval before runtime implementation. Record UTC step timings in the
mutable handoff/plan, push for human review, and do not merge or deploy.

## Identity and outcome

This is a new feature in the owner’s Cloud dev - Bolt v1 Work Project/account,
so AGENTS and ADR 0005 planning gates apply. A student can press **START MISSION**,
practice five questions without a countdown, see saved progress and complete an
encouraging daily goal without an accuracy gate or losing previous achievements.

Integration branch: `feat/daily-quests`.
Recorded foundation: `c75c1f7b4e67bb71c668c4370a59918aef045ab5` from
`chore/ai-context-system-v2`; includes answer recovery and AI-SDLC policies.
Feature-only comparison: that foundation commit `..feat/daily-quests`.
Full integration comparison: freshly verified `origin/main...feat/daily-quests`.
The existing workflow/context/answer-recovery prerequisites need human integration
first. Teacher dashboard/roster and batch-level-assignment work stays separate;
its unmerged feature behavior is not a mission eligibility dependency.

## Existing behavior and evidence

- CODE: `frontend/src/features/hub/HubPage.tsx` shows stats and Learn/Practice
  portals but no daily mission. `users/stats.py` derives `current_level` from a
  completion count with caching; it is not authoritative mission eligibility.
- CODE: `courses/serializers.py::LevelSerializer` and
  `courses/views.py::LessonListView` use classwork completion and ordered
  predecessors for unlock state. `courses/models.py` defines Level/Lesson.
- CODE: `ExerciseTemplate.config_json`,
  `exercises/generators/curated.py::CuratedGenerator` and
  `generators/procedural.py::ProceduralGenerator` form the implemented
  template-backed question path. `seed_levels.py` supplies existing per-level
  configs. Imported `CuratedQuestion` rows exist but existing starts do not read
  them; this feature does not claim to use imported worksheets or introduce that
  unwired curriculum path. Existing template definitions are reused as-is;
  their pedagogical quality and live content inventory are not independently
  certified by this feature.
- CODE: `ArenaSession` freezes config/questions. `SessionMetaSerializer` exposes
  server state and durable per-question receipts. `attempt_contract.py` provides
  v2 replay-safe identities; `is_test_mode=True` already means one non-skip
  attempt per question and makes an accepted wrong answer terminal.
- CODE: `progress/services.py::finalize_session` owns append-only attempt,
  ProgressRecord and XPEvent writes. Template-free practice earns normal session
  XP and does not create LessonCompletion/LevelCompletion.
- CODE: `InArenaPage.tsx`, `useAnswerRecovery.ts` and `VictoryPage.tsx` implement
  practice/reconciliation/report flow. Same-tab sessionStorage is recoverable;
  browser-held, unacknowledged answers are not cross-device durable.
- CODE: `Profile.timezone` exists with UTC default. Existing streak stats are
  date-based and separate from this daily calendar.
- CODE: `exercises/tasks.py::abandon_stale_sessions` currently closes old
  untimed sessions. Mission-bound sessions require an explicit exclusion from
  both its candidate scan and guarded update to preserve interrupted missions.

## Categorized requirements

| ID | Category | Priority | Observable behavior | Acceptance |
|---|---|---|---|---|
| N-01 | NEED | Must | One stable five-question student mission per pinned local date, drawn from unlocked existing template content | AC-01, AC-02 |
| N-02 | NEED | Must | One tap starts/resumes the same untimed session with visible accepted progress | AC-03, AC-04 |
| N-03 | NEED | Must | Completion requires five durable non-skip tries and acknowledged finalization; incorrect answers still count effort | AC-04, AC-05 |
| N-04 | NEED | Must | Daily boundaries use server time and a pinned IANA timezone; missed days do not delete mission/XP history | AC-02, AC-06 |
| N-05 | NEED | Must | Repeated requests, reconnects and races cannot create a second mission session or duplicate session XP | AC-05, AC-07 |
| N-06 | NEED | Must | Interrupted and previous-day sessions remain resumable; unknown/pending saves remain honest | AC-06, AC-08 |
| N-07 | NEED | Must | An accessible mobile Hub card and truthful celebration provide loading/empty/error/retry states | AC-03, AC-09 |
| N-08 | NEED | Must | Student-only owner-scoped APIs, primary-consistent reads, compatible additive contracts and synthetic verification | AC-07, AC-10 |
| W-01 | WANT | Deferred | Rotating themed mission types, difficulty adaptation and personalised streak nudges | — |
| W-02 | WANT | Deferred | History browser, teacher assignments, parent reports and reminders | — |
| W-03 | WANT | Deferred | Extra badges, bonus XP, coins, chests or collectible rewards | — |
| D-01 | DEFERRED | Excluded | Hero cosmetics/avatar customisation and curriculum changes | — |
| X-01 | NON-GOAL | Excluded | PvP/tournament missions, competition anti-cheat/timing, curriculum progression awards, automatic timezone edits, cross-device pending-answer sync | — |

## Exact product rules

### Eligibility and mission content

Only an authenticated active STUDENT owns missions. Teacher, guardian and admin
accounts do not receive or create missions; normal admin student-area access is
unchanged and the card is hidden for non-students. No new subscription, teacher
enrolment, age or payment gate is introduced.

Read LevelCompletion/LessonCompletion and templates from the primary database,
not cached Hub stats or an optional read replica. A level is unlocked when it is
the first ordered level or its immediately preceding ordered level has a
CLASSWORK LevelCompletion for this student. Choose the highest unlocked level;
this remains the final level when all levels are completed. Within that level,
choose the earliest ordered unlocked lesson with a supported CLASSWORK template.
A lesson is unlocked when it is the first ordered lesson or its immediately
preceding ordered lesson has a CLASSWORK LessonCompletion. Completed unlocked
lessons remain eligible for short revision practice.

Supported template configs use the existing ADD/SUB/MUL/DIV/MIXED operations,
integer digits 1–4 and rows 2–8; optional multiplicand digits 1–4 and multiplier
digits 1–2 obey the existing practice generator’s limits. Required arithmetic
fields must be valid, with no invented arbitrary fallback config. The resulting
questions must be exactly five and use non-negative integer answers supported
by the current Arena input. If the highest unlocked level has no eligible valid
content, return **No mission available yet** and preserve Learn/Practice access.
Do not seed, repair, edit or backfill curriculum as part of this feature.

Create/freeze the effective config and content source identifiers/names at daily
assignment; override only `question_count=5` and `time_limit_sec=0`. A seed and
question set are frozen when its single session is started. Later template edits,
imports or level completion do not change the assigned mission/session.
The mission is practice: `kind=ZEN`, `template=None`, `is_test_mode=True`.
Reuse the flag solely for the bounded one-attempt/no-skip contract; student copy
must not call the mission a test, exam or pass/fail assessment.

### Calendar and missed days

On the first successfully assigned mission, pin the student’s valid
`Profile.timezone` IANA name, falling back to UTC for missing/invalid values.
All subsequent daily mission dates use that persisted first-mission timezone,
regardless of later profile or device timezone changes. This feature provides no
timezone-changing endpoint. Freeze and expose the timezone on each mission.

The daily date is the server instant converted to that zone. Reset occurs at its
next local midnight, calculated with timezone-aware calendar arithmetic so DST
23/25-hour days work. Return `server_now` and `reset_at`; the browser clock cannot
create or select a different day. Refresh the Hub on focus/return and at the
reported boundary while visible. Missed days do not generate retroactive missions,
erase old completed missions or deduct XP. Existing global streak computation is
unchanged and no mission streak/reward multiplier is introduced.

An unfinished earlier mission can still be resumed and finalized after midnight;
its original date/timezone/source remain fixed and the completion belongs to that
assignment date. Today’s mission can coexist with earlier unfinished ones. The
Hub has one primary Today card and a secondary continuation action for the most
recent unfinished earlier started mission; other already-known session URLs
remain owner-accessible. No automatic expiry/abandonment or forced restart occurs
for mission sessions. No new history browser is required.

### Completion, progress and rewards

Goal text: **Practice 5 questions**. One accepted non-skip answer per distinct
question index counts as one completed effort, whether correct or incorrect.
Reuse server one-attempt/no-skip validation in both legacy and v2 paths; hide Skip
in mission UI. A wrong accepted receipt advances the mission question after its
usual feedback, without depending on delayed metadata or requiring another try.
No accuracy/speed gate, retries, penalty or countdown applies to the mission.

Hub/session saved progress is the number of distinct server-accepted non-skip
indexes, 0–5. Locally queued answers may be labelled saving/pending but cannot be
presented as durable completion. `progress/services.py::finalize_session` must
reject a mission-bound session before all five durable question indexes exist,
before any XP/ProgressRecord write, including direct service/legacy calls.
Only a durable ProgressRecord and server mission completion acknowledgment
permit the completion state/celebration. The fifth accepted try alone is not a
completed session while finalization is pending.

The existing session XP formula applies exactly once through `finalize_session`:
XP per correct answer and existing perfect-score bonus, with no mission bonus,
first-level bonus, new economy, mission XP event type or progress unlock.
Wrong-answer effort can complete a mission with zero XP; the score/XP display must
remain truthful. One-to-one mission/session binding and unique student/date
assignment plus serialized creation/finalization prevent duplicate sessions and
rewards. Completed mission Start returns its original submitted session/report,
never a rewarded replay. Suppress mission PLAY AGAIN; ordinary Arena practice
remains accessible separately with its existing XP rules.

### Interrupted sessions and failure honesty

Reuse existing v2 manifest, receipt reconciliation, conflicts and sessionStorage
recovery. Refresh, route return, network failure and response loss resume the
same bound session and its accepted answers. Finalization retry reconciles its
existing ProgressRecord without another reward. Mission session start is
idempotent even when the first response is lost.

If sessionStorage is unavailable/corrupt, retain the existing memory-only warning
and reconstruct acknowledged progress from the server. Do not promise recovery
of unacknowledged answers after tab closure/logout/device switch. Preserve the
existing explicit switch/discard conflict flow before entering another session;
no mission navigation silently discards a pending ordinary or mission answer.

## Contract and implementation boundaries

Add owner-scoped `/api/v1/daily-quests/today/` GET and
`/api/v1/daily-quests/{mission_id}/start/` POST. Today resolves/assigns one stable
mission under serialized per-user creation and returns `server_now`, pinned
`timezone`, `reset_at`, nullable mission and nullable `previous_unfinished`.
Mission fields include ID/date, frozen level/lesson display labels, target=5,
accepted progress, state (`available`, `in_progress`, `completed`), nullable
session ID and nullable earned XP. Unavailable content returns a successful empty
state with a reason. Start returns standard SessionMeta: 201 new, 200 already
started/completed. Start accepts no client date/config/goal/owner overrides.
Authenticated other roles receive 403; another student’s or missing mission
receives 404. Unauthenticated access uses existing auth failure semantics.

SessionMeta adds nullable `daily_quest` association metadata sufficient to show
date/goal/progress/completion and suppress replay. Keep existing session,
attempts, reports and finalize schemas backward compatible; update checked-in
OpenAPI, TypeScript types/hooks and mocks together. Explicit incomplete mission
finalization error is HTTP 409 with stable `mission_incomplete` code; existing
v2 replay/conflict behavior remains unchanged.

Use an additive mission model/migration: unique `(user, mission_date)`, pinned
timezone, frozen source/config, nullable one-to-one ArenaSession association and
nullable completion timestamp. Serialize assignment/start via a primary User row
lock before date lookup/creation and session binding; session finalization retains
its existing row lock. Derive accepted progress from append-only QuestionAttempt;
derive reward from ProgressRecord. Mission completion and existing finalization
must commit atomically. Private mission responses use no-store and are not CDN or
shared-account cached; query keys/cache clearing preserve existing auth isolation.

Permitted source areas are exercises mission model/migration/API/services/tasks,
progress finalization integration, Hub mission UI/hook, Arena/Victory additive
mission handling, shared types/OpenAPI/mocks, focused tests and feature handoff.
Exclusive task ownership and exact files are set by the signed execution plan.
No new package, async scheduler, database service or infrastructure is required.
Local migration rehearsal and backend-first/frontend-compatible rollout notes are
required. Rollback disables the mission UI/API while preserving append-only
records and mission rows; do not delete earned history or run production changes.

## Acceptance and required QA evidence

| ID | Required observable evidence |
|---|---|
| AC-01 | Synthetic students select highest unlocked level and earliest supported unlocked lesson using primary completions; locked content is never assigned; exhausted final level remains eligible; missing/malformed content is unavailable without new curriculum |
| AC-02 | Same pinned-local date returns same mission and frozen config after level/template/profile/device changes; valid/invalid zone fallback, local-midnight rollover and DST 23/25-hour days are covered with server-controlled time |
| AC-03 | Hub shows title, five-question goal, level, saved X/5, reset context and Start/Resume/completed state; loading/error/retry/unavailable states remain usable; one tap creates or resumes its session |
| AC-04 | Five mixed correct/wrong accepted answers advance without retries/skips/countdown; visible saved progress follows accepted receipts; mission context does not affect ordinary Arena behavior |
| AC-05 | Premature finalization at 0/5 and 4/5 fails with no ProgressRecord/XP/completion; fifth accepted try plus acknowledged finalization completes; direct service and legacy/v2 paths cannot bypass; score and existing XP are accurate |
| AC-06 | Missing dates do not erase prior mission/XP; yesterday’s started session resumes after midnight alongside today, keeps its own date and is excluded from both stale scanner and guarded stale update; ordinary stale-session abandonment still works |
| AC-07 | Separate-connection PostgreSQL races for assignment/start/finalization produce one mission, one bound session, one ProgressRecord and one normal XPEvent; start/finalize retry or lost response remains idempotent; cross-owner and non-student APIs are denied |
| AC-08 | Real-API answer/reload/return/offline-response-loss cases preserve accepted progress and pending/reconcile honesty; storage failure warnings and session-switch conflict do not silently discard answers; interrupted completion does not prematurely celebrate |
| AC-09 | At 320 and 390 px viewport widths, mission/Hub content has no horizontal overflow, buttons are at least 44 px touch targets, controls and numeric keyboard are usable with onscreen keyboard, keyboard focus and visible labels work; progress/completion are screen-reader announced; reduced-motion celebration has a static equivalent and no flashing |
| AC-10 | Additive migration rehearses cleanly; existing frontend/backend checks pass; OpenAPI/types/mocks match real API; built-SPA + real local API covers one-tap mission, wrong-answer completion, persisted Hub/report state and mobile recovery; independent exact-commit review and Head QA PASS recorded |

Run focused PostgreSQL/Redis backend tests, relevant existing attempt/finalization/
recovery regressions, Ruff, frontend lint/type-check/Vitest/build and built-SPA
Playwright with a real isolated API. Mock unit tests prove UI logic only. Required
race tests use distinct database connections rather than sequential fake requests.
Use synthetic accounts/content. Live content, production deployment and hosted CI
are UNKNOWN unless actually inspected; do not substitute planning approval for
execution evidence. No fixed performance/retention claim is made without a
measured baseline. UTC start/end/duration for G0–G5 and worker/review/check stages
belong in the mutable tracker/plan, with failures/waits retained honestly.

## Risks, decisions and gates

Conservative approved choices to review: five effort-based questions, bounded
one-attempt practice, no added reward, template-backed existing generator path,
pinned first-assignment timezone, indefinite mission resume and student-only
APIs. No unresolved owner decision is proposed. Content freshness/pedagogical
quality and existing global streak semantics are outside this feature’s claims.

Frozen bytes are hashed by the coordinator after review. The exact SHA-256,
reviewer identities, UTC decisions, findings and APPROVED/BLOCKED votes live in
`daily-quests.md` and `daily-quests.plan.json`, outside these hashed bytes. PM,
CTO, Head QA and risk-routed specialists must approve this same digest before G1
and G2 pass and coding starts. Material behavior/contract/acceptance revisions
require a new version/digest and renewed signoffs. Stop after required checks,
independent review, QA and authorized branch push at READY FOR HUMAN REVIEW.
Human reviewers own prerequisite integration, merge and deployment.
