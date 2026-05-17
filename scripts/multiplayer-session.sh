#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SESSION_DIR="$REPO_ROOT/.tmp/multiplayer-session"
LOG_DIR="$SESSION_DIR/logs"
STATE_FILE="$REPO_ROOT/.tmp/multiplayer-dev/state.env"
mkdir -p "$LOG_DIR"

OPEN_WINDOWS=0
if [[ "${1:-}" == "--open" ]]; then
  OPEN_WINDOWS=1
  shift
fi

wait_for_url() {
  local url="$1"
  local label="$2"
  local retries=60
  local i
  for ((i=1; i<=retries; i+=1)); do
    if curl --silent "$url" >/dev/null 2>&1; then
      echo "$label is ready: $url"
      return
    fi
    sleep 1
  done
  echo "ERROR: $label did not become ready: $url" >&2
  exit 1
}

cleanup() {
  "$REPO_ROOT/scripts/multiplayer-dev-down.sh" >/dev/null 2>&1 || true
}

trap cleanup EXIT INT TERM HUP

"$REPO_ROOT/scripts/multiplayer-dev-up.sh"

if [[ -f "$STATE_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$STATE_FILE"
else
  echo "ERROR: multiplayer state file missing after startup." >&2
  exit 1
fi

wait_for_url "$BACKEND_URL/" "Backend"
wait_for_url "$FRONTEND_URL" "Frontend"

echo ""
echo "Multiplayer session started."
echo "Frontend: $FRONTEND_URL"
echo "Backend:  $BACKEND_URL"
echo "Host URL:  ${FRONTEND_URL}multiplayer?multiplayerDebug=1"
echo "Guest URL: ${FRONTEND_URL}multiplayer?multiplayerDebug=1"
echo "Logs:"
echo "  $LOG_DIR/backend.log"
echo "  $LOG_DIR/frontend.log"
echo ""
echo "Press Ctrl+C to stop both services."

if [[ "$OPEN_WINDOWS" -eq 1 ]]; then
  FRONTEND_PORT="$FRONTEND_PORT" "$REPO_ROOT/scripts/multiplayer-open-two-windows.sh"
fi

while true; do
  sleep 60
done
