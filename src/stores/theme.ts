import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

const STORAGE_KEY = 'joposcragent-theme'

export type ThemeMode = 'light' | 'dark'

function readStored(): ThemeMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'dark' || v === 'light') return v
  } catch {
    /* ignore */
  }
  return 'light'
}

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>(readStored())

  const isDark = computed(() => mode.value === 'dark')

  function setMode(next: ThemeMode) {
    mode.value = next
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }

  function toggle() {
    setMode(mode.value === 'light' ? 'dark' : 'light')
  }

  return { mode, isDark, setMode, toggle }
})
