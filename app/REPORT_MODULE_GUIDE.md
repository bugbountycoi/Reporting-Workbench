# Report Module Guide

This guide covers creating, customising, exporting, and importing report modules in the Reporting Workbench Community Edition. No TypeScript or coding knowledge is required for basic modules; a JavaScript escape hatch is available for advanced logic.

---

## What a report module is

A report module bundles everything needed to produce a report:

- Which API data to fetch (submissions, payouts, or programs)
- How to group and aggregate that data
- What chart and table to render
- Which parameters (program selector, date range) to expose to the user
- Sample fixture data for an instant preview before live data is fetched

All modules — including the five that ship with the workbench — use the same `UserModuleSpec` JSON format and are treated identically at runtime.

---

## Create a module with the Report Builder

The in-app Report Builder lets you create a module through a guided 6-step wizard.

### Open the builder

In the report tile grid, click the **"Create report module"** dashed tile at the end of the list. To edit an existing custom module, click the **Edit** icon on its tile instead.

---

### Step 1 — Basics

| Field | Description |
|---|---|
| **Title** | Short display name shown on the tile |
| **Description** | One-sentence summary shown beneath the title |
| **Category** | Groups the tile in the selector: `triage`, `bounty`, `snapshot`, or `developer` |
| **ID** | Unique machine key; lower-camelCase, no spaces — e.g. `myCustomReport` |
| **Author** | Your name or team name, shown on the tile |
| **Version** | Semantic version string, e.g. `1.0.0` |
| **Export filename** | Default base name used when the user downloads CSV or JSON |

---

### Step 2 — Data

**Data source** — choose which API data the module fetches:

| Source | What it loads |
|---|---|
| `submissions` | All submissions for the selected programs |
| `payouts` | All reward payouts across the account |
| `programs` | Program metadata (name, handle, status, budget) |

**Parameter fields** — choose which inputs to expose to the user when the report is open:

| Parameter | Description |
|---|---|
| Program selector | Lets the user pick one or more programs |
| Start date | Start of a date-range filter |
| End date | End of a date-range filter |

---

### Step 3 — Group & Metrics

Two modes are available. Switch between them with the toggle at the top of the step.

#### Declarative mode

Define grouping and aggregation without writing code:

- **Group by** — the field used to produce one row per distinct value (e.g. `status`, `week`)
- **Metrics** — one or more numeric aggregations per group: `count`, `sum`, `average`, `min`, or `max`
- **Sort** — sort output by any metric, ascending or descending

#### Custom JavaScript mode

For logic the declarative options can't express. See [Custom JavaScript](#custom-javascript) below.

---

### Step 4 — Visualisation

| Setting | Description |
|---|---|
| **Chart type** | Default chart: `bar`, `stackedBar`, `line`, `composed`, `donut`, or `none` |
| **X-axis label** | Label shown on the horizontal axis |
| **Y-axis label** | Label shown on the vertical axis |
| **Allowed chart types** | Which chart-type buttons the user can choose from |
| **Series colours** | Custom hex colour per data series |

---

### Step 5 — Columns

Define the table columns displayed beneath the chart:

- **Key** — field name on each row object produced by your transform
- **Label** — column header text shown to the user

Use the up/down buttons to reorder columns. Add or remove entries freely.

---

### Step 6 — Preview

The builder runs your module against the built-in sample fixture data and renders the result — summary cards, chart, and the first 10 table rows. Use this to verify the output before saving.

Click **Save module** to add the module to the workbench. It appears immediately in the tile grid.

---

## Custom JavaScript

The **Custom JavaScript** mode in Step 3 lets you provide two optional functions that replace the declarative group-and-aggregate pipeline.

> **Security note:** custom JavaScript runs with the same browser privileges as the rest of the app. Only load modules containing custom code from sources you trust. The workbench shows a confirmation prompt whenever you import a module that includes custom code.

---

### `customFetchData(ctx, params)`

An **async** function that calls the API and returns raw data. If omitted, the workbench fetches from the data source you selected in Step 2.

```javascript
async function customFetchData(ctx, params) {
  const programIds = params.programIds ?? []
  const results = await Promise.all(
    programIds.map(id => ctx.apiGet(`/programs/${id}/submissions`))
  )
  return results.flat()
}
```

**`ctx` — available helpers:**

| Property | Type | Description |
|---|---|---|
| `apiGet(path, params?)` | `async (string, object?) => any` | Authenticated GET; path is relative to the active API version base (e.g. `/programs`) |
| `programs` | `ProgramOverviewViewModel[]` | All programs visible to the authenticated user |

**`params` — user-supplied inputs** (values present only if you enabled the corresponding field in Step 2):

| Key | Type | Description |
|---|---|---|
| `programIds` | `string[]` | Selected program IDs |
| `startDate` | `string \| undefined` | ISO date string, e.g. `'2025-01-01'` |
| `endDate` | `string \| undefined` | ISO date string |

---

### `customTransform(ctx, raw, params)`

A **sync** function that receives the data returned by `customFetchData` (or the built-in fetch) and must return a `ReportData` object.

```javascript
function customTransform(ctx, raw, params) {
  const byStatus = {}
  for (const s of raw) {
    const key = s.state.status.value
    byStatus[key] = (byStatus[key] ?? 0) + 1
  }
  const rows = Object.entries(byStatus).map(([status, count]) => ({ status, count }))
  return {
    rows,
    chartData: rows,
    summaryCards: [
      { label: 'Total',    value: raw.length },
      { label: 'Statuses', value: rows.length },
    ],
    rawData: raw,
  }
}
```

**`ctx` — date utilities:**

