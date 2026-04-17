#!/usr/bin/env bash

set -euo pipefail

requested_shell="${1:-bash}"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is not installed or not on PATH" >&2
  exit 1
fi

list_sandbox_containers() {
  docker ps --format '{{.ID}}\t{{.Image}}\t{{.Names}}\t{{.Status}}' \
    | awk -F '\t' '
      $2 == "keystone-cloudflare-sandbox:worker" || $2 ~ /^cloudflare-dev\/sandbox:/ {
        print $0
      }
    '
}

select_container_id() {
  local count
  local index
  local selection
  local selected_line

  count="${#container_rows[@]}"

  if [[ "${count}" -eq 0 ]]; then
    return 1
  fi

  if [[ "${count}" -eq 1 ]]; then
    printf '%s\n' "${container_rows[0]%%$'\t'*}"
    return 0
  fi

  if [[ ! -t 0 || ! -t 1 ]]; then
    echo "multiple sandbox containers found, but no interactive terminal is available" >&2
    printf '%s\n' "${container_rows[0]%%$'\t'*}"
    return 0
  fi

  echo "Multiple sandbox containers are running. Pick one:" >&2

  for ((index = 0; index < count; index += 1)); do
    IFS=$'\t' read -r container_id image name status <<<"${container_rows[index]}"
    printf '%2d) %s\n' "$((index + 1))" "${container_id}  ${name}  ${status}  ${image}" >&2
  done

  while true; do
    printf 'Selection [1-%d]: ' "${count}" >&2
    IFS= read -r selection

    if [[ "${selection}" =~ ^[0-9]+$ ]] && (( selection >= 1 && selection <= count )); then
      selected_line="${container_rows[selection - 1]}"
      printf '%s\n' "${selected_line%%$'\t'*}"
      return 0
    fi

    echo "Invalid selection." >&2
  done
}

mapfile -t container_rows < <(list_sandbox_containers)

container_id="$(select_container_id || true)"

if [[ -z "${container_id}" ]]; then
  cat >&2 <<'EOF'
No running sandbox container found for this project.

Start `npm run dev`, then hit a route that creates a sandbox before retrying.
EOF
  exit 1
fi

resolve_shell() {
  local candidate

  for candidate in "${requested_shell}" bash zsh sh ash; do
    if docker exec "${container_id}" "${candidate}" -c 'exit 0' >/dev/null 2>&1; then
      printf '%s\n' "${candidate}"
      return 0
    fi
  done

  return 1
}

resolved_shell="$(resolve_shell || true)"

if [[ -z "${resolved_shell}" ]]; then
  echo "no supported shell found in container ${container_id}" >&2
  exit 1
fi

echo "Opening ${resolved_shell} in sandbox container ${container_id}..." >&2
exec docker exec -it "${container_id}" "${resolved_shell}"
