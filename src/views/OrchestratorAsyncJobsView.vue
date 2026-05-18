<script setup lang="ts">
import type { AxiosError } from 'axios'
import { asyncJobsHttp } from '@/api/http'
import type { AsyncJobItemDto, AsyncJobListDto, AsyncJobStatusDto, RelatedEntitiesUuidsListDto } from '@/api/types'
import { formatDisplayDateTime, formatDisplayDateTimeFull } from '@/utils/displayDateTime'
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function axiosErrorMessage(err: unknown): string {
  if (typeof err === 'object' && err != null && 'isAxiosError' in err && (err as AxiosError).isAxiosError) {
    const ax = err as AxiosError<string>
    const d = ax.response?.data
    if (typeof d === 'string' && d.trim() !== '')
      return d.trim()
    if (ax.message)
      return ax.message
  }
  return 'Ошибка сети или сервера'
}

function isUuid(s: string): boolean {
  return UUID_RE.test(s.trim())
}

const route = useRoute()
const router = useRouter()

function queryJobUuidRaw(): string {
  const raw = route.query.jobUuid
  if (Array.isArray(raw)) return String(raw[0] ?? '').trim()
  if (raw == null) return ''
  return String(raw).trim()
}

function queryOpenDetailTrue(): boolean {
  const od = route.query.openDetail
  if (od === '1') return true
  if (typeof od === 'boolean') return od
  if (Array.isArray(od)) {
    return od.some((x) => {
      if (x === '1') return true
      if (typeof x === 'boolean') return x
      return String(x ?? '').toLowerCase() === 'true'
    })
  }
  if (od == null || od === '') return false
  return String(od).toLowerCase() === 'true'
}

function jsonPreview(v: unknown, max = 96): string {
  if (v == null)
    return 'null'
  try {
    const s = JSON.stringify(v)
    return s.length > max ? `${s.slice(0, max)}…` : s
  }
  catch {
    return '…'
  }
}

function resultPreview(s: string | null | undefined, max = 96): string {
  if (s == null || s === '')
    return 'null'
  return s.length > max ? `${s.slice(0, max)}…` : s
}

function isoShort(iso: string | null | undefined): string {
  if (iso == null || iso === '')
    return 'null'
  return formatDisplayDateTime(iso)
}

const STATUS_OPTS: AsyncJobStatusDto[] = ['STARTED', 'SUCCEEDED', 'FAILED', 'CANCELED']

const headers = [
  { title: 'uuid', key: 'uuid', sortable: true, width: 300 },
  { title: 'name', key: 'name', sortable: true, minWidth: 140 },
  { title: 'parentUuid', key: 'parentUuid', sortable: true, width: 300 },
  { title: 'status', key: 'status', sortable: true, width: 120 },
  { title: 'started_at', key: 'started_at', sortable: true, width: 180 },
  { title: 'updated_at', key: 'updated_at', sortable: true, width: 180 },
  { title: 'finished_at', key: 'finished_at', sortable: true, width: 180 },
  { title: 'context', key: 'context', sortable: true, minWidth: 160 },
  { title: 'result', key: 'result', sortable: true, minWidth: 160 },
] as const

type SortItem = { key: string, order?: 'asc' | 'desc' | boolean }

const items = ref<AsyncJobItemDto[]>([])
const totalItems = ref(0)
const loading = ref(false)
const listError = ref<string | null>(null)
const filterError = ref<string | null>(null)

const page = ref(1)
const itemsPerPage = ref(20)
const sortBy = ref<SortItem[]>([{ key: 'started_at', order: 'desc' }])

const filterJobUuid = ref('')
const filterParentJobUuid = ref('')
const filterStatus = ref<AsyncJobStatusDto | undefined>(undefined)

const menuUuid = ref(false)
const menuParent = ref(false)
const menuStatus = ref(false)

const draftJobUuid = ref('')
const draftParentUuid = ref('')
const draftStatus = ref<AsyncJobStatusDto | undefined>(undefined)

