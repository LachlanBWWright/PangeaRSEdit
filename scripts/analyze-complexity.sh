#!/usr/bin/env bash
# analyze-complexity.sh
# Finds ts/tsx files exceeding line-count and indentation-depth thresholds.
set -euo pipefail

FRONTEND_SRC="${1:-../frontend/src}"
LEGACY_EXEMPT_REGEX_FILE="${LEGACY_EXEMPT_REGEX_FILE:-./complexity-legacy-exemptions.regex}"
LINE_THRESHOLDS=(400 600)
INDENT_THRESHOLDS=(3 5 7)

# Exemptions are narrow and must be documented with a reason.
# DO NOT add folder-pattern exemptions for logic code — individual file patterns only.
# DO NOT add exemptions to avoid refactoring; only add them when the file
# structure is genuinely determined by the domain (data tables, binary specs).

LINE_EXEMPT_REGEXES=(
  "/data/items/.*ItemType\.ts$"
  "/data/items/ottoItemModelMapping\.ts$"
  "/data/items/mightyMikeItemSpriteMap\.ts$"
  "/data/items/standardParamTypes\.ts$"
  "/data/items/liquidPatchItems\.ts$"
  "/data/items/itemCategories\.ts$"
  "/data/items/mappers/croMagItemMapper\.ts$"
  "/data/items/mappers/billyFrontierItemMapper\.ts$"
  "/data/items/mappers/nanosaur2ItemMapper\.ts$"
)
LINE_EXEMPT_REASONS=(
  "Data table: item type registries"
  "Data table: Otto Matic model mapping"
  "Data table: Mighty Mike sprite index map"
  "Data table: parameter type schema"
  "Data table: liquid patch items"
  "Data list: item categories"
  "Data table: Cro-Mag item model mapper"
  "Data table: Billy Frontier item model mapper"
  "Data table: Nanosaur 2 item model mapper"
)

INDENT_EXEMPT_REGEXES=(
  "/data/items/.*ItemType\.ts$"
  "/data/items/ottoItemModelMapping\.ts$"
  "/data/items/mightyMikeItemSpriteMap\.ts$"
  "/data/items/standardParamTypes\.ts$"
  "/data/items/liquidPatchItems\.ts$"
  "/data/items/itemCategories\.ts$"
  "/data/items/mappers/croMagItemMapper\.ts$"
  "/data/items/mappers/billyFrontierItemMapper\.ts$"
  "/data/items/mappers/nanosaur2ItemMapper\.ts$"
)
INDENT_EXEMPT_REASONS=(
  "Structural nesting: object hierarchy"
  "Structural nesting: model hierarchy"
  "Structural nesting: lookup map"
  "Structural nesting: schema"
  "Structural nesting: data literals"
  "Structural nesting: list"
  "Structural nesting: static mapper"
  "Structural nesting: static mapper"
  "Structural nesting: static mapper"
)

indent_threshold_for_file() {
  local file="$1"
  if [[ "$file" == *.tsx ]]; then
    echo 5
    return
  fi
  echo 3
}

find_exemption_reason() {
  local file="$1"
  local -n regexes_ref="$2"
  local -n reasons_ref="$3"

  if [[ -f "$LEGACY_EXEMPT_REGEX_FILE" ]] && grep -Fxq "$file" "$LEGACY_EXEMPT_REGEX_FILE"; then
    echo "Legacy backlog"
    return 0
  fi

  local idx
  for idx in "${!regexes_ref[@]}"; do
    if [[ "$file" =~ ${regexes_ref[$idx]} ]]; then
      echo "${reasons_ref[$idx]}"
      return 0
    fi
  done

  return 1
}

find_typescript_files() {
  find "$FRONTEND_SRC" -type f \( -name "*.ts" -o -name "*.tsx" \)
}

declare -A reported_files

echo "=== Line Count Analysis ==="
for threshold in "${LINE_THRESHOLDS[@]}"; do
  echo ""
  echo "Files exceeding $threshold lines:"
  find_typescript_files | sort | while read -r file; do
    if reason=$(find_exemption_reason "$file" LINE_EXEMPT_REGEXES LINE_EXEMPT_REASONS); then
      continue
    fi

    lines=$(wc -l < "$file")
    if [ "$lines" -gt "$threshold" ]; then
      # Strip ../frontend/src/ prefix for readability
      display_path="${file#../frontend/src/}"
      echo "  $lines  $display_path"
    fi
  done
done

echo ""
echo "=== Indentation Depth Analysis ==="
for depth in "${INDENT_THRESHOLDS[@]}"; do
  echo ""
  indent_str=$(printf '  %.0s' $(seq 1 $depth))  # 2-space per level
  echo "Files with depth > $depth (>${#indent_str} spaces):"
  find_typescript_files | sort | while read -r file; do
    if reason=$(find_exemption_reason "$file" INDENT_EXEMPT_REGEXES INDENT_EXEMPT_REASONS); then
      continue
    fi

    file_depth_threshold=$(indent_threshold_for_file "$file")
    if [ "$depth" -ne "$file_depth_threshold" ]; then
      continue
    fi

    spaces=$(( depth * 2 ))

    if grep -qP "^ {$spaces} " "$file" 2>/dev/null; then
      display_path="${file#../frontend/src/}"
      echo "  $display_path"
    fi
  done
done
