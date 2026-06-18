# Bolt Abacus — AWS Deploy Plan

**Date:** 2026-06-08
**Status:** Ready to execute
**Scope:** All code changes + infra steps needed to go from "runs locally" to "live on AWS for real users"

> Split into two tracks. **Track A** is pure code — no AWS account needed, Claude Code executes it.
> **Track B** is AWS provisioning — human runs these commands once, then fills in secrets.

---

## Track A — Code changes (Claude Code)

These are the only files that need to change before the infra is wired. All verifiable locally.

---

### A1 — Wire S3 storage in `production.py`

**File:** `backend/config/settings/production.py`

Uncomment the stubbed S3 block and replace it with the Django 4.2+ `STORAGES` dict.
Use a separate public bucket for static files (collected by `collectstatic`) and private for media.

```python
# Replace the commented stub with:
STORAGES = {
    "default": {
        "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
        "OPTIONS": {
            "bucket_name": env("AWS_STORAGE_BUCKET_NAME"),
            "region_name": env("AWS_S3_REGION_NAME", default="ap-south-1"),
            "default_acl": "private",
            "object_parameters": {"CacheControl": "max-age=86400"},
        },
    },
    "staticfiles": {
        "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
        "OPTIONS": {
            "bucket_name": env("AWS_STATIC_BUCKET_NAME", default=env("AWS_STORAGE_BUCKET_NAME")),
            "region_name": env("AWS_S3_REGION_NAME", default="ap-south-1"),
            "location": "static",
            "default_acl": "public-read",
            "object_parameters": {"CacheControl": "max-age=86400, immutable"},
        },
    },
}

AWS_ACCESS_KEY_ID = env("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = env("AWS_SECRET_ACCESS_KEY")
AWS_S3_REGION_NAME = env("AWS_S3_REGION_NAME", default="ap-south-1")

# Override STATIC_URL to point at S3/CloudFront
STATIC_URL = env(
    "STATIC_URL",
    default=f"https://{env('AWS_STORAGE_BUCKET_NAME')}.s3.{env('AWS_S3_REGION_NAME', default='ap-south-1')}.amazonaws.com/static/",
)
```

**Verify:** `python -c "import storages"` passes in the prod venv. `python manage.py collectstatic --dry-run --settings config.settings.production` (with dummy env vars set) produces no import errors.

---

### A2 — Create `docker-compose.prod.yml`

**File:** `docker-compose.prod.yml` (project root — new file)

`deploy.sh` references this file for the compose-based rolling restart path. Without it, `PLATFORM=compose ./deploy.sh` exits with "file not found".

```yaml
# Production Docker Compose — used by deploy.sh PLATFORM=compose path.
# Do NOT use for local development (use docker-compose.yml instead).
# Secrets come from .env.production — never commit that file.

services:
  web:
    image: ${IMAGE_NAME:-bolt-abacus-api}:${IMAGE_TAG:-latest}
    command: gunicorn config.wsgi:application --config gunicorn.conf.py
    env_file: .env.production
    environment:
      DJANGO_SETTINGS_MODULE: config.settings.production
    ports:
      - "8000:8000"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-sf", "http://localhost:8000/api/v1/health/"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 20s
    depends_on:
      - worker

  worker:
    image: ${IMAGE_NAME:-bolt-abacus-api}:${IMAGE_TAG:-latest}
    command: celery -A config worker --loglevel=info --concurrency=2
    env_file: .env.production
    environment:
      DJANGO_SETTINGS_MODULE: config.settings.production
    restart: unless-stopped

  beat:
    image: ${IMAGE_NAME:-bolt-abacus-api}:${IMAGE_TAG:-latest}
    command: celery -A config beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler
    env_file: .env.production
    environment:
      DJANGO_SETTINGS_MODULE: config.settings.production
    restart: unless-stopped
```

**Note:** Postgres and Redis are NOT in this compose file — they are managed services (RDS + ElastiCache). Connection strings come from `.env.production`.

**Verify:** `docker compose -f docker-compose.prod.yml config` (with a stub `.env.production`) parses without error.

---

### A3 — Create `frontend/public/_headers`

**File:** `frontend/public/_headers` (new file)