| Helper | Returns | Description |
|---|---|---|
| `daysBetween(unixTs)` | `number` | Days elapsed since the given Unix timestamp |
| `unixToDateString(unixTs)` | `string` | `'YYYY-MM-DD'` |
| `unixToWeekLabel(unixTs)` | `string` | ISO week start date (Monday) |
| `formatDate(dateStr)` | `string` | Locale-aware display string |

**Return shape:**

```javascript
return {
  rows: [...],           // array of objects — one per table row
  chartData: [...],      // array of objects — what Recharts receives
  summaryCards: [        // chips shown above the chart
    { label: 'Total', value: 42 },
    { label: 'Status', value: 'Active' },
  ],
  rawData: raw,          // passed through to JSON export
}
```

`rows` and `chartData` can be different arrays — the table and chart can display different shapes of data.

---

## Export a module

1. In the tile grid, hover over the module tile you want to share.
2. Click the **Export** icon.
3. A `.rwce-module.json` file is downloaded.

The file contains the complete `UserModuleSpec` — title, description, parameters, logic, and sample fixture data. Send it to anyone who needs the module; no source code installation is required on their end.

Built-in modules (the five that ship with the workbench) can also be exported.

---

## Import a module

### From a file

1. Click **Import file ↑** at the top right of the report tile grid.
2. Select one or more `.rwce-module.json` files from the file picker.
3. If a module contains `customFetchData` or `customTransform`, a security confirmation appears before it is loaded.
4. The module appears immediately in the tile grid and is stored in browser localStorage, persisting across sessions.

### From a URL

To import a module published online (e.g. a GitHub release asset or gist):

1. Click **Import from URL ↗** at the top right of the report tile grid.
2. Paste the direct URL to a `.rwce-module.json` file.
3. Press **Enter** or click **Import**.
4. If the module contains custom JavaScript, a security confirmation appears before it is loaded.

> If the server does not support CORS, download the file manually and use the file importer instead.

### Remove a module

Click the **Delete** icon on its tile. Built-in modules cannot be deleted.

---

## The UserModuleSpec format

Exported `.rwce-module.json` files are plain JSON. You can write one by hand or edit an exported file — useful when scripting bulk creation or tweaking colours without reopening the wizard.

```json
{
  "id": "myCustomReport",
  "title": "My Custom Report",
  "description": "Short description shown on the tile.",
  "category": "snapshot",
  "author": "Your Name",
  "version": "1.0.0",
  "exportFilename": "my-custom-report",

  "dataSource": "submissions",
  "customParamFields": [
    { "key": "programIds", "label": "Programs",   "type": "programSelect", "required": true  },
    { "key": "startDate",  "label": "Start date", "type": "dateRange",     "required": false },
    { "key": "endDate",    "label": "End date",   "type": "dateRange",     "required": false }
  ],

  "groupBy": "status",
  "metrics": [
    { "key": "count", "label": "Count", "aggregation": "count" }
  ],
  "sortBy": "count",
  "sortDir": "desc",

  "chartType": "bar",
  "xAxisLabel": "Status",
  "yAxisLabel": "Count",
  "allowedChartTypes": ["bar", "donut"],
  "seriesColors": { "count": "#FF5C00" },

  "tableColumns": [
    { "key": "status", "label": "Status" },
    { "key": "count",  "label": "Count"  }
  ],

  "sampleFixtureData": [],
  "sampleFixtureParams": { "programIds": ["prog-alpha-001"] }
}
```

To use custom JavaScript instead of the declarative pipeline, add string-encoded function bodies:

```json
{
  "customFetchData": "async function customFetchData(ctx, params) { ... }",
  "customTransform": "function customTransform(ctx, raw, params) { ... }"
}
```

When custom functions are present they take precedence over `groupBy`/`metrics`.

### Valid values

| Field | Valid values |
|---|---|
| `category` | `"triage"` `"bounty"` `"snapshot"` `"developer"` |
| `dataSource` | `"submissions"` `"payouts"` `"programs"` |
| `customParamFields[].type` | `"programSelect"` `"dateRange"` `"text"` `"select"` |
| `metrics[].aggregation` | `"count"` `"sum"` `"average"` `"min"` `"max"` |
| `chartType` | `"bar"` `"stackedBar"` `"line"` `"composed"` `"donut"` `"none"` |
| `sortDir` | `"asc"` `"desc"` |

---

## Available API endpoints

All endpoints respect mock mode automatically.

| Path | Method | Returns |
|---|---|---|
| `/programs` | GET | `ProgramOverviewViewModel[]` |
| `/programs/{id}` | GET | `ProgramDetailViewModel` (includes budget) |
| `/programs/{id}/submissions` | GET | `SubmissionOverviewViewModel[]` |
| `/submissions` | GET | `SubmissionOverviewViewModel[]` (all programs) |
| `/payouts` | GET | `PayoutViewModel[]` |

Call any path via `ctx.apiGet(path)` in `customFetchData`. The path is relative to the active API version base — do not include `/api/v2`.

---

## Tips

- **Develop without an API key**: switch the workbench to **Mock Data** mode. The Step 6 preview also uses fixture data — no connection needed while you build.
- **Keep `customFetchData` simple** — fetch and return raw data; don't transform inside it. Put all logic in `customTransform`.
- **`rows` and `chartData` can differ** — the table and chart are independent; shape each array for its own purpose.
- **Summary card values**: numeric values render as a large number; string values render as plain text.
- **Editing a built-in module**: built-in modules cannot be edited in-place. Export the module first, then import the exported file to create a user-owned editable copy.
- **Version your modules**: increment `version` whenever you share an update so recipients know whether they have the latest.
- **Sharing via URL**: host your `.rwce-module.json` file on any static server (GitHub releases, GitHub Pages, a CDN). Recipients can paste the direct URL into the **Import from URL** field — no file download required.
