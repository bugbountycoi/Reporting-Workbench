// Lazy-loads fixture files from /public/fixtures/ on first call and caches in memory.
// Fixtures are never bundled by Vite — they are fetched as static assets.

const _cache: Record<string, unknown[]> = {}

async function load<T>(name: string): Promise<T[]> {
  if (_cache[name]) return _cache[name] as T[]
  const res = await fetch(`/fixtures/${name}`)
  if (!res.ok) throw new Error(`Failed to load fixture ${name}: ${res.status}`)
  _cache[name] = await res.json()
  return _cache[name] as T[]
}

export const fixture = {
  programs:       () => load<unknown>('programs.sample.json'),
  submissions:    () => load<unknown>('submissions.sample.json'),
  payouts:        () => load<unknown>('payouts.sample.json'),
  rewardRequests: () => load<unknown>('rewardRequests.sample.json'),
}
