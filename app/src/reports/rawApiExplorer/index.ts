import type { ReportModule, ReportData, ReportParams } from '../types'
import { apiGet } from '../../api/client'
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

function transformData(raw: unknown, _params: ReportParams): ReportData {
  const result = raw as { data: unknown; status: number; duration: number; endpoint: string }
  const data = result.data

  let rows: Record<string, unknown>[] = []
  if (Array.isArray(data)) {
    rows = data.slice(0, 100) as Record<string, unknown>[]
  } else if (data && typeof data === 'object') {
    rows = [data as Record<string, unknown>]
  }

  return {
    rows,
    chartData: [],
    summaryCards: [
      { label: 'Endpoint', value: result.endpoint },
      { label: 'HTTP Status', value: result.status },
      { label: 'Response Time', value: `${result.duration}ms` },
      { label: 'Records', value: Array.isArray(data) ? data.length : 1 },
    ],
    rawData: data,
  }
}

const samplePreview = transformData(
  { data: programsSample, status: 200, duration: 142, endpoint: '/v2/programs' },
  {},
)

export const rawApiExplorer: ReportModule = {
  id: 'rawApiExplorer',
  title: 'Raw API Explorer',
  description: 'Inspect raw API responses from any read-only endpoint. Useful for understanding available data.',
  category: 'developer',
  requiredScopes: ['core_platform:read'],
  isAvailable: () => true,

  paramFields: [
    {
      key: 'endpoint',
      label: 'Endpoint',
      type: 'select',
      required: true,
      options: KNOWN_ENDPOINTS,
      defaultValue: '/programs',
    },
  ],

  async fetchData(params) {
    const endpoint = (params.endpoint as string) ?? '/programs'
    const start = Date.now()
    const data = await apiGet<unknown>(endpoint)
    const duration = Date.now() - start
    return { data, status: 200, duration, endpoint: `/v2${endpoint}` }
  },

  transform: transformData,

  tableColumns: [],

  chartConfig: null,

  summaryFormatter(data) {
    const [ep, status, duration, records] = data.summaryCards
    return `${ep.value} → ${status.value} in ${duration.value}. ${records.value} record(s) returned.`
  },

  exportConfig: {
    csvFilename: 'raw-api-response',
    jsonFilename: 'raw-api-response',
    imageFilename: 'raw-api-response',
    getCsvRows: (data) => data.rows,
  },

  sampleData: { data: programsSample, status: 200, duration: 142, endpoint: '/v2/programs' },
  samplePreview,
}
