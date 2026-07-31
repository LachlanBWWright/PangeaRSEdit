#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Checking frontend lint rules..."
pnpm --dir "$REPO_ROOT/frontend" run lint

echo "Checking backend formatting..."
dotnet format "$REPO_ROOT/backend/PangeaRSEdit.sln" \
  --verify-no-changes \
  --verbosity minimal
