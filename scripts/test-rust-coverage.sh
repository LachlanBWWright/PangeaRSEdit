#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUST_ROOT="$REPO_ROOT/terrain-codec-rust"
COVERAGE_DIR="$RUST_ROOT/coverage"

if ! cargo llvm-cov --version >/dev/null 2>&1; then
  echo "Installing cargo-llvm-cov..."
  cargo install cargo-llvm-cov --locked
fi

mkdir -p "$COVERAGE_DIR"
cd "$RUST_ROOT"
cargo llvm-cov --workspace --lcov --output-path "$COVERAGE_DIR/lcov.info"
