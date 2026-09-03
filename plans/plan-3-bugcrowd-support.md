# Plan 3: Bugcrowd API Support

## Prerequisites

Plan 1 must be complete.

## Context

Bugcrowd's API uses `Authorization: Token <username>:<token>` and requires
`Accept: application/vnd.bugcrowd+json` on every request (both already handled
by Plan 1's platform-aware API client). Responses are JSON:API-style paginated.
Base URL is `https://api.bugcrowd.com`. Severity uses P1–P5 notation.

The Vite dev proxy (`/api/bugcrowd/*` → `https://api.bugcrowd.com`) is added in Plan 1.

---

## Commits (2)

### Commit A — Bugcrowd API endpoints and Worker proxy methods

**New file: `app/src/api/endpoints/bugcrowd.ts`**

Define normalized types and fetch helpers:

```typescript
export interface BugcrowdEngagement {
  id: string
  name: string
  code: string             // short identifier / slug
  status: 'open' | 'closed'
  submission_count: number
}

export interface BugcrowdSubmission {
  id: string
  title: string
  severity: 'p1' | 'p2' | 'p3' | 'p4' | 'p5'
  state: 'new' | 'triaged' | 'unresolved' | 'resolved' | 'not_applicable' | 'duplicate'
  submitted_at: string   // ISO 8601
  engagement_id: string
}

// GET /engagements — paginated; unwrap JSON:API data[] to BugcrowdEngagement[]
export async function bcGetEngagements(): Promise<BugcrowdEngagement[]>

// GET /engagements/{id}/submissions — paginated; unwrap data[] to BugcrowdSubmission[]
export async function bcGetEngagementSubmissions(engagementId: string): Promise<BugcrowdSubmission[]>
```

**`reports/userModules/interpreter.ts` — `handleApiProxy()`**: add:
```typescript
case 'bc_getEngagements':            return bcGetEngagements()
case 'bc_getEngagementSubmissions':  return bcGetEngagementSubmissions(args[0] as string)
```

**`reports/userModules/moduleWorker.ts` — `FETCH_CTX`**: add:
```typescript
bc_getEngagements: () => apiProxy('bc_getEngagements', []),
bc_getEngagementSubmissions: (id: string) => apiProxy('bc_getEngagementSubmissions', [id]),
```

**`reports/userModules/types.ts` — `FetchCtx`**: add both Bugcrowd methods.

---

### Commit B — Bugcrowd built-in report modules and fixtures

**New fixture file: `reports/bugcrowdSubmissions/fixtures.ts`**

60-record synthetic dataset matching `BugcrowdSubmission` shape:
- 3 engagement IDs (`bc-eng-001`, `bc-eng-002`, `bc-eng-003`)
- Mix of P1–P5 severities (realistic distribution: mostly P3/P4)
- Mix of all 6 states
- Dates spanning 3 months

**New specs:**

`reports/bugcrowdEngagementOverview/spec.ts`:
- `platform: 'bugcrowd'`, `category: 'snapshot'`
- `customFetchData`: calls `ctx.bc_getEngagements()`
- `customTransform`: one row per engagement (name, code, status, submission_count);
  bar chart of submission counts; summary = total engagements
- `sampleFixtureData`: 3-engagement inline subset

`reports/bugcrowdSubmissions/spec.ts`:
- `platform: 'bugcrowd'`, `category: 'triage'`
- `customFetchData`: calls `ctx.bc_getEngagements()`, then
  `ctx.bc_getEngagementSubmissions(id)` per engagement, flattens results
- `customTransform`: group by severity (P1–P5); stacked bar chart with state breakdown;
  summary cards for total, P1+P2 count, resolved
- `params.includeDateRange: true`
- `sampleFixtureData`: from fixture file

Register both specs in `reports/registry.ts → BUILT_IN_SPECS`.

---

## Verification

1. `npx tsc --noEmit` clean
2. Mock mode: both Bugcrowd modules render correctly with fixture data
3. Platform filter "Bugcrowd" in ReportSelector shows only these 2 modules
4. Live connection (real Bugcrowd credentials): verify DevTools shows
   `Authorization: Token user:token` and `Accept: application/vnd.bugcrowd+json` headers
5. Live: `bcGetEngagements()` returns a flat array (pagination + JSON:API unwrap working)
