#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PUBLISH_DIR="$REPO_ROOT/.tmp/production/backend"

echo "Building the frontend production bundle..."
pnpm --dir "$REPO_ROOT/frontend" run build

echo "Publishing the backend production bundle..."
dotnet publish "$REPO_ROOT/backend/PangeaRSEdit.Api/PangeaRSEdit.Api.csproj" \
  --configuration Release \
  --output "$PUBLISH_DIR"

echo "Frontend output: $REPO_ROOT/frontend/dist"
echo "Backend output:  $PUBLISH_DIR"
