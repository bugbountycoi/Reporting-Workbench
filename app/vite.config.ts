import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import type { Connect } from 'vite'
import net from 'net'

function checkPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const srv = net.createServer()
    srv.once('error', () => resolve(false))
    srv.once('listening', () => { srv.close(); resolve(true) })
    srv.listen(port, '127.0.0.1')
  })
}

export default defineConfig(async () => {
  const port = (await checkPort(1337)) ? 1337 : 31337

  return {
    plugins: [react()],
    server: {
      port,
      strictPort: true,
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
  }
})
