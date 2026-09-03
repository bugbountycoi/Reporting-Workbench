# Plan 2: HackerOne API Support

## Prerequisites

Plan 1 must be complete.

## Context

HackerOne's customer API uses HTTP Basic Auth: the `Authorization` header is
`Basic base64(identifier:token)` where `identifier` is the API identifier shown when
creating a token, and `token` is the secret. Responses follow the JSON:API specification
(`{ data: [...], links: {...} }` envelope). Base URL is `https://api.hackerone.com/v1`.

The Vite dev proxy (`/api/hackerone/*` → `https://api.hackerone.com/v1`) is added in Plan 1.

---

## Commits (2)

### Commit A — HackerOne API endpoints and Worker proxy methods

**New file: `app/src/api/endpoints/hackerone.ts`**

Define normalized (JSON:API-unwrapped) types and fetch helpers:

```typescript
export interface H1Program {
  id: string
  handle: string   // slug used to filter reports
  name: string
}

export interface H1Report {
  id: string
  title: string
  state: 'new' | 'triaged' | 'resolved' | 'not-applicable' | 'informative' | 'duplicate' | 'spam'
  severity_rating: 'none' | 'low' | 'medium' | 'high' | 'critical'
  created_at: string   // ISO 8601
  bounty_amount: number | null
  program_handle: string
}

// GET /programs — unwrap JSON:API data[] to H1Program[]
export async function h1GetPrograms(): Promise<H1Program[]>

// GET /reports?filter[program][]=<handle>
// Follows cursor pagination via links.next; unwraps data[] to H1Report[]
export async function h1GetReports(programHandle?: string): Promise<H1Report[]>
```

**`reports/userModules/interpreter.ts` — `handleApiProxy()`**: add:
```typescript
case 'h1_getPrograms': return h1GetPrograms()
case 'h1_getReports':  return h1GetReports(args[0] as string | undefined)
```

**`reports/userModules/moduleWorker.ts` — `FETCH_CTX`**: add:
```typescript
h1_getPrograms: () => apiProxy('h1_getPrograms', []),
h1_getReports: (handle?: string) => apiProxy('h1_getReports', [handle]),
```

**`reports/userModules/types.ts` — `FetchCtx`**: add both H1 methods.

---

### Commit B — HackerOne built-in report modules and fixtures

**New fixture file: `reports/hackeroneReports/fixtures.ts`**

50-record synthetic dataset matching `H1Report` shape:
- 2 program handles (`acme-corp`, `beta-inc`)
- Mix of all 7 states
- Mix of all 5 severity ratings
- Dates spanning 3 months (varied distribution)
- ~30% with non-null `bounty_amount`

**New specs:**

`reports/hackeroneReportsOverview/spec.ts`:
- `platform: 'hackerone'`, `category: 'snapshot'`
- `customFetchData`: calls `ctx.h1_getReports()` (no handle = all programs)
- `customTransform`: group by `state`, count; bar chart; summary cards for
  total, triaged, resolved
- `sampleFixtureData`: subset of fixture file

`reports/hackeroneActivity/spec.ts`:
- `platform: 'hackerone'`, `category: 'triage'`
- `customFetchData`: calls `ctx.h1_getReports()`
- `customTransform`: bucket by `created_at` week; stacked bar by `severity_rating`
- `params.includeDateRange: true`, `params.includeInterval: true`
- `sampleFixtureData`: full fixture file

Register both specs in `reports/registry.ts → BUILT_IN_SPECS`.

---

## Verification

1. `npx tsc --noEmit` clean
2. Mock mode: both H1 modules render correctly with fixture data (no real API needed)
3. Platform filter "HackerOne" in ReportSelector shows only these 2 modules
4. Live connection (real H1 credentials): verify DevTools shows
   `Authorization: Basic <base64>` header on API requests
5. Live: `h1GetReports()` returns a flat array (JSON:API envelope unwrapped correctly)
