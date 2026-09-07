import type { UserModuleSpec } from '../userModules/types'
import { universalFixtures } from '../universalFixtures'
import { BC } from '../../themes/brandColors'

export const universalVolumetrendSpec: UserModuleSpec = {
  schemaVersion: 1,
  id: 'universal-volume-trend',
  title: 'Submission Volume Trend',
  description:
    'Monthly submission volume across any platform. Shows total, high-severity, and accepted submission counts over time — useful for spotting growth trends, campaign spikes, and seasonal patterns.',
  category: 'triage',
  author: 'Reporting Workbench',
  version: '1.0.0',
  // platform intentionally omitted — this module runs on any platform

  dataSource: 'submissions',
  params: { includePrograms: true, includeDateRange: true, includeInterval: true },

  groupBy: 'time.month',
  metrics: [],
  sortBy: { key: 'period', dir: 'asc' },
  summaryCards: [],
  chartType: 'line',
  chartXLabel: 'Month',
  chartYLabel: 'Submissions',
  allowedChartTypes: ['line', 'bar', 'stackedBar'],
  series: [
    { metricKey: 'total',    color: BC.blue },
    { metricKey: 'highSev',  color: BC.red ?? '#dc2626' },
    { metricKey: 'accepted', color: BC.green },
  ],
  tableColumns: [
    { key: 'period',       label: 'Month' },
    { key: 'total',        label: 'Total' },
    { key: 'deltaTotal',   label: 'Δ Total' },
    { key: 'highSev',      label: 'Critical + High' },
    { key: 'accepted',     label: 'Accepted' },
    { key: 'pctAccepted',  label: '% Accepted' },
  ],
  exportFilename: 'submission-volume-trend',

  customFetchData: `
    var ids = params.programIds || [];
    if (ids.length === 0) throw new Error('At least one program is required');
    var results = await Promise.all(ids.map(function(id) { return ctx.getSubmissions(id); }));
    return results.flat();
  `,

  customTransform: `
    var startDate  = params.startDate || '2024-01-01';
    var endDate    = params.endDate   || '2026-09-01';
    var interval   = params.interval  || 'month';
    var allBuckets = ctx.allBuckets;

    var startMs = new Date(startDate).getTime();
    var endMs   = new Date(endDate).getTime() + 86400000 - 1;

    function monthStart(ts) {
      // ts in seconds — return ISO string YYYY-MM-01
      var d = new Date(ts * 1000);
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-01';
    }

    // Group submissions into month buckets (always month for volume trend)
    var buckets = {};
    for (var i = 0; i < raw.length; i++) {
      var s = raw[i];
      var ms = s.submittedAt * 1000;
      if (ms < startMs || ms > endMs) continue;
      var key = monthStart(s.submittedAt);
      if (!buckets[key]) buckets[key] = { total: 0, highSev: 0, accepted: 0 };
      buckets[key].total++;
      if (s.severity === 'critical' || s.severity === 'high') buckets[key].highSev++;
      if (s.state === 'resolved') buckets[key].accepted++;
    }

    // Build sorted rows for every calendar month in the range (fill gaps with 0)
    var periods = allBuckets(startDate, endDate, 'month');
    var rows = periods.map(function(period) {
      var b = buckets[period] || { total: 0, highSev: 0, accepted: 0 };
      return {
        period:      period,
        total:       b.total,
        deltaTotal:  0,
        highSev:     b.highSev,
        accepted:    b.accepted,
        pctAccepted: b.total > 0 ? Math.round(b.accepted / b.total * 100) + '%' : '0%',
      };
    });

    for (var j = 1; j < rows.length; j++) {
      rows[j].deltaTotal = rows[j].total - rows[j - 1].total;
    }

    var tableRows = rows.map(function(r) {
      return Object.assign({}, r, {
        deltaTotal: r.deltaTotal > 0 ? '+' + r.deltaTotal : r.deltaTotal,
      });
    });

    var totalAll  = rows.reduce(function(a, r) { return a + r.total; }, 0);
    var lastMonth = rows.length > 0 ? rows[rows.length - 1] : { total: 0, accepted: 0 };
    var prevMonth = rows.length > 1 ? rows[rows.length - 2] : null;
    var trend = prevMonth
      ? (lastMonth.total > prevMonth.total ? 'up' : lastMonth.total < prevMonth.total ? 'down' : 'neutral')
      : 'neutral';

    return {
      rows: tableRows,
      chartData: rows.map(function(r) {
        return { label: r.period, total: r.total, highSev: r.highSev, accepted: r.accepted };
      }),
      summaryCards: [
        { label: 'Total in Period',   value: totalAll },
        { label: 'Last Month',        value: lastMonth.total, trend: trend },
        { label: 'Accepted Last Month', value: lastMonth.accepted },
        { label: '% Accepted (Last)', value: lastMonth.total > 0 ? Math.round(lastMonth.accepted / lastMonth.total * 100) + '%' : '0%' },
      ],
      rawData: raw,
    };
  `,

  sampleFixtureData: universalFixtures,
  sampleFixtureParams: {
    programIds: ['prog-alpha-001'],
    startDate: '2024-01-01',
    endDate: '2026-09-01',
    interval: 'month',
  },
}
