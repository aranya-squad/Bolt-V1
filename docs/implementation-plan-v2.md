# Bolt Abacus — Implementation Plan v2 (Stitch V3 adoption)

**Authored:** 2026-06-29
**Supersedes (premise-wise):** `docs/implementation-plan.md` (June 3, written for the pre-backend
vanilla-JS prototype). That file is retained as historical record; this v2 reflects the current
React 18 + Vite + TS frontend and Django + DRF + SimpleJWT backend.
**Companion:** `docs/gap-analysis-v2.md` (design inventory + four-bucket reconciliation),
`docs/v2-plan-review.md` (six-persona breadth review), `docs/plan-review-pass3-edgecases.md`
(execution-path depth review) — both folded into this revision.

This revision incorporates **all** findings from the panel review **and the pass-3 edge-case review**.
Traceability tables at the end: §12 (panel) and §13 (pass-3); every finding is accounted for. Pass-3
fixes are folded into the task that arms them (lockstep, same PR), never a separate pre-phase.

---

## 1. Locked product decisions
1. **Teacher portal: full, phased** — build the complete teacher/batch portal on `classroom.Class`/
   `Enrollment`, sequenced after auth/RBAC.
2. **Students: self-register + join code** — direct student signup (call-sign + PIN), join a batch.
3. **Guardian: deprecate** — remove guardian register/login/permission flows.
4. **Output: v2 files** — preserve the June-3 originals.

## 2. R1 (BLOCKING) — Consent must be re-homed *additively*, not migrated in place
**Why blocking:** today `ConsentRecord` is created only inside guardian student-creation
(`users/views.py:200-236`), anchored to `Guardianship`. Deprecating guardians + minors self-registering
removes the only verifiable-consent capture. For under-13 users this is not legally shippable.

**Corrected approach (was mis-scoped as a "FK move"):**
- `ConsentRecord` is **immutable** (`save()`/`delete()` raise — `users/models.py:74-80`) and has
  **required** `guardian_email` + `student_dob`. **Do not mutate, re-point, or backfill it.**
- Introduce a **new additive model** — `EnrollmentConsent` (a.k.a. school/teacher attestation): FK to
  `Enrollment` + attesting `teacher`, attestation method, timestamp, IP, jurisdiction. The teacher/school
  attests parental consent at enrollment (FERPA school-official model).
- Add an **under-13 COPPA branch**: the DOB validator today only blocks age >18
  (`users/serializers.py:80-81`) — there is no lower gate. Under-13 enrollment must require explicit
  attestation before any PII is stored.
- **Rollback story:** additive-only — a botched rollout is undone by dropping `EnrollmentConsent`; the
  immutable `ConsentRecord` history is never touched.

**Decision still required (gates all signup code):** does a student create an account *then* join (the
design ships a separate post-login "Join Class" screen), or join *at* signup? The consent anchor differs.
See §9 Q1.

## 3. Pre-flight (Wave 0) — verify before any destructive change
The plan must not assume prod holds real guardian data worth migrating (it may be `seed_qa_users` only).

| Wave | Category | Task | Priority | Acceptance (done when) |
|---|---|---|---|---|
| 0 | Infra | Query prod for counts: guardians, guardian-created students, case-insensitive `display_name` collisions among students | High | Counts captured; migration-vs-reseed path chosen on real numbers |
| 0 | Infra | Choose email provider + set `EMAIL_BACKEND`/keys/SPF-DKIM (needed for teacher verification + password reset) | High | A test transactional email delivers in staging |
| 0 | Docs | Confirm §9 open questions Q1–Q6 with product before Wave 1 starts | High | Each Q1–Q6 has a one-line ruling recorded here |

## 4. Wave plan (acceptance criteria included — addresses QA Q1)
> Cut points: **W1** auth/consent/RBAC unblockers (nothing teacher-facing is safe without them) ·
> **W2** auth screens + high-traffic student refreshes · **W3** the teacher/batch module ·
> **W4** deferred-concept specs + QA/polish. Intra-wave order is explicit where it matters (Sr.Eng E4).

