# Spline Fixes Plan

## Overview

This plan addresses issues with spline rendering in the editor, specifically:
1. The last line segment of a spline appears straight instead of curved
2. Most games use "circular" splines where the first and last nubs are identical
3. Billy Frontier has non-circular splines (shootout levels) that need special handling

---

## Current State Analysis

### Existing Infrastructure

| Component | File | Purpose |
|-----------|------|--------|
| Spline component | `src/editor/subviews/splines/Spline.tsx` | 2D spline rendering |
| Spline utilities | `src/editor/subviews/splines/splineUtils.ts` | Nub/point management |
| Spline math | `src/utils/spline.ts` | Cubic spline interpolation |
| 3D Spline | `src/editor/threejs/SplineGeometry.tsx` | 3D spline rendering |

### Current Behavior

```typescript
// Spline.tsx - line 106-116
{nubs.map((nub, nubIdx) => {
  if (nubIdx === 0) return null; // First nub is hidden (merged with last)
  return (
    <SplineNub
      key={nubIdx}
      nub={nub}
      nubIdx={nubIdx}
      splineIdx={splineIdx}
      setSplineData={setSplineData}
    />
  );
})}
```

### The Problem

1. **Last segment is straight**: The `bakeSpline` function in `spline.ts` calculates points for `numNubs - 1` spans, but doesn't properly interpolate the final segment back to the start for circular splines.

2. **Circular assumption**: The code assumes all splines are circular (first nub === last nub), which is true for most games but not Billy Frontier's shootout levels.

3. **Hidden first nub**: The first nub is always hidden, assuming it's merged with the last. This breaks for non-circular splines.

---

## Root Cause Analysis

### Spline Math Issue

In `src/utils/spline.ts`, the `bakeSpline` function:

```typescript
// Line 194 - Loop only goes to numNubs - 1
for (let i = 0; i < numNubs - 1; i++) {
  // ... calculate span points
}
```

For a circular spline with N nubs (where nub[0] === nub[N-1]):
- We have N-1 spans: 0→1, 1→2, ..., (N-2)→(N-1)
- The span (N-1)→0 should wrap back to start, but it's not calculated

### Billy Frontier Non-Circular Splines

Looking at the Billy Frontier shootout levels:
- Enemy paths have defined start and end points
- Camera paths are linear, not circular
- The first and last nubs are distinct positions

---

## Implementation Plan

### Phase 1: Fix Circular Spline Last Segment

#### 1.1 Update Spline Baking Logic

**File:** `src/utils/spline.ts` (modified)

```typescript
export interface SplineOptions {
  /** If true, the spline wraps from last nub back to first */
  circular: boolean;
  /** Points per unit distance for interpolation */
  pointsPerUnitDistance?: number;
}

const DEFAULT_OPTIONS: SplineOptions = {
  circular: true,
  pointsPerUnitDistance: 3.0,
};

export function getPoints(
  nubs: SplinePoint[],
  options: SplineOptions = DEFAULT_OPTIONS
): SplinePoint[] {
  if (nubs.length < 2) {
    return nubs.map(n => ({ x: n.x, z: n.z }));
  }

  // For circular splines, append first nub to end to close the loop
  const workingNubs = options.circular
    ? [...nubs, nubs[0]!] // Add first nub at end
    : nubs;

  const pointsPerSpan = new Array<number>(workingNubs.length);

  for (let i = 0; i < workingNubs.length - 1; i++) {
    const currentNub = workingNubs[i];
    const nextNub = workingNubs[i + 1];
    if (!currentNub || !nextNub) continue;
    
    const distance = calcQuickDistance(
      currentNub.x,
      currentNub.z,
      nextNub.x,
      nextNub.z,
    );
    pointsPerSpan[i] = spanPoints(distance, options.pointsPerUnitDistance);
  }

  return bakeSpline(workingNubs, pointsPerSpan, options.circular);
}

export function bakeSpline(
  nubs: SplinePoint[],
  pointsPerSpan: number[],
  circular: boolean = true
): SplinePoint[] {
  const numNubs = nubs.length;
  
  if (numNubs < 2) {
    return nubs.map(n => ({ x: n.x, z: n.z }));
  }

  // Allocate 2D array for calculations
  const space: SplinePoint[][] = [];
  for (let i = 0; i < 8; i++) {
    const row: SplinePoint[] = [];
    for (let j = 0; j < numNubs; j++) {
      row.push({ x: 0, z: 0 });
    }
    space.push(row);
  }

  // ... (existing calculation code)

  // Calculate total points needed
  let maxPoints = 0;
  for (let i = 0; i < numNubs - 1; i++) {
    maxPoints += pointsPerSpan[i] ?? 0;
  }

  const points = new Array<SplinePoint>(maxPoints);
  for (let i = 0; i < maxPoints; i++) {
    points[i] = { x: 0, z: 0 };
  }

  // ... (existing coefficient calculations)

  // Calculate spline points for all spans including wrap-around
  let numPoints = 0;
  for (let i = 0; i < numNubs - 1; i++) {
    const subdivisions = pointsPerSpan[i] ?? 0;
    const ai = a[i];
    const bi = b[i];
    const ci = c[i];
    const di = d[i];
    
    if (!ai || !bi || !ci || !di) continue;

    for (let spanPoint = 0; spanPoint < subdivisions; spanPoint++) {
      const t = spanPoint / subdivisions;
      const point = points[numPoints];
      if (!point) continue;
      point.x = ((ai.x * t + bi.x) * t + ci.x) * t + di.x;
      point.z = ((ai.z * t + bi.z) * t + ci.z) * t + di.z;
      numPoints++;
    }
  }

  // For non-circular splines, add the final nub as the last point
  if (!circular) {
    const lastNub = nubs[numNubs - 1];
    if (lastNub && numPoints < maxPoints) {
      const lastPoint = points[numPoints];
      if (lastPoint) {
        lastPoint.x = lastNub.x;
        lastPoint.z = lastNub.z;
        numPoints++;
      }
    }
  }

  return points.slice(0, numPoints);
}
```

