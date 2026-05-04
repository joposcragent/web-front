import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig, loadEnv } from 'vite'
import vuetify from 'vite-plugin-vuetify'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const settingsTarget = env.VITE_DEV_PROXY_SETTINGS_MANAGER ?? 'http://127.0.0.1:8080'
  const crudTarget = env.VITE_DEV_PROXY_JOB_POSTINGS_CRUD ?? 'http://127.0.0.1:8081'
  const orchestratorTarget =
    env.VITE_DEV_PROXY_CELERY_ORCHESTRATOR ?? 'http://127.0.0.1:8084'

  return {
    plugins: [
      vue(),
      vuetify({ autoImport: true }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      proxy: {
        '/job-postings': { target: crudTarget, changeOrigin: true },
        '/search-query': { target: settingsTarget, changeOrigin: true },
        '/relevance-thresholds': { target: settingsTarget, changeOrigin: true },
        '/reference-context': { target: settingsTarget, changeOrigin: true },
        '/prompt-template': { target: settingsTarget, changeOrigin: true },
        '/events-queue': { target: orchestratorTarget, changeOrigin: true },
      },
    },
  }
})
