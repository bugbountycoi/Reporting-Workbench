import type { UserModuleSpec } from '../userModules/types'
import programsSample from '../../fixtures/programs.sample.json'

const KNOWN_ENDPOINTS = [
  { value: '/programs', label: 'GET /v2/programs — List all programs' },
  { value: '/submissions', label: 'GET /v2/submissions — All company submissions' },
  { value: '/payouts', label: 'GET /v2/payouts — All company payouts' },
  { value: '/groups', label: 'GET /v2/groups — All groups' },
  { value: '/company-assets', label: 'GET /v2/company-assets — Company assets' },
  { value: '/submission-possible-types', label: 'GET /v2/submission-possible-types — Submission type enum' },
  { value: '/reward-system/reward-requests', label: 'GET /v2/reward-system/reward-requests — Reward requests' },
  { value: '/reward-system/budget', label: 'GET /v2/reward-system/budget — Reward budget' },
  { value: '/iplookup', label: 'GET /v2/iplookup — IP lookup (your IP)' },
]

export const rawApiExplorerSpec: UserModuleSpec = {
  schemaVersion: 1,
  id: 'rawApiExplorer',
  title: 'Raw API Explorer',
  description:
    'Inspect raw API responses from any read-only endpoint. Useful for understanding available data.',
  category: 'developer',
  author: 'Reporting Workbench',
  version: '1.0.0',

  dataSource: 'programs',
  params: { includePrograms: false, includeDateRange: false, includeInterval: false },

  groupBy: 'status',
  metrics: [],
  sortBy: { key: 'endpoint', dir: 'asc' },
  summaryCards: [],
  chartType: 'none',
  chartXLabel: '',
  chartYLabel: '',
  allowedChartTypes: [],
  series: [],
  tableColumns: [],
  exportFilename: 'raw-api-response',

  customParamFields: [
    {
      key: 'endpoint',
      label: 'Endpoint',
      type: 'select',
      required: true,
      options: KNOWN_ENDPOINTS,
      defaultValue: '/programs',
    },
  ],

  customFetchData: `
    const endpoint = (params.endpoint || '/programs');
    const start = Date.now();
    const data = await ctx.apiGet(endpoint);
    const duration = Date.now() - start;
    return { data: data, status: 200, duration: duration, endpoint: '/v2' + endpoint };
  `,

  customTransform: `
    const result = raw;
    const data = result.data;
    let rows = [];
    if (Array.isArray(data)) {
      rows = data.slice(0, 100);
    } else if (data && typeof data === 'object') {
      rows = [data];
    }
    return {
      rows: rows,
      chartData: [],
      summaryCards: [
        { label: 'Endpoint', value: result.endpoint },
        { label: 'HTTP Status', value: result.status },
        { label: 'Response Time', value: result.duration + 'ms' },
        { label: 'Records', value: Array.isArray(data) ? data.length : 1 },
      ],
      rawData: data,
    };
  `,

  customSummaryFormatter: `
    const [ep, status, duration, records] = data.summaryCards;
    return ep.value + ' → ' + status.value + ' in ' + duration.value + '. ' + records.value + ' record(s) returned.';
  `,

  sampleFixtureData: { data: programsSample, status: 200, duration: 142, endpoint: '/v2/programs' },
  sampleFixtureParams: { endpoint: '/programs' },
}
