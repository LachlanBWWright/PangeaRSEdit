#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_DIR="$REPO_ROOT/.tmp/multiplayer-dev"
BACKEND_PID_FILE="$STATE_DIR/backend.pid"
FRONTEND_PID_FILE="$STATE_DIR/frontend.pid"
STATE_FILE="$STATE_DIR/state.env"

stop_pid_file() {
  local pid_file="$1"
  local label="$2"

  if [[ ! -f "$pid_file" ]]; then
    echo "$label not running"
    return
  fi

  local pid
  pid="$(cat "$pid_file")"
  rm -f "$pid_file"

  if [[ -z "$pid" ]]; then
    echo "$label pid file was empty"
    return
  fi

  if ! kill -0 "$pid" 2>/dev/null; then
    echo "$label process $pid already stopped"
    return
  fi

  echo "Stopping $label (pid $pid)"
  kill "$pid"
}

stop_pid_file "$FRONTEND_PID_FILE" "Frontend"
stop_pid_file "$BACKEND_PID_FILE" "Backend"
rm -f "$STATE_FILE"

echo "Multiplayer dev stack stopped."