### Phase 2: Detect Circular vs Non-Circular Splines

#### 2.1 Spline Metadata

**File:** `src/data/splines/splineTypes.ts`

```typescript
export interface SplineMetadata {
  /** Unique identifier for the spline */
  splineIdx: number;
  
  /** True if first and last nubs are at the same position */
  isCircular: boolean;
  
  /** Distance threshold for considering nubs as "same position" */
  circularThreshold: number;
  
  /** Game-specific spline type (e.g., enemy path, camera path) */
  splineType?: string;
}

/**
 * Check if a spline is circular based on first/last nub positions
 */
export function isSplineCircular(
  nubs: SplinePoint[],
  threshold: number = 1.0
): boolean {
  if (nubs.length < 2) return false;
  
  const first = nubs[0];
  const last = nubs[nubs.length - 1];
  
  if (!first || !last) return false;
  
  const dx = Math.abs(first.x - last.x);
  const dz = Math.abs(first.z - last.z);
  
  return dx <= threshold && dz <= threshold;
}
```

#### 2.2 Game-Specific Spline Detection

**File:** `src/data/splines/splineDetection.ts`

```typescript
import { Game } from '@/data/globals/globals';
import { SplinePoint } from '@/python/structSpecs/LevelTypes';
import { isSplineCircular } from './splineTypes';

/**
 * Determine if a spline should be treated as circular based on game and data
 */
export function shouldTreatAsCircular(
  game: Game,
  nubs: SplinePoint[],
  splineType?: number
): boolean {
  // Billy Frontier special case: shootout level splines are non-circular
  if (game === Game.BILLY_FRONTIER) {
    // Check nub positions - if they're clearly different, it's non-circular
    if (!isSplineCircular(nubs, 5.0)) {
      return false;
    }
    // If spline type indicates a camera or path, check more strictly
    // These might be linear paths even with close endpoints
  }

  // Most games: check if first/last nubs match
  return isSplineCircular(nubs, 1.0);
}

/**
 * Get spline rendering options based on game and spline data
 */
export function getSplineRenderOptions(
  game: Game,
  nubs: SplinePoint[]
): { circular: boolean; showEndpoints: boolean } {
  const circular = shouldTreatAsCircular(game, nubs);
  
  return {
    circular,
    // Show distinct endpoints for non-circular splines
    showEndpoints: !circular,
  };
}
```

### Phase 3: Update Spline UI Component

#### 3.1 Modified Spline Component

**File:** `src/editor/subviews/splines/Spline.tsx` (modified)

