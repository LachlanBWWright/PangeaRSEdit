#!/usr/bin/env bash
# analyze-complexity.sh
# Finds ts/tsx files exceeding line-count and indentation-depth thresholds.
set -euo pipefail

FRONTEND_SRC="${1:-../frontend/src}"
LINE_THRESHOLDS=(300 600)
INDENT_THRESHOLDS=(3 5 7)

find_typescript_files() {
  find "$FRONTEND_SRC" -type f \( -name "*.ts" -o -name "*.tsx" \)
}

echo "=== Line count analysis ==="
for threshold in "${LINE_THRESHOLDS[@]}"; do
  echo ""
  echo "--- Files with more than $threshold lines ---"
  find_typescript_files | while read -r file; do
    lines=$(wc -l < "$file")
    if [ "$lines" -gt "$threshold" ]; then
      echo "  $lines  $file"
    fi
  done | sort -rn
done

echo ""
echo "=== Indentation depth analysis ==="
for depth in "${INDENT_THRESHOLDS[@]}"; do
  indent_str=$(printf '  %.0s' $(seq 1 $depth))  # 2-space per level
  echo ""
  echo "--- Files with indentation depth > $depth levels (${#indent_str} leading spaces) ---"
  find_typescript_files | while read -r file; do
    spaces=$(( depth * 2 ))
    pattern="^$(printf ' %.0s' $(seq 1 $spaces)) "
    if grep -qP "^ {$spaces} " "$file" 2>/dev/null; then
      echo "  $file"
    fi
  done | sort
done
