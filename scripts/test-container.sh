#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE_NAME="${PANGEA_BACKEND_IMAGE:-pangearsedit-api:local}"

docker build \
  --file "$REPO_ROOT/backend/Dockerfile" \
  --tag "$IMAGE_NAME" \
  "$REPO_ROOT/backend"

echo "Built backend container image: $IMAGE_NAME"
