/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

declare module 'vuetify/styles'

interface ImportMetaEnv {
  /** Пустая строка — same-origin (nginx / Vite proxy). */
  readonly VITE_SETTINGS_MANAGER_BASE_URL: string
  readonly VITE_JOB_POSTINGS_CRUD_BASE_URL: string
  readonly VITE_FLOWER_BASE_URL: string
  /** Только dev: цели proxy в vite.config.ts */
  readonly VITE_DEV_PROXY_SETTINGS_MANAGER?: string
  readonly VITE_DEV_PROXY_JOB_POSTINGS_CRUD?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
