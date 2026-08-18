#!/usr/bin/env bash
set -euo pipefail

frontend_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Checking frontend test discovery..."
pnpm --dir "$frontend_root" run test:discovery

echo "Running unit and Storybook interaction tests with combined coverage..."
bash "$frontend_root/scripts/run-combined-coverage.sh"

echo "Running Storybook accessibility, overflow, and browser interaction tests..."
pnpm --dir "$frontend_root" exec playwright test \
  --config="$frontend_root/playwright.storybook.config.ts"

echo "All frontend test suites passed."
