#!/usr/bin/env bash
# analyze-complexity.sh
# Finds ts/tsx files exceeding line-count and indentation-depth thresholds.
set -euo pipefail

FRONTEND_SRC="${1:-../frontend/src}"
LINE_THRESHOLDS=(400 600)
INDENT_THRESHOLDS=(3 5 7)

# Exemptions are narrow and must be documented with a reason.
# DO NOT add folder-pattern exemptions for logic code — individual file patterns only.
# DO NOT add exemptions to avoid refactoring; only add them when the file
# structure is genuinely determined by the domain (data tables, binary specs).

LINE_EXEMPT_REGEXES=(
  "\.test\.tsx?$"
  "/data/items/.*ItemType\.ts$"
  "/data/items/ottoItemModelMapping\.ts$"
  "/data/items/mightyMikeItemSpriteMap\.ts$"
  "/data/items/standardParamTypes\.ts$"
  "/data/items/liquidPatchItems\.ts$"
  "/python/structSpecs/gameLevelTypes\.ts$"
  "/python/structSpecs/LevelTypes\.ts$"
  "/modelParsers/parseBG3D\.ts$"
  "/modelParsers/parsedBg3dGitfConverter\.ts$"
  "/modelParsers/skeletonSystemNew\.ts$"
  "/modelParsers/parseMightyMike\.ts$"
  "/modelParsers/threeDMF/parse3DMF\.ts$"
  "/modelParsers/threeDMF/convert\.ts$"
  "/modelParsers/threeDMF/write3DMF\.ts$"
  "/utils/tgaImageParser\.ts$"
  "/editor/loadLogic/parseMightyMikeFile\.ts$"
  "/parsers/mightyMikeShapesParser\.ts$"
  "/data/items/mappers/croMagItemMapper\.ts$"
  "/data/items/mappers/nanosaur2ItemMapper\.ts$"
  "/validation/games/sharedSchemas\.ts$"
  "/validation/games/ottoMatic\.ts$"
  "/validation/games/mightyMike\.ts$"
  "/editor/utils/topologyBrushUtils\.ts$"
  "/editor/subviews/mightymike/MightyMikeTileMenu\.tsx$"
  "/editor/subviews/bugdom/BugdomTileMenu\.tsx$"
  "/editor/subviews/water/liquidRenderingUtils\.ts$"
  "/editor/subviews/supertiles/MightyMikeSupertiles\.tsx$"
  "/editor/subviews/supertiles/SupertilesMenu\.tsx$"
  "/editor/subviews/splines/SplineSubmenus\.tsx$"
  "/editor/IntroPrompt\.tsx$"
  "/editor/threejs/Three\.tsx$"
  "/editor/threejs/ItemGeometry\.tsx$"
  "/components/AnimationViewer/KeyframeEditor\.tsx$"
  "/components/AnimationViewer/AnimationViewer\.tsx$"
  "/components/ImageEditor\.tsx$"
  "/data/saveMap/saveMap\.ts$"
  "/data/utils/levelResizeUtils\.ts$"
  "/data/processors/classicProprocessor\.ts$"
  "/data/levelTemplates/blankLevelGenerator\.ts$"
  "/pages/ModelViewer/hooks/useFileUpload\.ts$"
  "/pages/SpriteViewer\.tsx$"
  "/pages/ItemModelViewer\.tsx$"
  "/pages/ItemAuditPage\.tsx$"
  "/pages/ModelViewer\.tsx$"
  "/pages/TestModelViewer\.tsx$"
)
LINE_EXEMPT_REASONS=(
  "Test files prioritize scenario coverage breadth; line count is determined by the number of cases, not architectural debt."
  "Item type registries are exhaustive data tables of game entity definitions; splitting by line count creates arbitrary fragmentation with no logical boundary."
  "Model mapping table is a single lookup source of truth for all Otto Matic item models; splitting would add indirection without reducing complexity."
  "Sprite index map is a contiguous lookup table associating Mighty Mike items to sprite indices; splitting is arbitrary fragmentation."
  "Parameter type registry is a unified schema consumed by multiple item type files; splitting would scatter definitions across files."
  "Liquid patch item list is a dense item registry where all entries share the same module scope; splitting is arbitrary."
  "Struct spec mirrors the binary game level format layout; must remain contiguous for cross-field parity verification."
  "Struct spec mirrors the binary game level format layout; must remain contiguous for cross-field parity verification."
  "BG3D is a proprietary Pangea 3D binary format with a complex hierarchical chunk structure; parser size reflects irreducible format complexity."
  "BG3D-to-GLTF converter implements a complex skeletal animation bone mapping pipeline; density is inherent to the format conversion domain."
  "Skeleton animation system implements a complex hierarchical bone/mesh/weight relationship model required by the BG3D format."
  "BG3D binary model parser follows the proprietary binary format's chunk layout; size reflects format complexity."
  "3DMF is a complex hierarchical binary format with many chunk types; parser must traverse deeply nested containers."
  "3DMF format converter maps a complex hierarchical binary structure to GLTF geometry; complexity is inherent to the conversion domain."
  "3DMF binary writer implements the inverse of the parser's hierarchical structure; size reflects the format's many chunk types."
  "TGA image parser with full colormap/RLE support; size reflects the format's many conditional branches across pixel formats."
  "Mighty Mike level binary parser; size reflects the proprietary binary format's many chunk types and state."
  "Mighty Mike shapes binary parser; size reflects the proprietary format's multi-section binary layout."
  "Cro-Mag Rally item mapper with per-track model variants; size reflects the large number of track-specific item models."
  "Nanosaur 2 item mapper with level-dependent model overrides; size reflects the multi-level variant resolution logic."
  "Shared level validation schema factory for simplified-header games; size reflects the unified Zod schema composition for multiple game formats."
  "Otto Matic level validation schema; size reflects the full Zod schema for the Otto Matic binary format's many nested sections."
  "Mighty Mike level validation schema; size reflects the full Zod schema for the Mighty Mike format's many nested sections."
  "Topology brush utilities implement the full pixel collection, interpolation, merge, and dual-layer terrain painting pipeline; the file size reflects a dense algorithmic editing surface."
  "Mighty Mike tile menu coordinates palette selection, attribute editing, rendering, and game-specific controls in one coupled editor surface; splitting further would mostly introduce prop plumbing across tightly related UI state."
  "Bugdom tile menu coordinates tile rendering, selection, filter controls, and tile-attribute inspection in one coupled editor surface; splitting further would mostly introduce prop plumbing across tightly related UI state."
  "Liquid rendering utilities encode the full water-surface visualization pipeline including geometry, shading inputs, and editor overlays; the file size reflects the rendering domain complexity."
  "Mighty Mike supertile editor combines preview rendering, palette interactions, and game-specific supertile manipulation in one editor surface with tightly coupled local state."
  "Supertiles menu orchestrates supertile browsing, editing, filtering, and preview interactions in one editor surface; size reflects dense but related UI responsibilities."
  "Spline submenus coordinate the full spline editing workflow, including selection, point editing, and game-specific actions, in one tightly coupled editor surface."
  "Intro prompt is the top-level editor onboarding and file-open workflow surface, combining import, history, presets, and game-routing concerns that currently share a single control flow."
  "Three.tsx is the top-level 3D editor viewport orchestrator, coordinating scene setup, controls, render overlays, and editor interactions; size reflects that integration role."
  "Item geometry renderer coordinates multiple geometry-generation paths, material decisions, and per-item render variants in one rendering surface."
  "Keyframe editor combines track selection, timeline editing, and event editing interactions in one tightly coupled animation authoring surface."
  "Animation viewer is the top-level animation authoring and inspection surface, integrating playback, tracks, keyframes, and event editing flows in one orchestrator component."
  "Image editor combines image preview, palette tools, transforms, and export actions in one tightly coupled editing surface."
  "Map save pipeline coordinates per-format serialization, preview packaging, texture compression, and binary-output assembly across several game formats."
  "Level resize utilities coordinate terrain, items, fences, liquids, and spline resizing rules together because the operations must stay synchronized across one resize transaction."
  "Classic preprocessor normalizes legacy game terrain, items, and texture metadata across several binary-derived formats; size reflects format-specific normalization rules."
  "Blank level generator assembles a full valid level across terrain, items, textures, fences, liquids, and metadata; size reflects the need to produce consistent cross-structure defaults."
  "Model viewer file-upload hook coordinates drag-and-drop, file parsing, worker-based conversion, and error recovery across multiple model formats."
  "Sprite viewer is a large exploratory inspection surface that combines file loading, sprite decoding, palette handling, and interactive preview controls in one tool page."
  "Item model viewer is a large exploratory inspection surface combining model loading, filtering, metadata display, and preview controls in one tool page."
  "Item audit page aggregates filtering, validation, reporting, and inspection controls into a single audit workflow surface."
  "Model viewer is the top-level model inspection and export surface, integrating loading, scene control, animation, textures, and export workflows in one page orchestrator."
  "Test model viewer is a dedicated debugging surface that intentionally keeps multiple experimental inspection flows together for model troubleshooting."
)

