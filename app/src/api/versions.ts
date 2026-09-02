import { KNOWN_API_VERSIONS, APP_SUPPORTED_VERSIONS } from '../config/api'
import { getToken } from '../auth/store'

export interface VersionProbeResult {
  version: string
  isOnline: boolean
  isSupported: boolean
  latencyMs: number | null
}

/**
 * Probes each known API version in parallel to discover which are online.
 * "Online" = the server responds with any non-404, non-5xx status.
 * Does not block the main connection flow — call this after onConnected().
 */
export async function probeApiVersions(): Promise<VersionProbeResult[]> {
  const token = getToken()

  const probes = KNOWN_API_VERSIONS.map(async (version): Promise<VersionProbeResult> => {
    const start = Date.now()
    try {
      const headers: Record<string, string> = { Accept: 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch(`/api/${version}/programs`, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(8000),
      })

      const latencyMs = Date.now() - start
      // 404 = version path not found; 5xx = server error — both treated as offline
      const isOnline = res.status !== 404 && res.status < 500

      return {
        version,
        isOnline,
        isSupported: APP_SUPPORTED_VERSIONS.has(version),
        latencyMs: isOnline ? latencyMs : null,
      }
    } catch {
      return {
        version,
        isOnline: false,
        isSupported: APP_SUPPORTED_VERSIONS.has(version),
        latencyMs: null,
      }
    }
  })

  return Promise.all(probes)
}

/**
 * Returns the highest-versioned entry that is both online and supported,
 * or null if none qualify.
 */
export function selectBestVersion(results: VersionProbeResult[]): string | null {
  const candidates = results
    .filter((r) => r.isOnline && r.isSupported)
    .sort((a, b) => b.version.localeCompare(a.version))
  return candidates[0]?.version ?? null
}
