import type { ReportModule, ReportData, ReportParams, ChartConfig } from '../types'
import { getProgramDetail } from '../../api/endpoints/programs'
import { getAllPayouts } from '../../api/endpoints/payouts'
import type { PayoutViewModel } from '../../api/types'
import { bucketKey, INTERVAL_OPTIONS, type Interval } from '../../utils/intervals'
import payoutsSample from '../../fixtures/payouts.sample.json'
import { BC, BRAND_COMPARE_COLORS } from '../../themes/brandColors'

type ProgramBudget = {
  budgetLeft?: { value: number; currency: string }
  budgetSpent?: { value: number; currency: string }
  budgetTotal?: { value: number; currency: string }
}

type ProgramDetail = { programBudget?: ProgramBudget } | null

function groupBySeverity(payouts: PayoutViewModel[]) {
  const groups: Record<string, { count: number; total: number }> = {}
  for (const p of payouts) {
    const sev = 'Unknown'
    if (!groups[sev]) groups[sev] = { count: 0, total: 0 }
    groups[sev].count++
    groups[sev].total += p.amount.value
  }
  return Object.entries(groups).map(([severity, data]) => ({
    severity,
    count: data.count,
    total: data.total,
    avg: data.count > 0 ? Math.round(data.total / data.count) : 0,
  }))
}

function groupByInterval(payouts: PayoutViewModel[], interval: Interval) {
  const buckets: Record<string, number> = {}
  for (const p of payouts) {
    const key = bucketKey(p.createdAt, interval)
    buckets[key] = (buckets[key] ?? 0) + p.amount.value
  }
  return Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, total]) => ({ period, total }))
}

function groupByIntervalPerProgram(payouts: PayoutViewModel[], programId: string, interval: Interval) {
  const buckets: Record<string, number> = {}
  for (const p of payouts.filter((x) => (x.originators.programId ?? '') === programId)) {
    const key = bucketKey(p.createdAt, interval)
    buckets[key] = (buckets[key] ?? 0) + p.amount.value
  }
  return buckets
}

function transformData(raw: unknown, params: ReportParams): ReportData {
  const { payouts, programDetails } = raw as { payouts: PayoutViewModel[]; programDetails: ProgramDetail[] }
  const interval = (params.interval as Interval | undefined) ?? 'week'

  const programIds = params.programIds ?? (params.programId ? [params.programId] : [])
  const viewMode = params.viewMode ?? 'combine'

  const filtered =
    programIds.length > 0
      ? payouts.filter((p) => programIds.includes(p.originators.programId ?? ''))
      : payouts

  const totalAwarded = filtered.reduce((s, p) => s + p.amount.value, 0)
  const currency = filtered[0]?.amount.currency ?? 'USD'
  const avgAward = filtered.length > 0 ? Math.round(totalAwarded / filtered.length) : 0

  const budget = programIds.length === 1 ? programDetails[0]?.programBudget : null
  const bySeverityData = groupBySeverity(filtered)

  const summaryCards = [
    { label: 'Total Awarded', value: `${currency} ${totalAwarded.toLocaleString()}` },
    { label: 'Award Count', value: filtered.length },
    { label: 'Avg Award', value: `${currency} ${avgAward.toLocaleString()}` },
    {
      label: 'Budget Remaining',
      value: budget?.budgetLeft
        ? `${budget.budgetLeft.currency} ${budget.budgetLeft.value.toLocaleString()}`
        : 'N/A',
    },
  ]

  if (viewMode === 'compare' && programIds.length > 1) {
    const programList = params.programs ?? []

    const allPeriods = new Set<string>()
    for (const id of programIds) {
      const perProg = groupByIntervalPerProgram(filtered, id, interval)
      Object.keys(perProg).forEach((k) => allPeriods.add(k))
    }

    const compareData = [...allPeriods].sort().map((period) => {
      const row: Record<string, unknown> = { period }
      for (const id of programIds) {
        const perProg = groupByIntervalPerProgram(filtered, id, interval)
        row[id] = perProg[period] ?? 0
      }
      return row
    })

    const dynamicChartConfig: ChartConfig = {
      type: 'bar',
      xKey: 'period',
      xLabel: 'Period',
      yLabel: `${currency} Awarded`,
      allowedChartTypes: programIds.length <= 5 ? ['bar', 'stackedBar', 'line'] : ['bar', 'stackedBar'],
      series: programIds.map((id, i) => ({
        key: id,
        label: programList.find((p) => p.id === id)?.name ?? id,
        color: BRAND_COMPARE_COLORS[i % BRAND_COMPARE_COLORS.length],
      })),
    }

    return {
      rows: bySeverityData as Record<string, unknown>[],
      chartData: compareData,
      summaryCards,
      chartConfig: dynamicChartConfig,
      rawData: raw,
    }
  }

  const byIntervalData = groupByInterval(filtered, interval)

  return {
    rows: bySeverityData as Record<string, unknown>[],
    chartData: byIntervalData as Record<string, unknown>[],
    summaryCards,
    rawData: raw,
  }
}

const sampleRaw = {
  payouts: payoutsSample,
  programDetails: [
    {
      programBudget: {
        budgetLeft: { value: 42000, currency: 'USD' },
        budgetSpent: { value: 58000, currency: 'USD' },
        budgetTotal: { value: 100000, currency: 'USD' },
      },
    },
  ],
}

const samplePreview = transformData(sampleRaw, { programIds: ['prog-alpha-001'], interval: 'week' })

export const bountyBudgetOverview: ReportModule = {
  id: 'bountyBudgetOverview',
  title: 'Bounty Budget Overview',
  description: 'Shows bounty spend, award distribution by severity, and remaining program budget.',
  category: 'bounty',
  requiredScopes: ['core_platform:read', 'reward_system:read'],
  isAvailable: () => true,

  paramFields: [
    { key: 'programIds', label: 'Programs', type: 'programSelect', required: true },
    {
      key: 'interval',
      label: 'Chart Interval',
      type: 'select',
      required: false,
      defaultValue: 'week',
      options: INTERVAL_OPTIONS,
    },
  ],

  async fetchData(params) {
    const ids = params.programIds ?? []
    if (ids.length === 0) throw new Error('At least one program is required')
    const [payouts, programDetails] = await Promise.all([
      getAllPayouts(),
      Promise.all(ids.map((id) => getProgramDetail(id))),
    ])
    return { payouts, programDetails }
  },

  transform: transformData,

  tableColumns: [
    { accessorKey: 'severity', header: 'Severity' },
    { accessorKey: 'count', header: 'Count' },
    { accessorKey: 'total', header: 'Total (USD)' },
    { accessorKey: 'avg', header: 'Avg Award (USD)' },
  ],

  chartConfig: {
    type: 'bar',
    xKey: 'period',
    xLabel: 'Period',
    yLabel: 'USD Awarded',
    allowedChartTypes: ['bar', 'line'],
    series: [{ key: 'total', label: 'Amount Awarded', color: BC.blue }],
  },

  summaryFormatter(data) {
    const [total, count, avg, budget] = data.summaryCards
    return `Awarded ${total.value} across ${count.value} submissions (avg ${avg.value}). Budget remaining: ${budget.value}.`
  },

  exportConfig: {
    csvFilename: 'bounty-budget-overview',
    jsonFilename: 'bounty-budget-overview',
    imageFilename: 'bounty-budget-chart',
    getCsvRows: (data) => data.rows,
  },

  sampleData: sampleRaw,
  samplePreview,
}
