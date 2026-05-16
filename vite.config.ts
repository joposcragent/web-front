import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig, loadEnv } from 'vite'
import vuetify from 'vite-plugin-vuetify'

const pkgJsonPath = fileURLToPath(new URL('./package.json', import.meta.url))
const pkgVersion = (JSON.parse(readFileSync(pkgJsonPath, 'utf-8')) as { version: string }).version

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const settingsTarget = env.VITE_DEV_PROXY_SETTINGS_MANAGER ?? 'http://127.0.0.1:8080'
  const crudTarget = env.VITE_DEV_PROXY_JOB_POSTINGS_CRUD ?? 'http://127.0.0.1:8081'
  const conductorTarget =
    env.VITE_DEV_PROXY_ORCHESTRATION_CONDUCTOR ?? 'http://127.0.0.1:8084'
  const schedulerTarget =
    env.VITE_DEV_PROXY_ORCHESTRATION_SCHEDULER ?? 'http://127.0.0.1:8083'
  const evaluatorTarget =
    env.VITE_DEV_PROXY_JOB_POSTINGS_EVALUATOR ?? 'http://127.0.0.1:8082'
  const gitCommit = env.VITE_GIT_COMMIT ?? process.env.VITE_GIT_COMMIT ?? ''

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
    define: {
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkgVersion),
      'import.meta.env.VITE_GIT_COMMIT': JSON.stringify(gitCommit),
    },
    server: {
      proxy: {
        '/job-postings': { target: crudTarget, changeOrigin: true },
        '/notes': { target: crudTarget, changeOrigin: true },
        '/search-query': { target: settingsTarget, changeOrigin: true },
        '/reference-context': { target: settingsTarget, changeOrigin: true },
        '/prompt-template': { target: settingsTarget, changeOrigin: true },
        '/orchestration-conductor': { target: conductorTarget, changeOrigin: true },
        '/orchestration-scheduler': { target: schedulerTarget, changeOrigin: true },
        '/evaluate': { target: evaluatorTarget, changeOrigin: true },
      },
    },
  }
})
