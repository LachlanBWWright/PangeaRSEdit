#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_DIR="$REPO_ROOT/.tmp/multiplayer-dev"
LOG_DIR="$STATE_DIR/logs"
BACKEND_PID_FILE="$STATE_DIR/backend.pid"
FRONTEND_PID_FILE="$STATE_DIR/frontend.pid"
BACKEND_PGID_FILE="$STATE_DIR/backend.pgid"
FRONTEND_PGID_FILE="$STATE_DIR/frontend.pgid"
STATE_FILE="$STATE_DIR/state.env"

BACKEND_PORT_INPUT="${BACKEND_PORT:-}"
FRONTEND_PORT_INPUT="${FRONTEND_PORT:-}"

mkdir -p "$LOG_DIR"

usage() {
  cat <<EOF
Usage:
  scripts/multiplayer.sh up
  scripts/multiplayer.sh down
  scripts/multiplayer.sh session [--open] [--mock-hub]
  scripts/multiplayer.sh open [--mock-hub]
  scripts/multiplayer.sh playwright [--keep-running] [playwright args...]
  scripts/multiplayer.sh smoke [--mock-hub]

Environment:
  BACKEND_PORT=5047 FRONTEND_PORT=5177 scripts/multiplayer.sh up
EOF
}

cleanup_stale_pid_file() {
  local pid_file="$1"
  local pgid_file="$2"
  if [[ ! -f "$pid_file" ]]; then
    rm -f "$pgid_file"
    return
  fi

  local pid
  pid="$(cat "$pid_file")"
  if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
    return
  fi

  rm -f "$pid_file" "$pgid_file"
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

port_in_use() {
  local port="$1"
  ss -ltn "( sport = :${port} )" 2>/dev/null | grep -q ":${port}"
}

assert_port_free() {
  local port="$1"
  local label="$2"
  if port_in_use "$port"; then
    echo "ERROR: $label port ${port} is already in use." >&2
    echo "Choose a different port, e.g. BACKEND_PORT=... FRONTEND_PORT=..." >&2
    exit 1
  fi
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

  echo "ERROR: could not find a free port near ${start_port}" >&2
  exit 1
}

read_state_if_present() {
  if [[ -f "$STATE_FILE" ]]; then
    # shellcheck disable=SC1090
    source "$STATE_FILE"
  fi
}

write_state() {
  cat >"$STATE_FILE" <<EOF
BACKEND_PORT=${BACKEND_PORT}
FRONTEND_PORT=${FRONTEND_PORT}
BACKEND_URL=${BACKEND_URL}
FRONTEND_URL=${FRONTEND_URL}
EOF
}

kill_process_tree() {
  local pid_file="$1"
  local pgid_file="$2"
  local label="$3"

  if [[ ! -f "$pid_file" ]]; then
    echo "$label not running"
    rm -f "$pgid_file"
    return
  fi

  local pid
  pid="$(cat "$pid_file")"
  local pgid=""
  if [[ -f "$pgid_file" ]]; then
    pgid="$(cat "$pgid_file")"
  fi

  rm -f "$pid_file" "$pgid_file"

  if [[ -z "$pid" ]]; then
    echo "$label pid file was empty"
    return
  fi

  if ! kill -0 "$pid" 2>/dev/null; then
    echo "$label process $pid already stopped"
    return
  fi

  echo "Stopping $label (pid $pid)"
  if [[ -n "$pgid" ]]; then
    kill -TERM "-$pgid" 2>/dev/null || true
  fi
  if command -v pkill >/dev/null 2>&1; then
    pkill -TERM -P "$pid" 2>/dev/null || true
  fi
  kill "$pid" 2>/dev/null || true

  local i
  for ((i=1; i<=20; i+=1)); do
    if ! kill -0 "$pid" 2>/dev/null; then
      return
    fi
    sleep 0.2
  done

  if [[ -n "$pgid" ]]; then
    kill -KILL "-$pgid" 2>/dev/null || true
  fi
  if command -v pkill >/dev/null 2>&1; then
    pkill -KILL -P "$pid" 2>/dev/null || true
  fi
  kill -KILL "$pid" 2>/dev/null || true
}

start_backend() {
  if [[ ! -f "$BACKEND_PID_FILE" ]]; then
    if [[ -n "$BACKEND_PORT_INPUT" ]] && port_in_use "$BACKEND_PORT"; then
      if curl --silent "$BACKEND_URL/" >/dev/null 2>&1; then
        echo "Backend already running on $BACKEND_URL (external process)"
      else
        echo "ERROR: Backend port ${BACKEND_PORT} is in use but not responding as HTTP backend." >&2
        exit 1
      fi
    else
      if [[ -n "$BACKEND_PORT_INPUT" ]]; then
        assert_port_free "$BACKEND_PORT" "Backend"
      fi
      echo "Starting backend on $BACKEND_URL"
      (
        cd "$REPO_ROOT"
        setsid env \
          Frontend__BaseUrl="http://localhost:${FRONTEND_PORT}" \
          Cors__AllowedOrigins__0="http://localhost:${FRONTEND_PORT}" \
          dotnet run \
          --project backend/PangeaRSEdit.Api/PangeaRSEdit.Api.csproj \
          --no-launch-profile \
          --urls "$BACKEND_URL" \
          >"$LOG_DIR/backend.log" 2>&1 &
        echo "$!" >"$BACKEND_PID_FILE"
        echo "$!" >"$BACKEND_PGID_FILE"
      )
    fi
  else
    echo "Backend already running (pid $(cat "$BACKEND_PID_FILE"))"
  fi
}

start_frontend() {
  if [[ ! -f "$FRONTEND_PID_FILE" ]]; then
    if [[ -n "$FRONTEND_PORT_INPUT" ]] && port_in_use "$FRONTEND_PORT"; then
      if curl --silent "$FRONTEND_URL" >/dev/null 2>&1; then
        echo "Frontend already running on $FRONTEND_URL (external process)"
      else
        echo "ERROR: Frontend port ${FRONTEND_PORT} is in use but not serving the app URL." >&2
        exit 1
      fi
    else
      if [[ -n "$FRONTEND_PORT_INPUT" ]]; then
        assert_port_free "$FRONTEND_PORT" "Frontend"
      fi
      echo "Starting frontend on $FRONTEND_URL"
      (
        cd "$REPO_ROOT/frontend"
        setsid env \
          VITE_API_ORIGIN="$BACKEND_URL" \
          VITE_API_BASE_PATH="" \
          npm run dev -- --host localhost --port "$FRONTEND_PORT" --strictPort \
          >"$LOG_DIR/frontend.log" 2>&1 &
        echo "$!" >"$FRONTEND_PID_FILE"
        echo "$!" >"$FRONTEND_PGID_FILE"
      )
    fi
  else
    echo "Frontend already running (pid $(cat "$FRONTEND_PID_FILE"))"
  fi
}

up() {
  cleanup_stale_pid_file "$BACKEND_PID_FILE" "$BACKEND_PGID_FILE"
  cleanup_stale_pid_file "$FRONTEND_PID_FILE" "$FRONTEND_PGID_FILE"

  if [[ ( -f "$BACKEND_PID_FILE" || -f "$FRONTEND_PID_FILE" ) && -f "$STATE_FILE" ]]; then
    read_state_if_present
    if [[ -n "$BACKEND_PORT_INPUT" && "$BACKEND_PORT_INPUT" != "$BACKEND_PORT" ]]; then
      echo "ERROR: existing stack is on BACKEND_PORT=$BACKEND_PORT (requested $BACKEND_PORT_INPUT)." >&2
      echo "Run scripts/multiplayer.sh down first, then retry." >&2
      exit 1
    fi
    if [[ -n "$FRONTEND_PORT_INPUT" && "$FRONTEND_PORT_INPUT" != "$FRONTEND_PORT" ]]; then
      echo "ERROR: existing stack is on FRONTEND_PORT=$FRONTEND_PORT (requested $FRONTEND_PORT_INPUT)." >&2
      echo "Run scripts/multiplayer.sh down first, then retry." >&2
      exit 1
    fi
  else
    if [[ -n "$BACKEND_PORT_INPUT" ]]; then
      BACKEND_PORT="$BACKEND_PORT_INPUT"
    else
      BACKEND_PORT="$(find_free_port 5047)"
    fi

    if [[ -n "$FRONTEND_PORT_INPUT" ]]; then
      FRONTEND_PORT="$FRONTEND_PORT_INPUT"
    else
      FRONTEND_PORT="$(find_free_port 5177)"
    fi

    BACKEND_URL="http://localhost:${BACKEND_PORT}"
    FRONTEND_URL="http://localhost:${FRONTEND_PORT}/PangeaRSEdit/"
  fi

  start_backend
  start_frontend

  wait_for_url "$BACKEND_URL/" "Backend"
  wait_for_url "$FRONTEND_URL" "Frontend"
  write_state

  cat <<EOF

Multiplayer dev stack is up.

Frontend: $FRONTEND_URL
Backend:  $BACKEND_URL

Host URL:  ${FRONTEND_URL}multiplayer?multiplayerDebug=1
Guest URL: ${FRONTEND_URL}multiplayer?multiplayerDebug=1

Logs:
  $LOG_DIR/backend.log
  $LOG_DIR/frontend.log
EOF
}

down() {
  kill_process_tree "$FRONTEND_PID_FILE" "$FRONTEND_PGID_FILE" "Frontend"
  kill_process_tree "$BACKEND_PID_FILE" "$BACKEND_PGID_FILE" "Backend"
  rm -f "$STATE_FILE"

  echo "Multiplayer dev stack stopped."
}

up_or_cleanup() {
  if up; then
    return
  fi

  down
  exit 1
}

open_windows() {
  read_state_if_present
  FRONTEND_PORT="${FRONTEND_PORT:-${FRONTEND_PORT_INPUT:-5177}}"

  local base_url="http://localhost:${FRONTEND_PORT}/PangeaRSEdit/multiplayer?multiplayerDebug=1"
  if [[ "${1:-}" == "--mock-hub" ]]; then
    base_url="${base_url}&multiplayerMockHub=1"
  fi

  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$base_url" >/dev/null 2>&1 || true
    xdg-open "$base_url" >/dev/null 2>&1 || true
    echo "Opened two browser windows:"
    echo "  $base_url"
    return
  fi

  cat <<EOF
xdg-open is not available on this machine.
Open these two URLs manually:
  $base_url
  $base_url
EOF
}

session() {
  local open=0
  local open_args=()

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --open)
        open=1
        shift
        ;;
      --mock-hub)
        open_args+=("--mock-hub")
        shift
        ;;
      *)
        echo "ERROR: unknown session argument: $1" >&2
        exit 1
        ;;
    esac
  done

  trap down EXIT
  trap 'trap - EXIT; down; exit 130' INT TERM HUP
  up_or_cleanup

  read_state_if_present

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

  if [[ "$open" -eq 1 ]]; then
    open_windows "${open_args[@]}"
  fi

  while true; do
    sleep 60
  done
}

