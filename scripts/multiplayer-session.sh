#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SESSION_DIR="$REPO_ROOT/.tmp/multiplayer-session"
LOG_DIR="$SESSION_DIR/logs"
mkdir -p "$LOG_DIR"

OPEN_WINDOWS=0
if [[ "${1:-}" == "--open" ]]; then
  OPEN_WINDOWS=1
  shift
fi

port_in_use() {
  local port="$1"
  ss -ltn "( sport = :${port} )" | grep -q ":${port}"
}

find_free_port() {
  local start_port="$1"
  local max_tries=80
  local offset
  for ((offset=0; offset<max_tries; offset+=1)); do
    local candidate=$((start_port + offset))
    if ! port_in_use "$candidate"; then
      echo "$candidate"
      return
    fi
  done
  echo "ERROR: unable to find free port near ${start_port}" >&2
  exit 1
}

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

BACKEND_PORT="${BACKEND_PORT:-$(find_free_port 5047)}"
FRONTEND_PORT="${FRONTEND_PORT:-$(find_free_port 5177)}"
BACKEND_URL="http://localhost:${BACKEND_PORT}"
FRONTEND_URL="http://localhost:${FRONTEND_PORT}/PangeaRSEdit/"

if port_in_use "$BACKEND_PORT"; then
  echo "ERROR: BACKEND_PORT $BACKEND_PORT already in use" >&2
  exit 1
fi

if port_in_use "$FRONTEND_PORT"; then
  echo "ERROR: FRONTEND_PORT $FRONTEND_PORT already in use" >&2
  exit 1
fi

cleanup() {
  if [[ -n "${FRONTEND_PID:-}" ]] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
    kill "$FRONTEND_PID" || true
  fi

  if [[ -n "${BACKEND_PID:-}" ]] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" || true
  fi
}

trap cleanup EXIT INT TERM

cd "$REPO_ROOT"
env \
  Frontend__BaseUrl="http://localhost:${FRONTEND_PORT}" \
  Cors__AllowedOrigins__0="http://localhost:${FRONTEND_PORT}" \
  dotnet run \
  --project backend/PangeaRSEdit.Api/PangeaRSEdit.Api.csproj \
  --no-launch-profile \
  --urls "$BACKEND_URL" \
  >"$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID="$!"
echo "$BACKEND_PID" >"$SESSION_DIR/backend.pid"

cd "$REPO_ROOT/frontend"
env \
  VITE_API_ORIGIN="$BACKEND_URL" \
  VITE_API_BASE_PATH="" \
  npm run dev -- --host localhost --port "$FRONTEND_PORT" --strictPort \
  >"$LOG_DIR/frontend.log" 2>&1 &
FRONTEND_PID="$!"
echo "$FRONTEND_PID" >"$SESSION_DIR/frontend.pid"

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

wait "$FRONTEND_PID" "$BACKEND_PID"
