# Bolt V1 agent guidelines (main)
Inspect current GitHub refs and the target commit before work. Read `BOLT_BOOTSTRAP.md`, `docs/PROJECT_BRIEF.md`, and `docs/CONTEXT_INDEX.yaml`; then load only task-relevant source and tests. Code and Git state supersede summaries. Never assume an unmerged branch is on main.

## Safety
Use separate task branches and preserve remote history. Never merge/release/deploy, alter production infrastructure, secrets, DNS, user data or security settings without explicit human authorization. No force-push of others' branches. Do not weaken tests or silently widen scope. Durable learning/progress writes should use `backend/apps/progress/services.py`. Current main application code must be inspected before selecting interfaces.

## Mandatory owner/project feature governance
In the owner's Cloud dev - Bolt v1 Project/account Work environment, every **new feature** requires Product Manager, Senior Tech Manager/CTO and Head QA independent approval of exactly the same frozen scope digest before coding. Risk-based specialists review security, persistence, UI or operations as needed. Existing work is not retroactively reopened. Follow `docs/AI_SDLC.md` and `skills/feature-scoper/SKILL.md`. Routine maintenance uses a bounded task and checks unless it introduces new product behavior.

## Small-agent execution
Use the compact packet and selective task recipes in `docs/AGENT_CONTEXT_PACKETS.md`. Keep at most two concurrent writers with separate file ownership. Stronger review for migrations, data races, architecture and identity; use economical agents for isolated code/tests only with objective checks. Reviewer must inspect the exact integrated commit and record real commands/results. Local TEST is not hosted CI or LIVE evidence.

## Verification
Backend: Ruff + pytest with isolated PostgreSQL/Redis. Frontend: ESLint, TypeScript, Vitest and build with CI versions. For real API browser tests require built SPA, synthetic isolated DB/cache and no MSW. Preflight with `python scripts/agent_env_preflight.py --strict-e2e` when local test endpoints are configured. Check GitHub Actions at exact SHA using `scripts/verify_ci_evidence.py` before claiming CI VERIFIED. Keep test artifacts and builds isolated.

## Handoff
Write scope, branch, base SHA, tests, limitations, API/migration implications and Next Exact Action in the owning feature record. Do not call READY FOR HUMAN REVIEW merged or released. Use `docs/CLOUD_DEV_HANDOFF.md`. The repo's personal stakeholder refresh skill is `skills/bolt-stakeholder-refresh/SKILL.md`; installation in ChatGPT is a distinct user action.
