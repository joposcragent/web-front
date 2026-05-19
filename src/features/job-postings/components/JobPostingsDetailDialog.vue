<script setup lang="ts">
import type {
  EvaluationStatus,
  JobPostingsItem,
  ResponseStatus,
} from "@/api/types";
import {
  formatDisplayDateOnly,
  formatDisplayDateTime,
  formatDisplayDateTimeFull,
} from "@/utils/displayDateTime";

const props = defineProps<{
  item: JobPostingsItem | null;
  evaluateLoading: boolean;
}>();

const emit = defineEmits<{
  close: [];
  evaluate: [];
}>();

function close() {
  emit("close");
}

function evaluate() {
  emit("evaluate");
}

function contentVectorSummary(v: number[] | null | undefined): string {
  if (v == null || v.length === 0) return "—";
  return `вектор из ${v.length} чисел`;
}

function evalLabel(status: EvaluationStatus | null | undefined): string {
  return status ?? "—";
}

function responseLabel(status: ResponseStatus | null | undefined): string {
  return status ?? "—";
}
</script>

<template>
  <v-dialog
    :model-value="props.item != null"
    width="auto"
    max-width="calc(100vw - 24px)"
    @update:model-value="
      (v: boolean) => {
        if (!v) close();
      }
    "
  >
    <v-card v-if="props.item" class="job-detail-card d-flex flex-column">
      <v-card-title class="text-h6 font-weight-regular text-wrap flex-shrink-0">
        {{ props.item.title }}
      </v-card-title>
      <v-card-text class="job-detail-card__body pa-4">
        <dl class="job-detail-dl text-body-2">
          <dt>uuid</dt>
          <dd>{{ props.item.uuid }}</dd>
          <dt>searchQueryUuid</dt>
          <dd>{{ props.item.searchQueryUuid }}</dd>
          <dt>uid</dt>
          <dd>{{ props.item.uid }}</dd>
          <dt>url</dt>
          <dd>
            <a
              :href="props.item.url"
              target="_blank"
              rel="noopener noreferrer"
              class="text-primary"
            >
              {{ props.item.url }}
            </a>
          </dd>
          <dt>company</dt>
          <dd>{{ props.item.company ?? "—" }}</dd>
          <dt>relevance</dt>
          <dd>
            {{ props.item.relevance != null ? props.item.relevance : "—" }}
          </dd>
          <dt>evaluationStatus</dt>
          <dd>{{ evalLabel(props.item.evaluationStatus) }}</dd>
          <dt>responseStatus</dt>
          <dd>{{ responseLabel(props.item.responseStatus) }}</dd>
          <dt>publicationDate</dt>
          <dd>
            <v-tooltip
              v-if="props.item.publicationDate"
              location="top"
              :text="formatDisplayDateTimeFull(props.item.publicationDate)"
            >
              <template #activator="{ props: tipProps }">
                <span v-bind="tipProps">{{
                  formatDisplayDateOnly(props.item.publicationDate)
                }}</span>
              </template>
            </v-tooltip>
            <span v-else>—</span>
          </dd>
          <dt>createdAt</dt>
          <dd>
            <v-tooltip
              v-if="props.item.createdAt"
              location="top"
              :text="formatDisplayDateTimeFull(props.item.createdAt)"
            >
              <template #activator="{ props: tipProps }">
                <span v-bind="tipProps">{{
                  formatDisplayDateTime(props.item.createdAt)
                }}</span>
              </template>
            </v-tooltip>
            <span v-else>—</span>
          </dd>
          <dt>updatedAt</dt>
          <dd>
            <v-tooltip
              v-if="props.item.updatedAt"
              location="top"
              :text="formatDisplayDateTimeFull(props.item.updatedAt)"
            >
              <template #activator="{ props: tipProps }">
                <span v-bind="tipProps">{{
                  formatDisplayDateTime(props.item.updatedAt)
                }}</span>
              </template>
            </v-tooltip>
            <span v-else>—</span>
          </dd>
          <dt>contentVector</dt>
          <dd>{{ contentVectorSummary(props.item.contentVector ?? null) }}</dd>
          <dt>content</dt>
          <dd>
            <pre class="content-dialog__pre text-body-2 ma-0">{{
              props.item.content ?? "—"
            }}</pre>
          </dd>
        </dl>
      </v-card-text>
      <v-card-actions class="flex-shrink-0">
        <v-btn
          color="primary"
          variant="flat"
          :loading="props.evaluateLoading"
          @click="evaluate"
        >
          Оценить
        </v-btn>
        <v-spacer />
        <v-btn @click="close">Закрыть</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
