# Bolt Abacus — Wave 0 + Wave 1 Execution
**Date:** 2026-06-29 | **Audit pass:** pass-3 folded
**Prerequisite:** `docs/implementation-plan-v2.md` (tickets derive from §3–§4), `docs/plan-review-pass3-edgecases.md`.
**Codebase root:** `/Users/sagarshukla/Bolt_v1`
**Branch:** `feature/v2-wave0-1-auth-rework` (off `main`)

> Verified against actual files. `[STALE - CORRECTED]` = plan claim wrong vs code. Baseline before changes:
> 27 `apps/users` pytest tests green; tests run via `pytest` (pyproject sets `config.settings.test`), not `manage.py test`.

## Audit Correction Summary
| # | Plan claim | Actual state | Fix applied |
|---|---|---|---|
| 1 | "role=STUDENT partial unique index on display_name" | Django constraints can't span the `Profile→User` relation; `Profile` has no `role` | Use a dedicated nullable `Profile.call_sign` (functional-unique via `Lower`); only students populate it |
| 2 | Tests run via `manage.py test` | Suite is **pytest** (`pytest-django`, `pyproject.toml`); `manage.py test` finds 0 | Run `pytest` with DB/REDIS/SECRET env vars |
| 3 | Q6 "fate of existing guardian data" | **No live users** (user-confirmed) | Reseed path; no destructive data migration needed |

## Test command (reference)
```
cd backend && DATABASE_URL=postgres://bolt:bolt@localhost:5432/bolt REDIS_URL=redis://localhost:6379/0 \
  DJANGO_SECRET_KEY=devcmdkey0123456789abcdefghij .venv/bin/pytest apps/<app> -q
```

## WAVE 0 — Pre-flight
**W0-T01 — No live users confirmed** · DoD: [x] user-confirmed; reseed path chosen.
**W0-T02 — Dev email backend** · Modify `config/settings/development.py` (console `EMAIL_BACKEND`); base default via `EMAIL_BACKEND` env. DoD: [ ] password-reset emails render to console in dev.
**W0-T03 — Green baseline** · DoD: [x] 27 users tests pass before changes.

## WAVE 1 — Foundation (ordered by dependency)

**W1-T03 (plan 1g) — Class.join_code + live_session_link**
| Modify | `apps/classroom/models.py` (add `join_code` unique+indexed, `live_session_link` URL blank) |
| Create | migration; `join_code` generator util |
| Backend | Yes | Acceptance | a Class gets a unique rotatable join_code; rotating invalidates the old |
DoD: [ ] fields + migration; [ ] generator collision-safe; [ ] admin shows join_code.

**W1-T01 (plan 1a) — call_sign integrity bundle (one commit)**
| Create | `Profile.call_sign` (nullable, `Lower` unique constraint) + migration |
| Modify | `backends.py` (lookup by `call_sign`, filter `role=STUDENT`); `serializers.py` (set call_sign); `views.py ProfileUpdateView` (uniqueness guard → 409) |
| Backend | Yes | Acceptance | two students can't share a call_sign (DB 409); teacher sharing a name doesn't 500 student login |
DoD: [ ] migration; [ ] backend role-filtered; [ ] PATCH collision → 409; [ ] tests.

**W1-T02 (plan 1b) — Consent rework + fixtures (one commit)**
| Create | `apps/classroom` `EnrollmentConsent` (FK Enrollment+teacher, method, ts, ip, jurisdiction) + migration |
| Modify | student-creation under-13 COPPA branch; `seed_qa_users` → TEACHER+Batch+Enrollment+EnrollmentConsent; retire guardian-coupled tests |
| Backend | Yes | Acceptance | enrolling a minor writes an attestation row; `ConsentRecord` untouched; `seed_qa_users` succeeds |
DoD: [ ] model+migration additive; [ ] seed rewritten; [ ] tests green.

**W1-T04 (plan 1c) — register-teacher (shared-secret gated)**
| Create | `TeacherRegisterSerializer`, `TeacherRegisterView`, URL `auth/register-teacher/` |
| Modify | settings: `TEACHER_SIGNUP_SECRET` env |
| Backend | Yes | Acceptance | wrong/absent secret → 403; creates `role=TEACHER`; client can't set role |
DoD: [ ] endpoint gated; [ ] tests.

**W1-T05 (plan 1d) — self-serve register-student (join-at-signup)**
| Modify | `StudentRegisterView` → AllowAny+throttle; require valid join_code; create User+Profile+Enrollment+EnrollmentConsent atomically; under-13 branch; de-enumerate |
| Backend | Yes | Blocks-on | T01,T02,T03 | Acceptance | valid code → student enrolled; invalid code → 4xx; no guardian required |
DoD: [ ] atomic create+enroll+consent; [ ] tests.

**W1-T06 (plan 1e) — deprecate guardian**
| Modify | `auth/register/` → 410; block `role=GUARDIAN` at `/auth/login/` (410+notice); retire `GuardianRegisterView`/`IsGuardian` usage; update guardian tests |
| Backend | Yes | Acceptance | guardian register → 410; guardian login → 410 |
DoD: [ ] 410s; [ ] suite green.

**W1-T07 (plan 1f) — frontend RBAC**
| Modify | `router.tsx`/`ProtectedRoute` role-gate; `/teacher/*` group (TEACHER only, placeholder); GUARDIAN handling |
| Backend | No | Acceptance | STUDENT hitting `/teacher/*` redirected; role read from `/auth/me/` |
DoD: [ ] role-shell split; [ ] type-check + lint pass.

## Wave Completion Log
| Wave | Tickets Completed | Drift Notes | Review |
|---|---|---|---|
| W0 | T01 (no live users → reseed path), T02 (console email + TEACHER_SIGNUP_SECRET, fail-closed), T03 (baseline 27 green) | Email = dev console; real SMTP provider deferred to deploy | PASS |
| W1 | T01–T07 all complete. Backend **128 pytest green**; frontend **25 vitest + type-check + lint green** | (1) Tests are pytest, not `manage.py test`. (2) call_sign = dedicated nullable `Profile.call_sign` (functional-unique), not a relation-spanning partial index. (3) Guardian models retained but deprecated (register/login → 410); IsGuardian/Guardianship kept dormant. (4) pass-3 #6 "Skipped" verdict is Wave-2 (task 2i) — frontend type already has fixed/skipped; deferred. | PASS |
