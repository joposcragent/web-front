# syntax=docker/dockerfile:1

# --- build ---
ARG NODE_VERSION=22
FROM node:${NODE_VERSION}-bookworm AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Vite вшивает VITE_* на этапе сборки; при необходимости передайте --build-arg
ARG VITE_SETTINGS_MANAGER_BASE_URL=http://localhost:8081
ARG VITE_JOB_POSTINGS_CRUD_BASE_URL=http://localhost:8082
ARG VITE_FLOWER_BASE_URL=http://localhost:5555
ENV VITE_SETTINGS_MANAGER_BASE_URL=${VITE_SETTINGS_MANAGER_BASE_URL}
ENV VITE_JOB_POSTINGS_CRUD_BASE_URL=${VITE_JOB_POSTINGS_CRUD_BASE_URL}
ENV VITE_FLOWER_BASE_URL=${VITE_FLOWER_BASE_URL}

COPY . .
RUN npm run build

# --- run (статика + history fallback для Vue Router) ---
FROM nginx:1.27-alpine AS runner

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
	CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
