import type { ReportModule, ReportData, ReportParams, ChartConfig } from '../types'
import { getProgramDetail } from '../../api/endpoints/programs'
import { getAllPayouts } from '../../api/endpoints/payouts'
import type { PayoutViewModel } from '../../api/types'
import { unixToWeekLabel } from '../../utils/dates'
import payoutsSample from '../../fixtures/payouts.sample.json'

const COMPARE_COLORS = ['#4C59A8', '#02A87C', '#F03157', '#E0AC00', '#7BCFDB', '#E99C4A', '#575865']

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

function groupByWeek(payouts: PayoutViewModel[]) {
  const weeks: Record<string, number> = {}
  for (const p of payouts) {
    const week = unixToWeekLabel(p.createdAt)
    weeks[week] = (weeks[week] ?? 0) + p.amount.value
  }
  return Object.entries(weeks)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, total]) => ({ week, total }))
}

function groupByWeekPerProgram(payouts: PayoutViewModel[], programId: string) {
  const weeks: Record<string, number> = {}
  for (const p of payouts.filter((x) => (x.originators.programId ?? '') === programId)) {
    const week = unixToWeekLabel(p.createdAt)
    weeks[week] = (weeks[week] ?? 0) + p.amount.value
  }
  return weeks
}

function transformData(
  raw: unknown,
  params: ReportParams,
): ReportData {
  const { payouts, programDetails } = raw as { payouts: PayoutViewModel[]; programDetails: ProgramDetail[] }

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

    // Collect all weeks across all programs
    const allWeeks = new Set<string>()
    for (const id of programIds) {
      const weeks = groupByWeekPerProgram(filtered, id)
      Object.keys(weeks).forEach((w) => allWeeks.add(w))
    }

    const compareData = [...allWeeks].sort().map((week) => {
      const row: Record<string, unknown> = { week }
      for (const id of programIds) {
        const perProg = groupByWeekPerProgram(filtered, id)
        row[id] = perProg[week] ?? 0
      }
      return row
    })

    const dynamicChartConfig: ChartConfig = {
      type: 'bar',
      xKey: 'week',
      xLabel: 'Week',
      yLabel: `${currency} Awarded`,
      series: programIds.map((id, i) => ({
        key: id,
        label: programList.find((p) => p.id === id)?.name ?? id,
        color: COMPARE_COLORS[i % COMPARE_COLORS.length],
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

  const byWeekData = groupByWeek(filtered)

  return {
    rows: bySeverityData as Record<string, unknown>[],
    chartData: byWeekData as Record<string, unknown>[],
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

const samplePreview = transformData(sampleRaw, { programIds: ['prog-alpha-001'] })

export const bountyBudgetOverview: ReportModule = {
  id: 'bountyBudgetOverview',
  title: 'Bounty Budget Overview',
  description: 'Shows bounty spend, award distribution by severity, and remaining program budget.',
  category: 'bounty',
  requiredScopes: ['core_platform:read', 'reward_system:read'],
  isAvailable: () => true,

  paramFields: [
    { key: 'programIds', label: 'Programs', type: 'programSelect', required: true },
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
    xKey: 'week',
    xLabel: 'Week',
    yLabel: 'USD Awarded',
    series: [{ key: 'total', label: 'Amount Awarded', color: '#4C59A8' }],
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
