import type { UserModuleSpec } from '../userModules/types'
import { sampleSubmissions } from './fixtures'
import { BC } from '../../themes/brandColors'

export const dailyTriageMovementSpec: UserModuleSpec = {
  schemaVersion: 1,
  id: 'dailyTriageMovement',
  title: 'Daily Triage Movement',
  description:
    'Shows submission flow in and out of triage for the selected program, date range, and time interval.',
  category: 'triage',
  author: 'Intigriti Reporting Workbench',
  version: '1.0.0',

  dataSource: 'submissions',
  params: { includePrograms: true, includeDateRange: true, includeInterval: true },

  // Declarative fields are superseded by customTransform below
  groupBy: 'time.day',
  metrics: [],
  sortBy: { key: 'period', dir: 'asc' },
  summaryCards: [],
  chartType: 'stackedBar',
  chartXLabel: 'Period',
  chartYLabel: 'Submissions',
  allowedChartTypes: ['stackedBar', 'bar', 'line'],
  series: [
    { metricKey: 'new', color: BC.blue },
    { metricKey: 'forwarded', color: BC.green },
    { metricKey: 'closed', color: BC.grayMid },
    { metricKey: 'duplicate', color: BC.gold },
  ],
  tableColumns: [
    { key: 'period', label: 'Period' },
    { key: 'new', label: 'New' },
    { key: 'forwarded', label: 'Forwarded' },
    { key: 'closed', label: 'Closed' },
    { key: 'duplicate', label: 'Duplicate' },
    { key: 'netChange', label: 'Net Change' },
  ],
  exportFilename: 'daily-triage-movement',

  customFetchData: `
    const ids = params.programIds || [];
    if (ids.length === 0) throw new Error('At least one program is required');
    const results = await Promise.all(ids.map(function(id) { return ctx.getProgramSubmissions(id); }));
    return results.flat();
  `,

  customTransform: `
    const submissions = raw;
    const startDate = params.startDate || '2025-07-11';
    const endDate = params.endDate || '2025-07-28';
    const interval = params.interval || 'day';
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
        const inBucket = byBucket[bucket] || [];
        const newCount = inBucket.length;
        const forwardedCount = inBucket.filter(function(s) { return s.state.status.value.toLowerCase().includes('forwarded'); }).length;
        const duplicateCount = inBucket.filter(function(s) { return (s.state.closeReason && s.state.closeReason.value.toLowerCase() === 'duplicate'); }).length;
        const closedCount = inBucket.filter(function(s) { return s.state.status.value.toLowerCase() === 'closed' && !(s.state.closeReason && s.state.closeReason.value.toLowerCase().includes('duplicate')); }).length;
        return { period: bucket, new: newCount, forwarded: forwardedCount, closed: closedCount, duplicate: duplicateCount, netChange: newCount - closedCount - duplicateCount };
      });
    }

    const rows = buildRows(filtered, startDate, endDate, interval);
    const totalNew = rows.reduce(function(s, r) { return s + r.new; }, 0);
    const totalClosed = rows.reduce(function(s, r) { return s + r.closed; }, 0);
    const netChange = rows.reduce(function(s, r) { return s + r.netChange; }, 0);

    const summaryCards = [
      { label: 'New Submissions', value: totalNew, trend: 'neutral' },
      { label: 'Forwarded to Customer', value: rows.reduce(function(s, r) { return s + r.forwarded; }, 0), trend: 'neutral' },
      { label: 'Closed / Rejected', value: totalClosed, trend: 'neutral' },
      { label: 'Net Queue Change', value: netChange > 0 ? '+' + netChange : netChange, trend: netChange > 0 ? 'up' : netChange < 0 ? 'down' : 'neutral' },
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
        type: 'bar', xKey: 'period', xLabel: 'Period', yLabel: 'New Submissions',
        allowedChartTypes: programIds.length <= 5 ? ['bar', 'stackedBar', 'line'] : ['bar', 'stackedBar'],
        series: programIds.map(function(id, i) { return { key: id, label: (programList.find(function(p) { return p.id === id; }) || {}).name || id, color: COMPARE_COLORS[i % COMPARE_COLORS.length] }; }),
      };
      return { rows: rows, chartData: compareData, summaryCards: summaryCards, chartConfig: dynamicChartConfig, rawData: raw };
    }

    return { rows: rows, chartData: rows, summaryCards: summaryCards, rawData: raw };
  `,

  customSummaryFormatter: `
    const cards = data.summaryCards;
    return 'Received ' + cards[0].value + ' submissions. Net queue change: ' + cards[3].value + '.';
  `,

  sampleFixtureData: sampleSubmissions,
  sampleFixtureParams: {
    programIds: ['prog-alpha-001'],
    startDate: '2025-07-11',
    endDate: '2025-07-24',
    interval: 'day',
  },
}
