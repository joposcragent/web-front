#!/usr/bin/env bash
set -euo pipefail

# Сборка образа: тег <IMAGE_NAME>:<версия>, затем тот же образ как <IMAGE_NAME>:latest.
#
# Переменные окружения (все опционально):
#   IMAGE_NAME, IMAGE_VERSION — имя образа и тег версии
#   NODE_VERSION — базовый образ Node (по умолчанию 22)
#   VITE_SETTINGS_MANAGER_BASE_URL, VITE_JOB_POSTINGS_CRUD_BASE_URL, VITE_JOB_POSTINGS_EVALUATOR_BASE_URL —
#     по умолчанию пустые (axios ходит на тот же origin; nginx проксирует на бэкенды).
#   VITE_HH_SEARCH_BASE_URL — база для ссылок на hh.ru (по умолчанию https://hh.ru/search/vacancy).
#   VITE_CELERY_ORCHESTRATOR_BASE_URL — по умолчанию пусто (nginx проксирует /events-queue).
#     Не использовать имя сервиса Docker — только пустая строка или URL, доступный из браузера.
#   VITE_GIT_COMMIT — хэш для футера SPA; если не задан, скрипт подставляет `git rev-parse --short HEAD`
#     из корня репозитория web-front (на хосте, до копирования в Docker).
#
# Дополнительные аргументы передаются в docker build после наших --build-arg (можно переопределить VITE_*).

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "${script_dir}/.." && pwd)"
cd "${repo_root}"

image_name="${IMAGE_NAME:-joposcragent/web-front}"
version="${IMAGE_VERSION:-$(node -p "require('./package.json').version")}"
tag_versioned="${image_name}:${version}"

node_version="${NODE_VERSION:-22}"
vite_settings="${VITE_SETTINGS_MANAGER_BASE_URL:-}"
vite_crud="${VITE_JOB_POSTINGS_CRUD_BASE_URL:-}"
vite_evaluator="${VITE_JOB_POSTINGS_EVALUATOR_BASE_URL:-}"
vite_flower="${VITE_FLOWER_BASE_URL:-http://localhost:5555}"
vite_hh_search="${VITE_HH_SEARCH_BASE_URL:-https://hh.ru/search/vacancy}"
# Пусто по умолчанию: запросы с браузера идут на тот же origin, nginx проксирует /events-queue.
# Не задавайте сюда http://celery-orchestrator-api:8000 — имя не резолвится в браузере.
vite_orchestrator="${VITE_CELERY_ORCHESTRATOR_BASE_URL:-}"

vite_git_commit="${VITE_GIT_COMMIT:-}"
if [[ -z "${vite_git_commit}" ]] && git -C "${repo_root}" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
	vite_git_commit="$(git -C "${repo_root}" rev-parse --short HEAD 2>/dev/null || true)"
fi

docker build \
	--build-arg "NODE_VERSION=${node_version}" \
	--build-arg "VITE_SETTINGS_MANAGER_BASE_URL=${vite_settings}" \
	--build-arg "VITE_JOB_POSTINGS_CRUD_BASE_URL=${vite_crud}" \
	--build-arg "VITE_JOB_POSTINGS_EVALUATOR_BASE_URL=${vite_evaluator}" \
	--build-arg "VITE_FLOWER_BASE_URL=${vite_flower}" \
	--build-arg "VITE_HH_SEARCH_BASE_URL=${vite_hh_search}" \
	--build-arg "VITE_CELERY_ORCHESTRATOR_BASE_URL=${vite_orchestrator}" \
	--build-arg "VITE_GIT_COMMIT=${vite_git_commit}" \
	-t "${tag_versioned}" \
	"$@" \
	.
docker tag "${tag_versioned}" "${image_name}:latest"

printf 'Образ: %s и %s:latest\n' "${tag_versioned}" "${image_name}"
