# Intigriti API Reporting Workbench — Build Plan

## Context

Build a local-first, single-page reporting workbench that lets Intigriti employees and customers turn Intigriti API data into charts, tables, and exports — without waiting on product or data teams. The app is intended for personal and customer power-user use. It must be easy for Claude Code to extend with new report modules.

**Key API findings from docs:**
- Auth is OAuth 2.0 (not a simple API key). Users can either paste a pre-generated Bearer token or go through the full OAuth flow with client_id + client_secret.
- Base URL: `https://api.intigriti.com/external/company/v2`
- CORS policy is undocumented — assume browser calls will be blocked; a Vite dev proxy is required from day one.
- Core platform list endpoints return full datasets (no pagination); only Reward System endpoints paginate.
- Date filtering: only `UpdatedSince` (unix timestamp) is supported server-side. Date range filtering must be done client-side after fetching.
- Budget data lives on `GET /v2/programs/{programId}` as `programBudget: { budgetLeft, budgetSpent, budgetTotal }`.
- Token validation endpoint: `GET /v2/programs` (returns 200 with program list on success).

---

## Architecture Decisions

- **Runtime**: Vite + React + TypeScript, runs locally with `npm run dev`
- **Proxy**: Vite dev server proxies `/api/*` → `https://api.intigriti.com/external/company/*` to handle CORS
- **Auth**: Two modes — Bearer token (paste a pre-generated non-expiring token) or OAuth 2.0 (client_id + client_secret + localhost redirect handled by Vite middleware)
- **Cache**: Browser File System Access API for local folder selection; Web Crypto AES-256-GCM for optional encryption
- **Stack**: React, TypeScript, Tailwind CSS, Recharts, TanStack Table, Zod, date-fns, PapaParse

---

## Project Location

Scaffold inside `/Users/chrisholt/Documents/Claude/workspace/Reporting-Workbench/app/`

---

## Folder Structure

```
Reporting-Workbench/
  app/
    README.md
    REPORT_MODULE_GUIDE.md
    package.json
    vite.config.ts          ← proxy + OAuth callback middleware
    index.html
    src/
      main.tsx
      App.tsx
      config/
        api.ts              ← base URL, proxy path, defaults
      api/
        client.ts           ← fetch wrapper, auth header injection, rate-limit handling, error normalisation, redaction
        types.ts            ← all API response types (SubmissionOverviewViewModel, ProgramDetailViewModel, etc.)
        endpoints/
          programs.ts       ← getPrograms(), getProgramDetail(), getProgramSubmissions()
          submissions.ts    ← getAllSubmissions(), getSubmissionDetail()
          payouts.ts        ← getAllPayouts(), getRewardRequests(), getRewardBudget()
      auth/
        store.ts            ← in-memory token store; optional localStorage with explicit opt-in warning
        oauth.ts            ← OAuth 2.0 authorization code flow helpers
        BearerTokenPanel.tsx
        OAuthPanel.tsx
      cache/
        manager.ts          ← File System Access API wrapper; read/write timestamped cache files
        encryption.ts       ← Web Crypto AES-256-GCM encrypt/decrypt
        CachePanel.tsx
      reports/
        types.ts            ← ReportModule interface
        registry.ts         ← dynamic discovery; filters out unavailable modules
        dailyTriageMovement/
          index.ts
          fixtures.ts
        weeklyTriageSummary/
          index.ts
          fixtures.ts
        bountyBudgetOverview/
          index.ts
          fixtures.ts
        submissionStatusSnapshot/
          index.ts
          fixtures.ts
        rawApiExplorer/
          index.ts
      components/
        AppShell.tsx
        ApiKeyPanel.tsx     ← wraps BearerTokenPanel + OAuthPanel with toggle
        CacheSettingsPanel.tsx
        ProgramSelector.tsx
        ReportSelector.tsx
        ReportConfigPanel.tsx
        SummaryCards.tsx    ← reusable stat card grid
        DataTable.tsx       ← TanStack Table wrapper, sortable/filterable
        ChartPanel.tsx      ← Recharts wrapper, configurable by report module
        ExportButtons.tsx   ← CSV, JSON, image, copy-to-clipboard
        ErrorPanel.tsx
        RawJsonToggle.tsx
      utils/
        csv.ts              ← PapaParse export helper
        imageExport.ts      ← html-to-image / canvas export
        dates.ts            ← date-fns helpers, unix timestamp conversion
        redaction.ts        ← strip secrets from log output
        pagination.ts       ← reward system offset pagination helper
      fixtures/
        programs.sample.json
        submissions.sample.json
        payouts.sample.json
        rewardRequests.sample.json
```

---

## Build Phases

### Phase 1 — Project Scaffold & Proxy
1. `npm create vite@latest app -- --template react-ts` inside `Reporting-Workbench/`
2. Install dependencies: `tailwindcss`, `recharts`, `@tanstack/react-table`, `zod`, `date-fns`, `papaparse`, `html-to-image`
3. Configure `vite.config.ts`:
   - Proxy `/api/*` → `https://api.intigriti.com/external/company/*` (strips `/api` prefix, forwards headers)
   - Add custom middleware to handle OAuth callback at `GET /oauth/callback?code=...`
