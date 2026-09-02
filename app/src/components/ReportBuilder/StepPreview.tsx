import { useState } from 'react'
import type { UserModuleSpec } from '../../reports/userModules/types'
import type { ProgramOverviewViewModel } from '../../api/types'
import type { ReportData } from '../../reports/types'
import { specToModule } from '../../reports/userModules/interpreter'
import { SummaryCards } from '../SummaryCards'
import { ChartPanel } from '../ChartPanel'

interface Props {
  spec: Partial<UserModuleSpec>
  programs: ProgramOverviewViewModel[]
  onSave: (spec: UserModuleSpec) => void
  onCancel: () => void
  isEdit: boolean
}

function isCompleteSpec(s: Partial<UserModuleSpec>): s is UserModuleSpec {
  return (
    !!s.schemaVersion &&
    !!s.id &&
    !!s.title &&
    !!s.description &&
    !!s.category &&
    !!s.author &&
    !!s.version &&
    !!s.dataSource &&
    !!s.params &&
    !!s.groupBy &&
    s.metrics !== undefined &&
    s.sortBy !== undefined &&
    s.summaryCards !== undefined &&
    s.chartType !== undefined &&
    s.series !== undefined &&
    s.tableColumns !== undefined
  )
}

export function StepPreview({ spec, programs, onSave, onCancel, isEdit }: Props) {
  const [previewData, setPreviewData] = useState<ReportData | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)

  const complete = isCompleteSpec(spec)

  async function runPreview() {
    if (!complete) return
    setRunning(true)
    setPreviewError(null)
    try {
      const mod = specToModule(spec, programs)
      setPreviewData(mod.samplePreview)
    } catch (e) {
      setPreviewError(String(e))
    } finally {
      setRunning(false)
    }
  }

  const missingFields: string[] = []
  if (!spec.id) missingFields.push('Module ID')
  if (!spec.title) missingFields.push('Title')
  if (!spec.description) missingFields.push('Description')
  if (!spec.dataSource) missingFields.push('Data source')
  if (!spec.author) missingFields.push('Author')

  return (
    <div className="space-y-5">
      {missingFields.length > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
          <strong>Required fields missing:</strong> {missingFields.join(', ')}
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-700">Sample preview</p>
          <button
            onClick={runPreview}
            disabled={!complete || running}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-brand-blue text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            {running ? 'Running…' : 'Run preview'}
          </button>
        </div>

        {previewError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-mono">
            {previewError}
          </div>
        )}

        {previewData && !previewError && (
          <>
            <SummaryCards cards={previewData.summaryCards} />
            {(previewData.chartConfig ?? (complete ? specToModule(spec, programs).chartConfig : null)) && (
              <ChartPanel
                id="builder-preview-chart"
                config={(previewData.chartConfig ?? specToModule(spec as UserModuleSpec, programs).chartConfig)!}
                data={previewData.chartData}
              />
            )}
            {previewData.rows.length > 0 && (
              <div className="mt-3 overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.keys(previewData.rows[0]).map((k) => (
                        <th key={k} className="text-left px-3 py-2 font-semibold text-gray-600 whitespace-nowrap">{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.rows.slice(0, 10).map((row, i) => (
                      <tr key={i} className="border-t border-gray-100">
                        {Object.values(row).map((v, j) => (
                          <td key={j} className="px-3 py-1.5 text-gray-700">{String(v)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewData.rows.length > 10 && (
                  <p className="text-xs text-gray-400 px-3 py-2">…{previewData.rows.length - 10} more rows</p>
                )}
              </div>
            )}
          </>
        )}

        {!previewData && !previewError && (
          <p className="text-xs text-gray-400 italic">Click "Run preview" to test the module with its sample fixture data.</p>
        )}
      </div>

      <div className="flex gap-3 pt-2 border-t border-gray-100">
        <button
          onClick={onCancel}
          className="flex-1 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => complete && onSave(spec)}
          disabled={!complete}
          className="flex-1 py-2 rounded-lg bg-brand-blue text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
        >
          {isEdit ? 'Save changes' : 'Save module'}
        </button>
      </div>
    </div>
  )
}
