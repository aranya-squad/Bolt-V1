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
# Host port bound by the app instances — must match Gunicorn bind in gunicorn.conf.py
APP_HOST_PORT=${APP_HOST_PORT:-8000}

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
    INSTANCES=$(docker ps --filter "name=bolt_web" --format "{{.Names}}")
    if [[ -z "$INSTANCES" ]]; then
      log "ERROR: No running bolt_web instances found. Cannot perform rolling restart."
      exit 1
    fi

    for inst in $INSTANCES; do
      log "  Restarting $inst..."
      docker pull "bolt-abacus-api:$IMAGE_TAG"
      docker stop --time 30 "$inst"  # 30s matches gunicorn timeout for graceful shutdown
      docker run -d --name "$inst" \
        --env-file .env.production \
        -p "${APP_HOST_PORT}:8000" \
        "bolt-abacus-api:$IMAGE_TAG"
      # Wait for health check to pass before moving to the next instance.
      for i in $(seq 1 10); do
        if curl -sf "http://localhost:${APP_HOST_PORT}/api/v1/health/" > /dev/null; then
          log "  $inst healthy."
          break
        fi
        sleep 3
        if [[ $i -eq 10 ]]; then
          log "ERROR: $inst failed health check after 30s. Aborting."
          exit 1
        fi
      done
    done
  fi
}

main() {
  log "Platform: $PLATFORM  Image: $IMAGE_TAG"
  run_migrations
  rolling_restart
  log "Deploy complete."
}

main "$@"