```typescript
import { getSplineRenderOptions } from '@/data/splines/splineDetection';

export const Spline = memo(
  ({
    splineData,
    setSplineData,
    splineIdx,
  }: {
    splineData: SplineData;
    setSplineData: Updater<SplineData>;
    splineIdx: number;
  }) => {
    const globals = useAtomValue(Globals);
    const selectedSpline = useAtomValue(SelectedSpline);
    
    const nubs = selectSplineNubs(splineData, SPLINE_KEY_BASE + splineIdx);
    const items = selectSplineItems(splineData, SPLINE_KEY_BASE + splineIdx);

    // Determine if spline is circular
    const renderOptions = useMemo(() => {
      return getSplineRenderOptions(globals.GAME_TYPE, nubs);
    }, [globals.GAME_TYPE, nubs]);

    // Calculate spline points with correct circular option
    const splinePoints = useMemo(() => {
      return getPoints(nubs, { circular: renderOptions.circular });
    }, [nubs, renderOptions.circular]);

    const points = useMemo(() => {
      return splinePoints.flatMap((point) => [point.x, point.z]);
    }, [splinePoints]);

    return (
      <>
        <Line
          points={points}
          stroke={selectedSpline === splineIdx ? "red" : "blue"}
          strokeWidth={selectedSpline === splineIdx ? 5 : 2}
          closed={renderOptions.circular} // Close the path for circular splines
          draggable
          // ... rest of drag handlers
        />
        
        {/* Render nubs - show first nub only for non-circular splines */}
        {nubs.map((nub, nubIdx) => {
          // For circular splines, skip first nub (merged with last)
          // For non-circular splines, show all nubs including first and last
          if (renderOptions.circular && nubIdx === 0) return null;
          
          return (
            <SplineNub
              key={nubIdx}
              nub={nub}
              nubIdx={nubIdx}
              splineIdx={splineIdx}
              setSplineData={setSplineData}
              isEndpoint={
                !renderOptions.circular &&
                (nubIdx === 0 || nubIdx === nubs.length - 1)
              }
              isCircular={renderOptions.circular}
            />
          );
        })}
        
        {/* Render items on spline */}
        {items.map((item, itemIdx) => (
          <SplineItem
            key={itemIdx}
            splinePoints={splinePoints}
            item={item}
          />
        ))}
      </>
    );
  },
);
```

#### 3.2 Modified SplineNub Component

**File:** `src/editor/subviews/splines/Spline.tsx` (SplineNub modification)

```typescript
const SplineNub = memo(
  ({
    nub,
    nubIdx,
    splineIdx,
    setSplineData,
    isEndpoint = false,
    isCircular = true,
  }: {
    nub: SplineNub;
    nubIdx: number;
    splineIdx: number;
    setSplineData: Updater<SplineData>;
    isEndpoint?: boolean;
    isCircular?: boolean;
  }) => {
    const [selectedSpline, setSelectedSpline] = useAtom(SelectedSpline);
    const [hovering, setHovering] = useState(false);
    const nubRafRef = useRef<number | null>(null);
    
    // Visual distinction for endpoints in non-circular splines
    const fillColor = useMemo(() => {
      if (isEndpoint) {
        return nubIdx === 0 ? 'green' : 'orange'; // Start: green, End: orange
      }
      return selectedSpline === splineIdx ? 'red' : 'blue';
    }, [isEndpoint, nubIdx, selectedSpline, splineIdx]);

    const handleDrag = (newX: number, newZ: number) => {
      setSplineData((draft) => {
        const currentNubs = draft.SpNb?.[SPLINE_KEY_BASE + splineIdx]?.obj || [];
        const updatedNubs = [...currentNubs];
        updatedNubs[nubIdx] = { x: newX, z: newZ };

        // For circular splines, sync first and last nubs
        if (isCircular) {
          if (nubIdx === currentNubs.length - 1) {
            // Moving last nub also moves first
            updatedNubs[0] = { x: newX, z: newZ };
          } else if (nubIdx === 0) {
            // Moving first nub also moves last (shouldn't happen for circular, but safety)
            updatedNubs[currentNubs.length - 1] = { x: newX, z: newZ };
          }
        }
        // For non-circular splines, nubs move independently

        const spNb = draft.SpNb?.[SPLINE_KEY_BASE + splineIdx];
        if (spNb) {
          spNb.obj = updatedNubs;
        }

        // Recalculate spline points
        const newPoints = getPoints(updatedNubs, { circular: isCircular });
        const spPt = draft.SpPt?.[SPLINE_KEY_BASE + splineIdx];
        if (spPt) {
          spPt.obj = newPoints;
        }

        const spln = draft.Spln?.[1000]?.obj?.[SPLINE_KEY_BASE + splineIdx];
        if (spln) {
          spln.numNubs = updatedNubs.length;
          spln.numPoints = newPoints.length;
        }
      });
    };

    return (
      <>
        <Circle
          x={nub.x}
          y={nub.z}
          radius={isEndpoint ? 15 : 10} // Larger radius for endpoints
          draggable
          fill={fillColor}
          stroke={isEndpoint ? 'white' : undefined}
          strokeWidth={isEndpoint ? 2 : 0}
          onMouseDown={() => setSelectedSpline(splineIdx)}
          onDragStart={() => setSelectedSpline(splineIdx)}
          onDragMove={(e) => {
            const newX = Math.round(e.target.x());
            const newZ = Math.round(e.target.y());
            if (nubRafRef.current) cancelAnimationFrame(nubRafRef.current);
            nubRafRef.current = requestAnimationFrame(() => {
              handleDrag(newX, newZ);
            });
          }}
          onDragEnd={(e) => {
            if (nubRafRef.current) cancelAnimationFrame(nubRafRef.current);
            const newX = Math.round(e.target.x());
            const newZ = Math.round(e.target.y());
            handleDrag(newX, newZ);
            updateSplinePointsFromNubs(splineIdx, setSplineData, isCircular);
          }}
          onMouseOver={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
        />
        <Text
          x={nub.x - 4}
          y={nub.z - 4}
          text={isEndpoint ? (nubIdx === 0 ? 'S' : 'E') : nubIdx.toString()}
          fill="white"
          opacity={0.8}
          visible={!hovering}
          fontStyle={isEndpoint ? 'bold' : 'normal'}
        />
      </>
    );
  },
);
```

