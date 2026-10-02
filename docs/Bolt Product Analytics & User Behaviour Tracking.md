# Bolt Product Analytics & User Behaviour Tracking

**Document type:** Product analytics / UX observability strategy  
**Project:** Bolt V1  
**Prepared:** 02 October 2026  
**Status:** Product/engineering recommendation — **not yet an implementation scope approval**  
**Repository reviewed:** `aranya-squad/Bolt-V1`  
**Primary application lineage reviewed:** current `main`, `chore/ai-context-system-v2`, and `feat/daily-quests`

---

## 1. Executive Summary

Bolt is primarily a web application used through laptop and mobile browsers. The product has two materially different user journeys:

1. **Student journey**
   - signup / login
   - onboarding
   - Hub
   - Learn / level / lesson
   - Classwork
   - Practice Arena
   - Daily Quest
   - active solving session
   - result / XP / progress
   - profile / class joining

2. **Teacher journey**
   - signup / login
   - Teacher Dashboard
   - batch creation
   - join-code sharing
   - roster
   - level dashboard
   - live-session link
   - continued teacher return and classroom usage

Bolt should therefore not treat analytics as simple website traffic measurement. The goal is to understand:

- where users go;
- what they try to do;
- where they hesitate or abandon;
- what they successfully complete;
- what causes them to return;
- what differs between mobile and laptop;
- whether a UX issue is actually a reliability or performance issue;
- whether a new feature genuinely improves behaviour.

### Recommended stack

| Need | Recommended tool |
|---|---|
| Product analytics, funnels, paths, retention, feature adoption | **PostHog** |
| Product experiments / feature flags later | **PostHog** |
| UX surveys later | **PostHog** |
| Application errors and performance | **Sentry** |
| Marketing attribution / campaigns | **GA4**, optional |
| Authoritative learning / XP / attempt outcomes | **Bolt PostgreSQL + Django** |
| Microsoft Clarity on the student app | **Do not use** |

The most important design rule is:

> **Frontend analytics measures intent and UX behaviour. Bolt backend data remains authoritative for learning, completion, rewards and durable progress.**

The second major rule is:

> **Do not collect more data than Bolt can clearly use to improve the product.**

Because Bolt serves children, student analytics must be deliberately privacy-minimised. Session replay should be **off by default for student surfaces** until Bolt performs a specific privacy/legal review and defines exactly what can be captured.

---

# 2. Second-Pass Review

A second repo/tooling pass was performed before finalising this document.

## 2.1 Repository findings

The current Bolt frontend is React + TypeScript + Vite with React Router, TanStack Query, Axios and Zustand. The backend is Django/DRF with PostgreSQL and Redis/Celery.

The current route structure includes:

### Public

- `/`
- `/login`
- `/register/student`
- `/register/teacher`

### Student

- `/onboarding`
- `/hub`
- `/learn`
- `/learn/level/:levelId`
- lesson/classwork routes
- mission report routes
- `/practice`
- `/practice/session/:sessionId`
- `/practice/victory/:sessionId`
- `/profile`
- `/join-class`

### Teacher

- `/teacher`
- `/teacher/batch/:batchId`
- `/teacher/level/:levelId`

### Admin

- question import tools

The repo currently has **no PostHog, Sentry, GA4 or equivalent product-analytics integration** and no shared application analytics/event abstraction was found.

This means analytics can be designed cleanly as a new cross-cutting capability rather than migrated from an inconsistent previous system.

## 2.2 Daily Quest status

The `feat/daily-quests` branch currently records Daily Quests as:

**READY FOR HUMAN REVIEW**

The feature adds a daily five-question student mission to the Hub, reuses the existing session/recovery/finalisation system, and exposes meaningful product events such as:

- mission shown;
- mission started;
- mission resumed;
- progress saved;
- mission completed;
- mission unavailable;
- prior mission resumed.

These should be included in the analytics event model from the beginning rather than retrofitted later.

## 2.3 Tooling review

Current official PostHog documentation supports:

- trends;
- funnels;
- retention;
- user paths;
- dashboards;
- session replay;
- feature flags;
- experiments;
- surveys.

PostHog funnels are particularly useful for identifying steps with high friction and measuring time-to-convert. User paths are useful for discovering what users actually do before or after a feature rather than relying only on the intended navigation flow.

PostHog also provides privacy controls for masking replay content, but the product owner remains responsible for deciding what data should be collected.

Microsoft currently states that Clarity **should not be used on websites/apps targeting users under age 18**. Therefore it should not be added to Bolt's student application.

---

# 3. Measurement Philosophy

Bolt should answer four product questions continuously:

## 3.1 Where do users go?

Examples:

- Hub → Learn or Practice?
- Which Arena mode is chosen?
- Which levels are opened?
- Do students discover Daily Quest?
- Which teacher dashboard areas are actually used?

## 3.2 Where do they struggle?

Examples:

- signup validation failures;
- join-code failures;
- long time spent configuring Arena;
- repeated setting changes;
- repeated back navigation;
- failed session starts;
- answer submission failures;
- recovery events;
- mobile-only drop-offs;
- session abandonment.

