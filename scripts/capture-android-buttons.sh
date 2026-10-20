#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 3 || $# -gt 5 ]]; then
  echo "Usage: bash scripts/capture-android-buttons.sh GAME APK OUTPUT_DIR [SETTLE_SECONDS] [PORTS_ROOT_FOR_CONTROLS_PREVIEW]" >&2
  exit 1
fi

script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
source "$script_dir/android-screenshot-games.sh"
android_screenshot_game "$1"
game=$1
apk=$2
output_dir=$3
settle=${4:-20}
mode=gameplay
launch_extras=()
if [[ $# -eq 5 ]]; then
  game_arguments=$(python3 "$script_dir/android_screenshot_profile.py" "$5" "$game")
  mode=controls-preview
  launch_extras=(--ez pangeaControlsOnly true)
fi
adb_bin=${ADB_BIN:-adb}
mkdir -p -- "$output_dir"

if [[ -z ${ANDROID_SERIAL:-} ]]; then
  echo "Set ANDROID_SERIAL to the emulator or test device from adb devices." >&2
  exit 1
fi
if [[ ! $settle =~ ^[0-9]+$ || $settle -gt 120 ]]; then
  echo "SETTLE_SECONDS must be an integer from 0 to 120." >&2
  exit 1
fi

if [[ ! -s "$apk" ]]; then
  echo "APK missing or empty: $apk" >&2
  exit 1
fi

original_immersive=
restore_setting() {
  if [[ -z "$3" ]]; then return; fi
  if [[ "$3" == null ]]; then
    "$adb_bin" shell settings delete "$1" "$2" >/dev/null 2>&1 || true
  else
    "$adb_bin" shell settings put "$1" "$2" "$3" >/dev/null 2>&1 || true
  fi
}
save_diagnostics() {
  "$adb_bin" logcat -d > "$output_dir/$game-logcat.txt" 2>&1 || true
  "$adb_bin" shell dumpsys activity activities > "$output_dir/$game-activity.txt" 2>&1 || true
  "$adb_bin" shell am force-stop "$game_package" >/dev/null 2>&1 || true
  restore_setting secure immersive_mode_confirmations "$original_immersive"
}
trap save_diagnostics EXIT

rm -f -- "$output_dir/$game.png" "$output_dir/$game-buttons.png" "$output_dir/$game-actions.png" \
  "$output_dir/$game-utility.png" "$output_dir/$game-failure.png"
timeout 120 "$adb_bin" wait-for-device
original_immersive=$("$adb_bin" shell settings get secure immersive_mode_confirmations | tr -d '\r')
"$adb_bin" shell settings put secure immersive_mode_confirmations confirmed
"$adb_bin" shell input keyevent KEYCODE_WAKEUP
"$adb_bin" shell wm dismiss-keyguard
"$adb_bin" install -r -t "$apk"
"$adb_bin" shell am force-stop "$game_package"
"$adb_bin" logcat -c
"$adb_bin" shell am start -W \
  -n "$game_package/io.pangea.screenshots.ScreenshotActivity" \
  --es pangeaLibrary "$game_library" --esa pangeaArguments "'$game_arguments'" "${launch_extras[@]}"

sleep "$settle"
if ! "$adb_bin" shell pidof "$game_package" >/dev/null; then
  echo "Game exited before capture: $game" >&2
  exit 1
fi
game_log=$("$adb_bin" logcat -d -s SDL/APP:V)
if [[ "$game_log" == *"Game Alert:"* || "${game_log,,}" == *"fatal alert"* ]]; then
  "$adb_bin" exec-out screencap -p > "$output_dir/$game-failure.png"
  echo "Game reported a startup alert; see $output_dir/$game-logcat.txt" >&2
  exit 1
fi
if [[ "$mode" == controls-preview && "$game_log" != *"production controls renderer ready"* ]]; then
  echo "Production controls renderer did not become ready: $game" >&2
  exit 1
fi
activity=$("$adb_bin" shell dumpsys activity activities)
resumed=$(printf '%s\n' "$activity" | sed -n '/topResumedActivity\|mResumedActivity/p')
if ! [[ "$resumed" == *"$game_package/io.pangea.screenshots.ScreenshotActivity"* ]]; then
  echo "Screenshot activity is missing: $game" >&2
  exit 1
fi

"$adb_bin" exec-out screencap -p > "$output_dir/$game.png"
python3 "$script_dir/android_button_images.py" "$output_dir/$game.png"
sha256sum "$apk" > "$output_dir/$game-apk.sha256"
if [[ -f "$apk-controls.sha256" ]]; then
  cp -- "$apk-controls.sha256" "$output_dir/$game-controls.sha256"
fi
printf '%s\n' "game=$game" "package=$game_package" "arguments=$game_arguments" \
  "device=$ANDROID_SERIAL" "settle_seconds=$settle" "mode=$mode" > "$output_dir/$game-capture.txt"
echo "Captured $game in $output_dir"
