import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import type { Connect } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://api.intigriti.com/external/company',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        secure: true,
      },
      '/oauth': {
        target: 'https://login.intigriti.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/oauth\/login/, '/connect/authorize'),
        secure: true,
      },
    },
    // Handle OAuth callback at /oauth/callback — this path receives the code
    // and sends it to the SPA via postMessage or query string redirect.
    // The SPA at index.html handles /oauth/callback by reading window.location.search.
    middlewares: [] as Connect.HandleFunction[],
  },
})
