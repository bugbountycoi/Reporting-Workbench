import type { ReportModule, ReportData, ReportParams, ChartConfig } from '../types'
import { getProgramSubmissions } from '../../api/endpoints/programs'
import type { SubmissionOverviewViewModel } from '../../api/types'
import { bucketKey, allBuckets, INTERVAL_OPTIONS, type Interval } from '../../utils/intervals'
import { sampleSubmissions } from './fixtures'
import { BC, BRAND_COMPARE_COLORS } from '../../themes/brandColors'

const CHART_COLORS = {
  new: BC.blue,
  forwarded: BC.green,
  closed: BC.grayMid,
  duplicate: BC.gold,
}

function buildRows(
  submissions: SubmissionOverviewViewModel[],
  startDate: string,
  endDate: string,
  interval: Interval,
) {
  const buckets = allBuckets(startDate, endDate, interval)

  const byBucket = new Map<string, SubmissionOverviewViewModel[]>()
  for (const s of submissions) {
    const k = bucketKey(s.createdAt, interval)
    if (!byBucket.has(k)) byBucket.set(k, [])
    byBucket.get(k)!.push(s)
  }

  return buckets.map((bucket) => {
    const inBucket = byBucket.get(bucket) ?? []
    const newCount = inBucket.length
    const forwardedCount = inBucket.filter((s) =>
      s.state.status.value.toLowerCase().includes('forwarded'),
    ).length
    const duplicateCount = inBucket.filter(
      (s) => s.state.closeReason?.value.toLowerCase() === 'duplicate',
    ).length
    const closedCount = inBucket.filter(
      (s) =>
        s.state.status.value.toLowerCase() === 'closed' &&
        !s.state.closeReason?.value.toLowerCase().includes('duplicate'),
    ).length

    return {
      period: bucket,
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
  const interval = (params.interval as Interval | undefined) ?? 'day'

  const programIds = params.programIds ?? (params.programId ? [params.programId] : [])
  const viewMode = params.viewMode ?? 'combine'

  const filtered =
    programIds.length > 0
      ? submissions.filter((s) => programIds.includes(s.originators.programId ?? ''))
      : submissions

  const rows = buildRows(filtered, startDate, endDate, interval)
  const totalNew = rows.reduce((sum, r) => sum + (r.new as number), 0)
  const totalClosed = rows.reduce((sum, r) => sum + (r.closed as number), 0)
  const netChange = rows.reduce((sum, r) => sum + (r.netChange as number), 0)

  const summaryCards = [
    { label: 'New Submissions', value: totalNew, trend: 'neutral' as const },
    {
      label: 'Forwarded to Customer',
      value: rows.reduce((s, r) => s + (r.forwarded as number), 0),
      trend: 'neutral' as const,
    },
    { label: 'Closed / Rejected', value: totalClosed, trend: 'neutral' as const },
    {
      label: 'Net Queue Change',
      value: netChange > 0 ? `+${netChange}` : netChange,
      trend: netChange > 0 ? ('up' as const) : netChange < 0 ? ('down' as const) : ('neutral' as const),
    },
  ]

  if (viewMode === 'compare' && programIds.length > 1) {
    const programList = params.programs ?? []
    const buckets = allBuckets(startDate, endDate, interval)

    const byBucketByProg = new Map<string, Map<string, number>>()
    for (const s of filtered) {
      const k = bucketKey(s.createdAt, interval)
      const pid = s.originators.programId ?? ''
      if (!byBucketByProg.has(k)) byBucketByProg.set(k, new Map())
      const m = byBucketByProg.get(k)!
      m.set(pid, (m.get(pid) ?? 0) + 1)
    }

    const compareData = buckets.map((bucket) => {
      const row: Record<string, unknown> = { period: bucket }
      const bucketMap = byBucketByProg.get(bucket)
      for (const id of programIds) {
        row[id] = bucketMap?.get(id) ?? 0
      }
      return row
    })

    const dynamicChartConfig: ChartConfig = {
      type: 'bar',
      xKey: 'period',
      xLabel: 'Period',
      yLabel: 'New Submissions',
      allowedChartTypes: programIds.length <= 5 ? ['bar', 'stackedBar', 'line'] : ['bar', 'stackedBar'],
      series: programIds.map((id, i) => ({
        key: id,
        label: programList.find((p) => p.id === id)?.name ?? id,
        color: BRAND_COMPARE_COLORS[i % BRAND_COMPARE_COLORS.length],
      })),
    }

    return {
      rows: rows as Record<string, unknown>[],
      chartData: compareData,
      summaryCards,
      chartConfig: dynamicChartConfig,
      rawData: raw,
    }
  }

  return {
    rows: rows as Record<string, unknown>[],
    chartData: rows as Record<string, unknown>[],
    summaryCards,
    rawData: raw,
  }
}

const samplePreview = transformData(sampleSubmissions, {
  programIds: ['prog-alpha-001'],
  startDate: '2025-07-11',
  endDate: '2025-07-24',
  interval: 'day',
})

export const dailyTriageMovement: ReportModule = {
  id: 'dailyTriageMovement',
  title: 'Daily Triage Movement',
  description: 'Shows submission flow in and out of triage for the selected program, date range, and time interval.',
  category: 'triage',
  requiredScopes: ['core_platform:read'],
  isAvailable: () => true,

  paramFields: [
    { key: 'programIds', label: 'Programs', type: 'programSelect', required: true },
    { key: 'startDate', label: 'Start Date', type: 'dateRange', required: true, defaultValue: '' },
    { key: 'endDate', label: 'End Date', type: 'dateRange', required: true, defaultValue: '' },
    {
      key: 'interval',
      label: 'Interval',
      type: 'select',
      required: false,
      defaultValue: 'day',
      options: INTERVAL_OPTIONS,
    },
  ],

  async fetchData(params) {
    const ids = params.programIds ?? []
    if (ids.length === 0) throw new Error('At least one program is required')
    const results = await Promise.all(ids.map((id) => getProgramSubmissions(id)))
    return results.flat()
  },

  transform: async (raw, params) => transformData(raw, params),

  tableColumns: [
    { accessorKey: 'period', header: 'Period' },
    { accessorKey: 'new', header: 'New' },
    { accessorKey: 'forwarded', header: 'Forwarded' },
    { accessorKey: 'closed', header: 'Closed' },
    { accessorKey: 'duplicate', header: 'Duplicate' },
    { accessorKey: 'netChange', header: 'Net Change' },
  ],

  chartConfig: {
    type: 'stackedBar',
    xKey: 'period',
    xLabel: 'Period',
    yLabel: 'Submissions',
    allowedChartTypes: ['stackedBar', 'bar', 'line'],
    series: [
      { key: 'new', label: 'New', color: CHART_COLORS.new },
      { key: 'forwarded', label: 'Forwarded', color: CHART_COLORS.forwarded },
      { key: 'closed', label: 'Closed', color: CHART_COLORS.closed },
      { key: 'duplicate', label: 'Duplicate', color: CHART_COLORS.duplicate },
    ],
  },

  async summaryFormatter(data) {
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
