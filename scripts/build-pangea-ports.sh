#!/usr/bin/env bash
# build-pangea-ports.sh — Compile Pangea Ports WASM builds and stage them into
# frontend/public/generated/pangea-ports/wasm/
#
# Prerequisites:
#   • Emscripten (emcc) installed and activated, OR this script will bootstrap
#     the emsdk automatically inside the pangea-ports submodule directory.
#   • Python 3 and cmake on $PATH.
#   • The pangea-ports git submodule must be initialised:
#       git submodule update --init --recursive
#
# Usage:
#   scripts/build-pangea-ports.sh                  # build all games
#   scripts/build-pangea-ports.sh --game ottomatic  # build one game
#
# Output is staged under:
#   frontend/public/generated/pangea-ports/wasm/<game>/
# so the frontend can serve the binaries while keeping them out of git.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_ROOT="$REPO_ROOT/frontend"
PANGEA_PORTS="$REPO_ROOT/games/pangea-ports"
WASM_OUT="$FRONTEND_ROOT/public/generated/pangea-ports/wasm"

GAME_FILTER=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --game)
      GAME_FILTER="$2"
      shift 2
      ;;
    -h|--help)
      sed -n '2,20p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [[ ! -f "$PANGEA_PORTS/scripts/ports.py" ]]; then
  echo "ERROR: pangea-ports submodule not found at $PANGEA_PORTS" >&2
  echo "Run:  git submodule update --init --recursive" >&2
  exit 1
fi

declare -A WASM_DIR_MAP=(
  [OttoMatic-Android]="ottomatic"
  [Nanosaur-android]="nanosaur"
  [Bugdom-android]="bugdom"
  [Bugdom2-Android]="bugdom2"
  [CroMagRally-Android]="cromagrally"
  [BillyFrontier-Android]="billyfrontier"
  [MightyMike-Android]="mightymike"
  [Nanosaur2-Android]="nanosaur2"
)

ALL_GAMES=$(cd "$PANGEA_PORTS" && python3 - <<'PY'
import json
import subprocess
out = subprocess.check_output(["python3", "scripts/ports.py", "matrix", "wasm"])
for item in json.loads(out)["include"]:
    print(item["name"])
PY
)

if ! command -v emcc &>/dev/null; then
  echo "emcc not found — bootstrapping Emscripten SDK inside $PANGEA_PORTS/.emsdk"
  EMSDK="$PANGEA_PORTS/.emsdk"
  if [[ ! -d "$EMSDK" ]]; then
    git clone --depth=1 https://github.com/emscripten-core/emsdk.git "$EMSDK"
  fi
  cd "$EMSDK"
  ./emsdk install latest
  ./emsdk activate latest
  # shellcheck disable=SC1091
  source ./emsdk_env.sh
  cd "$REPO_ROOT"
fi

for PORT_NAME in $ALL_GAMES; do
  if [[ -n "$GAME_FILTER" ]]; then
    SHORT_NAME="${WASM_DIR_MAP[$PORT_NAME]:-}"
    if [[ "$GAME_FILTER" != "$PORT_NAME" && "$GAME_FILTER" != "$SHORT_NAME" ]]; then
      echo "Skipping $PORT_NAME"
      continue
    fi
  fi

  echo "========================================"
  echo " Building $PORT_NAME …"
  echo "========================================"
  (
    cd "$PANGEA_PORTS"
    python3 scripts/ports.py run --game "$PORT_NAME" --task wasm-build
  )

  STAGE_TMP="$(mktemp -d)"
  (
    cd "$PANGEA_PORTS"
    python3 scripts/ports.py run --game "$PORT_NAME" --task stage-wasm --dest "$STAGE_TMP"
  )

  TARGET_DIR="${WASM_DIR_MAP[$PORT_NAME]:-}"
  if [[ -z "$TARGET_DIR" ]]; then
    echo "WARNING: no wasmDir mapping for $PORT_NAME — skipping copy" >&2
    rm -rf "$STAGE_TMP"
    continue
  fi

  DEST="$WASM_OUT/$TARGET_DIR"
  rm -rf "$DEST"
  mkdir -p "$DEST"

  echo "Copying built assets to $DEST …"
  find "$STAGE_TMP" -type f \( -name "*.js" -o -name "*.wasm" -o -name "*.data" \) | while read -r file; do
    cp -v "$file" "$DEST/"
  done

  rm -rf "$STAGE_TMP"
  echo "Done: $PORT_NAME → $DEST"
done

echo ""
echo "All requested games built and staged to $WASM_OUT/"
