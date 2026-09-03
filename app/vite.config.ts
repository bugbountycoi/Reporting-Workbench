import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import type { Connect, Plugin } from 'vite'
import { readFileSync } from 'fs'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8')) as { version: string }

const GITHUB_REPO = 'bugbountycoi/Reporting-Workbench'

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
  plugins: [react(), bugReportPlugin()],
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
