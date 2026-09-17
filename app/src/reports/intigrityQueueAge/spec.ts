import type { UserModuleSpec } from '../userModules/types'
import { sampleSubmissions } from '../dailyTriageMovement/fixtures'

export const intigrityQueueAgeSpec: UserModuleSpec = {
  schemaVersion: 1,
  id: 'intigrityQueueAge',
  title: 'Intigriti Queue Age Distribution',
  description:
    'Age histogram of unpaid reports in the queue (New, Triage, Forwarded to customer, and accepted but not yet paid), grouped by months since submission.',
  category: 'bounty',
  author: 'Reporting Workbench',
  version: '1.0.0',

  dataSource: 'submissions',
  params: { includePrograms: true, includeDateRange: false, includeInterval: false },

  groupBy: 'time.month',
  metrics: [],
  sortBy: { key: 'age', dir: 'asc' },
  summaryCards: [],
  chartType: 'bar',
  chartXLabel: 'Age',
  chartYLabel: 'Reports in Queue',
  allowedChartTypes: ['bar', 'line'],
  series: [{ metricKey: 'count', color: 'var(--brand-orange)' }],
  tableColumns: [
    { key: 'age', label: 'Age' },
    { key: 'count', label: 'Reports' },
  ],
  exportFilename: 'intgrity-queue-age',

  customFetchData: `
    const ids = params.programIds || [];
    if (ids.length === 0) throw new Error('At least one program is required');
    const results = await Promise.all(ids.map(function(id) { return ctx.getProgramSubmissions(id); }));
    return results.flat();
  `,

  customTransform: `
    const submissions = raw;
    const programIds = params.programIds || [];

    const filtered = programIds.length > 0
      ? submissions.filter(function(s) { return programIds.includes(s.originators.programId || ''); })
      : submissions;

    // Queue: not closed, and not accepted-with-payout (those are already paid)
    const queue = filtered.filter(function(s) {
      const status = s.state.status.value;
      if (status === 'Closed') return false;
      if (status === 'Accepted' && s.totalPayout != null) return false;
      return true;
    });

    // Group by age in complete months (floor of days / 30)
    const ageGroups = {};
    for (const s of queue) {
      const ageDays = ctx.daysBetween(s.createdAt);
      const ageMonths = Math.floor(ageDays / 30);
      const label = ageMonths === 0 ? '< 1 mo' : ageMonths + ' mo';
      const sortKey = String(ageMonths).padStart(4, '0');
      if (!ageGroups[label]) ageGroups[label] = { count: 0, ageMonths: ageMonths, sortKey: sortKey };
      ageGroups[label].count++;
    }

    const chartData = Object.entries(ageGroups)
      .sort(function(a, b) { return a[1].sortKey.localeCompare(b[1].sortKey); })
      .map(function(entry) { return { age: entry[0], count: entry[1].count }; });

    const oldestDays = queue.length > 0
      ? queue.reduce(function(max, s) { return Math.max(max, ctx.daysBetween(s.createdAt)); }, 0)
      : 0;
    const oldestMonths = Math.floor(oldestDays / 30);

    const avgAgeDays = queue.length > 0
      ? Math.round(queue.reduce(function(sum, s) { return sum + ctx.daysBetween(s.createdAt); }, 0) / queue.length)
      : 0;

    const summaryCards = [
      { label: 'Queue Total', value: queue.length, subValue: 'New + Triage + Pending' },
      { label: 'Oldest Report', value: oldestMonths + ' months old' },
      { label: 'Age Buckets', value: chartData.length },
      { label: 'Avg Age', value: avgAgeDays + ' days' },
    ];

    const dynamicChartConfig = {
      type: 'bar', xKey: 'age', xLabel: 'Age (months old)', yLabel: 'Reports in Queue',
      allowedChartTypes: ['bar', 'line'],
      series: [{ key: 'count', label: 'Reports', color: 'var(--brand-orange)' }],
    };

    return {
      rows: chartData,
      chartData: chartData,
      summaryCards: summaryCards,
      chartConfig: dynamicChartConfig,
      rawData: raw,
    };
  `,

  customSummaryFormatter: `
    const cards = data.summaryCards;
    return cards[0].value + ' reports in queue. Oldest is ' + cards[1].value + '. Average age is ' + cards[3].value + '.';
  `,

  sampleFixtureData: sampleSubmissions,
  sampleFixtureParams: { programIds: ['prog-alpha-001'] },
}
