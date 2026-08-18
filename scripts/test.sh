#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Running frontend unit and integration tests with coverage..."
pnpm --dir "$REPO_ROOT/frontend" run test:discovery
pnpm --dir "$REPO_ROOT/frontend" run test:coverage -- --run

echo "Running backend tests with coverage..."
dotnet test "$REPO_ROOT/backend/PangeaRSEdit.sln" \
  --configuration Release \
  --collect:"XPlat Code Coverage" \
  --settings "$REPO_ROOT/backend/PangeaRSEdit.Tests/coverlet.runsettings"
