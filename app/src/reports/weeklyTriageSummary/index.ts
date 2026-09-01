import type { ReportModule, ReportData, ReportParams, ChartConfig } from '../types'
import { getProgramSubmissions } from '../../api/endpoints/programs'
import type { SubmissionOverviewViewModel } from '../../api/types'
import { bucketKey, allBuckets, INTERVAL_OPTIONS, type Interval } from '../../utils/intervals'
import { sampleSubmissions } from '../dailyTriageMovement/fixtures'

const COMPARE_COLORS = ['#4C59A8', '#02A87C', '#F03157', '#E0AC00', '#7BCFDB', '#E99C4A', '#575865']

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
    const week = byBucket.get(bucket) ?? []
    const received = week.length
    const accepted = week.filter((s) => s.state.status.value === 'Accepted').length
    const rejected = week.filter(
      (s) =>
        s.state.closeReason?.value === 'Not Applicable' ||
        s.state.closeReason?.value === 'Informative',
    ).length
    const duplicate = week.filter((s) => s.state.closeReason?.value === 'Duplicate').length
    const processed = accepted + rejected + duplicate

    return { period: bucket, received, processed, accepted, rejected, duplicate }
  })
}

function transformData(raw: unknown, params: ReportParams): ReportData {
  const submissions = raw as SubmissionOverviewViewModel[]
  const startDate = params.startDate ?? '2025-07-01'
  const endDate = params.endDate ?? '2025-07-28'
  const interval = (params.interval as Interval | undefined) ?? 'week'

  const programIds = params.programIds ?? (params.programId ? [params.programId] : [])
  const viewMode = params.viewMode ?? 'combine'

  const filtered =
    programIds.length > 0
      ? submissions.filter((s) => programIds.includes(s.originators.programId ?? ''))
      : submissions

  const rows = buildRows(filtered, startDate, endDate, interval)
  const totalReceived = rows.reduce((s, r) => s + (r.received as number), 0)
  const totalAccepted = rows.reduce((s, r) => s + (r.accepted as number), 0)

  const summaryCards = [
    { label: 'Total Received', value: totalReceived },
    { label: 'Accepted / Valid', value: totalAccepted },
    { label: 'Rejected / Informative', value: rows.reduce((s, r) => s + (r.rejected as number), 0) },
    { label: 'Duplicates', value: rows.reduce((s, r) => s + (r.duplicate as number), 0) },
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
      yLabel: 'Submissions Received',
      allowedChartTypes: programIds.length <= 5 ? ['bar', 'stackedBar', 'line'] : ['bar', 'stackedBar'],
      series: programIds.map((id, i) => ({
        key: id,
        label: programList.find((p) => p.id === id)?.name ?? id,
        color: COMPARE_COLORS[i % COMPARE_COLORS.length],
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
  startDate: '2025-07-01',
  endDate: '2025-07-28',
  interval: 'week',
})

export const weeklyTriageSummary: ReportModule = {
  id: 'weeklyTriageSummary',
  title: 'Weekly Triage Summary',
  description: 'Triage throughput by configurable interval — acceptance rates, queue trends, and rejection breakdown.',
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
      defaultValue: 'week',
      options: INTERVAL_OPTIONS,
    },
  ],

  async fetchData(params) {
    const ids = params.programIds ?? []
    if (ids.length === 0) throw new Error('At least one program is required')
    const results = await Promise.all(ids.map((id) => getProgramSubmissions(id)))
    return results.flat()
  },

  transform: transformData,

  tableColumns: [
    { accessorKey: 'period', header: 'Period' },
    { accessorKey: 'received', header: 'Received' },
    { accessorKey: 'accepted', header: 'Accepted' },
    { accessorKey: 'rejected', header: 'Rejected' },
    { accessorKey: 'duplicate', header: 'Duplicates' },
    { accessorKey: 'processed', header: 'Total Processed' },
  ],

  chartConfig: {
    type: 'bar',
    xKey: 'period',
    xLabel: 'Period',
    yLabel: 'Count',
    allowedChartTypes: ['bar', 'stackedBar', 'line'],
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