### Wave 1 — Foundation (ordered a→g)
| # | Category | Task | Priority | Acceptance (done when) |
|---|---|---|---|---|
| 1a | Migration | **call_sign integrity bundle — one PR, all-or-none.** (i) Dedupe student `display_name` collisions, then add a `role=STUDENT`-scoped partial unique index on lower(`display_name`) — **not** a blanket unique (guardians/teachers share the column). (ii) [pass3 #1] `CallSignBackend.authenticate` must filter `user__role="STUDENT"`; the current cross-role `.get()` (`backends.py:21`) raises `MultipleObjectsReturned`→500 once names collide across roles. (iii) [pass3 #2] `ProfileUpdateView` (`views.py:251`) must apply the same role-scoped uniqueness + return 409 — it is a second write path to the call_sign credential (see §9 Q7) | High | Migration runs on a prod copy with 0 errors; concurrent same-call-sign signup → one DB 409; a teacher sharing a student's name does not 500 student login; a colliding profile PATCH returns 409 |
| 1b | Migration | **Consent rework — one PR with its fixtures.** Add additive `EnrollmentConsent` model (FK Enrollment+teacher, method, ts, ip, jurisdiction); leave immutable `ConsentRecord` untouched; add under-13 COPPA branch in student-creation. Same PR: [pass3 #4] rewrite `seed_qa_users` to build the QA student via TEACHER+Batch+Enrollment+`EnrollmentConsent` (it currently imports `Guardianship`/`ConsentRecord` and breaks at import — `seed_qa_users.py:8,79`); [pass3 #5] migrate/retire the guardian-coupled tests (`test_auth.py`, `test_permissions.py`, `test_consent_record.py` — 74 refs) in lockstep | High | Enrolling a minor writes an attestation row; `ConsentRecord` unchanged; drop-table rollback verified; `seed_qa_users` succeeds; full test suite green |
| 1c | Auth | `POST /auth/register-teacher/` + `TeacherRegisterSerializer`, gated by a **shared signup secret** (env var `TEACHER_SIGNUP_SECRET`) — not admin approval (Q5). Full approval/invite/verification deferred to v3 (`docs/backlog.md` BL-1) | High | Signup without the secret → 403; a self-asserted `role=TEACHER` cannot be set by the client |
| 1d | Auth | Self-serve `POST /auth/register-student/` (replaces guardian-gated path) per the §9 Q1 ruling; throttled; **de-enumerated** call-sign handling | High | New STUDENT+Profile created; invalid/[]missing code path matches Q1 ruling; call-sign check is rate-limited |
| 1e | Backend | Deprecate guardian endpoints/permission — **stage for safe rollout**: `/auth/register/` returns 410 and guardian login is disabled **in the same release as the W2 frontend login rework** (or behind a flag), never a wave earlier. [pass3 #3] **Decide the surviving-guardian case**: `/auth/login/` (`views.py:94`) authenticates any role, so existing GUARDIAN rows can still obtain a token — either block `role=GUARDIAN` at login (410 + deprecation notice) or route per the §5.2 matrix | High | No deploy window where the live SPA calls a removed guardian route (§6); a GUARDIAN login hits the decided path, not an undefined shell |
| 1f | Frontend | RBAC: split shells by `user.role` (from `/auth/me/` `UserMeSerializer`); add a `/teacher/*` route group rendered only for `TEACHER`; denial = redirect to that role's home (not a blank 403). [pass3 #3] The §5.2 matrix must include a **GUARDIAN** row — the role can still authenticate until all guardian data is gone | High | §5.2 matrix (incl. GUARDIAN row) passes; a STUDENT hitting `/teacher/*` is redirected; a GUARDIAN hits the decided 1e path |
| 1g | Migration | `Class.join_code` (rotatable, unique, indexed) + generator; `Class.live_session_link` (URL, blank); join attempts rate-limited | High | Rotating a code invalidates the old one; join endpoint throttled |

### Wave 2 — Auth screens + student refreshes
| # | Category | Task | Priority | Acceptance (done when) |
|---|---|---|---|---|
| 2a | Frontend | Student signup screen — call-sign + PIN + confirm + DOB + **required join code** (Q1: join-at-signup). On submit, create student + enroll + attestation atomically; reuse `GlassCard`/`BoltButton`/`.field`; states: call-sign-taken, invalid/expired code, age-gate fail | High | All states render; happy path creates account, enrolls, lands on the batch hub |
| 2b | Frontend | Teacher signup screen + **email-verification gate**: unverified teacher cannot create a batch or enroll | High | Unverified teacher sees a verify-email wall on batch creation |
| 2c | Frontend | Rework `LoginPage`: remove guardian mode, add teacher (email+password), keep student call-sign+PIN. **Ship with 1e in one release.** [pass3 #9] Also fix stale copy — the "Teacher / Parent" toggle (`LoginPage.tsx:201`) and the "ask your teacher or parent" error (`:104`) | High | No guardian login UI or "parent" copy remains; teacher + student login both work |
| 2d | Auth | Password-reset (request + confirm) via Django's built-in token machinery + the Wave 0 email provider (**buy, not build**) | High | Teacher resets password end-to-end in staging |
| 2e | Frontend | First-run onboarding (3-step → Level 1). **Priority raised to High** (PRD: biggest conversion risk) | High | New student reaches Level 1 classwork from a guided flow |
| 2f | Frontend | **No-code student** state (Q1 = join-at-signup, so no standalone account): a student without a code sees a clear "ask your teacher for a code" screen, not a blocked form. No account-then-join path | Med | A codeless student lands on a defined next-step screen |
| 2g | Frontend | Hub refresh: portal-card background images (lazy/`srcset`), hero tweak; pick one color variant | Med | Both portal cards render images; Lighthouse not regressed |
| 2h | Frontend | Level Selection ranks sidebar. **Re-scoped (pass3 #7):** INITIATE→LEGEND already ship client-side (`rankNames.ts` + `LevelGridCard.tsx:72`, `PathOfConquestPage.tsx:46,64`) — **no backend rank migration needed**. Scope = the ranks sidebar layout + extend `rankNames.ts` past level 10 only if curriculum grows (today it falls back to `LVL {order}`) | Med | Ranks sidebar renders; any level >10 shows a defined label, not a gap |
| 2i | Backend+FE | Mission Report verdict states + internal scroll. **Re-scoped (pass3 #6):** Correct/Wrong/**Fixed** are already computed server-side (`views.py:496-501`); only **Skipped** is missing — add an `is_skip` flag (or sentinel) to the append-only `QuestionAttempt` (migration defaulting existing rows to false), record it in the submit/bulk views, and extend the verdict grouping to emit `"skipped"`. Frontend then renders four states + internal scroll | Med | Report distinguishes skipped from wrong; existing rows backfill to `is_skip=false`; table scrolls within `max-h` |
| 2j | Frontend | Classwork: deeper breadcrumb; "Test Mode" chip as visual stub (pending §9 Q3 spec) | Low | Chip renders; no behavior change yet |

### Wave 3 — Teacher/batch portal (epics decomposed — addresses Sr.Eng E1)
| # | Category | Task | Priority | Acceptance (done when) |
|---|---|---|---|---|
| 3a | Backend | Batch CRUD (`classes/` list/create/patch) with **object-level ownership** via `Class.teacher` | High | Teacher A cannot read/modify Teacher B's class (test) |
| 3b | Backend | Roster endpoint `GET classes/{id}/roster/` (per-student level/accuracy) guarded by existing **`IsTeacherOfStudent`** (`permissions.py:39-48`) | High | Non-owning teacher → 403; owner sees roster |
| 3c | Backend | Enrollment via join code `POST classes/join/` — rate-limited, rotatable-code aware | High | Invalid/rotated code → 4xx; valid code enrolls once (unique_together holds) |
| 3d | Frontend | Instructor Dashboard **split**: (i) active-batch card grid, (ii) join-code copy + **rotate**, (iii) live-link input, (iv) launch action | High | Each sub-part has empty + populated states |
| 3e | Frontend | Create Batch modal | High | Validation + success + error states render |
| 3f | Frontend | Batch Detail roster screen | High | Empty (zero-student) + populated + permission-denied states |
| 3g | Frontend | Join Class (student) code-entry screen → enroll → batch hub | High | Invalid-code + success states; routes to the batch hub |
| 3h | Product | **Resolve role attribution** of "Batch Hub" (reads as student post-join landing, not teacher) and owner of "Path of Conquest L12" (student vs teacher view) | Med | Each screen assigned to a role/shell with a recorded rationale |
| 3i | Backend | `Class.live_session_link` set/get (Google Meet URL), owner-only | Med | Only the owning teacher can set it |
| 3j | Frontend | Personal Best widget — wire to stored history, or stub if data deferred | Med | Shows real value or a clearly-stubbed placeholder |

### Wave 4 — Deferred-concept specs + QA/polish
| # | Category | Task | Priority | Acceptance (done when) |
|---|---|---|---|---|
| 4a | Backend | Spec + implement "Test Mode" rules and "Fixed" verdict per-question state (per §9 Q3) | Med | Rules documented then implemented; report shows Fixed |
| 4b | Backend | Rank-names data model (replace vs coexist with topic names) per §9 Q2 | Med | Level API returns the agreed shape |
| 4c | Backend/FE | Account deletion / data export (minor-privacy) | Med | A student/teacher can export + delete their data |
| 4d | QA | Test coverage: integration (signup serializers, permission classes, join-code enroll) + 1 E2E per signup + RBAC boundary tests | High | New auth/role paths covered; CI green |
| 4e | QA | a11y audit (focus order, SR labels for verdict states) + consistent error/offline states | Med | Audit checklist passes on new/modified screens |
| 4f | QA | **Lightweight** visual-regression (manual screenshot diff, desktop+mobile) — not a full VRT harness | Med | Before/after screenshots compared for refreshed screens |
| 4g | Docs | Update PRD/ARCHITECTURE: teacher-portal un-defer + guardian deprecation + consent model | Low | Docs match shipped reality |

## 5. Testability artifacts (addresses QA Q2/Q3)

### 5.1 Required UI states per new/modified screen
| Screen | empty | loading | error | permission-denied |
|---|---|---|---|---|
| Student signup | n/a | submit spinner | call-sign-taken / invalid-code / age-fail | n/a |
| Teacher signup | n/a | submit spinner | email-in-use | unverified-email wall |
| Login (reworked) | n/a | spinner | bad creds | n/a |
| Instructor Dashboard | zero batches | skeleton | load error | non-teacher → redirect |
| Batch Detail roster | zero students | skeleton | load error | non-owning teacher → 403 |
| Join Class (student) | n/a | spinner | invalid/rotated code | n/a |

### 5.2 Role × route matrix (RBAC acceptance)
| Route group | STUDENT | TEACHER | ADMIN | GUARDIAN (deprecated) | unauth |
|---|---|---|---|---|---|
| `/hub`, `/learn`, `/practice` | allow | allow (or → `/teacher`) | allow | per 1e ruling (blocked at login, or deprecation notice) | → `/login` |
| `/teacher/*` | → `/hub` | allow | allow | blocked | → `/login` |
| guardian routes | removed | removed | removed | removed | removed |

## 6. Migration & rollout safety (addresses DevOps D1–D6)
- **D1 ordering:** guardian backend removal (1e) ships **in the same release** as the frontend login
  rework (2c), or both behind a flag. Never remove the backend a wave before the SPA stops calling it.
- **D2/D3 uniqueness:** dedupe first; use a `role=STUDENT` partial, case-insensitive unique index (or a
  dedicated `call_sign` column). A blanket `display_name` unique is wrong (shared with guardians/teachers)
  and will fail on existing `iexact` dupes.
- **D4 email config:** Wave 0 provisions `EMAIL_BACKEND` + provider — verification/reset depend on it.
- **D6 rollback:** all consent work is additive (`EnrollmentConsent`); rollback = drop table. The
  immutable `ConsentRecord` is never mutated.
- **P3 atomicity:** the call_sign integrity fixes (1a-ii/iii) ship inside 1a's PR; the seed + test
  migrations (pass3 #4/#5) ship inside 1b's PR — a fix never splits from the change that arms it.

## 7. Security requirements baked into tasks (addresses Security S1–S6)
- **S1** Teacher signup is mandatorily gated (1c). **S2** Batch/roster endpoints use object-level
  ownership/`IsTeacherOfStudent` (3a/3b). **S3** Join codes are rotatable + rate-limited (1g/3c).
  **S4** Call-sign uniqueness check is throttled/de-enumerated (1d). **S5** Under-13 COPPA branch (1b).
  **S6 [NON-ISSUE]** existing token-in-memory + httpOnly rotating refresh is sound — do not regress it.

## 8. Signup design-in (corrected)
**Student (self-serve):** fields call_sign (unique, 3–32), PIN (4 digits)+confirm, DOB (age gate incl.
under-13 branch), avatar (optional), **required join code** (Q1: join-at-signup — enroll on submit, no standalone accounts). Reuses existing `StudentRegisterSerializer`
validators (PIN/DOB/call-sign) — net-new work is the AllowAny rework, throttle/de-enumeration, and the
attestation write. **Teacher (gated):** full name, email, password (min 10, matches guardian convention),
org (optional), terms; gate = **shared signup secret** (env var, Q5 — full approval deferred to backlog/v3); post-signup → verify email → create first
batch → dashboard.

## 9. Decisions & open questions (Wave 0)
1. **[RESOLVED] Student join = at-signup.** Student creates the account and joins a batch via code in one
   flow; no standalone accounts. Consent anchor = teacher-attested `EnrollmentConsent` at signup. The
   design's separate "Join Class" screen is repurposed for joining *additional* batches later.
2. **Rank names INITIATE→LEGEND — replace or coexist with topic names?** Ranks already render client-side (pass3 #7), so a backend change is needed only if topic names must *also* surface in the UI.
3. **"Test Mode" — exact rules/states?** Undefined since the first Stitch iteration. (The "Fixed" verdict is **not** open — already implemented at `views.py:499`; only "Skipped" needs building — see 2i.)
4. **"The Lab"/Custom Challenge — kept inline or cut** from Training Arena?
5. **[RESOLVED] Teacher gate = shared signup secret (env var)** for v1/v2 — not admin approval. The full approval/invite/email-verification-hardening system is deferred to v3 (`docs/backlog.md` BL-1). Residual risk (junk signups, batch-lure of minors) is bounded by object-level roster perms (3a/3b).
6. **Fate of existing guardian accounts + guardian-created students** on deprecation (reseed vs preserve).
7. **[RESOLVED] Rename allowed, but call_sign stays unique among students.** Login is call_sign-only (`CallSignBackend`) and student emails are already unique by construction, so the (call_sign, email) pair is unique iff call_sign is — enforce call_sign uniqueness on rename in `ProfileUpdateView` (1a-iii), returning 409 on collision. [pass3 #8]

## 10. Assumptions
No-backend premise of the June-3 plan is void; consent goes additive/teacher-attested (R1); teacher signup
is gated (never open); guardian/QA data is handled by the Wave 0 count decision (reseed if ≈0 real users);
Test Mode remains unspecified and stubbed pending §9 Q3; the Fixed verdict is already implemented (§13 #6)
and rank names already render client-side (§13 #7).

## 11. Deferred (real, but out of scope at current scale)
- Per-attempt answer round-trip P0 (`architecture-review-2026-06.md`) — pre-existing, not a design concern.
- Full visual-regression harness — manual diff suffices now (4f).
- Full teacher approval/invite/email-verification-hardening system — deferred to v3 (`docs/backlog.md` BL-1); v1/v2 ships the shared-secret gate (1c).
- Read replicas / partitioning / Celery scale-out — not at ~1,000 students.
- Roster cross-DB staleness (pass3 #10): roster reads `classroom` (primary) + `progress` accuracy
  (replica-routed, `dbrouter.py:22`). No replica exists at current scale; when one is added, pass
  `hints={"primary": True}` for post-enroll roster reads.

## 12. Panel-findings traceability (proves "all things included")
| Finding | Class | Addressed in |
|---|---|---|
| C1 migration assumes prod data | ASSUMPTION | W0 count gate (§3) |
| C2 consent is rework not FK move | GAP | R1 (§2), 1b |
| C3 email build-vs-buy | GAP | 2d (Django reset + provider), W0 |
| C4 full teacher portal scope | NON-ISSUE | noted §1; sequenced W3 |
| C5 round-trip P0 | DEFER | §11 |
| P1 join-at-signup vs design's Join Class | GAP | §9 Q1, 1d/2a/2f |
| P2 onboarding mispriced | GAP | 2e raised to High |
| P3 teacher unverified can act | GAP | 2b email gate |
| P4 codeless student dead-end | GAP | 2f |
| P5 Batch Hub role attribution | ASSUMPTION | 3h |
| P6 Path of Conquest L12 owner | GAP | 3h |
| D1 guardian removal rollout order | GAP | 1e + §6 |
| D2 call_sign migration fails on dupes | GAP | 1a + §6 |
| D3 shared display_name uniqueness | GAP | 1a + §6 |
| D4 email config missing | GAP | W0 + §6 |
| D5 orphaned-student assumption | ASSUMPTION | W0 (merges C1) |
| D6 no rollback for consent | GAP | §2 additive, §6 |
| Q1 no acceptance criteria | GAP | acceptance column throughout §4 |
| Q2 missing UI states | GAP | §5.1 |
| Q3 role-gating not testable | GAP | §5.2 |
| Q4 no test coverage | GAP | 4d |
| Q5 full VRT | DEFER | 4f / §11 |
| S1 open teacher signup = escalation | GAP | 1c |
| S2 roster role-only perms | GAP | 3a/3b |
| S3 join-code leak | GAP | 1g/3c |
| S4 call-sign enumeration oracle | GAP | 1d |
| S5 no under-13 gate | GAP | 1b |
| S6 token handling | NON-ISSUE | §7 (do not regress) |
| E1 teacher epics | GAP | 3d–3g decomposed |
| E2 ConsentRecord FK mis-read | ASSUMPTION | §2 (merges C2) |
| E3 teacher routes/role-shell | GAP | 1f, §5.2 |
| E4 intra-wave ordering | GAP | W1 a→g ordering |
| E5 full invite system | DEFER | 1c simplest gate, §11 |
| E6 reuse of UI primitives | NON-ISSUE | §8 (correct, kept) |

## 13. Pass-3 edge-case traceability (`docs/plan-review-pass3-edgecases.md`)
Each pass-3 finding is folded into the task that arms it (lockstep, same PR) — never a separate pre-phase.

| Pass-3 finding | Severity | Folded into |
|---|---|---|
| #1 `CallSignBackend` cross-role `.get()` → 500 | High | 1a-ii (same PR as the uniqueness migration) |
| #2 `ProfileUpdateView` second write path to call_sign | High | 1a-iii + §9 Q7 |
| #3 `/auth/login` guardian survival + RBAC gap | High | 1e (login decision) + 1f/§5.2 (GUARDIAN row) |
| #4 `seed_qa_users` guardian-coupled, breaks at import | High | 1b (same PR) |
| #5 existing guardian-coupled tests break | High | 1b (lockstep) |
| #6 "Skipped" needs schema; "Fixed" already shipped | High | 2i re-scoped + §9 Q3 corrected |
| #7 rank names already client-side | Med | 2h re-scoped (no backend migration) |
| #8 call_sign silently renamable in ProfilePage | Med | §9 Q7 (decision) + 1a-iii (enforcement) |
| #9 `LoginPage` stale "parent" copy | Low | 2c |
| #10 roster primary/replica staleness | Low (DEFER) | §11 |

**Pass-3 verdict shift:** with #1–#6 folded into Wave 1/2 task definitions and their acceptance gates,
the "not safe to execute Wave 1 as-is" finding is resolved — each blocker is now a gate inside the task
that owns it.
