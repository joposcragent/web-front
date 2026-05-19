<script setup lang="ts">
import type { SchedulerJobType, SchedulerSettingsItemDto } from "@/api/types";
import {
  listSchedulerSettings,
  runSchedulerJob,
  updateSchedulerInterval,
  updateSchedulerNextRun,
} from "@/features/scheduler/api/schedulerApi";
import { mapApiError } from "@/shared/api/mapApiError";
import {
  formatDisplayDateTime,
  formatDisplayDateTimeFull,
} from "@/utils/displayDateTime";
import { computed, onMounted, ref } from "vue";

function cellText(v: string | null): string {
  if (v == null) return "null";
  return v;
}

/** `previousRun` / `nextRun` in table: client locale and time zone; API `null` → literal `null`. */
function displaySchedulerInstant(iso: string | null): string {
  if (iso == null) return "null";
  return formatDisplayDateTime(iso);
}

function schedulerInstantTitle(iso: string | null): string | undefined {
  if (iso == null) return undefined;
  return formatDisplayDateTimeFull(iso);
}

const rows = ref<SchedulerSettingsItemDto[]>([]);
const loading = ref(false);
const pageError = ref<string | null>(null);

const editNextOpen = ref(false);
const editIntervalOpen = ref(false);
const confirmRunOpen = ref(false);
const modalError = ref<string | null>(null);
const saving = ref(false);
const running = ref(false);

const activeJob = ref<SchedulerJobType | null>(null);
const draftNextRun = ref("");
const draftInterval = ref("");

const headers = computed(() => [
  { title: "Джоб", key: "jobType", sortable: false },
  { title: "", key: "run", sortable: false, width: 56 },
  { title: "Последний запуск", key: "previousRun", sortable: false },
  { title: "Следующий запуск", key: "nextRun", sortable: false },
  { title: "Интервал", key: "interval", sortable: false },
]);

async function loadList() {
  loading.value = true;
  pageError.value = null;
  try {
    const res = await listSchedulerSettings();
    if (res.status === 500) {
      pageError.value = "Не удалось загрузить настройки планировщика";
      return;
    }
    rows.value = res.data.list ?? [];
  } catch {
    pageError.value = "Ошибка сети";
  } finally {
    loading.value = false;
  }
}

function openEditNext(job: SchedulerJobType, current: string | null) {
  activeJob.value = job;
  draftNextRun.value = current ?? "";
  modalError.value = null;
  editNextOpen.value = true;
}

function openEditInterval(job: SchedulerJobType, current: string | null) {
  activeJob.value = job;
  draftInterval.value = current ?? "";
  modalError.value = null;
  editIntervalOpen.value = true;
}

function openConfirmRun(job: SchedulerJobType) {
  activeJob.value = job;
  modalError.value = null;
  confirmRunOpen.value = true;
}

function closeEditNext() {
  editNextOpen.value = false;
}

function closeEditInterval() {
  editIntervalOpen.value = false;
}

function closeConfirmRun() {
  confirmRunOpen.value = false;
}

async function saveNextRun() {
  const job = activeJob.value;
  if (job == null) return;
  saving.value = true;
  modalError.value = null;
  try {
    await updateSchedulerNextRun(job, draftNextRun.value);
    closeEditNext();
    await loadList();
  } catch (e) {
    modalError.value = mapApiError(e);
  } finally {
    saving.value = false;
  }
}

async function saveInterval() {
  const job = activeJob.value;
  if (job == null) return;
  saving.value = true;
  modalError.value = null;
  try {
    await updateSchedulerInterval(job, draftInterval.value);
    closeEditInterval();
    await loadList();
  } catch (e) {
    modalError.value = mapApiError(e);
  } finally {
    saving.value = false;
  }
}

async function confirmExecute() {
  const job = activeJob.value;
  if (job == null) return;
  running.value = true;
  modalError.value = null;
  try {
    await runSchedulerJob(job);
    closeConfirmRun();
    await loadList();
  } catch (e) {
    modalError.value = mapApiError(e);
  } finally {
    running.value = false;
  }
}

onMounted(loadList);
</script>

