# 3D Topology Editing Implementation Plan

## Overview

Add topology adjustment capabilities to the 3D editor view with visual feedback, mirroring the functionality currently available in the 2D view.

---

## Current State Analysis

### 2D Topology Editing (Existing)
**Location:** `frontend/src/editor/subviews/Tiles.tsx:120-296`

The 2D view provides:
- **Brush modes:** Circle and Square brushes with configurable radius
- **Adjustment modes:** SET_VALUE, DELTA_VALUE, DELTA_WITH_DROPOFF
- **Visual feedback:** Grayscale elevation overlay with opacity control
- **Data binding:** Updates `terrainData.YCrd[1000].obj` array

### 3D View (Current)
**Location:** `frontend/src/editor/threejs/Three.tsx:106-223`

Currently provides:
- Read-only terrain mesh visualization
- MapControls for orbit/pan navigation
- Visibility toggles for splines, items, fences, liquid
- No interaction/editing capability

---

## Implementation Tasks

### 1. Add Raycasting for Mouse-to-Terrain Intersection

**Files to modify:**
- `frontend/src/editor/threejs/Three.tsx`
- `frontend/src/editor/threejs/Terrain.tsx`

**Implementation:**
1. Add `useRef` for terrain mesh in `Terrain.tsx`
2. Create raycaster using Three.js `Raycaster` class
3. Convert mouse position to normalized device coordinates
4. Cast ray against terrain mesh to find intersection point
5. Convert world intersection point to tile coordinates using inverse of existing formulas:
   ```typescript
   const xTile = Math.floor(intersectPoint.x / TILE_INGAME_SIZE)
   const zTile = Math.floor(intersectPoint.z / TILE_INGAME_SIZE)
   ```

**Reference:** Height calculation utilities at `frontend/src/editor/threejs/fenceUtils/getTerrainHeightAtPoint.ts:8-81`

---

### 2. Create 3D Brush Visualization Component

**New file:** `frontend/src/editor/threejs/TopologyBrush3D.tsx`

**Implementation:**
1. Create a visual indicator showing the brush area on the terrain
2. For **circle brush**: Use `RingGeometry` or `CircleGeometry` projected onto terrain
3. For **square brush**: Use `PlaneGeometry` or line segments forming a square
4. Position follows mouse intersection point
5. Scale based on `TopologyBrushRadius` atom value
6. Use semi-transparent material for visibility

**Visual approach options:**
- **Option A:** Flat overlay geometry that follows terrain contours (more accurate)
- **Option B:** Simple projected ring/square at average height (simpler, less accurate)
- **Option C:** Vertex highlighting on terrain mesh (most accurate, more complex)

**Recommended:** Option A with simplified terrain following

---

### 3. Create Area Preview Visualization

**New file:** `frontend/src/editor/threejs/TopologyPreview3D.tsx`

**Implementation:**
1. Show affected area preview during hover (before click)
2. Calculate affected tiles based on brush mode and radius
3. Visualize height change preview:
   - For SET_VALUE: Show target height plane
   - For DELTA_VALUE: Show offset indicators
   - For DELTA_WITH_DROPOFF: Show gradient falloff visualization

**Approach:**
- Create a secondary mesh showing the "preview" terrain state
- Use different material (wireframe or tinted) to distinguish from actual terrain
- Update on mouse move within editing mode

---

### 4. Implement Click/Drag Handlers for Topology Editing

**Files to modify:**
- `frontend/src/editor/threejs/Three.tsx`
- `frontend/src/editor/threejs/Terrain.tsx`

**Implementation:**
1. Add `onPointerDown`, `onPointerMove`, `onPointerUp` handlers to Canvas
2. Detect when in topology editing mode (check `TileViewMode` atom)
3. On click/drag:
   - Get intersection point via raycaster
   - Convert to tile coordinates
   - Apply brush logic identical to 2D view

**Reuse from 2D:**
The brush application logic from `Tiles.tsx:224-290` should be extracted to a shared utility:

**New file:** `frontend/src/editor/utils/topologyBrushUtils.ts`

```typescript
interface BrushParams {
  centerX: number
  centerY: number
  radius: number
  brushMode: 'CIRCLE' | 'SQUARE'
  valueMode: 'SET_VALUE' | 'DELTA_VALUE' | 'DELTA_WITH_DROPOFF'
  value: number
  header: TerrainHeader
  globals: Globals
}

function applyTopologyBrush(
  ycrdArray: Int16Array,
  params: BrushParams
): void {
  // Extracted from Tiles.tsx:224-290
}
```

---

### 5. Real-time Terrain Mesh Updates

**Files to modify:**
- `frontend/src/editor/threejs/Terrain.tsx:38-62`

