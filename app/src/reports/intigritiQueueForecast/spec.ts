import type { UserModuleSpec } from '../userModules/types'
import submissionsSample from '../../fixtures/submissions.sample.json'

const PERIOD_OPTIONS = [
  { value: '3', label: '3 months' },
  { value: '6', label: '6 months' },
  { value: '9', label: '9 months' },
  { value: '12', label: '12 months' },
]

// Realistic sample bounty table used for the preview in mock/fixture mode.
// In live mode this data comes from ctx.getProgramDetail().
const SAMPLE_PROGRAM_DETAILS = [
  {
    id: 'prog-alpha-001',
    bounties: [
      {
        tier: 'In Scope',
        bounty: {
          low:      { value: 150,  currency: 'USD' },
          medium:   { value: 500,  currency: 'USD' },
          high:     { value: 1500, currency: 'USD' },
          critical: { value: 5000, currency: 'USD' },
          exceptional: null,
        },
      },
      {
        tier: 'Out of Scope',
        bounty: { low: null, medium: null, high: null, critical: null, exceptional: null },
      },
    ],
  },
]

export const intigritiQueueForecastSpec: UserModuleSpec = {
  schemaVersion: 1,
  id: 'intigritiQueueForecast',
  title: 'Intigriti Queue Cost Forecast',
  description:
    'Estimates total payout cost for all queued unpaid reports using the program bounty tables configured in the platform (one lookup per program, matched on severity and "In Scope" tier). Formula: X reports × Y avg bounty × Z validity ratio = K estimated spend. Adjust the lookback period to see how recent trends shift Z and the historical fallback averages.',
  category: 'bounty',
  author: 'Reporting Workbench',
  version: '1.2.0',

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
    { key: 'severity',      label: 'Severity' },
    { key: 'queueCount',   label: 'In Queue' },
    { key: 'avgEstimate',  label: 'Est. Bounty (avg)' },
    { key: 'totalEstimate', label: 'Estimated Total' },
  ],
  exportFilename: 'intigriti-queue-forecast',

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

  // Fetch submissions + program bounty tables.
  // When params.deepScan is set, also fetches individual submission detail for
  // each queued report to get the exact domain tier — one API call per queued report.
  customFetchData: `
    const ids = params.programIds || [];
    if (ids.length === 0) throw new Error('At least one program is required');
    const results = await Promise.all(ids.map(function(id) { return ctx.getProgramSubmissions(id); }));
    const programDetails = await Promise.all(ids.map(function(id) { return ctx.getProgramDetail(id); }));
    const submissions = results.flat();

    if (params.deepScan) {
      // Deep Scan: resolve per-submission domain tier for the queue items only.
      // This is O(N) API calls where N = queue size — potentially expensive.
      const queue = submissions.filter(function(s) {
        const status = s.state.status.value;
        if (status === 'Closed') return false;
        if (status === 'Accepted' && s.totalPayout != null) return false;
        return true;
      });
      const detailResults = await Promise.all(queue.map(function(s) { return ctx.getSubmissionDetail(s.code); }));
      const submissionDetails = {};
      for (var i = 0; i < queue.length; i++) {
        submissionDetails[queue[i].code] = detailResults[i];
      }
      return { submissions: submissions, programDetails: programDetails, submissionDetails: submissionDetails };
    }

    return { submissions: submissions, programDetails: programDetails };
  `,

  customTransform: `
    const rawData = raw;
    const submissions = rawData.submissions || raw;
    const programDetails = rawData.programDetails || [];
    const submissionDetails = rawData.submissionDetails || null;
    const isDeepScan = submissionDetails !== null;
    const programIds = params.programIds || [];
    const period = parseInt(params.period || '12', 10);
    const cutoffTs = (Date.now() / 1000) - (period * 30 * 24 * 3600);

    const filtered = programIds.length > 0
      ? submissions.filter(function(s) { return programIds.includes(s.originators.programId || ''); })
      : submissions;

    // Queue: all unresolved reports (not closed, not accepted-with-payout already paid)
    const queue = filtered.filter(function(s) {
      const status = s.state.status.value;
      if (status === 'Closed') return false;
      if (status === 'Accepted' && s.totalPayout != null) return false;
      return true;
    });

    // ── Bounty table lookup ─────────────────────────────────────────────────
    // Build a per-program map: programId → { Informational, Low, Medium, High, Critical, currency }
    // Source: getProgramDetail().bounties[], preferring the "In Scope" tier.
    // Reports in the queue should all be in-scope (otherwise they would have been closed).
    const programBountyMap = {};
    // Also build a full tier→severity map for deep scan per-submission tier lookup.
    // Structure: programId → { tierName → { Low, Medium, High, Critical, currency } }
    const programFullBountyMap = {};
    for (let i = 0; i < programIds.length; i++) {
      const progId = programIds[i];
      const detail = programDetails[i];
      if (!detail || !detail.bounties || detail.bounties.length === 0) continue;

      // Build the full map (all tiers)
      const fullTiers = {};
      for (const bv of detail.bounties) {
        const br = bv.bounty || {};
        const currSrc = br.critical || br.high || br.medium || br.low;
        fullTiers[bv.tier] = {
          Informational: 0,
          Low:      br.low      ? br.low.value      : null,
          Medium:   br.medium   ? br.medium.value   : null,
          High:     br.high     ? br.high.value      : null,
          Critical: br.critical ? br.critical.value : null,
          currency: currSrc ? currSrc.currency : 'USD',
        };
      }
      programFullBountyMap[progId] = fullTiers;

      // Prefer any tier whose name contains "scope" but not "out".
      // Fall back to the first tier that has at least one non-null bounty value.
      const inScopeTier = detail.bounties.find(function(b) {
        const t = (b.tier || '').toLowerCase();
        return t.includes('scope') && !t.includes('out');
      });
      const fallbackTier = detail.bounties.find(function(b) {
        const br = b.bounty || {};
        return br.low || br.medium || br.high || br.critical;
      });
      const tier = inScopeTier || fallbackTier;
      if (!tier || !tier.bounty) continue;

      const br = tier.bounty;
      const currencySource = br.critical || br.high || br.medium || br.low;
      programBountyMap[progId] = {
        Informational: 0,
        Low:      br.low      ? br.low.value      : null,
        Medium:   br.medium   ? br.medium.value   : null,
        High:     br.high     ? br.high.value      : null,
        Critical: br.critical ? br.critical.value : null,
        currency: currencySource ? currencySource.currency : 'USD',
        tierName: tier.tier,
      };
    }
    const hasBountyTables = Object.keys(programBountyMap).length > 0;

    // ── Historical fallback (when bounty table is unavailable for a program/severity) ──
    // Defaults apply only if there is no historical data either.
    const DEFAULT_AVGS = { Informational: 0, Low: 200, Medium: 800, High: 2500, Critical: 8000 };
    const histStats = {};
    for (const s of filtered) {
      if (s.createdAt >= cutoffTs && s.totalPayout && s.state.status.value === 'Accepted') {
        const sev = s.severity.value;
        if (!histStats[sev]) histStats[sev] = { count: 0, total: 0 };
        histStats[sev].count++;
        histStats[sev].total += s.totalPayout.value;
      }
    }

    // ── Per-submission estimate ─────────────────────────────────────────────
    // Priority: (1) bounty table for that submission's program, (2) historical avg, (3) default
    var overallCurrency = 'USD';
    for (const k of Object.keys(programBountyMap)) {
      if (programBountyMap[k].currency) { overallCurrency = programBountyMap[k].currency; break; }
    }
    if (!hasBountyTables) {
      const firstPaid = filtered.find(function(s) { return s.totalPayout != null; });
      if (firstPaid && firstPaid.totalPayout) overallCurrency = firstPaid.totalPayout.currency;
    }

    const SEVERITY_ORDER = ['Informational', 'Low', 'Medium', 'High', 'Critical'];
    const sevAccum = {};
    for (const sev of SEVERITY_ORDER) {
      sevAccum[sev] = { count: 0, totalEstimate: 0, fromTableCount: 0 };
    }

    var grandTotal = 0;
    for (const s of queue) {
      const sev = s.severity.value;
      if (!sevAccum[sev]) continue;

      const progId = s.originators.programId || '';
      let estimateVal = null;
      let fromTable = false;

      if (isDeepScan) {
        // Deep Scan: look up the exact domain tier for this submission
        const detail = submissionDetails[s.code];
        const domainTier = detail && detail.report && detail.report.domain
          ? detail.report.domain.tier
          : null;
        const progTiers = programFullBountyMap[progId];
        if (domainTier && progTiers && progTiers[domainTier]) {
          const tierEntry = progTiers[domainTier];
          if (tierEntry[sev] != null) {
            estimateVal = tierEntry[sev];
            fromTable = true;
          }
        }
      }

      // Fallback: program-level "In Scope" tier
      if (estimateVal === null) {
        const table = programBountyMap[progId];
        if (table && table[sev] != null) {
          estimateVal = table[sev];
          fromTable = true;
        }
      }

      // Final fallback: historical average or default
      if (estimateVal === null) {
        const hs = histStats[sev];
        estimateVal = hs && hs.count > 0
          ? Math.round(hs.total / hs.count)
          : (DEFAULT_AVGS[sev] || 0);
      }

      sevAccum[sev].count++;
      sevAccum[sev].totalEstimate += estimateVal;
      if (fromTable) sevAccum[sev].fromTableCount++;
      grandTotal += estimateVal;
    }

    // ── Validity ratio over the selected period ─────────────────────────────
    const recent = filtered.filter(function(s) { return s.createdAt >= cutoffTs; });
    const recentPaid = recent.filter(function(s) { return s.totalPayout != null; });
    const validityRatio = recent.length > 0 ? recentPaid.length / recent.length : 0;

    // ── Aggregated output ───────────────────────────────────────────────────
    const totalQueueCount = queue.length;
    const avgCostPerReport = totalQueueCount > 0 ? Math.round(grandTotal / totalQueueCount) : 0;
    const forecastK = Math.round(grandTotal * validityRatio);

    const totalFromTableCount = SEVERITY_ORDER.reduce(function(s, sev) {
      return s + sevAccum[sev].fromTableCount;
    }, 0);
    const sourceNote = isDeepScan
      ? (totalFromTableCount === totalQueueCount
          ? 'Deep Scan: per-submission domain tier'
          : 'Deep Scan: per-submission tier + fallback')
      : (hasBountyTables
          ? (totalFromTableCount === totalQueueCount
              ? 'from program bounty tables'
              : 'mixed: bounty tables + historical fallback')
          : 'from historical payouts (no bounty table data)');

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
        value: overallCurrency + ' ' + avgCostPerReport.toLocaleString(),
        subValue: sourceNote,
      },
      {
        label: 'Estimated Total (K)',
        value: overallCurrency + ' ' + forecastK.toLocaleString(),
        subValue: 'X × Y × Z',
      },
    ];

    const sevRows = SEVERITY_ORDER.map(function(sev) {
      const d = sevAccum[sev];
      const avgEst = d.count > 0 ? Math.round(d.totalEstimate / d.count) : 0;
      const fromTable = d.fromTableCount > 0 && d.fromTableCount === d.count;
      const partial = d.fromTableCount > 0 && d.fromTableCount < d.count;
      const suffix = fromTable ? '' : (partial ? ' ✱' : ' ✱');
      return {
        severity: sev,
        queueCount: d.count,
        avgEstimate: overallCurrency + ' ' + avgEst.toLocaleString() + suffix,
        totalEstimate: overallCurrency + ' ' + Math.round(d.totalEstimate).toLocaleString(),
        estimateNum: Math.round(d.totalEstimate),
        avgEstimateNum: avgEst,
      };
    });

    const chartData = sevRows
      .filter(function(r) { return r.queueCount > 0; })
      .map(function(r) {
        return { severity: r.severity, count: r.queueCount, estimate: r.estimateNum, avgEst: r.avgEstimateNum };
      });

    const dynamicChartConfig = {
      type: 'bar', xKey: 'severity', xLabel: 'Severity', yLabel: overallCurrency + ' Estimated Cost',
      allowedChartTypes: ['bar'],
      series: [{ key: 'estimate', label: 'Estimated Cost', color: 'var(--brand-red)' }],
    };

    const rows = sevRows.map(function(r) {
      return {
        severity: r.severity,
        queueCount: r.queueCount,
        avgEstimate: r.avgEstimate,
        totalEstimate: r.totalEstimate,
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

  customActions: [
    {
      id: 'deepScan',
      label: 'Deep Scan',
      description: 'Fetch the individual submission detail for every queued report to resolve its exact asset tier, then re-run the forecast with those precise bounty values.',
      warningMessage:
        'Deep Scan makes one API call per queued report and can be slow for large queues.\n\nIt resolves the exact domain/asset tier for each submission, giving the most accurate estimate.\n\nContinue?',
    },
  ],

  // sampleFixtureData mirrors the shape that customFetchData returns:
  // { submissions: [...], programDetails: [...] }
  // programDetails includes a realistic bounty table so the sample preview
  // demonstrates the bounty-table lookup path, not just the historical fallback.
  sampleFixtureData: {
    submissions: submissionsSample,
    programDetails: SAMPLE_PROGRAM_DETAILS,
  },
  sampleFixtureParams: { programIds: ['prog-alpha-001'], period: '12' },
}
