const GITHUB_REPO = 'bugbountycoi/Reporting-Workbench'
const GITHUB_API = 'https://api.github.com'

function ghHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'Reporting-Workbench/contributor',
  }
}

// Returns the bare GitHub username if raw looks like one (with or without @).
function parseGitHubUsername(raw) {
  const s = raw.startsWith('@') ? raw.slice(1) : raw
  if (s.length >= 1 && s.length <= 39 && /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]?$/.test(s) && !s.includes('--'))
    return s
  return null
}

function buildContributePrBody(type, name, author, authorNote) {
  const label = type === 'module' ? 'Report Module' : 'Theme'
  const lines = [
    `## Community ${label}: ${name}`,
    '',
    'This PR was submitted via the in-app contribution feature.',
  ]
  if (author) {
    const username = parseGitHubUsername(author)
    const credit = username ? `[@${username}](https://github.com/${username})` : author
    lines.push('', `**Author:** ${credit}`)
  }
  if (authorNote) lines.push('', '### Notes from the contributor', '', authorNote)
  lines.push('', '---', '*Submitted via Reporting Workbench CE*')
  return lines.join('\n')
}

/**
 * POST /contribute — open a community contribution PR.
 * Requires GITHUB_TOKEN with Contents:Write and Pull requests:Write.
 */
async function handleContribute(request, env) {
  if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

  if (!env.GITHUB_TOKEN) {
    return new Response(JSON.stringify({ error: 'Community contributions not configured' }), {
      status: 503, headers: { 'Content-Type': 'application/json' },
    })
  }

  let body
  try { body = await request.json() } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    })
  }

  const type = body?.type === 'theme' ? 'theme' : 'module'
  const name = String(body?.name ?? '').trim()
  const slug = String(body?.slug ?? '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
  const author = String(body?.author ?? '').trim().slice(0, 100)
  const authorNote = String(body?.authorNote ?? '').trim().slice(0, 2000)
  const payload = body?.payload

  if (!name || name.length < 2 || name.length > 100)
    return new Response(JSON.stringify({ error: 'Name must be 2–100 characters' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    })
  if (!slug)
    return new Response(JSON.stringify({ error: 'Could not derive a valid slug from the name' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    })
  if (!payload || typeof payload !== 'object')
    return new Response(JSON.stringify({ error: 'Missing payload' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    })

  // Strip computed/transient fields before writing to the repo
  if (type === 'module') delete payload.storedSamplePreview

  const fileContent = JSON.stringify(payload, null, 2)
  if (fileContent.length > 200_000)
    return new Response(JSON.stringify({ error: 'Payload too large (max 200 KB)' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    })

  const timestamp = Date.now()
  const branch = `community/${type}-${slug}-${timestamp}`
  const filePath = `community/${type}s/${slug}.json`
  const headers = ghHeaders(env.GITHUB_TOKEN)

  // 1. Get main branch SHA
  const branchRes = await fetch(`${GITHUB_API}/repos/${GITHUB_REPO}/branches/main`, { headers })
  if (!branchRes.ok) {
    console.error('[contribute] Failed to read main branch', branchRes.status)
    return new Response(JSON.stringify({ error: 'Failed to read repository state' }), {
      status: 502, headers: { 'Content-Type': 'application/json' },
    })
  }
  const { commit: { sha: mainSha } } = await branchRes.json()

  // 2. Create branch
  const refRes = await fetch(`${GITHUB_API}/repos/${GITHUB_REPO}/git/refs`, {
    method: 'POST', headers,
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: mainSha }),
  })
  if (!refRes.ok) {
    console.error('[contribute] Failed to create branch', refRes.status, await refRes.text())
    return new Response(JSON.stringify({ error: 'Failed to create branch' }), {
      status: 502, headers: { 'Content-Type': 'application/json' },
    })
  }

  // 3. Create file — base64-encode with unicode support
  const encoded = btoa(unescape(encodeURIComponent(fileContent)))
  const fileRes = await fetch(`${GITHUB_API}/repos/${GITHUB_REPO}/contents/${filePath}`, {
    method: 'PUT', headers,
    body: JSON.stringify({
      message: `Community: Add ${type} "${name}"`,
      content: encoded,
      branch,
    }),
  })
  if (!fileRes.ok) {
    console.error('[contribute] Failed to create file', fileRes.status, await fileRes.text())
    return new Response(JSON.stringify({ error: 'Failed to create file in branch' }), {
      status: 502, headers: { 'Content-Type': 'application/json' },
    })
  }

  // 4. Open PR
  const prRes = await fetch(`${GITHUB_API}/repos/${GITHUB_REPO}/pulls`, {
    method: 'POST', headers,
    body: JSON.stringify({
      title: `Community: Add ${type} "${name}"`,
      body: buildContributePrBody(type, name, author, authorNote),
      head: branch,
      base: 'main',
    }),
  })
  if (!prRes.ok) {
    console.error('[contribute] Failed to create PR', prRes.status, await prRes.text())
    return new Response(JSON.stringify({ error: 'Failed to open pull request' }), {
      status: 502, headers: { 'Content-Type': 'application/json' },
    })
  }

  const pr = await prRes.json()
  return new Response(JSON.stringify({ prUrl: pr.html_url, prNumber: pr.number }), {
    status: 201, headers: { 'Content-Type': 'application/json' },
  })
}

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

    // Community contribution relay — opens a PR with the submitted module/theme.
    if (url.pathname === '/contribute') {
      return handleContribute(request, env)
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
