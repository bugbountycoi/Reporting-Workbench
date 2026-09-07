import type { UserModuleSpec } from '../userModules/types'
import { universalFixtures } from '../universalFixtures'
import { BC } from '../../themes/brandColors'

export const universalResolutionTimeSpec: UserModuleSpec = {
  schemaVersion: 1,
  id: 'universal-resolution-time',
  title: 'Mean Time to Resolution',
  description:
    'Distribution of time from submission to resolution, using the last-updated timestamp as a resolution proxy. Works on any platform. Useful for measuring response SLAs and identifying slow-moving submissions.',
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
  chartXLabel: 'Time to Resolution',
  chartYLabel: 'Submissions',
  allowedChartTypes: ['bar'],
  series: [{ metricKey: 'count', color: BC.blue }],
  tableColumns: [
    { key: 'bucket',   label: 'Time to Resolution' },
    { key: 'count',    label: 'Submissions' },
    { key: 'pct',      label: '% of Resolved' },
    { key: 'avgDays',  label: 'Avg Days in Bucket' },
  ],
  exportFilename: 'mean-time-to-resolution',

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
    var BUCKETS = [
      { label: '< 1 day',    min: 0,   max: 1   },
      { label: '1 – 7 days', min: 1,   max: 7   },
      { label: '8 – 30 days',min: 7,   max: 30  },
      { label: '31 – 90 days',min: 30, max: 90  },
      { label: '> 90 days',  min: 90,  max: Infinity },
    ];

    // Only count submissions that have actually been resolved or closed
    var resolved = raw.filter(function(s) {
      return (s.state === 'resolved' || s.state === 'closed') && s.updatedAt !== null;
    });

    // Build bucket tallies
    var bucketData = BUCKETS.map(function(b) {
      return { label: b.label, count: 0, totalDays: 0, min: b.min, max: b.max };
    });

    var totalDaysAll = 0;
    var maxDays = 0;
    var minDays = Infinity;

    for (var i = 0; i < resolved.length; i++) {
      var s = resolved[i];
      var days = (s.updatedAt - s.submittedAt) / 86400;
      if (days < 0) days = 0;
      totalDaysAll += days;
      if (days > maxDays) maxDays = days;
      if (days < minDays) minDays = days;

      for (var j = 0; j < bucketData.length; j++) {
        if (days >= bucketData[j].min && days < bucketData[j].max) {
          bucketData[j].count++;
          bucketData[j].totalDays += days;
          break;
        }
      }
    }

    var totalResolved = resolved.length;
    var avgDaysAll = totalResolved > 0 ? Math.round(totalDaysAll / totalResolved) : 0;

    var rows = bucketData.filter(function(b) { return b.count > 0; }).map(function(b) {
      return {
        bucket:  b.label,
        count:   b.count,
        pct:     totalResolved > 0 ? Math.round(b.count / totalResolved * 100) + '%' : '0%',
        avgDays: b.count > 0 ? Math.round(b.totalDays / b.count) : 0,
      };
    });

    var stillOpen = raw.filter(function(s) {
      return s.state === 'triaged' || s.state === 'new';
    }).length;

    return {
      rows: rows,
      chartData: bucketData.filter(function(b) { return b.count > 0; }).map(function(b) {
        return { label: b.label, count: b.count };
      }),
      summaryCards: [
        { label: 'Resolved / Closed', value: totalResolved },
        { label: 'Avg Resolution Time', value: avgDaysAll + ' days' },
        { label: 'Fastest',  value: totalResolved > 0 ? Math.round(minDays) + ' days' : '—' },
        { label: 'Still Open (Triaged)', value: stillOpen },
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
