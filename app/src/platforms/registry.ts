export type PlatformId = 'intigriti' | 'bugcrowd' | 'hackerone'

export interface OAuthConfig {
  authorizeUrl: string
  tokenUrl: string
  redirectUri: string
  scopes: string
}

export interface PlatformConfig {
  id: PlatformId
  name: string
  shortName: string
  /** Badge background hex */
  color: string
  /** Badge text hex */
  textColor: string
  /** Vite dev proxy prefix — also used as base path in dev */
  devProxyPrefix: string
  /** Authorization header scheme */
  authType: 'bearer' | 'token-pair' | 'basic'
  /** Extra Accept header required by the platform (e.g. Bugcrowd) */
  acceptHeader?: string
  /** OAuth PKCE config — only platforms that support it */
  oauth?: OAuthConfig
  docsUrl: string
  /** Shown below the credential inputs in ApiKeyPanel */
  tokenHint: string
}

export const PLATFORMS: Record<PlatformId, PlatformConfig> = {
  intigriti: {
    id: 'intigriti',
    name: 'Intigriti',
    shortName: 'Intigriti',
    color: '#6B3FFA',
    textColor: '#FFFFFF',
    devProxyPrefix: '/api/intigriti',
    authType: 'bearer',
    oauth: {
      authorizeUrl: 'https://login.intigriti.com/connect/authorize',
      tokenUrl: 'https://login.intigriti.com/connect/token',
      redirectUri: `${window.location.origin}/oauth/callback`,
      scopes: 'company_external_api offline_access',
    },
    docsUrl: 'https://kb.intigriti.com/en/articles/8273437-intigriti-api',
    tokenHint: 'Generate an API token from your Intigriti account settings.',
  },

  bugcrowd: {
    id: 'bugcrowd',
    name: 'Bugcrowd',
    shortName: 'Bugcrowd',
    color: '#F26722',
    textColor: '#FFFFFF',
    devProxyPrefix: '/api/bugcrowd',
    authType: 'token-pair',
    acceptHeader: 'application/vnd.bugcrowd+json',
    docsUrl: 'https://docs.bugcrowd.com/api/getting-started/',
    tokenHint: 'Generate an API token from your Bugcrowd credentials page. Username is your Bugcrowd login.',
  },

  hackerone: {
    id: 'hackerone',
    name: 'HackerOne',
    shortName: 'H1',
    color: '#222D3A',
    textColor: '#FFFFFF',
    devProxyPrefix: '/api/hackerone',
    authType: 'basic',
    docsUrl: 'https://api.hackerone.com/customer-reference/',
    tokenHint: 'Create an API token in HackerOne Settings → API Tokens. The identifier is shown when the token is created.',
  },
}
