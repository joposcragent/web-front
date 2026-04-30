import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

const WIDTH_KEY = 'joposcragent-nav-width'
const COLLAPSED_KEY = 'joposcragent-nav-collapsed'

const DEFAULT_WIDTH = 260
const MIN_WIDTH = 200
const MAX_WIDTH = 480

function readWidth(): number {
  try {
    const raw = localStorage.getItem(WIDTH_KEY)
    if (raw == null) return DEFAULT_WIDTH
    const n = Number.parseInt(raw, 10)
    if (!Number.isFinite(n)) return DEFAULT_WIDTH
    return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, n))
  } catch {
    return DEFAULT_WIDTH
  }
}

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

export const useLayoutStore = defineStore('layout', () => {
  const navWidthPx = ref(readWidth())
  const navCollapsed = ref(readCollapsed())

  const navWidthStyle = computed(() =>
    navCollapsed.value ? '0' : `${navWidthPx.value}px`,
  )

  function setNavWidthPx(next: number) {
    navWidthPx.value = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(next)))
    try {
      localStorage.setItem(WIDTH_KEY, String(navWidthPx.value))
    } catch {
      /* ignore */
    }
  }

  function toggleNavCollapsed() {
    navCollapsed.value = !navCollapsed.value
    try {
      localStorage.setItem(COLLAPSED_KEY, navCollapsed.value ? '1' : '0')
    } catch {
      /* ignore */
    }
  }

  return {
    navWidthPx,
    navCollapsed,
    navWidthStyle,
    minNavWidth: MIN_WIDTH,
    maxNavWidth: MAX_WIDTH,
    setNavWidthPx,
    toggleNavCollapsed,
  }
})
