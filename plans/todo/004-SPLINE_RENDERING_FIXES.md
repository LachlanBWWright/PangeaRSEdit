# Spline Rendering Fixes (Circular vs Non-Circular)

## Overview

This plan addresses issues with spline rendering, particularly the problem where the last segment of a spline appears straight incorrectly. It also adds special handling for Billy Frontier's non-circular splines (like those in shootout levels) while maintaining the merged first/last nub behavior for circular splines in other games.

## Problem Statement

### Issue 1: Last Spline Segment Appears Straight

The current spline implementation has an issue where the final segment (connecting the last nub back to the first nub) renders as a straight line instead of following the proper cubic spline curve.

This happens because the spline baking algorithm in `spline.ts` iterates:
```typescript
for (let i = 0; i < numNubs - 1; i++) { ... }
```

This excludes the final segment that should loop back to the first point.

### Issue 2: Circular vs Non-Circular Splines

Most Pangea games use **circular splines** where:
- The first and last nubs are in identical positions
- The spline forms a closed loop
- The UI merges these into one visible control point

However, **Billy Frontier** has **non-circular (open) splines** where:
- The first and last nubs are at different positions
- The spline has distinct start and end points
- Both endpoints should be visible and editable

### Issue 3: First Nub Hidden in UI

Currently in `Spline.tsx`, the first nub is hidden:
```typescript
{nubs.map((nub, nubIdx) => {
  if (nubIdx === 0) return null;  // <-- Hidden!
  return <SplineNub ... />
})}
```

This works for circular splines but breaks editing for non-circular splines.

---

## Analysis

### How Circular Splines Work

In games like Otto Matic, Bugdom, etc.:
1. Splines form closed loops (enemy patrol paths, etc.)
2. `nubs[0]` and `nubs[nubs.length - 1]` have the same coordinates
3. When editing `nubs[nubs.length - 1]`, the code also updates `nubs[0]`
4. The visual shows one merged control point at this position

### How Billy Frontier Splines Differ

Billy Frontier has open splines for:
- Camera paths in shootout scenes
- Walker enemy patrol lines
- Stampede lanes

These splines:
1. Have distinct start and end positions
2. Should NOT have merged first/last nubs
3. Both endpoints need to be visible and independently editable

### Current Spline Nub Editing Logic

From `frontend/src/editor/subviews/splines/Spline.tsx`:

**onDragMove handler (lines 177-180):**
```typescript
//Modify "hidden" final nub, which is to be in the same position as the first nub
if (nubIdx === currentNubs.length - 1) {
  updatedNubs[0] = { x: newX, z: newZ };
}
```

**onDragEnd handler (lines 218-220):**
```typescript
//Modify "hidden" final nub, which is to be in the same position as the first nub
if (nubIdx === currentNubs.length - 1) {
  updatedNubs[0] = { x: newX, z: newZ };
}
```

This assumes all splines are circular, which is incorrect for Billy Frontier.

### Current Spline Rendering

**2D View** (`Spline.tsx`): Uses `getPoints()` from `utils/spline.ts` which doesn't handle open splines.

**3D View** (`SplineGeometry.tsx`):
```typescript
const curve = new CatmullRomCurve3(linePoints);
const geometry = new TubeGeometry(
  curve,
  Math.max(20, Math.min(100, linePoints.length * 2)),
  SPLINE_LINE_WIDTH / 2,
  4,
  false,  // <-- 'closed' parameter is always false
);
```
The closed parameter is hardcoded to `false`, which may cause the last segment to render incorrectly for circular splines.

---

## Phase 1: Detect Spline Type

### 1.1 Add Spline Type Detection

**File:** `frontend/src/data/splines/splineTypeDetection.ts`

