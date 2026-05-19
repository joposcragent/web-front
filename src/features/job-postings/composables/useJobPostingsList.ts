import { computed, onBeforeUnmount, ref, watch, type Ref } from "vue";

import { mapApiError } from "@/shared/api/mapApiError";
import {
  listJobPostings,
  type JobPostingListSort,
} from "@/features/job-postings/api/jobPostingsApi";
import type { JobPostingsItem } from "@/api/types";

type TableSortUpdate = {
  sortBy?: { key: string; order: boolean | "asc" | "desc" }[];
};

const SORT_BY_KEY: Record<string, JobPostingListSort> = {
  createdAt: "created_at_desc",
};

function resolveServerSort(
  input: { key: string; order: "asc" | "desc" }[] | undefined,
): JobPostingListSort {
  const top = input?.[0];
  if (!top) return "uuid_asc";
  if (top.key === "createdAt" && top.order === "desc") return "created_at_desc";
  return SORT_BY_KEY[top.key] ?? "uuid_asc";
}

export function useJobPostingsList(params: {
  preset: Ref<"dashboard" | "all">;
  effectiveEvalQueryValues: () => string[];
  effectiveRespQueryValues: () => string[];
  registerUnmount?: boolean;
}) {
  const {
    preset,
    effectiveEvalQueryValues,
    effectiveRespQueryValues,
    registerUnmount = true,
  } = params;

  const PER_PAGE = [10, 30, 50, 80, 130] as const;

  const items = ref<JobPostingsItem[]>([]);
  const totalPages = ref(0);
  const page = ref(1);
  const itemsPerPage = ref(10);
  const loading = ref(false);
  const listError = ref<string | null>(null);

  const searchFilter = ref("");
  const searchDebounced = ref("");
  const sortBy = ref<{ key: string; order: "asc" | "desc" }[]>([]);

  const serverSort = computed<JobPostingListSort>(() => {
    const explicit = resolveServerSort(sortBy.value);
    if (explicit !== "uuid_asc") return explicit;
    if (preset.value === "all") return "created_at_desc";
    return "uuid_asc";
  });

  const itemsLength = computed(() => {
    if (totalPages.value <= 0) return 0;
    return totalPages.value * itemsPerPage.value;
  });

  const emptyHint = computed(() => {
    if (listError.value) return "Нет данных";
    return preset.value === "all" ? "Нет вакансий" : "Нет подходящих вакансий";
  });

  let searchTimer: ReturnType<typeof setTimeout> | undefined;

  watch(searchFilter, (value) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      searchDebounced.value = value;
      page.value = 1;
    }, 350);
  });

  if (registerUnmount) {
    onBeforeUnmount(() => {
      clearTimeout(searchTimer);
    });
  }

  async function fetchList() {
    loading.value = true;
    listError.value = null;
    try {
      const data = await listJobPostings({
        page: page.value,
        size: itemsPerPage.value,
        sort: serverSort.value,
        substring: searchDebounced.value.trim() || undefined,
        evaluationStatus: effectiveEvalQueryValues(),
        responseStatus: effectiveRespQueryValues(),
      });
      items.value = data.list ?? [];
      totalPages.value = data.totalPages ?? 0;
    } catch (error) {
      listError.value = mapApiError(error, "Ошибка загрузки");
      items.value = [];
      totalPages.value = 0;
    } finally {
      loading.value = false;
    }
  }

  watch(
    [
      page,
      itemsPerPage,
      searchDebounced,
      serverSort,
      () => preset.value,
      () => effectiveEvalQueryValues().join("|"),
      () => effectiveRespQueryValues().join("|"),
    ],
    fetchList,
    { immediate: true },
  );

  function onTableUpdate(opt: TableSortUpdate) {
    sortBy.value = (opt.sortBy ?? []).map((item) => ({
      key: item.key,
      order: item.order === "desc" ? "desc" : "asc",
    }));
    page.value = 1;
  }

  return {
    PER_PAGE,
    items,
    totalPages,
    page,
    itemsPerPage,
    loading,
    listError,
    searchFilter,
    searchDebounced,
    sortBy,
    itemsLength,
    emptyHint,
    fetchList,
    onTableUpdate,
  };
}
