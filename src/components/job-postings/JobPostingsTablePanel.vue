<script setup lang="ts">
import { jobPostingsHttp, settingsHttp } from '@/api/http'
import { orchestratorErrorMessage, postEventQueue } from '@/api/orchestratorEvents'
import type {
  EvaluationStatus,
  JobPostingNotesPayload,
  JobPostingsItem,
  JobPostingsList,
  PromptTemplate,
  ReferenceContext,
  ResponseStatus,
  SearchQueriesList,
} from '@/api/types'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useTheme } from 'vuetify'

import promptDarkSvg from '@/assets/job-postings-icons/prompt-dark.svg'
import promptLightSvg from '@/assets/job-postings-icons/prompt-light.svg'
import notesDarkSvg from '@/assets/job-postings-icons/notes-dark.svg'
import notesLightSvg from '@/assets/job-postings-icons/notes-light.svg'
import noNotesDarkSvg from '@/assets/job-postings-icons/no-notes-dark.svg'
import noNotesLightSvg from '@/assets/job-postings-icons/no-notes-light.svg'

const props = defineProps<{
  /** `dashboard` — отбор как на дашборде; `all` — все вакансии, сортировка по дате загрузки на сервере */
  preset: 'dashboard' | 'all'
}>()

const theme = useTheme()
const isDark = computed(() => theme.global.current.value.dark)
const promptIconSrc = computed(() => (isDark.value ? promptDarkSvg : promptLightSvg))

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

const EVAL_FILTER_OPTS: { title: string; value: string }[] = [
  ...EVALUATION_OPTIONS.map((o) => ({ title: o.title, value: o.value })),
  { title: '(пусто)', value: 'NULL' },
]

const RESPONSE_FILTER_OPTS: { title: string; value: string }[] = [
  ...RESPONSE_OPTIONS.map((o) => ({ title: o.title, value: o.value })),
  { title: '(пусто)', value: 'NULL' },
]

const PER_PAGE = [30, 50, 80, 130] as const

type TableHeaderRow = { title: string; key: string; sortable: boolean; width?: number }

const BASE_HEADERS: TableHeaderRow[] = [
  { title: 'Название', key: 'title', sortable: true },
  { title: 'Запрос', key: 'searchQuery', sortable: false },
  { title: 'URL', key: 'url', sortable: false },
  { title: 'Оценка', key: 'evaluationStatus', sortable: false },
  { title: 'Рассмотрение', key: 'responseStatus', sortable: false },
  { title: 'Релевантность', key: 'relevance', sortable: true },
  { title: 'Компания', key: 'company', sortable: true },
  { title: 'Публикация', key: 'publicationDate', sortable: true },
  { title: 'Загрузка', key: 'createdAt', sortable: true },
  { title: 'Обновление', key: 'updatedAt', sortable: true },
]

const tableHeaders = computed(() => [...BASE_HEADERS])

const items = ref<JobPostingsItem[]>([])
const totalPages = ref(0)
const page = ref(1)
const itemsPerPage = ref(30)
const loading = ref(false)
const listError = ref<string | null>(null)

const searchFilter = ref('')
const searchDebounced = ref('')
let searchTimer: ReturnType<typeof setTimeout> | undefined

watch(searchFilter, (v) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    searchDebounced.value = v
    page.value = 1
  }, 350)
})

/** `preset` — дефолт дашборда; `none` — не передавать параметр; `custom` — явный список */
type StatusAxis = 'preset' | 'none' | 'custom'

const evalAxis = ref<StatusAxis>('preset')
const evalCustomValues = ref<string[]>([])
const respAxis = ref<StatusAxis>('preset')
const respCustomValues = ref<string[]>([])

const evalFilterMenu = ref(false)
const respFilterMenu = ref(false)
const evalDraft = reactive<Record<string, boolean>>({})
const respDraft = reactive<Record<string, boolean>>({})

function initDraft(
  opts: { title: string; value: string }[],
  draft: Record<string, boolean>,
  selected: string[],
) {
  for (const o of opts) {
    draft[o.value] = selected.includes(o.value)
  }
}

function effectiveEvalQueryValues(): string[] {
  if (evalAxis.value === 'preset') {
    return props.preset === 'dashboard' ? ['RELEVANT'] : []
  }
  if (evalAxis.value === 'none') return []
  return [...evalCustomValues.value]
}

