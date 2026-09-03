import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import type { Connect } from 'vite'

export default defineConfig({
  plugins: [react()],
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