## 3.3 What do they accomplish?

Examples:

- first completed session;
- lesson completion;
- practice completion;
- Daily Quest completion;
- first batch created;
- first student joined;
- teacher roster usage.

## 3.4 What makes them return?

Examples:

- Daily Quest usage;
- Learn usage;
- Arena mode usage;
- teacher roster checking;
- active-student growth in a teacher's batches;
- repeated practice sessions;
- weekly active learning days.

---

# 4. Core Product Metrics

Bolt should distinguish **traffic**, **activity**, **achievement**, and **retention**.

A login is not equal to learning.

## 4.1 Student metrics

### Primary engagement metrics

- Weekly Active Learners
- Active Learning Days per student per week
- Questions attempted per student per week
- Completed sessions per student per week
- Classwork sessions completed
- Practice sessions completed
- Daily Quests completed
- Median session duration
- Sessions per active student

### Activation metrics

- signup → onboarding completion
- onboarding → Hub
- Hub → first meaningful activity started
- activity start → first activity completed
- time from registration → first completed learning session

### Retention

- D1 learner retention
- D7 learner retention
- D30 learner retention
- weekly returning learners
- repeat learning days per week
- return after first Daily Quest
- return after first Arena completion

**Important:** retention should preferably use a meaningful learning event rather than simply `page_view` or `login`.

For example:

> Student is retained if they return and start or complete a Learn, Practice or Daily Quest activity.

## 4.2 Teacher metrics

### Teacher activation funnel

`Teacher registered → Teacher dashboard → First batch created → Join code shared/copied → First student joined → Roster viewed → Teacher returns`

Key metrics:

- teacher signup completion %
- teacher → first batch %
- median time to first batch
- batch → first student joined %
- median time to first enrolled student
- teachers with at least one active batch
- teacher weekly return %
- active students per active teacher
- teachers viewing student progress
- teachers launching live-session links
- teachers using level dashboards

---

# 5. Bolt's Most Important Funnels

## 5.1 Student activation

```text
Student Signup Started
        ↓
Student Signup Completed
        ↓
Onboarding Completed
        ↓
Hub Viewed
        ↓
First Meaningful Activity Started
        ↓
First Meaningful Activity Completed
```

Break down by:

- mobile / tablet / desktop;
- browser;
- teacher / batch;
- country/region only where appropriate;
- account age;
- current level.

Do not use exact location for normal product analytics.

---

## 5.2 Hub effectiveness

```text
Hub Viewed
   ↓
Learn Selected / Practice Selected / Daily Quest Selected
   ↓
Activity Started
   ↓
Activity Completed
```

This answers whether the Hub helps the student **start learning quickly**.

Primary Hub KPI:

> **Hub → meaningful activity start conversion**

Secondary:

> **Hub → completed activity conversion**

---

## 5.3 Learn funnel

```text
Learn Opened
   ↓
Level Opened
   ↓
Lesson Opened
   ↓
Classwork Started
   ↓
Classwork Completed
   ↓
Mission / Result Viewed
```

Investigate:

- levels opened but no lesson started;
- lessons repeatedly reopened;
- classwork started but not completed;
- mobile vs desktop completion;
- average time from Learn open → classwork start.

---

## 5.4 Practice Arena funnel

Current Arena configuration exposes several decisions:

- operation;
- mode;
- question count;
- digit counts;
- row count;
- time limit;
- flash speed.

That flexibility is useful but also a likely source of friction.

Measure:

```text
Practice Opened
   ↓
Mode Selected
   ↓
Configuration Interacted With
   ↓
Enter Arena Clicked
   ↓
Session Created
   ↓
First Answer Accepted
   ↓
Session Completed
```

Important derived metrics:

- median setup time;
- number of config changes before start;
- % of users who start without changing defaults;
- % who leave Practice without starting;
- % who start but never submit an answer;
- completion by mode;
- completion by configuration complexity.

This data can answer whether Bolt should add a future **Quick Practice** action with sensible defaults and move advanced configuration behind **Customize**.

---

## 5.5 Daily Quest funnel

```text
Daily Quest Card Viewed
        ↓
Mission Started / Resumed
        ↓
1/5 Saved
        ↓
3/5 Saved
        ↓
5/5 Saved
        ↓
Mission Finalised
        ↓
Completion Viewed
        ↓
Returns Next Day
```

Track:

- mission card exposure;
- mission click-through;
- mission start rate;
- mission completion;
- start → completion time;
- interrupted/resumed missions;
- previous-day mission resume;
- next-day return after completion.

Daily Quest should become one of Bolt's cleanest retention experiments.

---

## 5.6 Teacher activation funnel

```text
Teacher Signup
    ↓
Teacher Dashboard
    ↓
Create Batch
    ↓
Copy Join Code
    ↓
Student Joins
    ↓
Roster Viewed
    ↓
Level Dashboard Viewed
    ↓
Teacher Returns
```

This should be treated as a business-critical funnel.

---

