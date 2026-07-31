#!/usr/bin/env bash
# Rebuilds every game runtime, then starts the full multiplayer development stack.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Building WASM runtimes for every game..."
"$SCRIPT_DIR/build-games.sh"

echo "Starting the multiplayer frontend and backend..."
exec "$SCRIPT_DIR/multiplayer.sh"
