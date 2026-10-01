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
IMAGE_TAG=${IMAGE_TAG:-}

log() { echo "[deploy] $*"; }
err() { echo "[deploy][ERROR] $*" >&2; exit 1; }

[[ -n "$IMAGE_TAG" ]] || err "IMAGE_TAG is required; deploy an explicit reviewed release tag/commit, never an implicit latest"
[[ "$IMAGE_TAG" != "latest" ]] || err "IMAGE_TAG=latest is not allowed for a release"
if [[ "$PLATFORM" == "compose" ]]; then
  [[ -n "${IMAGE_NAME:-}" ]] || err "IMAGE_NAME is required for PLATFORM=compose"
fi
export IMAGE_TAG

pull_release() {
  if [[ "$PLATFORM" == "compose" ]]; then
    log "Pulling exact application release ${IMAGE_NAME}:${IMAGE_TAG}..."
    docker compose -f docker-compose.prod.yml pull web worker beat
  fi
}

run_migrations() {
  log "Running migrations with release $IMAGE_TAG..."
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
    # App images were pulled before migrations so schema work and restarted
    # services use the same explicit IMAGE_NAME:IMAGE_TAG release.
    docker compose -f docker-compose.prod.yml up -d --wait --no-build
  fi
}

main() {
  log "Platform: $PLATFORM  Image: $IMAGE_TAG"
  pull_release
  run_migrations
  rolling_restart
  log "Deploy complete."
}

main "$@"
