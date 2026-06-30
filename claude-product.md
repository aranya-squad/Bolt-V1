# claude-product.md — Bolt Abacus

Product, UI/UX, and RBAC guidelines for Sr. Product Managers and Engineering Managers.
Derived from industry-standard PM spec discipline, the deanpeters/Product-Manager-Skills framework,
and the actual Bolt Abacus data model.

**Tradeoff:** These guidelines bias toward preventing spec debt and scope misalignment over speed.
For trivial one-line tickets, use judgment.

---

## 0. Communication and Spec Style

**Hard rules, no exceptions.**

- State outcomes, not activities. "Student sees personalised level list" not "Implement getLevels()".
- One acceptance criterion per line. Never bundle two behaviors into one bullet.
- No "TBD" in a shipped spec. If a value is unknown, it's an open item — name it, assign it, give it a date.
- If a screen requires data from two or more modules, the spec names both endpoints. Silence = integration bug waiting to happen.
- Never describe UI in terms of implementation ("use a useState here"). Describe behavior. Implementation is engineering's call.
- No feature request survives without a stated user role: "As a [STUDENT | GUARDIAN | TEACHER | ADMIN]..."
- If you don't know which role needs it, you don't know what you're building.

---

## 1. Think Before Scoping

**Don't scope from assumptions. Surface ambiguity before the ticket is written.**

Before writing any spec or ticket:
- Name the role(s) affected.
- Name the module(s) touched.
- Ask: does this cross a module boundary? If yes, name both sides.
- Ask: does this change any RBAC rule (section 3)? If yes, update the matrix, not just the ticket.
- Ask: does this touch consent, data retention, or audit logging? If yes, legal/compliance must sign off.
- If two teams own the modules involved, alignment is required before scoping closes.

The most expensive bugs in edtech products are cross-module RBAC gaps. They are invisible in unit tests and catastrophic in audits.

---

## 2. Spec Quality Gates

Every ticket must pass all of these before moving to "Ready for Dev."

### 2a. Required fields on every ticket

| Field | Rule |
|---|---|
| User role | One of: STUDENT, GUARDIAN, TEACHER, ADMIN. Never "users" or "anyone". |
| Entry point | Which screen/route the user is on when the story begins. |
| Happy path | Numbered steps, present tense, from user action to visible result. |
| Edge cases | At minimum: empty state, error state, loading state. |
| Out of scope | Explicit list of what this ticket does NOT do. |
| RBAC check | Which roles CAN and which roles CANNOT do this action (see §3). |
| Compliance flag | Yes/No: does this touch PII, consent, payment, or audit data? |
| QA criteria | Minimum test cases — see §5. |

### 2b. Scope error red flags (stop and rework if any of these are true)

- The ticket changes a data model without naming the API endpoint that exposes it.
- The ticket adds a UI state without defining the empty and error variants.
- The ticket describes an action a STUDENT can take that also appears in the TEACHER module without a role gate.
- The ticket assumes data is available on the frontend without naming the API call that fetches it.
- The ticket touches session verdicts (`correct`, `wrong`, `fixed`, `skipped`) without specifying whether Test Mode changes behavior.
- The ticket adds a new route without naming the `ProtectedRoute` role constraint.
- The ticket modifies the Classwork or Practice flow without confirming MissionReport / Victory screen compatibility.
- The ticket touches student data (progress, verdicts, XP) without specifying what a GUARDIAN can see.

### 2c. Module boundary rules

Each module owns its data. Cross-module reads go through defined API contracts, never through shared state.

| Module | Owns | Never imports directly from |
|---|---|---|
| `auth` | JWT, call_sign+PIN login, ConsentRecord | Any feature module |
| `users` | User, Profile, Role, Guardianship, AuditEvent | `courses`, `exercises` |
| `classroom` | Class, Enrollment, EnrollmentConsent | `exercises`, `progress` |
| `courses` | Level, Lesson, ContentBlock | `users`, `classroom` |
| `exercises` | Exercise, ExerciseConfig, ArenaSession | `classroom`, `users` |
| `progress` | ProgressRecord, XPEvent, LevelCompletion | `classroom`, `courses` |

Frontend mirrors this: a screen in `features/learn/` reads from the `learn` API slice. It does not reach into `features/practice/` stores.

