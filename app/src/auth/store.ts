const STORAGE_KEY = 'intigriti_workbench_token'

let _token: string | null = null
let _refreshToken: string | null = null
let _expiresAt: number | null = null
let _useLocalStorage = false

export function setToken(token: string, expiresIn?: number, refreshToken?: string): void {
  _token = token
  _refreshToken = refreshToken ?? null
  _expiresAt = expiresIn ? Date.now() + expiresIn * 1000 : null
  if (_useLocalStorage) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, refreshToken, expiresAt: _expiresAt }))
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
  return Date.now() >= _expiresAt - 60_000 // treat as expired 1 min early
}

export function clearToken(): void {
  _token = null
  _refreshToken = null
  _expiresAt = null
  if (_useLocalStorage) {
    localStorage.removeItem(STORAGE_KEY)
  }
}

export function enableLocalStorage(): void {
  _useLocalStorage = true
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    try {
      const stored = JSON.parse(raw) as { token: string; refreshToken?: string; expiresAt?: number }
      _token = stored.token
      _refreshToken = stored.refreshToken ?? null
      _expiresAt = stored.expiresAt ?? null
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
  }
}

export function disableLocalStorage(): void {
  _useLocalStorage = false
  localStorage.removeItem(STORAGE_KEY)
}

export function isLocalStorageEnabled(): boolean {
  return _useLocalStorage
}
