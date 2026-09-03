# Plan 4: Future Platform Implementation Guide

## Prerequisites

Plans 1, 2, and 3 must be complete (so the guide documents a proven pattern).

## Goal

Write a single reference document that lets a developer add a new platform to the
Reporting Workbench by following a checklist — no architectural decisions required.

---

## Deliverable

**New file: `PLATFORM_GUIDE.md`** in the repository root.

Single commit: `docs: add PLATFORM_GUIDE.md for future platform implementations`

---

## Contents outline

### 1. Overview

Brief description of the platform abstraction layer:
- `PlatformId` union type in `platforms/registry.ts`
- `PlatformConfig` drives auth header format, Accept header, badge appearance, and OAuth config
- All API calls route through a Vite dev proxy prefix per platform
- Report modules carry a `platform` field and are filtered/badged in the UI accordingly
- Canonical adapter layer (Plan 5) provides platform-agnostic FETCH_CTX methods

### 2. Supported auth types

| `authType`   | Authorization header format      | Use case |
|-------------|----------------------------------|----------|
| `bearer`    | `Bearer <token>`                 | Intigriti token / OAuth access token |
| `token-pair`| `Token <username>:<token>`       | Bugcrowd |
| `basic`     | `Basic base64(<id>:<token>)`     | HackerOne |

If the new platform needs a different format, add a new `authType` variant to the union
in `registry.ts` and handle it in `api/client.ts`.

### 3. Step-by-step checklist

```
[ ] 1. Add PlatformId
       In platforms/registry.ts: extend the PlatformId union with the new platform slug.

[ ] 2. Add PlatformConfig entry
       In platforms/registry.ts: add an entry to PLATFORMS with:
       - id, name, shortName, color, textColor
       - devProxyPrefix (e.g. '/api/newplatform')
       - authType (reuse existing or add new)
       - acceptHeader if required
       - oauth config if supported
       - docsUrl, tokenHint

[ ] 3. Add Vite proxy entry
       In vite.config.ts: add a proxy entry for the new devProxyPrefix
       pointing to the platform's API base URL.

[ ] 4. Add auth UI branch in ApiKeyPanel.tsx
       If the authType is already handled (bearer/token-pair/basic), no code change needed.
       Otherwise add a new input form branch for the new auth type.

[ ] 5. Add endpoint file
       New file: app/src/api/endpoints/<platform>.ts
       - Define normalized TypeScript types for the platform's key objects
         (programs, submissions/reports, payouts/rewards)
       - Implement fetch helpers that unwrap pagination and envelope formats
         into flat arrays — callers should never see raw API envelopes

[ ] 6. Expand Worker proxy allow-list
       In reports/userModules/interpreter.ts — handleApiProxy():
         Add a case for each new endpoint function, prefixed with the platform slug.
       In reports/userModules/moduleWorker.ts — FETCH_CTX:
         Add a corresponding proxy call for each new method.
       In reports/userModules/types.ts — FetchCtx:
         Add the method signatures.

[ ] 7. Add platform adapter (Plan 5 pattern)
       New file: platforms/adapters/<platform>.ts
       Implement adaptPrograms(), adaptSubmissions(), adaptPayouts()
       that map the platform's types to CanonicalProgram / CanonicalSubmission / CanonicalPayout.
       Register the adapter in platforms/adapters/index.ts.

[ ] 8. Add built-in report specs
       New directory: reports/<platformSlug><ReportName>/
       Each spec requires:
       - platform: '<platformId>'
       - Fixture data file (fixtures.ts) with realistic synthetic records
       - customFetchData body calling the new ctx.* methods
       - customTransform body mapping to ReportData
       - sampleFixtureData pointing at the fixture file

[ ] 9. Register specs
       Add new specs to reports/registry.ts → BUILT_IN_SPECS.

[ ] 10. Test
        - npx tsc --noEmit — must be clean
        - Mock mode: new modules render with fixture data
        - Platform filter shows only the new platform's modules when selected
        - Live: verify correct Authorization and Accept headers in DevTools
        - Canonical modules (Plan 5) automatically work with the new platform
          once the adapter is registered
```

### 4. Canonical adapter contract (Plan 5)

Platforms that implement all three adapter functions gain automatic compatibility
with any report module built against the canonical FETCH_CTX methods:

```typescript
adaptPrograms(raw: unknown[]): CanonicalProgram[]
adaptSubmissions(raw: unknown[]): CanonicalSubmission[]
adaptPayouts(raw: unknown[]): CanonicalPayout[]
```

Severity normalization convention:
- Map the platform's severity tiers to `critical | high | medium | low | none`
- Use the most common industry mapping (P1/S1/Critical → critical, etc.)

State normalization convention:
- Map to `new | triaged | resolved | closed | invalid | duplicate`

### 5. Known limitations and considerations

- **CORS**: The Vite proxy handles CORS in development. In production, the app must
  be served behind a proxy or the platform API must have CORS headers permitting the origin.
- **Rate limits**: Document the platform's rate limit in the PlatformConfig (future field)
  so modules can be designed with appropriate batching.
- **OAuth**: Only Intigriti supports PKCE OAuth currently. If a new platform supports OAuth,
  add its config to `oauth?` in PlatformConfig and wire up the flow in `auth/oauth.ts`.
- **Pagination**: Different platforms paginate differently (cursor, page/size, offset).
  Handle pagination inside the endpoint helper — never expose it to module code.
- **Session storage key conflict**: The OAuth PKCE handshake uses sessionStorage keys
  prefixed `wb_oauth_*`. If another platform adds OAuth support, these keys must be
  namespaced by platform.