const detailOpen = ref(false)
const detailItem = ref<AsyncJobItemDto | null>(null)

const relatedData = ref<RelatedEntitiesUuidsListDto | null>(null)
const relatedLoading = ref(false)
const relatedError = ref<string | null>(null)

watch(
  () => [detailOpen.value, detailItem.value?.uuid ?? ''] as const,
  async ([open, jobUuid]) => {
    if (!open || !jobUuid) {
      relatedData.value = null
      relatedError.value = null
      relatedLoading.value = false
      return
    }
    relatedLoading.value = true
    relatedError.value = null
    relatedData.value = null
    try {
      const { data } = await asyncJobsHttp.get<RelatedEntitiesUuidsListDto>(
        `/async-jobs/${encodeURIComponent(jobUuid)}/list/related`,
      )
      relatedData.value = {
        jobPostingsList: Array.isArray(data.jobPostingsList) ? data.jobPostingsList : [],
        searchQueriesList: Array.isArray(data.searchQueriesList) ? data.searchQueriesList : [],
      }
    }
    catch (e) {
      relatedError.value = axiosErrorMessage(e)
    }
    finally {
      relatedLoading.value = false
    }
  },
)

watch(menuUuid, (open) => {
  if (open)
    draftJobUuid.value = filterJobUuid.value
})
watch(menuParent, (open) => {
  if (open)
    draftParentUuid.value = filterParentJobUuid.value
})
watch(menuStatus, (open) => {
  if (open)
    draftStatus.value = filterStatus.value
})

function sortDirParam(order: SortItem['order']): 'asc' | 'desc' {
  if (order === 'desc' || order === false)
    return 'desc'
  return 'asc'
}

async function maybeOpenDetailFromRouteQuery() {
  if (!queryOpenDetailTrue())
    return
  const id = queryJobUuidRaw()
  if (!id || !isUuid(id))
    return
  let row = items.value.find((it) => it.uuid === id) ?? null
  if (!row) {
    try {
      const { data } = await asyncJobsHttp.get<AsyncJobItemDto>(`/async-jobs/${encodeURIComponent(id)}`)
      row = data
    }
    catch {
      return
    }
  }
  openDetail(row)
  await router.replace({
    name: 'orchestrator-async-jobs',
    query: { jobUuid: id },
  })
}

async function loadList() {
  loading.value = true
  listError.value = null
  try {
    const sort = sortBy.value[0]
    const params: Record<string, string | number> = {
      page: page.value,
      size: itemsPerPage.value,
    }
    if (sort?.key) {
      params.sortBy = sort.key
      params.sortDir = sortDirParam(sort.order)
    }
    const ju = filterJobUuid.value.trim()
    if (ju)
      params.jobUuid = ju
    const pu = filterParentJobUuid.value.trim()
    if (pu)
      params.parentJobUuid = pu
    if (filterStatus.value)
      params.status = filterStatus.value

    const { data } = await asyncJobsHttp.get<AsyncJobListDto>('/async-jobs/list', { params })
    items.value = Array.isArray(data.list) ? data.list : []
    totalItems.value = Number(data.total ?? 0)
    await maybeOpenDetailFromRouteQuery()
  }
  catch (e) {
    listError.value = axiosErrorMessage(e)
    items.value = []
    totalItems.value = 0
  }
  finally {
    loading.value = false
  }
}

watch(
  () => queryJobUuidRaw(),
  (ju) => {
    filterError.value = null
    if (!ju)
      return
    if (!isUuid(ju)) {
      filterError.value = 'Некорректный UUID в параметре jobUuid'
      return
    }
    if (filterJobUuid.value === ju && draftJobUuid.value === ju)
      return
    filterJobUuid.value = ju
    draftJobUuid.value = ju
    page.value = 1
  },
  { immediate: true },
)

