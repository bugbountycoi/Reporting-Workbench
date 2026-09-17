import type { UserModuleSpec } from '../userModules/types'
import payoutsSample from '../../fixtures/payouts.sample.json'

const PERIOD_OPTIONS = [
  { value: '3', label: '3 months' },
  { value: '6', label: '6 months' },
  { value: '9', label: '9 months' },
  { value: '12', label: '12 months' },
]

export const intigrityPayoutHistorySpec: UserModuleSpec = {
  schemaVersion: 1,
  id: 'intigrityPayoutHistory',
  title: 'Intigriti Monthly Payout History',
  description:
    'Historical bounty payments by month — total awarded, payment count, and average award size. Filter by lookback period (3, 6, 9, or 12 months).',
  category: 'bounty',
  author: 'Reporting Workbench',
  version: '1.0.0',

  dataSource: 'payouts',
  params: { includePrograms: true, includeDateRange: false, includeInterval: false },

  groupBy: 'time.month',
  metrics: [],
  sortBy: { key: 'month', dir: 'asc' },
  summaryCards: [],
  chartType: 'bar',
  chartXLabel: 'Month',
  chartYLabel: 'USD Awarded',
  allowedChartTypes: ['bar', 'line'],
  series: [{ metricKey: 'total', color: 'var(--brand-blue)' }],
  tableColumns: [
    { key: 'month', label: 'Month' },
    { key: 'count', label: 'Payments' },
    { key: 'total', label: 'Total Awarded' },
    { key: 'avg', label: 'Avg Award' },
  ],
  exportFilename: 'intgrity-payout-history',

  customParamFields: [
    {
      key: 'period',
      label: 'Lookback Period',
      type: 'select',
      required: false,
      defaultValue: '12',
      options: PERIOD_OPTIONS,
    },
  ],

  customFetchData: `
    const ids = params.programIds || [];
    if (ids.length === 0) throw new Error('At least one program is required');
    const payouts = await ctx.getAllPayouts();
    return { payouts: payouts };
  `,

  customTransform: `
    const { payouts } = raw;
    const programIds = params.programIds || [];
    const period = parseInt(params.period || '12', 10);
    const cutoffTs = (Date.now() / 1000) - (period * 30 * 24 * 3600);

    const byProgram = programIds.length > 0
      ? payouts.filter(function(p) { return programIds.includes(p.originators.programId || ''); })
      : payouts;

    // Apply the lookback period window
    const filtered = byProgram.filter(function(p) {
      const ts = p.paidAt || p.createdAt;
      return ts >= cutoffTs;
    });

    const byMonth = {};
    for (const p of filtered) {
      const ts = p.paidAt || p.createdAt;
      const d = new Date(ts * 1000);
      const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      if (!byMonth[key]) byMonth[key] = { count: 0, total: 0 };
      byMonth[key].count++;
      byMonth[key].total += p.amount.value;
    }

    const currency = (filtered[0] && filtered[0].amount.currency) || 'USD';

    const chartData = Object.entries(byMonth)
      .sort(function(a, b) { return a[0].localeCompare(b[0]); })
      .map(function(entry) {
        const month = entry[0];
        const d = entry[1];
        return { month: month, total: Math.round(d.total), count: d.count, avg: Math.round(d.total / d.count) };
      });

    const totalPaid = filtered.reduce(function(s, p) { return s + p.amount.value; }, 0);
    const avgAward = filtered.length > 0 ? Math.round(totalPaid / filtered.length) : 0;
    const monthlyAvg = chartData.length > 0 ? Math.round(totalPaid / chartData.length) : 0;

    const summaryCards = [
      { label: 'Total Paid', value: currency + ' ' + Math.round(totalPaid).toLocaleString(), subValue: 'Last ' + period + ' months' },
      { label: 'Payment Count', value: filtered.length },
      { label: 'Avg Award', value: currency + ' ' + avgAward.toLocaleString() },
      { label: 'Avg per Month', value: currency + ' ' + monthlyAvg.toLocaleString() },
    ];

    const rows = chartData.map(function(r) {
      return {
        month: r.month,
        count: r.count,
        total: currency + ' ' + r.total.toLocaleString(),
        avg: currency + ' ' + r.avg.toLocaleString(),
      };
    });

    const dynamicChartConfig = {
      type: 'bar', xKey: 'month', xLabel: 'Month', yLabel: currency + ' Awarded',
      allowedChartTypes: ['bar', 'line'],
      series: [{ key: 'total', label: 'Total Awarded', color: 'var(--brand-blue)' }],
    };

    return { rows: rows, chartData: chartData, summaryCards: summaryCards, chartConfig: dynamicChartConfig, rawData: raw };
  `,

  customSummaryFormatter: `
    const cards = data.summaryCards;
    return 'Paid ' + cards[1].value + ' bounties totalling ' + cards[0].value + ' (' + cards[2].value + ' avg per award, ' + cards[3].value + ' avg per month).';
  `,

  sampleFixtureData: { payouts: payoutsSample },
  sampleFixtureParams: { programIds: ['prog-alpha-001'], period: '12' },
}
