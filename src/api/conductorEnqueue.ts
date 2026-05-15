import { isAxiosError, type AxiosError } from 'axios'

import { conductorHttp } from '@/api/http'

export async function postEnqueueCollectionQuery(body: {
  uuid: string
  query: string
  isLazyScraping: boolean
}): Promise<void> {
  await conductorHttp.post('/enqueue/collection-query', body)
}

export async function postEnqueueCollectionBatch(): Promise<void> {
  await conductorHttp.post('/enqueue/collection-batch')
}

export function conductorErrorMessage(err: unknown): string {
  if (!isAxiosError(err)) return err instanceof Error ? err.message : 'Ошибка запроса'
  const ax = err as AxiosError<string | { detail?: unknown }>
  if (!ax.response) return ax.message || 'Ошибка сети'
  const { status, data } = ax.response
  if (typeof data === 'string' && data.trim()) return data.trim().slice(0, 500)
  if (data && typeof data === 'object' && 'detail' in data) {
    const det = (data as { detail: unknown }).detail
    if (typeof det === 'string') return det
    if (Array.isArray(det)) {
      return det
        .map((x) => (typeof x === 'object' && x && 'msg' in x ? String((x as { msg: string }).msg) : String(x)))
        .join('; ')
        .slice(0, 500)
    }
  }
  return `HTTP ${status}`
}
