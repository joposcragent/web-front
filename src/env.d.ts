/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

declare module 'vuetify/styles'

interface ImportMetaEnv {
  /** Версия из `package.json`, подставляется на этапе сборки Vite. */
  readonly VITE_APP_VERSION: string
  /** Короткий или полный хэш коммита; задаётся при сборке образа (`VITE_GIT_COMMIT`). */
  readonly VITE_GIT_COMMIT: string
  /** Пустая строка — same-origin (nginx / Vite proxy). */
  readonly VITE_SETTINGS_MANAGER_BASE_URL: string
  readonly VITE_JOB_POSTINGS_CRUD_BASE_URL: string
  readonly VITE_JOB_POSTINGS_EVALUATOR_BASE_URL: string
  /**
   * Базовый URL orchestration-conductor для `POST /enqueue/...`.
   * Пустая строка — same-origin, префикс `/orchestration-conductor` (см. nginx.conf и vite.config).
   */
  readonly VITE_ORCHESTRATION_CONDUCTOR_BASE_URL?: string
  /**
   * Базовый URL страницы поиска hh.ru без завершающего `?`.
   * Полная ссылка в UI: `{VITE_HH_SEARCH_BASE_URL}?{query из БД}`.
   * Если не задано при сборке — в коде используется значение по умолчанию.
   */
  readonly VITE_HH_SEARCH_BASE_URL?: string
  /** Только dev: цели proxy в vite.config.ts */
  readonly VITE_DEV_PROXY_SETTINGS_MANAGER?: string
  readonly VITE_DEV_PROXY_JOB_POSTINGS_CRUD?: string
  readonly VITE_DEV_PROXY_JOB_POSTINGS_EVALUATOR?: string
  readonly VITE_DEV_PROXY_ORCHESTRATION_CONDUCTOR?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
