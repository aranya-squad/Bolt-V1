---
last_updated: 2026-10-15
verified_repo_branch: main
live_environment_verified: never
evidence: CODE+UNKNOWN-LIVE
---

# Bolt V1 developer runbook
Run only against isolated synthetic resources. Do not touch production or live AWS.

## Local checks
Backend: `cd backend && ruff check .`; with explicit test settings and loopback PostgreSQL/Redis run `pytest`.
Frontend: `cd frontend && npm run lint && npm run type-check && npm run test && npm run build`. Check `frontend/package.json` first. A missing frontend lockfile on historical main is a pre-existing CI issue, not permission to alter application dependencies as part of the governance-only PR.

## CI
`.github/workflows/ci.yml` is the existing application workflow. `.github/workflows/ai-sdlc.yml` tests only the AI-SDLC Python standard-library checker, gate and preflight, and runs an offline structural check.
Run `python -m unittest discover -s scripts/tests -v` and `python scripts/check_context_freshness.py` from the root.
Run `python scripts/verify_ci_evidence.py --repository aranya-squad/Bolt-V1 --commit <sha> --workflow CI` where GitHub access is available. An exact SHA success does not prove merge or production deployment.

## Deployment
No deployment automation is authorized by this runbook. Main pushes can cause external hosting integrations to respond; verify that independently. Human owns release and production topology checks.
