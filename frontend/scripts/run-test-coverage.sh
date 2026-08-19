#!/usr/bin/env bash
set -uo pipefail

frontend_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
coverage_dir="$frontend_root/coverage"

# A failed run must not leave an older report that CI could mistake for this run.
rm -rf -- "$coverage_dir"

set +e
npm run build:terrain-codec
build_status=$?
if [ "$build_status" -ne 0 ]; then
  rm -rf -- "$coverage_dir"
  echo "Coverage was not generated: the terrain codec build failed (exit $build_status)." >&2
  exit "$build_status"
fi

vitest run --coverage "$@"
test_status=$?
set -e

if [ "$test_status" -ne 0 ]; then
  rm -rf -- "$coverage_dir"
  echo "Coverage was not generated: the test suite failed (exit $test_status)." >&2
  exit "$test_status"
fi

if [ ! -s "$coverage_dir/coverage-summary.json" ] || [ ! -s "$coverage_dir/lcov.info" ]; then
  rm -rf -- "$coverage_dir"
  echo "Coverage was not generated: the test command succeeded but required report files are missing." >&2
  exit 1
fi

echo "Coverage generated in $coverage_dir."
