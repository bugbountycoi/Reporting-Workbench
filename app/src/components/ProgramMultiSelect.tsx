import type { ProgramOverviewViewModel } from '../api/types'

interface Props {
  programs: ProgramOverviewViewModel[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

export function ProgramMultiSelect({ programs, selectedIds, onChange }: Props) {
  const allIds = programs.map((p) => p.id)

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id))
    } else {
      onChange([...selectedIds, id])
    }
  }

  return (
    <div>
      <div className="flex gap-1.5 mb-2">
        <button
          type="button"
          onClick={() => onChange(allIds)}
          className="px-2.5 py-1 text-xs rounded border border-gray-200 bg-brand-near-white text-brand-gray-dark hover:border-brand-blue hover:text-brand-blue transition-colors font-medium"
        >
          Select All
        </button>
        <button
          type="button"
          onClick={() => onChange([])}
          className="px-2.5 py-1 text-xs rounded border border-gray-200 bg-brand-near-white text-brand-gray-dark hover:border-brand-blue hover:text-brand-blue transition-colors font-medium"
        >
          Select None
        </button>
      </div>
      <div className="space-y-0.5 max-h-44 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-white">
        {programs.length === 0 && (
          <p className="text-xs text-brand-gray-mid py-2 text-center">No programs available</p>
        )}
        {programs.map((p) => (
          <label
            key={p.id}
            className="flex items-center gap-2.5 py-1.5 px-1 cursor-pointer group rounded hover:bg-brand-near-white"
          >
            <input
              type="checkbox"
              checked={selectedIds.includes(p.id)}
              onChange={() => toggle(p.id)}
              className="accent-brand-blue shrink-0"
            />
            <span className="text-sm text-gray-700 group-hover:text-brand-navy flex-1 min-w-0 truncate">
              {p.name}
            </span>
            {p.status?.value && (
              <span className="text-xs text-brand-gray-mid shrink-0">{p.status.value}</span>
            )}
          </label>
        ))}
      </div>
      <p className="text-xs text-brand-gray-mid mt-1.5">
        {selectedIds.length} of {programs.length} program{programs.length !== 1 ? 's' : ''} selected
      </p>
    </div>
  )
}
