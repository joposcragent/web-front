<script setup lang="ts">
import { jobPostingsHttp } from '@/api/http'
import type {
  EvaluationStatus,
  JobPostingsItem,
  JobPostingsList,
  ResponseStatus,
} from '@/api/types'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  /** `dashboard` — отбор как на дашборде; `all` — все вакансии, сортировка по дате загрузки на сервере */
  preset: 'dashboard' | 'all'
}>()

const EVALUATION_OPTIONS: { title: string; value: EvaluationStatus }[] = [
  { title: 'NEW', value: 'NEW' },
  { title: 'PENDING', value: 'PENDING' },
  { title: 'IRRELEVANT', value: 'IRRELEVANT' },
  { title: 'RELEVANT', value: 'RELEVANT' },
]

const RESPONSE_OPTIONS: { title: string; value: ResponseStatus }[] = [
  { title: 'NEW', value: 'NEW' },
  { title: 'NOT_INTERESTED', value: 'NOT_INTERESTED' },
  { title: 'RESPONDED', value: 'RESPONDED' },
  { title: 'REJECTED', value: 'REJECTED' },
]

const PER_PAGE = [30, 50, 80, 130] as const

const headers = [
  { title: 'Название', key: 'title', sortable: true },
  { title: 'URL', key: 'url', sortable: false },
  { title: 'Оценка', key: 'evaluationStatus', sortable: true },
  { title: 'Рассмотрение', key: 'responseStatus', sortable: true },
  { title: 'Релевантность', key: 'relevance', sortable: true },
  { title: 'Компания', key: 'company', sortable: true },
  { title: 'Публикация', key: 'publicationDate', sortable: true },
  { title: 'Загрузка', key: 'createdAt', sortable: true },
]

const items = ref<JobPostingsItem[]>([])
const totalPages = ref(0)
const page = ref(1)
const itemsPerPage = ref(30)
const loading = ref(false)
const listError = ref<string | null>(null)

const titleFilter = ref('')
const companyFilter = ref('')
const titleDebounced = ref('')
const companyDebounced = ref('')

let titleTimer: ReturnType<typeof setTimeout> | undefined
let companyTimer: ReturnType<typeof setTimeout> | undefined

watch(titleFilter, (v) => {
  clearTimeout(titleTimer)
  titleTimer = setTimeout(() => {
    titleDebounced.value = v
    page.value = 1
  }, 350)
})

watch(companyFilter, (v) => {
  clearTimeout(companyTimer)
  companyTimer = setTimeout(() => {
    companyDebounced.value = v
    page.value = 1
  }, 350)
})

const itemsLength = computed(() => {
  if (totalPages.value <= 0) return 0
  return totalPages.value * itemsPerPage.value
})

const emptyHint = computed(() => {
  if (listError.value) return 'Нет данных'
  return props.preset === 'all' ? 'Нет вакансий' : 'Нет подходящих вакансий'
})

const sortBy = ref<{ key: string; order: 'asc' | 'desc' }[]>([])

const displayItems = computed(() => {
  const rows = [...items.value]
  const s = sortBy.value[0]
  if (!s) return rows
  const dir = s.order === 'desc' ? -1 : 1
  const key = s.key as keyof JobPostingsItem
  rows.sort((a, b) => {
    const va = a[key]
    const vb = b[key]
    if (va == null && vb == null) return 0
    if (va == null) return 1
    if (vb == null) return -1
    if (typeof va === 'number' && typeof vb === 'number') return va === vb ? 0 : va < vb ? -dir : dir
    return String(va).localeCompare(String(vb), 'ru') * dir
  })
  return rows
})

const contentDialog = ref(false)
const contentDialogText = ref('')

function openContent(text: string | null | undefined) {
  contentDialogText.value = text ?? ''
  contentDialog.value = true
}

function buildListParams(p: number, size: number) {
  const params: Record<string, string | number | boolean | string[]> = {
    page: p,
    size,
  }
  if (props.preset === 'dashboard') {
    params.evaluationStatus = ['RELEVANT']
    params.responseStatus = ['NEW', 'RESPONDED']
  } else {
    params.sort = 'created_at_desc'
  }
  if (titleDebounced.value.trim()) params.title = titleDebounced.value.trim()
  if (companyDebounced.value.trim()) params.company = companyDebounced.value.trim()
  return params
}

function serializeParams(params: Record<string, string | number | boolean | string[]>): string {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue
    if (Array.isArray(v)) {
      for (const item of v) p.append(k, String(item))
    } else if (typeof v === 'boolean') {
      p.append(k, v ? 'true' : 'false')
    } else {
      p.append(k, String(v))
    }
  }
  return p.toString()
}

async function fetchList() {
  loading.value = true
  listError.value = null
  try {
    const qs = serializeParams(buildListParams(page.value, itemsPerPage.value))
    const { data } = await jobPostingsHttp.get<JobPostingsList>(`/job-postings/list?${qs}`)
    items.value = data.list ?? []
    totalPages.value = data.totalPages ?? 0
  } catch (e: unknown) {
    listError.value = e instanceof Error ? e.message : 'Ошибка загрузки'
    items.value = []
    totalPages.value = 0
  } finally {
    loading.value = false
  }
}

