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

// For confidential clients (client_secret flow) — no PKCE challenge needed.
export function buildAuthUrlWithSecret(clientId: string, state: string): string {
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

export async function exchangeCodeWithSecret(
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

// PKCE sessions send no client_secret on refresh (the refresh token is the credential).
// Client-secret sessions include the secret stored in sessionStorage under
// 'wb_oauth_client_secret' — it is session-scoped and cleared on disconnect.
export async function refreshAccessToken(clientId: string): Promise<number> {
  const rt = getRefreshToken()
  if (!rt) throw new Error('No refresh token available')

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    refresh_token: rt,
  })
  const clientSecret = sessionStorage.getItem('wb_oauth_client_secret')
  if (clientSecret) body.set('client_secret', clientSecret)

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
  return tokens.expires_in
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
        const expiresIn = await refreshAccessToken(_clientId)
        scheduleRefresh(_clientId, expiresIn)
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

// ---------------------------------------------------------------------------
// OAuth callback bridge — avoids window.CustomEvent (interceptable by extensions)
// ---------------------------------------------------------------------------

type OAuthCallbackFn = (code: string, state: string) => void
let _oauthCallbackHandler: OAuthCallbackFn | null = null

export function registerOAuthCallbackHandler(fn: OAuthCallbackFn): () => void {
  _oauthCallbackHandler = fn
  return () => { if (_oauthCallbackHandler === fn) _oauthCallbackHandler = null }
}

export function invokeOAuthCallback(code: string, state: string): void {
  const handler = _oauthCallbackHandler
  _oauthCallbackHandler = null
  handler?.(code, state)
}
