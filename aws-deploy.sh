#!/usr/bin/env bash
# Bolt Abacus — AWS infrastructure bootstrap + first deploy
# Run this ONCE from your Mac terminal after `aws configure` is set up.
# Region: ap-south-1 | Account: 504132672502
#
# Usage:
#   chmod +x aws-deploy.sh
#   ./aws-deploy.sh
#
# Prerequisites:
#   brew install awscli docker
#   aws configure   (enter your IAM access key + secret + region ap-south-1)
set -euo pipefail

REGION="ap-south-1"
ACCOUNT_ID="504132672502"
APP="bolt-abacus"
DB_PASSWORD=""   # will prompt

log() { echo "[$(date '+%H:%M:%S')] $*"; }
err() { echo "[ERROR] $*" >&2; exit 1; }

# ─── 0. Preflight ────────────────────────────────────────────────────────────
command -v aws  >/dev/null || err "aws CLI not found. Run: brew install awscli"
command -v docker >/dev/null || err "docker not found. Run: brew install docker"

aws sts get-caller-identity --region "$REGION" >/dev/null || err "AWS credentials not configured. Run: aws configure"

read -s -p "Choose a DB password for RDS (min 8 chars): " DB_PASSWORD; echo
[[ ${#DB_PASSWORD} -ge 8 ]] || err "Password too short"

# ─── 1. Get default VPC ──────────────────────────────────────────────────────
log "Getting default VPC..."
VPC_ID=$(aws ec2 describe-vpcs \
  --region "$REGION" \
  --filters Name=isDefault,Values=true \
  --query 'Vpcs[0].VpcId' --output text)
log "VPC: $VPC_ID"

# Default subnets
SUBNET_IDS=$(aws ec2 describe-subnets \
  --region "$REGION" \
  --filters "Name=vpc-id,Values=$VPC_ID" \
  --query 'Subnets[*].SubnetId' --output text | tr '\t' ',')
SUBNET_1=$(echo "$SUBNET_IDS" | cut -d',' -f1)
SUBNET_2=$(echo "$SUBNET_IDS" | cut -d',' -f2)
log "Subnets: $SUBNET_1, $SUBNET_2"

# ─── 2. Security Groups ───────────────────────────────────────────────────────
log "Creating security groups..."

EC2_SG=$(aws ec2 create-security-group \
  --region "$REGION" \
  --group-name "${APP}-ec2-sg" \
  --description "Bolt Abacus EC2 - app traffic" \
  --vpc-id "$VPC_ID" \
  --query 'GroupId' --output text)
log "EC2 SG: $EC2_SG"

# Port 8000 open to world (put behind ALB/Cloudfront later)
aws ec2 authorize-security-group-ingress --region "$REGION" \
  --group-id "$EC2_SG" \
  --protocol tcp --port 8000 --cidr 0.0.0.0/0

# SSH from anywhere (tighten to your IP later)
aws ec2 authorize-security-group-ingress --region "$REGION" \
  --group-id "$EC2_SG" \
  --protocol tcp --port 22 --cidr 0.0.0.0/0

RDS_SG=$(aws ec2 create-security-group \
  --region "$REGION" \
  --group-name "${APP}-rds-sg" \
  --description "Bolt Abacus RDS - Postgres" \
  --vpc-id "$VPC_ID" \
  --query 'GroupId' --output text)
log "RDS SG: $RDS_SG"

aws ec2 authorize-security-group-ingress --region "$REGION" \
  --group-id "$RDS_SG" \
  --protocol tcp --port 5432 \
  --source-group "$EC2_SG"

REDIS_SG=$(aws ec2 create-security-group \
  --region "$REGION" \
  --group-name "${APP}-redis-sg" \
  --description "Bolt Abacus ElastiCache - Redis" \
  --vpc-id "$VPC_ID" \
  --query 'GroupId' --output text)
log "Redis SG: $REDIS_SG"

aws ec2 authorize-security-group-ingress --region "$REGION" \
  --group-id "$REDIS_SG" \
  --protocol tcp --port 6379 \
  --source-group "$EC2_SG"

# ─── 3. S3 Buckets ───────────────────────────────────────────────────────────
log "Creating S3 buckets..."

aws s3api create-bucket \
  --region "$REGION" \
  --bucket "${APP}-static-prod" \
  --create-bucket-configuration LocationConstraint="$REGION"

# Disable block-public-access FIRST (must precede the public policy, else it is rejected)
aws s3api put-public-access-block \
  --bucket "${APP}-static-prod" \
  --public-access-block-configuration \
  "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

# Public read policy for static files
aws s3api put-bucket-policy \
  --bucket "${APP}-static-prod" \
  --policy '{
    "Version":"2012-10-17",
    "Statement":[{
      "Sid":"PublicReadStatic",
      "Effect":"Allow",
      "Principal":"*",
      "Action":"s3:GetObject",
      "Resource":"arn:aws:s3:::'"${APP}-static-prod"'/*"
    }]
  }'

aws s3api create-bucket \
  --region "$REGION" \
  --bucket "${APP}-media-prod" \
  --create-bucket-configuration LocationConstraint="$REGION"

log "S3 buckets created: ${APP}-static-prod, ${APP}-media-prod"

# ─── 4. IAM Role for EC2 ─────────────────────────────────────────────────────
log "Creating IAM role..."

aws iam create-role \
  --role-name "${APP}-ec2-role" \
  --assume-role-policy-document '{
    "Version":"2012-10-17",
    "Statement":[{
      "Effect":"Allow",
      "Principal":{"Service":"ec2.amazonaws.com"},
      "Action":"sts:AssumeRole"
    }]
  }' >/dev/null

# Inline S3 policy scoped to our two buckets
aws iam put-role-policy \
  --role-name "${APP}-ec2-role" \
  --policy-name "${APP}-s3-access" \
  --policy-document '{
    "Version":"2012-10-17",
    "Statement":[{
      "Effect":"Allow",
      "Action":["s3:GetObject","s3:PutObject","s3:DeleteObject","s3:ListBucket"],
      "Resource":[
        "arn:aws:s3:::'"${APP}-static-prod"'",
        "arn:aws:s3:::'"${APP}-static-prod"'/*",
        "arn:aws:s3:::'"${APP}-media-prod"'",
        "arn:aws:s3:::'"${APP}-media-prod"'/*"
      ]
    }]
  }'

