# Bugdom 1 Roof Terrain (YCrd 1001) Implementation Plan

## Overview

This plan outlines the implementation of roof terrain editing for Bugdom 1, which uses `YCrd[1001]` for ceiling/roof height data alongside `YCrd[1000]` for floor height data. The implementation will support both the topology editor and 3D view, with features for synchronized and independent editing.

---

## Current State Analysis

### Existing Infrastructure

The codebase already has partial roof support:

| Component | File | Status |
|-----------|------|--------|
| State atoms | `src/editor/atoms/tileAtoms.ts` | Exists: `ShowRoofInTopology`, `EditRoofAndFloorTogether`, `RoofFloorElevation` |
| Dual brush function | `src/editor/utils/topologyBrushUtils.ts` | Exists: `applyDualTopologyBrush()` |
| Roof 3D geometry | `src/editor/threejs/RoofGeometry.tsx` | Exists but needs verification |
| UI controls | `src/editor/subviews/tiles/TilesMenu.tsx` | Basic toggle exists |

### Data Structure

```typescript
YCrd: {
  1000: { name: "Floor Y Coords", obj: number[] },  // Always present
  1001?: { name: "Roof Y Coords", obj: number[] },  // Optional, Bugdom 1 only
}
```

Both arrays have size `(mapWidth + 1) * (mapHeight + 1)`.

---

## Implementation Plan

### Phase 1: Independent Roof Editing Mode

**Goal:** Allow users to edit the roof independently from the floor.

#### 1.1 Add Editing Target State

**File:** `src/editor/atoms/tileAtoms.ts`

```typescript
export enum TopologyEditTarget {
  FLOOR = 'floor',
  ROOF = 'roof',
  BOTH = 'both',
}

export const TopologyEditTargetAtom = atom<TopologyEditTarget>(TopologyEditTarget.FLOOR);
```

#### 1.2 Update Topology Brush Application

**File:** `src/editor/utils/topologyBrushUtils.ts`

Create a new function that respects the editing target:

```typescript
export function applyTopologyBrushWithTarget(
  floorArray: number[],
  roofArray: number[] | undefined,
  pixels: PixelType[],
  params: BrushParams,
  target: TopologyEditTarget,
  centerElevation?: number
): void {
  switch (target) {
    case TopologyEditTarget.FLOOR:
      applyTopologyBrush(floorArray, pixels, params);
      break;
    case TopologyEditTarget.ROOF:
      if (roofArray) {
        applyTopologyBrush(roofArray, pixels, params);
      }
      break;
    case TopologyEditTarget.BOTH:
      applyDualTopologyBrush(floorArray, roofArray, pixels, params, centerElevation ?? 0);
      break;
  }
}
```

#### 1.3 Update 3D Editor Integration

**File:** `src/editor/threejs/Three.tsx`

Modify the pointer event handlers (around lines 214-272) to:
1. Read the `TopologyEditTargetAtom` state
2. Call `applyTopologyBrushWithTarget()` instead of separate floor/roof functions
3. Update the appropriate geometry (floor, roof, or both)

---

### Phase 2: Floor-Roof Constraint Enforcement

**Goal:** Prevent floor from exceeding roof height at any point.

#### 2.1 Create Constraint Validation Utility

**File:** `src/editor/utils/topologyBrushUtils.ts`

```typescript
export const MIN_ROOF_FLOOR_DISTANCE = 10; // Already exists

export function enforceFloorRoofConstraint(
  floorArray: number[],
  roofArray: number[],
  affectedIndices: number[]
): { floorChanges: number[], roofChanges: number[] } {
  const floorChanges: number[] = [];
  const roofChanges: number[] = [];

  for (const idx of affectedIndices) {
    const floor = floorArray[idx];
    const roof = roofArray[idx];

    if (floor + MIN_ROOF_FLOOR_DISTANCE > roof) {
      // Constraint violated - adjust roof upward
      roofArray[idx] = floor + MIN_ROOF_FLOOR_DISTANCE;
      roofChanges.push(idx);
    }
  }

  return { floorChanges, roofChanges };
}

export function enforceRoofFloorConstraint(
  floorArray: number[],
  roofArray: number[],
  affectedIndices: number[]
): { floorChanges: number[], roofChanges: number[] } {
  const floorChanges: number[] = [];
  const roofChanges: number[] = [];

  for (const idx of affectedIndices) {
    const floor = floorArray[idx];
    const roof = roofArray[idx];

    if (roof - MIN_ROOF_FLOOR_DISTANCE < floor) {
      // Constraint violated - adjust floor downward
      floorArray[idx] = roof - MIN_ROOF_FLOOR_DISTANCE;
      floorChanges.push(idx);
    }
  }

  return { floorChanges, roofChanges };
}
```

