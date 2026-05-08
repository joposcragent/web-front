/** Shared API DTOs (aligned with specifications OpenAPI). */

export type EvaluationStatus = 'NEW' | 'PENDING' | 'IRRELEVANT' | 'RELEVANT'
export type ResponseStatus = 'NEW' | 'NOT_INTERESTED' | 'RESPONDED' | 'REJECTED'

export interface JobPostingsItem {
  uuid: string
  searchQueryUuid: string
  uid: string
  publicationDate: string
  title: string
  url: string
  company?: string | null
  content?: string | null
  contentVector?: number[] | null
  relevance?: number | null
  evaluationStatus?: EvaluationStatus | null
  responseStatus: ResponseStatus
  createdAt?: string | null
  updatedAt?: string | null
}

export interface JobPostingsList {
  list: JobPostingsItem[]
  totalPages?: number | null
}

/** GET /notes/{uuid} и тело POST /notes/{uuid} */
export interface JobPostingNotesPayload {
  text: string
}

export interface ReferenceContext {
  context: string
  vector: number[]
  createdAt: string
  updatedAt: string
}

export interface ReferenceContextPersisted {
  vector: number[]
  createdAt: string
  updatedAt: string
}

export interface PromptTemplate {
  template: string | null
  createdAt: string
  updatedAt: string | null
}

export interface SearchQueriesItem {
  uuid: string
  name: string
  query: string
  contentRelevance: number
  notificationRelevance: number
  isActive: boolean
  isLazyScraping: boolean
  createdAt: string
  updatedAt: string
}

export type SearchQueriesList = SearchQueriesItem[]
