import { useState, useCallback, useEffect } from 'react'
import { AppShell } from './components/AppShell'
import { ApiKeyPanel } from './components/ApiKeyPanel'
import { CacheSettingsPanel } from './components/CacheSettingsPanel'
import { ReportSelector } from './components/ReportSelector'
import { ReportConfigPanel } from './components/ReportConfigPanel'
import { SummaryCards } from './components/SummaryCards'
import { DataTable } from './components/DataTable'
import { ChartPanel } from './components/ChartPanel'
import { ExportButtons } from './components/ExportButtons'
import { ErrorPanel } from './components/ErrorPanel'
import { RawJsonToggle } from './components/RawJsonToggle'
import { getToken } from './auth/store'
import { getPrograms } from './api/endpoints/programs'
import { getAvailableReports } from './reports/registry'
import type { ReportModule, ReportData, ReportParams, AppContext } from './reports/types'
import type { ProgramOverviewViewModel } from './api/types'
import { API_CONFIG } from './config/api'

type AppState = 'setup' | 'connected' | 'report'

export default function App() {
  const [appState, setAppState] = useState<AppState>('setup')
  const [programs, setPrograms] = useState<ProgramOverviewViewModel[]>([])
  const [selectedReport, setSelectedReport] = useState<ReportModule | null>(null)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSamplePreview, setShowSamplePreview] = useState(true)

  const appContext: AppContext = { programs, hasToken: Boolean(getToken()) }
  const availableReports = getAvailableReports(appContext)

  const handleConnected = useCallback(async () => {
    setError(null)
    try {
      const progs = await getPrograms()
      setPrograms(progs)
      setAppState('connected')
    } catch (e) {
      setError(String(e))
    }
  }, [])

  // Handle OAuth callback
  useEffect(() => {
    const url = new URL(window.location.href)
    if (url.pathname === '/oauth/callback') {
      const code = url.searchParams.get('code')
      const state = url.searchParams.get('state')
      if (code && state) {
        window.dispatchEvent(new CustomEvent('oauth-callback', { detail: { code, state } }))
        window.history.replaceState({}, '', '/')
      }
    }
  }, [])

  const handleSelectReport = (report: ReportModule) => {
    setSelectedReport(report)
    setReportData(null)
    setShowSamplePreview(true)
    setError(null)
    setAppState('report')
  }

  const handleGenerateReport = async (params: ReportParams) => {
    if (!selectedReport) return
    setLoading(true)
    setError(null)
    setShowSamplePreview(false)
    try {
      const raw = await selectedReport.fetchData(params)
      const data = selectedReport.transform(raw, params)
      setReportData(data)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  const activeData = showSamplePreview && selectedReport
    ? selectedReport.samplePreview
    : reportData

  return (
    <AppShell>
      {/* Setup panel — always shown in setup state, collapsible when connected */}
      <section data-no-print>
        <ApiKeyPanel
          onConnected={handleConnected}
          isConnected={appState !== 'setup'}
          programs={programs}
        />
      </section>

      {appState !== 'setup' && (
        <>
          {/* Cache settings */}
          <section data-no-print className="mt-4">
            <CacheSettingsPanel />
          </section>

          {API_CONFIG.mockMode && (
            <div className="mt-4 px-4 py-2 bg-amber-100 border border-amber-300 rounded-lg text-amber-800 text-sm font-medium">
              Mock mode active — all API calls return fixture data. Run without VITE_MOCK_MODE to use live data.
            </div>
          )}

          {/* Report selector */}
          <section className="mt-6">
            <h2 className="text-lg font-heading font-semibold text-brand-navy mb-3">Reports</h2>
            <ReportSelector
              reports={availableReports}
              selectedId={selectedReport?.id ?? null}
              onSelect={handleSelectReport}
            />
          </section>

          {/* Report area */}
          {selectedReport && (
            <section className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-heading font-semibold text-brand-navy">{selectedReport.title}</h2>
                  <p className="text-sm text-brand-gray-mid mt-0.5">{selectedReport.description}</p>
                </div>
                {showSamplePreview && (
                  <span className="text-xs bg-brand-gold/10 text-brand-gold border border-brand-gold/30 rounded-full px-3 py-1 font-bold font-body uppercase tracking-wide">
                    Sample Preview
                  </span>
                )}
              </div>

              {/* Config panel */}
              <div data-no-print>
                <ReportConfigPanel
                  report={selectedReport}
                  programs={programs}
                  onGenerate={handleGenerateReport}
                  loading={loading}
                />
              </div>

              {error && <ErrorPanel message={error} />}

              {activeData && (
                <>
                  <SummaryCards cards={activeData.summaryCards} />

                  {selectedReport.chartConfig && (
                    <ChartPanel
                      id={`chart-${selectedReport.id}`}
                      config={selectedReport.chartConfig}
                      data={activeData.chartData}
                    />
                  )}

                  {selectedReport.tableColumns.length > 0 && (
                    <DataTable columns={selectedReport.tableColumns} data={activeData.rows} />
                  )}

                  <div data-no-print className="mt-4">
                    <ExportButtons
                      report={selectedReport}
                      data={activeData}
                      chartElementId={`chart-${selectedReport.id}`}
                    />
                  </div>

                  <RawJsonToggle data={activeData.rawData} />
                </>
              )}
            </section>
          )}
        </>
      )}
    </AppShell>
  )
}
