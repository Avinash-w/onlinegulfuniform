import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost/juneberry',
        changeOrigin: true,
      },
      '/juneberry/api': {
        target: 'http://localhost',
        changeOrigin: true,
      },
    },
  },
})
