import { useState } from 'react'
import type { ReportModule, ReportParams } from '../reports/types'
import type { ProgramOverviewViewModel } from '../api/types'
import { ProgramMultiSelect } from './ProgramMultiSelect'

interface Props {
  report: ReportModule
  programs: ProgramOverviewViewModel[]
  onGenerate: (params: ReportParams) => void
  loading: boolean
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function addDays(n: number) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function addMonths(n: number) {
  const d = new Date()
  d.setMonth(d.getMonth() + n)
  return d.toISOString().slice(0, 10)
}

function firstOfMonth(monthOffset = 0) {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth() + monthOffset, 1).toISOString().slice(0, 10)
}

function lastOfMonth(monthOffset = 0) {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth() + monthOffset + 1, 0).toISOString().slice(0, 10)
}

const DATE_SHORTCUTS: { label: string; start: () => string; end: () => string }[] = [
  { label: 'Month to date', start: () => firstOfMonth(), end: today },
  { label: 'Last month', start: () => firstOfMonth(-1), end: () => lastOfMonth(-1) },
  { label: 'Last 3 months', start: () => addMonths(-3), end: today },
  { label: 'Last 90 days', start: () => addDays(-90), end: today },
  { label: 'Last 180 days', start: () => addDays(-180), end: today },
  { label: 'Year to date', start: () => new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10), end: today },
  { label: 'Last 365 days', start: () => addDays(-365), end: today },
  { label: 'All time', start: () => '2015-01-01', end: today },
]

export function ReportConfigPanel({ report, programs, onGenerate, loading }: Props) {
  const hasProgramSelect = report.paramFields.some((f) => f.type === 'programSelect')

  const [params, setParams] = useState<ReportParams>(() => {
    const defaults: ReportParams = {}
    for (const field of report.paramFields) {
      if (field.defaultValue !== undefined) defaults[field.key] = field.defaultValue
    }
    if (hasProgramSelect) {
      defaults['programIds'] = programs.map((p) => p.id)
    }
    return defaults
  })

  const set = (key: string, value: unknown) => setParams((p) => ({ ...p, [key]: value }))

  const hasDateRange =
    report.paramFields.some((f) => f.key === 'startDate') &&
    report.paramFields.some((f) => f.key === 'endDate')

  const selectedProgramIds = (params['programIds'] as string[] | undefined) ?? []
  const viewMode = (params['viewMode'] as 'compare' | 'combine' | undefined) ?? 'combine'

  const canGenerate = report.paramFields
    .filter((f) => f.required)
    .every((f) => {
      const val = params[f.key]
      if (Array.isArray(val)) return val.length > 0
      return Boolean(val)
    })

  const applyShortcut = (shortcut: (typeof DATE_SHORTCUTS)[number]) => {
    setParams((p) => ({ ...p, startDate: shortcut.start(), endDate: shortcut.end() }))
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 space-y-4">
      {hasDateRange && (
        <div>
          <p className="text-xs font-semibold text-brand-gray-dark mb-2 uppercase tracking-wide">
            Quick date range
          </p>
          <div className="flex flex-wrap gap-1.5">
            {DATE_SHORTCUTS.map((s) => (
              <button
                key={s.label}
                onClick={() => applyShortcut(s)}
                className="px-2.5 py-1 text-xs rounded-md border border-gray-200 bg-brand-near-white text-brand-gray-dark hover:border-brand-blue hover:text-brand-blue hover:bg-blue-50 transition-colors font-medium"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-6 items-start">
        {report.paramFields.map((field) => {
          if (field.type === 'programSelect') {
            return (
              <div key={field.key} className="min-w-[240px]">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  {field.label}
                </label>
                <ProgramMultiSelect
                  programs={programs}
                  selectedIds={selectedProgramIds}
                  onChange={(ids) => set('programIds', ids)}
                />
              </div>
            )
          }

          if (field.type === 'dateRange') {
            return (
              <div key={field.key} className="min-w-[150px]">
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  {field.label}
                </label>
                <input
                  type="date"
                  value={(params[field.key] as string) ?? ''}
                  onChange={(e) => set(field.key, e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-brand-blue"
                />
              </div>
            )
          }

          if (field.type === 'select') {
            return (
              <div key={field.key} className="min-w-[220px]">
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  {field.label}
                </label>
                <select
                  value={(params[field.key] as string) ?? ''}
                  onChange={(e) => set(field.key, e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-brand-blue"
                >
                  {field.options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            )
          }

          return (
            <div key={field.key} className="min-w-[180px]">
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                {field.label}
              </label>
              <input
                type="text"
                value={(params[field.key] as string) ?? ''}
                onChange={(e) => set(field.key, e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-brand-blue"
              />
            </div>
          )
        })}
      </div>

      {hasProgramSelect && selectedProgramIds.length > 1 && (
        <div>
          <p className="text-xs font-semibold text-brand-gray-dark mb-2 uppercase tracking-wide">
            Multi-program view
          </p>
          <div className="flex gap-2">
            {(['combine', 'compare'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => set('viewMode', mode)}
                className={`px-3 py-1.5 text-xs rounded-md border transition-colors font-medium ${
                  viewMode === mode
                    ? 'bg-brand-navy text-white border-brand-navy'
                    : 'border-gray-200 bg-brand-near-white text-brand-gray-dark hover:border-brand-blue hover:text-brand-blue'
                }`}
              >
                {mode === 'combine'
                  ? 'Combine — merge all programs'
                  : 'Compare — one series per program'}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <button
          onClick={() => onGenerate(params)}
          disabled={!canGenerate || loading}
          className="px-5 py-2 bg-brand-navy text-white rounded-lg text-sm font-semibold hover:bg-brand-navy-light disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          {loading ? 'Generating…' : 'Generate Report'}
        </button>
      </div>
    </div>
  )
}