4. Configure Tailwind with Intigriti brand colors (derived from intigriti.com: primary `#FF5C00` orange, dark `#1A1A2E`)
5. Wire up `src/config/api.ts` with base path, version, and mock-mode flag

### Phase 2 — API Client & Types
1. Write `src/api/types.ts` — all response shapes from the Swagger spec
2. Write `src/api/client.ts`:
   - `apiFetch(path, options)` — prepends `/api/v2`, injects `Authorization: Bearer {token}`, normalises errors, redacts secrets from logged output
   - `safeRequest()` — wraps apiFetch with rate-limit backoff on 429
3. Write endpoint helpers:
   - `programs.ts`: `getPrograms()`, `getProgramDetail(id)`, `getProgramSubmissions(id, updatedSince?)`
   - `submissions.ts`: `getAllSubmissions(updatedSince?)`, `getSubmissionDetail(code)`
   - `payouts.ts`: `getAllPayouts()`, `getAllRewardRequests()` (handles offset pagination), `getRewardBudget()`
4. Write `src/fixtures/` sample JSON files for each endpoint (realistic but synthetic data)
5. Mock mode: when `VITE_MOCK_MODE=true`, endpoint helpers return fixture data instead of fetching

### Phase 3 — Auth System
1. `src/auth/store.ts` — module-scoped in-memory token store; `setToken()`, `getToken()`, `clearToken()`; optional `localStorage` with explicit consent gate
2. `src/auth/oauth.ts` — `buildAuthUrl(clientId, redirectUri, scopes)`, `exchangeCode(code, clientId, clientSecret, redirectUri)`, `refreshToken(...)`, `scheduleRefresh()` (proactive refresh 5 min before expiry)
3. `src/components/ApiKeyPanel.tsx`:
   - Toggle: "Bearer Token" vs "OAuth 2.0"
   - Bearer mode: password input → "Test connection" → on success, hides input, shows connected state + program list
   - OAuth mode: client_id + client_secret inputs → "Authorise" button → opens Intigriti login in same tab → callback handled by Vite middleware → tokens stored → same connected state
   - "Clear credentials" button always visible after connection
   - Print media query hides the entire panel (CSS `@media print { display: none }`)
   - Keys never logged to console (enforced in `redaction.ts`)

### Phase 4 — Cache System
1. `src/cache/manager.ts`:
   - `requestCacheFolder()` — File System Access API `showDirectoryPicker()`
   - `saveDataChunk(folder, scope, endpoint, data, encrypted, key?)` — writes `intigriti-cache__SCOPE__ENDPOINT__TIMESTAMP.json` or `.enc`
   - `loadCacheIndex(folder)` — reads directory, returns list of cache file metadata (source, endpoint, timestamp)
   - `loadCacheFile(folder, filename, key?)` — reads and optionally decrypts a file; returns parsed data
   - Warns user before first save about sensitive data
2. `src/cache/encryption.ts`:
   - `deriveKey(passphrase)` — PBKDF2 from passphrase → AES-256-GCM key
   - `encrypt(data, key)` / `decrypt(ciphertext, key)` — Web Crypto API
   - Key material is never written to disk or logged
3. `src/components/CacheSettingsPanel.tsx`:
   - Folder selector button
   - Encryption toggle (off by default) + key source toggle (API token vs custom key)
   - "Test encryption key" button
   - Warning callout: "Cache files may contain sensitive vulnerability data"
   - Keys hidden after validation; print-hidden via CSS

### Phase 5 — Report Infrastructure
1. `src/reports/types.ts` — `ReportModule` interface defining: id, title, description, category, paramSchema (Zod), requiredScopes, isAvailable(), fetchData(), transform(), tableColumns, chartConfig, summaryFormatter, exportConfig, sampleData, samplePreview
2. `src/reports/registry.ts` — imports all report modules, calls `isAvailable()` per module, exports only compatible ones
3. UI components:
   - `ReportSelector.tsx` — card grid of available reports, shows category, description, "preview available" badge
   - `ReportConfigPanel.tsx` — renders Zod-schema-driven parameter form (program selector, date range, filters)
   - `SummaryCards.tsx` — reusable stat card row (value, label, trend indicator)
   - `DataTable.tsx` — TanStack Table with sort, column visibility toggle, row virtualisation for large datasets
   - `ChartPanel.tsx` — Recharts wrapper; report module supplies type (line/bar/stacked bar) + series config
   - `ExportButtons.tsx` — CSV (PapaParse), JSON (Blob download), image (html-to-image), copy summary (Clipboard API)
   - `RawJsonToggle.tsx` — collapsible raw API response viewer (secrets redacted)

### Phase 6 — Report Modules

Each module lives in `src/reports/{name}/index.ts` and ships with a `fixtures.ts` sample dataset.

