import { useState, useEffect } from 'react'
import { setToken, clearToken, enableLocalStorage, disableLocalStorage } from '../auth/store'
import { buildAuthUrl, exchangeCode, scheduleRefresh, cancelRefreshSchedule } from '../auth/oauth'
import { getPrograms } from '../api/endpoints/programs'
import type { ProgramOverviewViewModel } from '../api/types'

type AuthMode = 'bearer' | 'oauth'

interface Props {
  onConnected: () => void
  isConnected: boolean
  programs: ProgramOverviewViewModel[]
}

export function ApiKeyPanel({ onConnected, isConnected, programs }: Props) {
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
  const [collapsed, setCollapsed] = useState(false)

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

  if (isConnected && collapsed) {
    return (
      <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="w-2 h-2 rounded-full bg-green-500" />
        <span className="text-sm text-green-800 font-semibold">Connected to Intigriti API</span>
        <span className="text-xs text-green-600">· {programs.length} program{programs.length !== 1 ? 's' : ''} accessible</span>
        <button onClick={() => setCollapsed(false)} className="ml-auto text-xs text-brand-gray-mid hover:text-gray-700 underline">Edit</button>
        <button onClick={handleClear} className="text-xs text-brand-red hover:text-red-700">Disconnect</button>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm" data-no-print>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading font-semibold text-gray-900 text-base">API Connection</h2>
        {isConnected && (
          <button onClick={() => setCollapsed(true)} className="text-xs text-brand-gray-mid hover:text-gray-600">Collapse</button>
        )}
      </div>

      {!isConnected && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
          API data and local cache files may contain sensitive vulnerability and program information. Do not share exported data or cache files without review.
        </div>
      )}

      {/* Auth mode toggle */}
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
          {!isConnected ? (
            <>
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
            </>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-green-700 text-sm">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                Connected · {programs.length} program{programs.length !== 1 ? 's' : ''} accessible
              </div>
              <button onClick={handleClear} className="text-xs text-brand-red hover:text-red-700 ml-4">Disconnect</button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-brand-gray-mid">
            Enter your OAuth client credentials from Admin › Integrations › Intigriti API. You will be redirected to Intigriti to authorise.
          </p>
          {!isConnected ? (
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
              <button
                onClick={handleOAuthAuthorise}
                disabled={!clientId.trim() || !clientSecret.trim()}
                className="px-4 py-2 bg-brand-navy text-white rounded-lg text-sm font-semibold hover:bg-brand-navy-light disabled:opacity-50 transition-colors"
              >
                Authorise with Intigriti →
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-green-700 text-sm">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                Connected via OAuth · {programs.length} program{programs.length !== 1 ? 's' : ''} accessible
              </div>
              <button onClick={handleClear} className="text-xs text-brand-red hover:text-red-700 ml-4">Disconnect</button>
            </div>
          )}
        </div>
      )}

      {/* Remember on device */}
      {!isConnected && (
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
      )}

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-brand-red">
          {error}
        </div>
      )}
    </div>
  )
}
