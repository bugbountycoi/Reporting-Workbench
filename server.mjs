#!/usr/bin/env node
// server.mjs — Reporting Workbench standalone server
// No npm install needed — uses only Node.js built-ins.
//
// Usage:
//   node server.mjs
//
// Live vs. mock mode is toggled in the app's API Settings panel.

import http from 'http'
import https from 'https'
import fs from 'fs'
import path from 'path'
import net from 'net'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.join(__dirname, 'dist')

if (!fs.existsSync(DIST)) {
  console.error(`Error: build output not found at ${DIST}`)
  process.exit(1)
}

const MIME = {
  '.html':  'text/html; charset=utf-8',
  '.js':    'application/javascript',
  '.css':   'text/css',
  '.json':  'application/json',
  '.png':   'image/png',
  '.svg':   'image/svg+xml',
  '.ico':   'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff':  'font/woff',
  '.ttf':   'font/ttf',
}

function serveFile(res, filePath) {
  try {
    const data = fs.readFileSync(filePath)
    const ext = path.extname(filePath).toLowerCase()
    res.writeHead(200, { 'Content-Type': MIME[ext] ?? 'application/octet-stream' })
    res.end(data)
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not found')
  }
}

function proxy(req, res, hostname, targetPath) {
  const options = {
    hostname,
    path: targetPath + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''),
    method: req.method,
    headers: { ...req.headers, host: hostname },
  }
  delete options.headers['content-length'] // let Node recalculate
  const upstream = https.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers)
    proxyRes.pipe(res, { end: true })
  })
  upstream.on('error', (err) => {
    if (!res.headersSent) { res.writeHead(502); res.end('Proxy error: ' + err.message) }
  })
  req.pipe(upstream, { end: true })
}

function checkPort(port) {
  return new Promise((resolve) => {
    const srv = net.createServer()
    srv.once('error', () => resolve(false))
    srv.once('listening', () => { srv.close(); resolve(true) })
    srv.listen(port, '127.0.0.1')
  })
}

const server = http.createServer((req, res) => {
  const url = req.url ?? '/'

  // API proxy — strip /api prefix, forward to Intigriti's external API
  if (url.startsWith('/api')) {
    const target = url.slice(4) || '/'
    return proxy(req, res, 'api.intigriti.com', '/external/company' + target)
  }

  // OAuth token proxy — /oauth/token → login.intigriti.com/connect/token
  // Same-origin so the browser's token exchange is never CORS-blocked.
  if (url.startsWith('/oauth/token')) {
    return proxy(req, res, 'login.intigriti.com', '/connect/token')
  }

  // OAuth login proxy — /oauth/login/* → login.intigriti.com/connect/authorize/*
  // /oauth/callback is intentionally excluded: it must be served as the SPA so
  // React can read the code/state params and complete the token exchange.
  if (url.startsWith('/oauth/login')) {
    const target = url.replace(/^\/oauth\/login/, '/connect/authorize')
    return proxy(req, res, 'login.intigriti.com', target)
  }

  // Static files — SPA fallback to index.html
  const urlPath = url.split('?')[0]
  let filePath = path.join(DIST, urlPath)
  const stat = fs.existsSync(filePath) ? fs.statSync(filePath) : null
  if (!stat || stat.isDirectory()) filePath = path.join(DIST, 'index.html')
  serveFile(res, filePath)
})

const port = (await checkPort(1337)) ? 1337 : 31337
server.listen(port, '127.0.0.1', () => {
  console.log(`\n  Reporting Workbench`)
  console.log(`  Open → http://localhost:${port}`)
  console.log(`  Press Ctrl+C to stop\n`)
})
