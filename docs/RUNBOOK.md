---
last_updated: 2026-10-01
verified_repo_branch: chore/ai-context-system-v2
live_environment_verified: never
evidence: CODE+HISTORICAL+UNKNOWN-LIVE
---

# Bolt V1 Runbook

Operational guide for local development, CI, deployment configuration, observability and live-environment investigation.

**Important:** this document distinguishes repository-defined behavior from actually verified live infrastructure. Repository scripts/configuration are not proof that the described resources are currently running.

# Local development

## Compose

[CODE] Root `docker-compose.yml` starts:

- PostgreSQL 16 on localhost:5432
- Redis 7-alpine on localhost:6379
- Django development server on :8000
- Vite frontend on :5173

The backend uses `config.settings.development`; frontend/backend receive variables from a local `.env`.

Typical path:

```bash
docker compose up
```

Repository helper scripts `setup-local.sh` and `run-local.sh` also exist; inspect before relying on them if local setup behavior changes.

## Backend direct

[CODE] Python version in CI: 3.12.

Typical verification:

```bash
cd backend
ruff check .
DJANGO_SETTINGS_MODULE=config.settings.test pytest
```

Tests require isolated PostgreSQL/Redis settings where relevant. Never point test settings at live resources.

## Frontend direct

[CODE] Node version in CI: 20.

```bash
cd frontend
npm ci
npm run lint
npm run type-check
npm run test
npm run build
```

For browser integration:

```bash
npm run e2e
```

Answer-recovery has a dedicated real-API integration command:

```bash
npm run e2e:recovery
```

Use the setup recorded in `docs/features/answer-recovery.md`. Do not call normal Vite dev + MSW a real backend integration test.

# CI

[CODE] `.github/workflows/ci.yml` triggers:

- every pull request
- pushes to `main`

A push to an ordinary feature branch by itself does **not** prove CI ran.

## Backend job

- Ubuntu
- Python 3.12
- PostgreSQL 16 service
- Redis 7 service
- installs `backend/requirements/development.txt`
- `ruff check .`
- `pytest --tb=short -q` with explicit test settings

## Frontend job

- Ubuntu
- Node 20
- `npm ci`
- lint
- type-check
- Vitest

## Build job

Runs after backend/frontend:
- Node 20
- `npm ci`
- `npm run build`
- injects `VITE_API_BASE_URL` from GitHub Actions secret
- uploads `frontend/dist` artifact for 7 days

There is no checked-in automatic production deploy step in this workflow. Do not equate CI build success with deployment.

# Repository-defined production topology

## Backend container stack [CODE]

`docker-compose.prod.yml` defines:

- `web`: Gunicorn Django API
- `worker`: Celery worker, concurrency 2
- `beat`: Celery beat
- `caddy`: TLS termination/reverse proxy to web:8000

Managed PostgreSQL/Redis are expected externally through environment variables.

Caddy publishes ports 80/443. Web port 8000 is not published by the current production compose file.

## Gunicorn [CODE]

`backend/gunicorn.conf.py`:
- `gthread`
- 2 threads
- workers = `2 * CPU + 1`
- 30 second timeout
- binds :8000
- logs access/error to stdout
- trusts forwarded addresses because Caddy is intended as ingress
- closes inherited DB/cache connections after fork

## Caddy [CODE]

`Caddyfile`:
- uses injected API domain/contact/ACME CA
- automatic TLS
- reverse proxies to `web:8000`

## Django production settings [CODE]

- HTTPS security defaults enabled
- optional Sentry when `SENTRY_DSN` is set
- SMTP configuration supported
- S3-backed default/static storage
- AWS region default `ap-south-1`
- instance IAM role can provide S3 credentials when explicit access keys are absent

## Frontend hosting config [CODE]

Root `vercel.json` defines build/output and API/SPA rewrites;
`frontend/vercel.json` defines API/SPA rewrites only.

`frontend/vercel.json` rewrites:
- `/api/*` -> `https://api.boltabacus.com/api/*`
- all other routes -> SPA index

**Live deployed Vercel project/source/revision remains UNKNOWN until provider state is inspected.**

# AWS repository path

The repository contains two different generations of AWS scripting.

## `aws-resume-deploy.sh` [CODE, newer operational shape]

This script expects already-provisioned resources and looks up:
- EC2 instance
- RDS PostgreSQL
- ElastiCache Redis
- ECR image repository

It:
- builds/pushes backend image
- preserves the existing Django secret key
- writes production environment locally for transfer
- copies Compose + Caddyfile
- ensures swap on a small EC2 host
- runs migrations
- collects static files
- starts Compose
- health-checks `https://api.boltabacus.com/api/v1/health/`

This source is more consistent with the current Caddy-only ingress model.

## `aws-deploy.sh` [CODE but partially stale relative to current stack]

The one-time bootstrap script creates VPC-related security groups, S3, IAM role/profile, ECR, RDS, ElastiCache and EC2, but later sections still describe/directly health-check port 8000 and do not fully match the current Caddy-only production compose path.

**Do not run it blindly.** Reconcile it before any new infrastructure bootstrap.

## Historical deploy docs

`docs/aws-deploy-plan.md` and `docs/deploy-infra.md` contain useful design/history but include older alternatives such as Fly.io/two-instance generic deployment. They are not current-live authority.

# Environment matrix

