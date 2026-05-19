import { conductorHttp } from "@/api/http";
import { mapApiError } from "@/shared/api/mapApiError";

export async function postEnqueueCollectionQuery(body: {
  uuid: string;
  query: string;
  isLazyScraping: boolean;
}): Promise<void> {
  await conductorHttp.post("/enqueue/collection-query", body);
}

export async function postEnqueueCollectionBatch(): Promise<void> {
  await conductorHttp.post("/enqueue/collection-batch");
}

export function conductorErrorMessage(err: unknown): string {
  return mapApiError(err, "Ошибка запроса").slice(0, 500);
}
