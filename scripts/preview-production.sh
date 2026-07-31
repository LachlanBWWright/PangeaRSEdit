#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ ! -f "$REPO_ROOT/frontend/dist/index.html" ]]; then
  "$REPO_ROOT/scripts/build-production.sh"
fi

exec pnpm --dir "$REPO_ROOT/frontend" run preview -- "$@"
