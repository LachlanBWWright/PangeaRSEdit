#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 3 ]]; then
  echo "Usage: bash scripts/build-android-screenshot-apk.sh PORTS_ROOT GAME OUTPUT_APK" >&2
  exit 1
fi

script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
ports_root=$(cd -- "$1" && pwd)
game=$2
output=$3
controls_root=${PANGEA_TOUCH_CONTROLS_ROOT:-$script_dir/../games/pangea-ports/shared/android}
controls_root=$(cd -- "$controls_root" && pwd)
source "$script_dir/android-screenshot-games.sh"
android_screenshot_game "$game"

if [[ ! -f "$ports_root/shared/android/TouchControlsDraw.c" ]]; then
  echo "This ports revision has no shared Android touch controls. Use lua-cross-level-updates or a revision containing shared/android." >&2
  exit 1
fi

android_dir="$ports_root/games/$game/android"
gradle_bin=${GRADLE_BIN:-gradle}
"$gradle_bin" --project-dir "$android_dir" \
  --init-script "$script_dir/android-screenshot-harness/init.gradle" \
  --no-daemon --max-workers=4 \
  "-PpangeaScreenshotHarness=$script_dir/android-screenshot-harness" \
  "-PpangeaTouchControlsRoot=$controls_root" \
  -Pandroid.injected.build.abi=x86_64 assembleDebug

mkdir -p -- "$(dirname -- "$output")"
apk="$android_dir/app/build/outputs/apk/debug/app-debug.apk"
if [[ ! -f "$apk" ]]; then
  apk="$android_dir/app/build/intermediates/apk/debug/app-debug.apk"
fi
cp -- "$apk" "$output"
sha256sum "$controls_root"/* > "$output-controls.sha256"
