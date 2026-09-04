# Plan 2 — HackerOne Support

**Status:** Implemented after Plans 5, 1, 4
**Prerequisites:** Plans 5 (canonical schema, PlatformId, adapter index) and 1 (platform registry, PLATFORMS map) must be complete.

## Purpose

Add full HackerOne support: raw API types, endpoint helpers, canonical adapter,
two report modules, and 50 synthetic fixtures.

---

## Commits

### Commit 1 — H1 API layer + canonical adapter

Files created:
- `app/src/api/endpoints/hackerone.ts` — H1Program, H1Report types + h1GetPrograms, h1GetReports helpers
- `app/src/platforms/adapters/hackerone.ts` — h1 → canonical adapter (replaces the stub in index.ts)

Files updated:
- `app/src/platforms/adapters/index.ts` — wire hackerone adapter (remove stub error)
- `app/src/reports/userModules/types.ts` — add h1_getPrograms, h1_getReports to FetchCtx
- `app/src/reports/userModules/moduleWorker.ts` — add h1_ entries to FETCH_CTX
- `app/src/reports/userModules/interpreter.ts` — add h1_ cases to handleApiProxy

### Commit 2 — H1 fixtures + report modules

Files created:
- `app/src/reports/hackeroneReportsOverview/fixtures.ts` — 50 synthetic H1Report records
- `app/src/reports/hackeroneReportsOverview/spec.ts` — HackerOne Reports Overview module
- `app/src/reports/hackeroneActivity/spec.ts` — HackerOne Activity module

Files updated:
- `app/src/reports/registry.ts` — register both new modules

---

## HackerOne API Shape

HackerOne uses JSON:API envelope (`data: [...], links: {...}`).

```typescript
interface H1Program {
  id: string                // numeric string
  handle: string
  name: string
  state: 'open' | 'soft_launch' | 'closed' | 'suspended'
  offers_bounties: boolean
  submission_state: 'open' | 'closed'
  website: string | null
  profile_picture: string | null
}

interface H1Report {
  id: string
  title: string
  state: 'new' | 'pending-program-review' | 'triaged' | 'needs-more-info'
        | 'resolved' | 'not-applicable' | 'informational' | 'duplicate'
        | 'spam' | 'retesting'
  severity: { rating: 'none' | 'low' | 'medium' | 'high' | 'critical'; score: number | null } | null
  bounty_amount: string | null  // decimal string
  currency: string
  created_at: string            // ISO 8601
  closed_at: string | null
  weakness: { id: string; name: string } | null
  relationships: {
    program: { data: { id: string; type: 'program' } }
  }
}
```

### Pagination (JSON:API)

```typescript
// GET /v1/hackers/me/reports?page[number]=1&page[size]=100
interface H1Response<T> {
  data: T[]
  links: { self: string; next?: string; prev?: string; first?: string; last?: string }
}
```

---

## Canonical Adapter Notes

HackerOne severity `none` → canonical `informational`
HackerOne `not-applicable` → canonical `invalid`
HackerOne `informational` → canonical `invalid` (it means "not a valid issue")
HackerOne `spam` → canonical `invalid`

---

## Mock Data

50 synthetic H1Report records covering 2025–2026, 3 programs, realistic
severity/state/bounty distributions. Used for Mock mode fixture loading.
