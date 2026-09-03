# Plan 5: Canonical Data Adapter Layer

## Prerequisites

Plans 1, 2, and 3 must be complete.

## Goal

Replace platform-specific FETCH_CTX methods (`ctx.bc_getEngagementSubmissions`,
`ctx.h1_getReports`, `ctx.getProgramSubmissions`) with a universal set of
canonical methods (`ctx.getPrograms`, `ctx.getSubmissions`, `ctx.getPayouts`)
that work identically regardless of which platform the user is connected to.

**Primary support**: a module explicitly built for a platform using its specific types.
**Byproduct support**: a module built against canonical methods runs automatically on
any platform that implements the adapter — no forking, no custom development.

After this plan, the existing Intigriti triage modules automatically work on
Bugcrowd and HackerOne, because they call `ctx.getSubmissions()` and the
adapter normalizes each platform's data into a shared schema.

---

## Canonical schema

**New file: `app/src/platforms/canonical.ts`**

```typescript
export type CanonicalSeverity = 'critical' | 'high' | 'medium' | 'low' | 'none'
export type CanonicalState = 'new' | 'triaged' | 'resolved' | 'closed' | 'invalid' | 'duplicate'

export interface CanonicalProgram {
  id: string
  handle: string       // slug / short code
  name: string
  status: 'active' | 'paused' | 'closed'
}

export interface CanonicalSubmission {
  id: string
  title: string
  severity: CanonicalSeverity
  state: CanonicalState
  created_at: string   // ISO 8601
  program_id: string   // matches CanonicalProgram.id
  bounty_amount: number | null
  currency: string | null
}

export interface CanonicalPayout {
  id: string
  amount: number
  currency: string
  submission_id: string | null
  paid_at: string   // ISO 8601
}
```

---

## Platform adapters

**New directory: `app/src/platforms/adapters/`**

One file per platform, each exporting three functions:

```typescript
// platforms/adapters/intigriti.ts
export function adaptPrograms(raw: IntigritiProgram[]): CanonicalProgram[]
export function adaptSubmissions(raw: IntigritiSubmission[]): CanonicalSubmission[]
export function adaptPayouts(raw: IntigritiPayout[]): CanonicalPayout[]

// platforms/adapters/bugcrowd.ts
export function adaptPrograms(raw: BugcrowdEngagement[]): CanonicalProgram[]
export function adaptSubmissions(raw: BugcrowdSubmission[]): CanonicalSubmission[]
export function adaptPayouts(raw: BugcrowdReward[]): CanonicalPayout[]
// Requires new endpoint: bcGetRewards() (add in this plan)

// platforms/adapters/hackerone.ts
export function adaptPrograms(raw: H1Program[]): CanonicalProgram[]
export function adaptSubmissions(raw: H1Report[]): CanonicalSubmission[]
export function adaptPayouts(raw: H1Bounty[]): CanonicalPayout[]
// Requires new endpoint: h1GetBounties() (add in this plan)
```

**`platforms/adapters/index.ts`** — dispatch adapter based on active platform:
```typescript
export function adaptPrograms(platform: PlatformId, raw: unknown[]): CanonicalProgram[]
export function adaptSubmissions(platform: PlatformId, raw: unknown[]): CanonicalSubmission[]
export function adaptPayouts(platform: PlatformId, raw: unknown[]): CanonicalPayout[]
```

### Severity normalization table

| Intigriti | Bugcrowd | HackerOne       | Canonical  |
|-----------|----------|-----------------|------------|
| S1        | P1       | critical        | critical   |
| S2        | P2       | high            | high       |
| S3        | P3       | medium          | medium     |
| S4        | P4       | low             | low        |
| S5        | P5       | none            | none       |

### State normalization table

| Intigriti        | Bugcrowd        | HackerOne         | Canonical  |
|-----------------|-----------------|-------------------|------------|
| new / pending   | new             | new               | new        |
| accepted        | triaged         | triaged           | triaged    |
| closed          | resolved        | resolved          | resolved   |
| archived        | —               | —                 | closed     |
| rejected        | not_applicable  | not-applicable    | invalid    |
| duplicate       | duplicate       | duplicate         | duplicate  |

---

## Canonical FETCH_CTX methods

**`reports/userModules/interpreter.ts` — `handleApiProxy()`**: add three canonical cases
that delegate to the active platform's raw fetch + adapter:

```typescript
case 'getPrograms': {
  const p = getActivePlatform()
  const raw = await platformGetPrograms(p)        // calls bc/h1/inti fetch
  return adaptPrograms(p, raw as unknown[])        // → CanonicalProgram[]
}
case 'getSubmissions': {
  const p = getActivePlatform()
  const raw = await platformGetSubmissions(p, args[0] as string | undefined)
  return adaptSubmissions(p, raw as unknown[])     // → CanonicalSubmission[]
}
case 'getPayouts': {
  const p = getActivePlatform()
  const raw = await platformGetPayouts(p)
  return adaptPayouts(p, raw as unknown[])         // → CanonicalPayout[]
}
```

**`reports/userModules/moduleWorker.ts` — `FETCH_CTX`**: add:
```typescript
getPrograms: () => apiProxy('getPrograms', []),
getSubmissions: (programId?: string) => apiProxy('getSubmissions', [programId]),
getPayouts: () => apiProxy('getPayouts', []),
```

**`reports/userModules/types.ts` — `FetchCtx`**: add the three canonical methods.

---

## Refactor existing built-in modules

Update the `customFetchData` and `customTransform` bodies in existing specs
to prefer canonical methods where applicable:

| Module | Old call | New call |
|--------|----------|----------|
| `weeklyTriageSummary` | `ctx.getProgramSubmissions(id)` | `ctx.getSubmissions(id)` |
| `dailyTriageMovement` | `ctx.getProgramSubmissions(id)` | `ctx.getSubmissions(id)` |
| `bountyBudgetOverview` | `ctx.getAllPayouts()` | `ctx.getPayouts()` |
| `bugcrowdSubmissions` (Plan 3) | `ctx.bc_getEngagementSubmissions(id)` | `ctx.getSubmissions(id)` |
| `hackeroneActivity` (Plan 2) | `ctx.h1_getReports()` | `ctx.getSubmissions()` |

Platform-specific modules that rely on non-canonical fields (e.g. Bugcrowd `code`,
HackerOne `substate`) retain their platform-specific `ctx.*` calls alongside canonical ones.

---

## Multi-platform module badges

Update `UserModuleSpec`:
```typescript
platform?: PlatformId | PlatformId[]
// Single value = primary platform (one badge)
// Array = multi-platform support (multiple badges)
```

After refactoring, modules using only canonical methods set:
```typescript
platform: ['intigriti', 'bugcrowd', 'hackerone']
```
These render three badges in the report card and are visible regardless of which
platform filter is active.

The `platform?: PlatformId | PlatformId[]` union in `UserModuleSpec` must remain
backward compatible with the single-value `platform?: PlatformId` set in Plans 1–3.

---

## Commits (3)

1. `feat(platforms): canonical data schema and platform adapters`
   - `platforms/canonical.ts`
   - `platforms/adapters/{intigriti,bugcrowd,hackerone,index}.ts`
   - New payout endpoints: `bcGetRewards()`, `h1GetBounties()`

2. `feat(platforms): canonical FETCH_CTX proxy methods (getPrograms, getSubmissions, getPayouts)`
   - `interpreter.ts` — three new canonical cases in `handleApiProxy`
   - `moduleWorker.ts` — three new FETCH_CTX entries
   - `types.ts` — FetchCtx additions
   - `platform?: PlatformId | PlatformId[]` type update in UserModuleSpec + ReportModule

3. `refactor(modules): migrate built-in modules to canonical ctx methods; add multi-platform badges`
   - Update customFetchData bodies in 5 existing specs
   - Set `platform: ['intigriti', 'bugcrowd', 'hackerone']` on canonical modules

---

## Verification

1. `npx tsc --noEmit` clean throughout
2. All existing Intigriti modules still work in mock mode after the refactor
3. `weeklyTriageSummary` renders with triple-platform badges
4. Connected to Bugcrowd (mock): `getSubmissions()` returns `CanonicalSubmission[]`
   with P1 → `critical` mapping confirmed
5. Connected to HackerOne (mock): `getSubmissions()` returns `CanonicalSubmission[]`
   with `not-applicable` → `invalid` mapping confirmed
6. Adding a 4th future platform: only the adapter file and platform config are new;
   all canonical modules automatically gain byproduct support
