import { useState } from 'react'

interface Props {
  data: unknown
}

export function RawJsonToggle({ data }: Props) {
  const [open, setOpen] = useState(false)

  if (!data) return null

  return (
    <div className="mt-4" data-no-print>
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-xs text-gray-500 hover:text-gray-700 underline"
      >
        {open ? 'Hide raw data' : 'Show raw data (JSON)'}
      </button>
      {open && (
        <pre className="mt-2 bg-gray-900 text-green-400 rounded-xl p-4 text-xs overflow-auto max-h-96 font-mono">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  )
}
