# Reporting Workbench

A browser-based reporting tool for bug bounty programme data. Connects to the Intigriti API via OAuth 2.0 or a bearer token, fetches submissions, payouts, and reward requests, and renders configurable reports with charts, tables, and export options. All processing happens client-side — data goes only to the Intigriti API and never through any third-party service.

Live at **[reportingworkbench.bugbountycoi.org](https://reportingworkbench.bugbountycoi.org)**

---

## Repository layout

```
Reporting-Workbench/
│
├── app/                   # The application — Vite 5 + React 18 + TypeScript SPA
│   ├── src/               # Application source code
│   ├── public/            # Static assets (fonts, fixtures, favicon)
│   ├── vite.config.ts     # Dev-server proxy (API + OAuth routes)
│   └── README.md          # End-user guide: install, features, security model
│
├── cloudflare/            # Cloudflare Workers deployment
│   ├── src/index.js       # Worker script — proxies /api/* and /oauth/login/*,
│   │                      #   delegates everything else to the static asset store
│   └── wrangler.toml      # Worker name, asset directory, custom domain, observability
│
├── themes/                # Shareable theme packages (installable JSON files)
│   ├── community-theme.json
│   └── intigriti-theme.json
│
├── scripts/               # Developer tooling
│   ├── package.sh         # Builds and zips a self-contained release archive
│   ├── generate-fixtures.js
│   └── validate-fixtures.js
│
├── plans/                 # Design docs for future multi-platform expansion
│   ├── plan-1-scaffold-multi-platform.md
│   ├── plan-2-hackerone-support.md
│   ├── plan-3-bugcrowd-support.md
│   ├── plan-4-platform-guide.md
│   └── plan-5-canonical-adapter.md
│
├── dist/                  # Release zip archives produced by scripts/package.sh
│
└── server.mjs             # Standalone Node.js server for local / packaged deployment
                           #   Serves the built app and proxies API + OAuth routes.
                           #   No npm install required — uses only Node built-ins.
```

---

## Running the app

### Local development

```bash
cd app && npm install && npm run dev
```

Opens at **http://localhost:5173** with Vite's dev proxy handling API and OAuth routes.

To run against built-in mock data (no API key required):

```bash
cd app && npm run dev:mock
```

### Standalone server (for sharing or local production use)

Build the app, then launch the standalone server:

```bash
cd app && npm run build
node server.mjs
```

Opens at **http://localhost:1337** (falls back to 31337 if that port is taken). The standalone server has no npm dependencies — anyone with Node.js 18+ installed can run it.

### Packaged release

To produce a self-contained zip for distribution:

```bash
cd app && npm run package
```

Output lands in `dist/` as `reporting-workbench-<version>.zip`. Recipients unzip, run `start.sh` (or `start.bat` / `start.ps1` on Windows), and open the printed URL — no Node modules or build step needed on their end.

---

## Cloudflare deployment

The `cloudflare/` folder is self-contained and independent of the `app/` build system.

```bash
# 1. Build the app
cd app && npm run build

# 2. Deploy
cd ../cloudflare && npm install && npm run deploy
```

The Worker proxies `/api/*` to `api.intigriti.com` and `/oauth/login/*` to `login.intigriti.com`. All other requests — including `/oauth/callback` and every static asset — are served from the Cloudflare asset store.

**First-time deploy:** `bugbountycoi.org` must be an active zone on the authenticated Cloudflare account. The `custom_domain = true` route in `wrangler.toml` provisions the DNS record automatically.

**After deploying to a new domain:** register `https://reportingworkbench.bugbountycoi.org/oauth/callback` as an allowed redirect URI in your Intigriti OAuth application.

---

## Themes

The `themes/` folder contains portable theme packages that users can install into any running instance of the workbench via the in-app Theme Switcher → **Install from file**. Each file is a plain JSON object matching the `ThemeSpec` interface (see [`app/src/themes/types.ts`](app/src/themes/types.ts)).

---

## Plans

The `plans/` folder contains design documents for future work (HackerOne, Bugcrowd, and a canonical adapter layer). These are reference material only — nothing in them is implemented yet.

---

## Security notes

- The API token is never logged, never included in exports, and never sent anywhere except `api.intigriti.com`.
- The OAuth client secret (when used) is held only in `sessionStorage` and cleared on disconnect.
- Custom report module JavaScript runs in a sandboxed Web Worker — it cannot access tokens or browser storage directly.
- Cache files may contain sensitive vulnerability data. If encryption is enabled, files are AES-256-GCM encrypted before being written to disk.

Full security model: [`app/README.md — Security model`](app/README.md#security-model)
