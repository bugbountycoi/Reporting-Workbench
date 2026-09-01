import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import type { Connect } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
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
    middlewares: [] as Connect.HandleFunction[],
  },
})
