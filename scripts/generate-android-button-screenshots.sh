#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 || $# -gt 3 ]]; then
  echo "Usage: bash scripts/generate-android-button-screenshots.sh PORTS_ROOT OUTPUT_DIR [GAME]" >&2
  exit 1
fi

script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
ports_root=$(cd -- "$1" && pwd -P)
output_dir=$2
if [[ -z ${ANDROID_SERIAL:-} ]]; then
  echo "Set ANDROID_SERIAL to the emulator or test device from adb devices." >&2
  exit 1
fi

for tool in "${GRADLE_BIN:-gradle}" "${ADB_BIN:-adb}" python3; do
  if ! command -v "$tool" >/dev/null; then
    echo "Missing screenshot dependency: $tool" >&2
    exit 1
  fi
done
python3 -c 'from PIL import Image'
checkout_root=$(git -C "$ports_root" rev-parse --show-toplevel)
if [[ "$checkout_root" != "$ports_root" ]]; then
  echo "PORTS_ROOT must be the root of its own Git checkout." >&2
  exit 1
fi
mkdir -p -- "$output_dir/apks" "$output_dir/build-logs"
git -C "$ports_root" rev-parse HEAD > "$output_dir/ports-revision.txt"

if [[ $# -eq 3 ]]; then
  games=("$3")
else
  matrix=$(python3 "$ports_root/scripts/ports.py" list)
  mapfile -t games < <(printf '%s\n' "$matrix" | cut -f1)
  if [[ ${#games[@]} -ne 8 ]]; then
    echo "Expected exactly eight games." >&2
    exit 1
  fi
fi

failed=0
for game in "${games[@]}"; do
  echo "Building and capturing $game"
  apk="$output_dir/apks/$game.apk"
  if ! bash "$script_dir/build-android-screenshot-apk.sh" "$ports_root" "$game" "$apk" \
      > "$output_dir/build-logs/$game.log" 2>&1; then
    echo "Build failed; see $output_dir/build-logs/$game.log" >&2
    failed=1
    continue
  fi
  if ! bash "$script_dir/capture-android-screenshot-set.sh" "$game" "$apk" "$output_dir" "$ports_root"; then
    failed=1
  fi
done
exit "$failed"