watch([page, itemsPerPage, titleDebounced, companyDebounced], fetchList, { immediate: true })

const snackbar = ref(false)
const snackbarText = ref('')

function showError(msg: string) {
  snackbarText.value = msg
  snackbar.value = true
}

async function postEvaluation(row: JobPostingsItem, status: EvaluationStatus, revert: () => void) {
  try {
    await jobPostingsHttp.post(`/job-postings/${row.uuid}/evaluation-status/${status}`)
  } catch {
    revert()
    showError('Не удалось сохранить статус оценки')
  }
}

async function postResponse(row: JobPostingsItem, status: ResponseStatus, revert: () => void) {
  try {
    await jobPostingsHttp.post(`/job-postings/${row.uuid}/response-status/${status}`)
  } catch {
    revert()
    showError('Не удалось сохранить статус рассмотрения')
  }
}

function onTableUpdate(opt: { sortBy?: { key: string; order: boolean | 'asc' | 'desc' }[] }) {
  sortBy.value = (opt.sortBy ?? []).map((s) => ({
    key: s.key,
    order: s.order === 'desc' ? 'desc' : 'asc',
  }))
}

function onEvalInput(row: JobPostingsItem, next: EvaluationStatus | null) {
  if (next == null) return
  const prev = row.evaluationStatus ?? null
  row.evaluationStatus = next
  void postEvaluation(row, next, () => {
    row.evaluationStatus = prev
  })
}

function onResponseInput(row: JobPostingsItem, next: ResponseStatus | null) {
  if (next == null) return
  const prev = row.responseStatus
  row.responseStatus = next
  void postResponse(row, next, () => {
    row.responseStatus = prev
  })
}
</script>

<template>
  <div>
    <p v-if="listError" class="text-error mb-4">{{ listError }}</p>

    <v-row class="mb-6" dense>
      <v-col cols="12" md="4">
        <v-text-field
          v-model="titleFilter"
          label="Фильтр по названию"
          variant="outlined"
          density="comfortable"
          hide-details
          clearable
        />
      </v-col>
      <v-col cols="12" md="4">
        <v-text-field
          v-model="companyFilter"
          label="Фильтр по компании"
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
      :headers="headers"
      :items="displayItems"
      :items-length="itemsLength"
      :loading="loading"
      :items-per-page-options="[...PER_PAGE]"
      class="elevation-0 border rounded-lg"
      @update:options="onTableUpdate"
    >
      <template #no-data>
        <div class="py-12 text-medium-emphasis">
          {{ emptyHint }}
        </div>
      </template>

      <template #item.title="{ item }">
        <div class="d-flex align-center flex-wrap ga-2">
          <span>{{ item.title }}</span>
          <v-btn size="small" variant="tonal" @click="openContent(item.content)">
            Показать текст
          </v-btn>
        </div>
      </template>

      <template #item.url="{ item }">
        <a :href="item.url" target="_blank" rel="noopener noreferrer" class="text-decoration-none">{{
          item.url
        }}</a>
      </template>

      <template #item.evaluationStatus="{ item }">
        <v-select
          :model-value="item.evaluationStatus ?? undefined"
          :items="EVALUATION_OPTIONS"
          item-title="title"
          item-value="value"
          density="compact"
          variant="outlined"
          hide-details
          style="max-width: 160px"
          @update:model-value="(v) => onEvalInput(item, v as EvaluationStatus)"
        />
      </template>

      <template #item.responseStatus="{ item }">
        <v-select
          :model-value="item.responseStatus"
          :items="RESPONSE_OPTIONS"
          item-title="title"
          item-value="value"
          density="compact"
          variant="outlined"
          hide-details
          style="max-width: 180px"
          @update:model-value="(v) => onResponseInput(item, v as ResponseStatus)"
        />
      </template>

      <template #item.relevance="{ item }">
        {{ item.relevance != null ? item.relevance : '—' }}
      </template>

      <template #item.company="{ item }">
        {{ item.company ?? '—' }}
      </template>
    </v-data-table-server>

    <v-dialog v-model="contentDialog" max-width="720">
      <v-card>
        <v-card-title class="text-h6 font-weight-regular">Текст вакансии</v-card-title>
        <v-card-text class="content-dialog__body pa-4">
          <pre class="content-dialog__pre text-body-2 ma-0">{{ contentDialogText }}</pre>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="contentDialog = false">Закрыть</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :timeout="4000">
      {{ snackbarText }}
    </v-snackbar>
  </div>
</template>

<style scoped>
.content-dialog__body {
  max-height: 50vh;
  overflow-y: auto;
}

.content-dialog__pre {
  white-space: pre-wrap;
  font-family: inherit;
  word-break: break-word;
}
</style>
