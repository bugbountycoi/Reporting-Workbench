import type { UserModuleSpec } from '../userModules/types'
import { sampleSubmissions } from '../dailyTriageMovement/fixtures'
import { BC } from '../../themes/brandColors'

export const dailyTriageThroughputSpec: UserModuleSpec = {
  schemaVersion: 1,
  id: 'dailyTriageThroughput',
  title: 'Intigriti Daily Triage Throughput',
  description:
    'Shows the total number of submissions sitting in each queue (Triage, Pending, Accepted) per day — a running inventory view rather than a daily-inflow view.',
  category: 'triage',
  author: 'Reporting Workbench',
  version: '1.0.0',
  platform: 'intigriti',

  dataSource: 'submissions',
  params: { includePrograms: true, includeDateRange: true, includeInterval: true },

  // Declarative fields superseded by customTransform below
  groupBy: 'time.day',
  metrics: [],
  sortBy: { key: 'period', dir: 'asc' },
  summaryCards: [],
  chartType: 'line',
  chartXLabel: 'Period',
  chartYLabel: 'Submissions in Queue',
  allowedChartTypes: ['line', 'stackedBar', 'bar'],
  series: [
    { metricKey: 'triage',   color: BC.blue },
    { metricKey: 'pending',  color: BC.gold },
    { metricKey: 'accepted', color: BC.green },
  ],
  tableColumns: [
    { key: 'period',        label: 'Period' },
    { key: 'triage',        label: 'Triage' },
    { key: 'deltaTriage',   label: 'Δ Triage' },
    { key: 'pending',       label: 'Pending' },
    { key: 'deltaPending',  label: 'Δ Pending' },
    { key: 'accepted',      label: 'Accepted' },
    { key: 'deltaAccepted', label: 'Δ Accepted' },
    { key: 'totalOpen',     label: 'Total Open' },
  ],
  exportFilename: 'daily-triage-throughput',

  customFetchData: `
    var ids = params.programIds || [];
    if (ids.length === 0) throw new Error('At least one program is required');
    var results = await Promise.all(ids.map(function(id) { return ctx.getProgramSubmissions(id); }));
    return results.flat();
  `,

  customTransform: `
    var submissions = raw;
    var startDate = params.startDate || '2024-01-01';
    var endDate   = params.endDate   || '2026-09-01';
    var interval  = params.interval  || 'month';
    var programIds = params.programIds || [];
    var bucketKey  = ctx.bucketKey;
    var allBuckets = ctx.allBuckets;

    // Filter to selected programs
    var filtered = programIds.length > 0
      ? submissions.filter(function(s) { return programIds.indexOf(s.originators.programId || '') !== -1; })
      : submissions;

    // Normalise status string into one of our three queue buckets.
    // Intigriti status values: 'Triage', 'Accepted', 'Forwarded to customer', 'Closed', etc.
    function queueOf(status) {
      var v = (status || '').toLowerCase();
      if (v === 'triage')                      return 'triage';
      if (v === 'accepted')                    return 'accepted';
      if (v.indexOf('forwarded') !== -1)       return 'pending';
      return null; // closed / resolved / not-applicable — leaves all queues
    }

    // For each submission we approximate which queue it occupied on a given day
    // using the only two timestamps available (createdAt and lastUpdatedAt).
    //
    // Model:
    //   - A submission enters the triage queue at createdAt.
    //   - If it is still "Triage" today, it has been in triage from createdAt → ∞.
    //   - If it moved to Accepted/Pending, lastUpdatedAt approximates the transition date.
    //     Before that date it was in triage; from that date on it is in the new queue.
    //   - If it is Closed, lastUpdatedAt is when it left all queues.
    //     Before that date it was in triage (best approximation without full history).
    //
    // Limitation: multi-hop transitions (Triage → Accepted → Closed) cannot be
    // reconstructed from two timestamps alone. The model treats every submission as
    // having at most one intermediate state change.

    var MS_PER_DAY = 86400000;

    function endOfDay(dateStr) {
      return new Date(dateStr).getTime() + MS_PER_DAY - 1;
    }

    function bucketEndOfDay(bucketLabel, ivl) {
      // bucketKey labels are ISO date strings (day/week/month start); add one period.
      var d = new Date(bucketLabel);
      if (ivl === 'week') d.setDate(d.getDate() + 6);
      else if (ivl === 'month') d.setMonth(d.getMonth() + 1, 0); // last day of month
      return d.getTime() + MS_PER_DAY - 1;
    }

    var buckets = allBuckets(startDate, endDate, interval);

    var rows = buckets.map(function(bucket) {
      var eod = bucketEndOfDay(bucket, interval);

      var triageCount   = 0;
      var pendingCount  = 0;
      var acceptedCount = 0;

      for (var i = 0; i < filtered.length; i++) {
        var s = filtered[i];
        var created = s.createdAt * (s.createdAt < 1e12 ? 1000 : 1); // handle s vs ms
        if (created > eod) continue; // not yet submitted on this day

        var updated = s.lastUpdatedAt
          ? (s.lastUpdatedAt * (s.lastUpdatedAt < 1e12 ? 1000 : 1))
          : Infinity;

        var currentQueue = queueOf(s.state.status.value);

        if (currentQueue === 'triage') {
          // Still in triage today — has been here since creation
          triageCount++;
        } else if (currentQueue === 'accepted' || currentQueue === 'pending') {
          // Transitioned at approx. lastUpdatedAt
          if (updated <= eod) {
            if (currentQueue === 'accepted') acceptedCount++;
            else                             pendingCount++;
          } else {
            // Not yet transitioned as of this day — still in triage
            triageCount++;
          }
        } else {
          // Closed / resolved — left all queues at lastUpdatedAt
          if (updated > eod) {
            // Was still in triage on this day (not yet closed)
            triageCount++;
          }
          // After closing, the submission no longer occupies any queue
        }
      }

      return {
        period:        bucket,
        triage:        triageCount,
        deltaTriage:   0,
        pending:       pendingCount,
        deltaPending:  0,
        accepted:      acceptedCount,
        deltaAccepted: 0,
        totalOpen:     triageCount + pendingCount + acceptedCount,
      };
    });

    // Compute deltas (change vs. previous day)
    for (var j = 1; j < rows.length; j++) {
      rows[j].deltaTriage   = rows[j].triage   - rows[j - 1].triage;
      rows[j].deltaPending  = rows[j].pending  - rows[j - 1].pending;
      rows[j].deltaAccepted = rows[j].accepted - rows[j - 1].accepted;
    }

    // Format delta values with leading + for positive numbers
    var tableRows = rows.map(function(r) {
      return Object.assign({}, r, {
        deltaTriage:   r.deltaTriage   > 0 ? '+' + r.deltaTriage   : r.deltaTriage,
        deltaPending:  r.deltaPending  > 0 ? '+' + r.deltaPending  : r.deltaPending,
        deltaAccepted: r.deltaAccepted > 0 ? '+' + r.deltaAccepted : r.deltaAccepted,
      });
    });

    // Summary: snapshot of latest bucket (most recent day in range)
    var last = rows[rows.length - 1] || { triage: 0, pending: 0, accepted: 0, totalOpen: 0 };
    var prev = rows.length > 1 ? rows[rows.length - 2] : null;

    var triageTrend   = prev ? (last.triage   > prev.triage   ? 'up' : last.triage   < prev.triage   ? 'down' : 'neutral') : 'neutral';
    var pendingTrend  = prev ? (last.pending  > prev.pending  ? 'up' : last.pending  < prev.pending  ? 'down' : 'neutral') : 'neutral';
    var acceptedTrend = prev ? (last.accepted > prev.accepted ? 'up' : last.accepted < prev.accepted ? 'down' : 'neutral') : 'neutral';

    var summaryCards = [
      { label: 'In Triage Queue',   value: last.triage,   trend: triageTrend },
      { label: 'In Pending Queue',  value: last.pending,  trend: pendingTrend },
      { label: 'In Accepted Queue', value: last.accepted, trend: acceptedTrend },
      { label: 'Total Open',        value: last.totalOpen, trend: 'neutral' },
    ];

    return {
      rows:         tableRows,
      chartData:    rows.map(function(r) { return { label: r.period, triage: r.triage, pending: r.pending, accepted: r.accepted }; }),
      summaryCards: summaryCards,
      rawData:      raw,
    };
  `,

  customSummaryFormatter: `
    var cards = data.summaryCards;
    return 'Triage: ' + cards[0].value + '  |  Pending: ' + cards[1].value + '  |  Accepted: ' + cards[2].value + '  |  Total open: ' + cards[3].value + '.';
  `,

  sampleFixtureData: sampleSubmissions,
  sampleFixtureParams: {
    programIds: ['prog-alpha-001'],
    startDate: '2024-01-01',
    endDate: '2026-09-01',
    interval: 'month',
  },
}
