<script setup lang="ts">
import {
  conductorErrorMessage,
  postEnqueueCollectionBatch,
} from "@/api/conductorEnqueue";
import type {
  AsyncJobItemDto,
  EvaluationStatus,
  JobPostingsItem,
  PromptTemplate,
  ReferenceContext,
  ResponseStatus,
} from "@/api/types";
import JobPostingsRootJobsTable from "@/features/job-postings/components/JobPostingsRootJobsTable.vue";
import JobPostingsDetailDialog from "@/features/job-postings/components/JobPostingsDetailDialog.vue";
import JobPostingsNotesDialog from "@/features/job-postings/components/JobPostingsNotesDialog.vue";
import JobPostingsPromptDialog from "@/features/job-postings/components/JobPostingsPromptDialog.vue";
import {
  evaluateJobPosting,
  getJobPosting,
  getPromptTemplate,
  getReferenceContext,
  listSearchQueries,
  updateEvaluationStatus,
  updateResponseStatus,
} from "@/features/job-postings/api/jobPostingsApi";
import { useJobPostingsFilters } from "@/features/job-postings/composables/useJobPostingsFilters";
import { useJobPostingsList } from "@/features/job-postings/composables/useJobPostingsList";
import { useJobPostingsNotes } from "@/features/job-postings/composables/useJobPostingsNotes";
import { listLastRootJobsStatus } from "@/features/orchestrator/api/asyncJobsApi";
import { mapApiError } from "@/shared/api/mapApiError";
import {
  formatDisplayDateOnly,
  formatDisplayDateTime,
  formatDisplayDateTimeFull,
} from "@/utils/displayDateTime";
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import { useTheme } from "vuetify";

import promptDarkSvg from "@/assets/job-postings-icons/prompt-dark.svg";
import promptLightSvg from "@/assets/job-postings-icons/prompt-light.svg";
import notesDarkSvg from "@/assets/job-postings-icons/notes-dark.svg";
import notesLightSvg from "@/assets/job-postings-icons/notes-light.svg";
import noNotesDarkSvg from "@/assets/job-postings-icons/no-notes-dark.svg";
import noNotesLightSvg from "@/assets/job-postings-icons/no-notes-light.svg";

const props = defineProps<{
  /** `dashboard` — отбор как на дашборде; `all` — все вакансии, сортировка по дате загрузки на сервере */
  preset: "dashboard" | "all";
}>();

const theme = useTheme();
const isDark = computed(() => theme.global.current.value.dark);
const promptIconSrc = computed(() =>
  isDark.value ? promptDarkSvg : promptLightSvg,
);

const EVALUATION_OPTIONS: { title: string; value: EvaluationStatus }[] = [
  { title: "NEW", value: "NEW" },
  { title: "PENDING", value: "PENDING" },
  { title: "IRRELEVANT", value: "IRRELEVANT" },
  { title: "RELEVANT", value: "RELEVANT" },
];

const RESPONSE_OPTIONS: { title: string; value: ResponseStatus }[] = [
  { title: "NEW", value: "NEW" },
  { title: "NOT_INTERESTED", value: "NOT_INTERESTED" },
  { title: "RESPONDED", value: "RESPONDED" },
  { title: "REJECTED", value: "REJECTED" },
];

const EVAL_FILTER_OPTS: { title: string; value: string }[] = [
  ...EVALUATION_OPTIONS.map((o) => ({ title: o.title, value: o.value })),
  { title: "(пусто)", value: "NULL" },
];

const RESPONSE_FILTER_OPTS: { title: string; value: string }[] = [
  ...RESPONSE_OPTIONS.map((o) => ({ title: o.title, value: o.value })),
  { title: "(пусто)", value: "NULL" },
];

type TableHeaderRow = {
  title: string;
  key: string;
  sortable: boolean;
  width?: number;
};

const BASE_HEADERS: TableHeaderRow[] = [
  { title: "Название", key: "title", sortable: true },
  { title: "Запрос", key: "searchQuery", sortable: false },
  { title: "URL", key: "url", sortable: false },
  { title: "Оценка", key: "evaluationStatus", sortable: false },
  { title: "Рассмотрение", key: "responseStatus", sortable: false },
  { title: "Релевантность", key: "relevance", sortable: true },
  { title: "Компания", key: "company", sortable: true },
  { title: "Публикация", key: "publicationDate", sortable: true },
  { title: "Загрузка", key: "createdAt", sortable: true },
  { title: "Обновление", key: "updatedAt", sortable: true },
];

