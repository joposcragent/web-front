<script setup lang="ts">
import { settingsHttp } from '@/api/http'
import type { RelevanceThresholdItem, RelevanceThresholdType, RelevanceThresholdsList } from '@/api/types'
import { computed, onMounted, ref } from 'vue'

const loading = ref(false)
const errorMessage = ref<string | null>(null)
const items = ref<RelevanceThresholdItem[]>([])

const contentValue = ref('')
const notificationValue = ref('')
const contentUpdated = ref('—')
const notificationUpdated = ref('—')
const contentSaving = ref(false)
const notificationSaving = ref(false)
const contentError = ref<string | null>(null)
const notificationError = ref<string | null>(null)

const contentFieldError = ref<string | null>(null)
const notificationFieldError = ref<string | null>(null)

function itemFor(type: RelevanceThresholdType): RelevanceThresholdItem | undefined {
  return items.value.find((i) => i.type === type)
}

function parse01(raw: string): number | null {
  const n = Number(raw.replace(',', '.'))
  if (Number.isNaN(n) || n < 0 || n > 1) return null
  return n
}

async function load() {
  loading.value = true
  errorMessage.value = null
  try {
    const { data } = await settingsHttp.get<RelevanceThresholdsList>('/relevance-thresholds/list')
    items.value = data.list ?? []
    const c = itemFor('CONTENT')
    const n = itemFor('NOTIFICATION')
    contentValue.value = c != null ? String(c.value) : ''
    notificationValue.value = n != null ? String(n.value) : ''
    contentUpdated.value = c?.updatedAt ?? '—'
    notificationUpdated.value = n?.updatedAt ?? '—'
  } catch {
    errorMessage.value = 'Не удалось загрузить пороги'
  } finally {
    loading.value = false
  }
}

async function saveType(type: RelevanceThresholdType, raw: string) {
  const fieldErr = type === 'CONTENT' ? contentFieldError : notificationFieldError
  const saving = type === 'CONTENT' ? contentSaving : notificationSaving
  const err = type === 'CONTENT' ? contentError : notificationError
  fieldErr.value = null
  err.value = null
  const v = parse01(raw)
  if (v == null) {
    fieldErr.value = 'Введите число от 0 до 1'
    return
  }
  saving.value = true
  try {
    await settingsHttp.post(`/relevance-thresholds/${type}`, { value: v })
    await load()
  } catch {
    err.value = 'Ошибка сохранения'
  } finally {
    saving.value = false
  }
}

const canShowContent = computed(() => !loading.value)
const canShowNotification = computed(() => !loading.value)

onMounted(load)
</script>

<template>
  <div>
    <h1 class="text-h4 font-weight-regular mb-8">Пороги релевантности</h1>
    <p v-if="errorMessage" class="text-error mb-4">{{ errorMessage }}</p>
    <v-progress-linear v-if="loading" indeterminate class="mb-8" />

    <v-sheet v-if="canShowContent" border rounded class="pa-8 mb-10">
      <h2 class="text-h6 font-weight-regular mb-6">Общий порог</h2>
      <v-text-field
        v-model="contentValue"
        label="Значение (0–1)"
        variant="outlined"
        density="comfortable"
        class="mb-4"
        :error-messages="contentFieldError ?? undefined"
      />
      <p class="text-body-2 text-medium-emphasis mb-4">Последнее изменение: {{ contentUpdated }}</p>
      <p v-if="contentError" class="text-error mb-2">{{ contentError }}</p>
      <v-btn color="primary" variant="flat" :loading="contentSaving" @click="saveType('CONTENT', contentValue)">
        Сохранить
      </v-btn>
    </v-sheet>

    <v-sheet v-if="canShowNotification" border rounded class="pa-8">
      <h2 class="text-h6 font-weight-regular mb-6">Порог для уведомлений</h2>
      <v-text-field
        v-model="notificationValue"
        label="Значение (0–1)"
        variant="outlined"
        density="comfortable"
        class="mb-4"
        :error-messages="notificationFieldError ?? undefined"
      />
      <p class="text-body-2 text-medium-emphasis mb-4">Последнее изменение: {{ notificationUpdated }}</p>
      <p v-if="notificationError" class="text-error mb-2">{{ notificationError }}</p>
      <v-btn
        color="primary"
        variant="flat"
        :loading="notificationSaving"
        @click="saveType('NOTIFICATION', notificationValue)"
      >
        Сохранить
      </v-btn>
    </v-sheet>
  </div>
</template>
