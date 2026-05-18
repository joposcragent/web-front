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

/** Пустая `VITE_ORCHESTRATION_CONDUCTOR_BASE_URL` — same-origin, путь `/orchestration-conductor` (nginx / Vite proxy). */
function conductorApiBase(): string {
  const fromEnv = import.meta.env.VITE_ORCHESTRATION_CONDUCTOR_BASE_URL?.trim() ?? ''
  if (fromEnv !== '')
    return fromEnv.replace(/\/$/, '')
  return '/orchestration-conductor'
}

export const conductorHttp = axios.create({
  baseURL: conductorApiBase(),
})

/** Пустая `VITE_ORCHESTRATION_SCHEDULER_BASE_URL` — same-origin, путь `/orchestration-scheduler` (nginx / Vite proxy). */
function schedulerApiBase(): string {
  const fromEnv = import.meta.env.VITE_ORCHESTRATION_SCHEDULER_BASE_URL?.trim() ?? ''
  if (fromEnv !== '')
    return fromEnv.replace(/\/$/, '')
  return '/orchestration-scheduler'
}

export const schedulerHttp = axios.create({
  baseURL: schedulerApiBase(),
})

/** Пустая `VITE_ORCHESTRATION_ASYNC_JOBS_CRUD_BASE_URL` — same-origin, путь `/orchestration-async-jobs-crud` (nginx / Vite proxy). */
function asyncJobsApiBase(): string {
  const fromEnv = import.meta.env.VITE_ORCHESTRATION_ASYNC_JOBS_CRUD_BASE_URL?.trim() ?? ''
  if (fromEnv !== '')
    return fromEnv.replace(/\/$/, '')
  return '/orchestration-async-jobs-crud'
}

export const asyncJobsHttp = axios.create({
  baseURL: asyncJobsApiBase(),
})

export const evaluatorHttp = axios.create({
  baseURL: apiBase(import.meta.env.VITE_JOB_POSTINGS_EVALUATOR_BASE_URL),
})