If a screen needs data from two modules, there is a backend aggregation endpoint for it — the frontend does not join module data itself.

---

## 3. RBAC Matrix

This is the single source of truth for role permissions. Any change to this matrix must be reflected in:
1. The backend permission class (DRF `BasePermission`).
2. The frontend `ProtectedRoute` / conditional render.
3. The QA test matrix (§5).

If these three are not in sync, the RBAC is broken regardless of what the ticket says.

### 3a. Role definitions

| Role | Who | Login method | Age constraint |
|---|---|---|---|
| `STUDENT` | Learner, age 6–10 | call_sign + 4-digit PIN | Requires parental consent (COPPA/GDPR-K/DPDP) |
| `GUARDIAN` | Parent or legal guardian | email + password | Must be linked via `Guardianship` to at least one STUDENT |
| `TEACHER` | Instructor | email + password | Must have at least one active `Class` |
| `ADMIN` | Platform operator | email + password | `is_staff = True` |

### 3b. Permission matrix — core actions

| Action | STUDENT | GUARDIAN | TEACHER | ADMIN |
|---|---|---|---|---|
| View own profile | ✅ | ✅ | ✅ | ✅ |
| Edit own profile | ✅ (display_name, avatar) | ✅ | ✅ | ✅ |
| View own progress (XP, levels, verdicts) | ✅ | ✅ (own students only) | ✅ (enrolled students only) | ✅ |
| Start classwork session | ✅ | ❌ | ❌ | ❌ |
| Start practice session (Arena) | ✅ | ❌ | ❌ | ❌ |
| Toggle Test Mode | ✅ | ❌ | ❌ | ❌ |
| Submit session results | ✅ | ❌ | ❌ | ❌ |
| View MissionReport / Victory | ✅ (own) | ✅ (own students only) | ✅ (enrolled students only) | ✅ |
| Create a Class | ❌ | ❌ | ✅ | ✅ |
| Enroll student via join code | ✅ (self-enroll) | ❌ | ✅ | ✅ |
| Rotate class join code | ❌ | ❌ | ✅ (own classes only) | ✅ |
| Assign levels to a Class | ❌ | ❌ | ✅ (own classes only) | ✅ |
| View class roster | ❌ | ❌ | ✅ (own classes only) | ✅ |
| View student progress in class | ❌ | ❌ | ✅ (enrolled students only) | ✅ |
| Create/manage student sub-account | ❌ | ✅ (own students only) | ❌ | ✅ |
| Reset student PIN | ❌ | ✅ (own students only) | ❌ | ✅ |
| View ConsentRecord | ❌ | ✅ (own) | ❌ | ✅ |
| Delete student account (GDPR right-to-erase) | ❌ | ✅ (own students only) | ❌ | ✅ |
| Access admin dashboard | ❌ | ❌ | ❌ | ✅ |
| View AuditEvent log | ❌ | ✅ (own actions) | ❌ | ✅ |

### 3c. Object-level scoping rules

These rules apply in addition to the role matrix above. A TEACHER has the TEACHER role but may only see students in their own classes. A GUARDIAN may only see their linked students.

**STUDENT scope:** own `User`, own `Profile`, own `ProgressRecord`, own `XPEvent`, own `ArenaSession`.

**GUARDIAN scope:** linked students (via `Guardianship`) — their `Profile`, `ProgressRecord`, `XPEvent`. Guardian cannot see other students in the same class.

**TEACHER scope:** own `Class` objects, `Enrollment` records for those classes, and `ProgressRecord` + `XPEvent` for enrolled students only. Teacher cannot see students enrolled in another teacher's class.

**ADMIN scope:** all objects, all roles, all data.

### 3d. Denied-access behavior standards

Every denied access must produce one of these — never a blank screen or a 500:

| Scenario | Expected behavior |
|---|---|
| Unauthenticated user hits a protected route | Redirect to `/login` with `?next=` param |
| Authenticated user hits a route for a different role | 403 response; frontend shows "You don't have access to this page" |
| TEACHER requests progress for non-enrolled student | 403; do not leak that the student exists |
| GUARDIAN requests data for non-linked student | 403; do not leak that the student exists |
| STUDENT tries to access TEACHER/GUARDIAN route | 403 |
| Expired JWT | 401; frontend triggers silent refresh or redirects to login |

