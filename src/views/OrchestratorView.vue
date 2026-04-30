<script setup lang="ts">
import { computed } from 'vue'

const src = computed(() => import.meta.env.VITE_FLOWER_BASE_URL?.trim() ?? '')
</script>

<template>
  <div>
    <h1 class="text-h4 font-weight-regular mb-6">Оркестратор</h1>
    <v-alert
      v-if="!src"
      type="warning"
      variant="tonal"
      class="mb-4"
      border="start"
    >
      Не задан <code class="text-body-2">VITE_FLOWER_BASE_URL</code>
    </v-alert>
    <iframe
      v-else
      :src="src"
      class="orchestrator-frame border rounded-lg"
      title="Celery Flower"
    />
  </div>
</template>

<style scoped>
.orchestrator-frame {
  display: block;
  width: 100%;
  min-height: min(80vh, 900px);
  height: 75vh;
  border-color: rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>
