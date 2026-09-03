import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import type { Connect, Plugin } from 'vite'
import { readFileSync } from 'fs'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8')) as { version: string }

const GITHUB_REPO = 'bugbountycoi/Reporting-Workbench'
const GITHUB_API = 'https://api.github.com'

function ghHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'Reporting-Workbench/contributor',
  }
}

function contributePlugin(): Plugin {
  return {
    name: 'contribute-dev',
    configureServer(server) {
      server.middlewares.use('/contribute', async (req, res) => {
        if (req.method !== 'POST') { res.writeHead(405).end(); return }

        const token = process.env.GITHUB_TOKEN
        if (!token) {
          res.writeHead(503, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'GITHUB_TOKEN not set in environment' }))
          return
        }

        let raw = ''
        for await (const chunk of req) raw += chunk
        let body: { type?: string; name?: string; slug?: string; authorNote?: string; payload?: Record<string, unknown> }
        try { body = JSON.parse(raw) } catch { res.writeHead(400).end('Invalid JSON'); return }

        const type = body?.type === 'theme' ? 'theme' : 'module'
        const name = String(body?.name ?? '').trim()
        const slug = String(body?.slug ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
        const authorNote = String(body?.authorNote ?? '').trim().slice(0, 2000)
        const payload = body?.payload

        if (!name || name.length < 2 || name.length > 100) { res.writeHead(400).end('Bad name'); return }
        if (!slug) { res.writeHead(400).end('Bad slug'); return }
        if (!payload) { res.writeHead(400).end('Missing payload'); return }

        if (type === 'module') delete payload.storedSamplePreview

        const fileContent = JSON.stringify(payload, null, 2)
        const timestamp = Date.now()
        const branch = `community/${type}-${slug}-${timestamp}`
        const filePath = `community/${type}s/${slug}.json`
        const headers = ghHeaders(token)

        // 1. Get main SHA
        const branchRes = await fetch(`${GITHUB_API}/repos/${GITHUB_REPO}/branches/main`, { headers })
        if (!branchRes.ok) { res.writeHead(502, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Failed to read main branch' })); return }
        const { commit: { sha: mainSha } } = await branchRes.json() as { commit: { sha: string } }

        // 2. Create branch
        const refRes = await fetch(`${GITHUB_API}/repos/${GITHUB_REPO}/git/refs`, {
          method: 'POST', headers, body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: mainSha }),
        })
        if (!refRes.ok) { res.writeHead(502, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Failed to create branch' })); return }

        // 3. Create file
        const encoded = Buffer.from(fileContent).toString('base64')
        const fileRes = await fetch(`${GITHUB_API}/repos/${GITHUB_REPO}/contents/${filePath}`, {
          method: 'PUT', headers,
          body: JSON.stringify({ message: `Community: Add ${type} "${name}"`, content: encoded, branch }),
        })
        if (!fileRes.ok) { res.writeHead(502, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Failed to create file' })); return }

        // 4. Create PR
        const note = authorNote ? `\n\n### Notes from the contributor\n\n${authorNote}` : ''
        const prBody = `## Community ${type === 'module' ? 'Report Module' : 'Theme'}: ${name}\n\nThis PR was submitted via the in-app contribution feature.${note}\n\n---\n*Submitted via Reporting Workbench CE*`
        const prRes = await fetch(`${GITHUB_API}/repos/${GITHUB_REPO}/pulls`, {
          method: 'POST', headers,
          body: JSON.stringify({ title: `Community: Add ${type} "${name}"`, body: prBody, head: branch, base: 'main' }),
        })
        if (!prRes.ok) { res.writeHead(502, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Failed to open pull request' })); return }

        const pr = await prRes.json() as { html_url: string; number: number }
        res.writeHead(201, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ prUrl: pr.html_url, prNumber: pr.number }))
      })
    },
  }
}

// Dev-only middleware that mirrors the /bug-report Cloudflare Worker handler.
// Reads GITHUB_TOKEN from the process environment (server-side — never sent to the browser).
// Set it in .env.local as GITHUB_TOKEN=ghp_...  (no VITE_ prefix — kept server-side).
function bugReportPlugin(): Plugin {
  return {
    name: 'bug-report-dev',
    configureServer(server) {
      server.middlewares.use('/bug-report', async (req, res) => {
        if (req.method !== 'POST') {
          res.writeHead(405).end()
          return
        }

        const token = process.env.GITHUB_TOKEN
        if (!token) {
          res.writeHead(503, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'GITHUB_TOKEN not set in environment' }))
          return
        }

        let body = ''
        for await (const chunk of req) body += chunk
        let parsed: { title?: string; body?: string }
        try { parsed = JSON.parse(body) } catch { res.writeHead(400).end('Invalid JSON'); return }

        const title = String(parsed.title ?? '').trim()
        const issueBody = String(parsed.body ?? '').trim()
        if (!title || title.length < 3) { res.writeHead(400).end('Bad title'); return }

        const ghRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'Reporting-Workbench/bug-reporter',
          },
          body: JSON.stringify({ title, body: issueBody, labels: ['bug'] }),
        })

        if (!ghRes.ok) {
          res.writeHead(502, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'GitHub API error' }))
          return
        }

        const issue = await ghRes.json() as { html_url: string; number: number }
        res.writeHead(201, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ issueUrl: issue.html_url, issueNumber: issue.number }))
      })
    },
  }
}

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [react(), contributePlugin(), bugReportPlugin()],
  server: {
    // Pinned so npm run dev and node server.mjs both serve :1337, matching the
    // http://localhost:1337/oauth/callback redirect URI the UI/README register.
    port: 1337,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'https://api.intigriti.com/external/company',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        secure: true,
      },
      // OAuth token exchange — same-origin proxy avoids CORS on connect/token.
      // (Authorize is a top-level redirect to the absolute URL, so it needs no proxy.)
      '/oauth/token': {
        target: 'https://login.intigriti.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/oauth\/token/, '/connect/token'),
        secure: true,
      },
    },
    middlewares: [] as Connect.HandleFunction[],
  },
})
