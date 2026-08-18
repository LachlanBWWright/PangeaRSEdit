#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOLUTION="$REPO_ROOT/backend/PangeaRSEdit.sln"

echo "Installing locked JavaScript dependencies..."
pnpm --dir "$REPO_ROOT" install --frozen-lockfile

echo "Restoring backend dependencies..."
dotnet restore "$SOLUTION"

echo "Checking backend formatting..."
dotnet format "$SOLUTION" --verify-no-changes --verbosity minimal

echo "Running frontend test discovery..."
pnpm --dir "$REPO_ROOT/frontend" run test:discovery

echo "Running frontend tests with coverage..."
pnpm --dir "$REPO_ROOT/frontend" run test:coverage -- --run

echo "Building the frontend..."
pnpm --dir "$REPO_ROOT/frontend" run build

echo "Building the backend..."
dotnet build "$SOLUTION" --configuration Release --no-restore

echo "Running backend tests with coverage..."
dotnet test "$SOLUTION" \
  --configuration Release \
  --no-build \
  --collect:"XPlat Code Coverage" \
  --settings "$REPO_ROOT/backend/PangeaRSEdit.Tests/coverlet.runsettings"

echo "Local CI checks passed."
