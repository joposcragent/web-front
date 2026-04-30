import { onUnmounted } from 'vue'

import { useLayoutStore } from '@/stores/layout'

/** Перетаскивание разделителя меню ↔ контент. */
export function useNavResize() {
  const layout = useLayoutStore()
  let active = false
  let startX = 0
  let startWidth = 0

  function onMove(e: MouseEvent) {
    if (!active)
      return
    const delta = e.clientX - startX
    layout.setNavWidthPx(startWidth + delta)
  }

  function onUp() {
    if (!active)
      return
    active = false
    document.body.style.removeProperty('user-select')
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }

  function onResizePointerDown(e: MouseEvent) {
    if (layout.navCollapsed)
      return
    e.preventDefault()
    active = true
    startX = e.clientX
    startWidth = layout.navWidthPx
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  onUnmounted(onUp)

  return { onResizePointerDown }
}
