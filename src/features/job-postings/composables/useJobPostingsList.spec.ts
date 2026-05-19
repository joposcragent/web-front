import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

import { useJobPostingsList } from "@/features/job-postings/composables/useJobPostingsList";

const listJobPostingsMock = vi.fn();

type ListJobPostingsParams = {
  page: number;
  size: number;
  sort: "uuid_asc" | "created_at_desc";
  substring?: string;
  evaluationStatus?: string[];
  responseStatus?: string[];
};

vi.mock("@/features/job-postings/api/jobPostingsApi", () => ({
  listJobPostings: (args: ListJobPostingsParams) => listJobPostingsMock(args),
}));

describe("useJobPostingsList", () => {
  beforeEach(() => {
    listJobPostingsMock.mockReset();
    listJobPostingsMock.mockResolvedValue({
      list: [],
      totalPages: 0,
    });
  });

  it("uses created_at_desc sort for all preset by default", async () => {
    const preset = ref<"dashboard" | "all">("all");
    useJobPostingsList({
      preset,
      effectiveEvalQueryValues: () => [],
      effectiveRespQueryValues: () => [],
      registerUnmount: false,
    });

    await Promise.resolve();

    expect(listJobPostingsMock).toHaveBeenCalled();
    const firstCallArgs = listJobPostingsMock.mock
      .calls[0][0] as ListJobPostingsParams;
    expect(firstCallArgs.sort).toBe("created_at_desc");
  });
});
