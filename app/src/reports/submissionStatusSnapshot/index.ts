import type { ReportModule, ReportData, ReportParams, ChartConfig } from '../types'
import { getProgramSubmissions } from '../../api/endpoints/programs'
import type { SubmissionOverviewViewModel } from '../../api/types'
import { daysBetween } from '../../utils/dates'
import submissionsSample from '../../fixtures/submissions.sample.json'
import { BC, BRAND_COMPARE_COLORS } from '../../themes/brandColors'

type AgeBucket = '0-2 days' | '3-7 days' | '8-14 days' | '15-30 days' | '30+ days'

const AGE_BUCKETS: AgeBucket[] = ['0-2 days', '3-7 days', '8-14 days', '15-30 days', '30+ days']

function ageBucket(days: number): AgeBucket {
  if (days <= 2) return '0-2 days'
  if (days <= 7) return '3-7 days'
  if (days <= 14) return '8-14 days'
  if (days <= 30) return '15-30 days'
  return '30+ days'
}

function transformData(raw: unknown, params: ReportParams): ReportData {
  const submissions = raw as SubmissionOverviewViewModel[]

  const programIds = params.programIds ?? (params.programId ? [params.programId] : [])
  const viewMode = params.viewMode ?? 'combine'

  const filtered =
    programIds.length > 0
      ? submissions.filter((s) => programIds.includes(s.originators.programId ?? ''))
      : submissions

  const statusCounts: Record<string, number> = {}
  const ageCounts: Record<AgeBucket, number> = {
    '0-2 days': 0,
    '3-7 days': 0,
    '8-14 days': 0,
    '15-30 days': 0,
    '30+ days': 0,
  }

  for (const s of filtered) {
    const status = s.state.status.value
    statusCounts[status] = (statusCounts[status] ?? 0) + 1
    ageCounts[ageBucket(daysBetween(s.createdAt))]++
  }

  const statusRows = Object.entries(statusCounts).map(([status, count]) => ({
    status,
    count,
    pct: filtered.length > 0 ? `${Math.round((count / filtered.length) * 100)}%` : '0%',
  }))

  const open = filtered.filter((s) => !['Closed', 'Archived'].includes(s.state.status.value))

  const summaryCards = [
    { label: 'Total Submissions', value: filtered.length },
    { label: 'Open / In Progress', value: open.length },
    { label: 'Accepted', value: statusCounts['Accepted'] ?? 0 },
    { label: 'Closed', value: statusCounts['Closed'] ?? 0 },
  ]

  if (viewMode === 'compare' && programIds.length > 1) {
    const programList = params.programs ?? []

    const compareData = AGE_BUCKETS.map((bucket) => {
      const row: Record<string, unknown> = { bucket }
      for (const id of programIds) {
        const progSubmissions = filtered.filter((s) => (s.originators.programId ?? '') === id)
        row[id] = progSubmissions.filter((s) => ageBucket(daysBetween(s.createdAt)) === bucket).length
      }
      return row
    })

    const dynamicChartConfig: ChartConfig = {
      type: 'bar',
      xKey: 'bucket',
      xLabel: 'Age',
      yLabel: 'Submissions',
      series: programIds.map((id, i) => ({
        key: id,
        label: programList.find((p) => p.id === id)?.name ?? id,
        color: BRAND_COMPARE_COLORS[i % BRAND_COMPARE_COLORS.length],
      })),
    }

    return {
      rows: statusRows as Record<string, unknown>[],
      chartData: compareData,
      summaryCards,
      chartConfig: dynamicChartConfig,
      rawData: { submissions: filtered, ageCounts, statusCounts },
    }
  }

  const ageRows = AGE_BUCKETS.map((bucket) => ({ bucket, count: ageCounts[bucket] }))

  return {
    rows: statusRows as Record<string, unknown>[],
    chartData: ageRows as Record<string, unknown>[],
    summaryCards,
    rawData: { submissions: filtered, ageCounts, statusCounts },
  }
}

const samplePreview = transformData(submissionsSample, { programIds: ['prog-alpha-001'] })

export const submissionStatusSnapshot: ReportModule = {
  id: 'submissionStatusSnapshot',
  title: 'Submission Status Snapshot',
  description: 'Current operational view of where submissions stand — by status, severity, and age.',
  category: 'snapshot',
  requiredScopes: ['core_platform:read'],
  isAvailable: () => true,

  paramFields: [
    { key: 'programIds', label: 'Programs', type: 'programSelect', required: true },
  ],

  async fetchData(params) {
    const ids = params.programIds ?? []
    if (ids.length === 0) throw new Error('At least one program is required')
    const results = await Promise.all(ids.map((id) => getProgramSubmissions(id)))
    return results.flat()
  },

  transform: transformData,

  tableColumns: [
    { accessorKey: 'status', header: 'Status' },
    { accessorKey: 'count', header: 'Count' },
    { accessorKey: 'pct', header: '% of Total' },
  ],

  chartConfig: {
    type: 'bar',
    xKey: 'bucket',
    xLabel: 'Age',
    yLabel: 'Submissions',
    series: [{ key: 'count', label: 'Submissions', color: BC.blue }],
  },

  summaryFormatter(data) {
    const [total, open] = data.summaryCards
    return `${total.value} total submissions, ${open.value} currently open.`
  },

  exportConfig: {
    csvFilename: 'submission-status-snapshot',
    jsonFilename: 'submission-status-snapshot',
    imageFilename: 'submission-status-chart',
    getCsvRows: (data) => data.rows,
  },

  sampleData: submissionsSample,
  samplePreview,
}
