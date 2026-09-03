import type { UserModuleSpec } from '../userModules/types'
import payoutsSample from '../../fixtures/payouts.sample.json'
import { BC } from '../../themes/brandColors'

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

export const bountyBudgetOverviewSpec: UserModuleSpec = {
  schemaVersion: 1,
  id: 'bountyBudgetOverview',
  title: 'Bounty Budget Overview',
  description: 'Shows bounty spend, award distribution by severity, and remaining program budget.',
  category: 'bounty',
  author: 'Reporting Workbench',
  version: '1.0.0',

  dataSource: 'payouts',
  params: { includePrograms: true, includeDateRange: false, includeInterval: true },

  groupBy: 'payout.type',
  metrics: [],
  sortBy: { key: 'period', dir: 'asc' },
  summaryCards: [],
  chartType: 'bar',
  chartXLabel: 'Period',
  chartYLabel: 'USD Awarded',
  allowedChartTypes: ['bar', 'line'],
  series: [{ metricKey: 'total', color: BC.blue }],
  tableColumns: [
    { key: 'severity', label: 'Severity' },
    { key: 'count', label: 'Count' },
    { key: 'total', label: 'Total (USD)' },
    { key: 'avg', label: 'Avg Award (USD)' },
  ],
  exportFilename: 'bounty-budget-overview',

  customFetchData: `
    const ids = params.programIds || [];
    if (ids.length === 0) throw new Error('At least one program is required');
    const payouts = await ctx.getAllPayouts();
    const programDetails = await Promise.all(ids.map(function(id) { return ctx.getProgramDetail(id); }));
    return { payouts: payouts, programDetails: programDetails };
  `,

  customTransform: `
    const { payouts, programDetails } = raw;
    const interval = params.interval || 'week';
    const programIds = params.programIds || [];
    const viewMode = params.viewMode || 'combine';
    const { bucketKey, COMPARE_COLORS } = ctx;

    const filtered = programIds.length > 0
      ? payouts.filter(function(p) { return programIds.includes(p.originators.programId || ''); })
      : payouts;

    const totalAwarded = filtered.reduce(function(s, p) { return s + p.amount.value; }, 0);
    const currency = (filtered[0] && filtered[0].amount.currency) || 'USD';
    const avgAward = filtered.length > 0 ? Math.round(totalAwarded / filtered.length) : 0;
    const budget = programIds.length === 1 ? (programDetails[0] && programDetails[0].programBudget) : null;

    // Group by severity (payouts don't carry severity; all assigned Unknown for now)
    const groups = {};
    for (const p of filtered) {
      const sev = 'Unknown';
      if (!groups[sev]) groups[sev] = { count: 0, total: 0 };
      groups[sev].count++;
      groups[sev].total += p.amount.value;
    }
    const bySeverityData = Object.entries(groups).map(function([severity, data]) {
      return { severity: severity, count: data.count, total: data.total, avg: data.count > 0 ? Math.round(data.total / data.count) : 0 };
    });

    // Group by interval for chart
    function groupByInterval(ps, ivl) {
      const buckets = {};
      for (const p of ps) {
        const key = bucketKey(p.createdAt, ivl);
        buckets[key] = (buckets[key] || 0) + p.amount.value;
      }
      return Object.entries(buckets).sort(function(a, b) { return a[0].localeCompare(b[0]); }).map(function([period, total]) { return { period: period, total: total }; });
    }

    function groupByIntervalPerProgram(ps, pid, ivl) {
      const buckets = {};
      for (const p of ps.filter(function(x) { return (x.originators.programId || '') === pid; })) {
        const key = bucketKey(p.createdAt, ivl);
        buckets[key] = (buckets[key] || 0) + p.amount.value;
      }
      return buckets;
    }

    const summaryCards = [
      { label: 'Total Awarded', value: currency + ' ' + totalAwarded.toLocaleString() },
      { label: 'Award Count', value: filtered.length },
      { label: 'Avg Award', value: currency + ' ' + avgAward.toLocaleString() },
      { label: 'Budget Remaining', value: budget && budget.budgetLeft ? budget.budgetLeft.currency + ' ' + budget.budgetLeft.value.toLocaleString() : 'N/A' },
    ];

    if (viewMode === 'compare' && programIds.length > 1) {
      const programList = params.programs || [];
      const allPeriods = new Set();
      for (const id of programIds) {
        const perProg = groupByIntervalPerProgram(filtered, id, interval);
        Object.keys(perProg).forEach(function(k) { allPeriods.add(k); });
      }
      const compareData = Array.from(allPeriods).sort().map(function(period) {
        const row = { period: period };
        for (const id of programIds) {
          const perProg = groupByIntervalPerProgram(filtered, id, interval);
          row[id] = perProg[period] || 0;
        }
        return row;
      });
      const dynamicChartConfig = {
        type: 'bar', xKey: 'period', xLabel: 'Period', yLabel: currency + ' Awarded',
        allowedChartTypes: programIds.length <= 5 ? ['bar', 'stackedBar', 'line'] : ['bar', 'stackedBar'],
        series: programIds.map(function(id, i) { return { key: id, label: (programList.find(function(p) { return p.id === id; }) || {}).name || id, color: COMPARE_COLORS[i % COMPARE_COLORS.length] }; }),
      };
      return { rows: bySeverityData, chartData: compareData, summaryCards: summaryCards, chartConfig: dynamicChartConfig, rawData: raw };
    }

    const byIntervalData = groupByInterval(filtered, interval);
    return { rows: bySeverityData, chartData: byIntervalData, summaryCards: summaryCards, rawData: raw };
  `,

  customSummaryFormatter: `
    const cards = data.summaryCards;
    return 'Awarded ' + cards[0].value + ' across ' + cards[1].value + ' submissions (avg ' + cards[2].value + '). Budget remaining: ' + cards[3].value + '.';
  `,

  sampleFixtureData: sampleRaw,
  sampleFixtureParams: { programIds: ['prog-alpha-001'], interval: 'week' },
}
