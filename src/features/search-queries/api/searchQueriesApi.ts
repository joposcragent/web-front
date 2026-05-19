import { settingsHttp } from "@/api/http";
import type { SearchQueriesList } from "@/api/types";

export type SearchQueryUpsertPayload = {
  name: string;
  query: string;
  contentRelevance: number;
  notificationRelevance: number;
  isActive: boolean;
  isLazyScraping: boolean;
};

export async function listSearchQueries(): Promise<SearchQueriesList> {
  const { data } =
    await settingsHttp.get<SearchQueriesList>("/search-query/list");
  return Array.isArray(data) ? data : [];
}

export async function createSearchQuery(
  uuid: string,
  body: SearchQueryUpsertPayload,
): Promise<void> {
  await settingsHttp.post(`/search-query/${uuid}`, body);
}

export async function patchSearchQuery(
  uuid: string,
  body: Record<string, unknown>,
): Promise<void> {
  await settingsHttp.patch(`/search-query/${uuid}`, body);
}

export async function deleteSearchQuery(uuid: string): Promise<void> {
  await settingsHttp.delete(`/search-query/${uuid}`);
}
