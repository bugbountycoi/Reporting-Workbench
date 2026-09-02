import { useState, useEffect } from 'react'
import { setToken, clearToken, enableLocalStorage, disableLocalStorage } from '../auth/store'
import { buildAuthUrl, exchangeCode, scheduleRefresh, cancelRefreshSchedule } from '../auth/oauth'
import { getPrograms } from '../api/endpoints/programs'
import { getMockMode, setMockMode, getCacheMode, setCacheMode, getActiveApiVersion, setActiveApiVersion } from '../config/api'
import { probeApiVersions, selectBestVersion, type VersionProbeResult } from '../api/versions'
import { requestCacheFolder, readFromCache, loadCacheIndex } from '../cache/manager'
import { cacheConfig } from '../cache/cacheConfig'
import { formatDistanceToNow } from 'date-fns'
import type { ProgramOverviewViewModel } from '../api/types'

type SourceMode = 'mock' | 'cache' | 'live'
type LiveStep = 'token' | 'oauth'

function submissionsUrl(p: ProgramOverviewViewModel) {
  return `https://app.intigriti.com/company/programs/${p.companyHandle}/${p.handle}/submissions`
}

function ProgramList({ programs }: { programs: ProgramOverviewViewModel[] }) {
  if (programs.length === 0) return null
  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <div className="bg-brand-near-white px-3 py-1.5 border-b border-gray-100 flex items-center justify-between">
        <span className="text-xs font-semibold text-brand-gray-dark uppercase tracking-wide">Programs</span>
        <span className="text-xs text-brand-gray-mid font-medium">{programs.length}</span>
      </div>
      <div className="max-h-48 overflow-y-auto divide-y divide-gray-50">
        {programs.map((p) => (
          <div key={p.id} className="flex items-center justify-between px-3 py-2">
            <span className="text-sm text-gray-800">{p.name}</span>
            {p.status?.value && (
              <a
                href={submissionsUrl(p)}
                target="_blank"
                rel="noopener noreferrer"
                title={`Open ${p.name} submissions dashboard`}
                className="text-xs text-brand-gray-mid bg-gray-100 hover:bg-brand-blue hover:text-white px-2 py-0.5 rounded-full ml-2 shrink-0 transition-colors cursor-pointer"
              >
                {p.status.value}
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

interface Props {
  onConnected: () => void
  isConnected: boolean
  programs: ProgramOverviewViewModel[]
  onClose?: () => void
}

export function ApiKeyPanel({ onConnected, isConnected, programs, onClose }: Props) {
  const [sourceMode, setSourceMode] = useState<SourceMode>(
    getMockMode() ? 'mock' : getCacheMode() ? 'cache' : 'live',
  )
  const [liveStep, setLiveStep] = useState<LiveStep>('token')
  const [bearerInput, setBearerInput] = useState('')
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [oauthState, setOauthState] = useState('')
  const [pendingClientId, setPendingClientId] = useState('')
  const [pendingClientSecret, setPendingClientSecret] = useState('')
  const [localStorageEnabled, setLocalStorageEnabled] = useState(false)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cacheAge, setCacheAge] = useState<string | null>(null)
  const [versionResults, setVersionResults] = useState<VersionProbeResult[] | null>(null)
  const [versionProbing, setVersionProbing] = useState(false)
  const [activeVersion, setLocalActiveVersion] = useState(getActiveApiVersion)

  useEffect(() => {
    const handler = async (e: Event) => {
      const { code, state } = (e as CustomEvent<{ code: string; state: string }>).detail
      if (state !== oauthState) return
      try {
        const tokens = await exchangeCode(code, pendingClientId, pendingClientSecret)
        scheduleRefresh(pendingClientId, pendingClientSecret, tokens.expires_in)
        await onConnected()
        startVersionProbe()
      } catch (err) {
        setError(String(err))
      }
    }
    window.addEventListener('oauth-callback', handler)
    return () => window.removeEventListener('oauth-callback', handler)
  }, [oauthState, pendingClientId, pendingClientSecret, onConnected])

  // Clicking a source button is the primary action:
  //   Mock  → connect immediately with fixture data
  //   Cache → open folder picker, connect if valid cache found
  //   Live  → show token form (user must enter credentials)
  // If already connected, switching modes reloads to ensure clean state.
  const handleSourceChange = async (mode: SourceMode) => {
    if (testing) return
    if (mode === sourceMode && !isConnected) return
    setError(null)
    setBearerInput('')

    if (isConnected) {
      setMockMode(false)
      setCacheMode(false)
      clearToken()
      cancelRefreshSchedule()
      disableLocalStorage()
      if (mode === 'mock') setMockMode(true)
      else if (mode === 'cache') setCacheMode(true)
      window.location.reload()
      return
    }

    const prevMode = sourceMode
    setSourceMode(mode)
    setLiveStep('token')

    if (mode === 'mock') {
      setTesting(true)
      try {
        setMockMode(true)
        await onConnected()
      } catch (e) {
        setError(String(e))
        setMockMode(false)
        setSourceMode(prevMode)
      } finally {
        setTesting(false)
      }
    } else if (mode === 'cache') {
      setTesting(true)
      try {
        await requestCacheFolder()
        const progs = await readFromCache<unknown[]>('programs', 'global')
        if (!progs || progs.length === 0) {
          throw new Error('No cached programs found in this folder. Connect via Live API first to populate the cache.')
        }
        const idx = await loadCacheIndex()
        setCacheAge(idx[0]?.fetchedAt ?? null)
        setCacheMode(true)
        await onConnected()
      } catch (e) {
        if ((e as Error).name === 'AbortError') {
          setSourceMode(prevMode) // user cancelled picker — revert
        } else {
          setError(String(e))
        }
      } finally {
        setTesting(false)
      }
    }
    // 'live': just shows the token form
  }

  const handleValidateToken = async () => {
    const token = bearerInput.trim()
    if (!token) return
    setTesting(true)
    setError(null)
    try {
      setToken(token)
      await getPrograms()
      setBearerInput('')
      await onConnected()
      startVersionProbe()
    } catch (e) {
      clearToken()
      setError(`Token validation failed: ${String(e)}`)
    } finally {
      setTesting(false)
    }
  }

  function startVersionProbe() {
    setVersionProbing(true)
    setVersionResults(null)
    probeApiVersions().then((results) => {
      setVersionResults(results)
      setVersionProbing(false)
      const best = selectBestVersion(results)
      if (best && best !== getActiveApiVersion()) {
        setActiveApiVersion(best)
        setLocalActiveVersion(best)
      }
    })
  }

  function handleVersionSwitch(v: string) {
    setActiveApiVersion(v)
    setLocalActiveVersion(v)
    window.location.reload()
  }

  const handleOAuthAuthorise = () => {
    if (!clientId.trim() || !clientSecret.trim()) return
    const state = Math.random().toString(36).slice(2)
    setOauthState(state)
    setPendingClientId(clientId.trim())
    setPendingClientSecret(clientSecret.trim())
    setClientId('')
    setClientSecret('')
    const url = buildAuthUrl(clientId.trim(), state)
    window.location.href = url
  }

  const handleClear = () => {
    setMockMode(false)
    setCacheMode(false)
    clearToken()
    cancelRefreshSchedule()
    disableLocalStorage()
    setLocalStorageEnabled(false)
    window.location.reload()
  }

  const handleLocalStorageToggle = (val: boolean) => {
    setLocalStorageEnabled(val)
    if (val) enableLocalStorage()
    else disableLocalStorage()
  }

  const connectedViaMock = isConnected && getMockMode()
  const connectedViaCache = isConnected && getCacheMode()
  const connectedViaLive = isConnected && !getMockMode() && !getCacheMode()

  const activeMode: SourceMode = connectedViaMock ? 'mock' : connectedViaCache ? 'cache' : connectedViaLive ? 'live' : sourceMode

  const SOURCE_LABELS: Record<SourceMode, string> = { mock: 'Mock Data', cache: 'Local Cache', live: 'Live API' }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm" data-no-print>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading font-semibold text-gray-900 text-base">Data Source</h2>
        {onClose && (
          <button onClick={onClose} className="text-xs text-brand-gray-mid hover:text-gray-700 transition-colors">
            Hide
          </button>
        )}
      </div>

      {/* Source selector — clicking is the action */}
      <div className="mb-4">
        <p className="text-xs text-brand-gray-mid mb-1.5 font-medium uppercase tracking-wide">Source</p>
        <div className="flex gap-2">
          {(['mock', 'cache', 'live'] as SourceMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => handleSourceChange(mode)}
              disabled={testing}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors disabled:opacity-50 ${
                activeMode === mode
                  ? 'bg-brand-navy text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {SOURCE_LABELS[mode]}
            </button>
          ))}
        </div>
      </div>

      {/* Connected states */}
      {connectedViaMock && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-green-700 text-sm font-semibold">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            Connected — sample data
            <button onClick={handleClear} className="text-xs text-brand-red hover:text-red-700 ml-3 font-normal">Disconnect</button>
          </div>
          <ProgramList programs={programs} />
        </div>
      )}

      {connectedViaCache && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-green-700 text-sm font-semibold">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            Connected — local cache
            <button onClick={handleClear} className="text-xs text-brand-red hover:text-red-700 ml-3 font-normal">Disconnect</button>
          </div>
          {cacheAge && (
            <p className="text-xs text-brand-gray-mid">
              Most recent data: {formatDistanceToNow(new Date(cacheAge), { addSuffix: true })}
            </p>
          )}
          <ProgramList programs={programs} />
        </div>
      )}

      {connectedViaLive && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-green-700 text-sm font-semibold">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            Connected
            <button onClick={handleClear} className="text-xs text-brand-red hover:text-red-700 ml-3 font-normal">Disconnect</button>
          </div>
          {!cacheConfig.folderSelected && (
            <p className="text-xs text-brand-gray-mid border border-dashed border-gray-200 rounded-lg p-2">
              Open <strong>Cache Folder</strong> settings to save fetched data locally for offline use.
            </p>
          )}
          <ProgramList programs={programs} />

          {/* API version status */}
          {versionProbing && (
            <p className="text-xs text-brand-gray-mid italic">Detecting API versions…</p>
          )}
          {!versionProbing && versionResults && (() => {
            const onlineSupported = versionResults.filter((r) => r.isOnline && r.isSupported)
            if (onlineSupported.length <= 1) {
              // Single option — no picker, just a status line
              return (
                <p className="text-xs text-brand-gray-mid">
                  API {activeVersion}
                  {versionResults.find((r) => r.version === activeVersion)?.latencyMs != null &&
                    ` · ${versionResults.find((r) => r.version === activeVersion)!.latencyMs}ms`}
                </p>
              )
            }
            // Multiple supported+online versions — show chips
            return (
              <div className="flex flex-wrap gap-1.5">
                {versionResults.map((r) => {
                  const isActive = r.version === activeVersion
                  const canSwitch = r.isOnline && r.isSupported && !isActive
                  const label = r.version + (r.latencyMs != null ? ` · ${r.latencyMs}ms` : '')
                  const suffix = !r.isOnline ? ' (offline)' : !r.isSupported ? ' (unsupported)' : ''
                  const base = 'px-2 py-0.5 rounded-full text-xs font-semibold transition-colors'
                  const style = isActive
                    ? `${base} bg-brand-navy text-white`
                    : canSwitch
                      ? `${base} bg-gray-100 text-gray-600 hover:bg-brand-blue hover:text-white cursor-pointer`
                      : `${base} bg-gray-50 text-gray-400 cursor-default`
                  return (
                    <button
                      key={r.version}
                      className={style}
                      disabled={!canSwitch}
                      onClick={() => canSwitch && handleVersionSwitch(r.version)}
                      title={isActive ? 'Active version' : canSwitch ? `Switch to ${r.version}` : undefined}
                    >
                      {label}{suffix}
                    </button>
                  )
                })}
              </div>
            )
          })()}
        </div>
      )}

      {/* Not-connected states */}
      {!isConnected && sourceMode === 'mock' && (
        <p className="text-xs text-brand-gray-mid">
          {testing ? 'Connecting to sample data…' : 'Built-in fixture data with 8 realistic programs. No account required.'}
        </p>
      )}

      {!isConnected && sourceMode === 'cache' && (
        <p className="text-xs text-brand-gray-mid">
          {testing ? 'Opening folder…' : 'Select a folder from a previous session. Run in Live API mode first to populate the cache.'}
        </p>
      )}

      {!isConnected && sourceMode === 'live' && (
        <div className="space-y-3">
          <p className="text-xs text-brand-gray-mid">
            An API token from your Intigriti admin panel is required to access your live data.{' '}
            <a
              href="https://kb.intigriti.com/en/articles/6117846-intigriti-api"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-blue hover:underline"
            >
              How to get an API key →
            </a>
          </p>

          {liveStep === 'token' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Bearer Token <span className="text-brand-red">*</span>
                </label>
                <input
                  type="password"
                  placeholder="Paste your token from Admin › Integrations › Intigriti API"
                  value={bearerInput}
                  onChange={(e) => setBearerInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleValidateToken()}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  autoComplete="off"
                  autoFocus
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleValidateToken}
                  disabled={testing || !bearerInput.trim()}
                  className="px-4 py-2 bg-brand-navy text-white rounded-lg text-sm font-semibold hover:bg-brand-navy-light disabled:opacity-50 transition-colors"
                >
                  {testing ? 'Validating…' : 'Validate & Connect'}
                </button>
                <button
                  onClick={() => setLiveStep('oauth')}
                  className="text-xs text-brand-gray-mid hover:text-brand-blue transition-colors"
                >
                  Use OAuth 2.0 instead →
                </button>
              </div>

              <div className="pt-1">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localStorageEnabled}
                    onChange={(e) => handleLocalStorageToggle(e.target.checked)}
                    className="mt-0.5 accent-brand-blue"
                  />
                  <div>
                    <span className="text-sm text-gray-700 font-semibold">Remember on this device</span>
                    <p className="text-xs text-brand-red mt-0.5">
                      Insecure: stores your token in browser localStorage. Do not enable on shared or untrusted devices.
                    </p>
                  </div>
                </label>
              </div>
            </>
          )}

          {liveStep === 'oauth' && (
            <>
              <input
                type="text"
                placeholder="Client ID"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                autoComplete="off"
              />
              <input
                type="password"
                placeholder="Client Secret"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                autoComplete="off"
              />
              <div className="flex items-center gap-3">
                <button
                  onClick={handleOAuthAuthorise}
                  disabled={!clientId.trim() || !clientSecret.trim()}
                  className="px-4 py-2 bg-brand-navy text-white rounded-lg text-sm font-semibold hover:bg-brand-navy-light disabled:opacity-50 transition-colors"
                >
                  Authorise with Intigriti →
                </button>
                <button
                  onClick={() => setLiveStep('token')}
                  className="text-xs text-brand-gray-mid hover:text-brand-blue transition-colors"
                >
                  ← Use Bearer Token instead
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-brand-red">
          {error}
        </div>
      )}
    </div>
  )
}