### Phase 4: Update Spline Utilities

#### 4.1 Modified splineUtils.ts

**File:** `src/editor/subviews/splines/splineUtils.ts` (modified)

```typescript
import type { Updater } from "use-immer";
import type { SplineData } from "@/python/structSpecs/LevelTypes";
import { getPoints } from "../../../utils/spline";
import { selectSplineNubs } from "../../../data/selectors";

export const SPLINE_KEY_BASE = 1000;

export function updateSplinePointsFromNubs(
  splineIdx: number,
  setSplineData: Updater<SplineData>,
  circular: boolean = true, // New parameter
) {
  setSplineData((draft) => {
    const nubs = selectSplineNubs(draft, SPLINE_KEY_BASE + splineIdx);
    const firstNub = nubs[0];
    
    const newPoints =
      nubs.length === 1 && firstNub
        ? [{ x: firstNub.x, z: firstNub.z }]
        : getPoints(nubs, { circular });

    const spPt = draft.SpPt?.[SPLINE_KEY_BASE + splineIdx];
    if (spPt) {
      spPt.obj = newPoints;
      const spln = draft.Spln?.[1000]?.obj?.[SPLINE_KEY_BASE + splineIdx];
      if (spln) {
        spln.numPoints = newPoints.length;
      }
    }
  });
}

/**
 * Add a new nub to a spline
 */
export function addSplineNub(
  splineIdx: number,
  setSplineData: Updater<SplineData>,
  position: { x: number; z: number },
  circular: boolean,
) {
  setSplineData((draft) => {
    const spNb = draft.SpNb?.[SPLINE_KEY_BASE + splineIdx];
    if (!spNb) return;

    const nubs = [...spNb.obj];
    
    if (circular) {
      // Insert before the last nub (which mirrors the first)
      nubs.splice(nubs.length - 1, 0, position);
    } else {
      // Add at the end
      nubs.push(position);
    }

    spNb.obj = nubs;

    const spln = draft.Spln?.[1000]?.obj?.[SPLINE_KEY_BASE + splineIdx];
    if (spln) {
      spln.numNubs = nubs.length;
    }
  });

  updateSplinePointsFromNubs(splineIdx, setSplineData, circular);
}

/**
 * Remove a nub from a spline
 */
export function removeSplineNub(
  splineIdx: number,
  nubIdx: number,
  setSplineData: Updater<SplineData>,
  circular: boolean,
) {
  setSplineData((draft) => {
    const spNb = draft.SpNb?.[SPLINE_KEY_BASE + splineIdx];
    if (!spNb) return;

    const nubs = [...spNb.obj];
    
    // Don't allow removal if it would leave less than minimum nubs
    const minNubs = circular ? 3 : 2;
    if (nubs.length <= minNubs) return;

    // Don't allow removal of first or last nub in circular splines
    if (circular && (nubIdx === 0 || nubIdx === nubs.length - 1)) {
      return;
    }

    nubs.splice(nubIdx, 1);
    spNb.obj = nubs;

    const spln = draft.Spln?.[1000]?.obj?.[SPLINE_KEY_BASE + splineIdx];
    if (spln) {
      spln.numNubs = nubs.length;
    }
  });

  updateSplinePointsFromNubs(splineIdx, setSplineData, circular);
}
```