**Implementation:**
1. Add dependency on YCrd data changes to trigger re-render
2. When YCrd array updates:
   - Update vertex Z positions
   - Recompute vertex normals via `geometry.computeVertexNormals()`
   - Mark geometry as needing update: `geometry.attributes.position.needsUpdate = true`

**Consideration:** For performance during drag operations, consider:
- Debouncing updates
- Only updating affected region vertices
- Using `BufferGeometry` efficiently

---

### 6. Disable MapControls During Editing

**Files to modify:**
- `frontend/src/editor/threejs/Three.tsx`

**Implementation:**
1. Add state to track if user is currently editing topology
2. Disable `MapControls` when mouse is down in editing mode
3. Re-enable when mouse is released or leaves canvas
4. This prevents camera movement while trying to edit terrain

```typescript
<MapControls
  enabled={!isEditing && !isDraggingTopology}
  // ... other props
/>
```

---

### 7. Add 3D-Specific UI Controls

**Files to modify:**
- `frontend/src/editor/gameViews/StandardTilesMenu.tsx`
- `frontend/src/editor/gameViews/IndividualTilesMenu.tsx`

**Implementation:**
1. Show existing topology controls when in 3D mode (they're already there)
2. Add toggle for 3D-specific options:
   - Show brush preview (on/off)
   - Preview opacity slider
   - Snap to grid toggle

---

### 8. Coordinate System Integration

**Existing utilities to use:**
- `frontend/src/editor/threejs/fenceUtils/flattenCoords.ts:5-13` - Convert tile coords to array index
- `frontend/src/editor/threejs/fenceUtils/getHeightAtTile.ts:8-30` - Get height at tile position
- `frontend/src/editor/subviews/tiles/tilesUtils.ts:4-14` - 2D coordinate flattening (same formula)

**New utility needed:**
```typescript
// Convert world position to tile coordinates
function worldToTile(worldX: number, worldZ: number): { x: number, z: number } {
  return {
    x: Math.floor(worldX / TILE_INGAME_SIZE),
    z: Math.floor(worldZ / TILE_INGAME_SIZE)
  }
}
```

---

## File Structure Summary

### New Files
| File | Purpose |
|------|---------|
| `threejs/TopologyBrush3D.tsx` | Visual brush indicator on terrain |
| `threejs/TopologyPreview3D.tsx` | Preview of height changes |
| `utils/topologyBrushUtils.ts` | Shared brush application logic |

### Modified Files
| File | Changes |
|------|---------|
| `threejs/Three.tsx` | Add raycaster, event handlers, disable controls during edit |
| `threejs/Terrain.tsx` | Add ref, real-time updates, pointer events |
| `gameViews/StandardTilesMenu.tsx` | 3D-specific UI options |
| `gameViews/IndividualTilesMenu.tsx` | 3D-specific UI options |
| `subviews/Tiles.tsx` | Extract brush logic to shared utility |

---

## Implementation Order

1. **Extract shared brush logic** - Refactor 2D code to use shared utility
2. **Add raycasting** - Mouse-to-terrain intersection
3. **Add click handlers** - Basic topology editing in 3D
4. **Disable controls during edit** - Prevent camera movement
5. **Add brush visualization** - Visual feedback of brush area
6. **Add preview visualization** - Show height changes before applying
7. **Optimize updates** - Performance tuning for real-time mesh updates

---

## Technical Considerations

### Performance
- Large terrains may have 1000x1000+ vertices
- Use `BufferGeometry` attribute updates, not recreation
- Consider partial updates for affected region only
- Debounce during rapid drag operations

### User Experience
- Match 2D behavior exactly for consistency
- Clear visual feedback of brush area
- Immediate response to adjustments
- Undo/redo support (if applicable)

### Edge Cases
- Clicks outside terrain bounds
- Camera angle making raycasting difficult
- Very steep terrain areas
- Brush extending beyond map edges

---

## State Atoms Used

From `frontend/src/data/tiles/tileAtoms.ts`:
- `CurrentTopologyBrushMode` - Circle or Square
- `CurrentTopologyValueMode` - SET, DELTA, or DELTA_WITH_DROPOFF
- `TopologyBrushRadius` - Brush size in tiles
- `TopologyValue` - Height value to apply
- `TileViewMode` - Must be Topology mode for editing

---

## Testing Checklist

- [ ] Circle brush applies correctly at all terrain positions
- [ ] Square brush applies correctly at all terrain positions
- [ ] SET_VALUE mode sets exact height
- [ ] DELTA_VALUE mode adds/subtracts uniformly
- [ ] DELTA_WITH_DROPOFF creates smooth falloff
- [ ] Brush visualization follows mouse accurately
- [ ] Preview shows expected height changes
- [ ] Camera controls disabled during editing
- [ ] Real-time mesh updates visible
- [ ] No performance issues with large terrains
- [ ] Edge cases handled (map boundaries, steep terrain)
- [ ] 2D and 3D editing produce identical results
