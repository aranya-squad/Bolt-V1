#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
RELEASE_SHA="$(git -C "$ROOT" rev-parse HEAD)"
IMAGE="bolt-backend-context-canary:${RELEASE_SHA}"
CTX="$(mktemp -d)"
OUT="$(mktemp -d)"
CID=""

cleanup() {
  if [[ -n "$CID" ]]; then
    docker rm -f "$CID" >/dev/null 2>&1 || true
  fi
  docker image rm -f "$IMAGE" >/dev/null 2>&1 || true
  rm -rf "$CTX" "$OUT"
}
trap cleanup EXIT

command -v docker >/dev/null || { echo "docker is required" >&2; exit 2; }
docker info >/dev/null

echo "[canary] exporting tracked backend source at $RELEASE_SHA"
git -C "$ROOT" archive "${RELEASE_SHA}:backend" | tar -x -C "$CTX"

MARKER="BOLT_DOCKER_CONTEXT_SECRET_CANARY_${RELEASE_SHA}"
mkdir -p "$CTX/nested/private"
printf 'DJANGO_SECRET_KEY=%s\n' "$MARKER" > "$CTX/.env.production"
printf '%s\n' "$MARKER" > "$CTX/nested/private/.env.local"
printf '%s\n' "$MARKER" > "$CTX/nested/private/id_ed25519"
printf 'required-runtime-canary\n' > "$CTX/docker-context-required.txt"

echo "[canary] building production Dockerfile"
docker build --pull=false -f "$CTX/docker/Dockerfile.prod" -t "$IMAGE" "$CTX"

echo "[canary] verifying required runtime content/imports without network"
docker run --rm --network none --entrypoint sh "$IMAGE" -ec \
  'test "$(cat /app/docker-context-required.txt)" = required-runtime-canary && python -c "import django, gunicorn, config"'

echo "[canary] inspecting final image filesystem"
CID="$(docker create "$IMAGE")"
docker export "$CID" -o "$OUT/rootfs.tar"
if tar -tf "$OUT/rootfs.tar" | grep -E '(^|/)app/(\.env\.production|nested/private/\.env\.local|nested/private/id_ed25519)$'; then
  echo "[FAIL] synthetic secret canary path reached final image filesystem" >&2
  exit 1
fi
if grep -aF "$MARKER" "$OUT/rootfs.tar" >/dev/null; then
  echo "[FAIL] synthetic secret canary value reached final image filesystem" >&2
  exit 1
fi

echo "[canary] inspecting saved image layers"
docker save "$IMAGE" -o "$OUT/image.tar"
mkdir "$OUT/saved"
tar -xf "$OUT/image.tar" -C "$OUT/saved"
while IFS= read -r -d '' layer; do
  if tar -tf "$layer" | grep -E '(^|/)app/(\.env\.production|nested/private/\.env\.local|nested/private/id_ed25519)$'; then
    echo "[FAIL] synthetic secret canary path reached image layer: $layer" >&2
    exit 1
  fi
  if grep -aF "$MARKER" "$layer" >/dev/null; then
    echo "[FAIL] synthetic secret canary value reached image layer: $layer" >&2
    exit 1
  fi
done < <(find "$OUT/saved" -name layer.tar -print0)

echo "[PASS] backend Docker context excludes synthetic secret canaries; runtime content remains present"