# ECR read-only for pulling images
aws iam attach-role-policy \
  --role-name "${APP}-ec2-role" \
  --policy-arn "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"

# Instance profile
aws iam create-instance-profile \
  --instance-profile-name "${APP}-ec2-profile" >/dev/null
aws iam add-role-to-instance-profile \
  --instance-profile-name "${APP}-ec2-profile" \
  --role-name "${APP}-ec2-role"

log "IAM role + instance profile created"

# ─── 5. ECR Repository ───────────────────────────────────────────────────────
log "Creating ECR repository..."
ECR_URI=$(aws ecr create-repository \
  --region "$REGION" \
  --repository-name "${APP}-api" \
  --query 'repository.repositoryUri' --output text)
log "ECR: $ECR_URI"

# ─── 6. RDS PostgreSQL db.t3.micro ───────────────────────────────────────────
log "Creating RDS subnet group..."
aws rds create-db-subnet-group \
  --db-subnet-group-name "${APP}-db-subnet" \
  --db-subnet-group-description "Bolt Abacus RDS subnets" \
  --subnet-ids "$SUBNET_1" "$SUBNET_2" >/dev/null

log "Creating RDS instance (db.t3.micro)... this takes ~5 min"
aws rds create-db-instance \
  --region "$REGION" \
  --db-instance-identifier "${APP}-db" \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version "16.9" \
  --master-username bolt \
  --master-user-password "$DB_PASSWORD" \
  --db-name bolt_prod \
  --allocated-storage 20 \
  --storage-type gp2 \
  --no-multi-az \
  --no-publicly-accessible \
  --db-subnet-group-name "${APP}-db-subnet" \
  --vpc-security-group-ids "$RDS_SG" \
  --backup-retention-period 7 \
  --no-deletion-protection >/dev/null
log "RDS creation started (will be ready in ~5 min)"

# ─── 7. ElastiCache Redis cache.t3.micro ─────────────────────────────────────
log "Creating ElastiCache subnet group..."
aws elasticache create-cache-subnet-group \
  --cache-subnet-group-name "${APP}-redis-subnet" \
  --cache-subnet-group-description "Bolt Abacus Redis subnets" \
  --subnet-ids "$SUBNET_1" "$SUBNET_2" >/dev/null

log "Creating ElastiCache Redis (cache.t3.micro)..."
aws elasticache create-cache-cluster \
  --region "$REGION" \
  --cache-cluster-id "${APP}-redis" \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --engine-version "7.1" \
  --num-cache-nodes 1 \
  --cache-subnet-group-name "${APP}-redis-subnet" \
  --security-group-ids "$REDIS_SG" >/dev/null
