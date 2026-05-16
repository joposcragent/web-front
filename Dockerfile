# syntax=docker/dockerfile:1

# --- build ---
ARG NODE_VERSION=22
FROM node:${NODE_VERSION}-bookworm AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Vite вшивает `VITE_*` на этапе сборки. Пустые API URL — same-origin через nginx (см. nginx.conf, в т.ч. /evaluate).
# Передайте хэш коммита, чтобы он отображался в футере SPA, например:
#   docker build --build-arg VITE_GIT_COMMIT="$(git rev-parse --short HEAD)" ...
ARG VITE_SETTINGS_MANAGER_BASE_URL=
ARG VITE_JOB_POSTINGS_CRUD_BASE_URL=
ARG VITE_JOB_POSTINGS_EVALUATOR_BASE_URL=
ARG VITE_HH_SEARCH_BASE_URL=https://hh.ru/search/vacancy
ARG VITE_ORCHESTRATION_CONDUCTOR_BASE_URL=
ARG VITE_ORCHESTRATION_SCHEDULER_BASE_URL=
ARG VITE_GIT_COMMIT=
ENV VITE_SETTINGS_MANAGER_BASE_URL=${VITE_SETTINGS_MANAGER_BASE_URL}
ENV VITE_JOB_POSTINGS_CRUD_BASE_URL=${VITE_JOB_POSTINGS_CRUD_BASE_URL}
ENV VITE_JOB_POSTINGS_EVALUATOR_BASE_URL=${VITE_JOB_POSTINGS_EVALUATOR_BASE_URL}
ENV VITE_HH_SEARCH_BASE_URL=${VITE_HH_SEARCH_BASE_URL}
ENV VITE_ORCHESTRATION_CONDUCTOR_BASE_URL=${VITE_ORCHESTRATION_CONDUCTOR_BASE_URL}
ENV VITE_ORCHESTRATION_SCHEDULER_BASE_URL=${VITE_ORCHESTRATION_SCHEDULER_BASE_URL}
ENV VITE_GIT_COMMIT=${VITE_GIT_COMMIT}

COPY . .
RUN npm run build

# --- run (статика + history fallback для Vue Router) ---
FROM nginx:1.27-alpine AS runner

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
	CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
