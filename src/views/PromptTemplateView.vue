<script setup lang="ts">
import { settingsHttp } from '@/api/http'
import type { PromptTemplate } from '@/api/types'
import { computed, onMounted, ref } from 'vue'

const templateText = ref('')
const updatedAtDisplay = ref('—')
const createdAtDisplay = ref('—')
const loading = ref(false)
const saving = ref(false)
const errorMessage = ref<string | null>(null)

async function load() {
  loading.value = true
  errorMessage.value = null
  try {
    const res = await settingsHttp.get<PromptTemplate>('/prompt-template', {
      validateStatus: (s) => s === 200 || s === 404 || s === 500,
    })
    if (res.status === 500) {
      errorMessage.value = 'Не удалось загрузить шаблон промпта'
      return
    }
    if (res.status === 404) {
      errorMessage.value = 'Шаблон промпта не найден в базе'
      templateText.value = ''
      updatedAtDisplay.value = '—'
      createdAtDisplay.value = '—'
      return
    }
    const d = res.data
    templateText.value = d.template ?? ''
    updatedAtDisplay.value = d.updatedAt ?? '—'
    createdAtDisplay.value = d.createdAt ?? '—'
  } catch {
    errorMessage.value = 'Ошибка сети'
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  errorMessage.value = null
  try {
    const res = await settingsHttp.post<PromptTemplate>('/prompt-template', templateText.value, {
      headers: { 'Content-Type': 'text/plain' },
    })
    const d = res.data
    templateText.value = d.template ?? ''
    updatedAtDisplay.value = d.updatedAt ?? '—'
    createdAtDisplay.value = d.createdAt ?? '—'
  } catch {
    errorMessage.value = 'Не удалось сохранить'
  } finally {
    saving.value = false
  }
}

const templateDateDisplay = computed(() => {
  const u = String(updatedAtDisplay.value ?? '').trim()
  if (u && u !== '—') return u
  const c = String(createdAtDisplay.value ?? '').trim()
  if (c && c !== '—') return c
  return '—'
})

onMounted(load)
</script>

<template>
  <div class="prompt-page">
    <h1 class="text-h4 font-weight-regular mb-8">Настройка промпта</h1>
    <p v-if="errorMessage" class="text-error mb-4">{{ errorMessage }}</p>

    <v-progress-linear v-if="loading" indeterminate class="mb-4" />

    <div class="prompt-editor-wrap mb-6">
      <v-textarea
        v-model="templateText"
        label="Шаблон промпта"
        variant="outlined"
        hide-details="auto"
        class="prompt-editor"
      />
    </div>

    <p class="text-body-2 text-medium-emphasis mb-2">Последнее обновление</p>
    <p class="mb-6">{{ templateDateDisplay }}</p>

    <v-btn color="primary" variant="flat" :loading="saving" :disabled="loading" @click="save">
      Сохранить
    </v-btn>
  </div>
</template>

<style scoped>
.prompt-page {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  height: calc(100vh - 8rem);
  min-height: 24rem;
}

.prompt-editor-wrap {
  box-sizing: border-box;
  flex: 1 1 auto;
  width: 100%;
  min-height: 12rem;
  max-height: min(85vh, 100%);
  resize: vertical;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.prompt-editor {
  flex: 1;
  min-height: 0;
}

.prompt-editor :deep(.v-field) {
  height: 100%;
}

.prompt-editor :deep(.v-field__input) {
  min-height: 8rem;
  max-height: 100%;
  overflow-y: auto;
  align-items: flex-start;
}
</style>
