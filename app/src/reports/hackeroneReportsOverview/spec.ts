import type { UserModuleSpec } from '../userModules/types'
import { h1ReportFixtures } from './fixtures'

export const hackeroneReportsOverviewSpec: UserModuleSpec = {
  schemaVersion: 1,
  id: 'hackerone-reports-overview',
  title: 'HackerOne Reports Overview',
  description: 'Summary of HackerOne vulnerability reports by severity and state, with bounty totals.',
  category: 'snapshot',
  author: 'Reporting Workbench',
  version: '1.0.0',
  platform: 'hackerone',

  dataSource: 'submissions',
  params: {
    includePrograms: false,
    includeDateRange: true,
    includeInterval: true,
  },

  groupBy: 'severity',
  metrics: [
    { key: 'count', label: 'Reports', aggregation: 'count' },
    { key: 'totalBounty', label: 'Total Bounty (USD)', aggregation: 'sum.bounty' },
  ],
  sortBy: { key: 'count', dir: 'desc' },
  summaryCards: [
    { label: 'Total Reports', value: 'total.count' },
    { label: 'Total Bounty Paid', value: 'total.bounty' },
    { label: '% Accepted', value: 'pct.accepted' },
    { label: 'Unique Researchers', value: 'countDistinct.researcher' },
  ],

  chartType: 'bar',
  chartXLabel: 'Severity',
  chartYLabel: 'Count',
  allowedChartTypes: ['bar', 'stackedBar'],
  series: [{ metricKey: 'count', color: '#e8563a' }],

  tableColumns: [
    { key: 'severity', label: 'Severity' },
    { key: 'count', label: 'Reports' },
    { key: 'totalBounty', label: 'Bounty Paid (USD)' },
  ],
  exportFilename: 'h1-reports-overview',

  customFetchData: `
    const reports = await ctx.h1_getReports()
    const start = params.startDate ? new Date(params.startDate).getTime() : 0
    const end = params.endDate ? new Date(params.endDate).getTime() : Infinity
    return reports.filter(r => {
      const ts = new Date(r.created_at).getTime()
      return ts >= start && ts <= end
    })
  `,

  customTransform: `
    const severityOrder = ['critical','high','medium','low','none']
    const groups = {}
    for (const r of raw) {
      const sev = r.severity?.rating ?? 'none'
      if (!groups[sev]) groups[sev] = { severity: sev, count: 0, totalBounty: 0 }
      groups[sev].count++
      if (r.bounty_amount) groups[sev].totalBounty += parseFloat(r.bounty_amount)
    }
    const rows = severityOrder.filter(s => groups[s]).map(s => ({
      ...groups[s],
      totalBounty: Math.round(groups[s].totalBounty * 100) / 100,
    }))
    const totalCount = raw.length
    const totalBounty = rows.reduce((s, r) => s + r.totalBounty, 0)
    const resolved = raw.filter(r => r.state === 'resolved').length
    const researchers = new Set(raw.map(r => r.reporter?.username).filter(Boolean)).size
    return {
      rows,
      chartData: rows.map(r => ({ label: r.severity, count: r.count })),
      summaryCards: [
        { label: 'Total Reports', value: totalCount },
        { label: 'Total Bounty Paid', value: '$' + totalBounty.toLocaleString() },
        { label: '% Accepted', value: totalCount > 0 ? Math.round(resolved / totalCount * 100) + '%' : '0%' },
        { label: 'Unique Researchers', value: researchers },
      ],
    }
  `,

  sampleFixtureData: h1ReportFixtures,
  sampleFixtureParams: { startDate: '2025-01-01', endDate: '2026-12-31', interval: 'month' },
}
