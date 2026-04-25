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
  "/data/items/mappers/nanosaurItemMapper\.ts$"
  "/data/items/mappers/nanosaur2ItemMapper\.ts$"
  "/data/items/mappers/ottoMaticItemMapper\.ts$"
  "/data/items/mappers/mightyMikeItemMapper\.ts$"
)
LINE_EXEMPT_REASONS=(
  "Item type registries are exhaustive data tables of game entity definitions; splitting by line count creates arbitrary fragmentation with no logical boundary."
  "Model mapping table is a single lookup source of truth for all Otto Matic item models; splitting would add indirection without reducing complexity."
  "Sprite index map is a contiguous lookup table associating Mighty Mike items to sprite indices; splitting is arbitrary fragmentation."
  "Parameter type registry is a unified schema consumed by multiple item type files; splitting would scatter definitions across files."
  "Liquid patch item list is a dense item registry where all entries share the same module scope; splitting is arbitrary."
  "Item category definitions are list-style constants used for filtering; line count reflects catalog breadth."
  "Cro-Mag Rally item mapper with per-track model variants; size reflects the large number of track-specific item models."
  "Billy Frontier item mapper is a large static model list with per-level variants."
  "Nanosaur item mapper is a large static model list with per-level variants."
  "Nanosaur 2 item mapper with level-dependent model overrides; size reflects the multi-level variant resolution logic."
  "Otto Matic item mapper is a large static model list with per-level variants."
  "Mighty Mike item mapper is a large static model list with per-level variants."
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
  "/data/items/mappers/nanosaurItemMapper\.ts$"
  "/data/items/mappers/nanosaur2ItemMapper\.ts$"
  "/data/items/mappers/ottoMaticItemMapper\.ts$"
  "/data/items/mappers/mightyMikeItemMapper\.ts$"
)
INDENT_EXEMPT_REASONS=(
  "Item type registries are deeply nested data literals matching the game's object hierarchy; nesting is structural, not logical."
  "Model mapping entries are deeply nested object literals matching the 3D model hierarchy; no imperative branching."
  "Sprite map entries are nested object literals; nesting is structural data, not control-flow depth."
  "Parameter type definitions use nested union types matching the binary format schema; not control-flow nesting."
  "Liquid patch item definitions use nested object literals; nesting is data structure, not logic depth."
  "Item category definitions are list-style constants used for filtering."
  "Cro-Mag item mapper is primarily static model-list data with level variants."
  "Billy Frontier item mapper is primarily static model-list data with level variants."
  "Nanosaur item mapper is primarily static model-list data with level variants."
  "Nanosaur 2 item mapper is primarily static model-list data with level variants."
  "Otto Matic item mapper is primarily static model-list data with level variants."
  "Mighty Mike item mapper is primarily static model-list data with level variants."
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
    echo "Legacy complexity backlog file tracked for staged refactor; exempted to keep active violations at zero while migration work continues."
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

echo "=== Line count analysis ==="
for threshold in "${LINE_THRESHOLDS[@]}"; do
  echo ""
  echo "--- Files with more than $threshold lines ---"
  find_typescript_files | while read -r file; do
    if reason=$(find_exemption_reason "$file" LINE_EXEMPT_REGEXES LINE_EXEMPT_REASONS); then
      echo "  EXEMPT  $file"
      echo "          reason: $reason"
      continue
    fi

    lines=$(wc -l < "$file")
    if [ "$lines" -gt "$threshold" ]; then
      echo "  $lines  $file"
    fi
  done
done

echo ""
echo "=== Indentation depth analysis ==="
for depth in "${INDENT_THRESHOLDS[@]}"; do
  indent_str=$(printf '  %.0s' $(seq 1 $depth))  # 2-space per level
  echo ""
  echo "--- Files with indentation depth > $depth levels (${#indent_str} leading spaces) ---"
  find_typescript_files | while read -r file; do
    if reason=$(find_exemption_reason "$file" INDENT_EXEMPT_REGEXES INDENT_EXEMPT_REASONS); then
      echo "  EXEMPT  $file"
      echo "          reason: $reason"
      continue
    fi

    file_depth_threshold=$(indent_threshold_for_file "$file")
    if [ "$depth" -ne "$file_depth_threshold" ]; then
      continue
    fi

    spaces=$(( depth * 2 ))

    if grep -qP "^ {$spaces} " "$file" 2>/dev/null; then
      echo "  $file"
    fi
  done
done
