# Bolt Abacus — Backlog (deferred work)

Items intentionally deferred out of the v2 Stitch adoption plan (`docs/implementation-plan-v2.md`).
Each has an ID so the plan can reference it.

## BL-1 — Teacher onboarding hardening (target: v3)
**Deferred from:** v2 plan §1c / §9 Q5.

**v1/v2 ships:** a single shared signup secret (env var `TEACHER_SIGNUP_SECRET`) gating
`POST /auth/register-teacher/`. Enough to stop drive-by / automated teacher signups without any
admin workflow.

**Deferred (build in v3):**
- Admin approval queue for new teacher accounts (review before a teacher can enroll minors).
- Per-teacher / org-scoped invite codes instead of one shared secret.
- Stronger teacher email verification (domain allow-list, disposable-email blocking).
- Audit trail for teacher account creation + batch creation.

**Why it's safe to defer at current scale (~1,000 students, indie):** object-level roster permissions
(`IsTeacherOfStudent`, plan §3a/3b) already prevent a teacher from seeing any student who hasn't joined
*their* batch via *their* code. Residual risk is junk signups and a social-engineering "lure" vector (a
bad actor convincing kids to join their batch), not mass-PII exposure. Revisit before any unsupervised /
public teacher-signup push or B2C marketing.
