export type Interval = 'day' | 'week' | 'month' | 'quarter' | 'year'

export const INTERVAL_OPTIONS = [
  { value: 'day' as Interval, label: 'Day' },
  { value: 'week' as Interval, label: 'Week' },
  { value: 'month' as Interval, label: 'Month' },
  { value: 'quarter' as Interval, label: 'Quarter' },
  { value: 'year' as Interval, label: 'Year' },
]

function p2(n: number) {
  return String(n).padStart(2, '0')
}

function isoWeekKey(d: Date): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${date.getUTCFullYear()}-W${p2(week)}`
}

export function bucketKey(ts: number, interval: Interval): string {
  const d = new Date(ts * 1000)
  const y = d.getUTCFullYear()
  const mo = d.getUTCMonth() + 1
  switch (interval) {
    case 'day':     return `${y}-${p2(mo)}-${p2(d.getUTCDate())}`
    case 'week':    return isoWeekKey(d)
    case 'month':   return `${y}-${p2(mo)}`
    case 'quarter': return `${y}-Q${Math.ceil(mo / 3)}`
    case 'year':    return `${y}`
  }
}

// Returns every unique bucket key that falls within [startDate, endDate] inclusive.
// Iterates day-by-day to correctly handle week/month/quarter/year boundaries.
export function allBuckets(startDate: string, endDate: string, interval: Interval): string[] {
  const keys: string[] = []
  const seen = new Set<string>()
  const cur = new Date(`${startDate}T00:00:00Z`)
  const end = new Date(`${endDate}T23:59:59Z`)
  while (cur <= end) {
    const key = bucketKey(Math.floor(cur.getTime() / 1000), interval)
    if (!seen.has(key)) {
      seen.add(key)
      keys.push(key)
    }
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return keys
}
