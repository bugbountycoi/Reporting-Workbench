import { API_CONFIG } from '../config/api'
import { setToken, getRefreshToken, isTokenExpired } from './store'
import { safeLog } from '../utils/redaction'

export interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
  scope: string
}

export function buildAuthUrl(clientId: string, state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: API_CONFIG.oauthRedirectUri,
    scope: API_CONFIG.defaultScopes,
    state,
  })
  return `${API_CONFIG.oauthAuthorizeUrl}?${params.toString()}`
}

export async function exchangeCode(
  code: string,
  clientId: string,
  clientSecret: string,
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: API_CONFIG.oauthRedirectUri,
    scope: API_CONFIG.defaultScopes,
  })

  const res = await fetch(API_CONFIG.oauthTokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) {
    const text = await res.text()
    safeLog('error', '[OAuth] Token exchange failed:', res.status, text)
    throw new Error(`OAuth token exchange failed: ${res.status}`)
  }

  const tokens = (await res.json()) as TokenResponse
  setToken(tokens.access_token, tokens.expires_in, tokens.refresh_token)
  return tokens
}

export async function refreshAccessToken(clientId: string, clientSecret: string): Promise<void> {
  const rt = getRefreshToken()
  if (!rt) throw new Error('No refresh token available')

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: rt,
  })

  const res = await fetch(API_CONFIG.oauthTokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) {
    safeLog('error', '[OAuth] Token refresh failed:', res.status)
    throw new Error(`Token refresh failed: ${res.status}`)
  }

  const tokens = (await res.json()) as TokenResponse
  setToken(tokens.access_token, tokens.expires_in, tokens.refresh_token)
}

let _refreshTimer: ReturnType<typeof setTimeout> | null = null
let _clientId = ''
let _clientSecret = ''

export function scheduleRefresh(clientId: string, clientSecret: string, expiresIn: number): void {
  _clientId = clientId
  _clientSecret = clientSecret
  if (_refreshTimer) clearTimeout(_refreshTimer)
  const refreshIn = Math.max((expiresIn - 300) * 1000, 60_000)
  _refreshTimer = setTimeout(async () => {
    if (isTokenExpired()) {
      try {
        await refreshAccessToken(_clientId, _clientSecret)
        scheduleRefresh(_clientId, _clientSecret, 3600)
      } catch {
        safeLog('warn', '[OAuth] Auto-refresh failed. User may need to re-authenticate.')
      }
    }
  }, refreshIn)
}

export function cancelRefreshSchedule(): void {
  if (_refreshTimer) {
    clearTimeout(_refreshTimer)
    _refreshTimer = null
  }
}
