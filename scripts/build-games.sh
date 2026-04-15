#!/usr/bin/env bash
# build-games.sh — Compile WASM game ports and stage them into frontend/public/wasm/
#
# Prerequisites:
#   • Emscripten (emcc) installed and activated, OR this script will bootstrap the
#     emsdk automatically inside the pangea-ports submodule directory.
#   • Python 3 and cmake on $PATH.
#   • The pangea-ports git submodule must be initialised:
#       git submodule update --init --recursive
#
# Usage:
#   scripts/build-games.sh                  # build all games
#   scripts/build-games.sh --game ottomatic # build one game (short name or full port name)
#
# After a successful run, each game's .js / .wasm / .data files will be staged to
#   frontend/public/wasm/<game>/
# so that the dev/production server can serve them without any external CDN.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PANGEA_PORTS="$REPO_ROOT/frontend/public/games/pangea-ports"
WASM_OUT="$REPO_ROOT/frontend/public/wasm"

# ── argument parsing ──────────────────────────────────────────────────────────
GAME_FILTER=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --game)
      GAME_FILTER="$2"
      shift 2
      ;;
    -h|--help)
      sed -n '2,14p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

# ── ensure submodule is present ───────────────────────────────────────────────
if [[ ! -f "$PANGEA_PORTS/scripts/ports.py" ]]; then
  echo "ERROR: pangea-ports submodule not found at $PANGEA_PORTS" >&2
  echo "Run:  git submodule update --init --recursive" >&2
  exit 1
fi

# ── mapping: port name → wasm output dir (matches gamePortConfig.ts wasmDir) ─
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

# ── discover games to build ───────────────────────────────────────────────────
ALL_GAMES=$(python3 -c "
import json, subprocess
out = subprocess.check_output(['python3', 'scripts/ports.py', 'matrix', 'wasm'],
                              cwd='$PANGEA_PORTS')
for item in json.loads(out)['include']:
    print(item['name'])
")

# ── bootstrap Emscripten if not already on PATH ───────────────────────────────
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

# ── build and stage each game ─────────────────────────────────────────────────
for PORT_NAME in $ALL_GAMES; do
  # Apply --game filter (accept both the short wasmDir name and the full port name)
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

  # Stage to a temp dir via ports.py, then copy to our wasm output dir
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
  mkdir -p "$DEST"

  # ports.py stages files relative to stage_subdir; copy only .js/.wasm/.data
  echo "Copying built assets to $DEST …"
  find "$STAGE_TMP" -type f \( -name "*.js" -o -name "*.wasm" -o -name "*.data" \) | while read -r f; do
    cp -v "$f" "$DEST/"
  done

  rm -rf "$STAGE_TMP"
  echo "Done: $PORT_NAME → $DEST"
done

echo ""
echo "All requested games built and staged to $WASM_OUT/"
echo "Start the dev server with:  cd frontend && npm run dev"
