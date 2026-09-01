import type { ReportModule, ReportData, ReportParams } from '../types'
import { getProgramSubmissions } from '../../api/endpoints/programs'
import type { SubmissionOverviewViewModel } from '../../api/types'
import { formatDate, startOfDay, eachDayOfInterval, isoToDate } from '../../utils/dates'
import { sampleSubmissions } from './fixtures'

const CHART_COLORS = {
  new: '#4C59A8',
  forwarded: '#02A87C',
  closed: '#575865',
  duplicate: '#E0AC00',
}

function buildDailyRows(submissions: SubmissionOverviewViewModel[], startDate: string, endDate: string) {
  const start = startOfDay(isoToDate(startDate))
  const end = startOfDay(isoToDate(endDate))
  const days = eachDayOfInterval({ start, end })

  return days.map((day) => {
    const dayStr = formatDate(day)
    const dayStart = day.getTime() / 1000
    const dayEnd = dayStart + 86399

    const inRange = (s: SubmissionOverviewViewModel) =>
      s.createdAt >= dayStart && s.createdAt <= dayEnd

    const daySubmissions = submissions.filter(inRange)
    const newCount = daySubmissions.length
    const forwardedCount = daySubmissions.filter((s) =>
      s.state.status.value.toLowerCase().includes('forwarded'),
    ).length
    const duplicateCount = daySubmissions.filter(
      (s) => s.state.closeReason?.value.toLowerCase() === 'duplicate',
    ).length
    const closedCount = daySubmissions.filter(
      (s) => s.state.status.value.toLowerCase() === 'closed' && !s.state.closeReason?.value.toLowerCase().includes('duplicate'),
    ).length

    return {
      date: dayStr,
      new: newCount,
      forwarded: forwardedCount,
      closed: closedCount,
      duplicate: duplicateCount,
      netChange: newCount - closedCount - duplicateCount,
    }
  })
}

function transformData(raw: unknown, params: ReportParams): ReportData {
  const submissions = raw as SubmissionOverviewViewModel[]
  const startDate = params.startDate ?? '2025-07-11'
  const endDate = params.endDate ?? '2025-07-28'

  const filtered = params.programId
    ? submissions.filter((s) => s.originators.programId === params.programId)
    : submissions

  const rows = buildDailyRows(filtered, startDate, endDate)
  const totalNew = rows.reduce((sum, r) => sum + (r.new as number), 0)
  const totalClosed = rows.reduce((sum, r) => sum + (r.closed as number), 0)
  const netChange = rows.reduce((sum, r) => sum + (r.netChange as number), 0)

  return {
    rows: rows as Record<string, unknown>[],
    chartData: rows as Record<string, unknown>[],
    summaryCards: [
      { label: 'New Submissions', value: totalNew, trend: 'neutral' },
      { label: 'Forwarded to Customer', value: rows.reduce((s, r) => s + (r.forwarded as number), 0), trend: 'neutral' },
      { label: 'Closed / Rejected', value: totalClosed, trend: 'neutral' },
      { label: 'Net Queue Change', value: netChange > 0 ? `+${netChange}` : netChange, trend: netChange > 0 ? 'up' : netChange < 0 ? 'down' : 'neutral' },
    ],
    rawData: raw,
  }
}

const samplePreview = transformData(sampleSubmissions, {
  programId: 'prog-alpha-001',
  startDate: '2025-07-11',
  endDate: '2025-07-24',
})

export const dailyTriageMovement: ReportModule = {
  id: 'dailyTriageMovement',
  title: 'Daily Triage Movement',
  description: 'Shows daily submission flow in and out of triage for the selected program and date range.',
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
    { accessorKey: 'date', header: 'Date' },
    { accessorKey: 'new', header: 'New' },
    { accessorKey: 'forwarded', header: 'Forwarded' },
    { accessorKey: 'closed', header: 'Closed' },
    { accessorKey: 'duplicate', header: 'Duplicate' },
    { accessorKey: 'netChange', header: 'Net Change' },
  ],

  chartConfig: {
    type: 'stackedBar',
    xKey: 'date',
    xLabel: 'Date',
    yLabel: 'Submissions',
    series: [
      { key: 'new', label: 'New', color: CHART_COLORS.new },
      { key: 'forwarded', label: 'Forwarded', color: CHART_COLORS.forwarded },
      { key: 'closed', label: 'Closed', color: CHART_COLORS.closed },
      { key: 'duplicate', label: 'Duplicate', color: CHART_COLORS.duplicate },
    ],
  },

  summaryFormatter(data) {
    const cards = data.summaryCards
    return `Received ${cards[0].value} submissions. Net queue change: ${cards[3].value}.`
  },

  exportConfig: {
    csvFilename: 'daily-triage-movement',
    jsonFilename: 'daily-triage-movement',
    imageFilename: 'daily-triage-movement-chart',
    getCsvRows: (data) => data.rows,
  },

  sampleData: sampleSubmissions,
  samplePreview,
}
