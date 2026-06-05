# Bolt Abacus — Deploy Infrastructure Guide

> Covers: managed Postgres, managed Redis, two-instance load-balanced deploy,
> rolling restarts, and a reproducible `deploy.sh` path.
> Companion to `docs/cdn-deploy.md` (CDN split, cookie/CORS wiring).

---

## 1. Prerequisites

| Component | Minimum spec | Notes |
|---|---|---|
| Postgres | 16, 1 vCPU / 1 GB | RDS db.t4g.micro, Fly.io postgres, Render, or Supabase |
| Redis | 7, 0.5 GB | ElastiCache cache.t4g.micro, Fly.io redis, or Upstash |
| App instances | 2 × 1 vCPU / 512 MB | Gunicorn with `2×vCPU+1` workers each |
| Load balancer | Any L4/L7 | Fly.io anycast proxy, AWS ALB, Nginx, Cloudflare Tunnel |

---

## 2. Environment variables

Copy `.env.example` to `.env.production` and fill in every value.

```
# Required
DJANGO_SECRET_KEY=<generate with: python -c "import secrets; print(secrets.token_hex(50))">
DJANGO_SETTINGS_MODULE=config.settings.production
DJANGO_ALLOWED_HOSTS=api.bolt-abacus.example.com
DATABASE_URL=postgres://bolt:<password>@<host>:5432/bolt_prod
REDIS_URL=redis://:<password>@<host>:6379/0

# CDN split (see docs/cdn-deploy.md)
CORS_ALLOWED_ORIGINS=https://app.bolt-abacus.example.com
REFRESH_COOKIE_DOMAIN=.bolt-abacus.example.com
VITE_API_BASE_URL=https://api.bolt-abacus.example.com

# Optional — read replica (Wave 3, set when replica is provisioned)
REPLICA_DATABASE_URL=postgres://bolt_ro:<password>@<replica-host>:5432/bolt_prod

# Error monitoring
SENTRY_DSN=<your-dsn>

# Email (if using SendGrid or similar)
EMAIL_HOST_PASSWORD=<api-key>
```

---

## 3. Managed Postgres

### 3.1 Provision

Fly.io example (cheapest, no cold starts):
```bash
fly postgres create --name bolt-abacus-db --region sin --vm-size shared-cpu-1x
fly postgres attach --app bolt-abacus-api bolt-abacus-db
# DATABASE_URL is injected automatically as a secret
```

AWS RDS example:
```bash
aws rds create-db-instance \
  --db-instance-identifier bolt-abacus \
  --db-instance-class db.t4g.micro \
  --engine postgres \
  --engine-version 16.3 \
  --master-username bolt \
  --master-user-password <password> \
  --allocated-storage 20 \
  --backup-retention-period 7 \
  --no-publicly-accessible
```

### 3.2 Automated backups + PITR

- Fly.io: automated daily snapshots, 7-day retention enabled by default.
- AWS RDS: `--backup-retention-period 7` enables PITR. Test restore once before launch:
  ```bash
  aws rds restore-db-instance-to-point-in-time \
    --source-db-instance-identifier bolt-abacus \
    --target-db-instance-identifier bolt-abacus-restore-test \
    --restore-time 2026-06-01T12:00:00Z
  ```

### 3.3 First deploy

```bash
# Run migrations against managed DB before starting the app
DATABASE_URL=<managed-url> python manage.py migrate --settings config.settings.production
```

---

## 4. Managed Redis

Fly.io:
```bash
fly redis create --name bolt-abacus-redis --region sin --plan free-6m
# REDIS_URL injected as a secret
```

ElastiCache:
```bash
aws elasticache create-cache-cluster \
  --cache-cluster-id bolt-abacus-redis \
  --cache-node-type cache.t4g.micro \
  --engine redis \
  --engine-version 7.0 \
  --num-cache-nodes 1
```

Verify the three Redis consumers work after pointing to managed Redis:
- `cache.get/set` (user_stats + level_context)
- JWT denylist (`jwt:denylist:{jti}`)
- Celery broker (beat + worker queues)

---

## 5. Two-instance load-balanced deploy

### 5.1 Why two instances

Rolling deploys require at least two instances: while one instance restarts with the new
image, the other continues serving traffic with zero downtime.

### 5.2 Fly.io (recommended path)

```toml
# fly.toml
app = "bolt-abacus-api"
primary_region = "sin"

[build]
  dockerfile = "backend/docker/Dockerfile.prod"

[[services]]
  http_checks = []
  internal_port = 8000
  protocol = "tcp"

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

  [[services.tcp_checks]]
    interval = "10s"
    timeout = "2s"
    grace_period = "5s"
    restart_limit = 0

[deploy]
  strategy = "rolling"

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 512
  count = 2
```

Deploy:
```bash
fly deploy --strategy rolling
```

The `rolling` strategy restarts one instance at a time — live traffic continues
through the other instance during each restart.

### 5.3 Generic deploy.sh path

See `backend/deploy.sh` for the documented two-step deploy:
1. Pull new image, run migrations
2. Rolling restart (stop old instance, start new, health-check, repeat)

---

## 6. Health check endpoint

All load balancers should probe `GET /api/v1/health/`. It returns:
```json
{"status": "ok", "db": "ok", "redis": "ok"}
```
and a 200 status. 503 if either dependency is down. Add this to your LB config.

---

## 7. Read replica (Wave 3 trigger)

When the primary Postgres is under sustained read load (>80% CPU or >20ms read p95):

1. Provision a read replica:
   - Fly.io: `fly postgres attach --read-only`
   - RDS: "Create read replica" in console
2. Set `REPLICA_DATABASE_URL` in environment
3. The `PrimaryReplicaRouter` in `config/dbrouter.py` activates automatically when
   the env var is present (see settings/base.py)

Routes routed to replica: `courses.*`, `progress.*` (read-only)
Routes always on primary: `exercises.*`, `users.*`, `classroom.*`

---

## 8. Celery worker + beat

Start two processes alongside the web workers:

```bash
# Worker (handles async tasks)
celery -A config worker --loglevel=info --concurrency=2

# Beat scheduler (fires periodic tasks like abandon_stale_sessions)
celery -A config beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler
```

Or add as separate Fly.io processes:
```toml
[processes]
  web = "gunicorn config.wsgi:application --config gunicorn.conf.py"
  worker = "celery -A config worker --loglevel=info --concurrency=2"
  beat = "celery -A config beat --loglevel=info"
```