```typescript
import { SplineNub, Spline } from "@/python/structSpecs/LevelTypes";
import { Game } from "@/data/globals/globals";

/**
 * Threshold for considering two points "the same" position
 * Small tolerance for floating point/rounding differences
 */
const POSITION_THRESHOLD = 5; // World units

export enum SplineType {
  CIRCULAR = "circular",       // First and last nub at same position
  OPEN = "open",              // First and last nub at different positions
}

/**
 * Detect if a spline is circular based on first/last nub positions
 */
export function detectSplineType(nubs: SplineNub[]): SplineType {
  if (nubs.length < 2) return SplineType.OPEN;
  
  const firstNub = nubs[0];
  const lastNub = nubs[nubs.length - 1];
  
  if (!firstNub || !lastNub) return SplineType.OPEN;
  
  const dx = Math.abs(firstNub.x - lastNub.x);
  const dz = Math.abs(firstNub.z - lastNub.z);
  
  if (dx < POSITION_THRESHOLD && dz < POSITION_THRESHOLD) {
    return SplineType.CIRCULAR;
  }
  
  return SplineType.OPEN;
}

/**
 * Check if a game typically uses non-circular splines
 * Billy Frontier is the primary case
 */
export function gameUsesNonCircularSplines(game: Game): boolean {
  return game === Game.BILLY_FRONTIER;
}

/**
 * Get effective spline type considering game defaults
 */
export function getEffectiveSplineType(
  nubs: SplineNub[],
  game: Game,
): SplineType {
  // Always detect based on actual nub positions
  // But for Billy Frontier, be more lenient about "open" classification
  const detected = detectSplineType(nubs);
  
  if (game === Game.BILLY_FRONTIER) {
    // Billy Frontier splines may be circular or open
    // Use detected value directly
    return detected;
  }
  
  // For other games, splines are typically intended to be circular
  // Even if positions don't exactly match, treat as circular
  return detected;
}
```

### 1.2 Add Spline Type to State

**File:** `frontend/src/data/splines/splineAtoms.ts`

```typescript
import { atom } from "jotai";
import { SplineType } from "./splineTypeDetection";

export const SelectedSpline = atom<number | null>(null);

/**
 * Cache of detected spline types
 * Key: splineIdx, Value: SplineType
 */
export const SplineTypesCache = atom<Map<number, SplineType>>(new Map());
```

---

## Phase 2: Fix Spline Baking Algorithm

### 2.1 Update Spline Point Generation

**File:** `frontend/src/utils/spline.ts`

The current issue is in how the final segment is calculated. For circular splines, we need to ensure the curve properly loops back.

