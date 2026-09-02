import { useState } from 'react'
import type { UserModuleSpec, MetricDef, AggregationKey } from '../../reports/userModules/types'
import { GROUP_BY_OPTIONS, AGGREGATION_OPTIONS, DEFAULT_COLORS } from './constants'

interface Props {
  spec: Partial<UserModuleSpec>
  onChange: (patch: Partial<UserModuleSpec>) => void
}

export function StepGroupMetrics({ spec, onChange }: Props) {
  const [mode, setMode] = useState<'declarative' | 'custom'>(() =>
    spec.customTransform ? 'custom' : 'declarative'
  )

  const dataSource = spec.dataSource ?? 'submissions'
  const filteredGroups = GROUP_BY_OPTIONS.filter((o) => o.dataSources.includes(dataSource))
  const filteredAggs = AGGREGATION_OPTIONS.filter((o) => o.dataSources.includes(dataSource))

  const metrics: MetricDef[] = spec.metrics ?? []

  function addMetric() {
    const agg: AggregationKey = 'count'
    const key = `metric_${Date.now()}`
    const newMetric: MetricDef = { key, label: 'Count', aggregation: agg }
    const newMetrics = [...metrics, newMetric]
    onChange({
      metrics: newMetrics,
      series: [
        ...(spec.series ?? []),
        { metricKey: key, color: DEFAULT_COLORS[(newMetrics.length - 1) % DEFAULT_COLORS.length] },
      ],
    })
  }

  function updateMetric(idx: number, patch: Partial<MetricDef>) {
    const updated = metrics.map((m, i) => i === idx ? { ...m, ...patch } : m)
    onChange({ metrics: updated })
  }

  function removeMetric(idx: number) {
    const removed = metrics[idx]
    const updated = metrics.filter((_, i) => i !== idx)
    onChange({
      metrics: updated,
      series: (spec.series ?? []).filter((s) => s.metricKey !== removed?.key),
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
        <button
          onClick={() => setMode('declarative')}
          className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors ${mode === 'declarative' ? 'bg-white shadow text-brand-blue' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Declarative
        </button>
        <button
          onClick={() => setMode('custom')}
          className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors ${mode === 'custom' ? 'bg-white shadow text-brand-blue' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Custom JavaScript
        </button>
      </div>

      {mode === 'declarative' ? (
        <>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Group by</label>
            <select
              value={spec.groupBy ?? 'status'}
              onChange={(e) => onChange({ groupBy: e.target.value as UserModuleSpec['groupBy'] })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
            >
              {filteredGroups.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-700">Metrics</label>
              <button onClick={addMetric} className="text-xs text-brand-blue hover:underline font-semibold">+ Add metric</button>
            </div>
            {metrics.length === 0 && (
              <p className="text-xs text-gray-400 italic">No metrics yet — add at least one.</p>
            )}
            {metrics.map((m, idx) => (
              <div key={m.key} className="flex gap-2 mb-2 items-center">
                <input
                  type="text"
                  value={m.label}
                  onChange={(e) => updateMetric(idx, { label: e.target.value })}
                  placeholder="Label"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue"
                />
                <select
                  value={m.aggregation}
                  onChange={(e) => updateMetric(idx, { aggregation: e.target.value as AggregationKey })}
                  className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue"
                >
                  {filteredAggs.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <button onClick={() => removeMetric(idx)} className="text-red-400 hover:text-red-600 text-sm px-1">✕</button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Sort by key</label>
              <input
                type="text"
                value={spec.sortBy?.key ?? ''}
                onChange={(e) => onChange({ sortBy: { key: e.target.value, dir: spec.sortBy?.dir ?? 'asc' } })}
                placeholder="e.g. count"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Sort direction</label>
              <select
                value={spec.sortBy?.dir ?? 'asc'}
                onChange={(e) => onChange({ sortBy: { key: spec.sortBy?.key ?? '', dir: e.target.value as 'asc' | 'desc' } })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            <strong>Security note:</strong> Custom JavaScript runs in the browser as-is. Only use this for trusted, internal modules. Anyone importing your module will see a warning before executing it.
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Custom fetch function body
              <span className="ml-1 font-normal text-gray-400">(params, ctx) → Promise&lt;unknown&gt;</span>
            </label>
            <textarea
              value={spec.customFetchData ?? ''}
              onChange={(e) => onChange({ customFetchData: e.target.value })}
              rows={5}
              spellCheck={false}
              placeholder={`const ids = params.programIds || [];\nconst results = await Promise.all(ids.map(id => ctx.getProgramSubmissions(id)));\nreturn results.flat();`}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-blue resize-y"
            />
            <p className="text-xs text-gray-400 mt-1">ctx: {'{'} getProgramSubmissions, getAllPayouts, getProgramDetail, apiGet {'}'}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Custom transform function body
              <span className="ml-1 font-normal text-gray-400">(raw, params, programs, ctx) → ReportData</span>
            </label>
            <textarea
              value={spec.customTransform ?? ''}
              onChange={(e) => onChange({ customTransform: e.target.value })}
              rows={10}
              spellCheck={false}
              placeholder={`const submissions = raw;\n// ... process data ...\nreturn {\n  rows: [...],\n  chartData: [...],\n  summaryCards: [...],\n};`}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-blue resize-y"
            />
            <p className="text-xs text-gray-400 mt-1">ctx: {'{'} bucketKey, allBuckets, daysBetween, COMPARE_COLORS, INTERVAL_OPTIONS {'}'}</p>
          </div>
        </div>
      )}
    </div>
  )
}
