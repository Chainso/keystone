#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SCAFFOLD_DIR="$SCRIPT_DIR/scaffold"
AGENT_TEMPLATE_DIR="$SCRIPT_DIR/subagents"
TARGET_DIR=".ultrakit"
CODEX_AGENT_DIR=".codex/agents"

if [ -d "$TARGET_DIR" ]; then
  echo "ultrakit is already initialized (.ultrakit/ exists)."
  exit 0
fi

cp -r "$SCAFFOLD_DIR" "$TARGET_DIR"
mkdir -p "$CODEX_AGENT_DIR"
for agent_file in "$AGENT_TEMPLATE_DIR"/*.toml; do
  target_file="$CODEX_AGENT_DIR/$(basename "$agent_file")"
  if [ ! -e "$target_file" ]; then
    cp "$agent_file" "$target_file"
  fi
done
echo "ultrakit initialized. Created .ultrakit/ with:"
find "$TARGET_DIR" -type f | sort | sed 's/^/  /'
echo "Installed default ultrakit subagents under $CODEX_AGENT_DIR:"
find "$CODEX_AGENT_DIR" -maxdepth 1 -type f -name 'ultrakit_*.toml' | sort | sed 's/^/  /'
