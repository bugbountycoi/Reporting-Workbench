# Plan 1: Scaffold for Multi-Platform Support

## Goal

Lay the universal infrastructure that makes the app platform-aware, without adding any new platform implementations. This is the prerequisite for Plans 2, 3, and 5.

No platform-specific API endpoints or report modules are added here — only the wiring that makes them possible.

---

## Commits (4)

### Commit A — Platform registry and active-platform store

**New files:**
- `app/src/platforms/registry.ts`
- `app/src/platforms/store.ts`

**`registry.ts`** defines:

```typescript
export type PlatformId = 'intigriti' | 'bugcrowd' | 'hackerone'

export interface PlatformConfig {
  id: PlatformId
  name: string
  shortName: string
  color: string           // badge hex background
  textColor: string       // badge hex text
  devProxyPrefix: string  // '/api/intigriti', '/api/bugcrowd', '/api/hackerone'
  authType: 'bearer' | 'token-pair' | 'basic'
  acceptHeader?: string   // Bugcrowd requires 'application/vnd.bugcrowd+json'
  oauth?: {               // only Intigriti supports PKCE OAuth
    authorizeUrl: string
    tokenUrl: string
    redirectUri: string
    scopes: string
  }
  docsUrl: string
  tokenHint: string       // shown below the credential form in ApiKeyPanel
}

export const PLATFORMS: Record<PlatformId, PlatformConfig> = {
  intigriti: { ... },   // purple badge, bearer auth + oauth
  bugcrowd:  { ... },   // orange badge, token-pair auth
  hackerone: { ... },   // dark badge, basic auth
}
```

**`store.ts`** exposes:
```typescript
export function getActivePlatform(): PlatformId  // defaults to 'intigriti'
export function setActivePlatform(id: PlatformId): void
// Persisted to localStorage under key 'wb_active_platform'
```

---

### Commit B — Platform-aware Vite proxy and API client

**`vite.config.ts`** — replace the single `/api/*` rule with three platform-prefixed entries:
```
/api/intigriti/* → https://api.intigriti.com/external/company  (strip prefix)
/api/bugcrowd/*  → https://api.bugcrowd.com                   (strip prefix)
/api/hackerone/* → https://api.hackerone.com/v1               (strip prefix)
```

**`config/api.ts`** — update `getApiBaseUrl()` to be platform-aware:
```typescript
export function getApiBaseUrl(): string {
  const p = getActivePlatform()
  // Intigriti adds a version segment; other platforms do not
  if (p === 'intigriti') return `${PLATFORMS.intigriti.devProxyPrefix}/${_activeVersion}`
  return PLATFORMS[p].devProxyPrefix
}
```

**`api/client.ts`** — platform-aware `Authorization` and `Accept` headers:
```typescript
const platform = PLATFORMS[getActivePlatform()]
if (token) {
  switch (platform.authType) {
    case 'bearer':     headers['Authorization'] = `Bearer ${token}`; break
    case 'token-pair': headers['Authorization'] = `Token ${token}`; break
    case 'basic':      headers['Authorization'] = `Basic ${btoa(token)}`; break
  }
}
if (platform.acceptHeader) headers['Accept'] = platform.acceptHeader
```

**`auth/store.ts`** — namespace the encrypted localStorage token blob key by platform:
```typescript
function tokenStorageKey(): string { return `${getActivePlatform()}_wb_token` }
export function getTokenStorageKey(): string { return tokenStorageKey() }
```
Replace all internal uses of the old `TOKEN_STORAGE_KEY` constant with `tokenStorageKey()`.
This prevents token blobs from different platforms from colliding or being cross-decrypted.

---

### Commit C — Platform field on report modules + UI badges

**`reports/userModules/types.ts`** — add to `UserModuleSpec`:
```typescript
platform?: PlatformId   // optional; not validated by isUserModuleSpec (backward compat)
```

**`reports/types.ts`** — add to `ReportModule`:
```typescript
platform?: PlatformId
```

**`reports/userModules/interpreter.ts`** — in `specToModule()`:
```typescript
platform: spec.platform ?? 'intigriti',
```

**5 existing built-in specs** — add `platform: 'intigriti'` to:
`weeklyTriageSummarySpec`, `dailyTriageMovementSpec`, `bountyBudgetOverviewSpec`,
`submissionStatusSnapshotSpec`, `rawApiExplorerSpec`

**`components/ReportSelector.tsx`**:
- Add a small platform badge chip to each card alongside the existing category badge
  (use `PLATFORMS[module.platform ?? 'intigriti'].color`)
- Add a platform filter row above category chips: **All | Intigriti | Bugcrowd | HackerOne**
- When `appState === 'connected'`, default selection = active platform; otherwise "All"
- Platform and category filters are AND-combined

---

### Commit D — Platform picker in the setup flow

**`components/ApiKeyPanel.tsx`**:
- Step 0: three platform cards (with name and color) before the auth form
- Selecting a platform calls `setActivePlatform(id)`, `clearToken()`, and resets the form
- Auth UI is driven by the active platform's `authType`:
  - **Intigriti** (`bearer`): existing Bearer token input + OAuth PKCE flow (unchanged)
  - **Bugcrowd** (`token-pair`): Username + API Token inputs → `setToken(`${user}:${token}`)`
  - **HackerOne** (`basic`): API Identifier + API Token inputs → `setToken(`${id}:${token}`)` (client Base64-encodes)
- "Remember on this device" checkbox works for all platforms (same AES-GCM mechanism)
- On disconnect, platform selection is preserved (only credentials are cleared)

**`App.tsx`**:
- Restore `activePlatform` from localStorage before calling `enableLocalStorage()` in the auto-connect `useEffect`, so the correct token storage key is used

---

## Verification

1. `npx tsc --noEmit` clean after each commit
2. Existing Intigriti mock-mode flow unchanged end-to-end
3. Platform selector appears in the setup panel
4. Choosing Bugcrowd shows Username + API Token form
5. Choosing HackerOne shows API Identifier + API Token form
6. Each report card shows a platform badge
7. Platform filter chips appear in ReportSelector and AND-combine with category chips
8. Switching platforms in the setup panel clears the credential form
