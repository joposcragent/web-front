import { asyncJobsHttp } from "@/api/http";
import type {
  AsyncJobItemDto,
  AsyncJobListDto,
  LastRootJobsStatusListDto,
  RelatedEntitiesUuidsListDto,
} from "@/api/types";

export type AsyncJobsListParams = {
  page: number;
  size: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  jobUuid?: string;
  parentJobUuid?: string;
  status?: string;
};

export async function listAsyncJobs(
  params: AsyncJobsListParams,
): Promise<AsyncJobListDto> {
  const { data } = await asyncJobsHttp.get<AsyncJobListDto>(
    "/async-jobs/list",
    { params },
  );
  return data;
}

export async function getAsyncJob(jobUuid: string): Promise<AsyncJobItemDto> {
  const { data } = await asyncJobsHttp.get<AsyncJobItemDto>(
    `/async-jobs/${encodeURIComponent(jobUuid)}`,
  );
  return data;
}

export async function listRelatedEntities(
  jobUuid: string,
): Promise<RelatedEntitiesUuidsListDto> {
  const { data } = await asyncJobsHttp.get<RelatedEntitiesUuidsListDto>(
    `/async-jobs/${encodeURIComponent(jobUuid)}/list/related`,
  );
  return {
    jobPostingsList: Array.isArray(data.jobPostingsList)
      ? data.jobPostingsList
      : [],
    searchQueriesList: Array.isArray(data.searchQueriesList)
      ? data.searchQueriesList
      : [],
  };
}

export async function listLastRootJobsStatus(): Promise<AsyncJobItemDto[]> {
  const { data } = await asyncJobsHttp.get<LastRootJobsStatusListDto>(
    "/async-jobs/last-root-status",
  );
  return Array.isArray(data.list) ? data.list : [];
}
