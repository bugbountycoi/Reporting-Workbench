import type { UserModuleSpec } from '../userModules/types'
import submissionsSample from '../../fixtures/submissions.sample.json'
import { BC } from '../../themes/brandColors'

export const submissionStatusSnapshotSpec: UserModuleSpec = {
  schemaVersion: 1,
  id: 'submissionStatusSnapshot',
  title: 'Submission Status Snapshot',
  description:
    'Current operational view of where submissions stand — by status, severity, and age.',
  category: 'snapshot',
  author: 'Intigriti Reporting Workbench',
  version: '1.0.0',

  dataSource: 'submissions',
  params: { includePrograms: true, includeDateRange: false, includeInterval: false },

  groupBy: 'status',
  metrics: [],
  sortBy: { key: 'status', dir: 'asc' },
  summaryCards: [],
  chartType: 'bar',
  chartXLabel: 'Age',
  chartYLabel: 'Submissions',
  allowedChartTypes: ['bar', 'stackedBar', 'line'],
  series: [{ metricKey: 'count', color: BC.blue }],
  tableColumns: [
    { key: 'status', label: 'Status' },
    { key: 'count', label: 'Count' },
    { key: 'pct', label: '% of Total' },
  ],
  exportFilename: 'submission-status-snapshot',

  customFetchData: `
    const ids = params.programIds || [];
    if (ids.length === 0) throw new Error('At least one program is required');
    const results = await Promise.all(ids.map(function(id) { return ctx.getProgramSubmissions(id); }));
    return results.flat();
  `,

  customTransform: `
    const submissions = raw;
    const programIds = params.programIds || [];
    const viewMode = params.viewMode || 'combine';
    const { daysBetween, COMPARE_COLORS } = ctx;

    const filtered = programIds.length > 0
      ? submissions.filter(function(s) { return programIds.includes(s.originators.programId || ''); })
      : submissions;

    const statusCounts = {};
    const ageBuckets = ['0-2 days', '3-7 days', '8-14 days', '15-30 days', '30+ days'];
    const ageCounts = { '0-2 days': 0, '3-7 days': 0, '8-14 days': 0, '15-30 days': 0, '30+ days': 0 };

    function ageBucket(days) {
      if (days <= 2) return '0-2 days';
      if (days <= 7) return '3-7 days';
      if (days <= 14) return '8-14 days';
      if (days <= 30) return '15-30 days';
      return '30+ days';
    }

    for (const s of filtered) {
      const status = s.state.status.value;
      statusCounts[status] = (statusCounts[status] || 0) + 1;
      const bucket = ageBucket(daysBetween(s.createdAt));
      ageCounts[bucket]++;
    }

    const statusRows = Object.entries(statusCounts).map(function([status, count]) {
      return { status: status, count: count, pct: filtered.length > 0 ? Math.round(count / filtered.length * 100) + '%' : '0%' };
    });

    const open = filtered.filter(function(s) { return !['Closed', 'Archived'].includes(s.state.status.value); });

    const summaryCards = [
      { label: 'Total Submissions', value: filtered.length },
      { label: 'Open / In Progress', value: open.length },
      { label: 'Accepted', value: statusCounts['Accepted'] || 0 },
      { label: 'Closed', value: statusCounts['Closed'] || 0 },
    ];

    if (viewMode === 'compare' && programIds.length > 1) {
      const programList = params.programs || [];
      const compareData = ageBuckets.map(function(bucket) {
        const row = { bucket: bucket };
        for (const id of programIds) {
          const progSubs = filtered.filter(function(s) { return (s.originators.programId || '') === id; });
          row[id] = progSubs.filter(function(s) { return ageBucket(daysBetween(s.createdAt)) === bucket; }).length;
        }
        return row;
      });
      const dynamicChartConfig = {
        type: 'bar', xKey: 'bucket', xLabel: 'Age', yLabel: 'Submissions',
        series: programIds.map(function(id, i) { return { key: id, label: (programList.find(function(p) { return p.id === id; }) || {}).name || id, color: COMPARE_COLORS[i % COMPARE_COLORS.length] }; }),
      };
      return { rows: statusRows, chartData: compareData, summaryCards: summaryCards, chartConfig: dynamicChartConfig, rawData: { submissions: filtered, ageCounts: ageCounts, statusCounts: statusCounts } };
    }

    const ageRows = ageBuckets.map(function(bucket) { return { bucket: bucket, count: ageCounts[bucket] }; });
    return { rows: statusRows, chartData: ageRows, summaryCards: summaryCards, rawData: { submissions: filtered, ageCounts: ageCounts, statusCounts: statusCounts } };
  `,

  customSummaryFormatter: `
    const cards = data.summaryCards;
    return cards[0].value + ' total submissions, ' + cards[1].value + ' currently open.';
  `,

  sampleFixtureData: submissionsSample,
  sampleFixtureParams: { programIds: ['prog-alpha-001'] },
}
