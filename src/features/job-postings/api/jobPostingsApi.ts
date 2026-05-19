import { evaluatorHttp, jobPostingsHttp, settingsHttp } from "@/api/http";
import type {
  EvaluationStatus,
  JobPostingNotesPayload,
  JobPostingsItem,
  JobPostingsList,
  PromptTemplate,
  ReferenceContext,
  ResponseStatus,
  SearchQueriesList,
} from "@/api/types";

export type JobPostingListSort = "uuid_asc" | "created_at_desc";

export type JobPostingListParams = {
  page: number;
  size: number;
  substring?: string;
  evaluationStatus?: string[];
  responseStatus?: string[];
  sort?: JobPostingListSort;
};

function serializeParams(
  params: Record<string, string | number | boolean | string[] | undefined>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      for (const item of value) search.append(key, String(item));
      continue;
    }
    if (typeof value === "boolean") {
      search.append(key, value ? "true" : "false");
      continue;
    }
    search.append(key, String(value));
  }
  return search.toString();
}

export async function listJobPostings(
  params: JobPostingListParams,
): Promise<JobPostingsList> {
  const { substring, ...base } = params;
  const query = serializeParams({
    ...base,
    ...(substring?.trim() ? { substring: substring.trim() } : {}),
  });
  const path = substring?.trim()
    ? `/job-postings/search-query/by-substring?${query}`
    : `/job-postings/list?${query}`;
  const { data } = await jobPostingsHttp.get<JobPostingsList>(path);
  return data;
}

export async function listSearchQueries(): Promise<SearchQueriesList> {
  const { data } =
    await settingsHttp.get<SearchQueriesList>("/search-query/list");
  return Array.isArray(data) ? data : [];
}

export async function getJobPostingNotes(
  uuid: string,
): Promise<JobPostingNotesPayload> {
  const { data } = await jobPostingsHttp.get<JobPostingNotesPayload>(
    `/notes/${uuid}`,
  );
  return data;
}

export async function saveJobPostingNotes(
  uuid: string,
  payload: JobPostingNotesPayload,
): Promise<void> {
  await jobPostingsHttp.post(`/notes/${uuid}`, payload);
}

export async function updateEvaluationStatus(
  uuid: string,
  status: EvaluationStatus,
): Promise<void> {
  await jobPostingsHttp.post(
    `/job-postings/${uuid}/evaluation-status/${status}`,
  );
}

export async function updateResponseStatus(
  uuid: string,
  status: ResponseStatus,
): Promise<void> {
  await jobPostingsHttp.post(`/job-postings/${uuid}/response-status/${status}`);
}

export async function evaluateJobPosting(uuid: string): Promise<void> {
  await evaluatorHttp.post(`/evaluate/sync/${uuid}`);
}

export async function getJobPosting(uuid: string): Promise<JobPostingsItem> {
  const { data } = await jobPostingsHttp.get<JobPostingsItem>(
    `/job-postings/${uuid}`,
  );
  return data;
}

export async function getPromptTemplate(): Promise<{
  status: number;
  data: PromptTemplate;
}> {
  const res = await settingsHttp.get<PromptTemplate>("/prompt-template", {
    validateStatus: (status) => status === 200 || status === 404,
  });
  return { status: res.status, data: res.data };
}

export async function getReferenceContext(): Promise<{
  status: number;
  data: ReferenceContext | "";
}> {
  const res = await settingsHttp.get<ReferenceContext | "">(
    "/reference-context",
    {
      validateStatus: (status) =>
        status === 200 || status === 202 || status === 404 || status === 500,
    },
  );
  return { status: res.status, data: res.data };
}
