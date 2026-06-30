#!/usr/bin/env bash
# Bolt Abacus - resume deploy against ALREADY-PROVISIONED infra.
# Runs only the build -> push -> EC2 deploy tail of aws-deploy.sh, looking up
# existing RDS/Redis/EC2/ECR instead of creating them. Safe to re-run.
# Usage: AWS_PROFILE=bolt ./aws-resume-deploy.sh
set -euo pipefail

REGION="ap-south-1"
ACCOUNT_ID="504132672502"
APP="bolt-abacus"
KEY_NAME="${APP}-key"
ECR_URI="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${APP}-api"
if [[ -z "${DB_PASSWORD:-}" ]]; then
  read -s -p "DB password (same one used during initial deploy): " DB_PASSWORD; echo
fi
[[ ${#DB_PASSWORD} -ge 8 ]] || { echo "[ERROR] Password too short"; exit 1; }

log() { echo "[$(date '+%H:%M:%S')] $*"; }
HERE="$(cd "$(dirname "$0")" && pwd)"

# ─── Look up existing infrastructure ─────────────────────────────────────────
log "Looking up EC2 instance..."
INSTANCE_ID=$(aws ec2 describe-instances --region "$REGION" \
  --filters "Name=tag:Name,Values=${APP}-api" "Name=instance-state-name,Values=running" \
  --query 'Reservations[0].Instances[0].InstanceId' --output text)
[ "$INSTANCE_ID" != "None" ] || { echo "No running EC2 instance found"; exit 1; }
EC2_PUBLIC_IP=$(aws ec2 describe-instances --region "$REGION" --instance-ids "$INSTANCE_ID" \
  --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)
RDS_ENDPOINT=$(aws rds describe-db-instances --region "$REGION" \
  --db-instance-identifier "${APP}-db" --query 'DBInstances[0].Endpoint.Address' --output text)
REDIS_ENDPOINT=$(aws elasticache describe-cache-clusters --region "$REGION" \
  --cache-cluster-id "${APP}-redis" --show-cache-node-info \
  --query 'CacheClusters[0].CacheNodes[0].Endpoint.Address' --output text)
log "EC2 $INSTANCE_ID @ $EC2_PUBLIC_IP | RDS $RDS_ENDPOINT | Redis $REDIS_ENDPOINT"

# Containers reach the instance IAM role (for S3 collectstatic) only with hop limit >= 2
log "Setting IMDS hop limit to 2 (containers need the instance role for S3)..."
aws ec2 modify-instance-metadata-options --region "$REGION" \
  --instance-id "$INSTANCE_ID" --http-put-response-hop-limit 2 --http-endpoint enabled >/dev/null

# ─── Build & push image (arm64, native on this Mac) ──────────────────────────
log "Authenticating Docker to ECR..."
aws ecr get-login-password --region "$REGION" | \
  docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

log "Building Docker image..."
cd "$HERE/backend"
docker build -f docker/Dockerfile.prod -t "${APP}-api:latest" .
docker tag "${APP}-api:latest" "${ECR_URI}:latest"
log "Pushing to ECR..."
docker push "${ECR_URI}:latest"
cd "$HERE"

# ─── Generate .env.production ────────────────────────────────────────────────
# Preserve existing secret key across deploys — regenerating it logs out all users.
# Read from the live .env.production on EC2; fall back to generating only if absent.
SECRET_KEY=$(ssh -i ~/.ssh/${KEY_NAME}.pem -o StrictHostKeyChecking=no \
  ec2-user@${EC2_PUBLIC_IP} \
  "grep '^DJANGO_SECRET_KEY=' /home/ec2-user/.env.production | cut -d= -f2-" 2>/dev/null || true)
if [[ -z "$SECRET_KEY" ]]; then
  SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(50))")
  log "No existing secret key found — generated a new one."
fi
log "Writing backend/.env.production..."
cat > "$HERE/backend/.env.production" <<EOF
DJANGO_SECRET_KEY=${SECRET_KEY}
DJANGO_SETTINGS_MODULE=config.settings.production
DJANGO_ALLOWED_HOSTS=${EC2_PUBLIC_IP},localhost,127.0.0.1,api.boltabacus.com

SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
# TODO(debt): ramp to 31536000 (1yr) after confirming no HTTP-only subdomains (≥ 2026-07-05)
SECURE_HSTS_SECONDS=300

DATABASE_URL=postgres://bolt:${DB_PASSWORD}@${RDS_ENDPOINT}:5432/bolt_prod
REPLICA_DATABASE_URL=

REDIS_URL=redis://${REDIS_ENDPOINT}:6379/0
REDIS_MAX_CONNECTIONS=50

CORS_ALLOWED_ORIGINS=https://boltabacus.com,https://www.boltabacus.com,https://bolt-v1-5flv.vercel.app
REFRESH_COOKIE_DOMAIN=
REFRESH_COOKIE_NAME=refresh_token

API_DOMAIN=api.boltabacus.com
ACME_EMAIL=aranya.squad@gmail.com

JWT_ACCESS_TOKEN_LIFETIME_MINUTES=15
JWT_REFRESH_TOKEN_LIFETIME_DAYS=7

AWS_STORAGE_BUCKET_NAME=${APP}-media-prod
AWS_STATIC_BUCKET_NAME=${APP}-static-prod
AWS_S3_REGION_NAME=${REGION}
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

SENTRY_DSN=

EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
DEFAULT_FROM_EMAIL=no-reply@boltabacus.com
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_HOST_USER=apikey
EMAIL_HOST_PASSWORD=

IMAGE_NAME=${ECR_URI}
IMAGE_TAG=latest
EOF

# ─── Deploy to EC2 ───────────────────────────────────────────────────────────
log "Copying env + compose file + Caddyfile to EC2..."
scp -i ~/.ssh/${KEY_NAME}.pem -o StrictHostKeyChecking=no \
  backend/.env.production docker-compose.prod.yml Caddyfile \
  ec2-user@${EC2_PUBLIC_IP}:/home/ec2-user/

log "Running remote deploy (swap check, pull, migrate, collectstatic, compose up)..."
ssh -i ~/.ssh/${KEY_NAME}.pem -o StrictHostKeyChecking=no ec2-user@${EC2_PUBLIC_IP} bash <<REMOTE
set -e

# Ensure swap exists — ephemeral containers during deploy exhaust 910 MB RAM on t-class.
# ponytail: 1 GB swapfile; upgrade path is moving to a larger instance type.
if ! swapon --show | grep -q swap; then
  if [ ! -f /swapfile ]; then
    fallocate -l 1G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
  fi
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab > /dev/null
fi

aws ecr get-login-password --region ${REGION} | \
  docker login --username AWS --password-stdin ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com
docker pull ${ECR_URI}:latest
docker run --rm --env-file /home/ec2-user/.env.production \
  -e DJANGO_SETTINGS_MODULE=config.settings.production \
  ${ECR_URI}:latest python manage.py migrate --settings config.settings.production
docker run --rm --env-file /home/ec2-user/.env.production \
  -e DJANGO_SETTINGS_MODULE=config.settings.production \
  ${ECR_URI}:latest python manage.py collectstatic --noinput --settings config.settings.production
# --env-file makes Compose resolve \${IMAGE_NAME}/\${IMAGE_TAG} for image interpolation
docker compose --env-file /home/ec2-user/.env.production \
  -f /home/ec2-user/docker-compose.prod.yml up -d --wait
REMOTE

# ─── Health check + summary ──────────────────────────────────────────────────
# Port 8000 is closed externally (G4). Health check goes through Caddy on 443.
log "Health check..."
sleep 5
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://api.boltabacus.com/api/v1/health/" || echo "000")

echo ""
echo "================================================"
echo "  Bolt Abacus - Deploy Summary"
echo "================================================"
echo "  EC2 public IP  : ${EC2_PUBLIC_IP}"
echo "  API base URL   : https://api.boltabacus.com"
echo "  Health check   : https://api.boltabacus.com/api/v1/health/ -> HTTP ${HTTP_STATUS}"
echo "  RDS endpoint   : ${RDS_ENDPOINT}:5432"
echo "  Redis endpoint : ${REDIS_ENDPOINT}:6379"
echo "  ECR repo       : ${ECR_URI}"
echo "================================================"