# 6. Friction Signals to Track

Clicks alone do not identify bad UX.

Bolt should explicitly monitor friction.

## 6.1 Time-to-action

Examples:

- Hub → Learn start
- Practice page → session start
- signup page → successful account creation
- teacher dashboard → first batch creation

Large times may indicate confusion.

## 6.2 Repeated configuration changes

Example:

Student changes:

- mode 3 times;
- digits 4 times;
- rows twice;
- question count twice;

before starting.

Potential interpretation:

- defaults are unclear;
- student is experimenting;
- UI terminology is confusing;
- desired preset is missing.

Analytics identifies the pattern; replay/user research later identifies why.

## 6.3 Backtracking

Track repeated route loops such as:

```text
/practice
→ /hub
→ /practice
→ /hub
```

or:

```text
/learn
→ level
→ /learn
→ another level
→ /learn
```

Potential signal of navigation or choice overload.

## 6.4 Dead ends

Examples:

- level opened but no lesson;
- teacher opens dashboard but never creates batch;
- Daily Quest shown but repeatedly ignored;
- teacher opens roster with zero students repeatedly.

## 6.5 Abandonment

Define explicitly.

Example practice abandonment:

> session created but not successfully finalised within the expected usage window.

Use Bolt server state, not merely browser navigation, when defining authoritative abandonment.

## 6.6 Error loops

Examples:

- repeated join-code failure;
- repeated failed session start;
- multiple 401 refresh failures;
- repeated answer save failures;
- repeated API retry;
- recovery failure.

---

# 7. Mobile vs Laptop Analytics

Mobile and laptop must be treated as separate experience cohorts.

Every important funnel should be breakable down by:

- `device_class: mobile | tablet | desktop`
- viewport width bucket
- browser family
- operating system family
- pointer type where useful
- touch capability where useful

Avoid storing unnecessary hardware fingerprinting data.

## Priority comparisons

Compare mobile vs desktop for:

- student signup completion;
- onboarding completion;
- Hub → activity start;
- Learn → classwork start;
- Arena start;
- Arena completion;
- Daily Quest completion;
- answer save failure;
- session recovery;
- teacher signup;
- batch creation;
- join-code copy;
- roster usage.

### Suggested viewport buckets

- `<360`
- `360–389`
- `390–479`
- `480–767`
- `768–1023`
- `1024–1439`
- `1440+`

These can later be simplified based on real usage.

---

# 8. Event Architecture

Bolt should **not** scatter vendor-specific calls throughout components.

Do not build the application around calls such as:

```ts
posthog.capture("...");
```

inside dozens of pages.

Create a Bolt-owned analytics abstraction.

Suggested structure:

```text
frontend/src/shared/analytics/
    analytics.ts
    events.ts
    properties.ts
    identity.ts
    privacy.ts
```

Possible API:

```ts
analytics.track("practice_started", {
  mode,
  operation,
  source,
  deviceClass,
});
```

The analytics module can initially send to PostHog and later support another destination without rewriting product code.

---

# 9. Event Naming Rules

Use:

`snake_case`

Prefer product outcomes and actions.

Good:

```text
practice_started
practice_completed
daily_quest_started
teacher_batch_created
student_joined_batch
```

Avoid UI implementation names:

```text
yellow_button_clicked
card_3_pressed
component_x_opened
```

Those become meaningless after redesigns.

---

# 10. Common Event Properties

Only add properties that answer a product question.

## Recommended common properties

```text
app_version
environment
role
device_class
viewport_bucket
route
source
account_age_bucket
current_level
session_kind
```

Where relevant:

```text
mode
operation
question_count
digits
rows
time_limit
flash_speed
mission_state
progress_count
teacher_has_batches
batch_student_count_bucket
```

## Avoid by default

- student name;
- teacher name unless operationally required;
- email;
- phone;
- date of birth;
- PIN;
- passwords;
- join codes;
- raw answer text;
- raw arithmetic question text;
- microphone recordings;
- transcripts;
- live-session URLs;
- IP-derived precise location;
- any secret/token;
- authentication headers.

---

# 11. Proposed Event Taxonomy

## 11.1 Authentication

```text
login_started
login_succeeded
login_failed

student_signup_started
student_signup_validation_failed
student_signup_succeeded
student_signup_failed

teacher_signup_started
teacher_signup_validation_failed
teacher_signup_succeeded
teacher_signup_failed

logout_completed
auth_refresh_failed
```

Properties for failures should use a safe enumerated reason:

```text
reason: invalid_code
reason: validation
reason: network
reason: unauthorised
reason: server_error
```

Do not send raw backend error bodies if they may contain sensitive information.

---

## 11.2 Onboarding

```text
onboarding_started
onboarding_step_viewed
onboarding_step_completed
onboarding_completed
onboarding_exited
```

Properties:

```text
step
elapsed_ms
device_class
```

---

## 11.3 Hub

```text
hub_viewed
hub_learn_selected
hub_practice_selected
hub_daily_quest_selected
hub_profile_selected
```

