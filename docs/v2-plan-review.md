# V2 Implementation Plan — Six-Persona Panel Review

**Subject:** `docs/implementation-plan-v2.md` (draft, this session) and its companion gap analysis.
**Scope guardrail:** Bolt Abacus is a bootstrapped, weeks-old indie product, ~1,000 paying students as
the near-term goal, 2-person team. Findings are scoped to that reality. Anything that only bites at scale
this product doesn't have is marked **[DEFER]**, not omitted.

**Classification key:** `[GAP]` missing, must address · `[ASSUMPTION]` unverified claim named ·
`[DEFER]` real but out of scope now · `[NON-ISSUE]` looks wrong, isn't (explained).

Each persona reviewed independently. Six passes (CTO, Product, DevOps, QA, Security, Senior Engineer),
then reconciliation. Every finding cites a specific plan row/section or a verified code fact — no generic
best-practice padding.

---

## Pass 1 — CTO lens (strategy, build-vs-buy, de-risking, lock-in)

- **C1 [ASSUMPTION]** Wave 1 commits to a destructive guardian/consent **data migration** before any
  teacher screen validates the batch model. The plan assumes prod holds real guardian-created students
  worth migrating. Unverified — at a weeks-old product this may be little more than `seed_qa_users` data.
  *If real users ≈ 0, a reseed is cheaper and safer than a migration, and the destructive change should
  trail proof that the teacher/batch flow works.* Verify the live user count before writing any migration.
- **C2 [GAP]** The plan frames consent re-homing as "move `ConsentRecord` FK from `Guardianship` to
  `Enrollment`." Code says otherwise: `ConsentRecord` is **immutable** (`save()`/`delete()` raise,
  models.py:74-80) and carries **required** `guardian_email` + `student_dob`. This is a schema rework
  (new attestation model, or nullable/replaced fields), not a FK move. The single highest-leverage task in
  the plan is mis-scoped and under-estimated.
- **C3 [GAP]** Teacher email verification + password reset are listed as "build." Cheaper to lean on
  Django's built-in `PasswordResetView`/token machinery + one transactional email provider than to
  hand-roll. Build-vs-buy not stated.
- **C4 [NON-ISSUE]** "Full teacher portal, phased" looks heavy, but it is correctly sequenced *after*
  auth/RBAC, the user explicitly chose it, and the design foregrounds 6 teacher screens. Not gold-plating.
- **C5 [DEFER]** The per-attempt answer round-trip P0 (from `architecture-review-2026-06.md`) is real but
  the plan correctly scopes it out of a design-adoption effort. Leave deferred.

## Pass 2 — Product Head lens (outcomes, journeys, role flows, priority truth)

- **P1 [GAP]** R1's "join code **required at student signup** / no standalone accounts" contradicts the
  design, which ships a **separate, post-login** "Join Class — Teacher Code Entry" screen — implying
  account-first, join-later. The consent shortcut breaks the designed journey. Decide: join-at-signup
  (then the separate screen is redundant) **or** account-then-join (then consent needs a different anchor).
- **P2 [GAP]** Onboarding is priced **Med**; the canonical PRD calls first-session onboarding "the biggest
  conversion risk / BUILD NOW." Priority reflects engineering convenience, not user impact → **High**.
- **P3 [GAP]** Teacher signup edge case unhandled: teacher signs up but never verifies email — can they
  create a batch and enroll minors? Not specified. This is the gate between "happy path" and "real."
- **P4 [GAP]** Student dead-end: under R1, a student without a join code **cannot create an account at
  all**. A self-serve signup screen with a hard code requirement is a conversion cliff and a support load.
- **P5 [ASSUMPTION]** The plan labels "Batch Hub" (the "Welcome to Batch Alpha," instructor-profile,
  "Batch Squad 12 Online" screen) as **teacher**. Its content reads as the **student** post-join landing.
  Role attribution is unverified and changes which shell/route it belongs to.
- **P6 [GAP]** "Path of Conquest L12" is flagged ambiguous but no owner/decision path is assigned for the
  student-view-vs-teacher-view question. A flagged ambiguity with no resolver stays ambiguous.

