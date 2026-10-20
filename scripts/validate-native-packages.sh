#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 || $# -gt 2 ]]; then
  echo "Usage: bash scripts/validate-native-packages.sh PACKAGES_DIR [DOWNLOADS_DIR]" >&2
  exit 1
fi

script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
packages_dir=$1
ports=$(python3 "$script_dir/../games/pangea-ports/scripts/ports.py" list)
mapfile -t games <<< "$ports"
suffixes=(linux.AppImage mac.dmg windows.zip android.apk)

if [[ ${#games[@]} -ne 8 ]]; then
  echo "Expected exactly 8 games in the ports manifest." >&2
  exit 1
fi

missing=false
for game in "${games[@]}"; do
  name=${game%%$'\t'*}
  for suffix in "${suffixes[@]}"; do
    package="$packages_dir/$name-$suffix"
    if [[ ! -f "$package" || ! -s "$package" ]]; then
      echo "Missing or empty native package: $package" >&2
      missing=true
    fi
  done
done
if [[ $missing == true ]]; then
  exit 1
fi

shopt -s nullglob dotglob
files=("$packages_dir"/*)
if [[ ${#files[@]} -ne 32 ]]; then
  echo "Expected exactly 32 native packages; found ${#files[@]} entries." >&2
  exit 1
fi

echo "Verified all 8 games on Linux, macOS, Windows, and Android (32 packages)."
if [[ $# -eq 1 ]]; then
  exit 0
fi

for game in "${games[@]}"; do
  name=${game%%$'\t'*}
  mkdir -p "$2/$name"
  for suffix in "${suffixes[@]}"; do
    cp -- "$packages_dir/$name-$suffix" "$2/$name/"
  done
done
