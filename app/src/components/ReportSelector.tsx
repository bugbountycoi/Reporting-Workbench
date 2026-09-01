import type { ReportModule, ReportData } from '../reports/types'

const CATEGORY_LABELS: Record<string, string> = {
  triage: 'Triage',
  bounty: 'Bounty',
  snapshot: 'Snapshot',
  developer: 'Developer',
}

const CATEGORY_COLORS: Record<string, string> = {
  triage: 'bg-blue-100 text-blue-700',
  bounty: 'bg-green-100 text-green-700',
  snapshot: 'bg-purple-100 text-purple-700',
  developer: 'bg-gray-100 text-gray-600',
}

interface Props {
  reports: ReportModule[]
  selectedId: string | null
  onSelect: (report: ReportModule) => void
  onSelectPreview: (report: ReportModule) => void
  onSelectMyData: (report: ReportModule) => void
  moduleDataCache: Record<string, ReportData>
}

export function ReportSelector({ reports, selectedId, onSelect, onSelectPreview, onSelectMyData, moduleDataCache }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {reports.map((report) => {
        const hasMyData = Boolean(moduleDataCache[report.id])
        return (
          <div
            key={report.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(report)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(report) }}
            className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
              selectedId === report.id
                ? 'border-brand-blue bg-blue-50 shadow-sm'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="font-heading font-medium text-gray-900 text-sm leading-snug">{report.title}</span>
              <span className={`text-xs rounded-full px-2 py-0.5 font-semibold shrink-0 ${CATEGORY_COLORS[report.category]}`}>
                {CATEGORY_LABELS[report.category]}
              </span>
            </div>
            <p className="text-xs text-brand-gray-mid leading-relaxed">{report.description}</p>
            <div className="mt-2 flex gap-3 text-xs font-semibold">
              <button
                onClick={(e) => { e.stopPropagation(); onSelectPreview(report) }}
                className="text-brand-blue hover:underline"
              >
                Show Preview →
              </button>
              {hasMyData && (
                <button
                  onClick={(e) => { e.stopPropagation(); onSelectMyData(report) }}
                  className="text-brand-green hover:underline"
                >
                  My data →
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
