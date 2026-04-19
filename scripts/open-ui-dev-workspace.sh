#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
layout_file="${repo_root}/scripts/zellij/ui-dev-workspace.kdl"
browser_url="${KEYSTONE_BROWSER_URL:-${KEYSTONE_BASE_URL:-http://127.0.0.1:8787}}"
open_browser="${KEYSTONE_OPEN_BROWSER:-1}"

find_browser_opener() {
  if command -v xdg-open >/dev/null 2>&1; then
    echo "xdg-open"
    return 0
  fi

  if command -v open >/dev/null 2>&1; then
    echo "open"
    return 0
  fi

  if command -v wslview >/dev/null 2>&1; then
    echo "wslview"
    return 0
  fi

  return 1
}

launch_browser_when_ready() {
  local opener

  if [[ "${open_browser}" == "0" || "${open_browser}" == "false" ]]; then
    return 0
  fi

  if ! opener="$(find_browser_opener)"; then
    echo "no supported browser opener found; skipping automatic browser launch" >&2
    return 0
  fi

  (
    for _ in $(seq 1 90); do
      if curl --fail --silent "${browser_url}/v1/health" >/dev/null 2>&1; then
        "${opener}" "${browser_url}" >/dev/null 2>&1 || true
        exit 0
      fi
      sleep 1
    done

    echo "timed out waiting for ${browser_url}; skipping automatic browser launch" >&2
  ) &
}

if ! command -v zellij >/dev/null 2>&1; then
  echo "zellij is not installed or not on PATH" >&2
  exit 1
fi

cd "${repo_root}"
launch_browser_when_ready
exec zellij --layout "${layout_file}"
