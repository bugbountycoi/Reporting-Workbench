import type { ReportModule, ReportData, ReportParams } from '../types'
import { getProgramSubmissions } from '../../api/endpoints/programs'
import type { SubmissionOverviewViewModel } from '../../api/types'
import { isoToDate, startOfWeek, eachWeekOfInterval, formatDate } from '../../utils/dates'
import { sampleSubmissions } from '../dailyTriageMovement/fixtures'

function transformData(raw: unknown, params: ReportParams): ReportData {
  const submissions = raw as SubmissionOverviewViewModel[]
  const startDate = params.startDate ?? '2025-07-01'
  const endDate = params.endDate ?? '2025-07-28'

  const filtered = params.programId
    ? submissions.filter((s) => s.originators.programId === params.programId)
    : submissions

  const start = startOfWeek(isoToDate(startDate), { weekStartsOn: 1 })
  const end = startOfWeek(isoToDate(endDate), { weekStartsOn: 1 })
  const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 })

  const rows = weeks.map((weekStart) => {
    const weekEnd = new Date(weekStart.getTime() + 6 * 86400000)
    const wStart = weekStart.getTime() / 1000
    const wEnd = (weekEnd.getTime() + 86399000) / 1000
    const week = filtered.filter((s) => s.createdAt >= wStart && s.createdAt <= wEnd)

    const received = week.length
    const accepted = week.filter((s) => s.state.status.value === 'Accepted').length
    const rejected = week.filter((s) =>
      s.state.closeReason?.value === 'Not Applicable' || s.state.closeReason?.value === 'Informative',
    ).length
    const duplicate = week.filter((s) => s.state.closeReason?.value === 'Duplicate').length
    const processed = accepted + rejected + duplicate

    return {
      week: formatDate(weekStart),
      weekEnd: formatDate(weekEnd),
      received,
      processed,
      accepted,
      rejected,
      duplicate,
    }
  })

  const totalReceived = rows.reduce((s, r) => s + (r.received as number), 0)
  const totalAccepted = rows.reduce((s, r) => s + (r.accepted as number), 0)

  return {
    rows: rows as Record<string, unknown>[],
    chartData: rows as Record<string, unknown>[],
    summaryCards: [
      { label: 'Total Received', value: totalReceived },
      { label: 'Accepted / Valid', value: totalAccepted },
      { label: 'Rejected / Informative', value: rows.reduce((s, r) => s + (r.rejected as number), 0) },
      { label: 'Duplicates', value: rows.reduce((s, r) => s + (r.duplicate as number), 0) },
    ],
    rawData: raw,
  }
}

const samplePreview = transformData(sampleSubmissions, {
  programId: 'prog-alpha-001',
  startDate: '2025-07-01',
  endDate: '2025-07-28',
})

export const weeklyTriageSummary: ReportModule = {
  id: 'weeklyTriageSummary',
  title: 'Weekly Triage Summary',
  description: 'Less volatile weekly view of triage throughput, acceptance rates, and queue trends.',
  category: 'triage',
  requiredScopes: ['core_platform:read'],
  isAvailable: () => true,

  paramFields: [
    { key: 'programId', label: 'Program', type: 'programSelect', required: true },
    { key: 'startDate', label: 'Start Date', type: 'dateRange', required: true, defaultValue: '' },
    { key: 'endDate', label: 'End Date', type: 'dateRange', required: true, defaultValue: '' },
  ],

  async fetchData(params) {
    if (!params.programId) throw new Error('Program is required')
    return getProgramSubmissions(params.programId)
  },

  transform: transformData,

  tableColumns: [
    { accessorKey: 'week', header: 'Week Start' },
    { accessorKey: 'weekEnd', header: 'Week End' },
    { accessorKey: 'received', header: 'Received' },
    { accessorKey: 'accepted', header: 'Accepted' },
    { accessorKey: 'rejected', header: 'Rejected' },
    { accessorKey: 'duplicate', header: 'Duplicates' },
    { accessorKey: 'processed', header: 'Total Processed' },
  ],

  chartConfig: {
    type: 'bar',
    xKey: 'week',
    xLabel: 'Week',
    yLabel: 'Count',
    series: [
      { key: 'received', label: 'Received', color: '#4C59A8' },
      { key: 'accepted', label: 'Accepted', color: '#10B981' },
      { key: 'rejected', label: 'Rejected', color: '#EF4444' },
      { key: 'duplicate', label: 'Duplicate', color: '#F59E0B' },
    ],
  },

  summaryFormatter(data) {
    const cards = data.summaryCards
    return `Total received: ${cards[0].value}. Accepted: ${cards[1].value}.`
  },

  exportConfig: {
    csvFilename: 'weekly-triage-summary',
    jsonFilename: 'weekly-triage-summary',
    imageFilename: 'weekly-triage-summary-chart',
    getCsvRows: (data) => data.rows,
  },

  sampleData: sampleSubmissions,
  samplePreview,
}
