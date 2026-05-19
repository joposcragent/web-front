import { isAxiosError, type AxiosError } from "axios";

type ErrorDetailItem = { msg?: unknown };
type ErrorBody = string | { detail?: unknown } | undefined;

function detailToText(detail: unknown): string | null {
  if (typeof detail === "string" && detail.trim()) return detail.trim();
  if (Array.isArray(detail)) {
    const merged = detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (typeof item === "object" && item != null && "msg" in item) {
          const msg = (item as ErrorDetailItem).msg;
          return typeof msg === "string" ? msg : String(msg ?? "");
        }
        return String(item ?? "");
      })
      .filter((part) => part.trim().length > 0)
      .join("; ")
      .trim();
    return merged.length > 0 ? merged : null;
  }
  return null;
}

export function mapApiError(
  err: unknown,
  fallback = "Ошибка сети или сервера",
): string {
  if (!isAxiosError(err)) {
    return err instanceof Error && err.message.trim()
      ? err.message.trim()
      : fallback;
  }

  const ax = err as AxiosError<ErrorBody>;
  if (!ax.response) {
    return ax.message?.trim() || fallback;
  }

  const { status, data } = ax.response;
  if (typeof data === "string" && data.trim()) return data.trim();

  if (typeof data === "object" && data != null) {
    const detail = detailToText(data.detail);
    if (detail) return detail;
  }

  return ax.message?.trim() || `HTTP ${status}`;
}
