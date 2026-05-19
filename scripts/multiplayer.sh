#!/usr/bin/env bash
# Starts the local multiplayer dev stack.
#
# Runtime assets:
#   - Builds Cro-Mag Rally and Nanosaur 2 only when their staged frontend
#     assets are missing.
#   - Use --rebuild-games after changing game source or pulling pangea-ports
#     updates so the frontend gets fresh .js/.wasm/.data files.
#
# Usage:
#   scripts/multiplayer.sh
#   scripts/multiplayer.sh --rebuild-games
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$REPO_ROOT/.tmp/multiplayer-dev/logs"

BACKEND_PORT=5047
FRONTEND_PORT=5177
BACKEND_URL="http://localhost:${BACKEND_PORT}"
FRONTEND_ORIGIN="http://localhost:${FRONTEND_PORT}"
FRONTEND_URL="http://localhost:${FRONTEND_PORT}/PangeaRSEdit/"

BACKEND_PID=""
FRONTEND_PID=""
FORCE_REBUILD_GAMES=0

mkdir -p "$LOG_DIR"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --rebuild-games|--force-rebuild-games)
      FORCE_REBUILD_GAMES=1
      shift
      ;;
    *)
      echo "ERROR: unknown argument: $1" >&2
      echo "Usage: scripts/multiplayer.sh [--rebuild-games]" >&2
      exit 1
      ;;
  esac
done

ensure_runtime_assets() {
  local missing_games=()

  if [[ "$FORCE_REBUILD_GAMES" -eq 1 ]] ||
    [[ ! -f "$REPO_ROOT/frontend/public/generated/pangea-ports/wasm/cromagrally/CroMagRally.js" ]] ||
    [[ ! -f "$REPO_ROOT/frontend/public/generated/pangea-ports/wasm/cromagrally/CroMagRally.wasm" ]] ||
    [[ ! -f "$REPO_ROOT/frontend/public/generated/pangea-ports/wasm/cromagrally/CroMagRally.data" ]]; then
    missing_games+=("cromagrally")
  fi

  if [[ "$FORCE_REBUILD_GAMES" -eq 1 ]] ||
    [[ ! -f "$REPO_ROOT/frontend/public/generated/pangea-ports/wasm/nanosaur2/Nanosaur2.js" ]] ||
    [[ ! -f "$REPO_ROOT/frontend/public/generated/pangea-ports/wasm/nanosaur2/Nanosaur2.wasm" ]] ||
    [[ ! -f "$REPO_ROOT/frontend/public/generated/pangea-ports/wasm/nanosaur2/Nanosaur2.data" ]]; then
    missing_games+=("nanosaur2")
  fi

  if [[ "${#missing_games[@]}" -eq 0 ]]; then
    return
  fi

  echo "Preparing multiplayer runtime assets..."

  local game
  for game in "${missing_games[@]}"; do
    "$REPO_ROOT/scripts/build-pangea-ports.sh" --game "$game"
  done
}

port_in_use() {
  local port="$1"
  ss -ltn "( sport = :${port} )" 2>/dev/null | grep -q ":${port}"
}

list_port_pids() {
  local port="$1"

  if command -v lsof >/dev/null 2>&1; then
    lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true
    return
  fi

  if command -v fuser >/dev/null 2>&1; then
    fuser "${port}/tcp" 2>/dev/null | tr ' ' '\n' || true
  fi
}

stop_pid() {
  local pid="$1"
  local label="$2"

  if [[ -z "$pid" ]] || ! kill -0 "$pid" 2>/dev/null; then
    return
  fi

  echo "Stopping existing $label process $pid"
  kill -TERM "$pid" 2>/dev/null || true

  if command -v pkill >/dev/null 2>&1; then
    pkill -TERM -P "$pid" 2>/dev/null || true
  fi

  local i
  for ((i=1; i<=20; i+=1)); do
    if ! kill -0 "$pid" 2>/dev/null; then
      return
    fi

    sleep 0.2
  done

  kill -KILL "$pid" 2>/dev/null || true

  if command -v pkill >/dev/null 2>&1; then
    pkill -KILL -P "$pid" 2>/dev/null || true
  fi
}

cleanup_port() {
  local port="$1"
  local label="$2"
  local pids=()
  local pid

  while IFS= read -r pid; do
    if [[ -n "$pid" ]]; then
      pids+=("$pid")
    fi
  done < <(list_port_pids "$port")

  if [[ "${#pids[@]}" -eq 0 ]]; then
    return
  fi

  echo "$label port ${port} is already in use; cleaning it up."

  for pid in "${pids[@]}"; do
    stop_pid "$pid" "$label"
  done
}

assert_port_free() {
  local port="$1"
  local label="$2"

  if port_in_use "$port"; then
    echo "ERROR: $label port ${port} is already in use." >&2
    exit 1
  fi
}

