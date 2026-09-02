/**
 * Converts a UserModuleSpec into a live ReportModule.
 * All user-created AND bundled modules run through this interpreter.
 */
import type { ReportModule, ReportData, ReportParams, ParamField } from '../types'
import type { UserModuleSpec, FetchCtx, TransformCtx } from './types'
import { specChartConfig } from './types'
import { declarativeTransform } from './transform'
import { getProgramSubmissions } from '../../api/endpoints/programs'
import { getAllPayouts } from '../../api/endpoints/payouts'
import { getProgramDetail } from '../../api/endpoints/programs'
import { apiGet } from '../../api/client'
import { bucketKey, allBuckets, INTERVAL_OPTIONS } from '../../utils/intervals'
import { daysBetween } from '../../utils/dates'
import type { ProgramOverviewViewModel } from '../../api/types'
import { BRAND_COMPARE_COLORS } from '../../themes/brandColors'

const EMPTY_REPORT_DATA: ReportData = {
  rows: [],
  chartData: [],
  summaryCards: [
    { label: 'Total', value: 0 },
    { label: 'Accepted', value: 0 },
    { label: 'Closed', value: 0 },
    { label: 'Open', value: 0 },
  ],
}

// ---------------------------------------------------------------------------
// Context objects passed to custom JS functions
// ---------------------------------------------------------------------------

const TRANSFORM_CTX: TransformCtx = {
  bucketKey: (ts, interval) => bucketKey(ts, interval as import('../../utils/intervals').Interval),
  allBuckets: (start, end, interval) => allBuckets(start, end, interval as import('../../utils/intervals').Interval),
  daysBetween,
  COMPARE_COLORS: BRAND_COMPARE_COLORS,
  INTERVAL_OPTIONS,
}

function buildFetchCtx(): FetchCtx {
  return {
    getProgramSubmissions: (id, _startDate, _endDate) =>
      getProgramSubmissions(id) as Promise<unknown[]>,
    getAllPayouts: () => getAllPayouts() as Promise<unknown[]>,
    getProgramDetail: (id) => getProgramDetail(id) as Promise<unknown>,
    apiGet,
  }
}

// ---------------------------------------------------------------------------
// Custom function execution helpers
// ---------------------------------------------------------------------------

// Runs a custom fetch body: async (params, ctx) => unknown
async function runCustomFetch(body: string, params: ReportParams): Promise<unknown> {
  const fetchCtx = buildFetchCtx()
  // Wrap in async IIFE so `await` works inside the function body string
  const fn = new Function('params', 'ctx', `return (async function() { ${body} })()`)
  return fn(params, fetchCtx) as Promise<unknown>
}

// Runs a custom transform body: (raw, params, programs, ctx) => ReportData
function runCustomTransform(
  body: string,
  raw: unknown,
  params: ReportParams,
  programs: ProgramOverviewViewModel[],
): ReportData {
  const fn = new Function('raw', 'params', 'programs', 'ctx', body)
  return fn(raw, params, programs, TRANSFORM_CTX) as ReportData
}

// Runs a custom summary formatter body: (data) => string
function runCustomSummaryFormatter(body: string, data: ReportData): string {
  try {
    const fn = new Function('data', body)
    return String(fn(data))
  } catch {
    return ''
  }
}

// ---------------------------------------------------------------------------
// Param field derivation from spec.params
// ---------------------------------------------------------------------------

function buildParamFields(spec: UserModuleSpec): ParamField[] {
  const fields: ParamField[] = []

  if (spec.params.includePrograms) {
    fields.push({ key: 'programIds', label: 'Programs', type: 'programSelect', required: true })
  }
  if (spec.params.includeDateRange) {
    fields.push({ key: 'startDate', label: 'Start Date', type: 'dateRange', required: true, defaultValue: '' })
    fields.push({ key: 'endDate', label: 'End Date', type: 'dateRange', required: true, defaultValue: '' })
  }
  if (spec.params.includeInterval) {
    fields.push({
      key: 'interval',
      label: 'Interval',
      type: 'select',
      required: false,
      defaultValue: 'week',
      options: INTERVAL_OPTIONS,
    })
  }

  // Custom extra fields (e.g. rawApiExplorer's endpoint select)
  if (spec.customParamFields) {
    fields.push(...spec.customParamFields)
  }

  return fields
}

