# Platform Guide

Reporting Workbench CE supports three bug bounty platforms. This guide explains
how to connect your account and what mock data is available for each.

---

## Intigriti

**API base:** `https://api.intigriti.com/external/company`
**Auth:** Bearer token (or OAuth 2.0 PKCE)
**Dev proxy:** `/intigriti-api/*`

### Getting an API token

1. Log into the Intigriti platform as a company user.
2. Navigate to **Admin › Integrations › Intigriti API**.
3. Generate or copy your access token.
4. Paste it into the **Live API** token field in the app.

Alternatively, use the Swagger UI at
`https://api.intigriti.com/external/company/swagger` to authorize with your
Client ID and Secret and copy the `access_token` from the response.

### OAuth 2.0 (PKCE)

1. Register an OAuth application in the Intigriti portal.
2. Add `http://localhost:1337/oauth/callback` as an allowed redirect URI (dev).
3. In the app, click **Use OAuth 2.0 instead →** and enter your Client ID.

### Mock data

The built-in mock data set contains:
- 8 programs across a mix of public and private types
- ~400 submissions with realistic severity and state distributions across 2025–2026
- Payout records covering bounty and bonus types

---

## HackerOne

**API base:** `https://api.hackerone.com/v1`
**Auth:** HTTP Basic (`Authorization: Basic base64(identifier:token)`)
**Dev proxy:** `/h1-api/*`

### Getting API credentials

1. Log into HackerOne and navigate to **Settings › API tokens**.
2. Create a new token and note your **Identifier** (your username or email).
3. In the app:
   - Select **HackerOne** from the platform picker.
   - Enter your **Identifier** in the first field.
   - Enter your **API Token** in the second field.
   - Click **Validate & Connect**.

### Scopes

HackerOne API tokens are scoped at creation time. The app uses:
- `programs:read` — to list programs you belong to
- `reports:read` — to fetch vulnerability reports

### Mock data

50 synthetic HackerOne reports are included, spanning:
- Multiple severity levels (critical, high, medium, low, informational)
- States: new, triaged, resolved, informational, duplicate, not-applicable
- Bounty amounts in USD
- A mix of researcher handles

---

## Bugcrowd

**API base:** `https://api.bugcrowd.com`
**Auth:** Token pair (`Authorization: Token username:token`)
**Accept header:** `application/vnd.bugcrowd+json`
**Dev proxy:** `/bc-api/*`

### Getting API credentials

1. Log into Bugcrowd and navigate to **Settings › API**.
2. Create a new API token.
3. In the app:
   - Select **Bugcrowd** from the platform picker.
   - Enter your **Username** in the first field.
   - Enter your **API Token** in the second field.
   - Click **Validate & Connect**.

### Mock data

60 synthetic Bugcrowd submissions are included, spanning:
- Priority levels P1–P5 (mapped to canonical critical→informational)
- States: new, triaged, resolved, not-applicable, duplicate
- Engagement IDs and target assets

---

## Platform-aware Report Modules

Each built-in module declares which platforms it supports via the `platform` field.
The **ReportSelector** shows platform filter chips when more than one platform is
represented in your module list. Selecting a platform filters the visible modules.

| Module                     | Platform(s)                       |
|----------------------------|-----------------------------------|
| Daily Triage Movement      | Intigriti                         |
| Weekly Triage Summary      | Intigriti                         |
| Bounty Budget Overview     | Intigriti                         |
| Submission Status Snapshot | Intigriti                         |
| Raw API Explorer           | Intigriti                         |
| HackerOne Reports Overview | HackerOne                         |
| HackerOne Activity         | HackerOne                         |
| Bugcrowd Engagement Summary| Bugcrowd                          |
| Bugcrowd Submission List   | Bugcrowd                          |

User-created modules that do not specify a `platform` field appear under all platforms.

---

## Canonical Adapter

Internally, the app normalizes platform data into a canonical schema:

| Field            | Type                                                                 |
|------------------|----------------------------------------------------------------------|
| `severity`       | `critical \| high \| medium \| low \| informational \| unknown`     |
| `state`          | `new \| triaged \| resolved \| closed \| invalid \| duplicate \| unknown` |

This allows custom report modules to use `ctx.getPrograms()`,
`ctx.getSubmissions(programId)`, and `ctx.getPayouts()` without knowing which
platform is active. Results are always `CanonicalProgram[]`,
`CanonicalSubmission[]`, or `CanonicalPayout[]`.

### Severity mapping

| Intigriti    | HackerOne      | Bugcrowd | Canonical      |
|--------------|----------------|----------|----------------|
| Critical     | critical       | P1       | critical       |
| High         | high           | P2       | high           |
| Medium       | medium         | P3       | medium         |
| Low          | low            | P4       | low            |
| Exceptional  | informational  | P5       | informational  |

### State mapping

| Intigriti state       | HackerOne state      | Bugcrowd state   | Canonical  |
|-----------------------|----------------------|------------------|------------|
| Pending / Awaiting    | new                  | new              | new        |
| Triaging              | triaged              | triaged          | triaged    |
| Resolved / Accepted   | resolved             | resolved         | resolved   |
| Closed                | not-applicable       | closed           | closed     |
| Invalid / N/A         | informational        | not-applicable   | invalid    |
| Duplicate             | duplicate            | duplicate        | duplicate  |

---

## Security notes

- API tokens are **never** logged to the console, included in exports, or sent to
  any URL other than the configured platform API base URL.
- When **Remember on this device** is enabled, the token is encrypted with AES-GCM
  (256-bit) and stored in localStorage. The decryption key is session-scoped
  (sessionStorage) and cleared when the tab closes.
- Token keys are platform-namespaced (`intigriti_wb_token`, `hackerone_wb_token`,
  `bugcrowd_wb_token`) to prevent cross-platform credential mix-up.