function effectiveRespQueryValues(): string[] {
  if (respAxis.value === 'preset') {
    return props.preset === 'dashboard' ? ['NEW', 'RESPONDED'] : []
  }
  if (respAxis.value === 'none') return []
  return [...respCustomValues.value]
}

function openEvalFilterMenu() {
  initDraft(EVAL_FILTER_OPTS, evalDraft, effectiveEvalQueryValues())
}

function openRespFilterMenu() {
  initDraft(RESPONSE_FILTER_OPTS, respDraft, effectiveRespQueryValues())
}

function applyEvalFilter() {
  const sel = EVAL_FILTER_OPTS.filter((o) => evalDraft[o.value]).map((o) => o.value)
  if (sel.length === 0) {
    evalAxis.value = 'none'
  } else {
    evalAxis.value = 'custom'
    evalCustomValues.value = sel
  }
  evalFilterMenu.value = false
}

function clearEvalFilter() {
  evalAxis.value = 'none'
  evalFilterMenu.value = false
}

function applyRespFilter() {
  const sel = RESPONSE_FILTER_OPTS.filter((o) => respDraft[o.value]).map((o) => o.value)
  if (sel.length === 0) {
    respAxis.value = 'none'
  } else {
    respAxis.value = 'custom'
    respCustomValues.value = sel
  }
  respFilterMenu.value = false
}

function clearRespFilter() {
  respAxis.value = 'none'
  respFilterMenu.value = false
}

const searchQueryNameByUuid = ref<Record<string, string>>({})

onMounted(async () => {
  try {
    const { data } = await settingsHttp.get<SearchQueriesList>('/search-query/list')
    const m: Record<string, string> = {}
    if (Array.isArray(data)) {
      for (const q of data) {
        m[q.uuid] = q.name
      }
    }
    searchQueryNameByUuid.value = m
  } catch {
    searchQueryNameByUuid.value = {}
  }
})

function searchQueryLabel(uuid: string): string {
  return searchQueryNameByUuid.value[uuid] ?? shortUuid(uuid)
}

function shortUuid(uuid: string): string {
  if (uuid.length <= 12) return uuid
  return `${uuid.slice(0, 8)}…`
}

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
  if (!s || !rows.length) return rows
  if (!(s.key in rows[0])) return rows
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

const detailItem = ref<JobPostingsItem | null>(null)

const promptComposeDialog = ref(false)
const promptComposeText = ref('')
const promptLoadingUuid = ref<string | null>(null)

const notesDialogVisible = ref(false)
const notesEditUuid = ref<string | null>(null)
const notesDraft = ref('')
const notesLoadingUuid = ref<string | null>(null)
const notesSaving = ref(false)

/** Наличие непустого текста заметки по uuid (обновляется prefetch списка, открытием и сохранением модалки). */
const notesFilledByUuid = ref<Record<string, boolean>>({})

function isNotesNonEmpty(text: string | null | undefined): boolean {
  return (text ?? '').trim().length > 0
}

function setNotesFilled(uuid: string, text: string | null | undefined) {
  notesFilledByUuid.value = { ...notesFilledByUuid.value, [uuid]: isNotesNonEmpty(text) }
}

function notesIconSrc(uuid: string): string {
  const filled = notesFilledByUuid.value[uuid] === true
  return isDark.value
    ? filled
      ? notesDarkSvg
      : noNotesDarkSvg
    : filled
      ? notesLightSvg
      : noNotesLightSvg
}

async function prefetchNotesForItems(rows: JobPostingsItem[]) {
  if (rows.length === 0) return
  const next = { ...notesFilledByUuid.value }
  await Promise.all(
    rows.map(async (row) => {
      try {
        const { data } = await jobPostingsHttp.get<JobPostingNotesPayload>(`/notes/${row.uuid}`)
        next[row.uuid] = isNotesNonEmpty(data.text)
      } catch {
        next[row.uuid] = false
      }
    }),
  )
  notesFilledByUuid.value = next
}

function discardNotesDialog() {
  notesDialogVisible.value = false
  notesEditUuid.value = null
  notesDraft.value = ''
}

async function openNotes(row: JobPostingsItem) {
  notesLoadingUuid.value = row.uuid
  try {
    const { data } = await jobPostingsHttp.get<JobPostingNotesPayload>(`/notes/${row.uuid}`)
    notesDraft.value = data.text ?? ''
    setNotesFilled(row.uuid, data.text)
    notesEditUuid.value = row.uuid
    notesDialogVisible.value = true
  } catch {
    showError('Не удалось загрузить заметку')
  } finally {
    notesLoadingUuid.value = null
  }
}

