# Implementation Plan v2 — Pass 3: Execution-Path Edge Cases

**Method:** Every plan task that touches an *existing* module/class/endpoint/workflow was traced through
the real code (call sites read, not inferred from task text). Scope: indie, ~1,000-student target.
**Non-duplicate:** none of the below appear in `docs/v2-plan-review.md` (that pass covered breadth). Every
row cites a verified file:line. Unverifiable suspicions are tagged `[UNVERIFIED]`.

| # | Module / Class / Workflow | Edge case | Evidence (verified) | Severity | Recommended fix |
|---|---|---|---|---|---|
| 1 | `CallSignBackend` (student login) ← plan 1a (role-scoped call_sign uniqueness) | 1a makes `display_name` unique only **among STUDENTs** (per review D3), so a TEACHER/GUARDIAN can share a name with a student. The backend does `Profile.objects.get(display_name__iexact=call_sign)` with **no role filter** → cross-role collision raises `MultipleObjectsReturned` → **500 on student login** | `backends.py:21-24` (`.get(display_name__iexact=...)`, no role filter); collision enabled by the STUDENT-scoped index in plan §4 1a | High | Filter the lookup to `user__role="STUDENT"` in `CallSignBackend.authenticate` (same wave as 1a) |
| 2 | `ProfileUpdateView` / `ProfilePage` (call_sign is editable post-signup) ← plan 1a | `display_name` **is** the call-sign login credential, but `PATCH /auth/me/profile/` sets it with **no uniqueness check** — a second write path the signup serializer's `validate_call_sign` doesn't guard. After 1a's unique index: colliding PATCH → unhandled `IntegrityError` 500. Before it: silent duplicate call-signs → feeds finding #1 | `views.py:251-268` (no uniqueness/try-except); `ProfilePage.tsx:33` `patchProfile({ display_name })`; serializer guard only at `serializers.py:68-71` | High | Add the same uniqueness validation (role-scoped) to `ProfileUpdateView`; surface a 409 in `ProfilePage`. Decide if renaming the credential is even allowed (see #8) |
| 3 | `/auth/login/` (`CookieTokenObtainPairView`) ← plan 1e (guardian deprecation) + 1f (RBAC) | Removing the guardian **UI** doesn't stop guardian **accounts** from authenticating — `/auth/login/` extends `TokenObtainPairView` and authenticates **any role** by email+password (teachers use the same endpoint, so it can't be removed). A surviving GUARDIAN logs in → `/auth/me/` returns `role=GUARDIAN` → the RBAC matrix in plan §5.2 has **no GUARDIAN row** → undefined shell/redirect | `views.py:94-105` (no role restriction); `LoginPage.tsx:115` posts `/auth/login/`; plan §5.2 omits GUARDIAN | High | Either block `role=GUARDIAN` at login (403 + "account deprecated") or add an explicit GUARDIAN→redirect row to the RBAC matrix; don't leave it undefined |
| 4 | `seed_qa_users` management command ← plan 1b/1e (consent + guardian removal) | The QA **student** fixture is built *through* the guardian path: it imports `Guardianship, ConsentRecord` and calls `_seed_guardianship` (creates ConsentRecord + Guardianship + AuditEvent). Removing the guardian models / re-homing consent **breaks the seed at import**, which breaks the `/dev` skill and any dev bootstrap | `seed_qa_users.py:8` (imports), `:40-42`, `:79-103` (`_seed_guardianship`) | High | Rewrite the seed to create TEACHER + Batch + Enrollment + `EnrollmentConsent` instead of guardian; add to plan 1b/1e as an explicit task |
| 5 | Existing backend test suite ← plan 1b/1e + 4d | Deprecating guardian/consent breaks a large, guardian-coupled existing suite that plan 4d ("add new tests") doesn't account for: `test_auth.py` (39 guardian/consent refs), `test_permissions.py` (25), `test_consent_record.py` (10). CI goes red the moment Wave 1 lands | grep counts: `test_auth.py:39`, `test_permissions.py:25`, `test_consent_record.py:10`, `factories.py:2` | High | Add a Wave 1 task to migrate/retire the guardian-coupled tests in lockstep with the model changes; don't only add net-new tests |
| 6 | Mission Report verdict states ← plan 2i ("4 verdict states") + §9 Q3 | Two errors: (a) **"Fixed" is already implemented server-side** (`question_verdicts[q]="fixed" if not group[0].is_correct`), so §9 Q3 calling it "undefined" is wrong; (b) **"Skipped" has no backend representation** — `QuestionAttempt` stores only `is_correct` (no skip flag) and is **append-only/immutable**, so a skip is recorded as an incorrect attempt and the verdict logic emits `"wrong"`, never `"skipped"`. Plan 2i is scoped frontend-only and cannot distinguish skip without a backend change | `views.py:496-501` (emits correct/fixed/wrong, no skipped); `progress/models.py:31` (`is_correct` only), `:40-46` (append-only) | High | Re-scope 2i: add an `is_skip`/sentinel field to `QuestionAttempt` (migration with default for existing rows), record it in submit/bulk views, extend the verdict grouping to emit `"skipped"`. Drop "Fixed" from §9 Q3 — it's done |
| 7 | Level rank names ← plan 2h + §9 Q2 ("replace vs coexist — data migration") | The design's INITIATE→LEGEND ranks are **already shipped, client-side**, keyed by `level.order`; the level cards already render rank (not topic) name. So §9 Q2's "rank-vs-topic data migration" is **moot for the card display** and a backend rank field would duplicate/conflict with `getRankName` | `rankNames.ts:1-16`; call sites `PathOfConquestPage.tsx:46,64`, `LevelGridCard.tsx:72` | Med | Re-scope 2h to "extend `rankNames.ts` past level 10 if curriculum grows" (it falls back to `LVL {order}`); drop the backend rank migration unless topic names must *also* surface |
| 8 | `ProfilePage` Display Name editor (silent UX) ← plan 1d/2a | Self-serve signup makes call_sign the credential, but `ProfilePage` lets a student freely edit "Display Name" → **silently changes their own login identifier**, with no warning and no re-validation. Not a deliberate call in the plan | `ProfilePage.tsx:84-99` (free edit + SAVE → PATCH) | Med | Decide explicitly: lock call_sign post-creation, or warn "this changes your login" + enforce uniqueness (#2) |
| 9 | `LoginPage` copy (silent regression) ← plan 2c | The toggle labels the email mode **"Teacher / Parent"** and the student error says **"Ask your teacher or parent for help"** — both reference the deprecated parent/guardian role. Plan 2c ("remove guardian mode") covers the form, not this user-facing copy | `LoginPage.tsx:201` (toggle), `:104` (error copy) | Low | Update copy to teacher-only as part of 2c |
| 10 | `PrimaryReplicaRouter` ← plan 3b (roster) | Roster joins `classroom.Enrollment` (primary) with per-student accuracy from `progress` (**replica-routed**). Right after enrolling a student, roster stats can read stale/empty from the replica | `dbrouter.py:22` (`progress` in `_REPLICA_READ_APPS`); roster spec plan §4 3b | Low | `[DEFER]` — no replica is configured at current scale; when one is added, pass `hints={"primary": True}` for post-enroll roster reads |

### [UNVERIFIED] notes (flagged, not asserted)
- `QuestionAttempt.attempt_number` is `null=True` (`progress/models.py:27`) while the verdict grouping
  orders by `("question_index","attempt_number")` and indexes `group[0]`/`group[-1]` (`views.py:488-499`).
  NULLs sort last in Postgres and would misorder first-vs-last attempt. The submit paths compute
  `attempt_number = count()+1` (`views.py:271`, `:403`), so in practice it's populated — **[UNVERIFIED —
  needs a manual check that no code path inserts a NULL `attempt_number`]** before relying on "fixed".