### Phase 5: Update 3D Spline Rendering

#### 5.1 SplineGeometry Component Update

**File:** `src/editor/threejs/SplineGeometry.tsx` (modified)

```typescript
import { getSplineRenderOptions } from '@/data/splines/splineDetection';
import { getPoints } from '@/utils/spline';

export const SplineGeometry: React.FC<SplineGeometryProps> = ({
  splineData,
  headerData,
  terrainData,
}) => {
  const globals = useAtomValue(Globals);

  // Process each spline
  const splineGeometries = useMemo(() => {
    const geometries: JSX.Element[] = [];
    const splnData = splineData.Spln?.[1000]?.obj;
    
    if (!splnData) return geometries;

    Object.entries(splnData).forEach(([key, spline]) => {
      const splineKey = Number(key);
      const nubs = splineData.SpNb?.[splineKey]?.obj ?? [];
      
      if (nubs.length < 2) return;

      // Determine if circular
      const renderOptions = getSplineRenderOptions(globals.GAME_TYPE, nubs);
      
      // Calculate points with correct circular setting
      const points = getPoints(nubs, { circular: renderOptions.circular });
      
      // Create 3D curve
      const curvePoints = points.map((p) => {
        const y = getTerrainHeightAtPoint(p.x, p.z, headerData, terrainData, globals);
        return new THREE.Vector3(p.x, y + 10, p.z);
      });

      // For circular splines, close the loop
      if (renderOptions.circular && curvePoints.length > 0) {
        curvePoints.push(curvePoints[0]!.clone());
      }

      const curve = new THREE.CatmullRomCurve3(curvePoints, renderOptions.circular);
      
      geometries.push(
        <line key={splineKey}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={curvePoints.length}
              array={new Float32Array(curvePoints.flatMap(p => [p.x, p.y, p.z]))}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color={0x0000ff} linewidth={2} />
        </line>
      );

      // Add endpoint markers for non-circular splines
      if (!renderOptions.circular) {
        const start = curvePoints[0];
        const end = curvePoints[curvePoints.length - 1];
        
        if (start) {
          geometries.push(
            <mesh key={`${splineKey}-start`} position={start}>
              <sphereGeometry args={[20, 16, 16]} />
              <meshBasicMaterial color={0x00ff00} />
            </mesh>
          );
        }
        
        if (end) {
          geometries.push(
            <mesh key={`${splineKey}-end`} position={end}>
              <sphereGeometry args={[20, 16, 16]} />
              <meshBasicMaterial color={0xff8000} />
            </mesh>
          );
        }
      }
    });

    return geometries;
  }, [splineData, headerData, terrainData, globals]);

  return <group name="splines">{splineGeometries}</group>;
};
```

---

## Testing Strategy

### Unit Tests
- Test circular detection for various nub configurations
- Test spline point generation for circular and non-circular cases
- Test that wrap-around segment is properly calculated

### Visual Tests
- Compare rendered splines to game screenshots
- Test Billy Frontier shootout level splines specifically
- Verify endpoint markers appear correctly

### Game-Specific Tests
- Otto Matic: All splines should be circular
- Bugdom: Circular splines
- Billy Frontier: Mix of circular and non-circular

---

## File Summary

| File | Changes |
|------|---------|
| `src/utils/spline.ts` | Add circular option, fix wrap-around segment |
| `src/data/splines/splineTypes.ts` | New: spline metadata types |
| `src/data/splines/splineDetection.ts` | New: circular detection logic |
| `src/editor/subviews/splines/Spline.tsx` | Handle circular vs non-circular |
| `src/editor/subviews/splines/splineUtils.ts` | Add circular parameter to updates |
| `src/editor/threejs/SplineGeometry.tsx` | Handle circular in 3D rendering |

---

## Implementation Order

1. **Phase 1**: Fix spline math for circular wrap-around
2. **Phase 2**: Add circular detection utilities
3. **Phase 3**: Update 2D spline UI
4. **Phase 4**: Update spline utilities
5. **Phase 5**: Update 3D spline rendering

---

## Risk Assessment

### Low Risk
- Spline math changes are well-defined
- Detection logic is straightforward

### Medium Risk
- Billy Frontier may have edge cases not covered
- Existing level data might have inconsistent nub positions

### Mitigation
- Add tolerance to circular detection
- Log warnings for ambiguous cases
- Allow manual override of circular setting
