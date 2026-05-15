<script setup lang="ts">
import { settingsHttp } from '@/api/http'
import { conductorErrorMessage, postEnqueueCollectionQuery } from '@/api/conductorEnqueue'
import type { SearchQueriesItem, SearchQueriesList } from '@/api/types'
import { formatDisplayDateTime } from '@/utils/displayDateTime'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const DEFAULT_HH_SEARCH_BASE = 'https://hh.ru/search/vacancy'
const DEFAULT_CONTENT_RELEVANCE = 0.82
const DEFAULT_NOTIFICATION_RELEVANCE = 0.92

const items = ref<SearchQueriesItem[]>([])
const loading = ref(false)
const listError = ref<string | null>(null)

const dialogOpen = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const editUuid = ref<string | null>(null)
const formName = ref('')
const formQuery = ref('')
const formContentRelevance = ref(DEFAULT_CONTENT_RELEVANCE)
const formNotificationRelevance = ref(DEFAULT_NOTIFICATION_RELEVANCE)
const formIsActive = ref(true)
const formIsLazyScraping = ref(false)
const formSaving = ref(false)
const formError = ref<string | null>(null)

const deleteOpen = ref(false)
const deleteTarget = ref<SearchQueriesItem | null>(null)
const deleteError = ref<string | null>(null)

const snackbar = ref(false)
const snackbarText = ref('')

/** UUID строки → идёт POST collection-query */
const collectLoadingUuid = ref<string | null>(null)

function hhSearchBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_HH_SEARCH_BASE_URL?.trim()
  const b = fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_HH_SEARCH_BASE
  return b.replace(/[/?]$/, '')
}

function fullHhSearchUrl(stored: string): string {
  const s = stored.trim()
  if (!s) return '#'
  if (/^https?:\/\//i.test(s)) return s
  const q = s.replace(/^\?/, '')
  return `${hhSearchBaseUrl()}?${q}`
}

function previewQueryCell(stored: string, max = 100): string {
  if (stored.length <= max) return stored
  return `${stored.slice(0, max)}…`
}

function storedQueryComparable(stored: string): string {
  const t = stored.trim()
  if (/^https?:\/\//i.test(t)) {
    try {
      const u = new URL(t)
      return u.search ? u.search.slice(1) : ''
    } catch {
      return t
    }
  }
  return t.replace(/^\?/, '')
}

function displayQueryForForm(stored: string): string {
  return storedQueryComparable(stored)
}

function normalizeSearchQueryForSave(
  raw: string,
): { ok: true; value: string } | { ok: false; message: string } {
  const t = raw.trim()
  if (!t) {
    return { ok: false, message: 'Укажите параметры поиска (строка после ?)' }
  }
  if (/^https?:\/\//i.test(t)) {
    try {
      const u = new URL(t)
      if (!/(\.|^)hh\.ru$/i.test(u.hostname)) {
        return { ok: false, message: 'URL должен относиться к hh.ru' }
      }
      const q = u.search ? u.search.slice(1) : ''
      if (!q) {
        return { ok: false, message: 'В ссылке нет параметров запроса (?…)' }
      }
      return { ok: true, value: q }
    } catch {
      return { ok: false, message: 'Некорректный URL' }
    }
  }
  return { ok: true, value: t.replace(/^\?/, '') }
}

function relevanceError(label: string, v: number): string | null {
  if (!Number.isFinite(v) || v < 0 || v > 1) {
    return `${label}: укажите число от 0 до 1`
  }
  return null
}

function relEq(a: number, b: number): boolean {
  return Math.abs(a - b) < 1e-9
}

async function loadList() {
  loading.value = true
  listError.value = null
  try {
    const { data } = await settingsHttp.get<SearchQueriesList>('/search-query/list')
    items.value = Array.isArray(data) ? data : []
  } catch {
    listError.value = 'Не удалось загрузить список'
    items.value = []
  } finally {
    loading.value = false
  }
}

function openCreate() {
  dialogMode.value = 'create'
  editUuid.value = null
  formName.value = ''
  formQuery.value = ''
  formContentRelevance.value = DEFAULT_CONTENT_RELEVANCE
  formNotificationRelevance.value = DEFAULT_NOTIFICATION_RELEVANCE
  formIsActive.value = true
  formIsLazyScraping.value = false
  formError.value = null
  dialogOpen.value = true
}

function openEdit(row: SearchQueriesItem) {
  dialogMode.value = 'edit'
  editUuid.value = row.uuid
  formName.value = row.name
  formQuery.value = displayQueryForForm(row.query)
  formContentRelevance.value = row.contentRelevance
  formNotificationRelevance.value = row.notificationRelevance
  formIsActive.value = row.isActive
  formIsLazyScraping.value = row.isLazyScraping
  formError.value = null
  dialogOpen.value = true
}

async function submitDialog() {
  formError.value = null
  const name = formName.value.trim()
  const parsed = normalizeSearchQueryForSave(formQuery.value)
  if (!parsed.ok) {
    formError.value = parsed.message
    return
  }
  const query = parsed.value
  if (!name || name.length > 512) {
    formError.value = 'Укажите название до 512 символов'
    return
  }
  const crErr = relevanceError('Порог контента', formContentRelevance.value)
  const nrErr = relevanceError('Порог уведомлений', formNotificationRelevance.value)
  if (crErr || nrErr) {
    formError.value = crErr ?? nrErr ?? 'Некорректные пороги'
    return
  }
  formSaving.value = true
  try {
    if (dialogMode.value === 'create') {
      let uuid = crypto.randomUUID()
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await settingsHttp.post(`/search-query/${uuid}`, {
            name,
            query,
            contentRelevance: formContentRelevance.value,
            notificationRelevance: formNotificationRelevance.value,
            isActive: formIsActive.value,
            isLazyScraping: formIsLazyScraping.value,
          })
          break
        } catch (e: unknown) {
          const status = (e as { response?: { status?: number } }).response?.status
          if (status === 409 && attempt < 2) {
            uuid = crypto.randomUUID()
            continue
          }
          throw e
        }
      }
    } else if (editUuid.value) {
      const body: Record<string, unknown> = {}
      const orig = items.value.find((i) => i.uuid === editUuid.value)
      if (orig) {
        if (name !== orig.name) body.name = name
        if (query !== storedQueryComparable(orig.query)) body.query = query
        if (!relEq(formContentRelevance.value, orig.contentRelevance)) {
          body.contentRelevance = formContentRelevance.value
        }
        if (!relEq(formNotificationRelevance.value, orig.notificationRelevance)) {
          body.notificationRelevance = formNotificationRelevance.value
        }
        if (formIsActive.value !== orig.isActive) body.isActive = formIsActive.value
        if (formIsLazyScraping.value !== orig.isLazyScraping) {
          body.isLazyScraping = formIsLazyScraping.value
        }
      }
      if (Object.keys(body).length === 0) {
        formError.value = 'Нет изменений для сохранения'
        formSaving.value = false
        return
      }
      await settingsHttp.patch(`/search-query/${editUuid.value}`, body)
    }
    dialogOpen.value = false
    await loadList()
  } catch {
    formError.value = 'Ошибка сохранения'
  } finally {
    formSaving.value = false
  }
}

