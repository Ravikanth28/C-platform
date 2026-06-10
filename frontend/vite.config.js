import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // ws:true lets the interactive console WebSocket pass through to FastAPI
      '/api': { target: 'http://127.0.0.1:8080', changeOrigin: true, ws: true },
      '/uploads': { target: 'http://127.0.0.1:8080', changeOrigin: true },
    },
  },
})