watch(
  [page, itemsPerPage, sortBy, filterJobUuid, filterParentJobUuid, filterStatus],
  () => void loadList(),
  { deep: true, immediate: true },
)

function onApplyUuidFilter() {
  filterError.value = null
  const t = draftJobUuid.value.trim()
  if (t && !isUuid(t)) {
    filterError.value = 'Некорректный UUID для jobUuid'
    return
  }
  filterJobUuid.value = t
  menuUuid.value = false
  page.value = 1
}

function onApplyParentFilter() {
  filterError.value = null
  const t = draftParentUuid.value.trim()
  if (t && !isUuid(t)) {
    filterError.value = 'Некорректный UUID для parentJobUuid'
    return
  }
  filterParentJobUuid.value = t
  menuParent.value = false
  page.value = 1
}

function onApplyStatusFilter() {
  filterStatus.value = draftStatus.value
  menuStatus.value = false
  page.value = 1
}

/** Снимает все отборы (одна кнопка во всех колонках). */
function clearAllFilters() {
  filterError.value = null
  filterJobUuid.value = ''
  filterParentJobUuid.value = ''
  filterStatus.value = undefined
  draftJobUuid.value = ''
  draftParentUuid.value = ''
  draftStatus.value = undefined
  menuUuid.value = false
  menuParent.value = false
  menuStatus.value = false
  page.value = 1
}

function openDetail(row: AsyncJobItemDto) {
  detailItem.value = row
  detailOpen.value = true
}

function closeDetail() {
  detailOpen.value = false
}

function detailJsonBlock(label: string, value: unknown) {
  if (value == null)
    return `${label}: null`
  try {
    return `${label}:\n${JSON.stringify(value, null, 2)}`
  }
  catch {
    return `${label}: …`
  }
}
</script>

