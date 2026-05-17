#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_DIR="$REPO_ROOT/.tmp/multiplayer-dev"
LOG_DIR="$STATE_DIR/logs"
BACKEND_PID_FILE="$STATE_DIR/backend.pid"
FRONTEND_PID_FILE="$STATE_DIR/frontend.pid"
STATE_FILE="$STATE_DIR/state.env"

BACKEND_PORT_INPUT="${BACKEND_PORT:-}"
FRONTEND_PORT_INPUT="${FRONTEND_PORT:-}"

mkdir -p "$LOG_DIR"

cleanup_stale_pid_file() {
  local pid_file="$1"
  if [[ ! -f "$pid_file" ]]; then
    return
  fi

  local pid
  pid="$(cat "$pid_file")"
  if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
    return
  fi

  rm -f "$pid_file"
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

assert_port_free() {
  local port="$1"
  local label="$2"
  if ss -ltn "( sport = :${port} )" | grep -q ":${port}"; then
    echo "ERROR: $label port ${port} is already in use." >&2
    echo "Choose a different port, e.g. BACKEND_PORT=... FRONTEND_PORT=..." >&2
    exit 1
  fi
}

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
    if ! ss -ltn "( sport = :${candidate} )" | grep -q ":${candidate}"; then
      echo "$candidate"
      return
    fi
  done

  echo "ERROR: could not find a free port near ${start_port}" >&2
  exit 1
}

cleanup_stale_pid_file "$BACKEND_PID_FILE"
cleanup_stale_pid_file "$FRONTEND_PID_FILE"

if [[ ( -f "$BACKEND_PID_FILE" || -f "$FRONTEND_PID_FILE" ) && -f "$STATE_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$STATE_FILE"
  if [[ -n "$BACKEND_PORT_INPUT" && "$BACKEND_PORT_INPUT" != "$BACKEND_PORT" ]]; then
    echo "ERROR: existing stack is on BACKEND_PORT=$BACKEND_PORT (requested $BACKEND_PORT_INPUT)." >&2
    echo "Run scripts/multiplayer-dev-down.sh first, then retry." >&2
    exit 1
  fi
  if [[ -n "$FRONTEND_PORT_INPUT" && "$FRONTEND_PORT_INPUT" != "$FRONTEND_PORT" ]]; then
    echo "ERROR: existing stack is on FRONTEND_PORT=$FRONTEND_PORT (requested $FRONTEND_PORT_INPUT)." >&2
    echo "Run scripts/multiplayer-dev-down.sh first, then retry." >&2
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
      nohup env \
        Frontend__BaseUrl="http://localhost:${FRONTEND_PORT}" \
        Cors__AllowedOrigins__0="http://localhost:${FRONTEND_PORT}" \
        dotnet run \
        --project backend/PangeaRSEdit.Api/PangeaRSEdit.Api.csproj \
        --no-launch-profile \
        --urls "$BACKEND_URL" \
        >"$LOG_DIR/backend.log" 2>&1 &
      echo "$!" >"$BACKEND_PID_FILE"
    )
  fi
else
  echo "Backend already running (pid $(cat "$BACKEND_PID_FILE"))"
fi

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
      nohup env \
        VITE_API_ORIGIN="$BACKEND_URL" \
        VITE_API_BASE_PATH="" \
        npm run dev -- --host localhost --port "$FRONTEND_PORT" --strictPort \
        >"$LOG_DIR/frontend.log" 2>&1 &
      echo "$!" >"$FRONTEND_PID_FILE"
    )
  fi
else
  echo "Frontend already running (pid $(cat "$FRONTEND_PID_FILE"))"
fi

wait_for_url "$BACKEND_URL/" "Backend"
wait_for_url "$FRONTEND_URL" "Frontend"

cat >"$STATE_FILE" <<EOF
BACKEND_PORT=${BACKEND_PORT}
FRONTEND_PORT=${FRONTEND_PORT}
BACKEND_URL=${BACKEND_URL}
FRONTEND_URL=${FRONTEND_URL}
EOF

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
