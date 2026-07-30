import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'react-router-dom': fileURLToPath(new URL('./src/router.tsx', import.meta.url)),
    },
  },
  build: {
    rolldownOptions: {
      checks: {
        pluginTimings: false,
      },
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'technical-data',
              test: /src[\\/]data[\\/](raw-tables|extra-tables|special-fans\.generated|dim-tables|central-sections)\.ts$/,
              maxSize: 300_000,
              priority: 20,
            },
          ],
        },
      },
    },
  },
  server: {
    proxy: {
      // Чатбот RAG-бэкенд (durable-служба на .31). Специфичный путь — ПЕРЕД общим /api.
      // Единый FastAPI-бэкенд (чат + формы) на 8011; 8777 никем не слушался — форма /request падала 502 (фикс 22.07)
      '/api': { target: 'http://127.0.0.1:8011', changeOrigin: true },
    },
  },
  preview: {
    proxy: {
      // Единый FastAPI-бэкенд (чат + формы) на 8011; 8777 никем не слушался — форма /request падала 502 (фикс 22.07)
      '/api': { target: 'http://127.0.0.1:8011', changeOrigin: true },
    },
  },
})