const tableHeaders = computed(() => [...BASE_HEADERS]);

const snackbar = ref(false);
const snackbarText = ref("");

function showError(msg: string) {
  snackbarText.value = msg;
  snackbar.value = true;
}

const filters = useJobPostingsFilters({
  preset: () => props.preset,
  evalOptions: EVAL_FILTER_OPTS,
  responseOptions: RESPONSE_FILTER_OPTS,
});

const {
  evalFilterMenu,
  respFilterMenu,
  evalDraft,
  respDraft,
  openEvalFilterMenu,
  openRespFilterMenu,
  applyEvalFilter,
  clearEvalFilter,
  applyRespFilter,
  clearRespFilter,
} = filters;

const presetRef = computed(() => props.preset);
const {
  PER_PAGE,
  items,
  page,
  itemsPerPage,
  loading,
  listError,
  searchFilter,
  itemsLength,
  emptyHint,
  onTableUpdate,
} = useJobPostingsList({
  preset: presetRef,
  effectiveEvalQueryValues: filters.effectiveEvalQueryValues,
  effectiveRespQueryValues: filters.effectiveRespQueryValues,
});

const {
  notesDialogVisible,
  notesDraft,
  notesLoadingUuid,
  notesSaving,
  notesFilledByUuid,
  openNotes,
  saveNotes,
  discardNotesDialog,
} = useJobPostingsNotes({
  items,
  onError: showError,
});

const searchQueryNameByUuid = ref<Record<string, string>>({});

onMounted(async () => {
  try {
    const queries = await listSearchQueries();
    const namesMap: Record<string, string> = {};
    for (const query of queries) {
      namesMap[query.uuid] = query.name;
    }
    searchQueryNameByUuid.value = namesMap;
  } catch {
    searchQueryNameByUuid.value = {};
  }
});

function searchQueryLabel(uuid: string): string {
  return searchQueryNameByUuid.value[uuid] ?? shortUuid(uuid);
}

function shortUuid(uuid: string): string {
  if (uuid.length <= 12) return uuid;
  return `${uuid.slice(0, 8)}…`;
}

function notesIconSrc(uuid: string): string {
  const filled = notesFilledByUuid.value[uuid] === true;
  return isDark.value
    ? filled
      ? notesDarkSvg
      : noNotesDarkSvg
    : filled
      ? notesLightSvg
      : noNotesLightSvg;
}

const promptComposeDialog = ref(false);
const promptComposeText = ref("");
const promptLoadingUuid = ref<string | null>(null);

/** Литералы `\\n` / `\\r` из API или БД → настоящие переводы строк в собранном промпте. */
function unescapeNewlinesInPromptText(s: string): string {
  return s
    .replaceAll("\\r\\n", "\n")
    .replaceAll("\\n", "\n")
    .replaceAll("\\r", "\n");
}

function fillCoverLetterPrompt(
  template: string,
  jobPosting: string,
  resume: string,
): string {
  const composed = template
    .replaceAll("${JOB_POSTING_CONTENT}", jobPosting)
    .replaceAll("${RESUME}", resume);
  return unescapeNewlinesInPromptText(composed);
}

async function openCoverLetterPrompt(row: JobPostingsItem) {
  promptLoadingUuid.value = row.uuid;
  try {
    const tplRes = await getPromptTemplate();
    if (tplRes.status === 404) {
      showError("Шаблон промпта не найден");
      return;
    }

    const refRes = await getReferenceContext();
    if (refRes.status === 404 || refRes.status === 202) {
      showError("Сначала задайте эталонный контекст (резюме) в настройках");
      return;
    }
    if (refRes.status === 500) {
      showError("Не удалось загрузить эталонный контекст");
      return;
    }

    const ref = refRes.data as ReferenceContext;
    const tpl = (tplRes.data as PromptTemplate).template ?? "";
    promptComposeText.value = fillCoverLetterPrompt(
      tpl,
      row.content ?? "",
      ref.context ?? "",
    );
    promptComposeDialog.value = true;
  } catch {
    showError("Не удалось собрать промпт");
  } finally {
    promptLoadingUuid.value = null;
  }
}

