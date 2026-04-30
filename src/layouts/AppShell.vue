<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, watch } from 'vue'
import { useTheme } from 'vuetify'

import { useNavResize } from '@/composables/useNavResize'
import { useLayoutStore } from '@/stores/layout'
import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore()
const layoutStore = useLayoutStore()
const { mode } = storeToRefs(themeStore)
const { navCollapsed: sideCollapsed } = storeToRefs(layoutStore)

const vuetifyTheme = useTheme()

function syncVuetifyTheme() {
  vuetifyTheme.global.name.value = mode.value
}

syncVuetifyTheme()
watch(mode, syncVuetifyTheme)

const flowerBaseUrl = computed(() => import.meta.env.VITE_FLOWER_BASE_URL ?? '')

const { onResizePointerDown } = useNavResize()

const navInlineStyle = computed(() => {
  if (sideCollapsed.value)
    return undefined
  return { width: `${layoutStore.navWidthPx}px` }
})
</script>

<template>
  <v-app>
    <div class="app-shell d-flex" style="min-height: 100vh">
      <aside
        v-show="!sideCollapsed"
        class="app-shell__nav pa-6 d-flex flex-column"
        :style="navInlineStyle"
      >
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

      <div
        v-show="!sideCollapsed"
        class="app-shell__resizer"
        role="separator"
        aria-orientation="vertical"
        aria-label="Изменить ширину меню"
        @mousedown="onResizePointerDown"
      />

      <div class="app-shell__main d-flex flex-column flex-grow-1" style="min-width: 0">
        <header class="d-flex align-center justify-space-between px-4 px-sm-8 py-4">
          <v-btn
            :icon="sideCollapsed ? 'mdi-menu' : 'mdi-backburger'"
            :aria-label="sideCollapsed ? 'Показать меню' : 'Скрыть меню'"
            variant="text"
            @click="layoutStore.toggleNavCollapsed()"
          />
          <v-btn
            :icon="mode === 'dark' ? 'mdi-weather-sunny' : 'mdi-weather-night'"
            :aria-label="mode === 'dark' ? 'Светлая тема' : 'Тёмная тема'"
            variant="text"
            @click="themeStore.toggle()"
          />
        </header>
        <main class="flex-grow-1 app-shell__content">
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
  flex: 0 0 auto;
  min-width: 0;
  border-right: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  overflow-x: hidden;
  overflow-y: auto;
}

.app-shell__resizer {
  flex: 0 0 6px;
  margin-left: -3px;
  margin-right: -3px;
  cursor: col-resize;
  align-self: stretch;
  background: transparent;
  z-index: 1;
}

.app-shell__resizer:hover,
.app-shell__resizer:focus-visible {
  background: rgba(var(--v-theme-primary), 0.25);
}

.app-shell__main {
  flex: 1 1 auto;
  min-width: 0;
}

.app-shell__content {
  min-width: 0;
}
</style>
