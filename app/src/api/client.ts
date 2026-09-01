import { API_CONFIG } from '../config/api'
import { getToken } from '../auth/store'
import { safeLog } from '../utils/redaction'
import { ApiError, type ApiErrorModel } from './types'

const MAX_RETRIES = 2
const RATE_LIMIT_DELAY_MS = 10_000

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  retries = 0,
): Promise<T> {
  const token = getToken()
  const url = `${API_CONFIG.baseUrl}${path}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  safeLog('log', `[API] ${options.method ?? 'GET'} ${path}`)

  let response: Response
  try {
    response = await fetch(url, { ...options, headers })
  } catch (err) {
    throw new ApiError(0, null, `Network error: ${String(err)}`)
  }

  if (response.status === 429 && retries < MAX_RETRIES) {
    safeLog('warn', `[API] Rate limited. Retrying in ${RATE_LIMIT_DELAY_MS / 1000}s…`)
    await delay(RATE_LIMIT_DELAY_MS)
    return apiFetch<T>(path, options, retries + 1)
  }

  if (!response.ok) {
    let errorModel: ApiErrorModel | null = null
    try {
      errorModel = (await response.json()) as ApiErrorModel
    } catch {
      // ignore parse failure
    }

    const message = errorModel?.title ?? `HTTP ${response.status}`
    safeLog('error', `[API] Error ${response.status}: ${message}`)
    throw new ApiError(response.status, errorModel, message)
  }

  if (response.status === 204) return undefined as unknown as T

  return response.json() as Promise<T>
}

export async function apiGet<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  let fullPath = path
  if (params) {
    const query = Object.entries(params)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&')
    if (query) fullPath += `?${query}`
  }
  return apiFetch<T>(fullPath, { method: 'GET' })
}
