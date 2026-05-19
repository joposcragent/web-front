import { reactive } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RouteLocationNormalizedLoaded, Router } from "vue-router";

import { useSearchQueryFocus } from "@/features/search-queries/composables/useSearchQueryFocus";

type FakeRoute = {
  path: string;
  query: Record<string, unknown>;
};

function nextTickPromise() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("useSearchQueryFocus", () => {
  let route: FakeRoute;
  let replace: ReturnType<typeof vi.fn>;
  let openEditByUuid: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    route = reactive({
      path: "/settings/search-queries",
      query: {},
    });
    replace = vi.fn().mockResolvedValue(undefined);
    openEditByUuid = vi.fn().mockResolvedValue(undefined);
  });

  it("consumes focus query on init", async () => {
    route.query.focus = "abc-uuid";
    const { consumeFocus } = useSearchQueryFocus({
      route: route as unknown as RouteLocationNormalizedLoaded,
      router: { replace } as unknown as Router,
      openEditByUuid,
      immediate: false,
    });
    await consumeFocus();

    expect(openEditByUuid).toHaveBeenCalledOnce();
    expect(openEditByUuid).toHaveBeenCalledWith("abc-uuid");
    expect(replace).toHaveBeenCalledWith({
      path: "/settings/search-queries",
      query: {},
    });
  });

  it("reacts to focus query changes", async () => {
    useSearchQueryFocus({
      route: route as unknown as RouteLocationNormalizedLoaded,
      router: { replace } as unknown as Router,
      openEditByUuid,
      immediate: true,
    });

    route.query.focus = "next-uuid";
    await nextTickPromise();

    expect(openEditByUuid).toHaveBeenCalledWith("next-uuid");
    expect(replace).toHaveBeenCalledWith({
      path: "/settings/search-queries",
      query: {},
    });
  });
});
