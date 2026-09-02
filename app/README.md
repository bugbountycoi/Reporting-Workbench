# Reporting Workbench Community Edition

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
- [Disclaimer](#disclaimer)
- [Choose a data source](#choose-a-data-source)
- [Generate reports](#generate-reports)
- [Save your configuration](#save-your-configuration)
- [Local data cache](#local-data-cache)
- [Themes](#themes)
- [Build a new report module](#build-a-new-report-module)
- [Share a report module](#share-a-report-module)
- [Import a shared module](#import-a-shared-module)
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
unzip reporting-workbench-*.zip
cd reporting-workbench
./start.sh
```

**Windows (Command Prompt)**
```
double-click start.bat
```
or from CMD:
```
cd reporting-workbench
start.bat
```

**Windows (PowerShell)**

PowerShell may block unsigned scripts by default. If `start.ps1` is blocked, run this once to allow local scripts:
```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```
Then:
```powershell
cd reporting-workbench
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

## Disclaimer

When the workbench first opens, a disclaimer modal appears. You must read and acknowledge it before the app becomes accessible.

This is a **community-built framework** — it is a starting point for further development, not a finished product, and is not affiliated with or endorsed by any company. You are responsible for reviewing, adapting, and hardening it to meet your own requirements.

Click the **ⓘ info icon** in the header at any time to re-read the disclaimer.

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

Once connected, a green dot and your accessible programs appear in the panel. The workbench also probes which Intigriti API versions are online — if multiple supported versions are available, a version chip row appears so you can switch between them.

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

## Themes

The workbench supports switchable themes — portable JSON packages that control colours, fonts, logo, and footer text.

### Switch themes

Click the **palette icon** (🎨) in the header to open the Theme Switcher. Two themes are built in:

| Theme | Description |
|---|---|
| **Intigriti** | Default — dark navy and blue palette, Montserrat + Open Sans fonts |
| **Community Edition** | Teal and robins-egg blue palette, system fonts |

Click any theme name to activate it instantly — no page reload required. Your choice persists in browser storage across sessions.

### Install a theme from a file

1. Click the palette icon to open the Theme Switcher.
2. Click **Install from file**.
3. Select a `.json` theme package file.

### Install a theme from a URL

1. Click the palette icon to open the Theme Switcher.
2. Click **Install from URL**.
3. Paste a URL pointing to a publicly hosted theme JSON file (e.g. a GitHub release asset).
4. Click **Install**.

> If the URL's server does not allow cross-origin requests (CORS), download the file manually and use **Install from file** instead.

### The ThemeSpec format

A theme package is a plain JSON file with this shape:

```json
{
  "id": "my-theme",
  "name": "My Theme",
  "author": "Your Name",
  "version": "1.0.0",
  "colors": {
    "navy": "#0f3f45",
    "navyLight": "#174f57",
    "navyMid": "#1f6470",
    "blue": "#00B4D8",
    "blueDark": "#0096B7",
    "blueLight": "#38C9E0",
    "orange": "#E99C4A",
    "orangeDark": "#C47E35",
    "red": "#F03157",
    "green": "#02A87C",
    "gold": "#E0AC00",
    "sky": "#B2EBF2",
    "grayDark": "#4a5568",
    "grayMid": "#718096",
    "grayLight": "#E2E8F0",
    "offWhite": "#F0FDFD",
    "nearWhite": "#F7FFFE"
  },
  "fonts": {
    "heading": "system-ui, -apple-system, sans-serif",
    "body": "system-ui, -apple-system, sans-serif"
  },
  "logoSvg": "<svg>...</svg>",
  "footerText": "Community Edition — data stays on your device"
}
```

`logoSvg` is an SVG string rendered in the header. Dark-path SVGs appear correctly against the header background — a CSS filter inverts them to white automatically. `footerText` appears in the page footer after "Reporting Workbench — ".

### Remove a user-installed theme

Open the Theme Switcher, hover over the theme row, and click the **✕** that appears on the right. Built-in themes cannot be removed.

---

## Build a new report module

The workbench includes an in-app **Report Builder** — a 6-step wizard that lets you create custom report modules without writing any code. For modules that need custom logic, a JavaScript escape hatch is available.

### Open the builder

In the report tile grid, click the **"Create report module"** dashed tile at the end of the grid.

### Steps at a glance

| Step | What you configure |
|---|---|
| **1 — Basics** | Title, description, category, module ID, author, version |
| **2 — Data** | Which API data source and which parameter fields to expose |
| **3 — Group & Metrics** | Declarative group-by + aggregations, or custom JavaScript functions |
| **4 — Visualisation** | Chart type, axis labels, series colours |
| **5 — Columns** | Table column keys and labels |
| **6 — Preview** | Live render against sample data — click **Save module** to finish |

The module appears immediately in the tile grid after saving.

### Custom JavaScript

Step 3 offers a **Custom JavaScript** mode for logic the declarative settings can't express. Two functions are available: `customFetchData(ctx, params)` (async — calls the API and returns raw data) and `customTransform(ctx, raw, params)` (sync — shapes data into rows, chart data, and summary cards).

See [REPORT_MODULE_GUIDE.md](./REPORT_MODULE_GUIDE.md) for the full context API reference and examples.

> **Security:** custom JavaScript runs with the same browser privileges as the rest of the app. Only load modules containing custom code from sources you trust.

---

## Share a report module

Any module — including the five built-in ones — can be exported as a portable `.rwce-module.json` file:

1. In the report tile grid, hover over the module you want to share.
2. Click the **Export** icon on the tile.
3. A `.rwce-module.json` file downloads to your device.

Send the file to whoever needs it. They import it in seconds — see below.

---

## Import a shared module

### From a file

If someone sends you a `.rwce-module.json` file:

1. Click **Import file ↑** at the top right of the report tile grid.
2. Select one or more `.rwce-module.json` files in the file picker.
3. If a module contains custom JavaScript, a security confirmation prompt appears before it is loaded.
4. The module appears immediately in the tile grid and persists across sessions (stored in browser localStorage).

### From a URL

To import a module published online (e.g. a GitHub release asset or gist):

1. Click **Import from URL ↗** at the top right of the report tile grid.
2. Paste the direct URL to the `.rwce-module.json` file.
3. Press **Enter** or click **Import**.
4. If the module contains custom JavaScript, a security confirmation prompt appears before it is loaded.

> If the server does not allow cross-origin requests (CORS), download the file manually and use the file importer instead.

### Remove a module

Click the **Delete** icon on the module tile. Built-in modules cannot be deleted.

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
dist/reporting-workbench-0.2.005.zip
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
| Theme/module URL fetching | Fetch calls go directly from your browser to the URL you provide — no intermediary |

---

## Project structure

```
app/
  src/
    api/            API client, Zod-validated types, and endpoint helpers
    auth/           In-memory token store and OAuth 2.0 flow
    cache/          File System Access API integration and AES-256-GCM encryption
    components/     Shared React UI components (panels, charts, tables, export)
    config/         API base URL, mock/cache mode flags, and config persistence
    fixtures/       Bundled sample JSON for mock mode and sample previews
    reports/        Report module specs, central registry, and user module store
    themes/         ThemeSpec types, built-in themes, apply/store/loader utilities
    utils/          Date helpers, CSV export, image capture, secret redaction
  public/
    fonts/          Montserrat and Open Sans served locally
    intigriti-logo.svg
  index.html
  vite.config.ts    Vite dev-server proxy configuration

scripts/
  package.sh        Release packaging script

server.mjs          Standalone production server (no npm install needed)
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
| Imported module not appearing | Refresh the page; confirm any security prompt that appears when loading modules with custom JavaScript |
| Module lost after browser data clear | Re-import the `.rwce-module.json` file — user modules are stored in browser localStorage |
| Theme URL install fails with CORS error | Download the theme JSON file and use **Install from file** instead |
| Theme lost after browser data clear | Re-install the theme from file or URL — user themes are stored in browser localStorage |