log "Redis creation started"

# ─── 8. EC2 t3.micro ─────────────────────────────────────────────────────────
log "Getting latest Amazon Linux 2023 AMI..."
AMI_ID=$(aws ec2 describe-images \
  --region "$REGION" \
  --owners amazon \
  --filters \
    "Name=name,Values=al2023-ami-2023*-arm64" \
    "Name=state,Values=available" \
  --query 'sort_by(Images,&CreationDate)[-1].ImageId' \
  --output text)
log "AMI: $AMI_ID"

# Wait for instance profile to propagate (IAM eventual consistency)
log "Waiting 15s for IAM instance profile to propagate..."
sleep 15

KEY_NAME="${APP}-key"
mkdir -p ~/.ssh
aws ec2 create-key-pair --region "$REGION" \
  --key-name "$KEY_NAME" \
  --query 'KeyMaterial' --output text > ~/.ssh/${KEY_NAME}.pem
chmod 400 ~/.ssh/${KEY_NAME}.pem
log "Key pair saved to ~/.ssh/${KEY_NAME}.pem"

log "Launching EC2 t4g.micro (arm64)..."
INSTANCE_ID=$(aws ec2 run-instances \
  --region "$REGION" \
  --image-id "$AMI_ID" \
  --instance-type t4g.micro \
  --key-name "$KEY_NAME" \
  --iam-instance-profile Name="${APP}-ec2-profile" \
  --security-group-ids "$EC2_SG" \
  --subnet-id "$SUBNET_1" \
  --block-device-mappings '[{"DeviceName":"/dev/xvda","Ebs":{"VolumeSize":20,"VolumeType":"gp3","DeleteOnTermination":true}}]' \
  --user-data '#!/bin/bash
set -e
dnf update -y
dnf install -y docker git
systemctl enable --now docker
usermod -aG docker ec2-user
# Docker Compose v2 plugin
mkdir -p /usr/local/lib/docker/cli-plugins
curl -SL https://github.com/docker/compose/releases/download/v2.27.0/docker-compose-linux-aarch64 \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
# AWS CLI v2 (for ECR auth)
dnf install -y aws-cli
echo "Bootstrap complete" > /tmp/bootstrap-done
' \
  --tag-specifications \
    "ResourceType=instance,Tags=[{Key=Name,Value=${APP}-api}]" \
  --query 'Instances[0].InstanceId' --output text)

log "EC2 instance: $INSTANCE_ID"

aws ec2 create-tags --region "$REGION" \
  --resources "$INSTANCE_ID" \
  --tags Key=Name,Value="${APP}-api"

# ─── 9. Wait and collect endpoints ───────────────────────────────────────────
log "Waiting for EC2 to be running..."
aws ec2 wait instance-running --region "$REGION" --instance-ids "$INSTANCE_ID"

EC2_PUBLIC_IP=$(aws ec2 describe-instances \
  --region "$REGION" --instance-ids "$INSTANCE_ID" \
  --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)

# Containers add a network hop, so IMDSv2's default hop limit of 1 blocks them from
# the instance role (needed for ECR pull + S3 collectstatic). Raise it to 2.
log "Setting IMDS hop limit to 2 (required for Docker containers to reach instance role)..."
aws ec2 modify-instance-metadata-options \
  --region "$REGION" \
  --instance-id "$INSTANCE_ID" \
  --http-put-response-hop-limit 2 \
  --http-endpoint enabled >/dev/null

log "Waiting for RDS to be available (up to 10 min)..."
aws rds wait db-instance-available \
  --region "$REGION" \
  --db-instance-identifier "${APP}-db"

RDS_ENDPOINT=$(aws rds describe-db-instances \
  --region "$REGION" \
  --db-instance-identifier "${APP}-db" \
  --query 'DBInstances[0].Endpoint.Address' --output text)

log "Waiting for Redis to be available..."
aws elasticache wait cache-cluster-available \
  --region "$REGION" \
  --cache-cluster-id "${APP}-redis"

REDIS_ENDPOINT=$(aws elasticache describe-cache-clusters \
  --region "$REGION" \
  --cache-cluster-id "${APP}-redis" \
  --show-cache-node-info \
  --query 'CacheClusters[0].CacheNodes[0].Endpoint.Address' --output text)

# ─── 10. Build & push Docker image ───────────────────────────────────────────
log "Authenticating Docker to ECR..."
aws ecr get-login-password --region "$REGION" | \
  docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

log "Building Docker image..."
cd "$(dirname "$0")/backend"
docker build -f docker/Dockerfile.prod -t "${APP}-api:latest" .
docker tag "${APP}-api:latest" "${ECR_URI}:latest"

log "Pushing to ECR..."
docker push "${ECR_URI}:latest"
cd ..

# ─── 11. Generate .env.production ────────────────────────────────────────────
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(50))")
ENV_FILE="$(dirname "$0")/backend/.env.production"