```typescript
import { SplinePoint } from "@/python/structSpecs/LevelTypes";
import { SplineType } from "@/data/splines/splineTypeDetection";
import { calcQuickDistance } from "./distanceCalc";

/**
 * Generate spline points from nubs
 * @param nubs Control points
 * @param splineType Whether spline is circular or open
 */
export function getPoints(
  nubs: SplinePoint[],
  splineType: SplineType = SplineType.CIRCULAR,
): SplinePoint[] {
  if (nubs.length < 2) {
    return nubs.length === 1 ? [{ x: nubs[0].x, z: nubs[0].z }] : [];
  }
  
  const pointsPerSpan = calculatePointsPerSpan(nubs, splineType);
  return bakeSpline(nubs, pointsPerSpan, splineType);
}

/**
 * Calculate how many points each span should have
 */
function calculatePointsPerSpan(
  nubs: SplinePoint[],
  splineType: SplineType,
): number[] {
  const numSpans = splineType === SplineType.CIRCULAR 
    ? nubs.length  // Circular: includes segment from last to first
    : nubs.length - 1;  // Open: no wrap-around
  
  const pointsPerSpan = new Array<number>(numSpans);
  
  for (let i = 0; i < numSpans; i++) {
    const currentNub = nubs[i];
    const nextNub = nubs[(i + 1) % nubs.length];
    
    if (!currentNub || !nextNub) {
      pointsPerSpan[i] = 1;
      continue;
    }
    
    const distance = calcQuickDistance(
      currentNub.x, currentNub.z,
      nextNub.x, nextNub.z,
    );
    pointsPerSpan[i] = spanPoints(distance);
  }
  
  return pointsPerSpan;
}

export function spanPoints(distance: number): number {
  return Math.max(1, Math.round(3.0 * distance));
}

/**
 * Bake spline from nubs to interpolated points
 * 
 * For circular splines: Wraps around so last segment curves properly
 * For open splines: Standard cubic spline with natural boundary conditions
 */
export function bakeSpline(
  nubs: SplinePoint[],
  pointsPerSpan: number[],
  splineType: SplineType,
): SplinePoint[] {
  const numNubs = nubs.length;
  
  if (numNubs < 2) {
    return nubs.map(n => ({ x: n.x, z: n.z }));
  }
  
  // For circular splines, create a working array that wraps around
  const workingNubs = splineType === SplineType.CIRCULAR
    ? createCircularNubArray(nubs)
    : nubs;
  
  const workingNumNubs = workingNubs.length;
  
  // Allocate working arrays
  const space = initializeWorkingArrays(workingNumNubs);
  const { h0, h1, h2, h3, a, b, c, d } = space;
  
  // Copy control points
  for (let i = 0; i < workingNumNubs; i++) {
    const nub = workingNubs[i];
    if (nub && d[i]) d[i] = { x: nub.x, z: nub.z };
  }
  
  // Perform cubic spline calculations
  computeSplineCoefficients(space, workingNumNubs, splineType);
  
  // Generate output points
  const numSpans = splineType === SplineType.CIRCULAR ? numNubs : numNubs - 1;
  return generateSplinePoints(space, pointsPerSpan, numSpans);
}

/**
 * For circular splines, create array with phantom points for smooth wrap-around
 */
function createCircularNubArray(nubs: SplinePoint[]): SplinePoint[] {
  // Add phantom points before first and after last for proper wrapping
  const n = nubs.length;
  return [
    nubs[n - 1],  // Phantom: last point
    ...nubs,       // Original points
    nubs[0],       // Phantom: first point
  ];
}

function initializeWorkingArrays(numNubs: number) {
  const createArray = () => new Array(numNubs).fill(null).map(() => ({ x: 0, z: 0 }));
  return {
    h0: createArray(),
    h1: createArray(),
    h2: createArray(),
    h3: createArray(),
    a: createArray(),
    b: createArray(),
    c: createArray(),
    d: createArray(),
  };
}

function computeSplineCoefficients(
  space: ReturnType<typeof initializeWorkingArrays>,
  numNubs: number,
  splineType: SplineType,
): void {
  const { h0, h1, h2, h3, a, b, c, d } = space;
  
  // Standard cubic spline coefficient computation
  // (existing algorithm, adjusted for boundary conditions)
  
  // ... [rest of coefficient calculations]
  // Key change: For circular splines, use periodic boundary conditions
  // For open splines, use natural boundary conditions (second derivative = 0 at endpoints)
}

function generateSplinePoints(
  space: ReturnType<typeof initializeWorkingArrays>,
  pointsPerSpan: number[],
  numSpans: number,
): SplinePoint[] {
  const { a, b, c, d } = space;
  const points: SplinePoint[] = [];
  
  for (let span = 0; span < numSpans; span++) {
    // For circular splines with phantom points, offset by 1
    const idx = span;  // Adjust as needed
    
    const subdivisions = pointsPerSpan[span] ?? 1;
    const ai = a[idx], bi = b[idx], ci = c[idx], di = d[idx];
    
    if (!ai || !bi || !ci || !di) continue;
    
    for (let spanPoint = 0; spanPoint < subdivisions; spanPoint++) {
      const t = spanPoint / subdivisions;
      points.push({
        x: ((ai.x * t + bi.x) * t + ci.x) * t + di.x,
        z: ((ai.z * t + bi.z) * t + ci.z) * t + di.z,
      });
    }
  }
  
  // Don't add final nub point for circular splines (it would duplicate the start)
  
  return points;
}
```

---

## Phase 3: Update UI for Spline Type

### 3.1 Update Spline Component

**File:** `frontend/src/editor/subviews/splines/Spline.tsx`