## Pass 3 — DevOps Head lens (rollout, migration safety, config, rollback)

- **D1 [GAP]** Rollout-ordering break: guardian backend removal is **Wave 1**, but the frontend keeps the
  guardian login mode until **Wave 2**. Between those deploys the live SPA calls a removed
  `/auth/register/` + guardian login → 404/500. Fix: frontend-first, or feature-flag, or ship both in one
  release.
- **D2 [GAP]** The `call_sign` uniqueness migration will **fail on existing data**: `display_name` has no
  DB unique constraint today (models.py:41), uniqueness is only serializer-level and **case-insensitive**
  (`__iexact`), so existing rows can hold `iexact` dupes that a default (case-sensitive) `UNIQUE` won't
  even catch — and real dupes will hard-error the migration. Needs a dedupe + a functional/`citext` or
  partial unique index, called out as its own step.
- **D3 [GAP]** Making `display_name` unique wrongly constrains **guardian/teacher** names too (they share
  the column). The schema decision — dedicated `call_sign` field vs `role=STUDENT`-scoped partial unique
  index — is unstated and load-bearing.
- **D4 [GAP]** Email verification + password reset imply `EMAIL_BACKEND` + a provider (keys, env, DNS/SPF).
  No config/infra task exists for it.
- **D5 [ASSUMPTION]** "Data migration for orphaned guardian-created students" assumes those students exist
  in prod. Verify; if it's QA seed only, reseed. (Merges with C1.)
- **D6 [GAP]** No rollback note for the destructive guardian/consent changes. `ConsentRecord` immutability
  means a botched consent migration **cannot be undone in place** — the rollback story must be designed up
  front (e.g., additive new table, never mutate the old one).

## Pass 4 — QA Head lens (coverage, UI states, testability, acceptance criteria)

- **Q1 [GAP]** No **per-task acceptance criteria** — every wave row is a description with no "done when."
  Not enterprise process; just the High-risk rows (consent rework, RBAC, teacher-signup gating, join-code
  enroll) each need one explicit pass/fail line.
- **Q2 [GAP]** Missing UI states across new/modified screens: student signup (call-sign-taken, invalid
  join code, age-gate fail), teacher signup (email-in-use, unverified), teacher screens (empty batch list,
  zero-student roster, **permission-denied** when a student hits a teacher route). Only happy paths implied.
- **Q3 [GAP]** Role-gating (W1) has no **test matrix**: which role reaches which route, and what denial
  looks like (redirect vs 403). As written it isn't testable.
- **Q4 [GAP]** No test-coverage callout. The new surface (permissions, join-code enrollment, two signup
  serializers) is exactly where 3–4 integration tests + 1 E2E per signup pay for themselves, even at indie
  scale. Existing suite is thin (≈1 visible test file).
- **Q5 [DEFER]** Keep the W4 visual-regression pass **manual/lightweight** (screenshot diff) at this scale;
  don't stand up a full VRT harness.

## Pass 5 — Security Head lens (auth boundaries, data exposure, validation, minors)

- **S1 [GAP — highest stakes]** `register-teacher` as open self-serve = **privilege self-escalation**:
  anyone signs up as `TEACHER` and gains student rosters (names, ages, accuracy). The plan marks gating
  "optional." It must be **mandatory**. Indie-simple gate: admin-created teachers or one shared signup
  secret — not a full invite system, not open signup.
- **S2 [GAP]** Wave 3 roster task specifies `IsTeacher` (role-only) → teacher A could read teacher B's
  roster. `IsTeacherOfStudent` (object-level via `Enrollment`) **already exists** (permissions.py:39-48)
  and ownership is `Class.teacher`. The plan ignored existing infra; wire object-level checks on every
  batch/roster endpoint. Cheap fix, real exposure.
- **S3 [GAP]** A shared batch `join_code` is the only enrollment gate. If it leaks (kids share codes),
  strangers enroll and ride the teacher's consent attestation. Make the code **rotatable/revocable** and
  rate-limit join attempts; consider per-seat invites for sensitive batches.
