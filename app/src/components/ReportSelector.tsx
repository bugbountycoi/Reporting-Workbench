import { useMemo, useState } from 'react'
import type { ReportModule, ReportData } from '../reports/types'
import type { PlatformId } from '../platforms/types'
import { PLATFORMS } from '../platforms/registry'

const CATEGORY_LABELS: Record<string, string> = {
  triage:    'Triage',
  bounty:    'Bounty',
  snapshot:  'Snapshot',
  developer: 'Developer',
}

/** Maps each category to a pair of brand CSS custom properties used for chip/badge coloring. */
const CATEGORY_CSS: Record<string, { bg: string; text: string }> = {
  triage:    { bg: 'var(--brand-blue)',      text: 'var(--brand-blue-dark)' },
  bounty:    { bg: 'var(--brand-green)',     text: 'var(--brand-green)' },
  snapshot:  { bg: 'var(--brand-orange)',    text: 'var(--brand-orange-dark)' },
  developer: { bg: 'var(--brand-gray-mid)',  text: 'var(--brand-gray-dark)' },
}

function getBadgeStyle(cat: string): React.CSSProperties {
  const css = CATEGORY_CSS[cat] ?? CATEGORY_CSS.triage
  return {
    background: `color-mix(in srgb, ${css.bg} 15%, transparent)`,
    color: css.text,
  }
}

function getChipStyle(cat: string, active: boolean): React.CSSProperties {
  if (!active) {
    return {
      background: 'color-mix(in srgb, var(--brand-gray-mid) 10%, transparent)',
      color: 'var(--brand-gray-mid)',
      outline: '1px solid color-mix(in srgb, var(--brand-gray-mid) 30%, transparent)',
    }
  }
  const css = CATEGORY_CSS[cat] ?? CATEGORY_CSS.triage
  return {
    background: `color-mix(in srgb, ${css.bg} 22%, transparent)`,
    color: css.text,
    outline: `1px solid ${css.bg}`,
  }
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
  onContribute: (id: string) => void
}

function modulePlatforms(report: ReportModule): PlatformId[] {
  if (!report.platform) return []
  return Array.isArray(report.platform) ? report.platform : [report.platform]
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
  onContribute,
}: Props) {
  const availablePlatforms = useMemo<PlatformId[]>(() => {
    const present = new Set<PlatformId>()
    for (const r of reports) {
      for (const p of modulePlatforms(r)) present.add(p)
    }
    const order: PlatformId[] = ['intigriti', 'hackerone', 'bugcrowd']
    return order.filter((p) => present.has(p))
  }, [reports])

  const [activePlatform, setActivePlatform] = useState<PlatformId | 'all'>('all')

  const availableCategories = useMemo(() => {
    const order = Object.keys(CATEGORY_LABELS)
    const present = new Set<string>(reports.map((r) => r.category))
    return order.filter((c) => present.has(c))
  }, [reports])

  const [activeCategories, setActiveCategories] = useState<Set<string>>(
    () => new Set<string>(availableCategories)
  )

  const [createHovered, setCreateHovered] = useState(false)

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

  const visibleReports = useMemo(() => {
    return reports.filter((r) => {
      if (!activeCategories.has(r.category)) return false
      if (activePlatform === 'all') return true
      const platforms = modulePlatforms(r)
      return platforms.length === 0 || platforms.includes(activePlatform)
    })
  }, [reports, activeCategories, activePlatform])

  return (
    <div>
      {/* Platform filter chips — only shown when multiple platforms present */}
      {availablePlatforms.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          <button
            onClick={() => setActivePlatform('all')}
            className="text-xs rounded-full px-2.5 py-1 font-semibold transition-all select-none border"
            style={activePlatform === 'all'
              ? { background: 'var(--brand-navy)', color: 'white', borderColor: 'var(--brand-navy)' }
              : { background: 'white', color: 'var(--brand-gray-mid)', borderColor: 'rgb(229 231 235)' }}
          >
            All platforms
          </button>
          {availablePlatforms.map((p) => (
            <button
              key={p}
              onClick={() => setActivePlatform(p)}
              className="text-xs rounded-full px-2.5 py-1 font-semibold transition-all select-none border"
              style={activePlatform === p
                ? { background: PLATFORMS[p].badgeColor, color: 'white', borderColor: PLATFORMS[p].badgeColor }
                : { background: 'white', color: PLATFORMS[p].badgeColor, borderColor: PLATFORMS[p].badgeColor }}
            >
              {PLATFORMS[p].name}
            </button>
          ))}
        </div>
      )}

      {/* Category filter chips */}
      {availableCategories.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          {availableCategories.map((cat) => {
            const active = activeCategories.has(cat)
            return (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className="text-xs rounded-full px-2.5 py-1 font-semibold transition-all select-none"
                style={getChipStyle(cat, active)}
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
                  ? 'border-brand-blue shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              }`}
              style={isSelected ? { backgroundColor: 'color-mix(in srgb, var(--brand-blue) 8%, transparent)' } : undefined}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <span className="font-heading font-medium text-gray-900 text-sm leading-snug">{report.title}</span>
                <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                  {modulePlatforms(report).map((p) => (
                    <span
                      key={p}
                      className="text-xs rounded-full px-1.5 py-0.5 font-semibold"
                      style={{ background: `${PLATFORMS[p].badgeColor}22`, color: PLATFORMS[p].badgeColor }}
                      title={PLATFORMS[p].name}
                    >
                      {PLATFORMS[p].name}
                    </span>
                  ))}
                  <span
                    className="text-xs rounded-full px-2 py-0.5 font-semibold"
                    style={getBadgeStyle(report.category)}
                  >
                    {CATEGORY_LABELS[report.category]}
                  </span>
                </div>
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
                      onClick={(e) => { e.stopPropagation(); onContribute(report.id) }}
                      className="text-brand-blue hover:underline"
                      title="Submit to the community via a pull request"
                    >
                      Contribute ↑
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
          onMouseEnter={() => setCreateHovered(true)}
          onMouseLeave={() => setCreateHovered(false)}
          className="text-left p-4 rounded-xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-2 min-h-[110px]"
          style={createHovered ? {
            borderColor: 'var(--brand-blue)',
            backgroundColor: 'color-mix(in srgb, var(--brand-blue) 8%, transparent)',
          } : {
            borderColor: 'rgb(229 231 235)',
            backgroundColor: 'white',
          }}
        >
          <span className="text-3xl text-gray-300 leading-none select-none">+</span>
          <span className="text-xs font-semibold text-gray-400">Create report module</span>
        </button>
      </div>
    </div>
  )
}