If navigation becomes more dynamic later, a generic event is acceptable:

```text
hub_portal_selected
portal: learn | practice | daily_quest | profile
```

---

## 11.4 Learn

```text
learn_viewed
level_viewed
lesson_viewed
classwork_start_requested
classwork_started
classwork_completed
classwork_abandoned
mission_report_viewed
```

Properties:

```text
level_order
lesson_order
source
device_class
```

Avoid sending question content.

---

## 11.5 Practice

```text
practice_viewed
practice_mode_selected
practice_operation_selected
practice_config_changed
practice_start_requested
practice_started
practice_first_answer_saved
practice_completed
practice_abandoned
practice_result_viewed
```

`practice_config_changed` should be throttled/aggregated enough to avoid useless event volume.

Useful properties:

```text
mode
operation
questions
digits
digits_row_1
digits_row_2
rows
time_limit_min
flash_speed_bucket
```

---

## 11.6 Daily Quest

```text
daily_quest_card_viewed
daily_quest_unavailable
daily_quest_start_requested
daily_quest_started
daily_quest_resumed
daily_quest_progress_saved
daily_quest_completion_requested
daily_quest_completed
daily_quest_previous_resumed
daily_quest_completion_viewed
```

Properties:

```text
mission_date
level_order
lesson_order
saved_progress
source
was_previous_day
```

Do not use client-side events alone to declare authoritative mission completion.

---

## 11.7 Teacher

```text
teacher_dashboard_viewed
teacher_create_batch_opened
teacher_batch_created
teacher_batch_create_failed
teacher_join_code_copied
teacher_join_code_rotated
teacher_roster_viewed
teacher_level_dashboard_viewed
teacher_live_link_saved
teacher_live_session_launched
```

Properties:

```text
batch_student_count_bucket
teacher_batch_count_bucket
level_order
```

Do not send actual join code or live-session URL.

---

## 11.8 Class joining

```text
join_class_viewed
join_class_requested
join_class_succeeded
join_class_failed
```

Failure reason should be a safe category, not the submitted code.

---

## 11.9 Recovery / reliability

```text
session_recovery_detected
session_recovery_started
session_recovery_succeeded
session_recovery_failed
session_reconciliation_required
session_reconciliation_completed
answer_save_retry
answer_save_failed
session_finalize_failed
```

Properties:

```text
session_kind
recovery_reason
network_state
retry_count_bucket
```

Never log pending answer payloads.

---

# 12. Authoritative Outcomes: Client vs Server

This distinction is critical for Bolt.

## Frontend analytics should measure

- page viewed;
- button selected;
- configuration changed;
- action requested;
- UI state;
- visible error;
- navigation;
- UX latency;
- feature exposure.

## Backend / Bolt database should own

- accepted answer;
- durable attempt;
- finalised session;
- lesson completion;
- level completion;
- XP awarded;
- Daily Quest completion;
- classroom enrollment;
- actual batch creation;
- authoritative session state.

### Example

Frontend:

```text
practice_start_requested
```
Backend outcome:

```text
ArenaSession exists
```

Frontend:

```text
daily_quest_completion_requested
```

Backend truth:

```text
mission completed + ProgressRecord/XP committed
```

This prevents analytics delivery failures or double-firing UI events from corrupting product truth.

---

# 13. Recommended Analytics Identity Model

## Student

Use a non-human-readable internal analytics identifier.

Example:

```text
user_id: internal UUID
role: student
```

Avoid making call-sign the analytics identifier.

## Teacher

Similarly:

```text
user_id: internal UUID
role: teacher
```

Organisation/school should only become an analytics group if there is a clear product reason and Bolt's agreements permit it.

## Anonymous acquisition

Marketing traffic may remain anonymous until account creation.

On authentication:

```text
anonymous browser identity
        ↓
account created/login
        ↓
associate with internal analytics UUID
```

Do not use email as the analytics ID.

---

# 14. Privacy Rules for Student Accounts

Bolt has a higher privacy bar because students are children.

This document is a product/engineering recommendation, not legal advice. Before enabling high-fidelity behavioural recording or advertising-related integrations on student surfaces, Bolt should perform the relevant legal/privacy review for the jurisdictions in which it operates.

## Default rules

### Collect

- feature events;
- coarse device class;
- app version;
- role;
- level number;
- session type;
- safe configuration metadata;
- safe error category;
- timing/performance.

### Do not collect

- student name;
- DOB;
- PIN;
- email;
- raw answer text;
- raw question text unless explicitly justified;
- microphone audio;
- voice transcription;
- teacher live-session URLs;
- classroom join codes;
- sensitive text fields;
- exact physical location;
- access/refresh tokens;
- passwords;
- authentication headers.

---

# 15. Session Replay Policy

## Default recommendation

### Student application

**OFF by default.**

Do not automatically record student sessions.

Before any future student replay experiment:

1. define exactly what problem replay is needed to solve;
2. obtain privacy/legal approval;
3. record only the minimum routes necessary;
4. mask all text and inputs;
5. block media where relevant;
6. ensure questions/answers/student data are not captured;
7. use strict sampling;
8. define short retention;
9. document access controls;
10. verify redaction before production enablement.

