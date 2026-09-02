import { useState } from 'react'
import type { UserModuleSpec } from '../../reports/userModules/types'
import type { ProgramOverviewViewModel } from '../../api/types'
import { STEPS } from './constants'
import { StepBasics } from './StepBasics'
import { StepData } from './StepData'
import { StepGroupMetrics } from './StepGroupMetrics'
import { StepVisualization } from './StepVisualization'
import { StepTable } from './StepTable'
import { StepPreview } from './StepPreview'

interface Props {
  initialSpec?: UserModuleSpec | null
  programs: ProgramOverviewViewModel[]
  onSave: (spec: UserModuleSpec) => void
  onCancel: () => void
}

function defaultSpec(): Partial<UserModuleSpec> {
  return {
    schemaVersion: 1,
    id: '',
    title: '',
    description: '',
    category: 'snapshot',
    author: '',
    version: '1.0.0',
    dataSource: 'submissions',
    params: { includePrograms: true, includeDateRange: true, includeInterval: false },
    groupBy: 'status',
    metrics: [],
    sortBy: { key: '', dir: 'asc' },
    summaryCards: [],
    chartType: 'bar',
    chartXLabel: '',
    chartYLabel: '',
    allowedChartTypes: ['bar', 'stackedBar', 'line'],
    series: [],
    tableColumns: [],
    exportFilename: '',
  }
}

export function ReportBuilder({ initialSpec, programs, onSave, onCancel }: Props) {
  const [stepIdx, setStepIdx] = useState(0)
  const [spec, setSpec] = useState<Partial<UserModuleSpec>>(initialSpec ?? defaultSpec())

  const isEdit = Boolean(initialSpec)

  function patch(p: Partial<UserModuleSpec>) {
    setSpec((prev) => ({ ...prev, ...p }))
  }

  function goTo(idx: number) {
    setStepIdx(Math.max(0, Math.min(STEPS.length - 1, idx)))
  }

  const stepProps = { spec, onChange: patch }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Step indicator */}
      <div className="flex border-b border-gray-100 overflow-x-auto">
        {STEPS.map((label, idx) => (
          <button
            key={label}
            onClick={() => goTo(idx)}
            className={`flex-1 min-w-fit px-3 py-3 text-xs font-semibold whitespace-nowrap transition-colors border-b-2 ${
              idx === stepIdx
                ? 'border-brand-blue text-brand-blue bg-blue-50'
                : idx < stepIdx
                ? 'border-transparent text-gray-500 hover:text-gray-700'
                : 'border-transparent text-gray-300'
            }`}
          >
            <span className="mr-1 text-gray-400">{idx + 1}.</span>
            {label}
          </button>
        ))}
      </div>

      {/* Step content */}
      <div className="p-5">
        <h3 className="text-sm font-heading font-semibold text-brand-navy mb-4">
          {STEPS[stepIdx]}
          {isEdit && stepIdx === 0 && <span className="ml-2 text-xs font-normal text-gray-400">— editing existing module</span>}
        </h3>

        {stepIdx === 0 && <StepBasics {...stepProps} />}
        {stepIdx === 1 && <StepData {...stepProps} />}
        {stepIdx === 2 && <StepGroupMetrics {...stepProps} />}
        {stepIdx === 3 && <StepVisualization {...stepProps} />}
        {stepIdx === 4 && <StepTable {...stepProps} />}
        {stepIdx === 5 && (
          <StepPreview
            spec={spec}
            programs={programs}
            onSave={onSave}
            onCancel={onCancel}
            isEdit={isEdit}
          />
        )}
      </div>

      {/* Prev / Next */}
      {stepIdx < STEPS.length - 1 && (
        <div className="flex gap-3 px-5 pb-5">
          {stepIdx > 0 && (
            <button
              onClick={() => goTo(stepIdx - 1)}
              className="flex-1 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              ← Back
            </button>
          )}
          <button
            onClick={() => goTo(stepIdx + 1)}
            className="flex-1 py-2 rounded-lg bg-brand-blue text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Next →
          </button>
          <button
            onClick={onCancel}
            className="py-2 px-4 text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
