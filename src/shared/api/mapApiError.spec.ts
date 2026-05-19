import { describe, expect, it } from "vitest";

import { mapApiError } from "@/shared/api/mapApiError";

function axiosLikeError(payload: {
  status?: number;
  data?: unknown;
  message?: string;
  noResponse?: boolean;
}) {
  return {
    isAxiosError: true,
    message: payload.message ?? "Request failed",
    response: payload.noResponse
      ? undefined
      : {
          status: payload.status ?? 500,
          data: payload.data,
        },
  };
}

describe("mapApiError", () => {
  it("returns backend string error body", () => {
    const err = axiosLikeError({ data: "Backend error" });
    expect(mapApiError(err)).toBe("Backend error");
  });

  it("extracts detail from array body", () => {
    const err = axiosLikeError({
      data: {
        detail: [{ msg: "field is required" }, { msg: "must be valid UUID" }],
      },
    });
    expect(mapApiError(err)).toBe("field is required; must be valid UUID");
  });

  it("falls back to transport message when no response", () => {
    const err = axiosLikeError({ noResponse: true, message: "Network Error" });
    expect(mapApiError(err)).toBe("Network Error");
  });

  it("uses fallback for non-axios unknown errors", () => {
    expect(mapApiError("bad")).toBe("Ошибка сети или сервера");
  });
});
