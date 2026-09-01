import { useState, useCallback, useEffect, useRef } from 'react'
import { AppShell } from './components/AppShell'
import { ApiKeyPanel } from './components/ApiKeyPanel'
import { CacheFolderPanel } from './components/CacheFolderPanel'
import { EncryptionPanel } from './components/EncryptionPanel'
import { ReportSelector } from './components/ReportSelector'
import { ReportConfigPanel } from './components/ReportConfigPanel'
import { SummaryCards } from './components/SummaryCards'
import { DataTable } from './components/DataTable'
import { ChartPanel } from './components/ChartPanel'
import { ExportButtons } from './components/ExportButtons'
import { ErrorPanel } from './components/ErrorPanel'
import { RawJsonToggle } from './components/RawJsonToggle'
import { getToken, enableLocalStorage } from './auth/store'
import { getPrograms } from './api/endpoints/programs'
import { getAvailableReports } from './reports/registry'
import type { ReportModule, ReportData, ReportParams, AppContext } from './reports/types'
import type { ProgramOverviewViewModel } from './api/types'
import { API_CONFIG } from './config/api'
import { saveWorkbenchConfig, loadWorkbenchConfig, type SavedModuleParams } from './config/savedConfig'

const TOKEN_STORAGE_KEY = 'intigriti_workbench_token'

function NetworkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
    </svg>
  )
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
    </svg>
  )
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  )
}

function SaveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
    </svg>
  )
}

