#!/usr/bin/env bash
# Brings game runtimes up to date, then starts the full development stack.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

exec "$SCRIPT_DIR/multiplayer.sh"
