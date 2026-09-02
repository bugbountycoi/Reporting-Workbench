import type { UserModuleSpec } from '../userModules/types'
import { sampleSubmissions } from '../dailyTriageMovement/fixtures'
import { BC } from '../../themes/brandColors'

export const weeklyTriageSummarySpec: UserModuleSpec = {
  schemaVersion: 1,
  id: 'weeklyTriageSummary',
  title: 'Weekly Triage Summary',
  description:
    'Triage throughput by configurable interval — acceptance rates, queue trends, and rejection breakdown.',
  category: 'triage',
  author: 'Intigriti Reporting Workbench',
  version: '1.0.0',

  dataSource: 'submissions',
  params: { includePrograms: true, includeDateRange: true, includeInterval: true },

  groupBy: 'time.week',
  metrics: [],
  sortBy: { key: 'period', dir: 'asc' },
  summaryCards: [],
  chartType: 'bar',
  chartXLabel: 'Period',
  chartYLabel: 'Count',
  allowedChartTypes: ['bar', 'stackedBar', 'line'],
  series: [
    { metricKey: 'received', color: BC.blue },
    { metricKey: 'accepted', color: BC.green },
    { metricKey: 'rejected', color: BC.red },
    { metricKey: 'duplicate', color: BC.gold },
  ],
  tableColumns: [
    { key: 'period', label: 'Period' },
    { key: 'received', label: 'Received' },
    { key: 'accepted', label: 'Accepted' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'duplicate', label: 'Duplicates' },
    { key: 'processed', label: 'Total Processed' },
  ],
  exportFilename: 'weekly-triage-summary',

  customFetchData: `
    const ids = params.programIds || [];
    if (ids.length === 0) throw new Error('At least one program is required');
    const results = await Promise.all(ids.map(function(id) { return ctx.getProgramSubmissions(id); }));
    return results.flat();
  `,

  customTransform: `
    const submissions = raw;
    const startDate = params.startDate || '2025-07-01';
    const endDate = params.endDate || '2025-07-28';
    const interval = params.interval || 'week';
    const programIds = params.programIds || [];
    const viewMode = params.viewMode || 'combine';
    const { bucketKey, allBuckets, COMPARE_COLORS } = ctx;

    const filtered = programIds.length > 0
      ? submissions.filter(function(s) { return programIds.includes(s.originators.programId || ''); })
      : submissions;

    function buildRows(subs, start, end, ivl) {
      const buckets = allBuckets(start, end, ivl);
      const byBucket = {};
      for (const s of subs) {
        const k = bucketKey(s.createdAt, ivl);
        if (!byBucket[k]) byBucket[k] = [];
        byBucket[k].push(s);
      }
      return buckets.map(function(bucket) {
        const week = byBucket[bucket] || [];
        const received = week.length;
        const accepted = week.filter(function(s) { return s.state.status.value === 'Accepted'; }).length;
        const rejected = week.filter(function(s) { return s.state.closeReason && (s.state.closeReason.value === 'Not Applicable' || s.state.closeReason.value === 'Informative'); }).length;
        const duplicate = week.filter(function(s) { return s.state.closeReason && s.state.closeReason.value === 'Duplicate'; }).length;
        return { period: bucket, received: received, accepted: accepted, rejected: rejected, duplicate: duplicate, processed: accepted + rejected + duplicate };
      });
    }

    const rows = buildRows(filtered, startDate, endDate, interval);
    const summaryCards = [
      { label: 'Total Received', value: rows.reduce(function(s, r) { return s + r.received; }, 0) },
      { label: 'Accepted / Valid', value: rows.reduce(function(s, r) { return s + r.accepted; }, 0) },
      { label: 'Rejected / Informative', value: rows.reduce(function(s, r) { return s + r.rejected; }, 0) },
      { label: 'Duplicates', value: rows.reduce(function(s, r) { return s + r.duplicate; }, 0) },
    ];

    if (viewMode === 'compare' && programIds.length > 1) {
      const programList = params.programs || [];
      const buckets = allBuckets(startDate, endDate, interval);
      const byBucketByProg = {};
      for (const s of filtered) {
        const k = bucketKey(s.createdAt, interval);
        const pid = s.originators.programId || '';
        if (!byBucketByProg[k]) byBucketByProg[k] = {};
        byBucketByProg[k][pid] = (byBucketByProg[k][pid] || 0) + 1;
      }
      const compareData = buckets.map(function(bucket) {
        const row = { period: bucket };
        for (const id of programIds) row[id] = (byBucketByProg[bucket] && byBucketByProg[bucket][id]) || 0;
        return row;
      });
      const dynamicChartConfig = {
        type: 'bar', xKey: 'period', xLabel: 'Period', yLabel: 'Submissions Received',
        allowedChartTypes: programIds.length <= 5 ? ['bar', 'stackedBar', 'line'] : ['bar', 'stackedBar'],
        series: programIds.map(function(id, i) { return { key: id, label: (programList.find(function(p) { return p.id === id; }) || {}).name || id, color: COMPARE_COLORS[i % COMPARE_COLORS.length] }; }),
      };
      return { rows: rows, chartData: compareData, summaryCards: summaryCards, chartConfig: dynamicChartConfig, rawData: raw };
    }

    return { rows: rows, chartData: rows, summaryCards: summaryCards, rawData: raw };
  `,

  customSummaryFormatter: `
    const cards = data.summaryCards;
    return 'Total received: ' + cards[0].value + '. Accepted: ' + cards[1].value + '.';
  `,

  sampleFixtureData: sampleSubmissions,
  sampleFixtureParams: {
    programIds: ['prog-alpha-001'],
    startDate: '2025-07-01',
    endDate: '2025-07-28',
    interval: 'week',
  },
}
