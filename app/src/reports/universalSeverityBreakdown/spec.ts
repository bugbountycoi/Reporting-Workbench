import type { UserModuleSpec } from '../userModules/types'
import { universalFixtures } from '../universalFixtures'

export const universalSeverityBreakdownSpec: UserModuleSpec = {
  schemaVersion: 1,
  id: 'universal-severity-breakdown',
  title: 'Severity Breakdown',
  description:
    'Distribution of submissions by severity — works on Intigriti, HackerOne, and Bugcrowd. Shows critical, high, medium, low, and informational counts with acceptance and bounty totals.',
  category: 'snapshot',
  author: 'Reporting Workbench',
  version: '1.0.0',
  platform: 'universal',

  dataSource: 'submissions',
  params: { includePrograms: true, includeDateRange: true, includeInterval: false },

  groupBy: 'severity',
  metrics: [],
  sortBy: { key: 'count', dir: 'desc' },
  summaryCards: [],
  chartType: 'bar',
  chartXLabel: 'Severity',
  chartYLabel: 'Submissions',
  allowedChartTypes: ['bar', 'stackedBar'],
  series: [
    { metricKey: 'count',     color: '#64748b' },
    { metricKey: 'accepted',  color: '#22c55e' },
  ],
  tableColumns: [
    { key: 'severity',        label: 'Severity' },
    { key: 'count',           label: 'Total' },
    { key: 'accepted',        label: 'Accepted' },
    { key: 'pctAccepted',     label: '% Accepted' },
    { key: 'bountyTotal',     label: 'Bounty Paid (USD)' },
  ],
  exportFilename: 'severity-breakdown',

  customFetchData: `
    var ids = params.programIds || [];
    if (ids.length === 0) throw new Error('At least one program is required');
    var results = await Promise.all(ids.map(function(id) { return ctx.getSubmissions(id); }));
    var all = results.flat();
    var start = params.startDate ? new Date(params.startDate).getTime() / 1000 : 0;
    var end   = params.endDate   ? new Date(params.endDate).getTime()   / 1000 : Infinity;
    return all.filter(function(s) { return s.submittedAt >= start && s.submittedAt <= end; });
  `,

  customTransform: `
    var ORDER = ['critical', 'high', 'medium', 'low', 'informational', 'unknown'];
    var COLORS = {
      critical:      '#dc2626',
      high:          '#ea580c',
      medium:        '#ca8a04',
      low:           '#16a34a',
      informational: '#0284c7',
      unknown:       '#94a3b8',
    };

    var groups = {};
    for (var i = 0; i < raw.length; i++) {
      var s = raw[i];
      var sev = s.severity || 'unknown';
      if (!groups[sev]) groups[sev] = { severity: sev, count: 0, accepted: 0, bountyTotal: 0 };
      groups[sev].count++;
      if (s.state === 'resolved') {
        groups[sev].accepted++;
        if (s.payoutAmount) groups[sev].bountyTotal += s.payoutAmount;
      }
    }

    var rows = ORDER.filter(function(sev) { return groups[sev]; }).map(function(sev) {
      var g = groups[sev];
      return {
        severity:    g.severity,
        count:       g.count,
        accepted:    g.accepted,
        pctAccepted: g.count > 0 ? Math.round(g.accepted / g.count * 100) + '%' : '0%',
        bountyTotal: g.bountyTotal > 0 ? '$' + Math.round(g.bountyTotal).toLocaleString() : '—',
      };
    });

    var total      = raw.length;
    var critCount  = (groups['critical']  || {}).count    || 0;
    var highCount  = (groups['high']      || {}).count    || 0;
    var totalAccepted = rows.reduce(function(acc, r) { return acc + r.accepted; }, 0);
    var critHigh   = critCount + highCount;
    var allBounty  = rows.reduce(function(acc, r) {
      var n = parseFloat((r.bountyTotal || '').replace(/[$,]/g, ''));
      return acc + (isNaN(n) ? 0 : n);
    }, 0);

    var chartData = rows.map(function(r) {
      return { label: r.severity, count: r.count, accepted: r.accepted, color: COLORS[r.severity] || '#94a3b8' };
    });

    return {
      rows: rows,
      chartData: chartData,
      summaryCards: [
        { label: 'Total Submissions', value: total },
        { label: 'Critical + High',   value: critHigh + ' (' + (total > 0 ? Math.round(critHigh/total*100) : 0) + '%)' },
        { label: 'Accepted',          value: totalAccepted + ' (' + (total > 0 ? Math.round(totalAccepted/total*100) : 0) + '%)' },
        { label: 'Total Bounty Paid', value: allBounty > 0 ? '$' + Math.round(allBounty).toLocaleString() : '—' },
      ],
      rawData: raw,
    };
  `,

  sampleFixtureData: universalFixtures,
  sampleFixtureParams: {
    programIds: ['prog-alpha-001'],
    startDate: '2024-01-01',
    endDate: '2026-09-01',
  },
}
