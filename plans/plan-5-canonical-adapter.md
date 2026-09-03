# Plan 5 — Canonical Adapter

**Status:** IMPLEMENTED FIRST (runs before Plans 1, 2, 3)

## Purpose

Introduce `PlatformId`, canonical schema types, and a normalized adapter layer so
report modules can work across platforms without knowing platform-specific API shapes.
This plan also introduces the three canonical FETCH_CTX methods
(`getPrograms`, `getSubmissions`, `getPayouts`) that downstream modules use.

Intigriti adapters are fully implemented here. Bugcrowd and HackerOne adapters are
stubbed and completed in Plans 2 and 3 respectively.

---

## Commits

### Commit 1 — Canonical types + Intigriti adapter

Files created:
- `app/src/platforms/types.ts` — `PlatformId` union type
- `app/src/platforms/canonical.ts` — `CanonicalProgram`, `CanonicalSubmission`, `CanonicalPayout`
- `app/src/platforms/adapters/intigriti.ts` — Intigriti → canonical converters
- `app/src/platforms/adapters/index.ts` — dispatch by platform (stubs for BC/H1)

### Commit 2 — Canonical FETCH_CTX methods

Files updated:
- `app/src/reports/userModules/types.ts` — add `getPrograms`, `getSubmissions`, `getPayouts` to `FetchCtx`; add `platform?: PlatformId | PlatformId[]` to `UserModuleSpec`
- `app/src/reports/userModules/interpreter.ts` — add canonical method cases to `handleApiProxy`
- `app/src/reports/userModules/moduleWorker.ts` — add canonical entries to `FETCH_CTX`

### Commit 3 — Migrate built-in modules to canonical + add platform field

Files updated:
- `app/src/reports/dailyTriageMovement/spec.ts`
- `app/src/reports/weeklyTriageSummary/spec.ts`
- `app/src/reports/bountyBudgetOverview/spec.ts`
- `app/src/reports/submissionStatusSnapshot/spec.ts`
- `app/src/reports/rawApiExplorer/spec.ts`

Each spec gets `platform: 'intigriti'`.
Specs whose `customFetchData` calls `ctx.getProgramSubmissions` are updated to
optionally also call `ctx.getSubmissions` if a canonical call is preferred —
but backward compatibility is preserved: the existing `getProgramSubmissions`,
`getAllPayouts`, and `getProgramDetail` methods remain available.

---

## Canonical Schema

```typescript
// PlatformId — canonical identifier for each supported platform
export type PlatformId = 'intigriti' | 'hackerone' | 'bugcrowd'

// CanonicalProgram — normalized program/engagement across platforms
export interface CanonicalProgram {
  id: string                        // platform-scoped ID
  platform: PlatformId
  name: string
  handle: string                    // slug/shortname
  logoUrl: string | null
  status: 'active' | 'paused' | 'closed' | 'unknown'
  type: 'public' | 'private' | 'unknown'
  url: string | null
}

// Canonical severity enum (worst→best)
export type CanonicalSeverity = 'critical' | 'high' | 'medium' | 'low' | 'informational' | 'unknown'

// Canonical submission state
export type CanonicalState =
  | 'new'
  | 'triaged'
  | 'resolved'
  | 'closed'
  | 'invalid'
  | 'duplicate'
  | 'unknown'

// CanonicalSubmission — normalized submission/report across platforms
export interface CanonicalSubmission {
  id: string
  platform: PlatformId
  programId: string
  title: string
  severity: CanonicalSeverity
  state: CanonicalState
  submittedAt: number                // epoch ms
  updatedAt: number | null
  payoutAmount: number | null        // in USD
  payoutCurrency: string | null
  researcherHandle: string | null
  url: string | null
}

// CanonicalPayout — normalized payout across platforms
export interface CanonicalPayout {
  id: string
  platform: PlatformId
  submissionId: string | null
  programId: string | null
  amount: number
  currency: string
  paidAt: number | null
  researcherHandle: string | null
  type: 'bounty' | 'bonus' | 'other'
}
```

---

## Severity Normalization Table

| Intigriti          | HackerOne    | Bugcrowd | Canonical      |
|--------------------|--------------|----------|----------------|
| Critical           | critical     | P1       | critical       |
| High               | high         | P2       | high           |
| Medium             | medium       | P3       | medium         |
| Low                | low          | P4       | low            |
| Exceptional/Info   | informational| P5       | informational  |

---

## State Normalization Table

| Intigriti State       | HackerOne State      | Bugcrowd State         | Canonical  |
|-----------------------|----------------------|------------------------|------------|
| Pending / Awaiting    | new                  | new                    | new        |
| Triaging              | triaged              | triaged                | triaged    |
| Resolved              | resolved             | resolved               | resolved   |
| Closed / N/A          | not-applicable       | closed                 | closed     |
| Invalid               | informational        | not-applicable         | invalid    |
| Duplicate             | duplicate            | duplicate              | duplicate  |
