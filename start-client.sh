#!/usr/bin/env bash
set -euo pipefail

SCRIPT_PATH="$(readlink -f -- "${BASH_SOURCE[0]}" 2>/dev/null || printf '%s' "${BASH_SOURCE[0]}")"
ROOT_DIR="$(cd -- "$(dirname -- "$SCRIPT_PATH")" && pwd)"
LOCAL_CHROME="/home/hinoki/.local/opt/google-chrome-147.0.7727.101/opt/google/chrome/chrome"
if [[ -x "$LOCAL_CHROME" && -f "/home/hinoki/.local/opt/google-chrome-147.0.7727.101/opt/google/chrome/v8_context_snapshot.bin" ]]; then
  export MINIBOT_BROWSER_PATH="${MINIBOT_BROWSER_PATH:-$LOCAL_CHROME}"
fi
cd "$ROOT_DIR/bot"
exec node ./scripts/launch-portable-client.mjs "$@"