async function saveNotes() {
  const id = notesEditUuid.value
  if (!id) return
  notesSaving.value = true
  try {
    await jobPostingsHttp.post(`/notes/${id}`, { text: notesDraft.value })
    setNotesFilled(id, notesDraft.value)
    discardNotesDialog()
  } catch {
    showError('Не удалось сохранить заметку')
  } finally {
    notesSaving.value = false
  }
}

/** Литералы `\\n` / `\\r` из API или БД → настоящие переводы строк в собранном промпте. */
function unescapeNewlinesInPromptText(s: string): string {
  return s.replaceAll('\\r\\n', '\n').replaceAll('\\n', '\n').replaceAll('\\r', '\n')
}

function fillCoverLetterPrompt(template: string, jobPosting: string, resume: string): string {
  const composed = template
    .replaceAll('${JOB_POSTING_CONTENT}', jobPosting)
    .replaceAll('${RESUME}', resume)
  return unescapeNewlinesInPromptText(composed)
}

async function openCoverLetterPrompt(row: JobPostingsItem) {
  promptLoadingUuid.value = row.uuid
  try {
    const tplRes = await settingsHttp.get<PromptTemplate>('/prompt-template', {
      validateStatus: (st) => st === 200 || st === 404,
    })
    if (tplRes.status === 404) {
      showError('Шаблон промпта не найден')
      return
    }
    const refRes = await settingsHttp.get<ReferenceContext | ''>('/reference-context', {
      validateStatus: (st) => st === 200 || st === 202 || st === 404 || st === 500,
    })
    if (refRes.status === 404 || refRes.status === 202) {
      showError('Сначала задайте эталонный контекст (резюме) в настройках')
      return
    }
    if (refRes.status === 500) {
      showError('Не удалось загрузить эталонный контекст')
      return
    }
    const ref = refRes.data as ReferenceContext
    const resumeText = ref.context ?? ''
    const tpl = (tplRes.data as PromptTemplate).template ?? ''
    const jobText = row.content ?? ''
    promptComposeText.value = fillCoverLetterPrompt(tpl, jobText, resumeText)
    promptComposeDialog.value = true
  } catch {
    showError('Не удалось собрать промпт')
  } finally {
    promptLoadingUuid.value = null
  }
}

function openJobDetail(item: JobPostingsItem) {
  detailItem.value = { ...item }
}

function formatLocaleDate(raw: string | null | undefined): string {
  if (raw == null || raw === '') return '—'
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return String(raw)
  return d.toLocaleDateString()
}

function isoTooltip(raw: string | null | undefined): string {
  if (raw == null || raw === '') return ''
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? String(raw) : d.toISOString()
}

function appendStatusFilters(params: Record<string, string | number | boolean | string[]>) {
  const ev = effectiveEvalQueryValues()
  if (ev.length > 0) params.evaluationStatus = ev

  const rs = effectiveRespQueryValues()
  if (rs.length > 0) params.responseStatus = rs
}

function buildFetchParams(p: number, size: number) {
  const params: Record<string, string | number | boolean | string[]> = {
    page: p,
    size,
  }
  appendStatusFilters(params)
  if (props.preset === 'all') {
    params.sort = 'created_at_desc'
  }
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
    const base = buildFetchParams(page.value, itemsPerPage.value)
    const q = searchDebounced.value.trim()
    let path: string
    if (q) {
      path = `/job-postings/search-query/by-substring?${serializeParams({ ...base, substring: q })}`
    } else {
      path = `/job-postings/list?${serializeParams(base)}`
    }
    const { data } = await jobPostingsHttp.get<JobPostingsList>(path)
    items.value = data.list ?? []
    totalPages.value = data.totalPages ?? 0
    void prefetchNotesForItems(items.value)
  } catch (e: unknown) {
    listError.value = e instanceof Error ? e.message : 'Ошибка загрузки'
    items.value = []
    totalPages.value = 0
    notesFilledByUuid.value = {}
  } finally {
    loading.value = false
  }
}

watch(
  [
    page,
    itemsPerPage,
    searchDebounced,
    evalAxis,
    evalCustomValues,
    respAxis,
    respCustomValues,
    () => props.preset,
  ],
  fetchList,
  { immediate: true, deep: true },
)

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

