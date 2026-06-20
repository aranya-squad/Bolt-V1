#!/usr/bin/env bash
# Bolt Abacus - tear down ALL infrastructure created by aws-deploy.sh.
# Safe to run repeatedly: every step tolerates a missing resource.
# Usage: AWS_PROFILE=bolt ./aws-teardown.sh
set -uo pipefail

REGION="ap-south-1"
APP="bolt-abacus"
KEY_NAME="${APP}-key"

log() { echo "[$(date '+%H:%M:%S')] $*"; }
try() { "$@" 2>/dev/null && echo "  ok" || echo "  skip (absent or in use)"; }

# 1. EC2 instances tagged for the app
log "Terminating EC2 instances..."
IDS=$(aws ec2 describe-instances --region "$REGION" \
  --filters "Name=tag:Name,Values=${APP}-api" "Name=instance-state-name,Values=pending,running,stopping,stopped" \
  --query 'Reservations[].Instances[].InstanceId' --output text)
if [ -n "$IDS" ]; then
  try aws ec2 terminate-instances --region "$REGION" --instance-ids $IDS
  log "Waiting for instances to terminate..."
  aws ec2 wait instance-terminated --region "$REGION" --instance-ids $IDS 2>/dev/null || true
fi

# 2. RDS instance + subnet group
log "Deleting RDS instance..."
try aws rds delete-db-instance --region "$REGION" \
  --db-instance-identifier "${APP}-db" --skip-final-snapshot --delete-automated-backups
aws rds wait db-instance-deleted --region "$REGION" --db-instance-identifier "${APP}-db" 2>/dev/null || true
log "Deleting RDS subnet group..."
try aws rds delete-db-subnet-group --region "$REGION" --db-subnet-group-name "${APP}-db-subnet"

# 3. ElastiCache cluster + subnet group
log "Deleting ElastiCache cluster..."
try aws elasticache delete-cache-cluster --region "$REGION" --cache-cluster-id "${APP}-redis"
aws elasticache wait cache-cluster-deleted --region "$REGION" --cache-cluster-id "${APP}-redis" 2>/dev/null || true
log "Deleting ElastiCache subnet group..."
try aws elasticache delete-cache-subnet-group --region "$REGION" --cache-subnet-group-name "${APP}-redis-subnet"

# 4. ECR repository (force removes images)
log "Deleting ECR repository..."
try aws ecr delete-repository --region "$REGION" --repository-name "${APP}-api" --force

# 5. IAM instance profile + role
log "Deleting IAM instance profile + role..."
try aws iam remove-role-from-instance-profile --instance-profile-name "${APP}-ec2-profile" --role-name "${APP}-ec2-role"
try aws iam delete-instance-profile --instance-profile-name "${APP}-ec2-profile"
try aws iam delete-role-policy --role-name "${APP}-ec2-role" --policy-name "${APP}-s3-access"
try aws iam detach-role-policy --role-name "${APP}-ec2-role" --policy-arn "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
try aws iam delete-role --role-name "${APP}-ec2-role"

# 6. S3 buckets (must be emptied first)
for B in "${APP}-static-prod" "${APP}-media-prod"; do
  log "Emptying + deleting bucket $B..."
  aws s3 rm "s3://$B" --recursive 2>/dev/null || true
  try aws s3api delete-bucket --region "$REGION" --bucket "$B"
done

# 7. Security groups (redis + rds reference ec2, so delete them first)
log "Deleting security groups..."
for NAME in "${APP}-redis-sg" "${APP}-rds-sg" "${APP}-ec2-sg"; do
  SG=$(aws ec2 describe-security-groups --region "$REGION" \
    --filters "Name=group-name,Values=$NAME" --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null)
  if [ "$SG" != "None" ] && [ -n "$SG" ]; then
    echo "  $NAME -> $SG"
    try aws ec2 delete-security-group --region "$REGION" --group-id "$SG"
  fi
done

# 8. Key pair (+ local private key)
log "Deleting key pair..."
try aws ec2 delete-key-pair --region "$REGION" --key-name "$KEY_NAME"
rm -f "$HOME/.ssh/${KEY_NAME}.pem" && echo "  removed local ~/.ssh/${KEY_NAME}.pem" || true

log "Teardown complete."
