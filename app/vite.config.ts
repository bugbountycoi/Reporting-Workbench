import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import type { Connect } from 'vite'
import { readFileSync } from 'fs'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8')) as { version: string }

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
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
