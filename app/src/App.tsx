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
import { getToken, enableLocalStorage, TOKEN_STORAGE_KEY } from './auth/store'
import { getPrograms } from './api/endpoints/programs'
import { getAvailableReports, getSpecById } from './reports/registry'
import type { ReportModule, ReportData, ReportParams, AppContext } from './reports/types'
import type { UserModuleSpec } from './reports/userModules/types'
import { isUserModuleSpec } from './reports/userModules/types'
import { addUserModuleSpec, deleteUserModuleSpec, replaceUserModuleSpec } from './reports/userModules/store'
import { importModuleFromUrl, ModuleLoadError } from './reports/userModules/loader'
import { ReportBuilder } from './components/ReportBuilder'
import type { ProgramOverviewViewModel } from './api/types'
import { getMockMode, getCacheMode } from './config/api'
import { invokeOAuthCallback } from './auth/oauth'
import { DisclaimerModal, isDisclaimerAccepted } from './components/DisclaimerModal'
import { ThemeSwitcher } from './components/ThemeSwitcher'
import { BugReportBanner } from './components/BugReportBanner'
import { BugReportModal, type BugReportContext } from './components/BugReportModal'
import { saveWorkbenchConfig, loadWorkbenchConfig, type SavedModuleParams, type SavedSettings } from './config/savedConfig'
import { cacheConfig } from './cache/cacheConfig'


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

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function BugIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-2.21 0-4 1.79-4 4v2c0 2.21 1.79 4 4 4s4-1.79 4-4v-2c0-2.21-1.79-4-4-4z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12H4m16 0h-4M8 10l-2-2m12 2l2-2M8 16l-2 2m12-2l2 2M10 8V6a2 2 0 014 0v2" />
    </svg>
  )
}

