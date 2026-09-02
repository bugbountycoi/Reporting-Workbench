export const TOKEN_STORAGE_KEY = 'intigriti_workbench_token'
// AES-GCM key lives in sessionStorage: cleared when the tab closes so
// stored ciphertext is automatically undecryptable in a new browser session.
const SESSION_EK = 'inti_wb_ek'

let _token: string | null = null
let _refreshToken: string | null = null
let _expiresAt: number | null = null
let _useLocalStorage = false

// ---------------------------------------------------------------------------
// AES-GCM helpers
// ---------------------------------------------------------------------------

function toB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  return btoa(String.fromCharCode(...bytes))
}

function fromB64(s: string): Uint8Array<ArrayBuffer> {
  const binary = atob(s)
  const buf = new ArrayBuffer(binary.length)
  const view = new Uint8Array(buf)
  for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i)
  return view
}

async function getOrCreateKey(): Promise<CryptoKey> {
  const stored = sessionStorage.getItem(SESSION_EK)
  if (stored) {
    return crypto.subtle.importKey('raw', fromB64(stored), 'AES-GCM', false, ['encrypt', 'decrypt'])
  }
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
  sessionStorage.setItem(SESSION_EK, toB64(await crypto.subtle.exportKey('raw', key)))
  return key
}

async function encryptToStorage(token: string, expiresAt: number | null): Promise<void> {
  try {
    const key = await getOrCreateKey()
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const ct = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      new TextEncoder().encode(JSON.stringify({ token, expiresAt })),
    )
    const blob = new Uint8Array(12 + ct.byteLength)
    blob.set(iv)
    blob.set(new Uint8Array(ct), 12)
    localStorage.setItem(TOKEN_STORAGE_KEY, toB64(blob))
  } catch {
    // Silent — token is still in memory
  }
}

async function decryptFromStorage(): Promise<{ token: string; expiresAt: number | null } | null> {
  try {
    const ekRaw = sessionStorage.getItem(SESSION_EK)
    if (!ekRaw) return null
    const raw = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!raw) return null
    const blob = fromB64(raw)
    const key = await crypto.subtle.importKey('raw', fromB64(ekRaw), 'AES-GCM', false, ['decrypt'])
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: blob.slice(0, 12) }, key, blob.slice(12))
    return JSON.parse(new TextDecoder().decode(pt)) as { token: string; expiresAt: number | null }
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function setToken(token: string, expiresIn?: number, refreshToken?: string): void {
  _token = token
  _refreshToken = refreshToken ?? null
  _expiresAt = expiresIn ? Date.now() + expiresIn * 1000 : null
  if (_useLocalStorage) {
    // Refresh token intentionally not persisted — access token only.
    void encryptToStorage(token, _expiresAt)
  }
}

export function getToken(): string | null {
  return _token
}

export function getRefreshToken(): string | null {
  return _refreshToken
}

export function getExpiresAt(): number | null {
  return _expiresAt
}

export function isTokenExpired(): boolean {
  if (!_expiresAt) return false
  return Date.now() >= _expiresAt - 60_000
}

export function clearToken(): void {
  _token = null
  _refreshToken = null
  _expiresAt = null
  if (_useLocalStorage) {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    sessionStorage.removeItem(SESSION_EK)
  }
}

export async function enableLocalStorage(): Promise<void> {
  _useLocalStorage = true
  // Restore a previously persisted token when no active token is in memory.
  if (!_token) {
    const payload = await decryptFromStorage()
    if (payload) {
      _token = payload.token
      _expiresAt = payload.expiresAt
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY) // New session — stale ciphertext is unusable
    }
  }
  // Persist whatever token is now in memory (covers both "checked before auth" and "after").
  if (_token) {
    void encryptToStorage(_token, _expiresAt)
  }
}

export function disableLocalStorage(): void {
  _useLocalStorage = false
  localStorage.removeItem(TOKEN_STORAGE_KEY)
  sessionStorage.removeItem(SESSION_EK)
}

export function isLocalStorageEnabled(): boolean {
  return _useLocalStorage
}
