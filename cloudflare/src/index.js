export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    // Proxy /api/* → https://api.intigriti.com/external/company/*
    if (url.pathname.startsWith('/api')) {
      const targetPath = url.pathname.slice(4) || '/'
      const upstream = new Request(
        `https://api.intigriti.com/external/company${targetPath}${url.search}`,
        { method: request.method, headers: request.headers, body: request.body }
      )
      return fetch(upstream)
    }

    // Proxy /oauth/login/* → https://login.intigriti.com/connect/authorize/*
    // /oauth/callback is intentionally excluded — falls through to the SPA.
    if (url.pathname.startsWith('/oauth/login')) {
      const targetPath = url.pathname.replace(/^\/oauth\/login/, '/connect/authorize')
      const upstream = new Request(
        `https://login.intigriti.com${targetPath}${url.search}`,
        { method: request.method, headers: request.headers, body: request.body, redirect: 'manual' }
      )
      return fetch(upstream)
    }

    // All other routes (including /oauth/callback) → SPA static assets.
    // not_found_handling = "single-page-application" in wrangler.toml means
    // unmatched paths serve index.html, so React Router handles client-side routing.
    return env.ASSETS.fetch(request)
  },
}
