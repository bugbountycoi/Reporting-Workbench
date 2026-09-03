import type { UserModuleSpec } from '../userModules/types'
import { h1ReportFixtures } from '../hackeroneReportsOverview/fixtures'

export const hackeroneActivitySpec: UserModuleSpec = {
  schemaVersion: 1,
  id: 'hackerone-activity',
  title: 'HackerOne Activity',
  description: 'HackerOne report submissions over time grouped by interval, showing volume and bounty trends.',
  category: 'triage',
  author: 'Reporting Workbench',
  version: '1.0.0',
  platform: 'hackerone',

  dataSource: 'submissions',
  params: {
    includePrograms: false,
    includeDateRange: true,
    includeInterval: true,
  },

  groupBy: 'time.week',
  metrics: [
    { key: 'count', label: 'Reports', aggregation: 'count' },
    { key: 'totalBounty', label: 'Bounty (USD)', aggregation: 'sum.bounty' },
  ],
  sortBy: { key: 'week', dir: 'asc' },
  summaryCards: [
    { label: 'Total Reports', value: 'total.count' },
    { label: 'Total Bounty Paid', value: 'total.bounty' },
    { label: '% Accepted', value: 'pct.accepted' },
    { label: 'Unique Researchers', value: 'countDistinct.researcher' },
  ],

  chartType: 'line',
  chartXLabel: 'Period',
  chartYLabel: 'Reports',
  allowedChartTypes: ['bar', 'line'],
  series: [{ metricKey: 'count', color: '#e8563a' }],

  tableColumns: [
    { key: 'period', label: 'Period' },
    { key: 'count', label: 'Reports' },
    { key: 'totalBounty', label: 'Bounty (USD)' },
    { key: 'resolved', label: 'Resolved' },
  ],
  exportFilename: 'h1-activity',

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
    const interval = params.interval || 'week'
    const groups = {}
    for (const r of raw) {
      const ts = new Date(r.created_at).getTime()
      const key = ctx.bucketKey(ts, interval)
      if (!groups[key]) groups[key] = { period: key, count: 0, totalBounty: 0, resolved: 0 }
      groups[key].count++
      if (r.bounty_amount) groups[key].totalBounty += parseFloat(r.bounty_amount)
      if (r.state === 'resolved') groups[key].resolved++
    }
    const rows = Object.values(groups).sort((a, b) => a.period.localeCompare(b.period))
    const totalCount = raw.length
    const totalBounty = rows.reduce((s, r) => s + r.totalBounty, 0)
    const resolved = raw.filter(r => r.state === 'resolved').length
    const researchers = new Set(raw.map(r => r.reporter?.username).filter(Boolean)).size
    return {
      rows: rows.map(r => ({ ...r, totalBounty: Math.round(r.totalBounty * 100) / 100 })),
      chartData: rows.map(r => ({ label: r.period, count: r.count })),
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
