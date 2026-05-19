<script setup lang="ts">
import type { AsyncJobItemDto, AsyncJobStatusDto } from "@/api/types";
import { jsonPreview, textPreview } from "@/shared/lib/jsonPreview";
import {
  formatDisplayDateTime,
  formatDisplayDateTimeFull,
} from "@/utils/displayDateTime";
import { RouterLink } from "vue-router";

type Header = { title: string; key: string; sortable: boolean; width?: number };

const props = defineProps<{
  loading: boolean;
  error: string | null;
  jobs: AsyncJobItemDto[];
}>();

const emit = defineEmits<{
  closeError: [];
}>();

const headers: Header[] = [
  { title: "Джоб", key: "name", sortable: false },
  { title: "Родитель", key: "parentUuid", sortable: false },
  { title: "Статус", key: "status", sortable: false, width: 120 },
  { title: "Начало", key: "started_at", sortable: false },
  { title: "Окончание", key: "finished_at", sortable: false },
  { title: "Результат", key: "result", sortable: false },
  { title: "Контекст", key: "context", sortable: false },
];

function orchestratorJobLink(item: AsyncJobItemDto) {
  return {
    name: "orchestrator-async-jobs" as const,
    query: { jobUuid: item.uuid, openDetail: "1" },
  };
}

function asyncJobStatusClass(status: AsyncJobStatusDto): string {
  switch (status) {
    case "STARTED":
      return "text-primary";
    case "SUCCEEDED":
      return "text-success";
    case "FAILED":
      return "text-error";
    case "CANCELED":
      return "text-medium-emphasis";
    default:
      return "";
  }
}

function jsonPreviewCell(v: unknown, max = 96): string {
  return jsonPreview(v, max);
}

function resultPreviewCell(s: string | null | undefined, max = 96): string {
  return textPreview(s, max);
}
</script>

<template>
  <div class="mt-8">
    <h2 class="text-h6 font-weight-regular mb-3">
      Последние джобы сбора вакансий
    </h2>
    <v-progress-linear
      v-if="props.loading"
      indeterminate
      color="primary"
      class="mb-2"
    />
    <v-alert
      v-if="props.error"
      type="error"
      variant="tonal"
      class="mb-3"
      closable
      @click:close="emit('closeError')"
    >
      {{ props.error }}
    </v-alert>
    <v-data-table
      v-else-if="!props.loading"
      :headers="headers"
      :items="props.jobs"
      item-value="uuid"
      :items-per-page="-1"
      hide-default-footer
      density="compact"
      class="elevation-0 border rounded-lg last-root-jobs-table"
    >
      <template #no-data>
        <div class="py-6 text-medium-emphasis text-body-2">Нет данных</div>
      </template>
      <template #item.name="{ item }">
        <RouterLink
          :to="orchestratorJobLink(item)"
          class="text-primary text-decoration-none text-body-2 d-block text-truncate"
        >
          {{ item.name }}
        </RouterLink>
      </template>
      <template #item.parentUuid="{ item }">
        <RouterLink
          :to="orchestratorJobLink(item)"
          class="text-primary text-decoration-none text-body-2 d-block text-truncate"
        >
          {{ item.parentUuid ?? "—" }}
        </RouterLink>
      </template>
      <template #item.status="{ item }">
        <RouterLink
          :to="orchestratorJobLink(item)"
          class="text-decoration-none text-body-2 d-block text-truncate"
          :class="asyncJobStatusClass(item.status)"
        >
          {{ item.status }}
        </RouterLink>
      </template>
      <template #item.started_at="{ item }">
        <RouterLink
          :to="orchestratorJobLink(item)"
          class="text-primary text-decoration-none text-body-2 d-block text-truncate"
        >
          <v-tooltip
            v-if="item.started_at"
            location="top"
            :text="formatDisplayDateTimeFull(item.started_at)"
          >
            <template #activator="{ props: tipProps }">
              <span v-bind="tipProps">{{
                formatDisplayDateTime(item.started_at)
              }}</span>
            </template>
          </v-tooltip>
          <span v-else>—</span>
        </RouterLink>
      </template>
      <template #item.finished_at="{ item }">
        <RouterLink
          :to="orchestratorJobLink(item)"
          class="text-primary text-decoration-none text-body-2 d-block text-truncate"
        >
          <v-tooltip
            v-if="item.finished_at"
            location="top"
            :text="formatDisplayDateTimeFull(item.finished_at)"
          >
            <template #activator="{ props: tipProps }">
              <span v-bind="tipProps">{{
                formatDisplayDateTime(item.finished_at)
              }}</span>
            </template>
          </v-tooltip>
          <span v-else>—</span>
        </RouterLink>
      </template>
      <template #item.result="{ item }">
        <RouterLink
          :to="orchestratorJobLink(item)"
          class="text-primary text-decoration-none text-body-2 d-block text-truncate"
          :title="item.result ?? undefined"
        >
          {{ resultPreviewCell(item.result) }}
        </RouterLink>
      </template>
      <template #item.context="{ item }">
        <RouterLink
          :to="orchestratorJobLink(item)"
          class="text-primary text-decoration-none text-body-2 d-block text-truncate"
          :title="jsonPreviewCell(item.context)"
        >
          {{ jsonPreviewCell(item.context) }}
        </RouterLink>
      </template>
    </v-data-table>
  </div>
</template>
