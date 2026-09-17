import type { UserModuleSpec } from '../userModules/types'
import submissionsSample from '../../fixtures/submissions.sample.json'

const PERIOD_OPTIONS = [
  { value: '3', label: '3 months' },
  { value: '6', label: '6 months' },
  { value: '9', label: '9 months' },
  { value: '12', label: '12 months' },
]

export const intigrityQueueForecastSpec: UserModuleSpec = {
  schemaVersion: 1,
  id: 'intigrityQueueForecast',
  title: 'Intigriti Queue Cost Forecast',
  description:
    'Estimates total payout cost for all queued unpaid reports using historical severity-based averages and validity ratio. Formula: X reports × Y avg cost × Z validity ratio = K estimated spend. Adjust the lookback period to see how recent trends shift the estimate.',
  category: 'bounty',
  author: 'Reporting Workbench',
  version: '1.0.0',

  dataSource: 'submissions',
  params: { includePrograms: true, includeDateRange: false, includeInterval: false },

  groupBy: 'severity',
  metrics: [],
  sortBy: { key: 'severity', dir: 'asc' },
  summaryCards: [],
  chartType: 'bar',
  chartXLabel: 'Severity',
  chartYLabel: 'USD Estimated',
  allowedChartTypes: ['bar'],
  series: [{ metricKey: 'estimate', color: 'var(--brand-red)' }],
  tableColumns: [
    { key: 'severity', label: 'Severity' },
    { key: 'queueCount', label: 'In Queue' },
    { key: 'histAvg', label: 'Historical Avg Payout' },
    { key: 'estimate', label: 'Estimated Total' },
  ],
  exportFilename: 'intgrity-queue-forecast',

  customParamFields: [
    {
      key: 'period',
      label: 'Historical Lookback',
      type: 'select',
      required: false,
      defaultValue: '12',
      options: PERIOD_OPTIONS,
    },
  ],

  customFetchData: `
    const ids = params.programIds || [];
    if (ids.length === 0) throw new Error('At least one program is required');
    const results = await Promise.all(ids.map(function(id) { return ctx.getProgramSubmissions(id); }));
    return results.flat();
  `,

  customTransform: `
    const submissions = raw;
    const programIds = params.programIds || [];
    const period = parseInt(params.period || '12', 10);
    const cutoffTs = (Date.now() / 1000) - (period * 30 * 24 * 3600);

    const filtered = programIds.length > 0
      ? submissions.filter(function(s) { return programIds.includes(s.originators.programId || ''); })
      : submissions;

    // Queue: all unresolved reports (not closed, not accepted-and-paid)
    const queue = filtered.filter(function(s) {
      const status = s.state.status.value;
      if (status === 'Closed') return false;
      if (status === 'Accepted' && s.totalPayout != null) return false;
      return true;
    });

    // Validity ratio over the selected period: (paid submissions) / (all submitted)
    const recent = filtered.filter(function(s) { return s.createdAt >= cutoffTs; });
    const recentPaid = recent.filter(function(s) { return s.totalPayout != null; });
    const validityRatio = recent.length > 0 ? recentPaid.length / recent.length : 0;

    // Historical avg payout per severity: use accepted-paid submissions from within period
    // Fallback values apply when no historical data exists for a severity level in this window
    const DEFAULT_AVGS = { Informational: 0, Low: 200, Medium: 800, High: 2500, Critical: 8000 };
    const SEVERITY_ORDER = ['Informational', 'Low', 'Medium', 'High', 'Critical'];

    const histStats = {};
    for (const s of filtered) {
      if (s.createdAt >= cutoffTs && s.totalPayout && s.state.status.value === 'Accepted') {
        const sev = s.severity.value;
        if (!histStats[sev]) histStats[sev] = { count: 0, total: 0 };
        histStats[sev].count++;
        histStats[sev].total += s.totalPayout.value;
      }
    }

    const firstPaid = recentPaid[0];
    const currency = (firstPaid && firstPaid.totalPayout && firstPaid.totalPayout.currency) || 'USD';

    let totalRawEstimate = 0;
    let totalWeightedCost = 0;

    const sevRows = SEVERITY_ORDER.map(function(sev) {
      const queueCount = queue.filter(function(s) { return s.severity.value === sev; }).length;
      const stats = histStats[sev] || { count: 0, total: 0 };
      const histAvg = stats.count > 0
        ? Math.round(stats.total / stats.count)
        : (DEFAULT_AVGS[sev] || 0);
      const rawEstimate = queueCount * histAvg;
      totalRawEstimate += rawEstimate;
      totalWeightedCost += histAvg * queueCount;
      return {
        severity: sev,
        queueCount: queueCount,
        histAvg: currency + ' ' + histAvg.toLocaleString(),
        estimate: currency + ' ' + rawEstimate.toLocaleString(),
        estimateNum: rawEstimate,
        histAvgNum: histAvg,
        hasHistoricalData: stats.count > 0,
      };
    });

    const totalQueueCount = queue.length;
    const avgCostPerReport = totalQueueCount > 0 ? Math.round(totalWeightedCost / totalQueueCount) : 0;
    // K = X × Y × Z
    const forecastK = Math.round(totalRawEstimate * validityRatio);

    const summaryCards = [
      {
        label: 'Queue Total (X)',
        value: totalQueueCount + ' reports',
        subValue: 'New + Triage + Pending payment',
      },
      {
        label: 'Validity Ratio (Z)',
        value: (validityRatio * 100).toFixed(1) + '%',
        subValue: recentPaid.length + ' paid / ' + recent.length + ' submitted (' + period + ' mo)',
      },
      {
        label: 'Avg Cost / Report (Y)',
        value: currency + ' ' + avgCostPerReport.toLocaleString(),
        subValue: 'Severity-weighted, ' + period + '-month history',
      },
      {
        label: 'Estimated Total (K)',
        value: currency + ' ' + forecastK.toLocaleString(),
        subValue: 'X × Y × Z',
      },
    ];

    const chartData = sevRows
      .filter(function(r) { return r.queueCount > 0; })
      .map(function(r) {
        return { severity: r.severity, count: r.queueCount, estimate: r.estimateNum, histAvg: r.histAvgNum };
      });

    const dynamicChartConfig = {
      type: 'bar', xKey: 'severity', xLabel: 'Severity', yLabel: currency + ' Estimated Cost',
      allowedChartTypes: ['bar'],
      series: [{ key: 'estimate', label: 'Estimated Cost', color: 'var(--brand-red)' }],
    };

    const rows = sevRows.map(function(r) {
      return {
        severity: r.severity,
        queueCount: r.queueCount,
        histAvg: r.hasHistoricalData ? r.histAvg : r.histAvg + ' ✱',
        estimate: r.estimate,
      };
    });

    return {
      rows: rows,
      chartData: chartData,
      summaryCards: summaryCards,
      chartConfig: dynamicChartConfig,
      rawData: raw,
    };
  `,

  customSummaryFormatter: `
    const cards = data.summaryCards;
    return 'Forecast: ' + cards[3].value + ' to pay all queued reports (' + cards[0].value + ' at ' + cards[2].value + ' avg, ' + cards[1].value + ' validity). Formula: X × Y × Z = K.';
  `,

  sampleFixtureData: submissionsSample,
  sampleFixtureParams: { programIds: ['prog-alpha-001'], period: '12' },
}
