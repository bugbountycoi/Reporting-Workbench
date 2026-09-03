const GITHUB_REPO = 'bugbountycoi/Reporting-Workbench'

/**
 * POST /bug-report — create a GitHub issue on behalf of the user.
 * Requires the GITHUB_TOKEN secret (fine-grained token, issues:write only).
 * Set it once with: wrangler secret put GITHUB_TOKEN
 */
async function handleBugReport(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  if (!env.GITHUB_TOKEN) {
    return new Response(JSON.stringify({ error: 'Bug reporting not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const title = String(body?.title ?? '').trim()
  const issueBody = String(body?.body ?? '').trim()

  if (!title || title.length < 3 || title.length > 200) {
    return new Response(JSON.stringify({ error: 'Title must be 3–200 characters' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  if (issueBody.length > 15_000) {
    return new Response(JSON.stringify({ error: 'Body too long' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const ghRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'Reporting-Workbench/bug-reporter',
    },
    body: JSON.stringify({ title, body: issueBody, labels: ['bug'] }),
  })

  if (!ghRes.ok) {
    const text = await ghRes.text()
    console.error('[bug-report] GitHub API error', ghRes.status, text)
    return new Response(JSON.stringify({ error: 'Failed to create issue' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const issue = await ghRes.json()
  return new Response(JSON.stringify({ issueUrl: issue.html_url, issueNumber: issue.number }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  })
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    // Bug report relay — creates GitHub issues using server-stored token.
    if (url.pathname === '/bug-report') {
      return handleBugReport(request, env)
    }

    // Proxy /api/* → https://api.intigriti.com/external/company/*
    if (url.pathname.startsWith('/api')) {
      const targetPath = url.pathname.slice(4) || '/'
      const upstream = new Request(
        `https://api.intigriti.com/external/company${targetPath}${url.search}`,
        { method: request.method, headers: request.headers, body: request.body }
      )
      return fetch(upstream)
    }

    // Proxy /oauth/token → https://login.intigriti.com/connect/token
    // Same-origin so the browser's OAuth token exchange is never CORS-blocked.
    if (url.pathname.startsWith('/oauth/token')) {
      const upstream = new Request(
        `https://login.intigriti.com/connect/token${url.search}`,
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
