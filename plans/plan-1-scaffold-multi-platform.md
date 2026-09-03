# Plan 1 — Scaffold Multi-Platform

**Status:** Implemented after Plan 5
**Prerequisite:** Plan 5 must be complete (provides `PlatformId` + `platforms/store.ts`)

## Purpose

Wire platform selection into the app. Add `PlatformConfig` for each platform's
auth format, API base URL, and badge. Update the API client, token store, proxy,
and UI so the app works for Intigriti, HackerOne, and Bugcrowd.

---

## Commits

### Commit 1 — Platform registry + platform store expansion

Files created/updated:
- `app/src/platforms/registry.ts` — `PlatformConfig` + `PLATFORMS` map
- `app/src/platforms/store.ts` — already created in Plan 5; no changes needed here,
  Plan 1 consumers import from it directly

### Commit 2 — Platform-aware API client + proxy + auth store

Files updated:
- `app/vite.config.ts` — three platform-prefixed proxy entries replacing single `/api/*`
- `app/src/config/api.ts` — `getApiBaseUrl()` reads active platform
- `app/src/api/client.ts` — auth header switch (bearer / token-pair / basic)
                          — platform Accept header
- `app/src/auth/store.ts` — token key becomes `${platformId}_wb_token`

### Commit 3 — Platform badges + filtering in ReportSelector

Files updated:
- `app/src/components/ReportSelector.tsx` — platform badge on module cards,
  filter chips to show All / Intigriti / HackerOne / Bugcrowd

### Commit 4 — Platform picker in ApiKeyPanel + App.tsx restore

Files updated:
- `app/src/components/ApiKeyPanel.tsx` — step 0: platform picker, platform-aware
  auth form (Bearer for Intigriti, Basic for H1, Token-pair for Bugcrowd)
- `app/src/App.tsx` — restore active platform on init

---

## Platform Config Shape

```typescript
interface PlatformConfig {
  id: PlatformId
  name: string
  apiBaseUrl: string          // production API base (proxied via /intigriti-api, /h1-api, /bc-api in dev)
  authScheme: 'bearer' | 'basic' | 'token-pair'
  acceptHeader: string | null // null = use default application/json
  badgeColor: string          // Tailwind CSS class or hex
  oauthEnabled: boolean
  docsUrl: string
}
```

---

## Auth Header Logic

| Platform   | Scheme      | Header value                                      |
|------------|-------------|---------------------------------------------------|
| Intigriti  | bearer      | `Authorization: Bearer <token>`                   |
| HackerOne  | basic       | `Authorization: Basic base64(identifier:token)`   |
| Bugcrowd   | token-pair  | `Authorization: Token <username>:<token>`          |

---

## Token Storage

Tokens stored as `${platformId}_wb_token` in localStorage.
Existing flat key `wb_token` migrates to `intigriti_wb_token` on first load.

---

## Proxy Entries (vite.config.ts)

```
/intigriti-api/*  → https://api.intigriti.com/external/company/*
/h1-api/*         → https://api.hackerone.com/v1/*
/bc-api/*         → https://api.bugcrowd.com/*
```

Cloudflare Worker mirrors these routes.

---

## Mock Data

Intigriti mock data exists. Plans 2 and 3 add H1/BC fixtures.
The platform store defaults to `intigriti` so existing behaviour is unchanged.