**6.1 Daily Triage Movement** (`dailyTriageMovement`)
- Fetch: `getAllSubmissions()` or `getProgramSubmissions(id)`, optionally with `UpdatedSince` for incremental updates
- Filter client-side by `createdAt` date range and selected program
- Group by day: count new submissions (createdAt in range), track status transitions via `state.status.value`
- Chart: stacked bar by day — "New", "Forwarded", "Closed/Rejected", "Duplicates" series
- Summary: "Between {start} and {end}, {program} received {X} submissions and processed {Y}, net queue change: {Z}"
- Table columns: Date, New, Forwarded, Closed, Duplicates, Net Change, Cumulative Open

**6.2 Weekly Triage Summary** (`weeklyTriageSummary`)
- Same data as 6.1, grouped by ISO week
- Chart: grouped bar + backlog trend line (Recharts ComposedChart)
- Table columns: Week, Received, Valid, Rejected, Duplicate, Avg Triage Time (from state transition timestamps if available)

**6.3 Bounty Budget Overview** (`bountyBudgetOverview`)
- Fetch: `getProgramDetail(id)` for `programBudget`, `getAllPayouts()` for payout history, `getRewardRequests()` for reward system data
- Budget: `budgetLeft`, `budgetSpent`, `budgetTotal` from program detail
- Chart 1: bar by severity (Critical/High/Medium/Low) from payout `amount` + linked `severity`
- Chart 2: spend over time (line chart by week/month from payout `createdAt`)
- Summary cards: Total Awarded, Award Count, Avg Award, Budget Remaining

**6.4 Submission Status Snapshot** (`submissionStatusSnapshot`)
- Fetch: `getProgramSubmissions(id)` — current state of all submissions
- Group by `state.status.value` and by `severity.value`
- Age buckets (from `createdAt`): 0-2d, 3-7d, 8-14d, 15-30d, 30+d
- Chart: donut for status distribution, bar for aging
- Table: oldest open submissions sorted by age

**6.5 Raw API Explorer** (`rawApiExplorer`)
- Inputs: endpoint path selector (dropdown of known safe GET endpoints) or free-text path, optional query params
- Method locked to GET for MVP
- Shows: raw JSON response, HTTP status, response time, response size
- Actions: Copy JSON, Save as local fixture (writes to user-selected folder in dev mode)

### Phase 7 — Developer Documentation & Polish
1. `REPORT_MODULE_GUIDE.md` — step-by-step guide for adding a new report module; includes a minimal template
2. `README.md` — setup instructions, how to run in mock mode, how to connect to live API (both auth modes), how to use the cache, security guidance
3. Print stylesheet (`@media print`) — hides: ApiKeyPanel, CacheSettingsPanel, any element with `data-no-print`
4. Error handling: `ErrorPanel.tsx` shows human-readable errors for 401 (expired token), 403 (scope missing), 429 (rate limited), network errors
5. Loading states: skeleton loaders on table/chart while fetching
6. Responsive layout — Tailwind breakpoints, sidebar collapses on small screens

---

## API Endpoint Mapping (confirmed)

| Report data need | Endpoint |
|---|---|
| Token validation | `GET /v2/programs` → 200 means valid |
| Program list | `GET /v2/programs` |
| Program budget | `GET /v2/programs/{programId}` → `programBudget` |
| All submissions | `GET /v2/submissions` |
| Program submissions | `GET /v2/programs/{programId}/submissions` |
| Incremental refresh | add `?UpdatedSince={unixTimestamp}` |
| Payout history | `GET /v2/payouts` |
| Reward system data | `GET /v2/reward-system/reward-requests` (paginated, max 200/page) |
| Reward budget | `GET /v2/reward-system/budget` |

---

## Security Constraints (enforced throughout)

- Token never logged; `redaction.ts` masks `Authorization` headers in all debug output
- Token never serialised into cache files, exports, or JSON responses
- `@media print` hides all credential-bearing panels
- `localStorage` opt-in gated behind explicit "I understand this is insecure" checkbox (default off)
- Encryption keys use PBKDF2 derivation; raw passphrase held only in memory, never on disk
- API calls go only to the configured base URL (Vite proxy enforces this in dev)

---

## Verification Plan

1. **Mock mode**: `VITE_MOCK_MODE=true npm run dev` — all 5 reports render with fixture data, exports work, no API calls made
2. **Auth — Bearer token**: paste a real token → "Test connection" → programs list appears → run Submission Status Snapshot against live data
3. **Auth — OAuth**: enter client_id + client_secret → authorise → callback → token stored → same reports work
4. **Cache write**: run a report, confirm timestamped `.json` file appears in selected folder
5. **Cache read**: reload app, load from cached file, confirm report renders without API call
6. **Encrypted cache**: enable encryption, run report, confirm `.enc` file appears; reload, decrypt with correct key → data loads; wrong key → error shown
7. **Export**: CSV download opens in spreadsheet; JSON is valid; image export captures chart; clipboard copy works
8. **Print**: `Cmd+P` — confirm no credentials visible in print preview
9. **New report extensibility**: follow REPORT_MODULE_GUIDE.md to add a trivial 6th report → it appears in selector without touching core files
