import type { UserModuleSpec } from '../../reports/userModules/types'
import { CATEGORY_OPTIONS } from './constants'

interface Props {
  spec: Partial<UserModuleSpec>
  onChange: (patch: Partial<UserModuleSpec>) => void
}

export function StepBasics({ spec, onChange }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
        <input
          type="text"
          value={spec.title ?? ''}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="e.g. Monthly Bug Count"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">Description <span className="text-red-500">*</span></label>
        <textarea
          value={spec.description ?? ''}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="What does this report show?"
          rows={2}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Category <span className="text-red-500">*</span></label>
          <select
            value={spec.category ?? 'snapshot'}
            onChange={(e) => onChange({ category: e.target.value as UserModuleSpec['category'] })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Module ID <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={spec.id ?? ''}
            onChange={(e) => onChange({ id: e.target.value.replace(/[^a-z0-9-_]/gi, '') })}
            placeholder="e.g. monthly-bug-count"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue font-mono"
          />
          <p className="text-xs text-gray-400 mt-1">Letters, numbers, hyphens only. Must be unique.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Author</label>
          <input
            type="text"
            value={spec.author ?? ''}
            onChange={(e) => onChange({ author: e.target.value })}
            placeholder="Your name or team"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Version</label>
          <input
            type="text"
            value={spec.version ?? '1.0.0'}
            onChange={(e) => onChange({ version: e.target.value })}
            placeholder="1.0.0"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue font-mono"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">Export filename</label>
        <input
          type="text"
          value={spec.exportFilename ?? ''}
          onChange={(e) => onChange({ exportFilename: e.target.value })}
          placeholder="my-report"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue font-mono"
        />
        <p className="text-xs text-gray-400 mt-1">Used as base filename for CSV/JSON/image exports.</p>
      </div>
    </div>
  )
}
