# Report Module Guide

This guide explains how to add a new report module to the Intigriti Reporting Workbench. The codebase is structured so that a new report can be added by creating one directory and registering it — no changes to core app logic required.

---

## What a report module is

A report module is a self-contained TypeScript object that:
- Declares its own parameters (program selector, date range, etc.)
- Knows which API endpoints to call
- Transforms raw API data into summary cards, table rows, and chart data
- Includes bundled fixture data for sample preview
- Handles its own CSV/JSON/image export filenames

All report modules implement the `ReportModule` interface from `src/reports/types.ts`.

---

## Minimal template

Copy this into `src/reports/myNewReport/index.ts`:

```typescript
import type { ReportModule, ReportData, ReportParams } from '../types'
import { getProgramSubmissions } from '../../api/endpoints/programs'

// 1. Sample fixture data — used for preview before the user generates a live report
import sampleData from '../../fixtures/submissions.sample.json'

function transformData(raw: unknown, params: ReportParams): ReportData {
  const submissions = raw as any[] // replace with actual type

  // TODO: transform your data here
  const rows = submissions.slice(0, 10).map(s => ({
    code: s.code,
    title: s.title,
    status: s.state.status.value,
  }))

  return {
    rows,
    chartData: rows,
    summaryCards: [
      { label: 'Total', value: rows.length },
    ],
    rawData: raw,
  }
}

const samplePreview = transformData(sampleData, { programId: 'prog-alpha-001' })

export const myNewReport: ReportModule = {
  id: 'myNewReport',                          // must be unique
  title: 'My New Report',
  description: 'Short description shown on the report selector card.',
  category: 'snapshot',                        // 'triage' | 'bounty' | 'snapshot' | 'developer'
  requiredScopes: ['core_platform:read'],
  isAvailable: () => true,                     // return false to hide the report

  // Parameters the user fills in before generating
  paramFields: [
    { key: 'programId', label: 'Program', type: 'programSelect', required: true },
    { key: 'startDate', label: 'Start Date', type: 'dateRange', required: false },
  ],

  // Called when the user clicks Generate Report
  async fetchData(params) {
    if (!params.programId) throw new Error('Program is required')
    return getProgramSubmissions(params.programId as string)
  },

  transform: transformData,

  // Column definitions for the TanStack Table
  tableColumns: [
    { accessorKey: 'code', header: 'Code' },
    { accessorKey: 'title', header: 'Title' },
    { accessorKey: 'status', header: 'Status' },
  ],

  // Set to null if this report has no chart
  chartConfig: {
    type: 'bar',                // 'bar' | 'stackedBar' | 'line' | 'composed' | 'donut'
    xKey: 'status',
    series: [{ key: 'count', label: 'Count', color: '#FF5C00' }],
  },

  summaryFormatter(data) {
    return `Found ${data.rows.length} submissions.`
  },

  exportConfig: {
    csvFilename: 'my-new-report',
    jsonFilename: 'my-new-report',
    imageFilename: 'my-new-report-chart',
    getCsvRows: (data) => data.rows,
  },

  sampleData,
  samplePreview,
}
```

---

## Step 2 — Register the module

Open `src/reports/registry.ts` and add two lines:

```typescript
import { myNewReport } from './myNewReport'    // add this import

const ALL_MODULES: ReportModule[] = [
  dailyTriageMovement,
  weeklyTriageSummary,
  bountyBudgetOverview,
  submissionStatusSnapshot,
  rawApiExplorer,
  myNewReport,                                  // add this entry
]
```

The report will immediately appear in the report selector.

---

## Available API helpers

All helpers respect mock mode automatically.

| Helper | File | Returns |
|---|---|---|
| `getPrograms()` | `api/endpoints/programs.ts` | `ProgramOverviewViewModel[]` |
| `getProgramDetail(id)` | `api/endpoints/programs.ts` | `ProgramDetailViewModel` (includes budget) |
| `getProgramSubmissions(id, updatedSince?)` | `api/endpoints/programs.ts` | `SubmissionOverviewViewModel[]` |
| `getAllSubmissions(updatedSince?)` | `api/endpoints/submissions.ts` | `SubmissionOverviewViewModel[]` |
| `getAllPayouts()` | `api/endpoints/payouts.ts` | `PayoutViewModel[]` |
| `getAllRewardRequests()` | `api/endpoints/payouts.ts` | `RewardRequestOverviewViewModel[]` (auto-paginated) |
| `getRewardBudget()` | `api/endpoints/payouts.ts` | `RewardBudget` |

To call any other endpoint directly: `import { apiGet } from '../../api/client'` and call `apiGet<YourType>('/your-path')`.

---

## Date utilities

```typescript
import { unixToDateString, unixToWeekLabel, daysBetween, formatDate, isoToDate } from '../../utils/dates'

unixToDateString(submission.createdAt)  // → '2025-07-28'
unixToWeekLabel(submission.createdAt)   // → '2025-07-28' (week-start Monday)
daysBetween(submission.createdAt)       // → 14
```

---

## Testing your report

1. Run `npm run dev:mock` to use fixture data — no API key required.
2. Click your report card — the sample preview renders immediately from `samplePreview`.
3. Select a program and click Generate Report — `fetchData` is called with fixture data.
4. Once working with mock data, run `npm run dev` and connect with a real API token.

---

## Tips

- Keep `fetchData` simple — fetch raw data, don't transform it there.
- The `transform` function is called with both live and sample data, so keep it pure and free of side effects.
- `isAvailable` receives the `AppContext` (programs list, token state) — use it to hide reports that need data that isn't available (e.g., hide a reward system report if `reward_system:read` scope isn't confirmed).
- Chart data (`chartData`) and table data (`rows`) can be different shapes — `rows` is what goes into the table, `chartData` is what Recharts receives.
