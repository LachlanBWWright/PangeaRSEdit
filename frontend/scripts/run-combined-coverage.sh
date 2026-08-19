#!/usr/bin/env bash
set -euo pipefail

frontend_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
combined_dir="$frontend_root/coverage-combined"

bash "$frontend_root/scripts/run-test-coverage.sh"
bash "$frontend_root/scripts/run-storybook-coverage.sh"
node "$frontend_root/scripts/merge-coverage.mjs"

if [ ! -s "$combined_dir/coverage-summary.json" ] || \
  [ ! -s "$combined_dir/lcov.info" ]; then
  rm -rf -- "$combined_dir"
  echo "Combined coverage was not generated: required report files are missing." >&2
  exit 1
fi

echo "Combined coverage generated in $combined_dir."
