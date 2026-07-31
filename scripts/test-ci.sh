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

echo "Running frontend tests..."
pnpm --dir "$REPO_ROOT/frontend" test -- --run

echo "Building the frontend..."
pnpm --dir "$REPO_ROOT/frontend" run build

echo "Building the backend..."
dotnet build "$SOLUTION" --configuration Release --no-restore

echo "Running backend tests..."
dotnet test "$SOLUTION" --configuration Release --no-build

echo "Local CI checks passed."