function askDelete(row: SearchQueriesItem) {
  deleteTarget.value = row
  deleteError.value = null
  deleteOpen.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleteError.value = null
  try {
    await settingsHttp.delete(`/search-query/${deleteTarget.value.uuid}`)
    deleteOpen.value = false
    await loadList()
  } catch (e: unknown) {
    const status = (e as { response?: { status?: number } }).response?.status
    if (status === 404) {
      snackbarText.value = 'Запись уже удалена'
      snackbar.value = true
      deleteOpen.value = false
      await loadList()
      return
    }
    deleteError.value = 'Не удалось удалить'
  }
}

const headers = [
  { title: 'Название', key: 'name' },
  { title: 'Запрос (до 100 симв.)', key: 'queryPreview' },
  { title: 'Порог контента', key: 'contentRelevance' },
  { title: 'Порог уведомл.', key: 'notificationRelevance' },
  { title: 'Активен', key: 'isActive', sortable: false },
  { title: 'Ленивый', key: 'isLazyScraping', sortable: false },
  { title: 'Обновлён / создан', key: 'dateDisplay' },
  { title: '', key: 'actions', sortable: false },
]

const tableItems = computed(() =>
  items.value.map((r) => ({
    ...r,
    queryPreview: previewQueryCell(r.query),
    dateDisplay: formatDisplayDateTime(r.updatedAt?.trim() || r.createdAt?.trim()),
  })),
)

async function runCollectForRow(item: SearchQueriesItem) {
  collectLoadingUuid.value = item.uuid
  try {
    await postEnqueueCollectionQuery({
      uuid: item.uuid,
      query: item.query,
      isLazyScraping: item.isLazyScraping,
    })
    snackbarText.value = 'Сбор поставлен в очередь'
    snackbar.value = true
  } catch (e) {
    snackbarText.value = conductorErrorMessage(e)
    snackbar.value = true
  } finally {
    collectLoadingUuid.value = null
  }
}

function parseFocusUuid(): string | undefined {
  const raw = route.query.focus
  if (typeof raw === 'string' && raw.trim()) return raw.trim()
  if (Array.isArray(raw) && raw[0]) return String(raw[0]).trim()
  return undefined
}

