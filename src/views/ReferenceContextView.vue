<script setup lang="ts">
import { settingsHttp } from '@/api/http'
import type { ReferenceContext, ReferenceContextPersisted } from '@/api/types'
import { onMounted, ref } from 'vue'

const contextText = ref('')
const vectorText = ref('')
const updatedAtDisplay = ref('—')
const createdAtDisplay = ref('—')
const loading = ref(false)
const saving = ref(false)
const errorMessage = ref<string | null>(null)

async function load() {
  loading.value = true
  errorMessage.value = null
  try {
    const res = await settingsHttp.get<ReferenceContext | ''>('/reference-context', {
      validateStatus: (s) => s === 200 || s === 202 || s === 500,
    })
    if (res.status === 500) {
      errorMessage.value = 'Не удалось загрузить эталонный контекст'
      return
    }
    if (res.status === 202) {
      contextText.value = ''
      vectorText.value = ''
      updatedAtDisplay.value = '—'
      createdAtDisplay.value = '—'
      return
    }
    const d = res.data as ReferenceContext
    contextText.value = d.context ?? ''
    vectorText.value = (d.vector ?? []).join(', ')
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
    const res = await settingsHttp.post<ReferenceContextPersisted>(
      '/reference-context',
      contextText.value,
      { headers: { 'Content-Type': 'text/plain' } },
    )
    const d = res.data
    vectorText.value = (d.vector ?? []).join(', ')
    updatedAtDisplay.value = d.updatedAt ?? '—'
    createdAtDisplay.value = d.createdAt ?? '—'
  } catch {
    errorMessage.value = 'Не удалось сохранить'
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <h1 class="text-h4 font-weight-regular mb-8">Эталонный контекст</h1>
    <p v-if="errorMessage" class="text-error mb-4">{{ errorMessage }}</p>

    <v-progress-linear v-if="loading" indeterminate class="mb-4" />

    <v-textarea
      v-model="contextText"
      label="Текст эталона"
      variant="outlined"
      rows="12"
      auto-grow
      class="mb-6"
    />

    <p class="text-body-2 text-medium-emphasis mb-2">Дата изменения</p>
    <p class="mb-6">{{ updatedAtDisplay }}</p>

    <p class="text-body-2 text-medium-emphasis mb-2">Вектор эталона</p>
    <v-sheet border rounded class="pa-4 mb-8 vector-scroll text-mono text-body-2">
      {{ vectorText || '—' }}
    </v-sheet>

    <v-btn color="primary" variant="flat" :loading="saving" :disabled="loading" @click="save">
      Записать
    </v-btn>
  </div>
</template>

<style scoped>
.vector-scroll {
  max-height: 240px;
  overflow: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
</style>
