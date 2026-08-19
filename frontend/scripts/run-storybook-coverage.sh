#!/usr/bin/env bash
set -uo pipefail

frontend_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
storybook_coverage_dir="$frontend_root/coverage-storybook"

rm -rf -- "$storybook_coverage_dir"

set +e
vitest run --config "$frontend_root/vitest.storybook.config.ts" --coverage "$@"
test_status=$?
set -e

if [ "$test_status" -ne 0 ]; then
  rm -rf -- "$storybook_coverage_dir"
  echo "Storybook coverage was not generated: the story tests failed (exit $test_status)." >&2
  exit "$test_status"
fi

if [ ! -s "$storybook_coverage_dir/coverage-final.json" ] || \
  [ ! -s "$storybook_coverage_dir/coverage-summary.json" ] || \
  [ ! -s "$storybook_coverage_dir/lcov.info" ]; then
  rm -rf -- "$storybook_coverage_dir"
  echo "Storybook coverage was not generated: required report files are missing." >&2
  exit 1
fi

echo "Storybook coverage generated in $storybook_coverage_dir."
