# Tile Pattern Brushes Plan

## Goal

Add reusable map brushes for Bugdom 1, Nanosaur 1, and Mighty Mike so a user can capture or build a rectangular tile pattern, then stamp it repeatedly onto the full map. A brush must preserve each cell's tile index plus the transform data supported by that game, including rotation and horizontal or vertical flips where the terrain format stores them.

## Current System Shape

- Bugdom 1 and Nanosaur 1 render individual tiles through `frontend/src/editor/subviews/supertiles/IndividualTileSupertiles.tsx`, backed by `BugdomSupertiles`.
- Bugdom 1 and Nanosaur 1 tile values live in `terrainData.Layr[1000].obj`; Bugdom 1 can also have a roof layer at `Layr[1001]`.
- Bugdom 1 tile values encode the tile number in `TILENUM_MASK` and transforms in `TILE_ROTATE_MASK`, `TILE_FLIPX_MASK`, and `TILE_FLIPY_MASK` from `frontend/src/editor/subviews/bugdom/BugdomTileRenderer.utils.ts`.
- Bugdom 1 tile image selection and per-tile transform editing already exist in `frontend/src/editor/subviews/bugdom/BugdomTileMenu.tsx` and `BugdomTileMenuUtils.ts`.
- Mighty Mike renders a direct 2D tile map through `frontend/src/editor/subviews/supertiles/MightyMikeSupertiles.tsx`, with click and drag behavior for selection, collision, param, and alt-map brushes.
- Existing tile paint helpers live in `frontend/src/data/tiles/tilePaintHandler.ts`, but they model single-tile painting for attribute-index style tile data and do not preserve multi-cell patterns or transform bits.

## Feature Scope

Build a first version around rectangular brushes:

- Create a brush from the currently selected map rectangle.
- Create an empty brush with user-selected width and height, then configure each cell.
- Stamp the brush onto the active map layer at a clicked anchor tile.
- Show a live preview footprint while hovering over the map.
- Support transparent cells inside a brush so partial patterns can be stamped.
- Support rotate and flip operations for the brush as a whole, updating both cell positions and each cell's transform bits when the game supports transforms.
- Keep brushes local to the editor session initially, with import/export JSON as the persistence path.

Defer these until after the first version:

- Global brush library stored across browser sessions.
- Non-rectangular selection tools beyond transparent cells.
- Auto-tiling or rule-based brush variants.
- Painting item, collision, parameter, or alt-map data as part of a tile brush.

## Data Model

Add a new folder:

- `frontend/src/data/tileBrushes/`

Core files:

- `tileBrushTypes.ts`
- `tileBrushSchemas.ts`
- `tileBrushTransforms.ts`
- `tileBrushApply.ts`
- `tileBrushAtoms.ts`
- `tileBrushImportExport.ts`

Use explicit types and Zod schemas for unknown imported JSON.

Suggested model:

```ts
export type TileBrushGame = "bugdom1" | "nanosaur1" | "mightymike";

export interface TileBrushCell {
  readonly tileValue: number;
  readonly enabled: boolean;
}

export interface TileBrush {
  readonly id: string;
  readonly name: string;
  readonly game: TileBrushGame;
  readonly width: number;
  readonly height: number;
  readonly cells: readonly TileBrushCell[];
}
```

Important details:

- Store `tileValue` exactly as it appears in `Layr`, not only the resolved image index. This preserves Bugdom and Nanosaur rotation and flip bits without lossy conversion.
- For Bugdom/Nanosaur, tile value operations should use the existing masks from `BugdomTileRenderer.utils.ts`.
- For Mighty Mike, start by preserving the layer value exactly. If future reverse engineering finds transform bits in Mighty Mike layers, the same model can support them.
- `cells.length` must equal `width * height`.
- Imported brushes must be parsed through Zod and returned as `Result<TileBrush, string>` or `Result<readonly TileBrush[], string>`.

## Editor State

Add Jotai atoms in `tileBrushAtoms.ts`:

- `TileBrushesAtom`: the in-memory brush list.
- `SelectedTileBrushIdAtom`: selected brush id or `null`.
- `TileBrushModeAtom`: `"select" | "capture" | "stamp" | "edit"`.
- `TileBrushAnchorAtom`: `"topLeft" | "center"`.
- `TileBrushPreviewAtom`: hover target tile coordinate or `null`.
- `TileBrushActiveLayerAtom`: `1000 | 1001`, matching floor or roof where available.

Keep state small and serializable. Do not place canvas objects or rendered previews in brush state.

## Brush Operations

Implement pure, parameterized functions in `tileBrushApply.ts` and `tileBrushTransforms.ts`.

Required functions:

- `createTileBrushFromRegion(args)`: reads a rectangular region from `TerrainData` and returns `Result<TileBrush, string>`.
- `applyTileBrush(args)`: writes enabled brush cells into an Immer `Draft<TerrainData>` at the requested anchor.
- `getBrushTargetCells(args)`: returns target map indices for preview and validation.
- `rotateTileBrushClockwise(brush)`: rotates the grid and updates transform bits for supported games.
- `flipTileBrushHorizontal(brush)`: mirrors the grid and updates transform bits for supported games.
- `flipTileBrushVertical(brush)`: mirrors the grid and updates transform bits for supported games.
- `renameTileBrush(brush, name)` and `setTileBrushCell(brush, cellIndex, tileValue | null)`.

