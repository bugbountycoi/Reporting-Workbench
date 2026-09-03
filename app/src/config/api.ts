const MOCK_STORAGE_KEY = 'wb_mock_mode'
const CACHE_STORAGE_KEY = 'wb_cache_mode'

// Initialise from localStorage first; VITE_MOCK_MODE env var acts as a dev shortcut
// (won't persist to localStorage — the user must connect via the UI to persist)
let _mockMode: boolean = localStorage.getItem(MOCK_STORAGE_KEY) === 'true'
if (import.meta.env.VITE_MOCK_MODE === 'true') _mockMode = true

let _cacheMode: boolean = localStorage.getItem(CACHE_STORAGE_KEY) === 'true'

export function getMockMode(): boolean { return _mockMode }
export function getCacheMode(): boolean { return _cacheMode }

export function setMockMode(val: boolean): void {
  _mockMode = val
  if (val) { localStorage.setItem(MOCK_STORAGE_KEY, 'true'); setCacheMode(false) }
  else localStorage.removeItem(MOCK_STORAGE_KEY)
}

export function setCacheMode(val: boolean): void {
  _cacheMode = val
  if (val) { localStorage.setItem(CACHE_STORAGE_KEY, 'true'); setMockMode(false) }
  else localStorage.removeItem(CACHE_STORAGE_KEY)
}

// ---------------------------------------------------------------------------
// API version management
// ---------------------------------------------------------------------------

const VERSION_STORAGE_KEY = 'wb_api_version'

/** Versions the app's endpoint code is written and tested against. */
export const APP_SUPPORTED_VERSIONS = new Set(['v2'])

/** All versions probed at connect time — includes unsupported ones for visibility. */
export const KNOWN_API_VERSIONS = ['v1', 'v2'] as const

const _knownVersionSet = new Set<string>(KNOWN_API_VERSIONS)
const _rawVersion = localStorage.getItem(VERSION_STORAGE_KEY)
let _activeVersion: string = (_rawVersion && _knownVersionSet.has(_rawVersion)) ? _rawVersion : 'v2'

export function getActiveApiVersion(): string { return _activeVersion }

export function setActiveApiVersion(v: string): void {
  if (!_knownVersionSet.has(v)) return
  _activeVersion = v
  localStorage.setItem(VERSION_STORAGE_KEY, v)
}

/** Returns the base URL for the currently active platform + API version. Read by api/client.ts. */
export function getApiBaseUrl(): string {
  // Read active platform from localStorage directly to avoid circular imports.
  // platforms/store.ts uses the same key 'wb_active_platform'.
  let platform = 'intigriti'
  try {
    const stored = localStorage.getItem('wb_active_platform')
    if (stored === 'hackerone' || stored === 'bugcrowd' || stored === 'intigriti') {
      platform = stored
    }
  } catch { /* localStorage unavailable */ }

  if (platform === 'hackerone') return '/h1-api'
  if (platform === 'bugcrowd') return '/bc-api'
  return `/intigriti-api/${_activeVersion}`
}

// ---------------------------------------------------------------------------

export const API_CONFIG = {
  // Vite dev proxy rewrites /intigriti-api/* → https://api.intigriti.com/external/company/*
  baseUrl: '/intigriti-api/v2',
  authBaseUrl: 'https://login.intigriti.com',
  oauthAuthorizeUrl: 'https://login.intigriti.com/connect/authorize',
  oauthTokenUrl: '/oauth/token',
  oauthRedirectUri: `${window.location.origin}/oauth/callback`,
  defaultScopes: 'company_external_api core_platform:read offline_access',
} as const
