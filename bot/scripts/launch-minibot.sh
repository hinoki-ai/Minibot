#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"

cd "$REPO_DIR"
export CHROME_DESKTOP="${CHROME_DESKTOP:-minibot.desktop}"
export MINIBOT_DISABLE_VISIBLE_INPUT="${MINIBOT_DISABLE_VISIBLE_INPUT:-1}"
exec node "$REPO_DIR/bb.mjs" "$@"
