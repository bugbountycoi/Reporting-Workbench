export const API_CONFIG = {
  // Vite dev proxy rewrites /api/* → https://api.intigriti.com/external/company/*
  baseUrl: '/api/v2',
  authBaseUrl: 'https://login.intigriti.com',
  oauthAuthorizeUrl: 'https://login.intigriti.com/connect/authorize',
  oauthTokenUrl: 'https://login.intigriti.com/connect/token',
  oauthRedirectUri: `${window.location.origin}/oauth/callback`,
  defaultScopes: 'company_external_api core_platform:read reward_system:read offline_access',
  mockMode: import.meta.env.VITE_MOCK_MODE === 'true',
} as const
