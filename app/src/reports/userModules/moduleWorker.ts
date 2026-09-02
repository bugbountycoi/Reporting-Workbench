/**
 * Web Worker for executing custom module JavaScript in an isolated scope.
 * Workers have no access to the parent page's localStorage, sessionStorage,
 * cookies, or DOM — so custom transform/summaryFormatter code cannot read
 * stored credentials even if authored maliciously.
 */
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

interface WorkerMessage {
  id: string
  type: 'transform' | 'summaryFormatter'
  body: string
  args: unknown[]
}

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const { id, type, body, args } = e.data
  try {
    let result: unknown
    if (type === 'transform') {
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
