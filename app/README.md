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
- [Choose a data source](#choose-a-data-source)
- [Generate reports](#generate-reports)
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
| Node.js (includes npm) | 18 or newer |
| A modern browser | Chrome, Edge, Firefox, or Safari |

npm is bundled with Node.js — installing Node.js is all you need.

**Don't have Node.js?** The official installer covers all platforms:
[https://nodejs.org/en/download](https://nodejs.org/en/download)

Check your versions after installing:
```bash
node --version   # should print v18.x.x or higher
npm --version    # should print 9.x.x or higher
```

---

## Install

### Option A — from a release zip

If someone gave you a `.zip` file, unzip it and launch with the script for your platform:

**macOS / Linux**
```bash
unzip intigriti-reporting-workbench-*.zip
cd intigriti-reporting-workbench
./start.sh
```

**Windows (Command Prompt)**
```
double-click start.bat
```
or from CMD:
```
cd intigriti-reporting-workbench
start.bat
```

**Windows (PowerShell)**

PowerShell may block unsigned scripts by default. If `start.ps1` is blocked, run this once to allow local scripts:
```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```
Then:
```powershell
cd intigriti-reporting-workbench
.\start.ps1
```

Open **http://localhost:1337** in your browser after the server starts.

---

### Option B — from source

```bash
git clone <repository-url>
cd Reporting-Workbench/app
npm install
```

---

## Run the tool

### Development server (source install)

```bash
cd app
npm run dev
```

Opens at **http://localhost:5173**.

### With built-in sample data (no API key)

```bash
cd app
npm run dev:mock
```

All reports load instantly from bundled fixture data. Use this to explore the tool, develop new modules, or demo the workbench without credentials.

---

## Choose a data source

The **Data Source** panel is shown automatically when the tool starts. Three modes are available:

### Mock Data

Click **Mock Data** to connect instantly using built-in fixture data. No Intigriti account or API key required. Ideal for exploring the tool or developing report modules.

### Local Cache

Click **Local Cache** to load data from a folder previously populated by the workbench during a Live API session. No internet connection or API key is needed at load time — data is served entirely from disk.

1. Click **Local Cache** — a folder picker opens immediately.
2. Navigate to the folder you used as your cache folder in a previous session.
3. If the folder contains valid cached data, the workbench connects and shows your programs.

The Data Source panel shows how recent the cached data is after connecting.

> If the folder has no cached data, connect via **Live API** first and enable the Cache Folder (see [Local data cache](#local-data-cache)).

### Live API

Click **Live API** to connect to your live Intigriti data. Two authentication modes are available:

#### Bearer token (recommended for individual use)

1. Log in to Intigriti.
2. Go to **Admin › Integrations › Intigriti API**.
3. Create a new API connection. Select **non-expiring** for a token that persists without re-authentication.
4. Copy the generated Bearer token.
5. In the workbench, paste your token into the **Bearer Token** field and click **Validate & Connect**.

Once connected, a green dot and your accessible programs appear in the panel.

#### OAuth 2.0 (for teams or programmatic use)

1. In Intigriti **Admin › Integrations › Intigriti API**, create a connection with a redirect URI matching your server port, e.g.:
   ```
   http://localhost:1337/oauth/callback
   ```
   The workbench displays the exact URL to use in the Data Source panel after you start the server.
2. Note the **Client ID** and **Client Secret** (the secret is only shown once).
3. In the workbench, click **Use OAuth 2.0 instead →**, enter your credentials, and click **Authorise with Intigriti**.
4. You are redirected to Intigriti to sign in. After authorising, you are redirected back automatically.

#### Remember your token across sessions

Enable **Remember on this device** before connecting. This stores your token in browser localStorage so the workbench reconnects automatically next time.

> **Security warning:** browser localStorage is unencrypted. Do not enable this on shared, public, or untrusted devices.

---

## Generate reports

After connecting, the report tile grid appears beneath the header.

### Select a report

Click any report tile to open it. A **sample preview** loads immediately from bundled data so you can see the chart and table layout before generating live data.

### Configure parameters

1. **Select programs** — choose one or more programs from the checkbox list. Use **Select All** or **Select None** to quickly change the selection.
2. **Set a date range** — use the quick-select buttons (Last 90 days, Month to date, etc.) or pick custom dates.
3. **Multi-program view** — when 2+ programs are selected, choose:
   - **Combine** — merges all program data into a single dataset
   - **Compare** — plots each program as a separate series on the chart

### Generate the report

Click **Generate Report**. The workbench fetches data (from the API, cache, or fixtures depending on your data source) and renders the full report.

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

Click **Save Config** in the header bar to persist your report settings to browser storage. The next time you open the workbench, your program selections and date ranges are restored automatically after you connect.

> Program selections are stored as **position indices** (1, 2, 3 …) rather than program names or IDs, so no identifiable program data is written to browser storage.

---

## Local data cache

The workbench can save API responses to a folder on your disk. Cached data enables instant repeat runs, offline reporting via **Local Cache** mode, and historical look-back without hitting the API again.

### Enable the cache

After connecting via **Live API**, click the **folder icon** in the header bar to open the **Cache Folder** panel. Click **Select cache folder…**, choose a local directory, and confirm.

Once a folder is active, the panel shows an index of all cached files: endpoint, scope, age, size, and whether the file is encrypted. Use **Refresh** to reload the index after running reports.

> Cache files may contain sensitive vulnerability data. Store them on a trusted, private device.

### Encryption

Click the **lock icon** in the header bar to open the **Encryption** panel. Three modes are available:

| Mode | Description |
|---|---|
| **None** | Files saved as plain JSON. Suitable only on fully private devices. |
| **Use API token** | AES-256-GCM encryption keyed to your API token. Anyone with your token can decrypt. |
| **Custom passphrase** | Strongest option. You must provide the same passphrase to read cached files back. |

### Using cached data offline

Once you have cache files, switch to **Local Cache** in the Data Source panel and select the same folder. The workbench loads all data from disk — no API key or internet connection required.

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

### 4. Test without an API key

```bash
npm run dev:mock
```

Click your report tile. The `samplePreview` renders immediately. Click **Generate Report** — `fetchData` is called with fixture data. Once mock mode works, switch to `npm run dev` with a real token.

---

## Package a module for sharing

Once your report module is working, create a shareable zip:

```bash
cd app
npm run package:module -- dailyTriageMovement
```

This creates `dist/inti-module-dailyTriageMovement.zip` containing just the `src/reports/dailyTriageMovement/` directory.

Send the `.zip` file to whoever needs it. They install it in one command — see below.

---

## Install a shared module

If someone sends you an `inti-module-*.zip` file:

```bash
cd app
npm run install:module -- /path/to/inti-module-myReport.zip
```

The module is extracted into `src/reports/`. The command prints exactly what to add to `registry.ts`.

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

To bundle the entire workbench into a self-contained zip for distribution:

```bash
cd app
npm run package
```

Or from the project root:

```bash
bash scripts/package.sh
```

Each run auto-increments the build number and produces a file like:

```
dist/intigriti-reporting-workbench-0.2.005.zip
```

The zip contains only the pre-built app — no source code:

| File | Purpose |
|---|---|
| `start.sh` | Launch on macOS / Linux |
| `start.bat` | Launch on Windows (CMD / double-click) |
| `start.ps1` | Launch on Windows (PowerShell) |
| `server.mjs` | Standalone Node.js server — no `npm install` required |
| `dist/` | Pre-built app (all three data source modes included) |
| `README.md` | This file |

Recipients who have Node.js installed can be up and running in under a minute.

---

## Security model

| Guarantee | How it is enforced |
|---|---|
| API token never logged | Redacted from all `console.*` calls; filtered from error messages |
| API token never in exports | `data-no-print` attribute hides credential panels in PDF/print output; token excluded from CSV/JSON exports |
| API token only sent to Intigriti | Dev-server proxy and standalone server forward requests only to `api.intigriti.com` |
| Token not stored unless you opt in | `enableLocalStorage()` is only called when the user explicitly checks "Remember on this device" |
| Program data not stored in config | Saved config uses 1-based position indices, not program IDs or names |
| CORS handled locally | No third-party proxy — the server runs on your machine |

---

## Project structure

```
app/
  src/
    api/          API client, Zod-validated types, and endpoint helpers
    auth/         In-memory token store and OAuth 2.0 flow
    cache/        File System Access API integration and AES-256-GCM encryption
    components/   Shared React UI components (panels, charts, tables, export)
    config/       API base URL, mock/cache mode flags, and config persistence
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

server.mjs        Standalone production server (no npm install needed)
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `npm run dev` throws "command not found" | Install Node.js 18+: [nodejs.org/en/download](https://nodejs.org/en/download) |
| "Network error" or "Failed to fetch" | The server must be running — CORS is handled by the local proxy |
| 401 Unauthorized | Your token has expired. Click the network icon → Disconnect → reconnect |
| 403 Forbidden | Your token lacks the required API scope. Check your Intigriti API configuration |
| 429 Too Many Requests | The API is rate-limiting. Wait a few seconds; the app retries automatically |
| OAuth callback not working | Ensure the redirect URI in Intigriti admin exactly matches the port the server is running on |
| `start.ps1` blocked on Windows | Run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` in PowerShell once, then retry |
| Cache folder not appearing after reload | The File System Access API requires re-selecting the folder each session |
| Encrypted cache files unreadable | You must provide the same passphrase used when the files were written |
| Local Cache: "no cached programs found" | Connect via Live API first with a cache folder active, then run at least one report |
| Report module not showing after install | Check that you added the import and array entry to `src/reports/registry.ts` |
| TypeScript error after installing a module | Run `npm install` if the module has new dependencies listed in its zip |