function evalLabel(status: EvaluationStatus | null | undefined): string {
  if (status == null) return '—'
  return EVALUATION_OPTIONS.find((o) => o.value === status)?.title ?? status
}

function responseLabel(status: ResponseStatus | null | undefined): string {
  if (status == null) return '—'
  return RESPONSE_OPTIONS.find((o) => o.value === status)?.title ?? status
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

const collectBatchLoading = ref(false)

async function runCollectBatch() {
  collectBatchLoading.value = true
  try {
    await postEventQueue('collection-batch', {})
    snackbarText.value = 'Сбор вакансий поставлен в очередь'
    snackbar.value = true
  } catch (e) {
    showError(orchestratorErrorMessage(e))
  } finally {
    collectBatchLoading.value = false
  }
}

function contentVectorSummary(v: number[] | null | undefined): string {
  if (v == null || v.length === 0) return '—'
  return `вектор из ${v.length} чисел`
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
      :items="displayItems"
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
                <v-list-item v-for="opt in EVAL_FILTER_OPTS" :key="opt.value" class="px-2">
                  <template #prepend>
                    <v-checkbox
                      v-model="evalDraft[opt.value]"
                      hide-details
                      density="compact"
                      color="primary"
                    />
                  </template>
                  <v-list-item-title class="text-body-2">{{ opt.title }}</v-list-item-title>
                </v-list-item>
              </v-list>
              <v-divider />
              <v-card-actions class="px-2 py-2">
                <v-btn size="small" variant="flat" color="primary" @click="applyEvalFilter">ОК</v-btn>
                <v-btn size="small" variant="text" @click="clearEvalFilter">Очистить</v-btn>
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
                <v-list-item v-for="opt in RESPONSE_FILTER_OPTS" :key="opt.value" class="px-2">
                  <template #prepend>
                    <v-checkbox
                      v-model="respDraft[opt.value]"
                      hide-details
                      density="compact"
                      color="primary"
                    />
                  </template>
                  <v-list-item-title class="text-body-2">{{ opt.title }}</v-list-item-title>
                </v-list-item>
              </v-list>
              <v-divider />
              <v-card-actions class="px-2 py-2">
                <v-btn size="small" variant="flat" color="primary" @click="applyRespFilter">ОК</v-btn>
                <v-btn size="small" variant="text" @click="clearRespFilter">Очистить</v-btn>
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
          :to="{ name: 'search-queries', query: { focus: item.searchQueryUuid } }"
          class="text-primary text-decoration-none"
        >
          {{ searchQueryNameByUuid[item.searchQueryUuid] }}
        </RouterLink>
        <span v-else class="text-medium-emphasis">{{ searchQueryLabel(item.searchQueryUuid) }}</span>
      </template>

      <template #item.url="{ item }">
        <a :href="item.url" target="_blank" rel="noopener noreferrer" class="text-decoration-none">{{
          item.url
        }}</a>
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
              <span class="text-truncate">{{ evalLabel(item.evaluationStatus) }}</span>
              <v-icon class="ml-1 flex-shrink-0" size="small">mdi-menu-down</v-icon>
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
              <span class="text-truncate">{{ responseLabel(item.responseStatus) }}</span>
              <v-icon class="ml-1 flex-shrink-0" size="small">mdi-menu-down</v-icon>
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
        {{ item.relevance != null ? item.relevance : '—' }}
      </template>

      <template #item.company="{ item }">
        {{ item.company ?? '—' }}
      </template>

      <template #item.publicationDate="{ item }">
        <v-tooltip v-if="item.publicationDate" location="top" :text="isoTooltip(item.publicationDate)">
          <template #activator="{ props: tipProps }">
            <span v-bind="tipProps" class="cursor-default">{{ formatLocaleDate(item.publicationDate) }}</span>
          </template>
        </v-tooltip>
        <span v-else>—</span>
      </template>

      <template #item.createdAt="{ item }">
        <v-tooltip v-if="item.createdAt" location="top" :text="isoTooltip(item.createdAt)">
          <template #activator="{ props: tipProps }">
            <span v-bind="tipProps" class="cursor-default">{{ formatLocaleDate(item.createdAt) }}</span>
          </template>
        </v-tooltip>
        <span v-else>—</span>
      </template>

      <template #item.updatedAt="{ item }">
        <v-tooltip v-if="item.updatedAt" location="top" :text="isoTooltip(item.updatedAt)">
          <template #activator="{ props: tipProps }">
            <span v-bind="tipProps" class="cursor-default">{{ formatLocaleDate(item.updatedAt) }}</span>
          </template>
        </v-tooltip>
        <span v-else>—</span>
      </template>
    </v-data-table-server>

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

    <v-dialog
      :model-value="detailItem != null"
      max-width="720"
      @update:model-value="(v: boolean) => { if (!v) detailItem = null }"
    >
      <v-card v-if="detailItem">
        <v-card-title class="text-h6 font-weight-regular text-wrap">
          {{ detailItem.title }}
        </v-card-title>
        <v-card-text class="pa-4">
          <dl class="job-detail-dl text-body-2">
            <dt>uuid</dt>
            <dd>{{ detailItem.uuid }}</dd>
            <dt>searchQueryUuid</dt>
            <dd>{{ detailItem.searchQueryUuid }}</dd>
            <dt>uid</dt>
            <dd>{{ detailItem.uid }}</dd>
            <dt>url</dt>
            <dd>
              <a :href="detailItem.url" target="_blank" rel="noopener noreferrer" class="text-primary">{{
                detailItem.url
              }}</a>
            </dd>
            <dt>company</dt>
            <dd>{{ detailItem.company ?? '—' }}</dd>
            <dt>relevance</dt>
            <dd>{{ detailItem.relevance != null ? detailItem.relevance : '—' }}</dd>
            <dt>evaluationStatus</dt>
            <dd>{{ evalLabel(detailItem.evaluationStatus) }}</dd>
            <dt>responseStatus</dt>
            <dd>{{ responseLabel(detailItem.responseStatus) }}</dd>
            <dt>publicationDate</dt>
            <dd>
              <v-tooltip v-if="detailItem.publicationDate" location="top" :text="isoTooltip(detailItem.publicationDate)">
                <template #activator="{ props: tipProps }">
                  <span v-bind="tipProps">{{ formatLocaleDate(detailItem.publicationDate) }}</span>
                </template>
              </v-tooltip>
              <span v-else>—</span>
            </dd>
            <dt>createdAt</dt>
            <dd>
              <v-tooltip v-if="detailItem.createdAt" location="top" :text="isoTooltip(detailItem.createdAt)">
                <template #activator="{ props: tipProps }">
                  <span v-bind="tipProps">{{ formatLocaleDate(detailItem.createdAt) }}</span>
                </template>
              </v-tooltip>
              <span v-else>—</span>
            </dd>
            <dt>updatedAt</dt>
            <dd>
              <v-tooltip v-if="detailItem.updatedAt" location="top" :text="isoTooltip(detailItem.updatedAt)">
                <template #activator="{ props: tipProps }">
                  <span v-bind="tipProps">{{ formatLocaleDate(detailItem.updatedAt) }}</span>
                </template>
              </v-tooltip>
              <span v-else>—</span>
            </dd>
            <dt>contentVector</dt>
            <dd>{{ contentVectorSummary(detailItem.contentVector ?? null) }}</dd>
            <dt>content</dt>
            <dd>
              <pre class="content-dialog__pre text-body-2 ma-0">{{ detailItem.content ?? '—' }}</pre>
            </dd>
          </dl>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="detailItem = null">Закрыть</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog
      :model-value="notesDialogVisible"
      max-width="560"
      @update:model-value="(v: boolean) => { if (!v) discardNotesDialog() }"
    >
      <v-card>
        <v-card-title class="text-h6 font-weight-regular">Заметка</v-card-title>
        <v-card-text class="pa-4">
          <v-textarea
            v-model="notesDraft"
            label="Текст заметки"
            variant="outlined"
            rows="8"
            auto-grow
            hide-details="auto"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" variant="flat" :loading="notesSaving" @click="saveNotes">Сохранить</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="promptComposeDialog" max-width="720">
      <v-card>
        <v-card-title class="text-h6 font-weight-regular">Промпт для генерации</v-card-title>
        <v-card-text class="content-dialog__body pa-4">
          <pre class="content-dialog__pre text-body-2 ma-0">{{ promptComposeText }}</pre>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="promptComposeDialog = false">Закрыть</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

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

.job-detail-dl {
  display: grid;
  grid-template-columns: minmax(120px, 160px) 1fr;
  gap: 8px 16px;
}

.job-detail-dl dt {
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface-variant));
}

.cursor-default {
  cursor: default;
}

:deep(.job-postings-table tbody tr:hover) {
  background: rgba(var(--v-theme-primary), 0.06);
}
</style>
