import { useState } from 'react'
import type { ReportModule, ReportData } from '../reports/types'
import { downloadCsv, downloadJson } from '../utils/csv'
import { exportElementAsPng } from '../utils/imageExport'

interface Props {
  report: ReportModule
  data: ReportData
  chartElementId: string
}

export function ExportButtons({ report, data, chartElementId }: Props) {
  const [copying, setCopying] = useState(false)

  const handleCsv = () => {
    const rows = report.exportConfig.getCsvRows(data)
    downloadCsv(rows, report.exportConfig.csvFilename)
  }

  const handleJson = () => {
    downloadJson(data.rawData ?? data.rows, report.exportConfig.jsonFilename)
  }

  const handleImage = async () => {
    const el = document.getElementById(chartElementId)
    if (!el) return
    await exportElementAsPng(el, report.exportConfig.imageFilename)
  }

  const handleCopy = async () => {
    const summary = report.summaryFormatter(data)
    await navigator.clipboard.writeText(summary)
    setCopying(true)
    setTimeout(() => setCopying(false), 1500)
  }

  const btnClass = 'px-3 py-2 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700 flex items-center gap-1.5'

  return (
    <div className="flex flex-wrap gap-2">
      <button onClick={handleCsv} className={btnClass}>
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
        Export CSV
      </button>
      <button onClick={handleJson} className={btnClass}>
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
        Export JSON
      </button>
      <button onClick={handleImage} className={btnClass}>
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        Export Image
      </button>
      <button onClick={handleCopy} className={btnClass}>
        {copying ? (
          <><svg className="w-3.5 h-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Copied!</>
        ) : (
          <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> Copy Summary</>
        )}
      </button>
    </div>
  )
}