Cloudflare Pages reads this automatically. S3+CloudFront requires a separate cache behavior rule (see Track B-5), but the file documents the intent and works for Cloudflare Pages deploys.

```
# Fingerprinted assets — cache forever (Vite appends content hash to filenames)
/assets/*
  Cache-Control: max-age=31536000, immutable

# index.html — always revalidate so new deploys are picked up immediately
/*
  Cache-Control: no-cache, no-store, must-revalidate
```

**Verify:** `npm run build` in `frontend/` — the file appears in `dist/` (Vite copies `public/` to `dist/` verbatim).

---

### A4 — Update `frontend/.env.production`

**File:** `frontend/.env.production`

The current file has `VITE_API_BASE_URL=` (blank). Add a clear placeholder that fails loudly at build time if not set.

Change:
```
VITE_API_BASE_URL=
```

To:
```
# Set this to your API domain before building for production.
# Example: VITE_API_BASE_URL=https://api.boltabacus.com
# Leave blank ONLY if SPA and API are on the same origin (not the case for CDN deploys).
VITE_API_BASE_URL=
```

No code change — this is documentation only. The `client.ts` already handles an empty string correctly (falls back to same-origin).

**Verify:** no change needed beyond reading it.

---

### A5 — Add `REPLICA_DATABASE_URL` and `AWS_STATIC_BUCKET_NAME` to `.env.example`

**File:** `.env.example`

Two env vars are consumed by production code but missing from `.env.example`:

```bash
# Read replica (optional — set when provisioned, Wave 3)
REPLICA_DATABASE_URL=

# Separate S3 bucket for static files (optional — can share AWS_STORAGE_BUCKET_NAME)
AWS_STATIC_BUCKET_NAME=
```

**Verify:** every env var read by `settings/base.py` and `settings/production.py` is documented in `.env.example`.

---

## Track B — AWS provisioning (human, one-time)

Run these once. Fill the resulting connection strings into `.env.production`.

---

### B1 — RDS Postgres (managed DB)

```bash
aws rds create-db-instance \
  --db-instance-identifier bolt-abacus \
  --db-instance-class db.t4g.micro \
  --engine postgres \
  --engine-version 16.3 \
  --master-username bolt \
  --master-user-password <strong-password> \
  --allocated-storage 20 \
  --backup-retention-period 7 \
  --enable-performance-insights \
  --no-publicly-accessible \
  --region ap-south-1
```

After it's available, set in `.env.production`:
```
DATABASE_URL=postgres://bolt:<password>@<rds-endpoint>:5432/bolt_prod
```

**PITR test (do before launch):**
```bash
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier bolt-abacus \
  --target-db-instance-identifier bolt-abacus-restore-test \
  --restore-time $(date -u -v-1H +%Y-%m-%dT%H:%M:%SZ)
# Verify migrations run against the restored instance, then delete it
aws rds delete-db-instance --db-instance-identifier bolt-abacus-restore-test --skip-final-snapshot
```

---

### B2 — ElastiCache Redis

```bash
aws elasticache create-cache-cluster \
  --cache-cluster-id bolt-abacus-redis \
  --cache-node-type cache.t4g.micro \
  --engine redis \
  --engine-version 7.1 \
  --num-cache-nodes 1 \
  --region ap-south-1
```

Set in `.env.production`:
```
REDIS_URL=redis://:<auth-token>@<elasticache-endpoint>:6379/0
```

---

### B3 — S3 buckets

Two buckets. Keep them in the same region as RDS.

```bash
# Media bucket (private — user uploads, future use)
aws s3 mb s3://bolt-abacus-media-prod --region ap-south-1
aws s3api put-public-access-block --bucket bolt-abacus-media-prod \
  --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Static bucket (public via bucket POLICY, not object ACLs — Django collectstatic output)
aws s3 mb s3://bolt-abacus-static-prod --region ap-south-1
aws s3api put-bucket-cors --bucket bolt-abacus-static-prod --cors-configuration '{
  "CORSRules": [{"AllowedOrigins": ["*"], "AllowedMethods": ["GET"], "AllowedHeaders": ["*"]}]
}'

# Modern buckets disable object ACLs, so the app sends NO ACL. Make the static
# bucket publicly readable with a bucket policy instead. First allow public
# policies (turn off the two policy-related Block-Public-Access flags), then attach it:
aws s3api put-public-access-block --bucket bolt-abacus-static-prod \
  --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=false,RestrictPublicBuckets=false"
aws s3api put-bucket-policy --bucket bolt-abacus-static-prod --policy '{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadStatic",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::bolt-abacus-static-prod/*"
  }]
}'
```

