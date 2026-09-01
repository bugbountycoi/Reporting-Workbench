import type { ColumnDef } from '@tanstack/react-table'
import type { ProgramOverviewViewModel } from '../api/types'

export interface SummaryCard {
  label: string
  value: string | number
  subValue?: string
  trend?: 'up' | 'down' | 'neutral'
}

export interface ChartSeries {
  key: string
  label: string
  color: string
}

export interface ChartConfig {
  type: 'bar' | 'stackedBar' | 'line' | 'composed' | 'donut'
  xKey: string
  xLabel?: string
  yLabel?: string
  series: ChartSeries[]
  /** Subset of chart types the user may switch to. Pie/circle/donut are never allowed. Defaults to ['bar','stackedBar','line']. */
  allowedChartTypes?: Array<'bar' | 'stackedBar' | 'line'>
}

export interface ExportConfig {
  csvFilename: string
  jsonFilename: string
  imageFilename: string
  getCsvRows: (data: ReportData) => Record<string, unknown>[]
}

export interface ReportParams {
  programId?: string
  programIds?: string[]
  viewMode?: 'compare' | 'combine'
  programs?: ProgramOverviewViewModel[]
  startDate?: string
  endDate?: string
  [key: string]: unknown
}

export interface ReportData {
  rows: Record<string, unknown>[]
  summaryCards: SummaryCard[]
  chartData: Record<string, unknown>[]
  rawData?: unknown
  chartConfig?: ChartConfig
}

export interface AppContext {
  programs: ProgramOverviewViewModel[]
  hasToken: boolean
}

export interface ReportModule {
  id: string
  title: string
  description: string
  category: 'triage' | 'bounty' | 'snapshot' | 'developer'
  requiredScopes: string[]
  isAvailable: (ctx: AppContext) => boolean
  paramFields: ParamField[]
  fetchData: (params: ReportParams) => Promise<unknown>
  transform: (raw: unknown, params: ReportParams) => ReportData
  tableColumns: ColumnDef<Record<string, unknown>>[]
  chartConfig: ChartConfig | null
  summaryFormatter: (data: ReportData) => string
  exportConfig: ExportConfig
  sampleData: unknown
  samplePreview: ReportData
}

export type ParamFieldType = 'programSelect' | 'dateRange' | 'select' | 'text'

export interface ParamField {
  key: string
  label: string
  type: ParamFieldType
  required?: boolean
  options?: Array<{ value: string; label: string }>
  defaultValue?: unknown
}
