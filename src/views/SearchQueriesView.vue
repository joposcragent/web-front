<script setup lang="ts">
import { settingsHttp } from '@/api/http'
import type { SearchQueriesItem, SearchQueriesList } from '@/api/types'
import { computed, onMounted, ref } from 'vue'

const items = ref<SearchQueriesItem[]>([])
const loading = ref(false)
const listError = ref<string | null>(null)

const dialogOpen = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const editUuid = ref<string | null>(null)
const formName = ref('')
const formQuery = ref('')
const formSaving = ref(false)
const formError = ref<string | null>(null)

const deleteOpen = ref(false)
const deleteTarget = ref<SearchQueriesItem | null>(null)
const deleteError = ref<string | null>(null)

const snackbar = ref(false)
const snackbarText = ref('')

function isValidHhUrl(url: string): boolean {
  const u = url.trim()
  return u.startsWith('https://hh.ru') || u.startsWith('https://hh.ru/')
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
  formError.value = null
  dialogOpen.value = true
}

function openEdit(row: SearchQueriesItem) {
  dialogMode.value = 'edit'
  editUuid.value = row.uuid
  formName.value = row.name
  formQuery.value = row.query
  formError.value = null
  dialogOpen.value = true
}

async function submitDialog() {
  formError.value = null
  const name = formName.value.trim()
  const query = formQuery.value.trim()
  if (!name || name.length > 512) {
    formError.value = 'Укажите название до 512 символов'
    return
  }
  if (!query || !isValidHhUrl(query)) {
    formError.value = 'Укажите URL поиска, начинающийся с https://hh.ru'
    return
  }
  formSaving.value = true
  try {
    if (dialogMode.value === 'create') {
      let uuid = crypto.randomUUID()
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await settingsHttp.post(`/search-query/${uuid}`, { name, query })
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
      const body: { name?: string; query?: string } = {}
      const orig = items.value.find((i) => i.uuid === editUuid.value)
      if (orig) {
        if (name !== orig.name) body.name = name
        if (query !== orig.query) body.query = query
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
  { title: 'Ссылка hh.ru', key: 'query' },
  { title: 'Создан / обновлён', key: 'updatedDisplay' },
  { title: '', key: 'actions', sortable: false },
]

const tableItems = computed(() =>
  items.value.map((r) => ({
    ...r,
    updatedDisplay: `${r.createdAt} / ${r.updatedAt}`,
  })),
)

onMounted(loadList)
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
      <template #item.query="{ item }">
        <a :href="item.query" target="_blank" rel="noopener noreferrer" class="text-decoration-none">{{
          item.query
        }}</a>
      </template>
      <template #item.updatedDisplay="{ item }">
        {{ item.updatedDisplay }}
      </template>
      <template #item.actions="{ item }">
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
          <v-text-field v-model="formQuery" label="URL поиска (https://hh.ru…)" variant="outlined" />
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