<template>
  <div>
    <h1 class="text-h4 font-weight-regular mb-4">Оркестратор</h1>
    <p class="text-body-2 text-medium-emphasis mb-6">
      Данные из <code>GET /async-jobs/list</code>.
    </p>

    <v-alert v-if="listError" type="error" variant="tonal" class="mb-4" closable @click:close="listError = null">
      {{ listError }}
    </v-alert>
    <v-alert v-if="filterError" type="warning" variant="tonal" class="mb-4" closable @click:close="filterError = null">
      {{ filterError }}
    </v-alert>

    <v-data-table-server
      v-model:page="page"
      v-model:items-per-page="itemsPerPage"
      v-model:sort-by="sortBy"
      :headers="[...headers]"
      :items="items"
      :items-length="totalItems"
      :loading="loading"
      item-value="uuid"
      class="async-jobs-table"
      density="comfortable"
    >
      <template #header.uuid="{ column, getSortIcon, toggleSort, isSorted }">
        <div class="d-flex align-center ga-1 flex-wrap">
          <span>{{ column.title }}</span>
          <v-btn
            icon
            size="x-small"
            variant="text"
            :active="isSorted(column)"
            :aria-label="`Сортировка ${column.title}`"
            @click.stop="toggleSort(column)"
          >
            <v-icon :icon="getSortIcon(column)" size="small" />
          </v-btn>
          <v-menu v-model="menuUuid" location="bottom" :close-on-content-click="false">
            <template #activator="{ props: aprops }">
              <v-btn
                v-bind="aprops"
                icon
                size="x-small"
                variant="text"
                aria-label="Отбор по uuid"
              >
                <v-icon size="small">
                  mdi-filter-variant
                </v-icon>
              </v-btn>
            </template>
            <v-card min-width="300">
              <v-card-text>
                <v-text-field
                  v-model="draftJobUuid"
                  label="jobUuid"
                  density="compact"
                  hide-details
                  class="mb-3"
                  clearable
                />
                <v-btn color="primary" size="small" @click="onApplyUuidFilter">
                  Применить
                </v-btn>
              </v-card-text>
            </v-card>
          </v-menu>
          <v-btn
            icon
            size="x-small"
            variant="text"
            aria-label="Сбросить все отборы"
            @click.stop="clearAllFilters"
          >
            <v-icon size="small">
              mdi-filter-off
            </v-icon>
          </v-btn>
        </div>
      </template>

      <template #header.parentUuid="{ column, getSortIcon, toggleSort, isSorted }">
        <div class="d-flex align-center ga-1 flex-wrap">
          <span>{{ column.title }}</span>
          <v-btn
            icon
            size="x-small"
            variant="text"
            :active="isSorted(column)"
            :aria-label="`Сортировка ${column.title}`"
            @click.stop="toggleSort(column)"
          >
            <v-icon :icon="getSortIcon(column)" size="small" />
          </v-btn>
          <v-menu v-model="menuParent" location="bottom" :close-on-content-click="false">
            <template #activator="{ props: aprops }">
              <v-btn
                v-bind="aprops"
                icon
                size="x-small"
                variant="text"
                aria-label="Отбор по parentJobUuid"
              >
                <v-icon size="small">
                  mdi-filter-variant
                </v-icon>
              </v-btn>
            </template>
            <v-card min-width="300">
              <v-card-text>
                <v-text-field
                  v-model="draftParentUuid"
                  label="parentJobUuid"
                  density="compact"
                  hide-details
                  class="mb-3"
                  clearable
                />
                <v-btn color="primary" size="small" @click="onApplyParentFilter">
                  Применить
                </v-btn>
              </v-card-text>
            </v-card>
          </v-menu>
          <v-btn
            icon
            size="x-small"
            variant="text"
            aria-label="Сбросить все отборы"
            @click.stop="clearAllFilters"
          >
            <v-icon size="small">
              mdi-filter-off
            </v-icon>
          </v-btn>
        </div>
      </template>

      <template #header.status="{ column, getSortIcon, toggleSort, isSorted }">
        <div class="d-flex align-center ga-1 flex-wrap">
          <span>{{ column.title }}</span>
          <v-btn
            icon
            size="x-small"
            variant="text"
            :active="isSorted(column)"
            :aria-label="`Сортировка ${column.title}`"
            @click.stop="toggleSort(column)"
          >
            <v-icon :icon="getSortIcon(column)" size="small" />
          </v-btn>
          <v-menu v-model="menuStatus" location="bottom" :close-on-content-click="false">
            <template #activator="{ props: aprops }">
              <v-btn
                v-bind="aprops"
                icon
                size="x-small"
                variant="text"
                aria-label="Отбор по status"
              >
                <v-icon size="small">
                  mdi-filter-variant
                </v-icon>
              </v-btn>
            </template>
            <v-card min-width="260">
              <v-card-text>
                <v-select
                  v-model="draftStatus"
                  :items="STATUS_OPTS"
                  label="status"
                  density="compact"
                  hide-details
                  clearable
                  class="mb-3"
                />
                <v-btn color="primary" size="small" @click="onApplyStatusFilter">
                  Применить
                </v-btn>
              </v-card-text>
            </v-card>
          </v-menu>
          <v-btn
            icon
            size="x-small"
            variant="text"
            aria-label="Сбросить все отборы"
            @click.stop="clearAllFilters"
          >
            <v-icon size="small">
              mdi-filter-off
            </v-icon>
          </v-btn>
        </div>
      </template>

      <template #header.name="{ column, getSortIcon, toggleSort, isSorted }">
        <div class="d-flex align-center ga-1 flex-wrap">
          <span>{{ column.title }}</span>
          <v-btn
            icon
            size="x-small"
            variant="text"
            :active="isSorted(column)"
            :aria-label="`Сортировка ${column.title}`"
            @click.stop="toggleSort(column)"
          >
            <v-icon :icon="getSortIcon(column)" size="small" />
          </v-btn>
        </div>
      </template>

      <template #header.started_at="{ column, getSortIcon, toggleSort, isSorted }">
        <div class="d-flex align-center ga-1 flex-wrap">
          <span>{{ column.title }}</span>
          <v-btn
            icon
            size="x-small"
            variant="text"
            :active="isSorted(column)"
            :aria-label="`Сортировка ${column.title}`"
            @click.stop="toggleSort(column)"
          >
            <v-icon :icon="getSortIcon(column)" size="small" />
          </v-btn>
        </div>
      </template>

      <template #header.updated_at="{ column, getSortIcon, toggleSort, isSorted }">
        <div class="d-flex align-center ga-1 flex-wrap">
          <span>{{ column.title }}</span>
          <v-btn
            icon
            size="x-small"
            variant="text"
            :active="isSorted(column)"
            :aria-label="`Сортировка ${column.title}`"
            @click.stop="toggleSort(column)"
          >
            <v-icon :icon="getSortIcon(column)" size="small" />
          </v-btn>
        </div>
      </template>

      <template #header.finished_at="{ column, getSortIcon, toggleSort, isSorted }">
        <div class="d-flex align-center ga-1 flex-wrap">
          <span>{{ column.title }}</span>
          <v-btn
            icon
            size="x-small"
            variant="text"
            :active="isSorted(column)"
            :aria-label="`Сортировка ${column.title}`"
            @click.stop="toggleSort(column)"
          >
            <v-icon :icon="getSortIcon(column)" size="small" />
          </v-btn>
        </div>
      </template>

      <template #header.context="{ column, getSortIcon, toggleSort, isSorted }">
        <div class="d-flex align-center ga-1 flex-wrap">
          <span>{{ column.title }}</span>
          <v-btn
            icon
            size="x-small"
            variant="text"
            :active="isSorted(column)"
            :aria-label="`Сортировка ${column.title}`"
            @click.stop="toggleSort(column)"
          >
            <v-icon :icon="getSortIcon(column)" size="small" />
          </v-btn>
        </div>
      </template>

      <template #header.result="{ column, getSortIcon, toggleSort, isSorted }">
        <div class="d-flex align-center ga-1 flex-wrap">
          <span>{{ column.title }}</span>
          <v-btn
            icon
            size="x-small"
            variant="text"
            :active="isSorted(column)"
            :aria-label="`Сортировка ${column.title}`"
            @click.stop="toggleSort(column)"
          >
            <v-icon :icon="getSortIcon(column)" size="small" />
          </v-btn>
        </div>
      </template>

      <template #item.uuid="{ item }">
        <button type="button" role="link" class="cell-link" @click="openDetail(item)">
          {{ item.uuid }}
        </button>
      </template>
      <template #item.name="{ item }">
        <button type="button" role="link" class="cell-link text-left" @click="openDetail(item)">
          {{ item.name }}
        </button>
      </template>
      <template #item.parentUuid="{ item }">
        <button type="button" role="link" class="cell-link text-left" @click="openDetail(item)">
          {{ item.parentUuid ?? 'null' }}
        </button>
      </template>
      <template #item.status="{ item }">
        <button type="button" role="link" class="cell-link" @click="openDetail(item)">
          {{ item.status }}
        </button>
      </template>
      <template #item.started_at="{ item }">
        <button type="button" role="link" class="cell-link text-left" :title="formatDisplayDateTimeFull(item.started_at)" @click="openDetail(item)">
          {{ isoShort(item.started_at) }}
        </button>
      </template>
      <template #item.updated_at="{ item }">
        <button type="button" role="link" class="cell-link text-left" :title="item.updated_at ? formatDisplayDateTimeFull(item.updated_at) : undefined" @click="openDetail(item)">
          {{ isoShort(item.updated_at) }}
        </button>
      </template>
      <template #item.finished_at="{ item }">
        <button type="button" role="link" class="cell-link text-left" :title="item.finished_at ? formatDisplayDateTimeFull(item.finished_at) : undefined" @click="openDetail(item)">
          {{ isoShort(item.finished_at) }}
        </button>
      </template>
      <template #item.context="{ item }">
        <button type="button" role="link" class="cell-link text-left" @click="openDetail(item)">
          {{ jsonPreview(item.context) }}
        </button>
      </template>
      <template #item.result="{ item }">
        <button type="button" role="link" class="cell-link text-left" @click="openDetail(item)">
          {{ resultPreview(item.result) }}
        </button>
      </template>
    </v-data-table-server>

    <v-dialog
      v-model="detailOpen"
      max-width="720"
      scrollable
    >
      <v-card v-if="detailItem">
        <v-card-title class="d-flex align-center justify-space-between text-subtitle-1">
          <span>Async job</span>
          <v-btn icon="mdi-close" variant="text" aria-label="Закрыть" @click="closeDetail" />
        </v-card-title>
        <v-divider />
        <v-card-text>
          <dl class="detail-dl">
            <dt>uuid</dt>
            <dd>{{ detailItem.uuid }}</dd>
            <dt>name</dt>
            <dd>{{ detailItem.name }}</dd>
            <dt>parentUuid</dt>
            <dd>{{ detailItem.parentUuid ?? 'null' }}</dd>
            <dt>status</dt>
            <dd>{{ detailItem.status }}</dd>
            <dt>started_at</dt>
            <dd>{{ detailItem.started_at }}</dd>
            <dt>updated_at</dt>
            <dd>{{ detailItem.updated_at ?? 'null' }}</dd>
            <dt>finished_at</dt>
            <dd>{{ detailItem.finished_at ?? 'null' }}</dd>
          </dl>
          <v-divider class="my-4" />
          <pre class="detail-pre">{{ detailJsonBlock('context', detailItem.context) }}</pre>
          <pre class="detail-pre mt-4">{{ detailItem.result != null && detailItem.result !== '' ? `result:\n${detailItem.result}` : 'result: null' }}</pre>

          <v-divider class="my-4" />
          <div class="text-subtitle-2 font-weight-medium mb-2">
            Связанные объекты
          </div>
          <v-progress-linear v-if="relatedLoading" indeterminate color="primary" class="mb-3" />
          <v-alert v-else-if="relatedError" type="error" variant="tonal" density="compact" class="mb-0">
            {{ relatedError }}
          </v-alert>
          <template v-else-if="relatedData">
            <div class="text-body-2 font-weight-medium mb-1">
              Вакансии (job_postings)
            </div>
            <ul v-if="relatedData.jobPostingsList.length" class="related-uuid-list pl-4 mb-4">
              <li v-for="id in relatedData.jobPostingsList" :key="`jp-${id}`" class="text-mono">
                {{ id }}
              </li>
            </ul>
            <p v-else class="text-body-2 text-medium-emphasis mb-4">
              Нет связанных вакансий.
            </p>
            <div class="text-body-2 font-weight-medium mb-1">
              Поисковые запросы (search_queries)
            </div>
            <ul v-if="relatedData.searchQueriesList.length" class="related-uuid-list pl-4 mb-0">
              <li v-for="id in relatedData.searchQueriesList" :key="`sq-${id}`" class="text-mono">
                {{ id }}
              </li>
            </ul>
            <p v-else class="text-body-2 text-medium-emphasis mb-0">
              Нет связанных поисковых запросов.
            </p>
          </template>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.cell-link {
  background: none;
  border: none;
  padding: 0;
  margin: 0;
  font: inherit;
  color: rgb(var(--v-theme-primary));
  text-decoration: underline;
  cursor: pointer;
  text-align: inherit;
  max-width: 100%;
}

.cell-link:hover {
  text-decoration: none;
}

.detail-dl {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 0.25rem 1rem;
}

.detail-dl dt {
  font-weight: 600;
}

.detail-pre {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.8125rem;
}

.related-uuid-list {
  margin: 0;
}

.text-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 0.8125rem;
  word-break: break-all;
}
</style>
