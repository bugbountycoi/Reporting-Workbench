import type { UserModuleSpec, SeriesDef, ChartType } from '../../reports/userModules/types'
import { CHART_TYPE_OPTIONS, DEFAULT_COLORS } from './constants'

interface Props {
  spec: Partial<UserModuleSpec>
  onChange: (patch: Partial<UserModuleSpec>) => void
}

export function StepVisualization({ spec, onChange }: Props) {
  const series: SeriesDef[] = spec.series ?? []
  const metrics = spec.metrics ?? []
  const chartType = spec.chartType ?? 'bar'

  function updateSeriesColor(metricKey: string, color: string) {
    onChange({
      series: series.map((s) => s.metricKey === metricKey ? { ...s, color } : s),
    })
  }

  const allowedTypes: Array<'bar' | 'stackedBar' | 'line'> =
    (CHART_TYPE_OPTIONS.filter((o) => o.value !== 'none').map((o) => o.value) as Array<'bar' | 'stackedBar' | 'line'>)

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-2">Default chart type</label>
        <div className="grid grid-cols-2 gap-2">
          {CHART_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ chartType: opt.value as ChartType })}
              className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors text-left ${
                chartType === opt.value
                  ? 'border-brand-blue bg-blue-50 text-brand-blue'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {chartType !== 'none' && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">X-axis label</label>
              <input
                type="text"
                value={spec.chartXLabel ?? ''}
                onChange={(e) => onChange({ chartXLabel: e.target.value })}
                placeholder="e.g. Period"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Y-axis label</label>
              <input
                type="text"
                value={spec.chartYLabel ?? ''}
                onChange={(e) => onChange({ chartYLabel: e.target.value })}
                placeholder="e.g. Count"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Allowed chart type switcher options</label>
            <div className="flex gap-2">
              {allowedTypes.map((t) => {
                const current = spec.allowedChartTypes ?? allowedTypes
                const checked = current.includes(t)
                return (
                  <label key={t} className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-700">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...current, t]
                          : current.filter((c) => c !== t)
                        onChange({ allowedChartTypes: next })
                      }}
                      className="accent-brand-blue"
                    />
                    {t}
                  </label>
                )
              })}
            </div>
          </div>

          {series.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">Series colors</label>
              {series.map((s, idx) => {
                const metric = metrics.find((m) => m.key === s.metricKey)
                const label = metric?.label ?? s.metricKey
                return (
                  <div key={s.metricKey} className="flex items-center gap-3 mb-2">
                    <input
                      type="color"
                      value={s.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length]}
                      onChange={(e) => updateSeriesColor(s.metricKey, e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border border-gray-200"
                    />
                    <span className="text-xs text-gray-700">{label}</span>
                    <input
                      type="text"
                      value={s.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length]}
                      onChange={(e) => updateSeriesColor(s.metricKey, e.target.value)}
                      className="w-24 border border-gray-200 rounded px-2 py-1 text-xs font-mono"
                    />
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