PostHog supports masking text, inputs and elements before replay capture, but configuration capability does not remove Bolt's responsibility for deciding whether replay should be collected.

## Teacher application

Teacher replay may be less sensitive, but pages contain student rosters and join information.

Therefore teacher replay should also be:

- opt-in at the product configuration level;
- aggressively masked;
- disabled on roster/student-detail views unless specifically reviewed;
- never capture join codes, emails, meeting links, or sensitive fields.

---

# 16. Microsoft Clarity Decision

**Do not use Microsoft Clarity on the Bolt student application.**

Current Microsoft documentation says Clarity should not be used on websites/apps targeting users under 18.

Even though Clarity offers useful:

- heatmaps;
- click maps;
- session recordings;
- rage-click insights;

it is not appropriate for the core Bolt student product under Microsoft's stated usage restriction.

It may be possible to consider it separately for an adult-only marketing/teacher property if that surface is clearly separated and still passes Bolt's privacy review, but using one consistent PostHog strategy is likely simpler.

---

# 17. PostHog Recommendation

PostHog is the recommended primary product analytics platform because it can cover:

- custom events;
- trends;
- funnels;
- retention;
- paths;
- stickiness;
- cohorts;
- dashboards;
- feature flags;
- experiments;
- surveys;
- optional session replay.

## Why it fits Bolt

### One event model

The same typed events can answer:

- activation;
- feature usage;
- retention;
- UX friction;
- experiments.

### Funnel analysis

Examples:

- signup → first session;
- Hub → Daily Quest;
- Practice → session start;
- teacher signup → first student joined.

### User paths

Useful for discovering:

- unexpected navigation loops;
- features students fail to discover;
- routes visited before abandonment.

### Retention

Useful for measuring:

- D1 / D7 / D30 learning retention;
- Daily Quest effect;
- differences between Arena users and Learn users.

### Feature flags

Later Bolt can safely test:

- Quick Practice;
- simplified Hub;
- revised onboarding;
- new Daily Quest placements;
- teacher dashboard changes.

Do not introduce experimentation until baseline instrumentation is trustworthy.

---

# 18. Sentry Recommendation

Sentry should answer:

> "Is this user struggling because the UX is confusing, or because the application is failing?"

Track:

- frontend exceptions;
- failed network requests;
- slow API calls;
- React errors;
- route performance;
- failed session creation;
- failed finalisation;
- answer persistence failures;
- browser-specific regressions;
- frontend release regressions.

## Correlation example

PostHog:

```text
Practice session completion dropped from 80% to 61%.
```

Sentry:

```text
A new frontend release introduced a spike in
POST /sessions/.../submit failures on mobile Safari.
```

Together these are far more useful than either tool alone.

## Sentry privacy

Use internal UUIDs or anonymous identifiers.

Avoid attaching:

- email;
- DOB;
- join codes;
- raw answers;
- tokens;
- request bodies containing student data.

Use sanitisation hooks before sending error events.

---

# 19. GA4 Recommendation

GA4 is optional and should primarily support Bolt's **marketing** surfaces:

- landing page;
- campaigns;
- Instagram/Meta traffic;
- Google Ads;
- SEO;
- teacher acquisition landing pages;
- public conversion to signup.

Do not make GA4 the primary product intelligence system inside the authenticated student app.

Use PostHog for product behaviour.

Use GA4 where marketing attribution and ad ecosystem integration matter.

---

# 20. Dashboard Specification

Bolt should launch with a small number of useful dashboards rather than dozens of charts.

## Dashboard A — Product Health

- Weekly Active Learners
- Weekly Active Teachers
- completed learning sessions
- questions attempted
- median sessions/student
- error rate
- session start failure %
- session finalisation failure %
- mobile vs desktop split

---

## Dashboard B — Student Activation

Funnel:

```text
signup_started
→ student_signup_succeeded
→ onboarding_completed
→ hub_viewed
→ first_activity_started
→ first_activity_completed
```

Breakdowns:

- device class;
- viewport bucket;
- batch/teacher where allowed;
- signup week.

---

## Dashboard C — Student Engagement

- active learning days/week
- sessions/student/week
- questions/student/week
- Learn vs Practice vs Daily Quest
- Arena modes
- completion by mode
- completion by level
- session duration
- repeat practice same day

---

## Dashboard D — Daily Quest

- eligible students
- card view %
- start %
- completion %
- median completion time
- resume %
- previous-day resume %
- D1 return after completion
- mobile vs desktop completion
- quest users vs non-quest-user retention cohort

---

## Dashboard E — Practice UX

Funnel:

```text
practice_viewed
→ mode_selected
→ start_requested
→ practice_started
→ first_answer_saved
→ practice_completed
```

Additional:

- configuration changes before start
- setup time
- abandonment by mode
- default-config usage
- mobile completion
- errors/session start
- errors/finalisation

---

## Dashboard F — Teacher Activation