wait_for_url() {
  local url="$1"
  local label="$2"
  local pid="$3"
  local log_path="$4"
  local retries=60
  local i

  for ((i=1; i<=retries; i+=1)); do
    if ! kill -0 "$pid" 2>/dev/null; then
      echo "ERROR: $label stopped before it became ready." >&2
      echo "See log: $log_path" >&2
      exit 1
    fi

    if curl --silent "$url" >/dev/null 2>&1; then
      echo "$label is ready: $url"
      return
    fi

    sleep 1
  done

  echo "ERROR: $label did not become ready: $url" >&2
  echo "See log: $log_path" >&2
  exit 1
}

assert_url_served() {
  local url="$1"
  local label="$2"
  local status

  status="$(curl --silent --output /dev/null --write-out "%{http_code}" --head "$url" 2>/dev/null || true)"
  if [[ "$status" == "200" ]]; then
    return
  fi

  echo "ERROR: $label is not being served by the frontend: $url" >&2
  echo "HTTP status: ${status:-unreachable}" >&2
  echo "See log: $LOG_DIR/frontend.log" >&2
  exit 1
}

assert_runtime_assets_served() {
  assert_url_served "${FRONTEND_URL}generated/pangea-ports/wasm/cromagrally/CroMagRally.js" "Cro-Mag Rally runtime script"
  assert_url_served "${FRONTEND_URL}generated/pangea-ports/wasm/cromagrally/CroMagRally.wasm" "Cro-Mag Rally runtime wasm"
  assert_url_served "${FRONTEND_URL}generated/pangea-ports/wasm/cromagrally/CroMagRally.data" "Cro-Mag Rally runtime data"
  assert_url_served "${FRONTEND_URL}generated/pangea-ports/wasm/nanosaur2/Nanosaur2.js" "Nanosaur 2 runtime script"
  assert_url_served "${FRONTEND_URL}generated/pangea-ports/wasm/nanosaur2/Nanosaur2.wasm" "Nanosaur 2 runtime wasm"
  assert_url_served "${FRONTEND_URL}generated/pangea-ports/wasm/nanosaur2/Nanosaur2.data" "Nanosaur 2 runtime data"
}

stop_process_group() {
  local pid="$1"
  local label="$2"

  if [[ -z "$pid" ]] || ! kill -0 "$pid" 2>/dev/null; then
    return
  fi

  echo "Stopping $label"
  kill -TERM "-$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true

  local i
  for ((i=1; i<=20; i+=1)); do
    if ! kill -0 "$pid" 2>/dev/null; then
      return
    fi

    sleep 0.2
  done

  kill -KILL "-$pid" 2>/dev/null || kill -KILL "$pid" 2>/dev/null || true
}

shutdown() {
  trap - EXIT INT TERM HUP
  stop_process_group "$FRONTEND_PID" "frontend"
  stop_process_group "$BACKEND_PID" "backend"
}

handle_interrupt() {
  shutdown
  exit 130
}

start_backend() {
  echo "Starting backend on $BACKEND_URL"

  (
    cd "$REPO_ROOT"
    exec setsid env \
      Frontend__BaseUrl="$FRONTEND_ORIGIN" \
      Cors__AllowedOrigins__0="$FRONTEND_ORIGIN" \
      dotnet run \
        --project backend/PangeaRSEdit.Api/PangeaRSEdit.Api.csproj \
        --no-launch-profile \
        --urls "$BACKEND_URL"
  ) >"$LOG_DIR/backend.log" 2>&1 &

  BACKEND_PID="$!"
}

start_frontend() {
  echo "Starting frontend on $FRONTEND_URL"

  (
    cd "$REPO_ROOT/frontend"
    exec setsid env \
      VITE_API_ORIGIN="$BACKEND_URL" \
      VITE_API_BASE_PATH="" \
      npm run dev -- --host localhost --port "$FRONTEND_PORT" --strictPort
  ) >"$LOG_DIR/frontend.log" 2>&1 &

  FRONTEND_PID="$!"
}

trap shutdown EXIT
trap handle_interrupt INT TERM HUP

ensure_runtime_assets

cleanup_port "$FRONTEND_PORT" "Frontend"
cleanup_port "$BACKEND_PORT" "Backend"

assert_port_free "$BACKEND_PORT" "Backend"
assert_port_free "$FRONTEND_PORT" "Frontend"

start_backend
start_frontend

wait_for_url "$BACKEND_URL/" "Backend" "$BACKEND_PID" "$LOG_DIR/backend.log"
wait_for_url "$FRONTEND_URL" "Frontend" "$FRONTEND_PID" "$LOG_DIR/frontend.log"
assert_runtime_assets_served

cat <<EOF

Multiplayer test stack is running.

Frontend: $FRONTEND_URL
Backend:  $BACKEND_URL

Host URL:  ${FRONTEND_URL}multiplayer?multiplayerDebug=1
Guest URL: ${FRONTEND_URL}multiplayer?multiplayerDebug=1

Logs:
  $LOG_DIR/backend.log
  $LOG_DIR/frontend.log

Press Ctrl+C to stop both services.
EOF

while true; do
  sleep 60
done