log "Writing .env.production..."
cat > "$ENV_FILE" <<EOF
DJANGO_SECRET_KEY=${SECRET_KEY}
DJANGO_SETTINGS_MODULE=config.settings.production
DJANGO_ALLOWED_HOSTS=${EC2_PUBLIC_IP}

DATABASE_URL=postgres://bolt:${DB_PASSWORD}@${RDS_ENDPOINT}:5432/bolt_prod
REPLICA_DATABASE_URL=

REDIS_URL=redis://${REDIS_ENDPOINT}:6379/0
REDIS_MAX_CONNECTIONS=50

CORS_ALLOWED_ORIGINS=http://${EC2_PUBLIC_IP}:8000
REFRESH_COOKIE_DOMAIN=
REFRESH_COOKIE_NAME=refresh_token

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

log ".env.production written to backend/.env.production"
log "NOTE: Do NOT commit this file — it contains your secret key + DB password."

# ─── 12. Deploy to EC2 ───────────────────────────────────────────────────────
log "Copying files to EC2 and deploying..."

# Wait a bit for userdata bootstrap to finish
log "Waiting 90s for EC2 bootstrap (Docker install)..."
sleep 90

# Copy env file and compose file to EC2
scp -i ~/.ssh/${KEY_NAME}.pem -o StrictHostKeyChecking=no \
  backend/.env.production \
  docker-compose.prod.yml \
  ec2-user@${EC2_PUBLIC_IP}:/home/ec2-user/

# Authenticate ECR on the EC2 instance and deploy
ssh -i ~/.ssh/${KEY_NAME}.pem -o StrictHostKeyChecking=no ec2-user@${EC2_PUBLIC_IP} bash <<REMOTE
set -e
# ECR login
aws ecr get-login-password --region ${REGION} | \
  docker login --username AWS --password-stdin ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com

# Pull image
docker pull ${ECR_URI}:latest

# Run migrations
docker run --rm --env-file /home/ec2-user/.env.production \
  -e DJANGO_SETTINGS_MODULE=config.settings.production \
  ${ECR_URI}:latest \
  python manage.py migrate --settings config.settings.production

# Collect static to S3
docker run --rm --env-file /home/ec2-user/.env.production \
  -e DJANGO_SETTINGS_MODULE=config.settings.production \
  ${ECR_URI}:latest \
  python manage.py collectstatic --noinput --settings config.settings.production

# Start services
docker compose -f /home/ec2-user/docker-compose.prod.yml \
  --env-file /home/ec2-user/.env.production \
  up -d --wait
REMOTE

# ─── 13. Health check ────────────────────────────────────────────────────────
log "Health check..."
sleep 5
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://${EC2_PUBLIC_IP}:8000/api/v1/health/" || echo "000")

echo ""
echo "================================================"
echo "  Bolt Abacus — Deploy Summary"
echo "================================================"
echo "  EC2 public IP  : ${EC2_PUBLIC_IP}"
echo "  API base URL   : http://${EC2_PUBLIC_IP}:8000"
echo "  Health check   : http://${EC2_PUBLIC_IP}:8000/api/v1/health/ → HTTP ${HTTP_STATUS}"
echo "  RDS endpoint   : ${RDS_ENDPOINT}:5432"
echo "  Redis endpoint : ${REDIS_ENDPOINT}:6379"
echo "  ECR repo       : ${ECR_URI}"
echo "  Static bucket  : ${APP}-static-prod"
echo "  Media bucket   : ${APP}-media-prod"
echo "================================================"
echo "  Next steps:"
echo "  1. Point a domain at ${EC2_PUBLIC_IP} and add it to DJANGO_ALLOWED_HOSTS"
echo "  2. Update CORS_ALLOWED_ORIGINS with your frontend URL"
echo "  3. Add SENTRY_DSN and email credentials to backend/.env.production"
echo "  4. Re-run: PLATFORM=compose IMAGE_NAME=${ECR_URI} ./backend/deploy.sh"
echo "================================================"
