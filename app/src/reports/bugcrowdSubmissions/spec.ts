import type { UserModuleSpec } from '../userModules/types'
import { bcSubmissionFixtures } from './fixtures'

export const bugcrowdSubmissionsSpec: UserModuleSpec = {
  schemaVersion: 1,
  id: 'bugcrowd-submissions',
  title: 'Bugcrowd Submission List',
  description: 'Bugcrowd submissions grouped by severity (P1–P5) with state breakdown and date filtering.',
  category: 'triage',
  author: 'Reporting Workbench',
  version: '1.0.0',
  platform: 'bugcrowd',

  dataSource: 'submissions',
  params: {
    includePrograms: false,
    includeDateRange: true,
    includeInterval: true,
  },

  groupBy: 'severity',
  metrics: [
    { key: 'count', label: 'Submissions', aggregation: 'count' },
  ],
  sortBy: { key: 'severity', dir: 'asc' },
  summaryCards: [
    { label: 'Total Submissions', value: 'total.count' },
    { label: 'P1 + P2', value: 'total.count' },
    { label: '% Resolved', value: 'pct.accepted' },
    { label: 'Open (New + Triaged)', value: 'total.count' },
  ],

  chartType: 'stackedBar',
  chartXLabel: 'Severity',
  chartYLabel: 'Count',
  allowedChartTypes: ['bar', 'stackedBar'],
  series: [{ metricKey: 'count', color: '#f97316' }],

  tableColumns: [
    { key: 'severity', label: 'Severity' },
    { key: 'count', label: 'Total' },
    { key: 'resolved', label: 'Resolved' },
    { key: 'triaged', label: 'Triaged' },
    { key: 'new', label: 'New' },
    { key: 'invalid', label: 'Invalid/Dup' },
  ],
  exportFilename: 'bc-submissions',

  customFetchData: `
    const engagements = await ctx.bc_getEngagements()
    const results = await Promise.all(
      engagements.map(e => ctx.bc_getEngagementSubmissions(e.id))
    )
    const all = results.flat()
    const start = params.startDate ? new Date(params.startDate).getTime() : 0
    const end = params.endDate ? new Date(params.endDate).getTime() : Infinity
    return all.filter(s => {
      const ts = new Date(s.submitted_at).getTime()
      return ts >= start && ts <= end
    })
  `,

  customTransform: `
    const severityOrder = ['p1','p2','p3','p4','p5']
    const groups = {}
    for (const s of raw) {
      const sev = s.severity
      if (!groups[sev]) groups[sev] = { severity: sev.toUpperCase(), count: 0, resolved: 0, triaged: 0, new: 0, invalid: 0 }
      groups[sev].count++
      if (s.state === 'resolved') groups[sev].resolved++
      else if (s.state === 'triaged' || s.state === 'unresolved') groups[sev].triaged++
      else if (s.state === 'new') groups[sev].new++
      else if (s.state === 'not_applicable' || s.state === 'duplicate') groups[sev].invalid++
    }
    const rows = severityOrder.filter(k => groups[k]).map(k => groups[k])
    const totalCount = raw.length
    const p1p2 = (groups['p1']?.count ?? 0) + (groups['p2']?.count ?? 0)
    const resolved = raw.filter(s => s.state === 'resolved').length
    const openCount = raw.filter(s => s.state === 'new' || s.state === 'triaged' || s.state === 'unresolved').length
    return {
      rows,
      chartData: rows.map(r => ({ label: r.severity, count: r.count })),
      summaryCards: [
        { label: 'Total Submissions', value: totalCount },
        { label: 'P1 + P2', value: p1p2 },
        { label: '% Resolved', value: totalCount > 0 ? Math.round(resolved / totalCount * 100) + '%' : '0%' },
        { label: 'Open (New + Triaged)', value: openCount },
      ],
    }
  `,

  sampleFixtureData: bcSubmissionFixtures,
  sampleFixtureParams: { startDate: '2025-01-01', endDate: '2026-12-31', interval: 'month' },
}
