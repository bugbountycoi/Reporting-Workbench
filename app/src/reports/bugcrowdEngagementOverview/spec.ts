import type { UserModuleSpec } from '../userModules/types'
import type { BugcrowdEngagement } from '../../api/endpoints/bugcrowd'

const SAMPLE_ENGAGEMENTS: BugcrowdEngagement[] = [
  { id: 'bc-eng-001', name: 'Engagement BC-ENG-001', code: 'bc-eng-001', status: 'open', submission_count: 20 },
  { id: 'bc-eng-002', name: 'Engagement BC-ENG-002', code: 'bc-eng-002', status: 'open', submission_count: 20 },
  { id: 'bc-eng-003', name: 'Engagement BC-ENG-003', code: 'bc-eng-003', status: 'open', submission_count: 20 },
]

export const bugcrowdEngagementOverviewSpec: UserModuleSpec = {
  schemaVersion: 1,
  id: 'bugcrowd-engagement-overview',
  title: 'Bugcrowd Engagement Summary',
  description: 'Overview of your Bugcrowd engagements showing submission counts and status.',
  category: 'snapshot',
  author: 'Reporting Workbench',
  version: '1.0.0',
  platform: 'bugcrowd',

  dataSource: 'programs',
  params: {
    includePrograms: false,
    includeDateRange: false,
    includeInterval: false,
  },

  groupBy: 'program',
  metrics: [
    { key: 'submission_count', label: 'Submissions', aggregation: 'count' },
  ],
  sortBy: { key: 'submission_count', dir: 'desc' },
  summaryCards: [
    { label: 'Total Engagements', value: 'total.count' },
    { label: 'Total Submissions', value: 'total.bounty' },
    { label: '% Active', value: 'pct.accepted' },
    { label: 'Unique Researchers', value: 'countDistinct.researcher' },
  ],

  chartType: 'bar',
  chartXLabel: 'Engagement',
  chartYLabel: 'Submissions',
  allowedChartTypes: ['bar'],
  series: [{ metricKey: 'submission_count', color: '#f97316' }],

  tableColumns: [
    { key: 'name', label: 'Engagement' },
    { key: 'code', label: 'Code' },
    { key: 'status', label: 'Status' },
    { key: 'submission_count', label: 'Submissions' },
  ],
  exportFilename: 'bc-engagement-overview',

  customFetchData: `
    return ctx.bc_getEngagements()
  `,

  customTransform: `
    const rows = raw.map(e => ({
      name: e.name,
      code: e.code,
      status: e.status,
      submission_count: e.submission_count,
    })).sort((a, b) => b.submission_count - a.submission_count)
    const totalEngagements = rows.length
    const totalSubmissions = rows.reduce((s, r) => s + r.submission_count, 0)
    const active = rows.filter(r => r.status === 'open').length
    return {
      rows,
      chartData: rows.map(r => ({ label: r.code, submission_count: r.submission_count })),
      summaryCards: [
        { label: 'Total Engagements', value: totalEngagements },
        { label: 'Total Submissions', value: totalSubmissions },
        { label: '% Active', value: totalEngagements > 0 ? Math.round(active / totalEngagements * 100) + '%' : '0%' },
        { label: 'Unique Researchers', value: 'N/A' },
      ],
    }
  `,

  sampleFixtureData: SAMPLE_ENGAGEMENTS,
}
