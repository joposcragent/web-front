/** Shared API DTOs (aligned with specifications OpenAPI). */

export type EvaluationStatus = "NEW" | "PENDING" | "IRRELEVANT" | "RELEVANT";
export type ResponseStatus =
  | "NEW"
  | "NOT_INTERESTED"
  | "RESPONDED"
  | "REJECTED";

export interface JobPostingsItem {
  uuid: string;
  searchQueryUuid: string;
  uid: string;
  publicationDate: string;
  title: string;
  url: string;
  company?: string | null;
  content?: string | null;
  contentVector?: number[] | null;
  relevance?: number | null;
  evaluationStatus?: EvaluationStatus | null;
  responseStatus: ResponseStatus;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface JobPostingsList {
  list: JobPostingsItem[];
  totalPages?: number | null;
}

/** GET /notes/{uuid} и тело POST /notes/{uuid} */
export interface JobPostingNotesPayload {
  text: string;
}

export interface ReferenceContext {
  context: string;
  vector: number[];
  createdAt: string;
  updatedAt: string;
}

export interface ReferenceContextPersisted {
  vector: number[];
  createdAt: string;
  updatedAt: string;
}

export interface PromptTemplate {
  template: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface SearchQueriesItem {
  uuid: string;
  name: string;
  query: string;
  contentRelevance: number;
  notificationRelevance: number;
  isActive: boolean;
  isLazyScraping: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SearchQueriesList = SearchQueriesItem[];

export type SchedulerJobType = "COLLECTION_BATCH" | "RETENTION";

export interface SchedulerSettingsItemDto {
  jobType: SchedulerJobType;
  nextRun: string | null;
  interval: string | null;
  previousRun: string | null;
}

export interface SchedulerSettingsListDto {
  list: SchedulerSettingsItemDto[] | null;
}

export type AsyncJobStatusDto = "STARTED" | "SUCCEEDED" | "FAILED" | "CANCELED";

/** Элемент `GET /async-jobs/list` (ключи дат как в JSON API). */
export interface AsyncJobItemDto {
  uuid: string;
  name: string;
  parentUuid?: string | null;
  status: AsyncJobStatusDto;
  context?: Record<string, unknown> | null;
  result?: string | null;
  started_at: string;
  updated_at?: string | null;
  finished_at?: string | null;
}

export interface AsyncJobListDto {
  list: AsyncJobItemDto[];
  total: number;
}

/** Ответ `GET /async-jobs/last-root-status`. */
export interface LastRootJobsStatusListDto {
  list: AsyncJobItemDto[];
}

/** Ответ `GET /async-jobs/{jobUuid}/list/related`. */
export interface RelatedEntitiesUuidsListDto {
  jobPostingsList: string[];
  searchQueriesList: string[];
}
