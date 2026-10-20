#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 4 ]]; then
  echo "Usage: bash scripts/capture-android-screenshot-set.sh GAME APK OUTPUT_DIR PORTS_ROOT" >&2
  exit 1
fi

script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
gameplay_status=0
bash "$script_dir/capture-android-buttons.sh" "$1" "$2" "$3/gameplay" || gameplay_status=$?
controls_status=0
bash "$script_dir/capture-android-buttons.sh" "$1" "$2" "$3/controls" 3 "$4" || controls_status=$?
printf 'gameplay_exit=%s\ncontrols_exit=%s\n' "$gameplay_status" "$controls_status" > "$3/$1-status.txt"
if [[ $gameplay_status -ne 0 || $controls_status -ne 0 ]]; then exit 1; fi
