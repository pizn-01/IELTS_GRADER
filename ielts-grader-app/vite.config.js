import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // pdfjs-dist v6 manages its own worker loading via dynamic import.
    // Excluding it from Vite's pre-bundler prevents the optimizer from
    // rewriting those internal imports in a way that breaks the worker URL.
    exclude: ['pdfjs-dist'],
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
    },
  },
})
