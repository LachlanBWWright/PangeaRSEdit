# Fix Supertile Resize Entity Offsets

## Problem

Removing a supertile from the top or left currently shifts world-space entities too far relative to the terrain textures. Affected data includes items, fences, splines, and liquid patches.

The likely source is `applySupertileResizeToAtomicData` in `frontend/src/editor/utils/levelResizeHandlers.ts`. The supertile UI passes `supertileCount * globals.TILES_PER_SUPERTILE` as `tileCount`, then the entity shift is computed as:

```ts
offsetUnits = tileCount * globals.TILE_INGAME_SIZE
```

For a one-supertile top/left resize, this shifts entities by `TILES_PER_SUPERTILE * TILE_INGAME_SIZE`. In games where `TILE_INGAME_SIZE` already represents the terrain cell size used by the visible terrain textures, that multiplies the intended world shift by the number of tiles inside a supertile.

There is also a structural issue: `resizeLevel` already resizes items, but `applySupertileResizeToAtomicData` then special-cases fences, splines, and liquids from the original level. The two paths use the same `tileCount` value but the meaning of that value is ambiguous between logical terrain cells, visual supertiles, and world units.

Important coordinate-system detail: this codebase distinguishes Oreomap/source tile scale from in-game world scale. `globals.TILE_SIZE` corresponds to `OREOMAP_TILE_SIZE`, while `globals.TILE_INGAME_SIZE` corresponds to the terrain/world coordinate step used by entities. The fix must preserve that scale conversion intentionally instead of treating source tile counts, supertile counts, and entity world units as interchangeable.

## Relevant Files

- `frontend/src/editor/gameViews/editorResizeState.ts`
  - Converts `supertileCount` to `tileCount`.
- `frontend/src/editor/utils/levelResizeHandlers.ts`
  - Applies the supertile resize to atomic editor state.
  - Recomputes fence, spline, and liquid offsets separately.
- `frontend/src/data/utils/levelResizeUtils.ts`
  - Resizes terrain, `STgd`, header dimensions, and items.
- `frontend/src/data/utils/levelEntityResizeUtils.ts`
  - Shifts fences, splines, and liquids in world coordinates.
- `frontend/src/editor/utils/levelResizeHandlers.test.ts`
  - Currently expects a one-supertile top/left add to shift entities by `TILES_PER_SUPERTILE * TILE_INGAME_SIZE`.

## Intended Behavior

After adding or removing supertiles:

- Terrain texture data should move according to the resized terrain grid.
- Items, fence nubs and bounding boxes, spline nubs/points/bounding boxes, and liquid hotspots/nubs/bounding boxes should remain attached to the same visual terrain positions.
- Adding or removing from `right` or `bottom` should not shift existing entity world coordinates.
- Adding to `left` or `top` should shift entities by exactly the world width/depth of the inserted terrain band.
- Removing from `left` or `top` should shift entities by exactly the negative world width/depth of the removed terrain band.
- Entities outside the new bounds should be handled consistently across items, fences, splines, and liquids. At minimum, existing item out-of-bounds behavior must not regress.

## Proposed Fix

1. Introduce an explicit resize measurement helper.

   Create a small importable helper that returns both terrain-grid offsets and world-coordinate offsets from the same inputs. The helper should avoid overloading a single `tileCount` value with multiple meanings.

   Suggested shape:

   ```ts
   interface SupertileResizeMeasurements {
     terrainTileDelta: number;
     terrainOffsetX: number;
     terrainOffsetZ: number;
     entityOffsetXUnits: number;
     entityOffsetZUnits: number;
   }
   ```

   The entity offsets should represent the actual world size of one inserted or removed visible supertile band. For the affected path, verify whether this is `supertileCount * globals.TILE_INGAME_SIZE` or `supertileCount * globals.TILES_PER_SUPERTILE * globals.TILE_INGAME_SIZE` per game format. The visual bug indicates the current code is using the larger value where the smaller value is needed.

2. Separate tile-grid resizing from entity-coordinate shifting.

   Keep `resizeLevel` responsible for header, terrain arrays, `STgd`, `YCrd`, and item bounds filtering, but make the world offset passed to entities explicit rather than deriving it again from `options.tileCount`.

   The cleanest follow-up is to add a lower-level item resize helper that accepts explicit `offsetXUnits` and `offsetZUnits`, so items use the same world offset as fences, splines, and liquids. Until then, `applySupertileResizeToAtomicData` should avoid a mismatch where items are shifted by one formula and other entities by another.

3. Update `applySupertileResizeToAtomicData`.

   Replace the current offset calculation:

   ```ts
   const offsetXUnits =
     (options.direction === "left" ? options.tileCount : 0) * tileSize;
   const offsetZUnits =
     (options.direction === "top" ? options.tileCount : 0) * tileSize;
   ```

   with the explicit measurement helper. Apply the same entity world offsets to:

   - `Itms[1000].obj[].x`
   - `Itms[1000].obj[].z`
   - `FnNb` points and `Fenc` bounding boxes
   - `SpNb`, `SpPt`, and `Spln` bounding boxes
   - `Liqd` hotspots, nubs, and bounding boxes

4. Add regression tests for remove top and remove left.

   Extend `frontend/src/editor/utils/levelResizeHandlers.test.ts` with cases that remove one supertile from `top` and `left`, using nonzero entity coordinates that remain in bounds after the expected shift.

   Assertions should compare entity coordinates to the terrain-relative expected result, not just to the current implementation. Include at least:

   - item `x` and `z`
   - first fence nub
   - first spline nub and spline point
   - liquid hotspot and first liquid nub
   - fence, spline, and liquid bounding boxes

5. Correct the existing add top/left expectations.

   The current test comment says:

   ```ts
   offsetUnits = TILES_PER_SUPERTILE * TILE_INGAME_SIZE
   ```

   Replace that with the verified visual-world offset. If the correct offset is one terrain texture cell per supertile operation, the expected value should be `TILE_INGAME_SIZE` for a one-supertile operation, not `TILES_PER_SUPERTILE * TILE_INGAME_SIZE`.

6. Verify all directions and supported games.

   Run the focused tests first:

   ```bash
   npm test -- levelResizeHandlers
   npm test -- levelResize
   ```

   Then run the frontend test suite if the focused tests pass:

   ```bash
   npm test
   ```

   Manually verify at least one level with fences/splines/items/liquid by placing entities on recognizable terrain features, removing a supertile from `top` and `left`, and confirming the entities remain aligned with those features.

## Implementation Notes

- Do not use `any`, type assertions, disabled lint rules, or thrown exceptions.
- Keep the measurement helper outside React components so it is directly testable.
- Prefer `Result` or `ResultAsync` if new recoverable validation is introduced.
- Use Zod only if the fix begins accepting unknown runtime data; pure typed coordinate math does not need schema parsing.
- Keep comments limited to clarifying the coordinate-space distinction.

## Acceptance Criteria

- Removing one supertile from `top` no longer shifts items, fences, splines, or liquids by a multiplied offset.
- Removing one supertile from `left` no longer shifts items, fences, splines, or liquids by a multiplied offset.
- Adding one supertile to `top` or `left` still preserves entity positions relative to terrain textures.
- Adding or removing from `right` or `bottom` does not shift existing entity coordinates.
- Regression tests cover top, left, bottom, and right for items, fences, splines, and liquids.
- The focused resize tests pass.
