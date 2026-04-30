import axios from 'axios'

/** Пустая строка — запросы на тот же origin (nginx в Docker или proxy в Vite dev). */
function apiBase(url: string | undefined): string {
  const t = url?.trim() ?? ''
  if (t === '')
    return ''
  return t.replace(/\/$/, '')
}

export const settingsHttp = axios.create({
  baseURL: apiBase(import.meta.env.VITE_SETTINGS_MANAGER_BASE_URL),
})

export const jobPostingsHttp = axios.create({
  baseURL: apiBase(import.meta.env.VITE_JOB_POSTINGS_CRUD_BASE_URL),
})