#### 2.2 Add Constraint Mode Setting

**File:** `src/editor/atoms/tileAtoms.ts`

```typescript
export enum ConstraintMode {
  PUSH_ROOF = 'push_roof',    // When floor rises, push roof up if needed
  PUSH_FLOOR = 'push_floor',  // When roof lowers, push floor down if needed
  BLOCK = 'block',            // Prevent edits that would violate constraint
}

export const TopologyConstraintModeAtom = atom<ConstraintMode>(ConstraintMode.PUSH_ROOF);
```

#### 2.3 Integrate Constraints into Brush Application

Modify `applyTopologyBrushWithTarget()` to:
1. Apply the brush to the target layer
2. Check for constraint violations
3. Apply the selected constraint resolution strategy
4. Return list of all modified indices (for geometry updates)

---

### Phase 3: Equal Distance Mode (Symmetric Editing)

**Goal:** Edit floor and roof to maintain equal distances from a center elevation.

#### 3.1 Enhance Dual Brush Function

**File:** `src/editor/utils/topologyBrushUtils.ts`

The existing `applyDualTopologyBrush()` already supports center elevation. Enhance it:

```typescript
export function applySymmetricTopologyBrush(
  floorArray: number[],
  roofArray: number[],
  pixels: PixelType[],
  params: BrushParams,
  centerElevation: number,
  maintainSymmetry: boolean = true
): void {
  for (const pixel of pixels) {
    const idx = flattenCoords(pixel.x, pixel.z, params.mapWidth);

    const currentFloor = floorArray[idx];
    const currentRoof = roofArray[idx];
    const currentCenter = (currentFloor + currentRoof) / 2;
    const currentDistance = (currentRoof - currentFloor) / 2;

    let newCenter: number;

    switch (params.valueMode) {
      case TopologyValueMode.SET_VALUE:
        newCenter = params.value;
        break;
      case TopologyValueMode.DELTA_VALUE:
        newCenter = currentCenter + params.value;
        break;
      case TopologyValueMode.DELTA_WITH_DROPOFF:
        const falloff = 1 - pixel.distance;
        newCenter = currentCenter + params.value * falloff;
        break;
    }

    if (maintainSymmetry) {
      // Keep same distance from center
      floorArray[idx] = clampInt16(newCenter - currentDistance);
      roofArray[idx] = clampInt16(newCenter + currentDistance);
    } else {
      // Use fixed distance from specified center elevation
      const floorDist = centerElevation - currentFloor;
      const roofDist = currentRoof - centerElevation;
      floorArray[idx] = clampInt16(newCenter - floorDist);
      roofArray[idx] = clampInt16(newCenter + roofDist);
    }

    // Enforce minimum distance
    if (roofArray[idx] - floorArray[idx] < MIN_ROOF_FLOOR_DISTANCE) {
      const mid = (floorArray[idx] + roofArray[idx]) / 2;
      floorArray[idx] = clampInt16(mid - MIN_ROOF_FLOOR_DISTANCE / 2);
      roofArray[idx] = clampInt16(mid + MIN_ROOF_FLOOR_DISTANCE / 2);
    }
  }
}
```

---

### Phase 4: UI Controls

**Goal:** Provide intuitive controls for all roof editing features.

#### 4.1 Roof Editing Panel

**File:** `src/editor/subviews/tiles/TilesMenu.tsx`

