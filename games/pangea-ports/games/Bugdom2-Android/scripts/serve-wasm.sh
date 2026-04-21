#!/bin/bash
# serve-wasm.sh - Serve the WebAssembly build locally for testing
# Usage: ./scripts/serve-wasm.sh [build-directory]
#
# Requirements:
#   - Emscripten build must be completed first:
#     source ~/emsdk/emsdk_env.sh
#     python3 build.py --emscripten --dependencies --configure --build
#
# Then run this script to serve the build:
#   ./scripts/serve-wasm.sh build-wasm
#
# Open http://localhost:8080/Bugdom2.html in your browser.
# For level editor mode: http://localhost:8080/Bugdom2.html?level=3

BUILD_DIR=${1:-build-wasm}

if [ ! -f "${BUILD_DIR}/Bugdom2.html" ]; then
    echo "Error: ${BUILD_DIR}/Bugdom2.html not found."
    echo "Build the WASM version first:"
    echo "  source ~/emsdk/emsdk_env.sh"
    echo "  python3 build.py --emscripten --dependencies --configure --build"
    exit 1
fi

cd "${BUILD_DIR}"
echo "Serving WebAssembly build at http://localhost:8080/Bugdom2.html"
echo "Level editor mode: http://localhost:8080/Bugdom2.html?level=0"
echo "Press Ctrl+C to stop."
python3 -m http.server 8080
