# Intigriti Reporting Workbench

A local, private reporting tool for [Intigriti](https://www.intigriti.com/) API data. All computation happens on your machine — your API token never leaves your browser except to reach the Intigriti API directly.

> **Quick start with sample data (no API key needed)**
> ```bash
> cd app && npm install && npm run dev:mock
> ```
> Open **http://localhost:5173** and click any report to see it immediately.

---

## Contents

- [Requirements](#requirements)
- [Install](#install)
- [Run the tool](#run-the-tool)
- [Connect to your Intigriti account](#connect-to-your-intigriti-account)
- [Generate reports with your own data](#generate-reports-with-your-own-data)
- [Save your configuration](#save-your-configuration)
- [Local data cache](#local-data-cache)
- [Build a new report module](#build-a-new-report-module)
- [Package a module for sharing](#package-a-module-for-sharing)
- [Install a shared module](#install-a-shared-module)
- [Package a full release](#package-a-full-release)
- [Security model](#security-model)
- [Project structure](#project-structure)
- [Troubleshooting](#troubleshooting)

---

## Requirements

| Requirement | Version |
|---|---|
| Node.js | 18 or newer |
| npm | 9 or newer |
| A modern browser | Chrome, Edge, Firefox, or Safari |

Check your versions:
```bash
node --version   # should print v18.x.x or higher
npm --version    # should print 9.x.x or higher
```

---

## Install

### Option A — from a release zip

If someone gave you a `.zip` file:

```bash
unzip intigriti-reporting-workbench-*.zip
cd intigriti-reporting-workbench
./start.sh
```

Dependencies are installed automatically on the first run. Open **http://localhost:5173** in your browser.

---

### Option B — from source

```bash
git clone <repository-url>
cd Reporting-Workbench/app
npm install
```

> **Screenshot: terminal after `npm install` completes**
> *(add a screenshot here showing a clean install with no errors)*

---

## Run the tool

### With your live Intigriti data

```bash
cd app
npm run dev
```

Open **http://localhost:5173**. You will see the **API Connection** panel — proceed to [Connect to your Intigriti account](#connect-to-your-intigriti-account).

---

### With built-in sample data (no API key)

```bash
cd app
npm run dev:mock
```

All reports load instantly from bundled fixture data. Use this to explore the tool, develop new modules, or demo the workbench without credentials.

> **Screenshot: the workbench home screen in mock mode**
> *(shows the header bar, Cache Folder and Encryption panels, mock mode banner, and report tile grid)*

---

## Connect to your Intigriti account

The **API Connection** panel is shown automatically when the tool starts. Two authentication modes are available.

### Bearer token (recommended for individual use)

1. Log in to Intigriti.
2. Go to **Admin › Integrations › Intigriti API**.
3. Create a new API connection. Select **non-expiring** for a token that persists without re-authentication.
4. Copy the generated Bearer token.
5. In the workbench, select **Bearer Token**, paste your token, and click **Test & Connect**.

> **Screenshot: the API Connection panel in Bearer Token mode**
> *(shows the password input field and "Test & Connect" button)*

Once connected, the panel collapses and a green **network icon** appears in the header bar. The programs accessible with your token are listed inside the panel (click the icon to expand it again).

> **Screenshot: the header bar after connecting**
> *(shows the green network icon, gray folder and lock icons, and the "Save Config" button)*

---

### OAuth 2.0 (for teams or programmatic use)

1. In Intigriti **Admin › Integrations › Intigriti API**, create a connection with a redirect URI of:
   ```
   http://localhost:5173/oauth/callback
   ```
2. Note the **Client ID** and **Client Secret** (the secret is only shown once).
3. In the workbench, select **OAuth 2.0**, enter your credentials, and click **Authorise with Intigriti**.
4. You are redirected to Intigriti to sign in. After authorising, you are redirected back automatically.

---

### Remember your token across sessions

Enable **Remember on this device** before connecting. This stores your token in browser localStorage so the workbench reconnects automatically next time you open it.

> **Security warning:** browser localStorage is unencrypted. Do not enable this on shared, public, or untrusted devices.

---

## Generate reports with your own data

After connecting, the report tile grid appears beneath the header.

> **Screenshot: the report tile grid**
> *(shows four report cards: Daily Triage Movement, Weekly Triage Summary, Bounty Budget Overview, Submission Status Snapshot, and Raw API Explorer)*

### Select a report

Click any report tile to open it. A **sample preview** loads immediately from bundled data so you can see the chart and table layout before generating live data.

> **Screenshot: Daily Triage Movement with sample preview**
> *(shows the config panel with program selector and date range, the "Sample Preview" badge, a bar chart, and the data table)*

### Configure parameters

1. **Select programs** — choose one or more programs from the checkbox list. Use **Select All** or **Select None** to quickly change the selection.
2. **Set a date range** — use the quick-select buttons (Last 90 days, Month to date, etc.) or pick custom dates.
3. **Multi-program view** — when 2+ programs are selected, choose:
   - **Combine** — merges all program data into a single dataset
   - **Compare** — plots each program as a separate series on the chart

> **Screenshot: program selector with multiple programs chosen and Compare mode active**
> *(shows the multi-select list with checkboxes, the Compare/Combine toggle, and the chart showing separate colored series per program)*

### Generate the report

Click **Generate Report**. The workbench fetches data from the Intigriti API and renders the full report.

> **Screenshot: a completed live report**
> *(shows summary cards at the top, a line chart, and the data table with real program data)*

### Export the report

Below the table, use the export buttons to save your results:

| Button | Output |
|---|---|
| **Download CSV** | Spreadsheet-ready table data |
| **Download JSON** | Raw structured data for processing |
| **Copy chart image** | Chart as a PNG image for presentations |
| **Export PDF** | Full report as a PDF — credentials are automatically hidden |

### Switch between reports

Click a different tile in the report grid to switch. Your current report's settings (program selection, date range) are remembered — switching back restores them.

Click the **same tile** again to collapse the report panel and see only the tile grid.

---

## Save your configuration

Click **Save Config** in the header bar to persist your report settings to browser storage. The next time you open the workbench (or restart the dev server), your program selections and date ranges are restored automatically after you connect.

> **Screenshot: the "Save Config" button in the header bar**
> *(shows the button before and after clicking, with the "Saved!" confirmation)*

> Program selections are stored as **position indices** (1, 2, 3 …) rather than program names or IDs, so no identifiable program data is written to browser storage.

---

## Local data cache

The workbench can save API responses to a folder on your disk. Cached data is used for instant repeat runs and historical look-back without hitting the API again.

### Enable the cache

After connecting, click the **folder icon** in the header bar to open the **Cache Folder** panel.

> **Screenshot: the Cache Folder panel**
> *(shows the "Select cache folder…" button and the security warning)*

Click **Select cache folder…**, choose a local directory, and confirm. Once selected, the panel collapses and the folder icon turns green.

> Cache files may contain sensitive vulnerability data. Store them on a trusted, private device.

### Encryption

Click the **lock icon** in the header bar to open the **Encryption** panel. Three modes are available:

| Mode | Description |
|---|---|
| **None** | Files saved as plain JSON. Suitable only on fully private devices. |
| **Use API token** | AES-256-GCM encryption keyed to your API token. Anyone with your token can decrypt. |
| **Custom passphrase** | Strongest option. You must provide the same passphrase to read cached files back. |

> **Screenshot: the Encryption panel with "Custom passphrase" selected**
> *(shows the passphrase input and "Set Key" button)*

---

## Build a new report module

Report modules are self-contained TypeScript files. Adding one requires creating a single directory and registering it — no changes to the core app.

See [REPORT_MODULE_GUIDE.md](./REPORT_MODULE_GUIDE.md) for the full guide. The steps in brief:

### 1. Create the module directory

```bash
mkdir app/src/reports/myReport
```

Create `app/src/reports/myReport/index.ts` using the template in the guide.

### 2. Implement the module

A module exports one object that implements `ReportModule`:

```typescript
export const myReport: ReportModule = {
  id: 'myReport',
  title: 'My Report',
  description: 'What this report shows.',
  category: 'snapshot',           // 'triage' | 'bounty' | 'snapshot' | 'developer'

  paramFields: [
    { key: 'programIds', label: 'Programs', type: 'programSelect', required: true },
    { key: 'startDate',  label: 'Start Date', type: 'dateRange',   required: false },
    { key: 'endDate',    label: 'End Date',   type: 'dateRange',   required: false },
  ],

  async fetchData(params) {
    // fetch raw data from the API
  },

  transform(raw, params): ReportData {
    // convert raw data into rows, chartData, summaryCards
  },

  tableColumns: [ ... ],
  chartConfig: { type: 'bar', xKey: 'date', series: [...] },
  exportConfig: { csvFilename: 'my-report', ... },
  samplePreview,   // pre-computed from fixture data — renders instantly
}
```

### 3. Register the module

Open `app/src/reports/registry.ts`:

```typescript
import { myReport } from './myReport'       // add this

const ALL_MODULES: ReportModule[] = [
  ...existingReports,
  myReport,                                  // add this
]
```

The report card appears immediately in the workbench — no restart needed.

> **Screenshot: a custom module appearing in the report grid**
> *(shows the newly added tile card alongside the built-in reports)*

### 4. Test without an API key

```bash
npm run dev:mock
```

Click your report tile. The `samplePreview` renders immediately. Click **Generate Report** — `fetchData` is called with fixture data. Once mock mode works, switch to `npm run dev` with a real token.

---

## Package a module for sharing

Once your report module is working, create a shareable zip so others can drop it into their workbench:

```bash
cd app
npm run package:module -- dailyTriageMovement
```

This creates `dist/inti-module-dailyTriageMovement.zip` containing just the `src/reports/dailyTriageMovement/` directory.

> **Screenshot: terminal output of `npm run package:module`**
> *(shows the "Module packaged →" success line and the output path)*

Send the `.zip` file to whoever needs it. They install it in one command — see below.

---

## Install a shared module

If someone sends you an `inti-module-*.zip` file:

```bash
cd app
npm run install:module -- /path/to/inti-module-myReport.zip
```

The module is extracted into `src/reports/`. The command prints exactly what to add to `registry.ts`.

> **Screenshot: terminal output of `npm run install:module`**
> *(shows the extracted path and the two lines to add to registry.ts)*

Then follow the printed instructions:

```typescript
// app/src/reports/registry.ts
import { myReport } from './myReport'   // add this line

const ALL_MODULES: ReportModule[] = [
  ...existing,
  myReport,                              // add this entry
]
```

Reload the workbench — the new report card appears in the grid.

---

## Package a full release

To bundle the entire workbench (source + docs + start scripts) into a zip for distribution:

```bash
cd app
npm run package
```

Or from the project root:

```bash
bash scripts/package.sh
```

Output: `dist/intigriti-reporting-workbench-<version>-<date>.zip`

The zip contains:
- `start.sh` — double-click or run to launch (installs npm dependencies on first use)
- `start-mock.sh` — launch in mock mode, no API key needed
- `app/` — full source code
- `README.md` and `REPORT_MODULE_GUIDE.md`
- `scripts/package.sh` — module packaging utility

Recipients who have Node.js installed can be up and running in under a minute:

```bash
unzip intigriti-reporting-workbench-*.zip
cd intigriti-reporting-workbench
./start.sh         # installs deps + opens on http://localhost:5173
```

---

## Security model

| Guarantee | How it is enforced |
|---|---|
| API token never logged | Redacted from all `console.*` calls; filtered from error messages |
| API token never in exports | `data-no-print` attribute hides credential panels in PDF/print output; token excluded from CSV/JSON exports |
| API token only sent to Intigriti | Vite dev-server proxy forwards requests only to `app.intigriti.com` |
| Token not stored unless you opt in | `enableLocalStorage()` is only called when the user explicitly checks "Remember on this device" |
| Program data not stored in config | Saved config uses 1-based position indices, not program IDs or names |
| CORS handled locally | No third-party proxy — the Vite server runs on your machine |

---

## Project structure

```
app/
  src/
    api/          API client, Zod-validated types, and endpoint helpers
    auth/         In-memory token store and OAuth 2.0 flow
    cache/        File System Access API integration and AES-256-GCM encryption
    components/   Shared React UI components (panels, charts, tables, export)
    config/       API base URL, mock mode flag, and config persistence
    fixtures/     Bundled sample JSON for mock mode and sample previews
    reports/      Report module definitions and central registry
    utils/        Date helpers, CSV export, image capture, secret redaction
  public/
    fonts/        Montserrat and Open Sans served locally
    intigriti-logo.svg
  index.html
  vite.config.ts  Vite dev-server proxy configuration

scripts/
  package.sh      Release packaging and module install/export utilities
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `npm run dev` throws "command not found" | Install Node.js 18+ from nodejs.org |
| "Network error" or "Failed to fetch" | The Vite dev server must be running — CORS is handled by the local proxy |
| 401 Unauthorized | Your token has expired. Click the network icon → Disconnect → reconnect |
| 403 Forbidden | Your token lacks the required API scope. Check your Intigriti API configuration |
| 429 Too Many Requests | The API is rate-limiting. Wait a few seconds; the app retries automatically |
| OAuth callback not working | Ensure the redirect URI in Intigriti admin exactly matches `http://localhost:5173/oauth/callback` |
| Cache folder not appearing after page reload | The browser File System Access API requires re-selecting the folder each session. Use "Save Config" + re-select the folder after reload |
| Encrypted cache files unreadable | You must provide the same passphrase used when the files were written |
| Report module not showing after install | Check that you added the import and array entry to `src/reports/registry.ts` |
| TypeScript error after installing a module | Run `npm install` if the module has new dependencies listed in a `package.json` inside the zip |
