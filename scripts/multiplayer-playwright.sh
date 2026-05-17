#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
KEEP_RUNNING=0
BACKEND_PORT="${BACKEND_PORT:-}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"

if [[ "${1:-}" == "--keep-running" ]]; then
  KEEP_RUNNING=1
  shift
fi

if [[ "$KEEP_RUNNING" -eq 0 ]]; then
  "$REPO_ROOT/scripts/multiplayer-dev-down.sh" >/dev/null 2>&1 || true
fi

if [[ -n "$BACKEND_PORT" ]]; then
  BACKEND_PORT="$BACKEND_PORT" FRONTEND_PORT="$FRONTEND_PORT" "$REPO_ROOT/scripts/multiplayer-dev-up.sh"
else
  FRONTEND_PORT="$FRONTEND_PORT" "$REPO_ROOT/scripts/multiplayer-dev-up.sh"
fi

if [[ "$KEEP_RUNNING" -eq 0 ]]; then
  trap '"$REPO_ROOT/scripts/multiplayer-dev-down.sh"' EXIT
fi

cd "$REPO_ROOT/frontend"

if [[ $# -eq 0 ]]; then
  npx playwright test tests/e2e/multiplayerShell.spec.ts --project=chromium
else
  npx playwright test "$@"
fi
