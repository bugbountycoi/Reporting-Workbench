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

function toBase64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

// Generates a PKCE verifier/challenge pair (RFC 7636, S256 method).
// Eliminates the need for a client_secret in the browser: the verifier
// is single-use and has no value without the matching authorization code.
export async function generatePKCE(): Promise<{ verifier: string; challenge: string }> {
  const verifierBytes = new Uint8Array(64)
  crypto.getRandomValues(verifierBytes)
  const verifier = toBase64url(verifierBytes)
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  const challenge = toBase64url(new Uint8Array(digest))
  return { verifier, challenge }
}

export function buildAuthUrl(clientId: string, state: string, codeChallenge: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: API_CONFIG.oauthRedirectUri,
    scope: API_CONFIG.defaultScopes,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })
  return `${API_CONFIG.oauthAuthorizeUrl}?${params.toString()}`
}

export async function exchangeCode(
  code: string,
  clientId: string,
  codeVerifier: string,
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    code_verifier: codeVerifier,
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

// Public PKCE clients send no client_secret on refresh — the refresh token
// itself is the credential. If the server rejects this, refresh silently
// fails and the user re-authenticates on the next request.
export async function refreshAccessToken(clientId: string): Promise<void> {
  const rt = getRefreshToken()
  if (!rt) throw new Error('No refresh token available')

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
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

export function scheduleRefresh(clientId: string, expiresIn: number): void {
  _clientId = clientId
  if (_refreshTimer) clearTimeout(_refreshTimer)
  const refreshIn = Math.max((expiresIn - 300) * 1000, 60_000)
  _refreshTimer = setTimeout(async () => {
    if (isTokenExpired()) {
      try {
        await refreshAccessToken(_clientId)
        scheduleRefresh(_clientId, 3600)
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