```text
teacher_signup_succeeded
→ teacher_dashboard_viewed
→ teacher_batch_created
→ teacher_join_code_copied
→ first_student_joined
→ teacher_roster_viewed
```

Additional:

- time to first batch
- time to first student
- batches/teacher
- active students/teacher
- weekly teacher return
- level dashboard usage

---

## Dashboard G — Mobile UX

For mobile vs desktop:

- signup completion
- Hub → activity
- Learn → start
- Practice → start
- Practice completion
- Daily Quest completion
- recovery rate
- error rate
- teacher batch creation
- median page/action latency

---

# 21. Product Decisions Analytics Should Enable

Analytics should lead to explicit product questions.

Examples:

## Question 1

**Is Practice setup too complicated?**

Evidence:

- long median setup time;
- many configuration changes;
- high Practice → no-session abandonment.

Possible response:

- Quick Practice preset;
- remember previous setup;
- simplify common modes.

---

## Question 2

**Is the Hub helping students start useful work?**

Evidence:

- Hub views high;
- low Hub → activity start.

Possible response:

- clearer single primary action;
- personalised recommendation;
- Daily Quest prominence;
- continue-last-session action.

---

## Question 3

**Does Daily Quest improve retention?**

Compare:

- students exposed to Quest;
- students starting Quest;
- students completing Quest;
- subsequent learning-day retention.

Avoid claiming causation from simple correlation. Use a proper controlled experiment later if a causal answer is needed.

---

## Question 4

**Are teachers failing before students ever join?**

Evidence:

- high registration;
- low batch creation;
- low join-code copy;
- low first-student enrollment.

Possible response:

- guided teacher activation;
- batch creation directly after signup;
- better sharing UX;
- clearer code instructions.

---

# 22. Analytics Quality Rules

## Rule 1 — No random events

Every event must answer a known product question.

## Rule 2 — No raw sensitive payloads

Analytics should contain metadata, not user content.

## Rule 3 — Do not use analytics as product truth

Analytics platforms can drop, delay, duplicate or sample events.

Bolt DB remains authoritative.

## Rule 4 — Version event contracts

If an event meaning changes materially, version it or migrate deliberately.

## Rule 5 — Test instrumentation

Analytics calls should have unit/integration coverage where meaningful.

## Rule 6 — Separate production and non-production data

Development, CI and local testing should not contaminate production analytics.

## Rule 7 — Mark synthetic/test accounts

Dashboards should exclude QA and automated test users.

## Rule 8 — Store release/app version

Every event/error should be traceable to the application release where practical.

---

# 23. Event Volume Control

Do not create an event for:

- every keypress;
- every mouse movement;
- every render;
- every answer-field digit typed;
- every timer tick;
- every frame.

For high-frequency interaction, capture a summary.

Instead of:

```text
digit_input
digit_input
digit_input
digit_input
```

capture:

```text
question_interaction_summary
input_changes: 4
```

only if that metric is genuinely useful.

---

# 24. Backend Product Analytics

Many Bolt outcomes can be derived directly from PostgreSQL.

Examples:

- number of sessions;
- completions;
- attempts;
- XP;
- lesson completion;
- level completion;
- active students;
- batch membership;
- teacher student counts.

Do not duplicate all of this as new analytics events merely because PostHog exists.

Recommended pattern:

### PostHog

Behaviour / product interaction.

### Bolt database

Learning outcomes and operational truth.

### BI / internal reporting later

Join the two worlds when needed.

---

# 25. Suggested Analytics Module API

Example only; implementation should follow approved scope.

```ts
export type BoltAnalyticsEvent =
  | "hub_viewed"
  | "hub_portal_selected"
  | "practice_viewed"
  | "practice_started"
  | "practice_completed"
  | "daily_quest_started"
  | "daily_quest_completed"
  | "teacher_batch_created";

interface AnalyticsContext {
  appVersion?: string;
  role?: "student" | "teacher" | "admin";
  deviceClass?: "mobile" | "tablet" | "desktop";
  viewportBucket?: string;
}

export function track(
  event: BoltAnalyticsEvent,
  properties?: Record<string, string | number | boolean | null>
) {
  // privacy filter
  // environment filter
  // analytics destination
}
```

Add a runtime privacy allowlist rather than trusting every caller not to include sensitive data.

---

# 26. Suggested Backend Instrumentation Boundary

Do not insert analytics side effects inside critical progress transactions if a telemetry failure could affect learning persistence.

Critical paths such as:

- attempt persistence;
- session finalisation;
- XP award;
- lesson completion;
- mission completion;

must remain correct even if analytics is unavailable.

Preferred approaches:

1. derive product outcomes from Bolt data;
2. emit analytics after successful commit;
3. make telemetry non-blocking;
4. never roll back learning progress because PostHog/Sentry failed.

---

# 27. Feature Flags and Experiments

Do not start A/B testing immediately.

First establish:

- stable event taxonomy;
- reliable identity;
- dashboards;
- baseline metrics;
- production event quality.

Then experiments can answer questions such as:

### Quick Practice

