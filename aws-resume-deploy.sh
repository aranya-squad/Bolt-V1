#!/usr/bin/env bash
# Bolt Abacus - resume deploy against ALREADY-PROVISIONED infra.
# Runs only the build -> push -> EC2 deploy tail of aws-deploy.sh, looking up
# existing RDS/Redis/EC2/ECR instead of creating them. Safe to re-run.
# Usage: AWS_PROFILE=bolt ./aws-resume-deploy.sh
set -euo pipefail
umask 077

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
SSH_KEY_FILE="${SSH_KEY_FILE:-$HOME/.ssh/${KEY_NAME}.pem}"
SSH_KNOWN_HOSTS_FILE="${SSH_KNOWN_HOSTS_FILE:-$HOME/.ssh/known_hosts}"
SSH_OPTS=(-i "$SSH_KEY_FILE" -o StrictHostKeyChecking=yes -o UserKnownHostsFile="$SSH_KNOWN_HOSTS_FILE" -o BatchMode=yes)
RELEASE_SHA="$(git -C "$HERE" rev-parse HEAD)"
IMAGE_TAG="$RELEASE_SHA"

[[ -f "$SSH_KEY_FILE" ]] || { echo "[ERROR] SSH key not found: $SSH_KEY_FILE"; exit 1; }
[[ -f "$SSH_KNOWN_HOSTS_FILE" ]] || { echo "[ERROR] known_hosts file not found: $SSH_KNOWN_HOSTS_FILE"; exit 1; }
command -v ssh-keygen >/dev/null || { echo "[ERROR] ssh-keygen not found"; exit 1; }
command -v git >/dev/null || { echo "[ERROR] git not found"; exit 1; }
command -v tar >/dev/null || { echo "[ERROR] tar not found"; exit 1; }

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
log "Release source: $RELEASE_SHA"

# Fail closed before any live metadata change, image build or registry push.
# The expected EC2 host key must already be enrolled through a trusted owner path.
ssh-keygen -F "$EC2_PUBLIC_IP" -f "$SSH_KNOWN_HOSTS_FILE" >/dev/null 2>&1 || {
  echo "[ERROR] No verified SSH host key for $EC2_PUBLIC_IP in $SSH_KNOWN_HOSTS_FILE"
  echo "        Enroll and independently verify the host fingerprint before resuming a production release."
  exit 1
}
log "Preflighting verified SSH and existing Django secret..."
SECRET_KEY=$(ssh "${SSH_OPTS[@]}" "ec2-user@${EC2_PUBLIC_IP}" \
  'set -euo pipefail; ENV=/home/ec2-user/.env.production; [ -f "$ENV" ] && [ -r "$ENV" ] && [ ! -L "$ENV" ]; line=$(grep -m1 "^DJANGO_SECRET_KEY=" "$ENV"); key=${line#DJANGO_SECRET_KEY=}; [ -n "$key" ]; printf "%s" "$key"')
[[ -n "$SECRET_KEY" ]] || { echo "[ERROR] Existing DJANGO_SECRET_KEY is empty"; exit 1; }

# Containers reach the instance IAM role (for S3 collectstatic) only with hop limit >= 2
log "Setting IMDS hop limit to 2 (containers need the instance role for S3)..."
aws ec2 modify-instance-metadata-options --region "$REGION" \
  --instance-id "$INSTANCE_ID" --http-put-response-hop-limit 2 --http-endpoint enabled >/dev/null

# ─── Build & push image (arm64, native on this Mac) ──────────────────────────
log "Authenticating Docker to ECR..."
aws ecr get-login-password --region "$REGION" | \
  docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