- Whether `MissionReportPage` already consumes the backend `question_verdicts` map is not confirmed in
  this pass (only the backend emit at `views.py:507` and `ClassworkPage`'s `wasSkip` handling were read).
  Finding #6's backend gap stands regardless; the frontend wiring needs a **[manual check]**.

---

## Blocker count & go/no-go

**True production Blockers: 0.** **Wave-1-blocking-in-practice: 6** (findings #1–#6).

**Not safe to execute Wave 1 as-is.** Every one of #1–#6 is *triggered by* a Wave 1 task and breaks
something real before any teacher screen is built: the call_sign uniqueness migration (1a) silently arms a
student-login 500 via two paths (#1 `CallSignBackend`, #2 `ProfileUpdateView`); guardian deprecation
(1b/1e) breaks the dev seed (#4) and the existing test suite (#5) the moment models change; the RBAC
matrix (1f) has no branch for guardian accounts that can still authenticate (#3); and the verdict task
(2i) is mis-scoped because "skipped" needs an append-only schema change while "fixed" is already done
(#6). None require rework of the plan's strategy — they are contained fixes — but they must be folded into
Wave 1 *before* it starts, or Wave 1 will red the build and can 500 the core login. Findings #7–#10 are
non-blocking and can be handled in their existing waves.

*No changes made to `docs/implementation-plan-v2.md`.*
</content>
