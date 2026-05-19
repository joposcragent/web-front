import { watch } from 'vue'
import type { RouteLocationNormalizedLoaded, Router } from 'vue-router'

function parseFocusUuid(
  route: RouteLocationNormalizedLoaded,
): string | undefined {
  const raw = route.query.focus
  if (typeof raw === 'string' && raw.trim()) return raw.trim()
  if (Array.isArray(raw) && raw[0]) return String(raw[0]).trim()
  return undefined
}

export function useSearchQueryFocus(params: {
  route: RouteLocationNormalizedLoaded
  router: Router
  openEditByUuid: (uuid: string) => Promise<void> | void
  immediate?: boolean
}) {
  const { route, router, openEditByUuid, immediate = true } = params

  async function consumeFocus(): Promise<void> {
    const focusUuid = parseFocusUuid(route)
    if (!focusUuid) return
    await openEditByUuid(focusUuid)
    const nextQuery = { ...route.query }
    delete nextQuery.focus
    await router.replace({ path: route.path, query: nextQuery })
  }

  watch(
    () => route.query.focus,
    () => {
      void consumeFocus()
    },
    { immediate },
  )

  return { consumeFocus }
}
