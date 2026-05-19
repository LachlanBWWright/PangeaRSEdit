#!/usr/bin/env bash
# Builds every Pangea Ports game and copies the generated WASM assets into:
#   frontend/public/generated/pangea-ports/wasm/<game>/
#
# This is the friendly entrypoint used by frontend/package.json's
# `npm run build:games`; build-pangea-ports.sh contains the implementation.
exec "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/build-pangea-ports.sh" "$@"
