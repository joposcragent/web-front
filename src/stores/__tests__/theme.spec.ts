import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { useThemeStore } from '@/stores/theme'

describe('useThemeStore', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('defaults to light', () => {
    const s = useThemeStore()
    expect(s.mode).toBe('light')
  })

  it('toggles and persists', () => {
    const s = useThemeStore()
    s.toggle()
    expect(s.mode).toBe('dark')
    expect(localStorage.getItem('joposcragent-theme')).toBe('dark')
    s.toggle()
    expect(s.mode).toBe('light')
  })
})