- **S4 [GAP]** The live `call_sign` uniqueness check (serializers.py:68-71), reused on the public signup
  screen, is a **user-enumeration oracle**. Combined with a 4-digit PIN and only `5/min` login throttle,
  valid call-signs become brute-forceable. Throttle the check, harden PIN login, or de-enumerate the
  response.
- **S5 [GAP]** Self-registration has **no under-13 gate** — the DOB validator only blocks age >18
  (serializers.py:80-81). Minors self-asserting DOB under a teacher-attested model means the attestation
  must actually cover under-13 (COPPA) and data minimization. This is the substance of R1, not a detail.
- **S6 [NON-ISSUE]** Token-in-memory + httpOnly rotating refresh cookie + blacklist is already sound
  (verified). The plan doesn't regress it.

## Pass 6 — Senior Engineer lens (granularity, real references, YAGNI, dependencies)

- **E1 [GAP]** Epics masquerading as tasks: "Instructor Dashboard" (batch cards + join-code copy +
  live-link input + launch + profile) and "Create Batch modal + Batch Detail roster" each hide multiple
  days. Decompose before anyone estimates them.
- **E2 [ASSUMPTION]** "Move `ConsentRecord` FK from `Guardianship` to `Enrollment`" mis-reads the schema:
  the FK lives **on** `Guardianship` → `ConsentRecord` (models.py:94), and the target is immutable. The
  reference is inaccurate. (Merges with C2.)
- **E3 [GAP]** New teacher **route paths are unspecified**. The router is a single `<ProtectedRoute />`
  with no role param (router.tsx:36) and uses `/practice` (not `/training`). The RBAC task must define a
  concrete role-shell split (e.g., a `/teacher/*` group rendered only for `role==='TEACHER'`), not just
  "redirect by role."
- **E4 [GAP]** Intra-Wave-1 ordering is implicit: the call_sign-uniqueness migration must land *before*
  self-serve `register-student` goes live; RBAC depends on `role` from `/auth/me/` (it is returned —
  `UserMeSerializer`). Make the in-wave sequence explicit.
- **E5 [DEFER/YAGNI]** A full teacher **invite-code system** is over-built for this stage. Collapse to the
  simplest gate (shared secret or admin approval) per S1.
- **E6 [NON-ISSUE]** Reusing `GlassCard`/`BoltButton`/`.field` for the new signup screens is correct (all
  verified to exist); no needless abstractions introduced.

---

## Reconciliation (merged, deduped)