Add a dedicated roof editing section (after line 259):

```tsx
{/* Roof Editing Controls */}
{hasRoofData && (
  <div className="col-span-2 mt-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
    <h4 className="text-sm font-semibold mb-3 text-blue-400">Roof Editing (YCrd 1001)</h4>

    {/* Visibility Toggle */}
    <div className="flex items-center justify-between mb-3">
      <span>Show Roof in 3D View</span>
      <Switch checked={showRoof} onCheckedChange={setShowRoof} />
    </div>

    {/* Edit Target Selection */}
    <div className="mb-3">
      <label className="block text-sm mb-1">Edit Target</label>
      <Select value={editTarget} onValueChange={setEditTarget}>
        <SelectItem value="floor">Floor Only</SelectItem>
        <SelectItem value="roof">Roof Only</SelectItem>
        <SelectItem value="both">Both (Symmetric)</SelectItem>
      </Select>
    </div>

    {/* Symmetric Editing Options */}
    {editTarget === 'both' && (
      <>
        <div className="mb-3">
          <label className="block text-sm mb-1">Center Elevation</label>
          <Input
            type="number"
            value={centerElevation}
            onChange={(e) => setCenterElevation(Number(e.target.value))}
          />
          <p className="text-xs text-gray-500 mt-1">
            Floor and roof will maintain equal distance from this point
          </p>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm">Maintain Current Distances</span>
          <Switch checked={maintainSymmetry} onCheckedChange={setMaintainSymmetry} />
        </div>
      </>
    )}

    {/* Constraint Mode */}
    {editTarget !== 'both' && (
      <div className="mb-3">
        <label className="block text-sm mb-1">When Constraint Violated</label>
        <Select value={constraintMode} onValueChange={setConstraintMode}>
          <SelectItem value="push_roof">Push Roof Up</SelectItem>
          <SelectItem value="push_floor">Push Floor Down</SelectItem>
          <SelectItem value="block">Block Edit</SelectItem>
        </Select>
        <p className="text-xs text-gray-500 mt-1">
          Floor must be at least {MIN_ROOF_FLOOR_DISTANCE} units below roof
        </p>
      </div>
    )}
  </div>
)}
```

#### 4.2 Visual Indicator for Constraint Violations

Add visual feedback when edits would cause constraint issues:

**File:** `src/editor/threejs/TopologyBrush3D.tsx`

```tsx
// Change brush color when hovering over constrained area
const brushColor = useMemo(() => {
  if (wouldViolateConstraint) return 0xff4444; // Red warning
  return 0x00ff00; // Normal green
}, [wouldViolateConstraint]);
```

---

### Phase 5: 3D View Enhancements

**Goal:** Improve roof visualization in the 3D view.

#### 5.1 Roof Rendering Options

**File:** `src/editor/threejs/RoofGeometry.tsx`

Add configurable rendering options:

```tsx
interface RoofGeometryProps {
  terrainData: TerrainData;
  opacity?: number;
  wireframe?: boolean;
  color?: string;
  showWhenEditing?: boolean;
}

export function RoofGeometry({
  terrainData,
  opacity = 0.7,
  wireframe = false,
  color = '#88ccff',
  showWhenEditing = true,
}: RoofGeometryProps) {
  // Existing geometry creation...

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color={color}
        transparent
        opacity={opacity}
        wireframe={wireframe}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}
```

#### 5.2 Floor-Roof Distance Visualization

**File:** `src/editor/threejs/FloorRoofDistanceViz.tsx` (new file)

Create a visualization showing the distance between floor and roof:

```tsx
export function FloorRoofDistanceViz({
  floorData,
  roofData,
  mapWidth,
  mapHeight,
  showViolations = true,
}) {
  // Render vertical lines at each vertex showing floor-roof distance
  // Highlight in red where distance < MIN_ROOF_FLOOR_DISTANCE
}
```

---

### Phase 6: Roof Data Initialization

**Goal:** Support creating roof data for levels that don't have it.

#### 6.1 Roof Creation Utility

