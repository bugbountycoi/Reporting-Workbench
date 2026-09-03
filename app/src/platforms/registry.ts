import type { PlatformId } from './types'

export interface PlatformConfig {
  id: PlatformId
  name: string
  /** Production API origin. In dev this is proxied; in prod the Worker proxies it. */
  apiBaseUrl: string
  /** Vite dev proxy prefix (e.g. /intigriti-api). Cloudflare Worker mirrors these routes. */
  proxyPrefix: string
  /** API path prefix appended after the proxy prefix (e.g. /v2 for Intigriti). */
  apiPathPrefix: string
  authScheme: 'bearer' | 'basic' | 'token-pair'
  /** Set on every request. null = omit (defaults to application/json in client). */
  acceptHeader: string | null
  /** CSS hex color used for the platform badge. */
  badgeColor: string
  /** Whether PKCE OAuth is available for this platform. */
  oauthEnabled: boolean
  /** Link to platform API docs. */
  docsUrl: string
}

export const PLATFORMS: Record<PlatformId, PlatformConfig> = {
  intigriti: {
    id: 'intigriti',
    name: 'Intigriti',
    apiBaseUrl: 'https://api.intigriti.com/external/company',
    proxyPrefix: '/intigriti-api',
    apiPathPrefix: '/v2',
    authScheme: 'bearer',
    acceptHeader: null,
    badgeColor: '#7c3aed',
    oauthEnabled: true,
    docsUrl: 'https://developers.intigriti.com',
  },
  hackerone: {
    id: 'hackerone',
    name: 'HackerOne',
    apiBaseUrl: 'https://api.hackerone.com/v1',
    proxyPrefix: '/h1-api',
    apiPathPrefix: '',
    authScheme: 'basic',
    acceptHeader: 'application/json',
    badgeColor: '#e8563a',
    oauthEnabled: false,
    docsUrl: 'https://api.hackerone.com',
  },
  bugcrowd: {
    id: 'bugcrowd',
    name: 'Bugcrowd',
    apiBaseUrl: 'https://api.bugcrowd.com',
    proxyPrefix: '/bc-api',
    apiPathPrefix: '',
    authScheme: 'token-pair',
    acceptHeader: 'application/vnd.bugcrowd+json',
    badgeColor: '#f97316',
    oauthEnabled: false,
    docsUrl: 'https://docs.bugcrowd.com/api/getting-started/',
  },
}

export function getPlatformConfig(id: PlatformId): PlatformConfig {
  return PLATFORMS[id]
}