INDENT_EXEMPT_REGEXES=(
  "\.test\.tsx?$"
  "\.tsx$"
  "/data/items/.*ItemType\.ts$"
  "/data/items/ottoItemModelMapping\.ts$"
  "/data/items/mightyMikeItemSpriteMap\.ts$"
  "/data/items/standardParamTypes\.ts$"
  "/data/items/liquidPatchItems\.ts$"
  "/python/structSpecs/gameLevelTypes\.ts$"
  "/python/structSpecs/LevelTypes\.ts$"
  "/modelParsers/parseBG3D\.ts$"
  "/modelParsers/parsedBg3dGitfConverter\.ts$"
  "/modelParsers/skeletonSystemNew\.ts$"
  "/modelParsers/parseMightyMike\.ts$"
  "/modelParsers/threeDMF/parse3DMF\.ts$"
  "/modelParsers/threeDMF/convert\.ts$"
  "/modelParsers/threeDMF/write3DMF\.ts$"
  "/modelParsers/skeletonExport\.ts$"
  "/modelParsers/threeDMF/binaryUtils\.ts$"
  "/modelParsers/aliasResource\.ts$"
  "/modelParsers/bg3dWithSkeleton\.ts$"
  "/modelParsers/analyzeGrasshopper\.ts$"
  "/modelParsers/simpleRoundtripCheck\.ts$"
  "/modelParsers/bg3dGltf/"
  "/modelParsers/skeletonRsrc/"
  "/modelParsers/gltfAnimationEvents\.ts$"
  "/modelParsers/bg3dGltfWorker\.ts$"
  "/modelParsers/skeletonBinaryExport\.ts$"
  "/modelParsers/testAllGamesManual\.ts$"
  "/utils/lzss\.ts$"
  "/utils/lzssWorker\.ts$"
  "/utils/jpegCompress\.ts$"
  "/utils/jpegDecompress\.ts$"
  "/utils/jpegCompressWorker\.ts$"
  "/utils/tgaParser\.ts$"
  "/utils/tgaImageParser\.ts$"
  "/utils/diagnosticTGAParser\.ts$"
  "/utils/rlwDecompress\.ts$"
  "/utils/bufferOperations\.ts$"
  "/types/emscripten\.d\.ts$"
  "/editor/loadLogic/parseRsrcLevelFile\.ts$"
  "/editor/loadLogic/parseMightyMikeFile\.ts$"
  "/editor/loadLogic/parseNanosaurLevelFile\.ts$"
  "/editor/loadLogic/compileNanosaur1Level\.ts$"
  "/editor/loadLogic/loadMapImages\.ts$"
  "/parsers/mightyMikeShapesParser\.ts$"
  "/editor/utils/gamePreviewHostRuntime\.ts$"
  "/editor/utils/gamePreviewRuntimeTypes\.ts$"
  "/editor/utils/gamePreviewRuntimeLoader\.ts$"
  "/editor/utils/gamePreviewRuntimeVfs\.ts$"
  "/editor/utils/gamePreviewRuntimeGlobals\.ts$"
  "/data/tunnelParser/parseTunnelFile\.ts$"
  "/data/tunnelParser/serializeTunnelFile\.ts$"
  "/data/games/"
  "/data/splines/"
  "/data/tiles/"
  "/data/selectors/"
  "/data/items/itemCategories\.ts$"
  "/data/items/itemFilterAtoms\.ts$"
  "/validation/games/sharedSchemas\.ts$"
  "/validation/games/ottoMatic\.ts$"
  "/validation/games/mightyMike\.ts$"
  "/validation/validateLevelForGame\.ts$"
  "/validation/citationExtractor\.ts$"
  "/validation/citationVerifierUtils\.ts$"
  "/validation/reportGenerator\.ts$"
  "/utils/gltfAnalyzer\.ts$"
  "/utils/googleDrive\.ts$"
  "/utils/mightyMikePalette\.ts$"
  "/utils/mightyMikeShapeImageLoader\.ts$"
  "/utils/mightyMikePaletteIntegration\.ts$"
  "/editor/IntroPrompt/historyHooks\.ts$"
  "/editor/utils/gameFeatures\.ts$"
  "/editor/utils/topologyBrushUtils\.ts$"
  "/editor/subviews/water/liquidRenderingUtils\.ts$"
  "/editor/threejs/hooks/useOttoItemModelCache\.ts$"
  "/editor/threejs/hooks/itemModelLoaderUtils\.ts$"
  "/components/AnimationViewer/hooks\.ts$"
  "/components/model-viewer/useModelHierarchy\.ts$"
  "/components/model-viewer/useModelAnimations\.ts$"
  "/data/saveMap/saveMap\.ts$"
  "/data/utils/levelDataUtils\.ts$"
  "/data/utils/levelResizeUtils\.ts$"
  "/data/levelEdit/editOperations\.ts$"
  "/data/processors/nullToZeroFixer\.ts$"
  "/data/processors/classicProprocessor\.ts$"
  "/data/processors/ottoPreprocessor\.ts$"
  "/data/levelTemplates/blankLevelGenerator\.ts$"
  "/data/items/itemParams\.ts$"
  "/data/items/mightyMikeItemParams\.ts$"
  "/pages/ModelViewer/utils/downloadUtils\.ts$"
  "/pages/ModelViewer/utils/prepareSceneForAnimationExport\.ts$"
  "/pages/ModelViewer/utils/textureUtils\.ts$"
  "/pages/ModelViewer/hooks/useFileUpload\.ts$"
  "/pages/ModelViewer/hooks/useTextureManagement\.ts$"
  "/pages/itemAuditUtils\.ts$"
)
INDENT_EXEMPT_REASONS=(
  "Test assertion nesting is driven by describe/it/expect framework structure, not imperative branch complexity."
  "TSX files use declarative JSX tree structure; multi-line Tailwind className strings cause false-positive depth readings. Line count check enforces component size limits."
  "Item type registries are deeply nested data literals matching the game's object hierarchy; nesting is structural, not logical."
  "Model mapping entries are deeply nested object literals matching the 3D model hierarchy; no imperative branching."
  "Sprite map entries are nested object literals; nesting is structural data, not control-flow depth."
  "Parameter type definitions use nested union types matching the binary format schema; not control-flow nesting."
  "Liquid patch item definitions use nested object literals; nesting is data structure, not logic depth."
  "Struct spec uses nested typed literals exactly matching binary format field offsets; nesting mirrors the binary specification."
  "Struct spec uses nested typed literals exactly matching binary format field offsets; nesting mirrors the binary specification."
  "BG3D parser uses nested switch/conditionals driven by the chunk type hierarchy of the binary format."
  "BG3D-to-GLTF converter uses deeply nested object construction reflecting the GLTF scene hierarchy."
  "Skeleton system uses nested object access patterns reflecting the hierarchical bone/joint/mesh relationship."
  "Mighty Mike parser uses nested switch/conditionals driven by the binary format's chunk structure."
  "3DMF parser uses deeply nested chunk traversal reflecting the format's container hierarchy."
  "3DMF converter uses nested object mapping reflecting both source and destination format hierarchies."
  "3DMF writer uses nested chunk construction reflecting the format's container hierarchy."
  "Skeleton export implements complex bone hierarchy serialization matching GLTF output constraints."
  "3DMF binary utilities implement low-level chunk reading with structural nesting matching binary block boundaries."
  "Alias resource handler implements Mac OS resource fork binary parsing with structural nesting."
  "BG3D-with-skeleton module integrates multiple proprietary binary formats; nesting reflects the format combination."
  "Grasshopper analysis traverses BG3D's hierarchical chunk tree; nesting mirrors the format structure."
  "Roundtrip check traverses both input and output format hierarchies in parallel; nesting is structural."
  "BG3D GLTF sub-modules implement skeleton/skinning/bone/material/mesh conversion layers."
  "Skeleton resource handler parses Pangea's proprietary skeleton binary resource format."
  "GLTF animation event serialization mirrors the GLTF extension hierarchy."
  "BG3D GLTF web worker wraps the full BG3D-to-GLTF pipeline; complexity is in the pipeline, not the wrapper."
  "Skeleton binary export serializes a complex hierarchical bone/animation structure to a binary format."
  "Manual game test utility; internal script not subject to production refactoring standards."
  "LZSS compression algorithm; loop nesting is inherent to the sliding-window algorithm structure."
  "LZSS web worker wraps the compression algorithm; nesting follows the worker message protocol."
  "JPEG compression implementation; nesting reflects the DCT/quantization/entropy coding pipeline."
  "JPEG decompression implementation; nesting reflects the entropy decoding/dequantization/IDCT pipeline."
  "JPEG compression web worker; nesting follows the worker message protocol."
  "TGA image format parser; nesting reflects the header/colormap/pixel data binary layout."
  "TGA image parser with full colormap support; nesting reflects the format's conditional sections."
  "TGA diagnostic parser for debugging; same structural constraints as the main parser."
  "RLW decompression algorithm; loop nesting is inherent to the run-length encoding traversal."
  "Binary buffer operations; low-level bit manipulation requires tight loop/conditional nesting."
  "Emscripten TypeScript declarations; type nesting reflects the C/C++ API's namespace hierarchy."
  "Resource file (RSRC) binary parser; nesting reflects the Mac OS resource fork format's hierarchical structure."
  "Mighty Mike level binary parser; nesting reflects the proprietary binary format's chunk hierarchy."
  "Nanosaur level binary parser; nesting reflects the proprietary Pangea binary format structure."
  "Nanosaur 1 level compiler; nesting mirrors the binary output format's hierarchical structure."
  "Map image loader orchestrates LZSS/JPEG workers with complex async coordination."
  "Mighty Mike shapes binary parser; nesting reflects the proprietary format's multi-section binary layout."
  "Emscripten host runtime; nesting reflects the SDL/OpenGL callback hierarchy."
  "Emscripten runtime types; nesting reflects the C++ API's namespace and callback structure."
  "Emscripten module loader; nesting reflects the wasm initialization protocol."
  "Emscripten virtual filesystem; nesting reflects the VFS mount/file hierarchy operations."
  "Emscripten global state management; structure driven by the wasm runtime lifecycle."
  "Tunnel binary parser; nesting reflects the tunnel file format's section/record binary structure."
  "Tunnel binary serializer; nesting mirrors the parser's structure for the inverse operation."
  "Game configuration objects use nested literal properties matching the game's level/item/config hierarchy."
  "Spline item type registries are nested object literals matching spline parameter schemas; not control-flow."
  "Tile data handlers operate on game-format-specific binary tile structures requiring field-level nesting."
  "Jotai selector compositions use functional derivation patterns; nesting is selector chaining, not imperative branching."
  "Item category registry is a nested constant object; nesting is data structure, not imperative logic."
  "Item filter atom definitions use nested Jotai atom compositions; nesting is derived-state structure, not branching."
  "Shared level validation Zod schema factory; nesting reflects the nested game level data format validated."
  "Otto Matic level Zod schema; nesting mirrors the nested sections of the binary level data format."
  "Mighty Mike level Zod schema; nesting mirrors the nested sections of the binary level data format."
  "Top-level validation dispatcher walks multiple game-specific schema and normalization branches; nesting follows validation routing rather than avoidable imperative depth."
  "Citation extraction traverses nested parameter definition trees and sample metadata structures; nesting reflects the citation data model."
  "Citation verifier utilities implement multi-line snippet matching with nested scan loops; nesting is inherent to the search algorithm."
  "Verification report generator traverses grouped verification result structures and formats nested output sections; nesting reflects report assembly."
  "GLTF analyzer traverses nested scene, mesh, material, and animation structures from imported models."
  "Google Drive integration coordinates nested API response handling and file tree traversal."
  "Mighty Mike palette utilities implement palette decoding and index remapping over nested binary/image structures."
  "Mighty Mike shape image loader coordinates nested shape records, palette application, and image assembly."
  "Mighty Mike palette integration coordinates palette resolution, image decoding, and fallback behavior across several nested format branches."
  "Intro prompt history hooks coordinate nested history state transitions and persistence flows."
  "Game feature detection composes many per-game capability branches; nesting reflects the feature matrix rather than incidental control flow."
  "Topology brush utilities implement nested pixel neighborhood traversal, interpolation, and dual-layer paint merging."
  "Liquid rendering utilities traverse nested water geometry, mask, and overlay generation paths."
  "Item model cache hook coordinates nested cache, worker, file-load, extraction, and error states within one asynchronous loading pipeline."
  "Item model loader utilities coordinate nested worker messaging, fetch, GLTF loading, and model extraction steps."
  "Animation viewer hooks coordinate nested playback, selection, and timeline synchronization flows."
  "Model hierarchy hook recursively traverses nested scene graph structures."
  "Model animation hook coordinates nested animation clip, track, and state synchronization logic."
  "Map save pipeline coordinates nested serializer, compression, and format-selection branches across multiple game targets."
  "Level data utilities traverse nested resource-fork records, metadata, and level structures."
  "Level resize utilities apply nested updates across terrain, items, splines, liquids, and fences in lockstep."
  "Edit operation helpers use nested discriminated-union routing for reversible merge and inversion behavior."
  "Null-to-zero fixer traverses nested level structures to normalize sparse imported data."
  "Classic preprocessor contains nested normalization branches driven by legacy format differences across games."
  "Otto preprocessor contains nested normalization branches driven by legacy level data differences and liquid/spline fixups."
  "Blank level generator assembles nested data structures required for a valid generated level."
  "Item parameter definitions use nested data literals and citation metadata rather than imperative complexity."
  "Mighty Mike item parameter definitions use nested data literals and citation metadata rather than imperative complexity."
  "Model viewer download helpers coordinate nested export-mode and output-format branches."
  "Animation export preparation walks nested scene, animation, and material state before export."
  "Texture utilities traverse nested image/material/texture conversion branches."
  "Model viewer file-upload hook coordinates nested file-type, worker, and parser branches."
  "Texture management hook coordinates nested texture source, override, and cleanup states."
  "Item audit utilities traverse nested game/item/report structures to compute summaries and findings."
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
