#!/usr/bin/env bash
# Reproducible deploy script for Bolt Abacus backend.
# Supports Fly.io (default) and generic Docker Compose environments.
#
# Usage (environment variables):
#   PLATFORM=fly    ./deploy.sh        # Fly.io rolling deploy (default)
#   PLATFORM=compose ./deploy.sh       # generic Docker Compose rolling restart
#   IMAGE_TAG=v1.2.3 ./deploy.sh       # deploy a specific image tag
set -euo pipefail

PLATFORM=${PLATFORM:-fly}
IMAGE_TAG=${IMAGE_TAG:-latest}

log() { echo "[deploy] $*"; }

run_migrations() {
  log "Running migrations..."
  if [[ "$PLATFORM" == "fly" ]]; then
    fly ssh console --command "python manage.py migrate --settings config.settings.production"
  else
    docker compose -f docker-compose.prod.yml run --rm web \
      python manage.py migrate --settings config.settings.production
  fi
}

rolling_restart() {
  log "Rolling restart ($PLATFORM)..."
  if [[ "$PLATFORM" == "fly" ]]; then
    fly deploy --strategy rolling --image "registry.fly.io/bolt-abacus-api:$IMAGE_TAG"
  else
    # Compose brings up web + worker + beat from docker-compose.prod.yml.
    # Image is selected via IMAGE_NAME/IMAGE_TAG (export IMAGE_NAME=<ecr-uri> for ECR).
    # --wait blocks until the web healthcheck passes before returning.
    docker compose -f docker-compose.prod.yml pull
    docker compose -f docker-compose.prod.yml up -d --wait
  fi
}

main() {
  log "Platform: $PLATFORM  Image: $IMAGE_TAG"
  run_migrations
  rolling_restart
  log "Deploy complete."
}

main "$@"