const detailItem = ref<JobPostingsItem | null>(null);

function openJobDetail(item: JobPostingsItem) {
  detailItem.value = { ...item };
}

const detailEvaluateLoading = ref(false);

function replaceListItem(updated: JobPostingsItem) {
  items.value = items.value.map((row) =>
    row.uuid === updated.uuid ? { ...updated } : row,
  );
}

function patchListItem(uuid: string, patch: Partial<JobPostingsItem>) {
  items.value = items.value.map((row) =>
    row.uuid === uuid ? { ...row, ...patch } : row,
  );
}

async function evaluateCurrentVacancy() {
  if (!detailItem.value) return;
  const id = detailItem.value.uuid;
  detailEvaluateLoading.value = true;
  try {
    await evaluateJobPosting(id);
    const data = await getJobPosting(id);
    detailItem.value = { ...data };
    replaceListItem(data);
  } catch {
    showError("Не удалось выполнить оценку");
  } finally {
    detailEvaluateLoading.value = false;
  }
}

async function postEvaluation(
  uuid: string,
  status: EvaluationStatus,
  revert: () => void,
) {
  try {
    await updateEvaluationStatus(uuid, status);
  } catch {
    revert();
    showError("Не удалось сохранить статус оценки");
  }
}

async function postResponse(
  uuid: string,
  status: ResponseStatus,
  revert: () => void,
) {
  try {
    await updateResponseStatus(uuid, status);
  } catch {
    revert();
    showError("Не удалось сохранить статус рассмотрения");
  }
}

function evalLabel(status: EvaluationStatus | null | undefined): string {
  if (status == null) return "—";
  return EVALUATION_OPTIONS.find((o) => o.value === status)?.title ?? status;
}

function responseLabel(status: ResponseStatus | null | undefined): string {
  if (status == null) return "—";
  return RESPONSE_OPTIONS.find((o) => o.value === status)?.title ?? status;
}

function onEvalInput(row: JobPostingsItem, next: EvaluationStatus | null) {
  if (next == null) return;
  const prev = row.evaluationStatus ?? null;
  patchListItem(row.uuid, { evaluationStatus: next });
  void postEvaluation(row.uuid, next, () => {
    patchListItem(row.uuid, { evaluationStatus: prev });
  });
}

function onResponseInput(row: JobPostingsItem, next: ResponseStatus | null) {
  if (next == null) return;
  const prev = row.responseStatus;
  patchListItem(row.uuid, { responseStatus: next });
  void postResponse(row.uuid, next, () => {
    patchListItem(row.uuid, { responseStatus: prev });
  });
}

const rootJobs = ref<AsyncJobItemDto[]>([]);
const rootJobsLoading = ref(false);
const rootJobsError = ref<string | null>(null);

async function fetchLastRootJobs() {
  rootJobsLoading.value = true;
  rootJobsError.value = null;
  try {
    rootJobs.value = await listLastRootJobsStatus();
  } catch (error) {
    rootJobs.value = [];
    rootJobsError.value = mapApiError(error, "Ошибка загрузки");
  } finally {
    rootJobsLoading.value = false;
  }
}

watch(
  () => props.preset,
  (preset) => {
    if (preset === "dashboard") void fetchLastRootJobs();
  },
  { immediate: true },
);

function closeRootJobsError() {
  rootJobsError.value = null;
}

const collectBatchLoading = ref(false);

async function runCollectBatch() {
  collectBatchLoading.value = true;
  try {
    await postEnqueueCollectionBatch();
    snackbarText.value = "Сбор вакансий поставлен в очередь";
    snackbar.value = true;
  } catch (error) {
    showError(conductorErrorMessage(error));
  } finally {
    collectBatchLoading.value = false;
  }
}

function closeDetailDialog() {
  detailItem.value = null;
}

function closePromptDialog() {
  promptComposeDialog.value = false;
}

