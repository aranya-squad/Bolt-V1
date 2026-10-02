#!/usr/bin/env bash
# Reproducible deploy script for Bolt Abacus backend.
# Supports Fly.io (default) and generic Docker Compose environments.
#
# Usage (environment variables):
#   PLATFORM=fly    ./deploy.sh        # Fly.io rolling deploy (default)
#   PLATFORM=compose ./deploy.sh       # generic Docker Compose rolling restart
#   PLATFORM=compose IMAGE_REF=<repo>@sha256:<digest> ./deploy.sh
#   PLATFORM=fly IMAGE_TAG=v1.2.3 ./deploy.sh
set -euo pipefail

PLATFORM=${PLATFORM:-fly}
IMAGE_TAG=${IMAGE_TAG:-}
IMAGE_REF=${IMAGE_REF:-}

log() { echo "[deploy] $*"; }
err() { echo "[deploy][ERROR] $*" >&2; exit 1; }

case "$PLATFORM" in
  compose)
    [[ "$IMAGE_REF" == *@sha256:* ]] || err "PLATFORM=compose requires immutable IMAGE_REF=<repo>@sha256:<digest>"
    export IMAGE_REF
    ;;
  fly)
    [[ -n "$IMAGE_TAG" ]] || err "IMAGE_TAG is required for Fly; never use an implicit latest"
    [[ "$IMAGE_TAG" != "latest" ]] || err "IMAGE_TAG=latest is not allowed for a release"
    export IMAGE_TAG
    ;;
  *)
    err "Unsupported PLATFORM=$PLATFORM"
    ;;
esac

pull_release() {
  if [[ "$PLATFORM" == "compose" ]]; then
    log "Pulling immutable application release $IMAGE_REF..."
    docker compose -f docker-compose.prod.yml pull web worker beat
  fi
}

run_migrations() {
  log "Running migrations for $PLATFORM release..."
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
    # services use the same immutable IMAGE_REF release.
    docker compose -f docker-compose.prod.yml up -d --wait --no-build
  fi
}

main() {
  log "Platform: $PLATFORM  Image: ${IMAGE_REF:-$IMAGE_TAG}"
  pull_release
  run_migrations
  rolling_restart
  log "Deploy complete."
}

main "$@"
