#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_FILE="$REPO_ROOT/.tmp/multiplayer-dev/state.env"
FRONTEND_PORT="${FRONTEND_PORT:-5177}"

if [[ -f "$STATE_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$STATE_FILE"
fi

BASE_URL="http://localhost:${FRONTEND_PORT}/PangeaRSEdit/multiplayer?multiplayerDebug=1"

if [[ "${1:-}" == "--mock-hub" ]]; then
  BASE_URL="${BASE_URL}&multiplayerMockHub=1"
fi

if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$BASE_URL" >/dev/null 2>&1 || true
  xdg-open "$BASE_URL" >/dev/null 2>&1 || true
  echo "Opened two browser windows:"
  echo "  $BASE_URL"
  exit 0
fi

cat <<EOF
xdg-open is not available on this machine.
Open these two URLs manually:
  $BASE_URL
  $BASE_URL
EOF
