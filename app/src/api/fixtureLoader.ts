// Lazy-loads fixture files from /public/fixtures/ on first call and caches in memory.
// Fixtures are never bundled by Vite — they are fetched as static assets.
// submissions is split into 3 parts (each ~11 MB) to stay under Cloudflare's
// 25 MB per-asset limit; they are fetched in parallel and merged transparently.

const _cache: Record<string, unknown[]> = {}

async function load<T>(name: string): Promise<T[]> {
  if (_cache[name]) return _cache[name] as T[]
  const res = await fetch(`/fixtures/${name}`)
  if (!res.ok) throw new Error(`Failed to load fixture ${name}: ${res.status}`)
  _cache[name] = await res.json()
  return _cache[name] as T[]
}

async function loadSubmissions<T>(): Promise<T[]> {
  const key = 'submissions'
  if (_cache[key]) return _cache[key] as T[]
  const parts = await Promise.all(
    [1, 2, 3].map(async (n) => {
      const name = `submissions.sample.part${n}.json`
      const res = await fetch(`/fixtures/${name}`)
      if (!res.ok) throw new Error(`Failed to load fixture ${name}: ${res.status}`)
      return res.json() as Promise<T[]>
    }),
  )
  _cache[key] = parts.flat()
  return _cache[key] as T[]
}

export const fixture = {
  programs:       () => load<unknown>('programs.sample.json'),
  submissions:    () => loadSubmissions<unknown>(),
  payouts:        () => load<unknown>('payouts.sample.json'),
  rewardRequests: () => load<unknown>('rewardRequests.sample.json'),
}
