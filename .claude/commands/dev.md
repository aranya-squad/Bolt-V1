Start local dev servers for Bolt Abacus (Django backend + Vite frontend).

Run the following bash command. Do not prompt — execute it directly:

```bash
PROJECT=/Users/sagarshukla/Bolt_v1
VENV="$PROJECT/backend/.venv"

if [ ! -f "$VENV/bin/activate" ]; then
  echo "First-time setup required. Running setup-local.sh..."
  bash "$PROJECT/setup-local.sh"
fi

bash "$PROJECT/run-local.sh"
```

After running, confirm the servers are up and print exactly this block:

```
Local dev servers running:

  Frontend  →  http://localhost:5173
  Backend   →  http://localhost:8000
  API docs  →  http://localhost:8000/api/v1/docs/
  Admin     →  http://localhost:8000/admin/

Press Ctrl+C in the terminal to stop.
```
