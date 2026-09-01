import type { ReportModule, ReportData, ReportParams } from '../types'
import { getProgramDetail } from '../../api/endpoints/programs'
import { getAllPayouts } from '../../api/endpoints/payouts'
import type { PayoutViewModel } from '../../api/types'
import { unixToWeekLabel } from '../../utils/dates'
import payoutsSample from '../../fixtures/payouts.sample.json'

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

function transformData(raw: unknown, params: ReportParams): ReportData {
  const { payouts, programDetail } = raw as { payouts: PayoutViewModel[]; programDetail: { programBudget?: { budgetLeft?: { value: number; currency: string }; budgetSpent?: { value: number; currency: string }; budgetTotal?: { value: number; currency: string } } } }

  const filtered = params.programId
    ? payouts.filter((p) => p.originators.programId === params.programId)
    : payouts

  const totalAwarded = filtered.reduce((s, p) => s + p.amount.value, 0)
  const currency = filtered[0]?.amount.currency ?? 'USD'
  const avgAward = filtered.length > 0 ? Math.round(totalAwarded / filtered.length) : 0

  const budget = programDetail?.programBudget
  const bySeverityData = groupBySeverity(filtered)
  const byWeekData = groupByWeek(filtered)

  return {
    rows: bySeverityData as Record<string, unknown>[],
    chartData: byWeekData as Record<string, unknown>[],
    summaryCards: [
      { label: 'Total Awarded', value: `${currency} ${totalAwarded.toLocaleString()}` },
      { label: 'Award Count', value: filtered.length },
      { label: 'Avg Award', value: `${currency} ${avgAward.toLocaleString()}` },
      { label: 'Budget Remaining', value: budget?.budgetLeft ? `${budget.budgetLeft.currency} ${budget.budgetLeft.value.toLocaleString()}` : 'N/A' },
    ],
    rawData: raw,
  }
}

const sampleRaw = {
  payouts: payoutsSample,
  programDetail: { programBudget: { budgetLeft: { value: 42000, currency: 'USD' }, budgetSpent: { value: 58000, currency: 'USD' }, budgetTotal: { value: 100000, currency: 'USD' } } },
}

const samplePreview = transformData(sampleRaw, { programId: 'prog-alpha-001' })

export const bountyBudgetOverview: ReportModule = {
  id: 'bountyBudgetOverview',
  title: 'Bounty Budget Overview',
  description: 'Shows bounty spend, award distribution by severity, and remaining program budget.',
  category: 'bounty',
  requiredScopes: ['core_platform:read', 'reward_system:read'],
  isAvailable: () => true,

  paramFields: [
    { key: 'programId', label: 'Program', type: 'programSelect', required: true },
  ],

  async fetchData(params) {
    const [payouts, programDetail] = await Promise.all([
      getAllPayouts(),
      params.programId ? getProgramDetail(params.programId) : Promise.resolve(null),
    ])
    return { payouts, programDetail }
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