export default function App() {
  const [appState, setAppState] = useState<'setup' | 'connected'>('setup')
  const [programs, setPrograms] = useState<ProgramOverviewViewModel[]>([])
  const [selectedReport, setSelectedReport] = useState<ReportModule | null>(null)
  const [configPanelOpen, setConfigPanelOpen] = useState(true)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSamplePreview, setShowSamplePreview] = useState(true)

  const [panelsOpen, setPanelsOpen] = useState({ api: true, cache: true, encryption: true })
  const [cacheConfigured, setCacheConfigured] = useState(false)
  const [encryptionConfigured, setEncryptionConfigured] = useState(false)

  const [moduleParamsCache, setModuleParamsCache] = useState<Record<string, ReportParams>>({})
  const [saveLabel, setSaveLabel] = useState<string | null>(null)

  const hasAutoConnected = useRef(false)

  const isConnected = appState === 'connected'
  const appContext: AppContext = { programs, hasToken: Boolean(getToken()) }
  const availableReports = getAvailableReports(appContext)

  const handleConnected = useCallback(async () => {
    setError(null)
    try {
      const progs = await getPrograms()
      setPrograms(progs)
      setAppState('connected')
      setPanelsOpen((p) => ({ ...p, api: false }))

      const saved = loadWorkbenchConfig()
      if (saved) {
        const restored: Record<string, ReportParams> = {}
        for (const [reportId, savedParams] of Object.entries(saved.moduleParams)) {
          const { programIndices, ...rest } = savedParams
          const resolvedIds = (programIndices as number[])
            .map((idx: number) => progs[idx - 1]?.id)
            .filter((id): id is string => Boolean(id))
          restored[reportId] = { ...rest, programIds: resolvedIds }
        }
        setModuleParamsCache(restored)
      }
    } catch (e) {
      setError(String(e))
      setPanelsOpen((p) => ({ ...p, api: true }))
    }
  }, [])

  useEffect(() => {
    if (hasAutoConnected.current) return
    const stored = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (stored) {
      hasAutoConnected.current = true
      enableLocalStorage()
      handleConnected()
    }
  }, [handleConnected])

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

  const togglePanel = (panel: 'api' | 'cache' | 'encryption') => {
    setPanelsOpen((p) => ({ ...p, [panel]: !p[panel] }))
  }

  const handleSelectReport = (report: ReportModule) => {
    if (selectedReport?.id === report.id) {
      setConfigPanelOpen((v) => !v)
      return
    }
    setSelectedReport(report)
    setReportData(null)
    setShowSamplePreview(true)
    setError(null)
    setConfigPanelOpen(true)
  }

  const handleGenerateReport = async (params: ReportParams) => {
    if (!selectedReport) return
    setLoading(true)
    setError(null)
    setShowSamplePreview(false)
    try {
      const paramsWithContext = { ...params, programs }
      const raw = await selectedReport.fetchData(paramsWithContext)
      const data = selectedReport.transform(raw, paramsWithContext)
      setReportData(data)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  const handleParamsChange = useCallback((reportId: string, params: ReportParams) => {
    setModuleParamsCache((c) => ({ ...c, [reportId]: params }))
  }, [])

  const handleSaveConfig = () => {
    const moduleParams: Record<string, SavedModuleParams> = {}
    for (const [reportId, params] of Object.entries(moduleParamsCache)) {
      const programIds = (params.programIds as string[] | undefined) ?? []
      const programIndices = programIds
        .map((id) => programs.findIndex((p) => p.id === id) + 1)
        .filter((idx) => idx > 0)
      const clean: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(params)) {
        if (k !== 'programIds' && k !== 'programs') clean[k] = v
      }
      moduleParams[reportId] = { ...clean, programIndices } as SavedModuleParams
    }
    saveWorkbenchConfig({ version: 1, moduleParams, savedAt: new Date().toISOString() })
    setSaveLabel('Saved!')
    setTimeout(() => setSaveLabel(null), 2500)
  }

  const activeData = showSamplePreview && selectedReport ? selectedReport.samplePreview : reportData

  const anyConfigPanelOpen =
    panelsOpen.api || (isConnected && (panelsOpen.cache || panelsOpen.encryption))

  const headerActions = isConnected ? (
    <>
      <button
        onClick={handleSaveConfig}
        title="Save configuration to browser storage for next session"
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold text-white/80 hover:text-white hover:bg-white/10 transition-colors"
      >
        <SaveIcon className="w-3.5 h-3.5" />
        {saveLabel ?? 'Save Config'}
      </button>

      <div className="w-px h-4 bg-white/20 mx-0.5" />

      <button
        onClick={() => togglePanel('api')}
        title={`API Connection${isConnected ? ' — configured' : ''} — click to ${panelsOpen.api ? 'hide' : 'show'}`}
        className={`p-1.5 rounded-md transition-colors ${panelsOpen.api ? 'bg-white/15' : 'hover:bg-white/10'}`}
      >
        <NetworkIcon className={`w-4 h-4 ${isConnected ? 'text-green-400' : 'text-white/30'}`} />
      </button>

      <button
        onClick={() => togglePanel('cache')}
        title={`Cache Folder${cacheConfigured ? ' — configured' : ' — not configured'} — click to ${panelsOpen.cache ? 'hide' : 'show'}`}
        className={`p-1.5 rounded-md transition-colors ${panelsOpen.cache ? 'bg-white/15' : 'hover:bg-white/10'}`}
      >
        <FolderIcon className={`w-4 h-4 ${cacheConfigured ? 'text-green-400' : 'text-white/30'}`} />
      </button>

      <button
        onClick={() => togglePanel('encryption')}
        title={`Encryption${encryptionConfigured ? ' — configured' : ' — not configured'} — click to ${panelsOpen.encryption ? 'hide' : 'show'}`}
        className={`p-1.5 rounded-md transition-colors ${panelsOpen.encryption ? 'bg-white/15' : 'hover:bg-white/10'}`}
      >
        <LockIcon className={`w-4 h-4 ${encryptionConfigured ? 'text-green-400' : 'text-white/30'}`} />
      </button>
    </>
  ) : null

  return (
    <AppShell headerActions={headerActions}>
      {/* Config panels row */}
      {anyConfigPanelOpen && (
        <div className="flex flex-wrap gap-4 items-start mb-6" data-no-print>
          {panelsOpen.api && (
            <div className="flex-1 min-w-[300px]">
              <ApiKeyPanel
                onConnected={handleConnected}
                isConnected={isConnected}
                programs={programs}
                onClose={() => togglePanel('api')}
              />
            </div>
          )}
          {isConnected && panelsOpen.cache && (
            <div className="flex-1 min-w-[260px]">
              <CacheFolderPanel
                onFolderSelected={() => {
                  setCacheConfigured(true)
                  setPanelsOpen((p) => ({ ...p, cache: false }))
                }}
                onClose={() => setPanelsOpen((p) => ({ ...p, cache: false }))}
              />
            </div>
          )}
          {isConnected && panelsOpen.encryption && (
            <div className="flex-1 min-w-[260px]">
              <EncryptionPanel
                onConfigured={() => {
                  setEncryptionConfigured(true)
                  setPanelsOpen((p) => ({ ...p, encryption: false }))
                }}
                onClose={() => setPanelsOpen((p) => ({ ...p, encryption: false }))}
              />
            </div>
          )}
        </div>
      )}

      {error && !isConnected && <ErrorPanel message={error} />}

      {isConnected && (
        <>
          {API_CONFIG.mockMode && (
            <div className="mb-4 px-4 py-2 bg-amber-100 border border-amber-300 rounded-lg text-amber-800 text-sm font-medium">
              Mock mode active — all API calls return fixture data. Run without VITE_MOCK_MODE to use live data.
            </div>
          )}

          <section>
            <h2 className="text-lg font-heading font-semibold text-brand-navy mb-3">Reports</h2>
            <ReportSelector
              reports={availableReports}
              selectedId={selectedReport?.id ?? null}
              onSelect={handleSelectReport}
            />
          </section>

          {selectedReport && (
            <section className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-heading font-semibold text-brand-navy">
                    {selectedReport.title}
                  </h2>
                  <p className="text-sm text-brand-gray-mid mt-0.5">{selectedReport.description}</p>
                </div>
                {showSamplePreview && configPanelOpen && (
                  <span className="text-xs bg-brand-gold/10 text-brand-gold border border-brand-gold/30 rounded-full px-3 py-1 font-bold font-body uppercase tracking-wide">
                    Sample Preview
                  </span>
                )}
              </div>

              {configPanelOpen && (
                <>
                  <div data-no-print>
                    <ReportConfigPanel
                      key={selectedReport.id}
                      report={selectedReport}
                      programs={programs}
                      onGenerate={handleGenerateReport}
                      loading={loading}
                      initialParams={moduleParamsCache[selectedReport.id]}
                      onParamsChange={(p) => handleParamsChange(selectedReport.id, p)}
                    />
                  </div>

                  {error && <ErrorPanel message={error} />}

                  {activeData && (
                    <>
                      <SummaryCards cards={activeData.summaryCards} />

                      {(activeData.chartConfig ?? selectedReport.chartConfig) && (
                        <ChartPanel
                          id={`chart-${selectedReport.id}`}
                          config={activeData.chartConfig ?? selectedReport.chartConfig!}
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
                </>
              )}
            </section>
          )}
        </>
      )}
    </AppShell>
  )
}