| Pass | Finding | Classification | Recommended Fix |
|---|---|---|---|
| Sec | `register-teacher` open self-serve = self-granted TEACHER role exposes minor PII | [GAP] | Make gating mandatory; simplest: admin-created teachers or one shared signup secret |
| Sec | Roster/batch endpoints scoped `IsTeacher` only (role) not owner | [GAP] | Use existing `IsTeacherOfStudent` (permissions.py:39-48) + `Class.teacher` object checks |
| CTO/SrEng | Consent re-home described as FK move; `ConsentRecord` is immutable w/ required guardian fields | [GAP] | Re-scope as a new attestation model (additive); never mutate `ConsentRecord` |
| Sec | No under-13 gate; DOB validator only blocks >18 | [GAP] | Add COPPA age branch; ensure teacher attestation covers under-13 before collecting data |
| DevOps | Guardian backend removed W1 while frontend uses it until W2 → mid-rollout 404s | [GAP] | Frontend-first, feature-flag, or one combined release |
| DevOps | `call_sign` unique migration fails on existing/case-insensitive dupes | [GAP] | Dedupe step + functional/partial (role-scoped) unique index |
| DevOps | Uniqueness on shared `display_name` wrongly constrains guardians/teachers | [GAP] | Dedicated `call_sign` field or `role=STUDENT` partial index |
| Product | R1 "join code at signup" conflicts with the designed post-login Join Class screen | [GAP] | Choose join-at-signup XOR account-then-join; align consent anchor to the choice |
| Product | Onboarding priced Med vs PRD "biggest conversion risk" | [GAP] | Raise to High |
| Product | Student with no code cannot sign up at all (conversion cliff) | [GAP] | Provide a no-code/solo path or a request-access flow |
| Product | Teacher unverified-email can still act? unspecified | [GAP] | Define verification gate before batch creation |
| CTO/DevOps | Guardian/consent migration assumes prod has real data | [ASSUMPTION] | Verify live user count; reseed if QA-only |
| DevOps | No rollback for destructive, immutable consent change | [GAP] | Additive-only migration; documented rollback |
| QA | No per-task acceptance criteria | [GAP] | Add "done when" to High-risk rows |
| QA | Missing empty/error/permission-denied states (signup + teacher screens) | [GAP] | Enumerate states per new/modified screen |
| QA | Role-gating has no test matrix | [GAP] | Define role×route×denial matrix |
| QA | No test-coverage callout for new auth/role code | [GAP] | 3–4 integration tests + 1 E2E per signup |
| Sec | Shared join code leak → unauthorized enrollment | [GAP] | Rotatable/revocable code + join rate limit |
| Sec | Live call_sign check = enumeration oracle vs 4-digit PIN | [GAP] | Throttle/de-enumerate; harden PIN login |
| SrEng | "Instructor Dashboard"/"Create Batch+Roster" are multi-day epics | [GAP] | Decompose into buildable tasks |
| SrEng | Teacher route paths/role-shell split unspecified | [GAP] | Define `/teacher/*` group gated on role |
| SrEng | Intra-Wave-1 dependency order implicit | [GAP] | Sequence: dedupe→unique index→self-signup; RBAC after `/me` role |
| CTO | Email verification/reset "build" not "buy" | [GAP] | Use Django reset + transactional email provider |
| SrEng/Sec | Full teacher invite-code system | [DEFER] | Collapse to simplest gate now |
| CTO | Per-attempt round-trip P0 | [DEFER] | Out of scope for design adoption |
| QA | Full VRT harness | [DEFER] | Keep manual screenshot diff |
| CTO | Full teacher portal scope | [NON-ISSUE] | Correctly sequenced after auth/RBAC |
| Sec | Token/refresh handling | [NON-ISSUE] | Already sound; don't regress |
| SrEng | Reuse of existing UI primitives | [NON-ISSUE] | Correct; no new abstractions |

---

## Synthesis verdict (single voice)

**Ready with fixes — not as-is, not a rework.** The strategic spine is coherent: un-defer the teacher
portal, deprecate guardians, move students to self-serve, and the wave cut points (auth/consent/RBAC
first, student refreshes next, teacher module third, polish last) are sensible for a 2-person team. But
the plan has three correctable soft spots that would bite in execution: it **understates the consent
rework** (treating an immutable, guardian-shaped `ConsentRecord` as a FK move, with no under-13 gate), it
**leaves the teacher role wide open** (self-serve signup + role-only roster perms exposing minor PII while
the object-level perm it needs already exists unused), and it has **concrete break-prod ordering/migration
risks** (guardian backend removed a wave before the frontend stops calling it; a `call_sign` unique
migration that fails on existing, role-shared, case-insensitive `display_name` data). Fix those plus the
mispriced onboarding and the missing UI/permission-denied states, and it's executable.

**Top 3 highest-stakes (if only three):**
1. **Gate teacher signup + use object-level roster perms** (S1, S2) — open `TEACHER` self-grant exposes
   minor PII; the fix is cheap because `IsTeacherOfStudent` already exists.
2. **Right-size the consent rework, additively** (C2/E2, S5, D6) — it's the blocking R1, it's a schema
   change on an immutable model, it lacks an under-13 gate, and it has no rollback. Get it right (or
   soft-deprecate guardians) before any signup code lands.
3. **Fix the guardian-removal rollout order and the call_sign uniqueness migration** (D1, D2, D3) — both
   are concrete production-break risks in Wave 1 as currently sequenced.

*No changes made to `implementation-plan-v2.md` (still a draft in the plan file). Awaiting your call on
which findings to fold in.*
</content>
