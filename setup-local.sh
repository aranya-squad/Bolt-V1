#!/usr/bin/env bash
# Bolt Abacus — local dev setup (macOS Apple Silicon)
# Run once: bash setup-local.sh
# After first run, use: bash run-local.sh to start services

set -e

BOLTV1_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV="$BOLTV1_DIR/backend/.venv"

echo ""
echo "══════════════════════════════════════════════"
echo "  Bolt Abacus — Local Dev Setup"
echo "══════════════════════════════════════════════"
echo ""

# ── 1. Homebrew ───────────────────────────────────
if ! command -v brew &>/dev/null; then
  echo "→ Installing Homebrew…"
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  # Add brew to PATH for this session (Apple Silicon path)
  eval "$(/opt/homebrew/bin/brew shellenv)"
else
  echo "✓ Homebrew already installed"
  eval "$(brew shellenv 2>/dev/null || /opt/homebrew/bin/brew shellenv)"
fi

# ── 2. Node ──────────────────────────────────────
if ! command -v node &>/dev/null; then
  echo "→ Installing Node.js LTS…"
  brew install node
else
  echo "✓ Node $(node --version) already installed"
fi

# ── 3. PostgreSQL 16 ─────────────────────────────
if ! command -v psql &>/dev/null; then
  echo "→ Installing PostgreSQL 16…"
  brew install postgresql@16
  # Add pg binaries to PATH
  echo 'export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc
  export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
else
  echo "✓ PostgreSQL already installed"
fi

# ── 4. Redis ─────────────────────────────────────
if ! command -v redis-server &>/dev/null; then
  echo "→ Installing Redis…"
  brew install redis
else
  echo "✓ Redis already installed"
fi

# ── 5. Start services ────────────────────────────
echo "→ Starting PostgreSQL…"
brew services start postgresql@16
sleep 3

echo "→ Starting Redis…"
brew services start redis
sleep 1

# ── 6. Create Postgres DB ────────────────────────
echo "→ Creating bolt database and user…"
psql postgres -c "CREATE USER bolt WITH PASSWORD 'bolt';" 2>/dev/null || echo "  (user already exists)"
psql postgres -c "CREATE DATABASE bolt OWNER bolt;" 2>/dev/null || echo "  (database already exists)"
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE bolt TO bolt;" 2>/dev/null || true

# ── 7. Python virtualenv ─────────────────────────
echo "→ Creating Python virtual environment…"
python3 -m venv "$VENV"
source "$VENV/bin/activate"

echo "→ Installing Python dependencies…"
pip install --quiet --upgrade pip
pip install --quiet -r "$BOLTV1_DIR/backend/requirements/development.txt"

# ── 8. .env file ─────────────────────────────────
ENV_FILE="$BOLTV1_DIR/.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "→ Creating .env from .env.example…"
  cp "$BOLTV1_DIR/.env.example" "$ENV_FILE"
  # Patch to use local (non-Docker) values
  sed -i '' 's|postgres://bolt:bolt@postgres:5432/bolt|postgres://bolt:bolt@localhost:5432/bolt|' "$ENV_FILE"
  sed -i '' 's|redis://redis:6379/0|redis://localhost:6379/0|' "$ENV_FILE"
  # Generate a random secret key
  SECRET=$(python3 -c "import secrets; print(secrets.token_urlsafe(50))")
  sed -i '' "s|change-me-to-a-long-random-string|$SECRET|" "$ENV_FILE"
  echo "✓ .env created with local DB/Redis URLs and generated secret key"
else
  echo "✓ .env already exists (not overwritten)"
fi

# ── 9. Django migrations ─────────────────────────
echo "→ Running Django migrations…"
cd "$BOLTV1_DIR/backend"
DJANGO_SETTINGS_MODULE=config.settings.development \
  DATABASE_URL=postgres://bolt:bolt@localhost:5432/bolt \
  DJANGO_SECRET_KEY=$(grep DJANGO_SECRET_KEY "$ENV_FILE" | cut -d= -f2) \
  REDIS_URL=redis://localhost:6379/0 \
  python manage.py migrate --run-syncdb

echo "→ Checking Django system…"
DJANGO_SETTINGS_MODULE=config.settings.development \
  DATABASE_URL=postgres://bolt:bolt@localhost:5432/bolt \
  DJANGO_SECRET_KEY=$(grep DJANGO_SECRET_KEY "$ENV_FILE" | cut -d= -f2) \
  REDIS_URL=redis://localhost:6379/0 \
  python manage.py check 2>&1 | tail -5

# ── 10. npm install ──────────────────────────────
echo "→ Installing frontend npm packages…"
cd "$BOLTV1_DIR/frontend"
npm install --silent

echo ""
echo "══════════════════════════════════════════════"
echo "  ✅ Setup complete!"
echo ""
echo "  Run servers:   bash $BOLTV1_DIR/run-local.sh"
echo "  Backend:       http://localhost:8000"
echo "  Frontend:      http://localhost:5173"
echo "  Django admin:  http://localhost:8000/admin/"
echo "  API docs:      http://localhost:8000/api/v1/docs/"
echo "══════════════════════════════════════════════"
echo ""
