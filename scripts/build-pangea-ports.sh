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
#   scripts/build-pangea-ports.sh --list
#   scripts/build-pangea-ports.sh --target wasm
#   scripts/build-pangea-ports.sh --target wasm --game ottomatic
#   scripts/build-pangea-ports.sh --target native --game OttoMatic-Android
#   scripts/build-pangea-ports.sh --target android --dry-run
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
TARGET="wasm"
DRY_RUN=0
VERBOSE=0
LIST_ONLY=0
CHECK_ONLY=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --game)
      GAME_FILTER="$2"
      shift 2
      ;;
    --target)
      TARGET="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --verbose)
      VERBOSE=1
      shift
      ;;
    --list)
      LIST_ONLY=1
      shift
      ;;
    --check-env)
      CHECK_ONLY=1
      shift
      ;;
    -h|--help)
      sed -n '2,30p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

case "$TARGET" in
  wasm|android|native|desktop) ;;
  *)
    echo "Unknown target: $TARGET (expected wasm, android, native, or desktop)" >&2
    exit 1
    ;;
esac

if [[ "$VERBOSE" -eq 1 ]]; then
  set -x
fi

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

print_games() {
  cd "$PANGEA_PORTS"
  python3 scripts/ports.py list
}

require_tool() {
  local tool="$1"
  local hint="$2"
  if ! command -v "$tool" &>/dev/null; then
    echo "ERROR: $tool not found. $hint" >&2
    return 1
  fi
}

check_common_env() {
  require_tool python3 "Install Python 3." || return 1
  require_tool cmake "Install CMake." || return 1
}

check_wasm_env() {
  check_common_env || return 1
  require_tool emcc "Install/activate Emscripten or run without --check-env to allow auto-bootstrap." || return 1
  require_tool emcmake "Activate the Emscripten SDK so emcmake is on PATH." || return 1
  if ! command -v node &>/dev/null; then
    echo "WARNING: node not found; browser smoke/profiling harnesses will be unavailable." >&2
  fi
  if ! command -v npx &>/dev/null; then
    echo "WARNING: npx not found; Playwright-based smoke/profiling harnesses will be unavailable." >&2
  fi
}

check_android_env() {
  check_common_env || return 1
  require_tool java "Install a JDK for Gradle/Android builds." || return 1
  if [[ -z "${ANDROID_HOME:-}" && -z "${ANDROID_SDK_ROOT:-}" ]]; then
    echo "ERROR: ANDROID_HOME or ANDROID_SDK_ROOT must point at the Android SDK." >&2
    return 1
  fi
  if [[ -z "${ANDROID_NDK_HOME:-}" && -z "${ANDROID_NDK_ROOT:-}" ]]; then
    echo "WARNING: ANDROID_NDK_HOME/ANDROID_NDK_ROOT is not set; Gradle may still find an installed NDK." >&2
  fi
}

if [[ "$LIST_ONLY" -eq 1 ]]; then
  print_games
  exit 0
fi

case "$TARGET" in
  wasm)
    if [[ "$CHECK_ONLY" -eq 1 ]]; then
      check_wasm_env
      exit $?
    fi
    ;;
  android)
    if [[ "$CHECK_ONLY" -eq 1 ]]; then
      check_android_env
      exit $?
    fi
    ;;
  native|desktop)
    if [[ "$CHECK_ONLY" -eq 1 ]]; then
      check_common_env
      exit $?
    fi
    ;;
esac

if [[ "$TARGET" == "wasm" && "$DRY_RUN" -eq 0 ]] && ! command -v emcc &>/dev/null; then
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

run_step() {
  echo "+ $*"
  if [[ "$DRY_RUN" -eq 0 ]]; then
    "$@"
  fi
}

for PORT_NAME in $ALL_GAMES; do
  if [[ -n "$GAME_FILTER" ]]; then
    SHORT_NAME="${WASM_DIR_MAP[$PORT_NAME]:-}"
    if [[ "$GAME_FILTER" != "$PORT_NAME" && "$GAME_FILTER" != "$SHORT_NAME" ]]; then
      echo "Skipping $PORT_NAME"
      continue
    fi
  fi

  echo "========================================"
  echo " Building $PORT_NAME ($TARGET) …"
  echo "========================================"

  case "$TARGET" in
    native|desktop)
      (cd "$PANGEA_PORTS" && run_step python3 scripts/ports.py run --game "$PORT_NAME" --task native-build)
      continue
      ;;
    android)
      GAME_DIR="$PANGEA_PORTS/games/$PORT_NAME"
      if [[ ! -d "$GAME_DIR/android" ]]; then
        echo "WARNING: $PORT_NAME has no android/ directory — skipping" >&2
        continue
      fi
      (cd "$GAME_DIR/android" && run_step ./gradlew assembleDebug)
      echo "Done: $PORT_NAME Android debug APK under $GAME_DIR/android/app/build/outputs/apk/"
      continue
      ;;
    wasm)
      (cd "$PANGEA_PORTS" && run_step python3 scripts/ports.py run --game "$PORT_NAME" --task wasm-build)
      ;;
  esac

  STAGE_TMP="$(mktemp -d)"
  (cd "$PANGEA_PORTS" && run_step python3 scripts/ports.py run --game "$PORT_NAME" --task stage-wasm --dest "$STAGE_TMP")

  TARGET_DIR="${WASM_DIR_MAP[$PORT_NAME]:-}"
  if [[ -z "$TARGET_DIR" ]]; then
    echo "WARNING: no wasmDir mapping for $PORT_NAME — skipping copy" >&2
    if [[ "$DRY_RUN" -eq 0 ]]; then
      rm -rf "$STAGE_TMP"
    fi
    continue
  fi

  DEST="$WASM_OUT/$TARGET_DIR"
  if [[ "$DRY_RUN" -eq 0 ]]; then
    rm -rf "$DEST"
    mkdir -p "$DEST"
  fi

  echo "Copying built assets to $DEST …"
  if [[ "$DRY_RUN" -eq 0 ]]; then
    find "$STAGE_TMP" -type f \( -name "*.js" -o -name "*.wasm" -o -name "*.data" -o -name "*.html" \) | while read -r file; do
      cp -v "$file" "$DEST/"
    done
  else
    echo "Would stage WASM assets from $STAGE_TMP to $DEST"
  fi

  if [[ "$DRY_RUN" -eq 0 ]]; then
    rm -rf "$STAGE_TMP"
  fi
  echo "Done: $PORT_NAME → $DEST"
done

echo ""
case "$TARGET" in
  wasm) echo "All requested games built and staged to $WASM_OUT/" ;;
  android) echo "All requested Android builds completed." ;;
  native|desktop) echo "All requested native builds completed." ;;
esac