Control:

> full configuration first

Variant:

> Start 10 recommended questions + Customize

Success:

- Practice → first answer
- Practice → completion
- no degradation in repeat usage

### Hub redesign

Control:

> Learn + Practice + Quest cards

Variant:

> Continue / Today's Mission as primary CTA

Success:

- Hub → meaningful activity start;
- time-to-start;
- completed session rate.

Experiments should not manipulate curriculum difficulty or educational progression casually.

---

# 28. Rollout Plan

## Phase 0 — Scope and privacy approval

Before coding:

- create formal feature scope;
- PM approval;
- Senior Tech Manager/CTO approval;
- Head QA approval;
- privacy/security review because student data is involved.

This follows Bolt's current AI-SDLC policy for new feature work.

---

## Phase 1 — Analytics foundation

Implement only:

- Bolt analytics abstraction;
- environment isolation;
- identity lifecycle;
- safe common properties;
- privacy allowlist;
- PostHog initialisation;
- Sentry initialisation;
- release version tagging;
- test account exclusion.

No replay.

---

## Phase 2 — Critical funnels

Instrument:

- signup;
- onboarding;
- Hub;
- Learn;
- Practice;
- Daily Quest;
- teacher activation.

Build dashboards.

Do not instrument every minor interaction yet.

---

## Phase 3 — Reliability correlation

Add:

- recovery signals;
- safe API failure categories;
- Sentry release/error tracing;
- session start/finalise performance.

Correlate product drop-offs with technical failures.

---

## Phase 4 — UX improvement loop

Every two weeks:

1. identify largest drop-off;
2. inspect supporting data;
3. reproduce UX;
4. form hypothesis;
5. implement small change;
6. compare against baseline;
7. retain or revert.

---

## Phase 5 — Controlled experiments

Only after event quality is trusted.

Use feature flags and experiments for:

- Hub hierarchy;
- Practice defaults;
- onboarding simplification;
- teacher activation prompts.

---

# 29. Acceptance Criteria for the Analytics Feature

A future implementation scope should include at least the following.

## AC-01 — No impact on learning correctness

Analytics failure cannot prevent:

- login;
- session creation;
- answer persistence;
- finalisation;
- XP;
- Daily Quest completion;
- teacher classroom operations.

## AC-02 — Privacy allowlist

Automated tests prove sensitive fields are rejected/redacted.

Examples:

- password;
- PIN;
- DOB;
- email;
- join code;
- answer content;
- tokens.

## AC-03 — Environment isolation

Local/CI/test traffic cannot pollute production analytics.

## AC-04 — Identity reset

Logout/account switch resets analytics identity correctly.

## AC-05 — Student and teacher journeys

Critical funnel events fire once with documented semantics.

## AC-06 — Server-authoritative completions

Dashboards do not define XP/lesson/mission completion from client click events.

## AC-07 — Mobile

Instrumentation works on supported mobile browser widths without UX impact.

## AC-08 — Performance

Analytics SDK loading and event delivery do not materially degrade key web performance measurements.

Define an actual measured baseline before setting a final threshold.

## AC-09 — Offline / analytics unavailable

Application still works when:

- analytics host is blocked;
- ad blocker blocks analytics;
- DNS fails;
- telemetry request times out.

## AC-10 — Documentation

Event catalog documents:

- event name;
- exact trigger;
- owner;
- properties;
- privacy classification;
- authoritative vs observational status;
- dashboard usage.

---

# 30. Needs, Wants and Exclusions

## NEEDS

- PostHog product analytics
- Sentry error/performance monitoring
- Bolt-owned typed analytics API
- privacy allowlist
- production/test separation
- student/teacher identity handling
- critical funnels
- mobile breakdown
- release tagging
- analytics failure isolation
- dashboard definitions
- test-account filtering
- documentation

## WANTS

- PostHog surveys
- feature flags
- controlled experiments
- teacher-only replay after privacy review
- automatic anomaly alerts
- warehouse/BI sync
- advanced cohort analysis

## EXCLUSIONS FOR INITIAL RELEASE

- student session replay
- Microsoft Clarity on student application
- mouse-movement logging
- keystroke logging
- raw question/answer telemetry
- microphone/audio storage for analytics
- precise location
- behavioural advertising
- building a custom analytics warehouse
- replacing Bolt's authoritative progress database
- curriculum experimentation

---

# 31. First Analytics Questions Bolt Should Answer

Once sufficient data exists, answer these in order:

1. What percentage of new students complete one meaningful session?
2. Where is the biggest signup/onboarding drop-off?
3. How quickly does a student get from Hub to solving the first question?
4. What percentage of Practice visitors actually start a session?
5. Does Arena configuration create friction?
6. Which Arena modes are genuinely used?
7. What percentage of started sessions are completed?
8. How different is mobile completion from laptop completion?
9. Does Daily Quest increase active learning days?
10. How many teachers reach their first enrolled student?
11. Where do teachers stop during activation?
12. How often are product drop-offs correlated with application errors?

