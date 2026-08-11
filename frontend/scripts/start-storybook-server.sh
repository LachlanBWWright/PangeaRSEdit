#!/usr/bin/env bash

set -euo pipefail

script_directory="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
frontend_directory="$(cd "${script_directory}/.." && pwd)"

cd "${frontend_directory}"
exec pnpm run storybook --ci --no-open