```typescript
import { detectSplineType, SplineType } from "@/data/splines/splineTypeDetection";

export const Spline = memo(({ splineData, setSplineData, splineIdx }) => {
  const globals = useAtomValue(Globals);
  const nubs = selectSplineNubs(splineData, SPLINE_KEY_BASE + splineIdx);
  
  // Detect spline type
  const splineType = useMemo(
    () => detectSplineType(nubs),
    [nubs]
  );
  
  const isCircular = splineType === SplineType.CIRCULAR;
  
  return (
    <>
      <Line points={points} /* ... */ />
      
      {/* Render nubs based on spline type */}
      {nubs.map((nub, nubIdx) => {
        // For circular splines: hide nub 0 (merged with last)
        // For open splines: show all nubs
        if (isCircular && nubIdx === 0) return null;
        
        return (
          <SplineNub
            key={nubIdx}
            nub={nub}
            nubIdx={nubIdx}
            splineIdx={splineIdx}
            splineType={splineType}
            setSplineData={setSplineData}
          />
        );
      })}
      
      {/* Show indicator for circular vs open */}
      {!isCircular && (
        <>
          <StartEndpointMarker nub={nubs[0]} label="Start" />
          <StartEndpointMarker nub={nubs[nubs.length - 1]} label="End" />
        </>
      )}
      
      {items.map(/* ... */)}
    </>
  );
});
```

### 3.2 Update SplineNub Editing

```typescript
const SplineNub = memo(({
  nub,
  nubIdx,
  splineIdx,
  splineType,
  setSplineData,
}) => {
  const isCircular = splineType === SplineType.CIRCULAR;
  
  const handleDragMove = (e) => {
    const newX = Math.round(e.target.x());
    const newZ = Math.round(e.target.y());
    
    setSplineData((draft) => {
      const currentNubs = draft.SpNb?.[SPLINE_KEY_BASE + splineIdx]?.obj || [];
      const updatedNubs = [...currentNubs];
      updatedNubs[nubIdx] = { x: newX, z: newZ };
      
      // Only sync first/last for circular splines
      if (isCircular) {
        if (nubIdx === currentNubs.length - 1) {
          updatedNubs[0] = { x: newX, z: newZ };
        } else if (nubIdx === 0) {
          updatedNubs[currentNubs.length - 1] = { x: newX, z: newZ };
        }
      }
      
      // Update draft
      const spNb = draft.SpNb?.[SPLINE_KEY_BASE + splineIdx];
      if (spNb) spNb.obj = updatedNubs;
      
      // Recalculate spline points
      const newPoints = getPoints(updatedNubs, splineType);
      const spPt = draft.SpPt?.[SPLINE_KEY_BASE + splineIdx];
      if (spPt) spPt.obj = newPoints;
      
      const spln = draft.Spln?.[1000]?.obj?.[SPLINE_KEY_BASE + splineIdx];
      if (spln) {
        spln.numNubs = updatedNubs.length;
        spln.numPoints = newPoints.length;
      }
    });
  };
  
  return (
    <Circle
      x={nub.x}
      y={nub.z}
      radius={10}
      draggable
      fill={/* color based on position */}
      onDragMove={handleDragMove}
      onDragEnd={/* similar logic */}
    />
  );
});
```

### 3.3 Add Start/End Endpoint Markers for Open Splines

```typescript
const StartEndpointMarker: React.FC<{ nub: SplineNub; label: string }> = ({
  nub,
  label,
}) => (
  <Group>
    <Circle
      x={nub.x}
      y={nub.z}
      radius={15}
      stroke={label === "Start" ? "#00ff00" : "#ff0000"}
      strokeWidth={3}
      fill="transparent"
    />
    <Text
      x={nub.x + 20}
      y={nub.z - 10}
      text={label}
      fill={label === "Start" ? "#00ff00" : "#ff0000"}
      fontSize={12}
    />
  </Group>
);
```

---

## Phase 4: Update 3D Spline Rendering

### 4.1 Fix SplineGeometry.tsx

**File:** `frontend/src/editor/threejs/SplineGeometry.tsx`

