import { useMemo, useState } from 'react'
import type { ReportModule, ReportData } from '../reports/types'

const CATEGORY_LABELS: Record<string, string> = {
  triage:    'Triage',
  bounty:    'Bounty',
  snapshot:  'Snapshot',
  developer: 'Developer',
}

const CATEGORY_COLORS: Record<string, string> = {
  triage:    'bg-blue-100 text-blue-700',
  bounty:    'bg-green-100 text-green-700',
  snapshot:  'bg-purple-100 text-purple-700',
  developer: 'bg-gray-100 text-gray-600',
}

// Selected (active filter) chip styles — slightly richer background
const CATEGORY_ACTIVE: Record<string, string> = {
  triage:    'bg-blue-200 text-blue-800 ring-1 ring-blue-400',
  bounty:    'bg-green-200 text-green-800 ring-1 ring-green-400',
  snapshot:  'bg-purple-200 text-purple-800 ring-1 ring-purple-400',
  developer: 'bg-gray-200 text-gray-700 ring-1 ring-gray-400',
}

interface Props {
  reports: ReportModule[]
  selectedId: string | null
  onSelect: (report: ReportModule) => void
  onSelectPreview: (report: ReportModule) => void
  onSelectMyData: (report: ReportModule) => void
  moduleDataCache: Record<string, ReportData>
  onCreateNew: () => void
  onExport: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

export function ReportSelector({
  reports,
  selectedId,
  onSelect,
  onSelectPreview,
  onSelectMyData,
  moduleDataCache,
  onCreateNew,
  onExport,
  onEdit,
  onDelete,
}: Props) {
  // Derive categories present in the current report list, in display order
  const availableCategories = useMemo(() => {
    const order = Object.keys(CATEGORY_LABELS)
    const present = new Set<string>(reports.map((r) => r.category))
    return order.filter((c) => present.has(c))
  }, [reports])

  // All categories active by default — deselecting a chip hides that category
  const [activeCategories, setActiveCategories] = useState<Set<string>>(
    () => new Set<string>(availableCategories)
  )

  function toggleCategory(cat: string) {
    setActiveCategories((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) {
        next.delete(cat)
      } else {
        next.add(cat)
      }
      return next
    })
  }

  const visibleReports = useMemo(
    () => reports.filter((r) => activeCategories.has(r.category)),
    [reports, activeCategories]
  )

  return (
    <div>
      {/* Category filter chips */}
      {availableCategories.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          {availableCategories.map((cat) => {
            const active = activeCategories.has(cat)
            return (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={`text-xs rounded-full px-2.5 py-1 font-semibold transition-all select-none ${
                  active ? CATEGORY_ACTIVE[cat] : 'bg-gray-50 text-gray-400 ring-1 ring-gray-200'
                }`}
                aria-pressed={active}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            )
          })}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {visibleReports.map((report) => {
          const hasMyData = Boolean(moduleDataCache[report.id])
          const isUserCreated = !report.isBuiltIn
          const isSelected = selectedId === report.id

          return (
            <div
              key={report.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(report)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(report) }}
              className={`relative text-left p-4 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'border-brand-blue bg-blue-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <span className="font-heading font-medium text-gray-900 text-sm leading-snug">{report.title}</span>
                <span className={`text-xs rounded-full px-2 py-0.5 font-semibold shrink-0 ${CATEGORY_COLORS[report.category]}`}>
                  {CATEGORY_LABELS[report.category]}
                </span>
              </div>

              {(report.author || report.version) && (
                <p className="text-xs text-gray-400 mb-1">
                  {report.author ?? ''}
                  {report.author && report.version ? ' · ' : ''}
                  {report.version ? `v${report.version}` : ''}
                </p>
              )}

              <p className="text-xs text-brand-gray-mid leading-relaxed">{report.description}</p>

              <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold">
                <button
                  onClick={(e) => { e.stopPropagation(); onSelectPreview(report) }}
                  className="text-brand-blue hover:underline"
                >
                  Preview →
                </button>
                {hasMyData && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onSelectMyData(report) }}
                    className="text-brand-green hover:underline"
                  >
                    My data →
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); onExport(report.id) }}
                  className="text-gray-400 hover:text-gray-600 hover:underline"
                >
                  Export ↓
                </button>
                {isUserCreated && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); onEdit(report.id) }}
                      className="text-amber-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(report.id) }}
                      className="text-red-500 hover:underline"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })}

        {/* Create new report tile */}
        <button
          onClick={onCreateNew}
          className="text-left p-4 rounded-xl border-2 border-dashed border-gray-200 bg-white hover:border-brand-blue hover:bg-blue-50 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 min-h-[110px]"
        >
          <span className="text-3xl text-gray-300 leading-none select-none">+</span>
          <span className="text-xs font-semibold text-gray-400">Create report module</span>
        </button>
      </div>
    </div>
  )
}