function onNotesDraftUpdate(next: string) {
  notesDraft.value = next;
}
</script>

<template>
  <div>
    <p v-if="listError" class="text-error mb-4">{{ listError }}</p>

    <v-row class="mb-6" dense>
      <v-col cols="12" md="6" lg="5">
        <v-text-field
          v-model="searchFilter"
          label="Поиск"
          variant="outlined"
          density="comfortable"
          hide-details
          clearable
        />
      </v-col>
    </v-row>

    <v-data-table-server
      v-model:page="page"
      v-model:items-per-page="itemsPerPage"
      :headers="tableHeaders"
      :items="items"
      :items-length="itemsLength"
      :loading="loading"
      :items-per-page-options="[...PER_PAGE]"
      hover
      class="elevation-0 border rounded-lg job-postings-table"
      @update:options="onTableUpdate"
    >
      <template #no-data>
        <div class="py-12 text-medium-emphasis">
          {{ emptyHint }}
        </div>
      </template>

      <template #header.evaluationStatus>
        <div class="d-flex align-center gap-1 flex-nowrap">
          <span>Оценка</span>
          <v-menu
            v-model="evalFilterMenu"
            location="bottom"
            :close-on-content-click="false"
            @update:model-value="(v: boolean) => v && openEvalFilterMenu()"
          >
            <template #activator="{ props: menuProps }">
              <v-btn
                v-bind="menuProps"
                icon
                variant="text"
                size="x-small"
                density="compact"
                class="text-medium-emphasis"
                aria-label="Фильтр по статусу оценки"
              >
                🌪️
              </v-btn>
            </template>
            <v-card min-width="240">
              <v-list density="compact" class="py-2">
                <v-list-item
                  v-for="opt in EVAL_FILTER_OPTS"
                  :key="opt.value"
                  class="px-2"
                >
                  <template #prepend>
                    <v-checkbox
                      v-model="evalDraft[opt.value]"
                      hide-details
                      density="compact"
                      color="primary"
                    />
                  </template>
                  <v-list-item-title class="text-body-2">{{
                    opt.title
                  }}</v-list-item-title>
                </v-list-item>
              </v-list>
              <v-divider />
              <v-card-actions class="px-2 py-2">
                <v-btn
                  size="small"
                  variant="flat"
                  color="primary"
                  @click="applyEvalFilter"
                  >ОК</v-btn
                >
                <v-btn size="small" variant="text" @click="clearEvalFilter"
                  >Очистить</v-btn
                >
              </v-card-actions>
            </v-card>
          </v-menu>
        </div>
      </template>

      <template #header.responseStatus>
        <div class="d-flex align-center gap-1 flex-nowrap">
          <span>Рассмотрение</span>
          <v-menu
            v-model="respFilterMenu"
            location="bottom"
            :close-on-content-click="false"
            @update:model-value="(v: boolean) => v && openRespFilterMenu()"
          >
            <template #activator="{ props: menuProps }">
              <v-btn
                v-bind="menuProps"
                icon
                variant="text"
                size="x-small"
                density="compact"
                class="text-medium-emphasis"
                aria-label="Фильтр по статусу рассмотрения"
              >
                🌪️
              </v-btn>
            </template>
            <v-card min-width="260">
              <v-list density="compact" class="py-2">
                <v-list-item
                  v-for="opt in RESPONSE_FILTER_OPTS"
                  :key="opt.value"
                  class="px-2"
                >
                  <template #prepend>
                    <v-checkbox
                      v-model="respDraft[opt.value]"
                      hide-details
                      density="compact"
                      color="primary"
                    />
                  </template>
                  <v-list-item-title class="text-body-2">{{
                    opt.title
                  }}</v-list-item-title>
                </v-list-item>
              </v-list>
              <v-divider />
              <v-card-actions class="px-2 py-2">
                <v-btn
                  size="small"
                  variant="flat"
                  color="primary"
                  @click="applyRespFilter"
                  >ОК</v-btn
                >
                <v-btn size="small" variant="text" @click="clearRespFilter"
                  >Очистить</v-btn
                >
              </v-card-actions>
            </v-card>
          </v-menu>
        </div>
      </template>

      <template #item.title="{ item }">
        <div class="d-flex align-center flex-wrap gap-1 job-title-row">
          <v-btn
            variant="text"
            color="primary"
            class="job-title-btn text-body-2 px-0 text-start"
            min-width="0"
            max-width="100%"
            @click="openJobDetail(item)"
          >
            {{ item.title }}
          </v-btn>
          <v-btn
            variant="text"
            density="compact"
            min-width="0"
            class="px-1 job-postings-icon-btn"
            :loading="notesLoadingUuid === item.uuid"
            aria-label="Заметки к вакансии"
            @click="openNotes(item)"
          >
            <img
              class="job-postings-action-icon"
              :src="notesIconSrc(item.uuid)"
              width="22"
              height="22"
              alt=""
            />
          </v-btn>
          <v-btn
            v-if="preset === 'dashboard'"
            variant="text"
            density="compact"
            min-width="0"
            class="px-1 job-postings-icon-btn"
            :loading="promptLoadingUuid === item.uuid"
            aria-label="Промпт для письма"
            @click="openCoverLetterPrompt(item)"
          >
            <img
              class="job-postings-action-icon"
              :src="promptIconSrc"
              width="22"
              height="22"
              alt=""
            />
          </v-btn>
        </div>
      </template>

      <template #item.searchQuery="{ item }">
        <RouterLink
          v-if="searchQueryNameByUuid[item.searchQueryUuid]"
          :to="{
            name: 'search-queries',
            query: { focus: item.searchQueryUuid },
          }"
          class="text-primary text-decoration-none"
        >
          {{ searchQueryNameByUuid[item.searchQueryUuid] }}
        </RouterLink>
        <span v-else class="text-medium-emphasis">{{
          searchQueryLabel(item.searchQueryUuid)
        }}</span>
      </template>

      <template #item.url="{ item }">
        <a
          :href="item.url"
          target="_blank"
          rel="noopener noreferrer"
          class="text-decoration-none"
          >{{ item.url }}</a
        >
      </template>

      <template #item.evaluationStatus="{ item }">
        <v-menu location="bottom start" :close-on-content-click="true">
          <template #activator="{ props: menuActivatorProps }">
            <v-btn
              v-bind="menuActivatorProps"
              variant="text"
              density="compact"
              class="status-trigger status-trigger--eval text-body-2"
              min-width="0"
            >
              <span class="text-truncate">{{
                evalLabel(item.evaluationStatus)
              }}</span>
              <v-icon class="ml-1 flex-shrink-0" size="small"
                >mdi-menu-down</v-icon
              >
            </v-btn>
          </template>
          <v-list density="compact" class="py-0" min-width="160">
            <v-list-item
              v-for="opt in EVALUATION_OPTIONS"
              :key="opt.value"
              :active="opt.value === item.evaluationStatus"
              @click="onEvalInput(item, opt.value)"
            >
              <v-list-item-title>{{ opt.title }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </template>

      <template #item.responseStatus="{ item }">
        <v-menu location="bottom start" :close-on-content-click="true">
          <template #activator="{ props: menuActivatorProps }">
            <v-btn
              v-bind="menuActivatorProps"
              variant="text"
              density="compact"
              class="status-trigger status-trigger--response text-body-2"
              min-width="0"
            >
              <span class="text-truncate">{{
                responseLabel(item.responseStatus)
              }}</span>
              <v-icon class="ml-1 flex-shrink-0" size="small"
                >mdi-menu-down</v-icon
              >
            </v-btn>
          </template>
          <v-list density="compact" class="py-0" min-width="180">
            <v-list-item
              v-for="opt in RESPONSE_OPTIONS"
              :key="opt.value"
              :active="opt.value === item.responseStatus"
              @click="onResponseInput(item, opt.value)"
            >
              <v-list-item-title>{{ opt.title }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </template>

      <template #item.relevance="{ item }">
        {{ item.relevance != null ? item.relevance : "—" }}
      </template>

      <template #item.company="{ item }">
        {{ item.company ?? "—" }}
      </template>

      <template #item.publicationDate="{ item }">
        <v-tooltip
          v-if="item.publicationDate"
          location="top"
          :text="formatDisplayDateTimeFull(item.publicationDate)"
        >
          <template #activator="{ props: tipProps }">
            <span v-bind="tipProps" class="cursor-default">{{
              formatDisplayDateOnly(item.publicationDate)
            }}</span>
          </template>
        </v-tooltip>
        <span v-else>—</span>
      </template>

      <template #item.createdAt="{ item }">
        <v-tooltip
          v-if="item.createdAt"
          location="top"
          :text="formatDisplayDateTimeFull(item.createdAt)"
        >
          <template #activator="{ props: tipProps }">
            <span v-bind="tipProps" class="cursor-default">{{
              formatDisplayDateTime(item.createdAt)
            }}</span>
          </template>
        </v-tooltip>
        <span v-else>—</span>
      </template>

      <template #item.updatedAt="{ item }">
        <v-tooltip
          v-if="item.updatedAt"
          location="top"
          :text="formatDisplayDateTimeFull(item.updatedAt)"
        >
          <template #activator="{ props: tipProps }">
            <span v-bind="tipProps" class="cursor-default">{{
              formatDisplayDateTime(item.updatedAt)
            }}</span>
          </template>
        </v-tooltip>
        <span v-else>—</span>
      </template>
    </v-data-table-server>

    <JobPostingsRootJobsTable
      v-if="preset === 'dashboard'"
      :loading="rootJobsLoading"
      :error="rootJobsError"
      :jobs="rootJobs"
      @close-error="closeRootJobsError"
    />

    <div v-if="preset === 'dashboard'" class="mt-4">
      <v-btn
        color="primary"
        variant="flat"
        :loading="collectBatchLoading"
        @click="runCollectBatch"
      >
        Собрать вакансии
      </v-btn>
    </div>

    <JobPostingsDetailDialog
      :item="detailItem"
      :evaluate-loading="detailEvaluateLoading"
      @close="closeDetailDialog"
      @evaluate="evaluateCurrentVacancy"
    />

    <JobPostingsNotesDialog
      :model-value="notesDialogVisible"
      :notes-text="notesDraft"
      :saving="notesSaving"
      @update:model-value="
        (v: boolean) => {
          if (!v) discardNotesDialog();
        }
      "
      @update:notes-text="onNotesDraftUpdate"
      @save="saveNotes"
    />

    <JobPostingsPromptDialog
      :model-value="promptComposeDialog"
      :text="promptComposeText"
      @update:model-value="
        (v: boolean) => {
          if (!v) closePromptDialog();
        }
      "
    />

    <v-snackbar v-model="snackbar" :timeout="4000">
      {{ snackbarText }}
    </v-snackbar>
  </div>
</template>

<style scoped>
.job-title-btn {
  height: auto;
  min-height: auto;
  white-space: normal;
  word-break: break-word;
}

.status-trigger {
  justify-content: flex-start;
  text-transform: none;
  letter-spacing: normal;
}

.status-trigger--eval {
  max-width: 168px;
}

.status-trigger--response {
  max-width: 188px;
}

.content-dialog__body {
  max-height: 50vh;
  overflow-y: auto;
}

.content-dialog__pre {
  white-space: pre-wrap;
  font-family: inherit;
  word-break: break-word;
}

.job-postings-icon-btn {
  min-width: 36px;
}

.job-postings-action-icon {
  display: block;
  width: 22px;
  height: 22px;
  object-fit: contain;
}

.job-detail-card {
  resize: both;
  overflow: hidden;
  width: 720px;
  height: min(480px, 75vh);
  min-width: 280px;
  max-width: min(1200px, calc(100vw - 24px));
  min-height: 220px;
  max-height: min(92vh, 900px);
}

.job-detail-card__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
}

.job-detail-dl {
  display: grid;
  grid-template-columns: minmax(112px, 160px) minmax(0, 1fr);
  gap: 8px 16px;
  align-items: start;
}

.job-detail-dl dt {
  font-weight: 500;
  color: rgb(88 88 88);
}

.job-detail-dl dd {
  margin: 0;
  min-width: 0;
  word-break: break-word;
}

.cursor-default {
  cursor: default;
}

:deep(.job-postings-table tbody tr:hover) {
  background: rgba(var(--v-theme-primary), 0.06);
}
</style>
