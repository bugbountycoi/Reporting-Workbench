# Intigriti Reporting Workbench

A local, client-side reporting tool for Intigriti API data. Runs entirely on your machine — no remote hosting required.

## Quick start

```bash
cd app
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

---

## Mock mode (no API key required)

```bash
npm run dev:mock
```

All reports will render using bundled fixture data. Use this to explore the tool or develop new reports without an API key.

---

## Connecting to the live API

The Intigriti API uses **OAuth 2.0**. The app supports two authentication approaches:

### Option A — Bearer token (recommended for quick start)

1. Log in to Intigriti and go to **Admin › Integrations › Intigriti API**.
2. Create a new API connection. When prompted for token lifetime, select **non-expiring** for a persistent token.
3. Copy the generated Bearer token.
4. Open the app, choose **Bearer Token** mode, paste the token, and click **Test & Connect**.

### Option B — OAuth 2.0 (for programmatic or team use)

1. In **Admin › Integrations › Intigriti API**, create a connection with a redirect URI of `http://localhost:5173/oauth/callback`.
2. Note the Client ID and Client Secret (the secret is shown only once).
3. In the app, choose **OAuth 2.0** mode, enter the credentials, and click **Authorise with Intigriti**.
4. You will be redirected to Intigriti to sign in and grant access. After authorising, you are redirected back automatically.

---

## Local data cache

The app can save API responses to a local folder on your disk for historical look-back and offline use.

1. In the **Cache & Encryption** panel, click **Select cache folder**.
2. Choose a folder on your machine. Fetched data will be saved automatically as timestamped `.json` files.
3. To load previously cached data, re-select the same folder.

**Warning:** Cache files may contain sensitive vulnerability data. Store them securely.

### Optional encryption

Enable encryption in the Cache & Encryption panel. You can use:
- **API token as key** — encrypts with your API token. Anyone with your token can decrypt.
- **Custom passphrase** — stronger isolation, but you must remember the passphrase.

Encrypted files are saved as `.enc`. Provide the same key to decrypt them on load.

---

## Project structure

```
src/
  api/          API client, types, and endpoint helpers
  auth/         Token store and OAuth flow
  cache/        File system cache and AES-256-GCM encryption
  components/   Shared React UI components
  config/       API URL and mock mode config
  fixtures/     Sample JSON data for mock mode
  reports/      Report module definitions and registry
  utils/        CSV export, date helpers, image export, redaction
```

---

## Adding a new report

See [REPORT_MODULE_GUIDE.md](./REPORT_MODULE_GUIDE.md).

---

## Security notes

- The app never sends your API token anywhere except the configured Intigriti API base URL (proxied via Vite).
- Tokens are held in memory only, unless you explicitly enable "Remember on this device".
- Keys are never logged, never included in exports, and are hidden in print/PDF output.
- The CORS proxy runs locally — no data leaves your machine via a third-party proxy.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| "Network error" / "Failed to fetch" | Ensure `npm run dev` is running — the Vite proxy handles CORS |
| 401 Unauthorized | Token expired. Disconnect and reconnect. |
| 403 Forbidden | Token lacks the required scope. Check your Intigriti API configuration. |
| 429 Too Many Requests | The app will retry automatically. Wait a few seconds. |
| OAuth callback not working | Ensure your redirect URI in Intigriti admin matches `http://localhost:5173/oauth/callback` exactly. |
