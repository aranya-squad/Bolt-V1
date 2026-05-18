#!/usr/bin/env bash
# Bolt Abacus — start local dev servers
# Run: bash run-local.sh
# Press Ctrl+C to stop all servers

BOLTV1_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV="$BOLTV1_DIR/backend/.venv"
ENV_FILE="$BOLTV1_DIR/.env"

if [ ! -f "$VENV/bin/activate" ]; then
  echo "❌ Virtualenv not found. Run setup-local.sh first."
  exit 1
fi

# Load env vars
export $(grep -v '^#' "$ENV_FILE" | grep -v '^$' | xargs)

# Use local (non-Docker) URLs
export DATABASE_URL="postgres://bolt:bolt@localhost:5432/bolt"
export REDIS_URL="redis://localhost:6379/0"
export DJANGO_SETTINGS_MODULE="config.settings.development"

# Ensure Postgres + Redis are running
eval "$(brew shellenv 2>/dev/null || /opt/homebrew/bin/brew shellenv 2>/dev/null || true)"
brew services start postgresql@16 &>/dev/null || true
brew services start redis &>/dev/null || true

# Activate venv
source "$VENV/bin/activate"

echo ""
echo "══════════════════════════════════════════════"
echo "  Starting Bolt Abacus local dev servers…"
echo ""
echo "  Backend  →  http://localhost:8000"
echo "  Frontend →  http://localhost:5173"
echo "  API docs →  http://localhost:8000/api/v1/docs/"
echo ""
echo "  Press Ctrl+C to stop all servers"
echo "══════════════════════════════════════════════"
echo ""

# Trap Ctrl+C and kill all children
cleanup() {
  echo ""
  echo "→ Stopping servers…"
  kill 0
  exit 0
}
trap cleanup SIGINT SIGTERM

# Start Django
cd "$BOLTV1_DIR/backend"
python manage.py runserver 0.0.0.0:8000 &
DJANGO_PID=$!

# Start Vite
cd "$BOLTV1_DIR/frontend"
npm run dev &
VITE_PID=$!

echo "→ Django PID: $DJANGO_PID"
echo "→ Vite PID:   $VITE_PID"
echo ""

wait
