#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

exec pnpm --dir "$REPO_ROOT/frontend" run dev -- "$@"