| Environment | Frontend | Backend | DB | Redis | Deployment source | Last live verified |
|---|---|---|---|---|---|---|
| Local | Vite | Django dev | local Postgres 16 | local Redis 7 | docker-compose.yml | n/a |
| CI | build/test only | test only | GitHub service Postgres16 | service Redis7 | .github/workflows/ci.yml | CI config only |
| Preview/staging | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | never |
| Production frontend | Vercel-compatible config exists | n/a | n/a | n/a | actual provider/source UNKNOWN | never |
| Production API | repo intends Caddy->Gunicorn/Compose on AWS-style host | Django | repo intends RDS | repo intends ElastiCache | aws-resume-deploy.sh + compose config | never in current audit |

Before production work, replace UNKNOWN using read-only provider evidence.

# Health

[CODE] `GET /api/v1/health/` checks:
- database connection
- Redis ping

Returns 200 only when both are healthy; 503 with degraded status otherwise.

Health does **not** prove:
- Celery worker healthy
- beat healthy
- frontend deployment healthy
- email/S3 healthy
- correct deployed revision
- acceptable latency/capacity

# Logs and observability

## Django/Gunicorn [CODE]

Django base settings format root/app logs as JSON to console/stdout. Gunicorn access/error logs also go to stdout.

Expected live source if using current Compose-on-EC2 path:
- `docker compose logs web`
- container stdout collected by whatever host/log agent is actually configured

No CloudWatch log driver/agent is established by the checked-in production compose configuration.

## Caddy [CODE]

Current Caddyfile does not define a custom log sink. Operational logs therefore depend on container stdout/default Caddy behavior.

Expected local host access:
- `docker compose logs caddy`

## Celery [CODE]

Worker/beat log to stdout at info level.

Expected:
- `docker compose logs worker`
- `docker compose logs beat`

## Sentry [CODE + UNKNOWN-LIVE]

Production settings initialize Sentry only if `SENTRY_DSN` is present. Whether a live DSN is configured is UNKNOWN.

## CloudWatch [UNKNOWN]

Repository AWS scripts do not establish a verified CloudWatch Logs agent/log driver. Do not tell an operator to "check CloudWatch logs" as if they necessarily exist; first verify actual AWS/logging configuration.

# Production debugging route

For a reported backend production error:

1. Identify the user-visible request/route.
2. Verify deployed frontend API origin/revision when relevant.
3. Check the public health endpoint.
4. Inspect current provider/deployment revision.
5. Inspect Caddy and web container logs.
6. Inspect worker/beat logs if async work is involved.
7. Inspect DB/Redis state/metrics when authorized.
8. Compare the deployed revision/config to repository expectations.
9. Reproduce locally/test before changing code when practical.

For frontend production errors:

1. Verify actual deployed frontend project/revision.
2. Inspect browser/network request behavior.
3. Verify Vite API base/rewrite.
4. Check API health/CORS/auth response.
5. Inspect backend logs if request reaches API.
6. Compare deployed artifact/source to current branch.

Do not jump straight from symptom to source-code patch.

# Connector/tool matrix

This table records desired capability. Actual ChatGPT/Codex connector availability must be re-discovered in the active session.

| System | Purpose | Desired default | Mutating approval |
|---|---|---|---|
| GitHub | source, branches, commits, PRs, CI | read freely; feature-branch writes in scope | merge/release requires human |
| AWS | infra state, metrics/logs, deploy evidence | read-only when authorized | any live mutation requires human |
| Frontend hosting/Vercel | deployed revision/logs/env linkage | read-only when authorized | production deploy/config mutation requires human |
| Figma | design source | read when UI task requires | design writes depend on task |
| Google Drive | product/design docs | read when referenced | writes depend on task |
| Sentry | production errors | read when authorized | config changes require human |

Do not store credentials here. Record only access method/status.

# Secrets

- Never commit `.env`, `.env.production`, credentials, tokens, DB passwords or account exports.
- Example env files may document variable names/placeholders.
- Prefer instance IAM role/default credential chain where the checked-in production settings support it.
- Do not print secret-bearing DSNs in diagnostics or handoffs.

# Deployment approval boundary

Repository feature work may inspect and improve deploy scripts/configuration, but ordinary feature tasks must not:
- deploy production
- mutate AWS
- modify DNS/TLS/provider settings
- run production migrations
- load-test public services
- rotate secrets

Those require explicit human approval and a verified rollback/recovery path.

# Rollback/recovery evidence

Before any future production release, verify:
- exact previous deployed image/revision
- database migration reversibility/forward compatibility
- preserved environment/secrets
- Caddy/health behavior
- recovery path for frontend deployment
- backup/restore posture for DB when schema/data risk exists

Current source mentions RDS backup retention and S3, but no live restore drill is verified in the current context.

# Live verification checklist

When authorized access becomes available, populate evidence rather than assumptions:

- [ ] actual frontend hosting provider/project/revision
- [ ] actual API host instance/container/image revision
- [ ] DNS records and TLS terminator
- [ ] RDS instance/version/backup retention
- [ ] Redis/ElastiCache topology/version/auth
- [ ] S3 bucket/static/media state
- [ ] ECR current image digest/tag
- [ ] worker/beat status
- [ ] log destinations/retention
- [ ] Sentry configured/not configured
- [ ] current health endpoint result
- [ ] relevant CloudWatch metrics/log groups if they actually exist
- [ ] production branch/deploy trigger

Update PROJECT_BRIEF only after evidence is actually collected.