export default function App() {
  const [appState, setAppState] = useState<'setup' | 'connected'>('setup')
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(isDisclaimerAccepted)
  const [disclaimerOpen, setDisclaimerOpen] = useState(false)
  const [programs, setPrograms] = useState<ProgramOverviewViewModel[]>([])
  const [selectedReport, setSelectedReport] = useState<ReportModule | null>(null)
  const [configPanelOpen, setConfigPanelOpen] = useState(true)
  const [moduleDataCache, setModuleDataCache] = useState<Record<string, ReportData>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSamplePreview, setShowSamplePreview] = useState(true)

  const [isMockMode, setIsMockMode] = useState(() => getMockMode())
  const [bugReportOpen, setBugReportOpen] = useState(false)

  const [panelsOpen, setPanelsOpen] = useState({ api: true, cache: true, encryption: true })
  const [cacheConfigured, setCacheConfigured] = useState(false)
  const [encryptionConfigured, setEncryptionConfigured] = useState(false)

  const [moduleParamsCache, setModuleParamsCache] = useState<Record<string, ReportParams>>({})
  const [saveLabel, setSaveLabel] = useState<string | null>(null)

  const [builderOpen, setBuilderOpen] = useState(false)
  const [editingSpec, setEditingSpec] = useState<UserModuleSpec | null>(null)
  const [importWarning, setImportWarning] = useState<string | null>(null)
  const [urlImportOpen, setUrlImportOpen] = useState(false)
  const [urlImportValue, setUrlImportValue] = useState('')
  const [urlImportBusy, setUrlImportBusy] = useState(false)
  const [urlImportError, setUrlImportError] = useState<string | null>(null)
  const [, forceRefresh] = useState(0)

  const importInputRef = useRef<HTMLInputElement>(null)
  const hasAutoConnected = useRef(false)

  const isConnected = appState === 'connected'
  const appContext: AppContext = { programs, hasToken: Boolean(getToken()) }
  const availableReports = getAvailableReports(appContext)

  const handleConnected = useCallback(async () => {
    setError(null)
    try {
      const progs = await getPrograms()
      setPrograms(progs)
      setIsMockMode(getMockMode())
      setAppState('connected')

      const saved = loadWorkbenchConfig()
      if (saved) {
        const restored: Record<string, ReportParams> = {}
        for (const [reportId, savedParams] of Object.entries(saved.moduleParams)) {
          const { programIndices, ...rest } = savedParams
          const resolvedIds = (Array.isArray(programIndices) ? programIndices : [])
            .map((idx: number) => progs[idx - 1]?.id)
            .filter((id): id is string => Boolean(id))
          restored[reportId] = { ...rest, programIds: resolvedIds }
        }
        setModuleParamsCache(restored)

        if (saved.settings) {
          cacheConfig.encryptionMode = saved.settings.encryptionMode
          if (saved.settings.encryptionMode !== 'none') setEncryptionConfigured(true)
          setPanelsOpen(saved.settings.panelsOpen)
        }
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
      enableLocalStorage().then(() => handleConnected())
    } else if (getMockMode()) {
      hasAutoConnected.current = true
      handleConnected()
    } else if (getCacheMode()) {
      hasAutoConnected.current = true
      handleConnected()
    }
  }, [handleConnected])

  useEffect(() => {
    const url = new URL(window.location.href)
    if (url.pathname === '/oauth/callback') {
      const code = url.searchParams.get('code')
      const state = url.searchParams.get('state')
      if (code && state) {
        // Call the module-level handler registered by ApiKeyPanel directly.
        // This avoids window.CustomEvent which is interceptable by browser extensions.
        invokeOAuthCallback(code, state)
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
    setShowSamplePreview(!moduleDataCache[report.id])
    setError(null)
    setConfigPanelOpen(true)
  }

  const handleSelectPreview = (report: ReportModule) => {
    setSelectedReport(report)
    setShowSamplePreview(true)
    setConfigPanelOpen(true)
    setError(null)
  }

  const handleSelectMyData = (report: ReportModule) => {
    setSelectedReport(report)
    setShowSamplePreview(false)
    setConfigPanelOpen(true)
    setError(null)
  }

  const handleGenerateReport = async (params: ReportParams) => {
    if (!selectedReport) return
    setLoading(true)
    setError(null)
    setShowSamplePreview(false)
    try {
      const paramsWithContext = { ...params, programs }
      const raw = await selectedReport.fetchData(paramsWithContext)
      const data = await selectedReport.transform(raw, paramsWithContext)
      setModuleDataCache((prev) => ({ ...prev, [selectedReport.id]: data }))
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  const handleParamsChange = useCallback((reportId: string, params: ReportParams) => {
    setModuleParamsCache((c) => ({ ...c, [reportId]: params }))
  }, [])

  const handleExportModule = (id: string) => {
    const spec = getSpecById(id)
    if (!spec) return
    const json = JSON.stringify(spec, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${spec.id}.rwce-module.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const hasCustomJs: string[] = []
    const valid: UserModuleSpec[] = []

    for (const file of Array.from(files)) {
      try {
        const text = await file.text()
        const parsed = JSON.parse(text)
        const specs = Array.isArray(parsed) ? parsed : [parsed]
        for (const obj of specs) {
          if (!isUserModuleSpec(obj)) {
            alert(`"${file.name}" is not a valid Reporting Workbench module file — skipped.`)
            continue
          }
          valid.push(obj as UserModuleSpec)
          if ((obj as UserModuleSpec).customTransform || (obj as UserModuleSpec).customFetchData || (obj as UserModuleSpec).customSummaryFormatter) {
            hasCustomJs.push((obj as UserModuleSpec).title)
          }
        }
      } catch {
        alert(`Could not read "${file.name}" — skipped.`)
      }
    }

    if (valid.length === 0) return

    if (hasCustomJs.length > 0) {
      const ok = window.confirm(
        `Warning: The following module(s) contain custom JavaScript that will execute in your browser:\n\n${hasCustomJs.join('\n')}\n\nCustom JavaScript can make HTTP requests, including sending your report data to external servers. Only import modules from authors you trust.\n\nClick OK to continue, or Cancel to abort.`
      )
      if (!ok) return
    }

    for (const spec of valid) {
      addUserModuleSpec(spec)
    }

    setImportWarning(hasCustomJs.length > 0 ? `Imported ${valid.length} module(s) — ${hasCustomJs.length} contain custom JavaScript.` : null)
    forceRefresh((n) => n + 1)
  }

  const handleImportFromUrl = async () => {
    if (!urlImportValue.trim()) return
    setUrlImportError(null)
    setUrlImportBusy(true)
    try {
      const specs = await importModuleFromUrl(urlImportValue.trim())
      const hasCustomJs = specs.filter((s) => s.customTransform || s.customFetchData || s.customSummaryFormatter).map((s) => s.title)
      if (hasCustomJs.length > 0) {
        const ok = window.confirm(
          `Warning: The following module(s) contain custom JavaScript that will execute in your browser:\n\n${hasCustomJs.join('\n')}\n\nCustom JavaScript can make HTTP requests, including sending your report data to external servers. Only import modules from authors you trust.\n\nClick OK to continue, or Cancel to abort.`
        )
        if (!ok) { setUrlImportBusy(false); return }
      }
      for (const spec of specs) addUserModuleSpec(spec)
      setImportWarning(hasCustomJs.length > 0 ? `Imported ${specs.length} module(s) — ${hasCustomJs.length} contain custom JavaScript.` : null)
      setUrlImportOpen(false)
      setUrlImportValue('')
      forceRefresh((n) => n + 1)
    } catch (err) {
      setUrlImportError(err instanceof ModuleLoadError ? err.message : String(err))
    } finally {
      setUrlImportBusy(false)
    }
  }

  const handleDeleteModule = (id: string) => {
    const spec = getSpecById(id)
    if (!spec) return
    const ok = window.confirm(`Delete "${spec.title}"? This cannot be undone.`)
    if (!ok) return
    deleteUserModuleSpec(id)
    if (selectedReport?.id === id) setSelectedReport(null)
    forceRefresh((n) => n + 1)
  }

  const handleCreateNew = () => {
    setEditingSpec(null)
    setBuilderOpen(true)
  }

  const handleEditModule = (id: string) => {
    const spec = getSpecById(id)
    if (!spec) return
    setEditingSpec(spec)
    setBuilderOpen(true)
  }

  const handleSaveModule = (spec: UserModuleSpec) => {
    if (editingSpec) {
      replaceUserModuleSpec(spec)
    } else {
      addUserModuleSpec(spec)
    }
    setBuilderOpen(false)
    setEditingSpec(null)
    forceRefresh((n) => n + 1)
  }

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
    const settings: SavedSettings = {
      encryptionMode: cacheConfig.encryptionMode,
      panelsOpen,
    }
    saveWorkbenchConfig({ version: 1, settings, moduleParams, savedAt: new Date().toISOString() })
    setSaveLabel('Saved!')
    setTimeout(() => setSaveLabel(null), 2500)
  }

  const activeData = showSamplePreview && selectedReport
    ? selectedReport.samplePreview
    : (selectedReport ? moduleDataCache[selectedReport.id] ?? null : null)

  const anyConfigPanelOpen =
    panelsOpen.api || (isConnected && (panelsOpen.cache || panelsOpen.encryption))

  const headerActions = (
    <>
      {isConnected && (
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

          <div className="w-px h-4 bg-white/20 mx-0.5" />
        </>
      )}

      <ThemeSwitcher />

      <button
        onClick={() => setBugReportOpen(true)}
        title="Report a bug"
        className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
        aria-label="Report a bug"
      >
        <BugIcon className="w-4 h-4 text-white/60 hover:text-white/90" />
      </button>

      <button
        onClick={() => setDisclaimerOpen(true)}
        title="View disclaimer"
        className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
        aria-label="View disclaimer"
      >
        <InfoIcon className="w-4 h-4 text-white/60 hover:text-white/90" />
      </button>
    </>
  )

  if (!disclaimerAccepted) {
    return <DisclaimerModal onAccept={() => setDisclaimerAccepted(true)} />
  }

  const bugContext: BugReportContext = {
    appVersion: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'unknown',
    mode: isMockMode ? 'mock' : getCacheMode() ? 'cache' : 'live',
    connected: isConnected,
    activeReport: selectedReport?.title ?? null,
  }

  return (
    <AppShell
      headerActions={headerActions}
      banner={<BugReportBanner onReport={() => setBugReportOpen(true)} />}
    >
      {disclaimerOpen && (
        <DisclaimerModal viewOnly onAccept={() => setDisclaimerOpen(false)} />
      )}
      {bugReportOpen && (
        <BugReportModal context={bugContext} onClose={() => setBugReportOpen(false)} />
      )}
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
          {isMockMode && (
            <div className="mb-4 px-4 py-2 bg-amber-100 border border-amber-300 rounded-lg text-amber-800 text-sm font-medium">
              Sample data mode — all reports use built-in fixture data. Open API Settings to switch to your live data.
            </div>
          )}

          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-heading font-semibold text-brand-navy">Reports</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setUrlImportOpen((v) => !v); setUrlImportError(null) }}
                  className="text-xs font-semibold text-gray-500 hover:text-brand-blue transition-colors"
                >
                  Import from URL ↗
                </button>
                <button
                  onClick={() => importInputRef.current?.click()}
                  className="text-xs font-semibold text-gray-500 hover:text-brand-blue transition-colors"
                >
                  Import file ↑
                </button>
              </div>
            </div>

            {urlImportOpen && (
              <div className="mb-3 flex flex-col gap-1.5 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-xs text-gray-500">Paste a URL to a <code>.rwce-module.json</code> file or a raw GitHub URL:</p>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={urlImportValue}
                    onChange={(e) => setUrlImportValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleImportFromUrl()}
                    placeholder="https://example.com/module.rwce-module.json"
                    className="flex-1 text-xs border border-gray-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-blue"
                    autoFocus
                  />
                  <button
                    onClick={handleImportFromUrl}
                    disabled={urlImportBusy || !urlImportValue.trim()}
                    className="text-xs font-semibold bg-brand-navy text-white rounded-md px-3 py-1.5 hover:bg-brand-navy-light disabled:opacity-40 transition-colors shrink-0"
                  >
                    {urlImportBusy ? 'Importing…' : 'Import'}
                  </button>
                  <button
                    onClick={() => { setUrlImportOpen(false); setUrlImportError(null) }}
                    className="text-xs text-gray-500 hover:text-gray-800 px-1"
                  >
                    ✕
                  </button>
                </div>
                {urlImportError && (
                  <p className="text-xs text-red-600 bg-red-50 rounded p-2">{urlImportError}</p>
                )}
              </div>
            )}

            {importWarning && (
              <div className="mb-3 px-4 py-2 bg-amber-100 border border-amber-300 rounded-lg text-amber-800 text-xs font-medium flex items-center justify-between">
                <span>{importWarning}</span>
                <button onClick={() => setImportWarning(null)} className="ml-3 text-amber-600 hover:text-amber-900">✕</button>
              </div>
            )}

            <input
              ref={importInputRef}
              type="file"
              accept=".json"
              multiple
              className="hidden"
              onChange={(e) => {
                handleImportFiles(e.target.files)
                e.target.value = ''
              }}
            />

            {builderOpen ? (
              <ReportBuilder
                initialSpec={editingSpec}
                programs={programs}
                onSave={handleSaveModule}
                onCancel={() => { setBuilderOpen(false); setEditingSpec(null) }}
              />
            ) : (
              <ReportSelector
                reports={availableReports}
                selectedId={selectedReport?.id ?? null}
                onSelect={handleSelectReport}
                onSelectPreview={handleSelectPreview}
                onSelectMyData={handleSelectMyData}
                moduleDataCache={moduleDataCache}
                onCreateNew={handleCreateNew}
                onExport={handleExportModule}
                onEdit={handleEditModule}
                onDelete={handleDeleteModule}
              />
            )}
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