<template>
  <div class="scheduler-page">
    <h1 class="text-h4 font-weight-regular mb-6">Планировщик</h1>
    <p v-if="pageError" class="text-error mb-4">
      {{ pageError }}
    </p>

    <v-progress-linear v-if="loading" class="mb-4" indeterminate />

    <v-data-table
      v-else
      :headers="headers"
      :items="rows"
      class="scheduler-table"
      density="comfortable"
      hide-default-footer
      :items-per-page="-1"
    >
      <template #item.jobType="{ item }">
        <span class="font-mono">{{ item.jobType }}</span>
      </template>
      <template #item.run="{ item }">
        <v-btn
          variant="text"
          size="small"
          class="text-h6"
          :aria-label="`Принудительно запустить ${item.jobType}`"
          @click="openConfirmRun(item.jobType)"
        >
          🚀
        </v-btn>
      </template>
      <template #item.previousRun="{ item }">
        <span
          class="text-body-2"
          :title="schedulerInstantTitle(item.previousRun)"
        >
          {{ displaySchedulerInstant(item.previousRun) }}
        </span>
      </template>
      <template #item.nextRun="{ item }">
        <button
          type="button"
          class="link-like text-body-2"
          :title="schedulerInstantTitle(item.nextRun)"
          @click="openEditNext(item.jobType, item.nextRun)"
        >
          {{ displaySchedulerInstant(item.nextRun) }}
        </button>
      </template>
      <template #item.interval="{ item }">
        <button
          type="button"
          class="link-like text-body-2 font-mono"
          @click="openEditInterval(item.jobType, item.interval)"
        >
          {{ cellText(item.interval) }}
        </button>
      </template>
    </v-data-table>

    <v-dialog
      v-model="editNextOpen"
      max-width="520"
      @keydown.esc="closeEditNext"
    >
      <v-card>
        <v-card-title>Следующий запуск</v-card-title>
        <v-card-text>
          <p v-if="modalError" class="text-error mb-2">
            {{ modalError }}
          </p>
          <p class="text-body-2 text-medium-emphasis mb-2">
            Тип: <span class="font-mono">{{ activeJob }}</span>
          </p>
          <v-text-field
            v-model="draftNextRun"
            label="Дата и время (ISO-8601, с часовым поясом)"
            variant="outlined"
            density="comfortable"
            hide-details="auto"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeEditNext"> Отмена </v-btn>
          <v-btn color="primary" :loading="saving" @click="saveNextRun">
            Сохранить
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog
      v-model="editIntervalOpen"
      max-width="520"
      @keydown.esc="closeEditInterval"
    >
      <v-card>
        <v-card-title>Интервал между запусками</v-card-title>
        <v-card-text>
          <p v-if="modalError" class="text-error mb-2">
            {{ modalError }}
          </p>
          <p class="text-body-2 text-medium-emphasis mb-2">
            Тип: <span class="font-mono">{{ activeJob }}</span>
          </p>
          <p class="text-body-2 text-medium-emphasis mb-3">
            Формат ISO-8601 duration, например
            <span class="font-mono">PT1H</span> (час) или
            <span class="font-mono">PT6H</span> (шесть часов).
          </p>
          <v-text-field
            v-model="draftInterval"
            label="Интервал (duration)"
            variant="outlined"
            density="comfortable"
            hide-details="auto"
            class="font-mono"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeEditInterval"> Отмена </v-btn>
          <v-btn color="primary" :loading="saving" @click="saveInterval">
            Сохранить
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog
      v-model="confirmRunOpen"
      max-width="480"
      @keydown.esc="closeConfirmRun"
    >
      <v-card>
        <v-card-title>Подтверждение</v-card-title>
        <v-card-text>
          <p v-if="modalError" class="text-error mb-2">
            {{ modalError }}
          </p>
          <p class="text-body-1">
            Вы уверены, что хотите принудительно запустить джоб?
          </p>
          <p class="text-body-2 text-medium-emphasis mt-2">
            Тип: <span class="font-mono">{{ activeJob }}</span>
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeConfirmRun"> Нет </v-btn>
          <v-btn color="primary" :loading="running" @click="confirmExecute">
            Да
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.scheduler-page {
  max-width: 1200px;
}

.link-like {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: rgb(var(--v-theme-primary));
  text-decoration: underline;
  text-align: left;
  font: inherit;
}

.link-like:hover {
  text-decoration: none;
}

.font-mono {
  font-family: ui-monospace, monospace;
}
</style>
