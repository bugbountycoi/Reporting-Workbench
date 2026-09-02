import type { UserModuleSpec } from '../../reports/userModules/types'

interface Props {
  spec: Partial<UserModuleSpec>
  onChange: (patch: Partial<UserModuleSpec>) => void
}

type Col = { key: string; label: string }

export function StepTable({ spec, onChange }: Props) {
  const columns: Col[] = spec.tableColumns ?? []

  function addColumn() {
    onChange({ tableColumns: [...columns, { key: '', label: '' }] })
  }

  function updateCol(idx: number, patch: Partial<Col>) {
    onChange({ tableColumns: columns.map((c, i) => i === idx ? { ...c, ...patch } : c) })
  }

  function removeCol(idx: number) {
    onChange({ tableColumns: columns.filter((_, i) => i !== idx) })
  }

  function moveUp(idx: number) {
    if (idx === 0) return
    const next = [...columns]
    ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
    onChange({ tableColumns: next })
  }

  function moveDown(idx: number) {
    if (idx >= columns.length - 1) return
    const next = [...columns]
    ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
    onChange({ tableColumns: next })
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        Define the columns that appear in the data table. The key must match a field in the rows returned by your transform.
        Leave empty to use all fields from the first row.
      </p>

      {columns.length === 0 && (
        <p className="text-xs text-gray-400 italic">No columns defined — table will display all row fields.</p>
      )}

      {columns.map((col, idx) => (
        <div key={idx} className="flex gap-2 items-center">
          <div className="flex flex-col gap-0.5">
            <button onClick={() => moveUp(idx)} className="text-gray-300 hover:text-gray-500 text-xs leading-none" disabled={idx === 0}>▲</button>
            <button onClick={() => moveDown(idx)} className="text-gray-300 hover:text-gray-500 text-xs leading-none" disabled={idx >= columns.length - 1}>▼</button>
          </div>
          <input
            type="text"
            value={col.key}
            onChange={(e) => updateCol(idx, { key: e.target.value })}
            placeholder="key"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-blue"
          />
          <input
            type="text"
            value={col.label}
            onChange={(e) => updateCol(idx, { label: e.target.value })}
            placeholder="Column header"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue"
          />
          <button onClick={() => removeCol(idx)} className="text-red-400 hover:text-red-600 text-sm px-1">✕</button>
        </div>
      ))}

      <button
        onClick={addColumn}
        className="text-xs text-brand-blue hover:underline font-semibold"
      >
        + Add column
      </button>
    </div>
  )
}
