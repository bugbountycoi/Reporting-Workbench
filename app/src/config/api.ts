const MOCK_STORAGE_KEY = 'inti_mock_mode'
const CACHE_STORAGE_KEY = 'inti_cache_mode'

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

export const API_CONFIG = {
  // Vite dev proxy rewrites /api/* → https://api.intigriti.com/external/company/*
  baseUrl: '/api/v2',
  authBaseUrl: 'https://login.intigriti.com',
  oauthAuthorizeUrl: 'https://login.intigriti.com/connect/authorize',
  oauthTokenUrl: 'https://login.intigriti.com/connect/token',
  oauthRedirectUri: `${window.location.origin}/oauth/callback`,
  defaultScopes: 'company_external_api core_platform:read reward_system:read offline_access',
} as const
