# Claude Code Prompt — AWS Deploy Code Changes

Paste this entire prompt into Claude Code (or VS Code with Claude Code extension) from inside the `Bolt_v1` project root.

---

## Prompt (copy everything below this line)

---

Read `docs/aws-deploy-plan.md` in full before making any changes. The plan has 5 code tasks (Track A). Execute them in order. Do not touch anything in Track B, C, or D — those are human-run infra steps.

**Codebase root:** current working directory (Bolt_v1)

**Success criteria for this session:**
1. `backend/config/settings/production.py` uses the Django 4.2+ `STORAGES` dict for S3 — old commented stub is gone
2. `docker-compose.prod.yml` exists at project root, parses without error (`docker compose -f docker-compose.prod.yml config` with a stub env file)
3. `frontend/public/_headers` exists and appears in `frontend/dist/` after `npm run build`
4. `.env.example` documents `REPLICA_DATABASE_URL` and `AWS_STATIC_BUCKET_NAME`
5. All backend tests still pass: `cd backend && pytest --tb=short -q`
6. Frontend still builds clean: `cd frontend && npm run build` (TypeScript zero errors)

---

### Task A1 — Wire S3 in `backend/config/settings/production.py`

File to edit: `backend/config/settings/production.py`

Read the file first. Find the commented S3 stub block (lines starting with `# DEFAULT_FILE_STORAGE`, `# AWS_ACCESS_KEY_ID`, etc.). Replace that entire commented block with the following:

```python
# ─── S3 storage (static files + media) ───────────────────────────────────────
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

# STATIC_URL points at S3 when deployed; override via env if using CloudFront.
STATIC_URL = env(
    "STATIC_URL",
    default=(
        "https://"
        + env("AWS_STATIC_BUCKET_NAME", default=env("AWS_STORAGE_BUCKET_NAME"))
        + ".s3."
        + env("AWS_S3_REGION_NAME", default="ap-south-1")
        + ".amazonaws.com/static/"
    ),
)
```

Verify: `cd backend && python -c "from config.settings import production"` must not raise ImportError. Since AWS env vars are required (no defaults for key/secret), do a targeted import check:
```bash
cd backend && python -c "
import os
os.environ.setdefault('DJANGO_SECRET_KEY', 'test')
os.environ.setdefault('DATABASE_URL', 'postgres://x:x@localhost/x')
os.environ.setdefault('AWS_ACCESS_KEY_ID', 'test')
os.environ.setdefault('AWS_SECRET_ACCESS_KEY', 'test')
os.environ.setdefault('AWS_STORAGE_BUCKET_NAME', 'test-bucket')
from config.settings.production import STORAGES, STATIC_URL
print('STORAGES keys:', list(STORAGES.keys()))
print('STATIC_URL:', STATIC_URL)
"
```
Expected: prints both keys (`default`, `staticfiles`) and a non-empty STATIC_URL.

---

### Task A2 — Create `docker-compose.prod.yml`

Create a new file at the project root: `docker-compose.prod.yml`

Content — write exactly this (no extras, no development services):

```yaml
# Production Docker Compose — used by backend/deploy.sh PLATFORM=compose path.
# Postgres and Redis are NOT here; they are managed services (RDS + ElastiCache).
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

Verify: create a minimal stub `.env.production` in a temp location:
```bash
echo "DJANGO_SECRET_KEY=test
DATABASE_URL=postgres://x:x@localhost/x
REDIS_URL=redis://localhost:6379/0
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_STORAGE_BUCKET_NAME=test" > /tmp/stub.env.production

cp /tmp/stub.env.production .env.production.test
IMAGE_TAG=test docker compose -f docker-compose.prod.yml --env-file .env.production.test config > /dev/null && echo "PARSE OK"
rm .env.production.test
```
Expected: prints `PARSE OK`.

---

### Task A3 — Create `frontend/public/_headers`

Create new file: `frontend/public/_headers`

Content:
```
# Fingerprinted assets — Vite appends content hash, so cache forever
/assets/*
  Cache-Control: max-age=31536000, immutable

# index.html and everything else — always revalidate
/*
  Cache-Control: no-cache, no-store, must-revalidate
```

Verify: `cd frontend && npm run build` succeeds, then `ls dist/_headers` — file must exist in the build output.

---

### Task A4 — Update `.env.example`

File: `.env.example` (project root)

Find the line `AWS_S3_REGION_NAME=ap-south-1`. After that block add two new lines documenting the optional vars:

```bash
# Read replica (optional — activate in Wave 3 when RDS replica is provisioned)
REPLICA_DATABASE_URL=

# Separate S3 bucket for static files (defaults to AWS_STORAGE_BUCKET_NAME if not set)
AWS_STATIC_BUCKET_NAME=
```

Also find `VITE_API_BASE_URL=http://localhost:8000` and ensure it exists (it should — dev default). Do not change its value.

---

### Task A5 — Add `npm run build` job to CI

File: `.github/workflows/ci.yml`

The current CI has a `backend` job and a `frontend` job (lint + vitest). Read the file first.

Add a third job after the existing `frontend` job:

```yaml
  frontend-build:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: npm
          cache-dependency-path: frontend/package-lock.json
      - run: npm ci
      - run: npm run build
        env:
          VITE_API_BASE_URL: https://api.boltabacus.com
```

This catches TypeScript errors and broken imports at PR time, not at deploy time.

Verify: YAML parses — `python -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"` (install pyyaml if needed).

---

### Final verification

Run all of these and confirm green before finishing:

```bash
# Backend tests
cd backend && pytest --tb=short -q

# Frontend build (zero TS errors)
cd ../frontend && npm run build

# dist/_headers exists
ls dist/_headers

# docker-compose prod parses
cd .. && docker compose -f docker-compose.prod.yml config > /dev/null && echo "COMPOSE OK"
```

Report the test count and any failures. If all pass, state "All A-tasks complete. Track B (AWS provisioning) is a human step — see docs/aws-deploy-plan.md."

---

## What NOT to do

- Do not touch any file not listed above.
- Do not create a `terraform/` directory — that's Track E and out of scope.
- Do not modify `docker-compose.yml` (dev compose).
- Do not change any frontend feature code.
- Do not run `python manage.py migrate` — that requires a live database.