Create an IAM user with S3 write permissions to both buckets. Set in `.env.production`:
```
AWS_ACCESS_KEY_ID=<iam-key>
AWS_SECRET_ACCESS_KEY=<iam-secret>
AWS_STORAGE_BUCKET_NAME=bolt-abacus-media-prod
AWS_STATIC_BUCKET_NAME=bolt-abacus-static-prod
AWS_S3_REGION_NAME=ap-south-1
```

---

### B4 — ECR (container registry)

```bash
aws ecr create-repository --repository-name bolt-abacus-api --region ap-south-1

# Build and push
aws ecr get-login-password --region ap-south-1 \
  | docker login --username AWS --password-stdin <account-id>.dkr.ecr.ap-south-1.amazonaws.com

docker build -t bolt-abacus-api:latest -f backend/docker/Dockerfile.prod backend/
docker tag bolt-abacus-api:latest <account-id>.dkr.ecr.ap-south-1.amazonaws.com/bolt-abacus-api:latest
docker push <account-id>.dkr.ecr.ap-south-1.amazonaws.com/bolt-abacus-api:latest
```

---

### B5 — Compute + load balancer

**Option 1 — EC2 + Docker Compose (Stage 0, cheapest, ~$15/mo):**

```bash
# Launch t4g.small (or t3.small for x86)
aws ec2 run-instances \
  --image-id ami-0c2af51e265bd5e0e \
  --instance-type t4g.small \
  --key-name <your-key-pair> \
  --security-group-ids <sg-id> \
  --subnet-id <subnet-id> \
  --associate-public-ip-address \
  --region ap-south-1

# SSH in, install Docker, copy docker-compose.prod.yml + .env.production
# Then: IMAGE_TAG=latest PLATFORM=compose ./deploy.sh
```

**Option 2 — ECS Fargate (Stage 1, $30–60/mo but autoscales):**

Create a Fargate task definition from the ECR image, one service with 2 desired tasks,
behind an ALB. See AWS docs for step-by-step. The app is stateless — no changes needed.

**Security group rules:**
- Inbound 443 from 0.0.0.0/0 (HTTPS via ALB)
- Inbound 8000 from ALB security group only
- Outbound 5432 to RDS security group
- Outbound 6379 to ElastiCache security group

---

### B6 — Frontend CDN

**Cloudflare Pages (free tier, recommended):**

```bash
# In Cloudflare dashboard:
# 1. New project → Connect to Git → select repo
# 2. Build command: cd frontend && npm run build
# 3. Build output directory: frontend/dist
# 4. Environment variable: VITE_API_BASE_URL = https://api.boltabacus.com
# 5. Custom domain: app.boltabacus.com
```

**Or S3 + CloudFront:**

```bash
aws s3 sync frontend/dist/ s3://bolt-abacus-frontend-prod/ --delete
# Create CloudFront distribution pointing at the bucket
# Add cache behavior: /assets/* → max-age=31536000; /* → no-cache
# Set origin to S3 bucket website endpoint
```

---

## Track C — Environment secrets (fill after B)

Complete `.env.production` values. Never commit this file.