// ---------------------------------------------------------------------------
// Sample preview computation
// ---------------------------------------------------------------------------

function computeSamplePreview(spec: UserModuleSpec, programs: ProgramOverviewViewModel[]): ReportData {
  if (spec.storedSamplePreview) return spec.storedSamplePreview

  const raw = spec.sampleFixtureData
  if (!raw) return EMPTY_REPORT_DATA

  const params: ReportParams = {
    ...(spec.sampleFixtureParams as ReportParams | undefined),
    programs,
  }

  try {
    if (spec.customTransform) {
      return runCustomTransform(spec.customTransform, raw, params, programs)
    }
    return declarativeTransform(raw, params as Record<string, unknown>, programs, spec)
  } catch {
    return EMPTY_REPORT_DATA
  }
}

// ---------------------------------------------------------------------------
// Required scopes by data source
// ---------------------------------------------------------------------------

function requiredScopes(spec: UserModuleSpec): string[] {
  switch (spec.dataSource) {
    case 'submissions':
      return ['core_platform:read']
    case 'payouts':
      return ['core_platform:read', 'reward_system:read']
    case 'programs':
      return ['core_platform:read']
  }
}

// ---------------------------------------------------------------------------
// Main converter
// ---------------------------------------------------------------------------

export function specToModule(spec: UserModuleSpec, programs: ProgramOverviewViewModel[]): ReportModule {
  const paramFields = buildParamFields(spec)
  const chartConfig = specChartConfig(spec)
  const samplePreview = computeSamplePreview(spec, programs)

  const mod: ReportModule = {
    id: spec.id,
    title: spec.title,
    description: spec.description,
    category: spec.category,
    author: spec.author,
    version: spec.version,
    isBuiltIn: false,
    requiredScopes: requiredScopes(spec),
    isAvailable: () => true,
    paramFields,
    chartConfig,
    sampleData: spec.sampleFixtureData ?? null,
    samplePreview,

    tableColumns: spec.tableColumns.map((col) => ({
      accessorKey: col.key,
      header: col.label,
    })),

    exportConfig: {
      csvFilename: spec.exportFilename,
      jsonFilename: spec.exportFilename,
      imageFilename: `${spec.exportFilename}-chart`,
      getCsvRows: (data) => data.rows,
    },

    summaryFormatter(data: ReportData): string {
      if (spec.customSummaryFormatter) {
        return runCustomSummaryFormatter(spec.customSummaryFormatter, data)
      }
      const first = data.summaryCards[0]
      return first ? `${first.label}: ${first.value}` : ''
    },

    async fetchData(params: ReportParams): Promise<unknown> {
      if (spec.customFetchData) {
        return runCustomFetch(spec.customFetchData, params)
      }

      // Declarative fetch
      const ids = (params.programIds as string[] | undefined) ?? []

      switch (spec.dataSource) {
        case 'submissions': {
          if (ids.length === 0) throw new Error('At least one program is required')
          const results = await Promise.all(ids.map((id) => getProgramSubmissions(id)))
          return results.flat()
        }
        case 'payouts':
          return getAllPayouts()
        case 'programs':
          return [] // programs already available via params.programs
      }
    },

    transform(raw: unknown, params: ReportParams): ReportData {
      if (spec.customTransform) {
        return runCustomTransform(spec.customTransform, raw, params, programs)
      }
      return declarativeTransform(raw, params as Record<string, unknown>, programs, spec)
    },
  }

  return mod
}