Do not optimise dozens of secondary metrics before these questions are understood.

---

# 32. Weekly Product Review

A weekly product review should look at:

### Student

- Weekly Active Learners
- active learning days
- completed sessions
- Hub → activity start
- activity completion
- Daily Quest completion
- mobile gap
- largest new funnel regression

### Teacher

- new teachers
- teacher → first batch
- batch → first student
- weekly returning teachers
- active students/teacher

### Reliability

- frontend errors
- API failures
- failed starts
- failed finalisations
- recovery failures
- top affected device/browser

### Product decision

End each review with:
> **What is the single highest-impact friction point we will investigate next?**

Analytics is only valuable when it changes product decisions.

---

# 33. Recommended Initial Success Metrics

Do not invent target percentages before Bolt has a baseline.

For the first production measurement period:

1. measure two to four weeks;
2. exclude internal/test accounts;
3. establish baseline;
4. identify highest-friction funnel step;
5. set improvement target from real data.

Example:

```text
Baseline:
Practice Viewed → First Answer Saved = 46%

Goal after redesign:
improve relative conversion by an agreed amount
without decreasing completion quality.
```

This is preferable to arbitrary goals created before observing real behaviour.

---

# 34. Final Recommendation

Bolt should implement a small, deliberate analytics platform rather than broad surveillance.

Recommended architecture:

```text
                ┌─────────────────────────┐
                │      Bolt Web App       │
                │ React / TypeScript      │
                └────────────┬────────────┘
                             │
                    UX / intent events
                             │
                             ▼
                    ┌────────────────┐
                    │    PostHog     │
                    │ funnels/paths  │
                    │ retention      │
                    │ flags later    │
                    └────────────────┘

                frontend/backend errors
                             │
                             ▼
                    ┌────────────────┐
                    │     Sentry     │
                    │ errors/perf    │
                    └────────────────┘

                learning transactions
                             │
                             ▼
              ┌──────────────────────────┐
              │ Django + PostgreSQL      │
              │ authoritative progress   │
              │ attempts / XP / missions │
              └──────────────────────────┘
```

### Initial deployment

**PostHog**
- custom typed product events;
- funnels;
- paths;
- retention;
- dashboards;
- no student replay.

**Sentry**
- frontend/backend error monitoring;
- performance;
- sanitised identifiers;
- no sensitive payloads.

**GA4**
- optional;
- public marketing/acquisition surfaces;
- not the primary authenticated-app analytics source.

**Clarity**
- not on student-facing Bolt.

---

# 35. Source References

## Bolt repository evidence

Repository:

`aranya-squad/Bolt-V1`

Primary files/areas reviewed:

- `frontend/package.json`
- `frontend/src/router.tsx`
- `frontend/src/features/auth/StudentSignupPage.tsx`
- `frontend/src/features/auth/TeacherSignupPage.tsx`
- `frontend/src/features/onboarding/OnboardingPage.tsx`
- `frontend/src/features/hub/HubPage.tsx`
- `frontend/src/features/learn/*`
- `frontend/src/features/practice/*`
- `frontend/src/features/teacher/*`
- `frontend/src/features/student/JoinClassPage.tsx`
- `frontend/src/shared/api/client.ts`
- `docs/PROJECT_BRIEF.md`
- `docs/SYSTEM_MAP.md`
- `docs/features/daily-quests.scope.md`
- `docs/features/daily-quests.md`

Repository-wide searches were also performed for:

- PostHog
- Sentry
- analytics
- telemetry
- Clarity
- GA/gtag

No existing product analytics integration was found in the reviewed repo state.

## External product documentation reviewed

PostHog:

- Product Analytics: `https://posthog.com/docs/product-analytics`
- Funnels: `https://posthog.com/docs/product-analytics/funnels`
- Paths: `https://posthog.com/docs/product-analytics/paths`
- Retention: `https://posthog.com/docs/product-analytics/retention`
- Session Replay: `https://posthog.com/docs/session-replay`
- Privacy: `https://posthog.com/docs/privacy`

Google Analytics:

- Recommended events: `https://support.google.com/analytics/answer/9267735`
- Event parameters: `https://support.google.com/analytics/answer/13675006`

Microsoft Clarity:

- FAQ / restrictions: `https://learn.microsoft.com/en-us/clarity/faq`
- Getting Started: `https://learn.microsoft.com/en-us/clarity/setup-and-installation/getting-started`

Sentry:

- JavaScript/React documentation under `https://docs.sentry.io/platforms/javascript/`

---

# 36. Next Development Boundary

This document establishes the product and technical recommendation.

It **does not itself authorise coding**.

Before implementation in this Bolt project, create the formal analytics feature scope and run it through the project's required:

1. Senior Product Manager review;
2. Senior Tech Manager / CTO review;
3. Head QA review;
4. privacy/security specialist review because child-user telemetry is involved.

Only after the same final scope digest is approved should implementation begin.

The implementation should then follow the Bolt AI-SDLC and stop at:

**READY FOR HUMAN REVIEW**

unless the human owner explicitly instructs otherwise.