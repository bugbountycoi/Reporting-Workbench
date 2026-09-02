import type { ParamField, ReportData, ChartConfig } from '../types'

export type ModuleCategory = 'triage' | 'bounty' | 'snapshot' | 'developer'
export type DataSource = 'submissions' | 'payouts' | 'programs'
export type ChartType = 'bar' | 'stackedBar' | 'line' | 'none'

// GroupBy options — filtered by dataSource in the builder UI
export type GroupByKey =
  | 'time.day'
  | 'time.week'
  | 'time.month'
  | 'severity'
  | 'status'
  | 'closeReason'
  | 'program'
  | 'researcher'
  | 'tag'
  | 'payout.type'
  | 'payout.status'

export type AggregationKey =
  | 'count'
  | 'sum.bounty'
  | 'sum.payoutAmount'
  | 'avg.severityScore'
  | 'countDistinct.researcher'

export type SummaryCardValue =
  | 'total.count'
  | 'total.bounty'
  | 'avg.severityScore'
  | 'pct.accepted'
  | 'countDistinct.researcher'

export interface MetricDef {
  key: string
  label: string
  aggregation: AggregationKey
}

export interface SeriesDef {
  metricKey: string
  color: string
}

export interface SummaryCardDef {
  label: string
  value: SummaryCardValue
  trend?: 'up' | 'down' | 'neutral' | null
}

export interface UserModuleSpec {
  schemaVersion: 1
  id: string
  title: string
  description: string
  category: ModuleCategory
  author: string
  version: string

  dataSource: DataSource
  params: {
    includePrograms: boolean
    includeDateRange: boolean
    includeInterval: boolean
  }

  // --- Declarative transform config ---
  // Ignored when customTransform is set
  groupBy: GroupByKey
  metrics: MetricDef[]
  sortBy: { key: string; dir: 'asc' | 'desc' }
  summaryCards: SummaryCardDef[]

  // --- Chart and table ---
  chartType: ChartType
  chartXLabel: string
  chartYLabel: string
  allowedChartTypes: Array<'bar' | 'stackedBar' | 'line'>
  series: SeriesDef[]
  tableColumns: { key: string; label: string }[]
  exportFilename: string

  // --- Optional extra param fields (beyond the auto-generated ones) ---
  // Use for special selects like rawApiExplorer's endpoint dropdown
  customParamFields?: ParamField[]

  // --- Custom JS escape hatch ---
  // Function body strings — receive (params, ctx) for fetch; (raw, params, programs, ctx) for transform.
  // ctx is a helpers object provided by the interpreter (see interpreter.ts).
  // When set, these override the declarative transform/fetch entirely.
  customFetchData?: string
  customTransform?: string
  customSummaryFormatter?: string

  // --- Sample preview ---
  // Raw fixture data fed to the transform to produce the sample preview.
  // For user-created modules this is set automatically by the builder.
  // For bundled modules it is set in the spec definition file.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sampleFixtureData?: any
  sampleFixtureParams?: Record<string, unknown>

  // Stored computed preview — set after builder preview step or after first compute.
  // If absent, interpreter recomputes from sampleFixtureData + sampleFixtureParams.
  storedSamplePreview?: ReportData
}

// Context object passed to customFetchData(params, ctx).
// Only these three named helpers are available — no raw apiGet.
export interface FetchCtx {
  getProgramSubmissions: (id: string, startDate?: string, endDate?: string) => Promise<unknown[]>
  getAllPayouts: () => Promise<unknown[]>
  getProgramDetail: (id: string) => Promise<unknown>
}

// Context object passed to customTransform(raw, params, programs, ctx)
export interface TransformCtx {
  // date bucketing
  bucketKey: (ts: number, interval: string) => string
  allBuckets: (startDate: string, endDate: string, interval: string) => string[]
  // day diff
  daysBetween: (ts: number) => number
  // constants
  COMPARE_COLORS: string[]
  INTERVAL_OPTIONS: Array<{ value: string; label: string }>
}

// Conflict resolution when importing a spec whose id already exists
export type ImportConflict = 'overwrite' | 'keep-both' | 'cancel'

// Schema version guard
export function isUserModuleSpec(obj: unknown): obj is UserModuleSpec {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    (obj as UserModuleSpec).schemaVersion === 1 &&
    typeof (obj as UserModuleSpec).id === 'string' &&
    typeof (obj as UserModuleSpec).title === 'string' &&
    typeof (obj as UserModuleSpec).description === 'string' &&
    typeof (obj as UserModuleSpec).category === 'string' &&
    typeof (obj as UserModuleSpec).dataSource === 'string'
  )
}

// Chart config builder helper
export function specChartConfig(spec: UserModuleSpec): import('../types').ChartConfig | null {
  if (spec.chartType === 'none') return null
  return {
    type: spec.chartType as ChartConfig['type'],
    xKey: spec.groupBy.replace('time.', '').replace('payout.', ''),
    xLabel: spec.chartXLabel,
    yLabel: spec.chartYLabel,
    allowedChartTypes: spec.allowedChartTypes,
    series: spec.series.map((s) => ({
      key: s.metricKey,
      label: spec.metrics.find((m) => m.key === s.metricKey)?.label ?? s.metricKey,
      color: s.color,
    })),
  } satisfies ChartConfig
}