```typescript
import { detectSplineType, SplineType } from "@/data/splines/splineTypeDetection";
import { getPoints } from "@/utils/spline";

export const SplineGeometry: React.FC<SplineGeometryProps> = ({
  splineData,
  headerData,
  terrainData,
}) => {
  const globals = useAtomValue(Globals);
  const splines = splineData.Spln?.[1000]?.obj;
  
  const splineGroup = useMemo(() => {
    if (!splines) return [];
    const group: React.ReactElement[] = [];
    const scale = globals.TILE_INGAME_SIZE / globals.TILE_SIZE;
    
    splines.forEach((_, splineIdx) => {
      const nubsKey = 1000 + splineIdx;
      const nubsData = splineData.SpNb?.[nubsKey];
      
      if (!nubsData?.obj || nubsData.obj.length < 2) return;
      
      const nubs = nubsData.obj;
      const splineType = detectSplineType(nubs);
      
      // Generate points using correct spline type
      const splinePoints = getPoints(nubs, splineType);
      
      // Convert to 3D points with terrain height
      const linePoints: Vector3[] = splinePoints.map(point => {
        const worldX = point.x * scale;
        const worldZ = point.z * scale;
        const terrainY = getTerrainHeightAtPoint(
          point.x, point.z,
          headerData, terrainData, globals
        );
        return new Vector3(worldX, terrainY + SPLINE_HEIGHT_ABOVE_TERRAIN, worldZ);
      });
      
      // For circular splines, close the loop
      if (splineType === SplineType.CIRCULAR && linePoints.length > 0) {
        linePoints.push(linePoints[0].clone());
      }
      
      // Create curve and geometry
      const curve = new CatmullRomCurve3(linePoints, splineType === SplineType.CIRCULAR);
      const geometry = new TubeGeometry(curve, /* ... */);
      
      group.push(
        <mesh key={`spline-${splineIdx}`} geometry={geometry}>
          <meshStandardMaterial color={0x6dd5ed} emissive={0x2c3e50} />
        </mesh>
      );
      
      // Add direction arrows at nubs
      // ... existing arrow rendering code
    });
    
    return group;
  }, [splines, splineData, headerData, terrainData, globals]);
  
  return <group name="splines">{splineGroup}</group>;
};
```

---

## Phase 5: Spline Menu Updates

### 5.1 Show Spline Type in Menu

**File:** `frontend/src/editor/subviews/splines/SplineMenu.tsx`

```typescript
import { detectSplineType, SplineType } from "@/data/splines/splineTypeDetection";

export function SplineMenu({ splineData, setSplineData }) {
  const globals = useAtomValue(Globals);
  const selectedSpline = useAtomValue(SelectedSpline);
  
  // Get current spline type
  const splineType = useMemo(() => {
    if (selectedSpline === null) return null;
    const nubs = selectSplineNubs(splineData, SPLINE_KEY_BASE + selectedSpline);
    return detectSplineType(nubs);
  }, [splineData, selectedSpline]);
  
  return (
    <div>
      {/* Spline list */}
      {splines.map((spline, idx) => {
        const nubs = selectSplineNubs(splineData, SPLINE_KEY_BASE + idx);
        const type = detectSplineType(nubs);
        
        return (
          <div key={idx}>
            <span>Spline {idx}</span>
            <Badge variant={type === SplineType.CIRCULAR ? "default" : "secondary"}>
              {type}
            </Badge>
          </div>
        );
      })}
      
      {/* Spline type toggle (Billy Frontier only) */}
      {globals.GAME_TYPE === Game.BILLY_FRONTIER && selectedSpline !== null && (
        <div>
          <label>Spline Type</label>
          <select
            value={splineType}
            onChange={(e) => handleSplineTypeChange(e.target.value as SplineType)}
          >
            <option value={SplineType.CIRCULAR}>Circular (Loop)</option>
            <option value={SplineType.OPEN}>Open (Linear)</option>
          </select>
        </div>
      )}
    </div>
  );
}
```

### 5.2 Convert Between Spline Types