async function consumeFocusFromRoute() {
  const focusUuid = parseFocusUuid()
  if (!focusUuid) return
  const row = items.value.find((i) => i.uuid === focusUuid)
  if (row) openEdit(row)
  const q = { ...route.query }
  delete q.focus
  await router.replace({ path: route.path, query: q })
}

async function loadListAndFocus() {
  await loadList()
  await consumeFocusFromRoute()
}

onMounted(loadListAndFocus)
</script>

<template>
  <div>
    <div class="d-flex align-center justify-space-between mb-8">
      <h1 class="text-h4 font-weight-regular">Поисковые запросы</h1>
      <v-btn color="primary" variant="flat" @click="openCreate">Создать</v-btn>
    </div>

    <p v-if="listError" class="text-error mb-4">{{ listError }}</p>
    <v-progress-linear v-if="loading" indeterminate class="mb-4" />

    <v-data-table
      :headers="headers"
      :items="tableItems"
      :loading="loading"
      class="elevation-0 border rounded-lg"
    >
      <template #no-data>
        <div class="py-12 text-medium-emphasis">Нет запросов</div>
      </template>
      <template #item.queryPreview="{ item }">
        <a
          :href="fullHhSearchUrl(item.query)"
          target="_blank"
          rel="noopener noreferrer"
          class="text-decoration-none"
          >{{ item.queryPreview }}</a
        >
      </template>
      <template #item.contentRelevance="{ item }">
        {{ item.contentRelevance.toFixed(2) }}
      </template>
      <template #item.notificationRelevance="{ item }">
        {{ item.notificationRelevance.toFixed(2) }}
      </template>
      <template #item.isActive="{ item }">
        <v-chip size="small" :color="item.isActive ? 'success' : 'default'" variant="tonal">
          {{ item.isActive ? 'Да' : 'Нет' }}
        </v-chip>
      </template>
      <template #item.isLazyScraping="{ item }">
        <v-chip size="small" :color="item.isLazyScraping ? 'primary' : 'default'" variant="tonal">
          {{ item.isLazyScraping ? 'Да' : 'Нет' }}
        </v-chip>
      </template>
      <template #item.dateDisplay="{ item }">
        {{ item.dateDisplay }}
      </template>
      <template #item.actions="{ item }">
        <v-btn
          class="mr-2"
          :loading="collectLoadingUuid === item.uuid"
          @click="runCollectForRow(item)"
        >
          Собрать вакансии
        </v-btn>
        <v-btn class="mr-2" @click="openEdit(item)">Изменить</v-btn>
        <v-btn color="error" variant="text" @click="askDelete(item)">Удалить</v-btn>
      </template>
    </v-data-table>

    <v-dialog v-model="dialogOpen" max-width="560">
      <v-card>
        <v-card-title>{{ dialogMode === 'create' ? 'Новый запрос' : 'Изменение запроса' }}</v-card-title>
        <v-card-text>
          <p v-if="formError" class="text-error mb-4">{{ formError }}</p>
          <v-text-field v-model="formName" label="Название" variant="outlined" class="mb-4" />
          <v-text-field
            v-model="formQuery"
            label="Параметры поиска (как в URL после ?)"
            hint="Можно вставить полную ссылку hh.ru — сохранится только часть после ?. База: VITE_HH_SEARCH_BASE_URL."
            persistent-hint
            variant="outlined"
            class="mb-4"
          />
          <v-text-field
            v-model.number="formContentRelevance"
            type="number"
            step="0.01"
            min="0"
            max="1"
            label="Порог релевантности контента (0–1)"
            variant="outlined"
            class="mb-4"
          />
          <v-text-field
            v-model.number="formNotificationRelevance"
            type="number"
            step="0.01"
            min="0"
            max="1"
            label="Порог для уведомлений (0–1)"
            variant="outlined"
            class="mb-4"
          />
          <v-checkbox v-model="formIsActive" label="Активен (участвует в плановом сборе)" density="comfortable" />
          <v-checkbox
            v-model="formIsLazyScraping"
            label="Ленивый поиск (остановка при отсутствии новых вакансий на странице)"
            density="comfortable"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="dialogOpen = false">Отмена</v-btn>
          <v-btn color="primary" variant="flat" :loading="formSaving" @click="submitDialog">Сохранить</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteOpen" max-width="480">
      <v-card>
        <v-card-title>Подтверждение</v-card-title>
        <v-card-text>
          <p v-if="deleteTarget">Удалить запись «{{ deleteTarget.name }}»?</p>
          <p v-if="deleteError" class="text-error">{{ deleteError }}</p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="deleteOpen = false">Отмена</v-btn>
          <v-btn color="error" variant="flat" @click="confirmDelete">Удалить</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :timeout="4000">{{ snackbarText }}</v-snackbar>
  </div>
</template>