---

## 4. Module Workflow Alignment

These are the integration contracts between modules. A spec that changes one side of these without updating the other creates a workflow misalignment.

### 4a. Auth → All modules

`auth` produces a JWT with claims: `{ user_id, role, email }`.
Every other module validates role from the JWT. No module fetches role from the DB on every request — the JWT is the authority.

**Misalignment risk:** if a user's role is changed in the DB, the old JWT remains valid until expiry. Admin role changes must invalidate existing tokens.

### 4b. Classroom → Courses

A `Class` has `assigned_levels` (ManyToMany to `Level`). A STUDENT sees the levels their teacher assigned. If no class membership exists, the student sees the default curriculum progression.

**Spec rule:** any ticket that changes level visibility must specify: (a) what a class-enrolled student sees, and (b) what a self-directed student sees.

### 4c. Exercises → Progress

Every completed `ArenaSession` produces `ProgressRecord` entries (append-only). XP is awarded as `XPEvent` rows, never as an update to a total. Totals are computed aggregates.

**Spec rule:** any ticket that awards XP must name: (a) the trigger event, (b) the XP formula or constant, (c) where the total is displayed and how it's recomputed.

### 4d. Session flow integrity

The session lifecycle is linear and must not be skipped:

```
START_SESSION → [question loop: SUBMIT_ATTEMPT → verdict] → END_SESSION → results screen
```

**Classwork (practice mode):** Fixed verdict possible (first wrong, second correct). Hint and Skip available.
**Classwork (test mode):** No Fixed. No Hint. No Skip. Retry blocked at UI level AND enforced at API level.
**Practice (Arena):** Fixed applies to Zen Mode and Time Attack. Flash Cards: no Fixed (no retry per card).

**Spec rule:** any ticket touching session flow must specify which modes are affected and how END_SESSION → results screen routing is handled.

### 4e. Frontend routing contract

All routes that require auth use `ProtectedRoute`. Each `ProtectedRoute` instance must declare which roles are allowed. No route is "public by default."

| Route pattern | Allowed roles |
|---|---|
| `/login`, `/register` | Unauthenticated only (redirect if logged in) |
| `/hub` | STUDENT |
| `/learn/*` | STUDENT |
| `/practice/*` | STUDENT |
| `/profile` | STUDENT |
| `/classroom/*` | TEACHER |
| `/guardian/*` | GUARDIAN |
| `/admin/*` | ADMIN |

**Spec rule:** any new route must appear in this table before the ticket moves to dev. Adding a route without a role constraint is a security defect.

---

## 5. QA Criteria — Baked into Every Spec

Every ticket ships with a minimum QA checklist. Engineering does not close a ticket as done until all of these pass.

### 5a. Standard checklist (all tickets)

- [ ] Happy path tested at 1280px desktop and 375px mobile.
- [ ] Empty state renders (no crash, no blank screen).
- [ ] Loading state renders (skeleton or spinner — not a blank flash).
- [ ] Error state renders (error message + retry action where applicable).
- [ ] `console.error` produces zero React warnings in the target screen.

### 5b. RBAC checklist (any ticket that creates or modifies a permission)

For each role in the matrix change:

- [ ] STUDENT cannot access TEACHER or GUARDIAN routes (test with STUDENT JWT).
- [ ] TEACHER cannot access data for students not in their class (test with a student in a different class).
- [ ] GUARDIAN cannot access data for students not in their guardianship (test with an unlinked student).
- [ ] Unauthenticated request returns 401 or redirects to login — never 500.
- [ ] Object-level scope enforced: no cross-student, cross-class, cross-guardian data leaks.
- [ ] Denied access returns the correct denied-access behavior from §3d — never a blank screen.
- [ ] Backend permission class and frontend `ProtectedRoute` both updated in the same PR.

### 5c. Session flow checklist (any ticket touching sessions, verdicts, or XP)

