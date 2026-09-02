import type { UserModuleSpec } from '../../reports/userModules/types'
import { DATA_SOURCE_OPTIONS } from './constants'

interface Props {
  spec: Partial<UserModuleSpec>
  onChange: (patch: Partial<UserModuleSpec>) => void
}

export function StepData({ spec, onChange }: Props) {
  const p = spec.params ?? { includePrograms: true, includeDateRange: false, includeInterval: false }

  function patchParams(patch: Partial<typeof p>) {
    onChange({ params: { ...p, ...patch } })
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-2">Data source <span className="text-red-500">*</span></label>
        <div className="flex gap-3">
          {DATA_SOURCE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ dataSource: opt.value })}
              className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                spec.dataSource === opt.value
                  ? 'border-brand-blue bg-blue-50 text-brand-blue'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {spec.dataSource === 'submissions' && 'Fetches all submissions for the selected programs.'}
          {spec.dataSource === 'payouts' && 'Fetches all company payouts (company-wide, not per-program).'}
          {spec.dataSource === 'programs' && 'Uses the list of programs already loaded in the app.'}
          {!spec.dataSource && 'Select a data source to continue.'}
        </p>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-700 mb-2">Parameters to show users</p>
        <div className="space-y-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={p.includePrograms}
              onChange={(e) => patchParams({ includePrograms: e.target.checked })}
              className="w-4 h-4 rounded accent-brand-blue"
            />
            <div>
              <span className="text-sm text-gray-800">Program selector</span>
              <p className="text-xs text-gray-400">Let users choose which programs to include.</p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={p.includeDateRange}
              onChange={(e) => patchParams({ includeDateRange: e.target.checked })}
              className="w-4 h-4 rounded accent-brand-blue"
            />
            <div>
              <span className="text-sm text-gray-800">Date range</span>
              <p className="text-xs text-gray-400">Start date and end date pickers.</p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={p.includeInterval}
              onChange={(e) => patchParams({ includeInterval: e.target.checked })}
              className="w-4 h-4 rounded accent-brand-blue"
            />
            <div>
              <span className="text-sm text-gray-800">Time interval</span>
              <p className="text-xs text-gray-400">Day / Week / Month grouping selector.</p>
            </div>
          </label>
        </div>
      </div>
    </div>
  )
}