playwright_tests() {
  local keep_running=0
  if [[ "${1:-}" == "--keep-running" ]]; then
    keep_running=1
    shift
  fi

  FRONTEND_PORT_INPUT="${FRONTEND_PORT_INPUT:-5173}"

  if [[ "$keep_running" -eq 0 ]]; then
    trap down EXIT
    trap 'trap - EXIT; down; exit 130' INT TERM HUP
  fi

  up_or_cleanup
  read_state_if_present

  cd "$REPO_ROOT/frontend"

  if [[ $# -eq 0 ]]; then
    npx playwright test tests/e2e/multiplayerShell.spec.ts --project=chromium
  else
    npx playwright test "$@"
  fi
}

command="${1:-}"
if [[ $# -gt 0 ]]; then
  shift
fi

case "$command" in
  up)
    trap 'trap - INT TERM HUP; down; exit 130' INT TERM HUP
    up_or_cleanup "$@"
    ;;
  down)
    down "$@"
    ;;
  session)
    session "$@"
    ;;
  smoke)
    session --open "$@"
    ;;
  open)
    open_windows "$@"
    ;;
  playwright)
    playwright_tests "$@"
    ;;
  ""|--help|-h|help)
    usage
    ;;
  *)
    echo "ERROR: unknown command: $command" >&2
    usage >&2
    exit 1
    ;;
esac
