#!/usr/bin/env bash
set -euo pipefail

# Сборка образа: тег <IMAGE_NAME>:<версия>, затем тот же образ как <IMAGE_NAME>:latest.
#
# Переменные окружения (все опционально):
#   IMAGE_NAME, IMAGE_VERSION — имя образа и тег версии
#   NODE_VERSION — базовый образ Node (по умолчанию 22)
#   VITE_SETTINGS_MANAGER_BASE_URL, VITE_JOB_POSTINGS_CRUD_BASE_URL — по умолчанию пустые
#     (axios ходит на тот же origin; nginx проксирует на бэкенды). VITE_FLOWER_BASE_URL — ссылка на Flower.
#   VITE_HH_SEARCH_BASE_URL — база для ссылок на hh.ru (по умолчанию https://hh.ru/search/vacancy).
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
vite_flower="${VITE_FLOWER_BASE_URL:-http://localhost:5555}"
vite_hh_search="${VITE_HH_SEARCH_BASE_URL:-https://hh.ru/search/vacancy}"

docker build \
	--build-arg "NODE_VERSION=${node_version}" \
	--build-arg "VITE_SETTINGS_MANAGER_BASE_URL=${vite_settings}" \
	--build-arg "VITE_JOB_POSTINGS_CRUD_BASE_URL=${vite_crud}" \
	--build-arg "VITE_FLOWER_BASE_URL=${vite_flower}" \
	--build-arg "VITE_HH_SEARCH_BASE_URL=${vite_hh_search}" \
	-t "${tag_versioned}" \
	"$@" \
	.
docker tag "${tag_versioned}" "${image_name}:latest"

printf 'Образ: %s и %s:latest\n' "${tag_versioned}" "${image_name}"
