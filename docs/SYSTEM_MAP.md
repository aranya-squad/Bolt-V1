---
last_updated: 2026-10-15
verified_application_commit: cec94ea187ab3fcf571f73dd4468b1edaf0d290a
evidence: CODE
operational_canonical: true
---

# Bolt V1 system map — baseline main

## Frontend
React, TypeScript and Vite. Inspect `frontend/src/router.tsx`, feature pages, `frontend/src/shared/api` and store. Development can use mocks; don't claim MSW tests are full stack.

## Backend
Django/DRF under `backend/apps` and `backend/config`. Backend routes and serializers own permission boundaries and validation.

## API and request boundaries
Review API views, serializers, `frontend/src/api/openapi.yaml`, frontend shared types/hooks, mocks and regression tests together.

## Data and persistence
PostgreSQL authoritative state. Durable learning/progress scoring belongs in `backend/apps/progress/services.py`; inspect transactions and schema before modifications.

## Authentication and roles
Review Django users and frontend auth API/client/store. Never assume stale auth/session state belongs to the current user.

## Classroom and teacher flow
Review backend classroom models/views and teacher/frontend routes. Newer feature-branch behavior is not guaranteed present on main.

## Operational limits
LIVE deployment and production release state are UNKNOWN from repository source alone. `docs/RUNBOOK.md` has test and CI commands.