log "Building Docker image from tracked Git release ${RELEASE_SHA}..."
BUILD_CONTEXT="$(mktemp -d)"
cleanup_build_context() { rm -rf "$BUILD_CONTEXT"; }
trap cleanup_build_context EXIT
git -C "$HERE" archive "${RELEASE_SHA}:backend" | tar -x -C "$BUILD_CONTEXT"
docker build -f "$BUILD_CONTEXT/docker/Dockerfile.prod" -t "${APP}-api:${IMAGE_TAG}" "$BUILD_CONTEXT"
docker tag "${APP}-api:${IMAGE_TAG}" "${ECR_URI}:${IMAGE_TAG}"
log "Pushing release-tagged image to ECR..."
docker push "${ECR_URI}:${IMAGE_TAG}"
IMAGE_DIGEST=$(aws ecr describe-images --region "$REGION" \
  --repository-name "${APP}-api" --image-ids imageTag="$IMAGE_TAG" \
  --query 'imageDetails[0].imageDigest' --output text)
[[ "$IMAGE_DIGEST" == sha256:* ]] || { echo "[ERROR] Could not resolve pushed ECR digest"; exit 1; }
IMAGE_REF="${ECR_URI}@${IMAGE_DIGEST}"
log "Immutable release image: $IMAGE_REF"
cleanup_build_context
trap - EXIT

# ─── Generate .env.production ────────────────────────────────────────────────
# SECRET_KEY was fetched during the fail-closed preflight above. A resumed release
# never synthesizes a replacement key when SSH/read/parse verification fails.
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

IMAGE_REF=${IMAGE_REF}
IMAGE_NAME=${ECR_URI}
IMAGE_TAG=${IMAGE_TAG}
EOF
chmod 600 "$HERE/backend/.env.production"

# ─── Deploy to EC2 ───────────────────────────────────────────────────────────
log "Copying env + compose file + Caddyfile to EC2..."
REMOTE_ENV_TMP="/home/ec2-user/.env.production.upload.$$"
scp "${SSH_OPTS[@]}" backend/.env.production "ec2-user@${EC2_PUBLIC_IP}:${REMOTE_ENV_TMP}"
scp "${SSH_OPTS[@]}" docker-compose.prod.yml Caddyfile "ec2-user@${EC2_PUBLIC_IP}:/home/ec2-user/"
ssh "${SSH_OPTS[@]}" "ec2-user@${EC2_PUBLIC_IP}" \
  "set -euo pipefail; target=/home/ec2-user/.env.production; tmp='${REMOTE_ENV_TMP}'; [ ! -L \"\$target\" ]; install -m 600 \"\$tmp\" \"\$target\"; rm -f \"\$tmp\""

log "Running remote deploy (swap check, pull, migrate, collectstatic, compose up)..."
ssh "${SSH_OPTS[@]}" ec2-user@${EC2_PUBLIC_IP} bash <<REMOTE
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
docker pull ${IMAGE_REF}
docker run --rm --env-file /home/ec2-user/.env.production \
  -e DJANGO_SETTINGS_MODULE=config.settings.production \
  ${IMAGE_REF} python manage.py migrate --settings config.settings.production
docker run --rm --env-file /home/ec2-user/.env.production \
  -e DJANGO_SETTINGS_MODULE=config.settings.production \
  ${IMAGE_REF} python manage.py collectstatic --noinput --settings config.settings.production
# --env-file makes Compose resolve the same immutable IMAGE_REF for web/worker/beat
docker compose --env-file /home/ec2-user/.env.production \
  -f /home/ec2-user/docker-compose.prod.yml up -d --wait
REMOTE

# ─── Health check + summary ──────────────────────────────────────────────────
# Port 8000 is closed externally (G4). Health check goes through Caddy on 443.
log "Health check..."
sleep 5
if ! HTTP_STATUS=$(curl -sS --max-time 15 -o /dev/null -w "%{http_code}" "https://api.boltabacus.com/api/v1/health/"); then
  HTTP_STATUS="000"
fi
if [[ "$HTTP_STATUS" != "200" ]]; then
  echo "[ERROR] Deployment health check failed: HTTP $HTTP_STATUS" >&2
  exit 1
fi

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
echo "  Image digest   : ${IMAGE_DIGEST}"
echo "================================================"
