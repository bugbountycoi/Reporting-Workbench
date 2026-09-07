import type { UserModuleSpec } from '../userModules/types'
import { universalFixtures } from '../universalFixtures'
import { BC } from '../../themes/brandColors'

export const universalResearcherLeaderboardSpec: UserModuleSpec = {
  schemaVersion: 1,
  id: 'universal-researcher-leaderboard',
  title: 'Researcher Leaderboard',
  description:
    'Top researchers ranked by accepted submissions and bounty earned. Normalized from any platform — works on Intigriti, HackerOne, and Bugcrowd.',
  category: 'snapshot',
  author: 'Reporting Workbench',
  version: '1.0.0',
  platform: 'universal',

  dataSource: 'submissions',
  params: { includePrograms: true, includeDateRange: true, includeInterval: false },

  groupBy: 'researcher',
  metrics: [],
  sortBy: { key: 'accepted', dir: 'desc' },
  summaryCards: [],
  chartType: 'bar',
  chartXLabel: 'Researcher',
  chartYLabel: 'Accepted Submissions',
  allowedChartTypes: ['bar'],
  series: [{ metricKey: 'accepted', color: BC.green }],
  tableColumns: [
    { key: 'rank',       label: '#' },
    { key: 'researcher', label: 'Researcher' },
    { key: 'total',      label: 'Total' },
    { key: 'accepted',   label: 'Accepted' },
    { key: 'invalid',    label: 'Invalid / Dup' },
    { key: 'bounty',     label: 'Bounty Earned (USD)' },
  ],
  exportFilename: 'researcher-leaderboard',

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
    var researchers = {};

    for (var i = 0; i < raw.length; i++) {
      var s = raw[i];
      var handle = s.researcherHandle || '(unknown)';
      if (!researchers[handle]) {
        researchers[handle] = { researcher: handle, total: 0, accepted: 0, invalid: 0, bounty: 0 };
      }
      researchers[handle].total++;
      if (s.state === 'resolved') {
        researchers[handle].accepted++;
        if (s.payoutAmount) researchers[handle].bounty += s.payoutAmount;
      }
      if (s.state === 'invalid' || s.state === 'duplicate') {
        researchers[handle].invalid++;
      }
    }

    // Sort by accepted desc, then total desc, then handle asc
    var sorted = Object.values(researchers).sort(function(a, b) {
      if (b.accepted !== a.accepted) return b.accepted - a.accepted;
      if (b.total    !== a.total)    return b.total    - a.total;
      return a.researcher.localeCompare(b.researcher);
    });

    // Limit to top 25
    var top = sorted.slice(0, 25);

    var rows = top.map(function(r, idx) {
      return {
        rank:       idx + 1,
        researcher: r.researcher,
        total:      r.total,
        accepted:   r.accepted,
        invalid:    r.invalid,
        bounty:     r.bounty > 0 ? '$' + Math.round(r.bounty).toLocaleString() : '—',
      };
    });

    var uniqueCount   = Object.keys(researchers).length;
    var topResearcher = top.length > 0 ? top[0].researcher : '—';
    var topAccepted   = top.length > 0 ? top[0].accepted   : 0;
    var topEarner     = sorted.slice().sort(function(a, b) { return b.bounty - a.bounty; })[0];

    var chartData = top.slice(0, 10).map(function(r) {
      return { label: r.researcher, accepted: r.accepted };
    });

    return {
      rows: rows,
      chartData: chartData,
      summaryCards: [
        { label: 'Unique Researchers',   value: uniqueCount },
        { label: 'Most Prolific',         value: topResearcher + ' (' + topAccepted + ' accepted)' },
        { label: 'Top Earner',            value: topEarner ? topEarner.researcher + ' ($' + Math.round(topEarner.bounty).toLocaleString() + ')' : '—' },
        { label: 'Avg Accepted/Researcher', value: uniqueCount > 0 ? Math.round(rows.reduce(function(a, r) { return a + r.accepted; }, 0) / uniqueCount * 10) / 10 : 0 },
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