`applyTileBrush` behavior:

- Clip at map boundaries by default. Do not fail the whole stamp because part of the brush is outside the map.
- Skip disabled cells.
- Return a typed result with modified indices and skipped count.
- Write only the active layer.
- Preserve existing undo/redo behavior by applying through the existing `setTerrainData` updater.

Transform behavior for Bugdom/Nanosaur:

- Whole-brush rotation moves cells to their new grid positions and increments each enabled cell's rotation bits.
- Horizontal and vertical brush flips move cells and toggle the corresponding flip bit on each enabled cell.
- Keep tile number bits unchanged.
- Add tests for all four rotations and both flips, including combinations of existing flip and rotation bits.

## UI Integration

Add a reusable panel:

- `frontend/src/editor/subviews/tileBrushes/TileBrushPanel.tsx`

The panel should be usable from:

- `BugdomTileMenu` for Bugdom 1.
- `BugdomTileMenu` when used by `NanosaurEditorView` supertile mode.
- `MightyMikeTileMenu` for Mighty Mike.

Panel controls:

- Brush list with rename and delete.
- Capture from map selection.
- New empty brush with width and height fields.
- A compact brush grid editor showing tile thumbnails where available.
- Rotate, flip horizontal, and flip vertical buttons using lucide icons.
- Import and export JSON buttons.
- Stamp mode toggle.
- Anchor segmented control: top-left or center.

Do not put the panel inside another card. It should fit the existing dense editor menu style.

## Canvas Interaction

Bugdom/Nanosaur:

- Extend `BugdomSupertiles` or add a sibling overlay component for tile-level pointer handling.
- Convert Konva pointer position to map tile coordinates using `globals.TILE_SIZE`.
- In stamp mode, show a semi-transparent rectangular preview over the target cells.
- On click or drag, call `applyTileBrush` through `setTerrainData`.
- In capture mode, allow drag-selecting a rectangle and call `createTileBrushFromRegion`.
- Keep existing supertile selection behavior when brush mode is not active.

Mighty Mike:

- Extend `MightyMikeSupertiles` click and drag handling.
- Brush stamping should run before selection behavior when `TileBrushModeAtom` is `"stamp"`.
- Preserve current collision, param, and alt-map brush behavior by making tile-pattern stamping active only in the main terrain tile editing mode.

Shared preview:

- Add `TileBrushPreviewLayer.tsx` under `frontend/src/editor/subviews/tileBrushes/`.
- Render target cells as `Rect` overlays, using enabled cells only.
- Use stable dimensions based on `globals.TILE_SIZE` or the Mighty Mike `TILE_SIZE`.

## Import and Export

Use JSON shaped like:

```json
{
  "version": 1,
  "brushes": []
}
```

Rules:

- Parse imported files with Zod.
- Return `Result` from parsing and validation.
- Reject brushes for a different game unless the user explicitly imports them into a compatible raw-tile mode later.
- Export only serializable brush data.

## Testing Plan

Add unit tests for:

- Brush creation from a valid region.
- Region capture clipped or rejected when the rectangle starts outside the map.
- Stamping with top-left anchor.
- Stamping with center anchor.
- Stamping clipped at map edges.
- Disabled cells being skipped.
- Bugdom/Nanosaur rotation bit updates.
- Bugdom/Nanosaur flip bit updates.
- Zod import validation for valid files, malformed files, wrong cell count, and wrong version.

Add focused React tests only where behavior is not covered by pure functions:

- Brush panel mode switching.
- Import error display.
- Stamp mode prevents normal tile selection while active.

## Implementation Steps

1. Add the `tileBrushes` data module with types, schemas, atoms, pure transform functions, apply functions, and unit tests.
2. Add `TileBrushPanel` with in-memory brush creation, selection, rename, deletion, transform buttons, and import/export.
3. Integrate the panel into `BugdomTileMenu` and `MightyMikeTileMenu`.
4. Add tile-level pointer coordinate helpers for Bugdom/Nanosaur and Mighty Mike.
5. Add stamp-mode canvas handling and preview overlays.
6. Add capture-mode rectangle selection for Bugdom/Nanosaur and Mighty Mike.
7. Verify undo/redo, roof layer selection, map-edge clipping, and import/export manually.
8. Run the frontend unit tests and lint/typecheck commands used by the project.

## Risks and Decisions

- Bugdom and Nanosaur share renderer utilities today, but the plan should still keep the brush game id explicit so future game-specific tile formats do not leak into shared code.
- Rotation plus flip composition can be subtle. The first implementation should match the renderer's bit behavior and include regression tests before UI integration.
- Capturing raw `Layr` values means brushes are level-local when tile indices differ between levels. Import should warn when a brush is loaded into a different game or a level with fewer available tile images.
- Existing `BugdomTileMenuUtils.ts` uses some runtime shape checks around `Xlat`; new brush import code should avoid adding more ad hoc unknown narrowing and rely on Zod at the file boundary.
