# CDN Deploy Guide

> Covers: building the SPA, deploying to a CDN, and wiring the cross-origin cookie flow
> when the frontend and API are on different origins.

---

## 1. Build

```bash
cd frontend
npm run build   # tsc then vite build
```

Output goes to `frontend/dist/`. It is a fully static bundle — no Node.js runtime needed.
Serve it from any CDN (Cloudflare Pages, S3 + CloudFront, Vercel, Netlify, etc.).

---

## 2. Environment variables

Before building for production, set `VITE_API_BASE_URL` in `frontend/.env.production`:

```
VITE_API_BASE_URL=https://api.bolt-abacus.example.com
```

Leave it empty (the default) when the SPA is co-hosted on the same origin as the API.

The axios client reads this at build time:
```ts
// frontend/src/shared/api/client.ts
const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
```

---

## 3. Django API settings for CDN split

When the SPA (`app.bolt-abacus.com`) is on a different origin from the API
(`api.bolt-abacus.com`), two things must be configured:

### 3.1 CORS

```bash
# .env / environment
CORS_ALLOWED_ORIGINS=https://app.bolt-abacus.example.com
```

`CORS_ALLOW_CREDENTIALS = True` is already set in `config/settings/base.py` — do not remove it.

### 3.2 Refresh-token cookie

The `REFRESH_COOKIE_SAMESITE = "Lax"` setting in `base.py` works for cross-**subdomain**
requests (same registerable domain: `bolt-abacus.example.com`) without any change.

Set the cookie domain so the browser sends it from `app.*` to `api.*`:

```bash
# .env / environment
REFRESH_COOKIE_DOMAIN=.bolt-abacus.example.com   # leading dot covers all subdomains
```

If the SPA and API are on **completely different registerable domains** (e.g., CDN provider's
`*.pages.dev` vs. your custom API domain), `SameSite=Lax` will not work because the browser
treats them as cross-site. In that case, change to:

```python
# config/settings/production.py
from .base import SIMPLE_JWT
SIMPLE_JWT["REFRESH_COOKIE_SAMESITE"] = "None"
SIMPLE_JWT["REFRESH_COOKIE_SECURE"] = True   # required when SameSite=None
```

And add the CDN domain to `CORS_ALLOWED_ORIGINS`.

### 3.3 Verification checklist

- [ ] `npm run build` completes with zero TypeScript errors
- [ ] `dist/` loads against the remote API (open `dist/index.html` via a local static server
      with `VITE_API_BASE_URL` set and verify login + token refresh work)
- [ ] Login on the SPA origin, token refresh succeeds against the API origin (no CORS error,
      no 401 loop)
- [ ] No `Set-Cookie` header is missing the `Domain` attribute when cross-subdomain is used

---

## 4. Recommended deploy topology

```
app.bolt-abacus.example.com   →  Cloudflare Pages (static, dist/)
api.bolt-abacus.example.com   →  Django (Gunicorn behind Nginx / Fly.io / Render)

REFRESH_COOKIE_DOMAIN=.bolt-abacus.example.com
CORS_ALLOWED_ORIGINS=https://app.bolt-abacus.example.com
VITE_API_BASE_URL=https://api.bolt-abacus.example.com
```

Both are on the same apex domain so `SameSite=Lax` works and the refresh cookie flows
correctly without `SameSite=None`.

---

## 5. Static file caching headers

Vite fingerprints all assets (`/assets/index-<hash>.js`). Set long-lived cache headers
for `assets/**` and a short TTL for `index.html`:

```
Cache-Control: max-age=31536000, immutable   # assets/**
Cache-Control: no-cache                      # index.html
```

Cloudflare Pages applies these automatically when you set Page Rules or use a `_headers` file:

```
# frontend/public/_headers
/assets/*
  Cache-Control: max-age=31536000, immutable

/*
  Cache-Control: no-cache
```
