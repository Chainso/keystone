#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
layout_file="${repo_root}/scripts/zellij/ui-dev-workspace.kdl"

if ! command -v zellij >/dev/null 2>&1; then
  echo "zellij is not installed or not on PATH" >&2
  exit 1
fi

cd "${repo_root}"
exec zellij --layout "${layout_file}"
