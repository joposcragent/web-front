import type { RouteRecordRaw } from 'vue-router'
import { createRouter, createWebHistory } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/layouts/AppShell.vue'),
    children: [
      {
        path: '',
        name: 'dashboard',
        component: () => import('@/views/DashboardView.vue'),
        meta: { title: 'Дашборд' },
      },
      {
        path: 'orchestrator',
        name: 'orchestrator',
        component: () => import('@/views/OrchestratorView.vue'),
        meta: { title: 'Оркестратор' },
      },
      {
        path: 'settings',
        redirect: '/settings/reference-context',
      },
      {
        path: 'settings/reference-context',
        name: 'reference-context',
        component: () => import('@/views/ReferenceContextView.vue'),
        meta: { title: 'Эталонный контекст' },
      },
      {
        path: 'settings/relevance-thresholds',
        name: 'relevance-thresholds',
        component: () => import('@/views/RelevanceThresholdsView.vue'),
        meta: { title: 'Пороги релевантности' },
      },
      {
        path: 'settings/search-queries',
        name: 'search-queries',
        component: () => import('@/views/SearchQueriesView.vue'),
        meta: { title: 'Поисковые запросы' },
      },
    ],
  },
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})
