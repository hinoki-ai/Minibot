#!/usr/bin/env bash
set -euo pipefail

SCRIPT_PATH="$(readlink -f -- "${BASH_SOURCE[0]}" 2>/dev/null || printf '%s' "${BASH_SOURCE[0]}")"
ROOT_DIR="$(cd -- "$(dirname -- "$SCRIPT_PATH")" && pwd)"
cd "$ROOT_DIR/bot"
exec node ./bb.mjs "$@"
