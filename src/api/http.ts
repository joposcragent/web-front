import axios from 'axios'

function requireBase(url: string | undefined, name: string): string {
  if (!url?.trim()) {
    console.warn(`[web-front] ${name} is empty; set in .env`)
    return ''
  }
  return url.replace(/\/$/, '')
}

export const settingsHttp = axios.create({
  baseURL: requireBase(import.meta.env.VITE_SETTINGS_MANAGER_BASE_URL, 'VITE_SETTINGS_MANAGER_BASE_URL'),
})

export const jobPostingsHttp = axios.create({
  baseURL: requireBase(import.meta.env.VITE_JOB_POSTINGS_CRUD_BASE_URL, 'VITE_JOB_POSTINGS_CRUD_BASE_URL'),
})
