/**
 * Converts a UserModuleSpec into a live ReportModule.
 * All user-created AND bundled modules run through this interpreter.
 */
import type { ReportModule, ReportData, ReportParams, ParamField } from '../types'
import type { UserModuleSpec } from './types'
import { specChartConfig } from './types'
import { declarativeTransform } from './transform'
import { getProgramSubmissions } from '../../api/endpoints/programs'
import { getAllPayouts } from '../../api/endpoints/payouts'
import { getProgramDetail } from '../../api/endpoints/programs'
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

// ---------------------------------------------------------------------------
// Custom function execution helpers
// ---------------------------------------------------------------------------

function makeWorkerId(): string {
  const b = new Uint8Array(8)
  crypto.getRandomValues(b)
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
}

// Spawns a short-lived Worker to run custom code in isolation.
// For 'fetchData' jobs the Worker proxies API calls back here via postMessage
// so user code can still call ctx.getProgramSubmissions / getAllPayouts /
// getProgramDetail — but only those three, and through this controlled bridge.
function runInWorker<T>(
  type: 'transform' | 'summaryFormatter' | 'fetchData',
  body: string,
  args: unknown[],
  timeoutMs = 10_000,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const worker = new Worker(new URL('./moduleWorker.ts', import.meta.url), { type: 'module' })
    const id = makeWorkerId()
    const timer = setTimeout(() => {
      worker.terminate()
      reject(new Error(`Custom module timed out after ${timeoutMs / 1000} s`))
    }, timeoutMs)

    worker.onmessage = async (e: MessageEvent) => {
      const msg = e.data as Record<string, unknown>

      // API proxy request from Worker — execute on main thread and return result
      if (msg.type === 'apiRequest') {
        try {
          const result = await handleApiProxy(
            msg.method as string,
            msg.args as unknown[],
          )
          worker.postMessage({ type: 'apiResponse', requestId: msg.requestId, ok: true, result })
        } catch (err) {
          worker.postMessage({ type: 'apiResponse', requestId: msg.requestId, ok: false, error: String(err) })
        }
        return
      }

      // Final job result
      if (msg.id !== id) return
      clearTimeout(timer)
      worker.terminate()
      if (msg.ok) resolve(msg.result as T)
      else reject(new Error(msg.error as string))
    }

    worker.onerror = (e) => {
      clearTimeout(timer)
      worker.terminate()
      reject(new Error(e.message))
    }

    worker.postMessage({ id, type, body, args })
  })
}

// Main-thread allow-list for Worker API proxy requests (N-1, N-3).
// Only these three named endpoints are permitted — no raw path access.
async function handleApiProxy(method: string, args: unknown[]): Promise<unknown> {
  switch (method) {
    case 'getProgramSubmissions':
      return getProgramSubmissions(args[0] as string)
    case 'getAllPayouts':
      return getAllPayouts()
    case 'getProgramDetail':
      return getProgramDetail(args[0] as string)
    default:
      throw new Error(`Custom module called disallowed API method: ${method}`)
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
        return runInWorker('fetchData', spec.customFetchData, [params])
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