```typescript
/**
 * Convert a spline from circular to open or vice versa
 */
export function convertSplineType(
  nubs: SplineNub[],
  targetType: SplineType,
): SplineNub[] {
  const currentType = detectSplineType(nubs);
  
  if (currentType === targetType) return nubs;
  
  if (targetType === SplineType.CIRCULAR) {
    // Add duplicate of first nub at end
    return [...nubs, { x: nubs[0].x, z: nubs[0].z }];
  } else {
    // Remove duplicate last nub if present
    const last = nubs[nubs.length - 1];
    const first = nubs[0];
    if (Math.abs(last.x - first.x) < 5 && Math.abs(last.z - first.z) < 5) {
      return nubs.slice(0, -1);
    }
    return nubs;
  }
}
```

---

## File Summary

### New Files to Create

```
frontend/src/data/splines/
└── splineTypeDetection.ts     # Spline type detection utilities
```

### Files to Modify

```
frontend/src/utils/spline.ts
  - Fix cubic spline algorithm for circular/open types
  - Add proper boundary conditions

frontend/src/editor/subviews/splines/Spline.tsx
  - Update nub visibility based on spline type
  - Update editing logic for non-circular splines
  - Add endpoint markers for open splines

frontend/src/editor/subviews/splines/splineUtils.ts
  - Pass spline type to getPoints()

frontend/src/editor/threejs/SplineGeometry.tsx
  - Fix 3D rendering for both spline types
  - Properly close circular splines

frontend/src/editor/subviews/splines/SplineMenu.tsx
  - Show spline type indicator
  - Add type toggle for Billy Frontier

frontend/src/data/splines/splineAtoms.ts
  - Add spline type cache atom
```

---

## Implementation Order

1. **Phase 1**: Spline type detection (2 hours)
2. **Phase 2**: Fix spline baking algorithm (4 hours)
3. **Phase 3**: Update 2D UI (3 hours)
4. **Phase 4**: Update 3D rendering (2 hours)
5. **Phase 5**: Menu updates (1 hour)

**Total estimated effort**: 12 hours

---

## Testing Strategy

1. **Unit tests** for spline type detection
2. **Unit tests** for spline point generation (both types)
3. **Visual tests** comparing rendered splines to expected curves
4. **Game-specific tests**:
   - Otto Matic circular splines
   - Billy Frontier open splines
   - Mixed scenarios

### Test Cases

```typescript
describe("Spline Type Detection", () => {
  it("detects circular spline when first/last nubs match", () => {
    const nubs = [
      { x: 100, z: 100 },
      { x: 200, z: 100 },
      { x: 200, z: 200 },
      { x: 100, z: 100 },  // Same as first
    ];
    expect(detectSplineType(nubs)).toBe(SplineType.CIRCULAR);
  });
  
  it("detects open spline when first/last nubs differ", () => {
    const nubs = [
      { x: 100, z: 100 },
      { x: 200, z: 100 },
      { x: 300, z: 100 },  // Different from first
    ];
    expect(detectSplineType(nubs)).toBe(SplineType.OPEN);
  });
});

describe("Spline Rendering", () => {
  it("circular spline has smooth final segment", () => {
    const nubs = generateCircularNubs();
    const points = getPoints(nubs, SplineType.CIRCULAR);
    
    // Final segment should curve, not be straight
    const secondToLastPoint = points[points.length - 2];
    const lastPoint = points[points.length - 1];
    const firstPoint = points[0];
    
    // Verify curvature by checking midpoint isn't on straight line
    // ...
  });
});
```

---

## Risk Assessment

### High Risk
- Breaking existing spline editing for circular splines
- Algorithm changes could affect level data accuracy

### Medium Risk
- Performance impact of spline type detection
- Edge cases with very short splines (< 3 nubs)

### Low Risk
- UI changes are isolated to spline components
- Detection is purely visual, doesn't change stored data

---

## Success Criteria

1. Circular splines render with smooth final segment
2. Billy Frontier open splines display correctly with distinct endpoints
3. Editing circular splines still merges first/last nubs
4. Editing open splines allows independent endpoint movement
5. No regression in existing spline functionality
6. Level data remains compatible (no format changes)
