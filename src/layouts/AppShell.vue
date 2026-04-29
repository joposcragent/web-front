<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, watch } from 'vue'
import { useTheme } from 'vuetify'

import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore()
const { mode } = storeToRefs(themeStore)
const vuetifyTheme = useTheme()

function syncVuetifyTheme() {
  vuetifyTheme.global.name.value = mode.value
}

syncVuetifyTheme()
watch(mode, syncVuetifyTheme)

const flowerBaseUrl = computed(() => import.meta.env.VITE_FLOWER_BASE_URL ?? '')
</script>

<template>
  <v-app>
    <div class="app-shell d-flex" style="min-height: 100vh">
      <aside class="app-shell__nav pa-6 d-flex flex-column">
        <div class="text-caption text-medium-emphasis mb-6 text-uppercase" style="letter-spacing: 0.08em">
          Joposcragent
        </div>

        <v-list density="comfortable" class="bg-transparent pa-0 flex-grow-1" nav>
          <v-list-subheader class="text-body-1 font-weight-medium px-0 mb-1">Главная</v-list-subheader>
          <v-list-item to="/" title="Дашборд" rounded="lg" />
          <v-list-item
            v-if="flowerBaseUrl"
            :href="flowerBaseUrl"
            target="_blank"
            rel="noopener noreferrer"
            title="Оркестратор"
            rounded="lg"
          />

          <v-list-subheader class="text-body-1 font-weight-medium px-0 mb-1 mt-8">Настройки</v-list-subheader>
          <v-list-item
            to="/settings/reference-context"
            title="Эталонный контекст"
            rounded="lg"
          />
          <v-list-item
            to="/settings/relevance-thresholds"
            title="Пороги релевантности"
            rounded="lg"
          />
          <v-list-item to="/settings/search-queries" title="Поисковые запросы" rounded="lg" />
        </v-list>
      </aside>

      <div class="app-shell__main d-flex flex-column flex-grow-1" style="min-width: 0">
        <header class="d-flex justify-end align-center px-8 py-4">
          <v-btn
            :icon="mode === 'dark' ? 'mdi-weather-sunny' : 'mdi-weather-night'"
            :aria-label="mode === 'dark' ? 'Светлая тема' : 'Тёмная тема'"
            @click="themeStore.toggle()"
          />
        </header>
        <main class="flex-grow-1">
          <div class="app-content-inner">
            <router-view />
          </div>
        </main>
      </div>
    </div>
  </v-app>
</template>

<style scoped>
.app-shell__nav {
  flex: 0 0 15%;
  min-width: 200px;
  max-width: 280px;
  border-right: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.app-shell__main {
  flex: 1 1 85%;
}
</style>
