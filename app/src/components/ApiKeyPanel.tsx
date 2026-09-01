import { useState, useEffect } from 'react'
import { setToken, clearToken, enableLocalStorage, disableLocalStorage } from '../auth/store'
import { buildAuthUrl, exchangeCode, scheduleRefresh, cancelRefreshSchedule } from '../auth/oauth'
import { getPrograms } from '../api/endpoints/programs'
import { getMockMode, setMockMode } from '../config/api'
import type { ProgramOverviewViewModel } from '../api/types'

type AuthMode = 'bearer' | 'oauth'
type SourceMode = 'mock' | 'live'

function submissionsUrl(p: ProgramOverviewViewModel) {
  return `https://app.intigriti.com/company/programs/${p.companyHandle}/${p.handle}/submissions`
}

function ProgramList({ programs }: { programs: ProgramOverviewViewModel[] }) {
  if (programs.length === 0) return null
  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <div className="bg-brand-near-white px-3 py-1.5 border-b border-gray-100 flex items-center justify-between">
        <span className="text-xs font-semibold text-brand-gray-dark uppercase tracking-wide">
          Accessible Programs
        </span>
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
  const [sourceMode, setSourceMode] = useState<SourceMode>(getMockMode() ? 'mock' : 'live')
  const [authMode, setAuthMode] = useState<AuthMode>('bearer')
  const [bearerInput, setBearerInput] = useState('')
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [oauthState, setOauthState] = useState('')
  const [pendingClientId, setPendingClientId] = useState('')
  const [pendingClientSecret, setPendingClientSecret] = useState('')
  const [localStorageEnabled, setLocalStorageEnabled] = useState(false)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handler = async (e: Event) => {
      const { code, state } = (e as CustomEvent<{ code: string; state: string }>).detail
      if (state !== oauthState) return
      try {
        const tokens = await exchangeCode(code, pendingClientId, pendingClientSecret)
        scheduleRefresh(pendingClientId, pendingClientSecret, tokens.expires_in)
        await onConnected()
      } catch (err) {
        setError(String(err))
      }
    }
    window.addEventListener('oauth-callback', handler)
    return () => window.removeEventListener('oauth-callback', handler)
  }, [oauthState, pendingClientId, pendingClientSecret, onConnected])

  const handleSourceChange = (mode: SourceMode) => {
    if (mode === sourceMode) return
    setError(null)

    if (mode === 'live') {
      setMockMode(false) // clear saved mock preference
      if (isConnected) {
        // Already connected in mock mode — disconnect and reload to live setup
        clearToken()
        cancelRefreshSchedule()
        disableLocalStorage()
        window.location.reload()
        return
      }
    } else {
      // Switching to mock while connected in live mode — disconnect and re-connect as mock
      if (isConnected) {
        setMockMode(true)
        clearToken()
        cancelRefreshSchedule()
        disableLocalStorage()
        window.location.reload()
        return
      }
    }

    setSourceMode(mode)
  }

  const handleUseMock = async () => {
    setMockMode(true)
    setTesting(true)
    setError(null)
    try {
      await onConnected()
    } catch (e) {
      setError(String(e))
      setMockMode(false)
    } finally {
      setTesting(false)
    }
  }

  const handleTestBearer = async () => {
    if (!bearerInput.trim()) return
    setTesting(true)
    setError(null)
    try {
      setToken(bearerInput.trim())
      await getPrograms()
      setBearerInput('')
      await onConnected()
    } catch (e) {
      clearToken()
      setError(`Connection failed: ${String(e)}`)
    } finally {
      setTesting(false)
    }
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
  const connectedViaLive = isConnected && !getMockMode()

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm" data-no-print>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading font-semibold text-gray-900 text-base">API Connection</h2>
        {onClose && (
          <button
            onClick={onClose}
            title="Dismiss panel"
            className="text-brand-gray-mid hover:text-gray-700 transition-colors p-1 -mr-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Data source toggle */}
      <div className="mb-4">
        <p className="text-xs text-brand-gray-mid mb-1.5 font-medium uppercase tracking-wide">Data Source</p>
        <div className="flex gap-2">
          {(['mock', 'live'] as SourceMode[]).map((mode) => {
            const active = isConnected ? (mode === 'mock' ? connectedViaMock : connectedViaLive) : sourceMode === mode
            return (
              <button
                key={mode}
                onClick={() => handleSourceChange(mode)}
                className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-brand-navy text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {mode === 'mock' ? 'Mock Data' : 'Live API'}
              </button>
            )
          })}
        </div>
      </div>

      {/* Mock data section */}
      {(sourceMode === 'mock' && !isConnected) && (
        <div className="space-y-3">
          <p className="text-xs text-brand-gray-mid">
            Use built-in sample reports with realistic fixture data. No API key or Intigriti account required.
          </p>
          <button
            onClick={handleUseMock}
            disabled={testing}
            className="px-4 py-2 bg-brand-navy text-white rounded-lg text-sm font-semibold hover:bg-brand-navy-light disabled:opacity-50 transition-colors"
          >
            {testing ? 'Connecting…' : 'Use Sample Data →'}
          </button>
        </div>
      )}

      {connectedViaMock && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-green-700 text-sm font-semibold">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            Connected — sample data
          </div>
          <button onClick={handleClear} className="text-xs text-brand-red hover:text-red-700 ml-4">Disconnect</button>
        </div>
      )}

      {/* Live API section */}
      {(sourceMode === 'live' && !isConnected) && (
        <>
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            API data and local cache files may contain sensitive vulnerability and program information. Do not share exported data or cache files without review.
          </div>

          <div className="flex gap-2 mb-4">
            {(['bearer', 'oauth'] as AuthMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setAuthMode(mode)}
                className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                  authMode === mode
                    ? 'bg-brand-navy text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {mode === 'bearer' ? 'Bearer Token' : 'OAuth 2.0'}
              </button>
            ))}
          </div>

          {authMode === 'bearer' ? (
            <div className="space-y-3">
              <p className="text-xs text-brand-gray-mid">
                Generate a non-expiring access token in the Intigriti admin panel (Admin › Integrations › Intigriti API) and paste it below.
              </p>
              <input
                type="password"
                placeholder="Paste your Bearer token"
                value={bearerInput}
                onChange={(e) => setBearerInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTestBearer()}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                autoComplete="off"
              />
              <button
                onClick={handleTestBearer}
                disabled={testing || !bearerInput.trim()}
                className="px-4 py-2 bg-brand-navy text-white rounded-lg text-sm font-semibold hover:bg-brand-navy-light disabled:opacity-50 transition-colors"
              >
                {testing ? 'Testing…' : 'Test & Connect'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-brand-gray-mid">
                Enter your OAuth client credentials from Admin › Integrations › Intigriti API. You will be redirected to Intigriti to authorise.
              </p>
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
              <button
                onClick={handleOAuthAuthorise}
                disabled={!clientId.trim() || !clientSecret.trim()}
                className="px-4 py-2 bg-brand-navy text-white rounded-lg text-sm font-semibold hover:bg-brand-navy-light disabled:opacity-50 transition-colors"
              >
                Authorise with Intigriti →
              </button>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-gray-100">
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

      {connectedViaLive && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center gap-2 text-green-700 text-sm font-semibold">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              {authMode === 'oauth' ? 'Connected via OAuth' : 'Connected'}
            </div>
            <button onClick={handleClear} className="text-xs text-brand-red hover:text-red-700 ml-4">Disconnect</button>
          </div>
          <ProgramList programs={programs} />
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
