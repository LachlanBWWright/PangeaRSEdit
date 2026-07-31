#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Running frontend unit and integration tests..."
pnpm --dir "$REPO_ROOT/frontend" test -- --run

echo "Running backend tests..."
dotnet test "$REPO_ROOT/backend/PangeaRSEdit.sln" --configuration Release