- [ ] `verdict: 'correct'` on first correct answer.
- [ ] `verdict: 'wrong'` on first wrong answer (no retry consumed).
- [ ] `verdict: 'fixed'` on second correct answer after first wrong (practice mode only).
- [ ] `verdict: 'skipped'` on skip action (practice mode only).
- [ ] In Test Mode: Fixed is impossible — second attempt after wrong is still `wrong` or advances.
- [ ] In Test Mode: Skip is blocked at UI level (button absent) and API level (skip endpoint returns 403 when session is in test mode).
- [ ] Flash Cards: Fixed verdict is never produced (no retry per card).
- [ ] `END_SESSION` dispatched exactly once — no double submissions.
- [ ] MissionReport / Victory reads from `SessionContext`, not `location.state`.
- [ ] XP awarded after `END_SESSION`, not after each question.

### 5d. Compliance checklist (any ticket touching user creation, consent, PII, or deletion)

- [ ] STUDENT account creation requires a `ConsentRecord` or `EnrollmentConsent` — the backend rejects creation without one.
- [ ] `under_13` flag computed from `date_of_birth` at account creation, stored, never recomputed at runtime.
- [ ] `ConsentRecord` and `EnrollmentConsent` are immutable — save() and delete() raise on update/delete attempt.
- [ ] GDPR right-to-erase: student deletion removes `User`, `Profile`, `ProgressRecord`, `XPEvent`, `Enrollment` — and preserves `ConsentRecord` and `AuditEvent` (legal hold).
- [ ] Guardian-triggered account actions are logged in `AuditEvent` with actor, subject, action, and timestamp.
- [ ] PII (email, DOB, IP) is not logged in application logs or error traces.

---

## 6. Proactive Nudges (PM / EM edition)

Flag these conditions before the sprint starts, not after. One nudge per response.

**Scope creep signal:** a single ticket touches more than one module boundary, more than one role, and adds a new data field. Split it.

**RBAC drift signal:** a new capability is described in a ticket but does not appear in the §3b matrix. Block the ticket until the matrix is updated.

**Compliance trigger:** any change to user registration, login, data deletion, or progress storage must have a compliance flag on the ticket. If it's missing, add it before estimation.

**Module misalignment signal:** a frontend ticket describes fetching data that belongs to a module the screen doesn't own. Surface the required backend aggregation endpoint before dev starts.

**Test Mode gap:** any session-related ticket that doesn't explicitly state Test Mode behavior is underspecified. Return it.

**Unowned open item:** any `// TODO`, `TBD`, or "to be determined" in a shipped spec represents a deferred decision that will become an unplanned ticket. Name it, assign it, date it.

---

## 7. Definitions

These terms have precise meanings in this codebase. Use them consistently in specs.

| Term | Definition |
|---|---|
| `practice mode` | Classwork session with hints, skips, and Fixed verdict enabled. Controlled by `SessionConfig.mode = 'practice'`. |
| `test mode` | Classwork session with hints, skips, and Fixed verdict disabled. Controlled by `SessionConfig.mode = 'test'`. |
| `verdict` | Outcome of a single question attempt: `correct`, `wrong`, `fixed`, or `skipped`. |
| `Fixed` | A question answered wrong on first attempt and correct on a retry — only possible in practice mode. |
| `XP` | Experience points awarded per session. Stored as append-only `XPEvent` rows. Never stored as a mutable total. |
| `call_sign` | Student-facing login identifier (not email). Unique, case-insensitive. Only STUDENT accounts have one. |
| `Guardianship` | The link between a GUARDIAN and a STUDENT. A GUARDIAN can only access data for their guarded students. |
| `Enrollment` | The link between a STUDENT and a `Class`. A TEACHER can only access progress for enrolled students. |
| `join code` | 6-character class code (no ambiguous chars: no 0/O/1/I). STUDENTs use it to self-enroll. Rotatable on leak. |
| `ConsentRecord` | Immutable COPPA/GDPR-K/DPDP consent record. Created once, never updated or deleted. |
| `EnrollmentConsent` | Teacher-attested consent created at enrollment (FERPA school-official model). Immutable. |
| `AuditEvent` | Append-only log of guardian actions on a student account. |

---

**These guidelines are working if:**
- Tickets never return from engineering with "which role does this apply to?"
- RBAC bugs are caught in QA, not in production.
- Module boundaries hold across sprints — no cross-module state sharing discovered in PR review.
- Every session verdict is covered by a test case before the feature ships.
- Compliance flags appear on tickets at creation, not after an audit.