```bash
DJANGO_SECRET_KEY=<generate: python -c "import secrets; print(secrets.token_hex(50))">
DJANGO_SETTINGS_MODULE=config.settings.production
DJANGO_ALLOWED_HOSTS=api.boltabacus.com

DATABASE_URL=postgres://bolt:<password>@<rds-endpoint>:5432/bolt_prod
REPLICA_DATABASE_URL=                              # leave blank until Wave 3

REDIS_URL=redis://:<auth-token>@<elasticache-endpoint>:6379/0
REDIS_MAX_CONNECTIONS=50

CORS_ALLOWED_ORIGINS=https://app.boltabacus.com
REFRESH_COOKIE_DOMAIN=.boltabacus.com             # leading dot covers api.* and app.*

JWT_ACCESS_TOKEN_LIFETIME_MINUTES=15
JWT_REFRESH_TOKEN_LIFETIME_DAYS=7
REFRESH_COOKIE_NAME=refresh_token

AWS_ACCESS_KEY_ID=<iam-key>
AWS_SECRET_ACCESS_KEY=<iam-secret>
AWS_STORAGE_BUCKET_NAME=bolt-abacus-media-prod
AWS_STATIC_BUCKET_NAME=bolt-abacus-static-prod
AWS_S3_REGION_NAME=ap-south-1

SENTRY_DSN=<from sentry.io project settings>

EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_HOST_USER=apikey
EMAIL_HOST_PASSWORD=<sendgrid-api-key>
DEFAULT_FROM_EMAIL=no-reply@boltabacus.com
```

---

## Track D — Deploy sequence (run in order)

After Track B is provisioned and Track C is filled:

```bash
# 1. Run migrations against RDS
cd backend
DATABASE_URL=<rds-url> python manage.py migrate --settings config.settings.production

# 2. Collect static files to S3
DATABASE_URL=<rds-url> \
AWS_ACCESS_KEY_ID=<key> \
AWS_SECRET_ACCESS_KEY=<secret> \
AWS_STORAGE_BUCKET_NAME=bolt-abacus-media-prod \
AWS_STATIC_BUCKET_NAME=bolt-abacus-static-prod \
AWS_S3_REGION_NAME=ap-south-1 \
python manage.py collectstatic --noinput --settings config.settings.production

# 3. Build + push Docker image (see B4)
# IMAGE_TAG=$(git rev-parse --short HEAD)

# 4. Build frontend + deploy to Cloudflare Pages / S3
cd ../frontend
VITE_API_BASE_URL=https://api.boltabacus.com npm run build
# Either push via Cloudflare Pages git integration, or:
aws s3 sync dist/ s3://bolt-abacus-frontend-prod/ --delete

# 5. Start backend containers (brings up web + worker + beat via docker compose up -d --wait)
cd ..
IMAGE_NAME=<account-id>.dkr.ecr.ap-south-1.amazonaws.com/bolt-abacus-api \
IMAGE_TAG=<tag> PLATFORM=compose ./backend/deploy.sh
# First run and every redeploy use the same command — `up -d --wait` blocks until the
# web healthcheck passes. For ECS: aws ecs update-service --force-new-deployment ...

# 6. Smoke test
curl https://api.boltabacus.com/api/v1/health/
# Expected: {"status": "ok", "db": "ok", "redis": "ok"}
```

---

## Track E — Nice-to-haves (post first deploy)

### E1 — Terraform IaC

No `terraform/` directory exists. After the first manual deploy, extract the RDS + ElastiCache + S3 + ECR + security group config into Terraform so the next environment can be reproduced in one command. Minimum useful modules: `rds`, `elasticache`, `s3`, `iam`, `sg`.

### E2 — Personal Best endpoint

`GET /me/personal-bests/` returns per-mode best score, accuracy, and time. Needed for the Personal Best chip in TrainingArenaPage. Implementation: aggregate `ProgressRecord` by `session__kind` per user, keyed by mode. Cache on `user_stats` Redis key (already invalidated on `finalize_session`).

### E3 — `npm run build` in CI

The current CI runs `vitest` and `lint` but does NOT run `npm run build`. A broken build would only be caught at deploy time. Add a build job to `.github/workflows/ci.yml`.

---

## Open questions (require product decision before building)

1. **Custom domain:** Is it `boltabacus.com`, `bolt-abacus.com`, or something else? All env vars and CORS above use `boltabacus.com` as a placeholder.
2. **Region:** `ap-south-1` (Mumbai) assumed. Confirm if the majority of users are India-based.
3. **Personal Best MVP:** Is E2 required at launch, or can the chip be hidden until post-launch?
4. **SameSite cookie:** If the CDN domain is on a different registerable domain from the API (e.g., Cloudflare Pages `*.pages.dev` vs. custom API domain), `SameSite=Lax` will break cross-site. Use a custom domain on both ends, or switch to `SameSite=None; Secure` in `production.py`. Custom domain on both is strongly preferred.
