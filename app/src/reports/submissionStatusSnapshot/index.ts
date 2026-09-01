import type { ReportModule, ReportData, ReportParams } from '../types'
import { getProgramSubmissions } from '../../api/endpoints/programs'
import type { SubmissionOverviewViewModel } from '../../api/types'
import { daysBetween } from '../../utils/dates'
import submissionsSample from '../../fixtures/submissions.sample.json'

type AgeBucket = '0-2 days' | '3-7 days' | '8-14 days' | '15-30 days' | '30+ days'

function ageBucket(days: number): AgeBucket {
  if (days <= 2) return '0-2 days'
  if (days <= 7) return '3-7 days'
  if (days <= 14) return '8-14 days'
  if (days <= 30) return '15-30 days'
  return '30+ days'
}

function transformData(raw: unknown, params: ReportParams): ReportData {
  const submissions = raw as SubmissionOverviewViewModel[]
  const filtered = params.programId
    ? submissions.filter((s) => s.originators.programId === params.programId)
    : submissions

  // Status distribution
  const statusCounts: Record<string, number> = {}
  const severityCounts: Record<string, number> = {}
  const ageCounts: Record<AgeBucket, number> = {
    '0-2 days': 0, '3-7 days': 0, '8-14 days': 0, '15-30 days': 0, '30+ days': 0,
  }

  for (const s of filtered) {
    const status = s.state.status.value
    statusCounts[status] = (statusCounts[status] ?? 0) + 1
    const sev = s.severity.value
    severityCounts[sev] = (severityCounts[sev] ?? 0) + 1
    const days = daysBetween(s.createdAt)
    ageCounts[ageBucket(days)]++
  }

  const statusRows = Object.entries(statusCounts).map(([status, count]) => ({
    status,
    count,
    pct: filtered.length > 0 ? `${Math.round((count / filtered.length) * 100)}%` : '0%',
  }))

  const ageRows = Object.entries(ageCounts).map(([bucket, count]) => ({ bucket, count }))
  const chartData = ageRows

  const open = filtered.filter((s) =>
    !['Closed', 'Archived'].includes(s.state.status.value),
  )

  return {
    rows: statusRows as Record<string, unknown>[],
    chartData: chartData as Record<string, unknown>[],
    summaryCards: [
      { label: 'Total Submissions', value: filtered.length },
      { label: 'Open / In Progress', value: open.length },
      { label: 'Accepted', value: statusCounts['Accepted'] ?? 0 },
      { label: 'Closed', value: statusCounts['Closed'] ?? 0 },
    ],
    rawData: { submissions: filtered, ageCounts, statusCounts, severityCounts },
  }
}

const samplePreview = transformData(submissionsSample, { programId: 'prog-alpha-001' })

export const submissionStatusSnapshot: ReportModule = {
  id: 'submissionStatusSnapshot',
  title: 'Submission Status Snapshot',
  description: 'Current operational view of where submissions stand — by status, severity, and age.',
  category: 'snapshot',
  requiredScopes: ['core_platform:read'],
  isAvailable: () => true,

  paramFields: [
    { key: 'programId', label: 'Program', type: 'programSelect', required: true },
  ],

  async fetchData(params) {
    if (!params.programId) throw new Error('Program is required')
    return getProgramSubmissions(params.programId)
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
    series: [{ key: 'count', label: 'Submissions', color: '#4C59A8' }],
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
