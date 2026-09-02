/**
 * Converts a UserModuleSpec into a live ReportModule.
 * All user-created AND bundled modules run through this interpreter.
 */
import type { ReportModule, ReportData, ReportParams, ParamField } from '../types'
import type { UserModuleSpec, FetchCtx } from './types'
import { specChartConfig } from './types'
import { declarativeTransform } from './transform'
import { getProgramSubmissions } from '../../api/endpoints/programs'
import { getAllPayouts } from '../../api/endpoints/payouts'
import { getProgramDetail } from '../../api/endpoints/programs'
import { apiGet } from '../../api/client'
import { INTERVAL_OPTIONS } from '../../utils/intervals'
import type { ProgramOverviewViewModel } from '../../api/types'

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

// Spawns a short-lived Worker to run custom transform or summaryFormatter code.
// Workers have no access to the parent page's localStorage, sessionStorage, or DOM.
function runInWorker<T>(
  type: 'transform' | 'summaryFormatter',
  body: string,
  args: unknown[],
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const worker = new Worker(new URL('./moduleWorker.ts', import.meta.url), { type: 'module' })
    const idBytes = new Uint8Array(8)
    crypto.getRandomValues(idBytes)
    const id = Array.from(idBytes, (b) => b.toString(16).padStart(2, '0')).join('')
    const timer = setTimeout(() => {
      worker.terminate()
      reject(new Error('Custom module timed out after 10 s'))
    }, 10_000)
    worker.onmessage = (e: MessageEvent) => {
      if (e.data.id !== id) return
      clearTimeout(timer)
      worker.terminate()
      if (e.data.ok) resolve(e.data.result as T)
      else reject(new Error(e.data.error as string))
    }
    worker.onerror = (e) => {
      clearTimeout(timer)
      worker.terminate()
      reject(new Error(e.message))
    }
    worker.postMessage({ id, type, body, args })
  })
}

// Global names shadowed before executing customFetchData in the main thread.
// customFetchData must stay in the main thread so it can use the API ctx functions,
// but we prevent it from reading locally-stored credentials.
const FETCH_GLOBALS_SHADOW = [
  'const localStorage = undefined, sessionStorage = undefined,',
  '      indexedDB = undefined, caches = undefined,',
  '      window = undefined, document = undefined,',
  '      navigator = undefined, location = undefined;',
].join('\n')

// Runs a custom fetch body: async (params, ctx) => unknown
async function runCustomFetch(body: string, params: ReportParams): Promise<unknown> {
  const fetchCtx = buildFetchCtx()
  const fn = new Function('params', 'ctx', `return (async function() {\n${FETCH_GLOBALS_SHADOW}\n${body}\n})()`)
  return fn(params, fetchCtx) as Promise<unknown>
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

  // customTransform runs in a Worker (async) — return empty for the card preview.
  // The full result is computed when the user clicks Preview.
  if (spec.customTransform) return EMPTY_REPORT_DATA
  try {
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

    async summaryFormatter(data: ReportData): Promise<string> {
      if (spec.customSummaryFormatter) {
        return runInWorker<string>('summaryFormatter', spec.customSummaryFormatter, [data])
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

    async transform(raw: unknown, params: ReportParams): Promise<ReportData> {
      if (spec.customTransform) {
        return runInWorker<ReportData>('transform', spec.customTransform, [raw, params, programs])
      }
      return declarativeTransform(raw, params as Record<string, unknown>, programs, spec)
    },
  }

  return mod
}