**File:** `src/editor/utils/roofDataUtils.ts` (new file)

```typescript
export function createRoofDataFromFloor(
  floorData: number[],
  defaultOffset: number = 100
): number[] {
  return floorData.map(floor => floor + defaultOffset);
}

export function createFlatRoof(
  size: number,
  elevation: number = 500
): number[] {
  return new Array(size).fill(elevation);
}

export function copyFloorToRoof(
  terrainData: TerrainData,
  offset: number
): TerrainData {
  const floorData = terrainData.YCrd[1000].obj;
  const newRoofData = floorData.map(v => v + offset);

  return {
    ...terrainData,
    YCrd: {
      ...terrainData.YCrd,
      1001: {
        name: 'Roof Y Coords',
        obj: newRoofData,
        order: terrainData.YCrd[1000].order + 1,
      },
    },
  };
}
```

#### 6.2 Add "Create Roof" Button

**File:** `src/editor/subviews/tiles/TilesMenu.tsx`

```tsx
{!hasRoofData && isBugdom1 && (
  <Button
    onClick={() => {
      const newTerrain = copyFloorToRoof(terrainData, 100);
      setTerrainData(newTerrain);
    }}
  >
    Create Roof Layer (YCrd 1001)
  </Button>
)}
```

---

### Phase 7: Undo/Redo Support

**Goal:** Ensure roof edits are properly tracked in undo history.

#### 7.1 Update History Tracking

The existing undo/redo system should already track `terrainData` changes. Verify that:

1. Both `YCrd[1000]` and `YCrd[1001]` are included in state snapshots
2. Constraint enforcement changes are captured as single undo steps
3. "Both" mode edits create single undo entries for floor+roof changes

**File:** Review `src/editor/hooks/useUndoRedo.ts` or similar history management

---

## Implementation Order

1. **Phase 2** - Floor-Roof Constraint Enforcement (foundation for all other features)
2. **Phase 1** - Independent Roof Editing Mode
3. **Phase 3** - Equal Distance Mode
4. **Phase 4** - UI Controls
5. **Phase 5** - 3D View Enhancements
6. **Phase 6** - Roof Data Initialization
7. **Phase 7** - Undo/Redo Verification

---

## Testing Checklist

### Constraint Enforcement
- [ ] Floor cannot be raised above roof minus minimum distance
- [ ] Roof cannot be lowered below floor plus minimum distance
- [ ] "Push" modes correctly adjust the other layer
- [ ] "Block" mode prevents constraint-violating edits

### Independent Editing
- [ ] Floor-only edits don't affect roof
- [ ] Roof-only edits don't affect floor
- [ ] Correct geometry updates for each mode

### Symmetric Editing
- [ ] Both layers move together
- [ ] Center elevation is respected
- [ ] Distance is maintained when "maintain symmetry" is enabled
- [ ] Minimum distance is always enforced

### 3D Visualization
- [ ] Roof renders correctly with configurable opacity
- [ ] Real-time updates during brush strokes
- [ ] Distance visualization shows correct values
- [ ] Constraint violation warnings appear correctly

### Data Integrity
- [ ] Saved levels load correctly with roof data
- [ ] New roof creation produces valid data
- [ ] Undo/redo works for all roof operations

---

## File Summary

| File | Changes |
|------|---------|
| `src/editor/atoms/tileAtoms.ts` | Add `TopologyEditTarget`, `ConstraintMode` enums and atoms |
| `src/editor/utils/topologyBrushUtils.ts` | Add constraint enforcement, symmetric brush, unified brush function |
| `src/editor/utils/roofDataUtils.ts` | New file for roof creation utilities |
| `src/editor/subviews/tiles/TilesMenu.tsx` | Expanded roof editing UI controls |
| `src/editor/threejs/Three.tsx` | Integrate new brush system with edit targets |
| `src/editor/threejs/RoofGeometry.tsx` | Configurable rendering options |
| `src/editor/threejs/TopologyBrush3D.tsx` | Constraint violation visual feedback |
| `src/editor/threejs/FloorRoofDistanceViz.tsx` | New visualization component |
