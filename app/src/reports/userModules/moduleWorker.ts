/**
 * Web Worker for executing custom module JavaScript in an isolated scope.
 * Workers have no access to the parent page's localStorage, sessionStorage,
 * cookies, or DOM — so custom code cannot read stored credentials even if
 * authored maliciously.
 *
 * Handles three job types:
 *   transform         — user's transform(raw, params, programs, ctx) body
 *   summaryFormatter  — user's summaryFormatter(data) body
 *   fetchData         — user's fetchData(params, ctx) body
 *
 * fetchData is also isolated here (not in the main thread) so that it has no
 * access to localStorage/sessionStorage/fetch. API calls are proxied back to
 * the main thread via postMessage using an explicit allow-list.
 *
 * Network access is explicitly revoked below so user code executed via
 * new Function() cannot exfiltrate report data to arbitrary servers.
 */

// Revoke all direct network access. new Function() bodies resolve fetch/XHR
// via the global scope (self), so nullifying them here prevents user code from
// bypassing the API proxy bridge. Must run before any user code executes.
;(self as unknown as Record<string, unknown>).fetch = undefined
;(self as unknown as Record<string, unknown>).XMLHttpRequest = undefined

import { bucketKey, allBuckets, INTERVAL_OPTIONS } from '../../utils/intervals'
import { daysBetween } from '../../utils/dates'
import { BRAND_COMPARE_COLORS } from '../../themes/brandColors'
import type { TransformCtx } from './types'

type Interval = Parameters<typeof bucketKey>[1]

const TRANSFORM_CTX: TransformCtx = {
  bucketKey: (ts, interval) => bucketKey(ts, interval as Interval),
  allBuckets: (start, end, interval) => allBuckets(start, end, interval as Interval),
  daysBetween,
  COMPARE_COLORS: BRAND_COMPARE_COLORS,
  INTERVAL_OPTIONS,
}

// ---------------------------------------------------------------------------
// API proxy — routes ctx.* calls back to the main thread
// ---------------------------------------------------------------------------

type AllowedMethod =
  | 'getProgramSubmissions'
  | 'getAllPayouts'
  | 'getProgramDetail'
  | 'getPrograms'
  | 'getSubmissions'
  | 'getPayouts'

const pendingApiRequests = new Map<string, {
  resolve: (value: unknown) => void
  reject: (reason: Error) => void
}>()

function apiProxy(method: AllowedMethod, args: unknown[]): Promise<unknown> {
  const reqBytes = new Uint8Array(8)
  crypto.getRandomValues(reqBytes)
  const requestId = Array.from(reqBytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return new Promise<unknown>((resolve, reject) => {
    pendingApiRequests.set(requestId, { resolve, reject })
    self.postMessage({ type: 'apiRequest', requestId, method, args })
  })
}

const FETCH_CTX = {
  // ── Intigriti-specific (legacy) ────────────────────────────────────────────
  getProgramSubmissions: (id: string) => apiProxy('getProgramSubmissions', [id]),
  getAllPayouts: () => apiProxy('getAllPayouts', []),
  getProgramDetail: (id: string) => apiProxy('getProgramDetail', [id]),
  // ── Canonical (cross-platform) ─────────────────────────────────────────────
  getPrograms: () => apiProxy('getPrograms', []),
  getSubmissions: (programId: string) => apiProxy('getSubmissions', [programId]),
  getPayouts: () => apiProxy('getPayouts', []),
}

// ---------------------------------------------------------------------------
// Message types
// ---------------------------------------------------------------------------

interface ApiResponseMessage {
  type: 'apiResponse'
  requestId: string
  ok: boolean
  result?: unknown
  error?: string
}

interface JobMessage {
  id: string
  type: 'transform' | 'summaryFormatter' | 'fetchData'
  body: string
  args: unknown[]
}

// ---------------------------------------------------------------------------
// Message handler
// ---------------------------------------------------------------------------

self.onmessage = async (e: MessageEvent<ApiResponseMessage | JobMessage>) => {
  const msg = e.data

  // Route API response to the pending proxy promise
  if (msg.type === 'apiResponse') {
    const pending = pendingApiRequests.get(msg.requestId)
    if (pending) {
      pendingApiRequests.delete(msg.requestId)
      if (msg.ok) pending.resolve(msg.result)
      else pending.reject(new Error(msg.error))
    }
    return
  }

  const { id, type, body, args } = msg as JobMessage
  try {
    let result: unknown
    if (type === 'fetchData') {
      const [params] = args
      const fn = new Function('params', 'ctx', `return (async function() {\n${body}\n})()`)
      result = await (fn(params, FETCH_CTX) as Promise<unknown>)
    } else if (type === 'transform') {
      const [raw, params, programs] = args
      const fn = new Function('raw', 'params', 'programs', 'ctx', body)
      result = fn(raw, params, programs, TRANSFORM_CTX)
    } else {
      const [data] = args
      const fn = new Function('data', body)
      result = String(fn(data))
    }
    self.postMessage({ id, ok: true, result })
  } catch (err) {
    self.postMessage({ id, ok: false, error: String(err) })
  }
}
