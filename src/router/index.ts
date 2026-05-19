import type { RouteRecordRaw } from "vue-router";
import { createRouter, createWebHistory } from "vue-router";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    component: () => import("@/layouts/AppShell.vue"),
    children: [
      {
        path: "",
        name: "dashboard",
        component: () => import("@/views/DashboardView.vue"),
        meta: { title: "Дашборд" },
      },
      {
        path: "vacancies",
        name: "vacancies",
        component: () => import("@/views/VacanciesView.vue"),
        meta: { title: "Вакансии" },
      },
      {
        path: "orchestrator/async-jobs",
        name: "orchestrator-async-jobs",
        component: () => import("@/views/OrchestratorAsyncJobsView.vue"),
        meta: { title: "Оркестратор" },
      },
      {
        path: "scheduler",
        redirect: "/settings/scheduler",
      },
      {
        path: "settings",
        redirect: "/settings/reference-context",
      },
      {
        path: "settings/reference-context",
        name: "reference-context",
        component: () => import("@/views/ReferenceContextView.vue"),
        meta: { title: "Эталонный контекст" },
      },
      {
        path: "settings/prompt-template",
        name: "prompt-template",
        component: () => import("@/views/PromptTemplateView.vue"),
        meta: { title: "Настройка промпта" },
      },
      {
        path: "settings/search-queries",
        name: "search-queries",
        component: () => import("@/views/SearchQueriesView.vue"),
        meta: { title: "Поисковые запросы" },
      },
      {
        path: "settings/scheduler",
        name: "scheduler",
        component: () => import("@/views/SchedulerView.vue"),
        meta: { title: "Планировщик" },
      },
    ],
  },
];

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

const DEFAULT_TITLE = "Joposcragent";

router.afterEach((to) => {
  const routeTitle =
    typeof to.meta.title === "string" ? to.meta.title.trim() : "";
  document.title =
    routeTitle.length > 0 ? `${routeTitle} · ${DEFAULT_TITLE}` : DEFAULT_TITLE;
});
