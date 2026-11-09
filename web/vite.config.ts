import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      // Import with "@/components/Foo" instead of "../../components/Foo"
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },

  server: {
    port: 5173,
    proxy: {
      // Forward all /api/* requests to the Go backend during development.
      // Auth routes are also under /api so a single rule covers everything.
      '/api': { target: 'http://localhost:8080', changeOrigin: true },
    },
  },
})
