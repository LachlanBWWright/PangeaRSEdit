# Bugdom 2 Tunnel Level (.tun) Parser and Editor Plan

## Overview

Bugdom 2 features two tunnel levels (Plumbing and Gutter) that use a radically different format from the standard terrain-based `.ter` levels. These levels are 3D "tube" or "half-pipe" slides where the player surfs through pre-built geometry along a spline path.

## File Format Analysis

### Location
- `Data/Tunnels/Plumbing.tun` (2.9 MB)
- `Data/Tunnels/Gutter.tun` (2.4 MB)

### Key Differences from .ter Files

| Aspect | .ter Files | .tun Files |
|--------|-----------|------------|
| Storage | Resource fork (Mac resource format) | Data fork (binary stream) |
| Terrain | Height-mapped tile grid with supertiles | Pre-built 3D tube geometry sections |
| Navigation | Free 2D/3D movement | On-rails spline-following |
| Items | Placed on 2D terrain coordinates | Placed relative to spline points |
| Textures | Supertile textures in data fork | Embedded RGBA textures |

### File Structure

Based on source analysis (`games/bugdom2/Source/System/File.c`):

```
TunnelFileHeaderType (88 bytes)
├── NumVersion version      (4 bytes - two uint16_t: major.minor)
├── Boolean fullPipe        (1 byte - true for 360° pipe, false for half-pipe)
├── int32_t numNubs         (4 bytes - spline control points)
├── int32_t numSplinePoints (4 bytes - interpolated spline points)
├── int32_t numSections     (4 bytes - geometry mesh sections)
├── int32_t numItems        (4 bytes - objects in tunnel)
└── int32_t unused[16]      (64 bytes - reserved)

AliasData (variable size)
├── int32_t aliasSize       (size of alias data)
└── bytes[aliasSize]        (legacy Mac alias to .bg3d file, skipped)

SplineNubs (numNubs × 24 bytes each)
├── OGLPoint3D point        (12 bytes - x, y, z)
└── OGLVector3D up          (12 bytes - up vector)

TunnelTexture
├── int32_t width           (texture width)
├── int32_t height          (texture height)
└── bytes[w × h × 4]        (RGBA pixel data)

WaterTexture (skipped in loading)
├── int32_t width
├── int32_t height
└── bytes[w × h × 4]

TunnelItems (numItems × 56 bytes each)
├── int32_t type            (item type ID)
├── int32_t splineIndex     (which spline point)
├── int32_t sectionNum      (geometry section)
├── float scale             (item scale)
├── OGLVector3D rot         (12 bytes - rotation)
├── OGLVector3D positionOffset (12 bytes - offset from spline)
├── uint32_t flags          (item flags)
└── uint32_t parms[3]       (12 bytes - parameters)

SplinePoints (numSplinePoints × 24 bytes each)
├── OGLPoint3D point        (12 bytes)
└── OGLVector3D up          (12 bytes)

SectionGeometry (repeated numSections times)
├── TunnelMesh (main tunnel geometry)
│   ├── OGLBoundingBox bBox (24 bytes - min + max points)
│   ├── int32_t numPoints
│   ├── int32_t numTriangles
│   ├── OGLPoint3D points[]     (numPoints × 12 bytes)
│   ├── OGLVector3D normals[]   (numPoints × 12 bytes)
│   ├── OGLTextureCoord uvs[]   (numPoints × 8 bytes)
│   └── MOTriangleIndices tris[] (numTriangles × 12 bytes)
│
└── WaterMesh (water surface geometry)
    ├── OGLBoundingBox bBox
    ├── int32_t numPoints
    ├── int32_t numTriangles
    ├── OGLPoint3D points[]
    ├── OGLTextureCoord uvs[]    (no normals for water)
    └── MOTriangleIndices tris[]
```

### Data Types Reference

```typescript
interface TunnelSplinePointType {
  point: { x: number; y: number; z: number };  // OGLPoint3D
  up: { x: number; y: number; z: number };     // OGLVector3D
}

interface TunnelItemDefType {
  type: number;           // int32_t
  splineIndex: number;    // int32_t - index into spline points
  sectionNum: number;     // int32_t - which geometry section
  scale: number;          // float
  rot: { x: number; y: number; z: number };
  positionOffset: { x: number; y: number; z: number };
  flags: number;          // uint32_t
  parms: [number, number, number];  // uint32_t[3]
}

interface TunnelSectionMesh {
  bBox: { min: Point3D; max: Point3D };
  numPoints: number;
  numTriangles: number;
  points: Point3D[];
  normals?: Vector3D[];   // Optional (not present for water)
  uvs: { u: number; v: number }[];
  triangles: { a: number; b: number; c: number }[];
}
```

## Implementation Plan

### Phase 1: Parser Implementation

#### 1.1 Create Binary Parser Module

**File:** `frontend/src/data/tunnelParser/parseTunnelFile.ts`

```typescript
export interface TunnelData {
  header: TunnelHeader;
  nubs: TunnelSplinePoint[];
  tunnelTexture: TunnelTexture;
  items: TunnelItem[];
  splinePoints: TunnelSplinePoint[];
  sections: TunnelSection[];
}

export async function parseTunnelFile(buffer: ArrayBuffer): Promise<TunnelData>;
export function serializeTunnelData(data: TunnelData): ArrayBuffer;
```

**Implementation steps:**
1. Create `BinaryReader` utility class with big-endian support
2. Parse header structure
3. Skip alias data (just read size and advance)
4. Parse nub list (control points)
5. Parse embedded textures
6. Parse item list
7. Parse spline points
8. Parse section meshes (tunnel + water for each)

#### 1.2 Type Definitions

**File:** `frontend/src/data/tunnelParser/types.ts`

Define TypeScript interfaces matching the C structures.

#### 1.3 Texture Extraction

**File:** `frontend/src/data/tunnelParser/textureUtils.ts`

- Convert embedded RGBA data to usable Three.js textures
- Support both tunnel and water textures

### Phase 2: Viewer Implementation

#### 2.1 Create Tunnel Viewer Component

**File:** `frontend/src/editor/tunnel/TunnelViewer.tsx`

A React Three Fiber component to render tunnel levels:

```typescript
interface TunnelViewerProps {
  tunnelData: TunnelData;
  selectedSection?: number;
  showWater?: boolean;
  showSpline?: boolean;
  showItems?: boolean;
}
```

**Features:**
- Render all tunnel section meshes
- Apply tunnel texture material
- Render water meshes with transparency
- Visualize spline path
- Show item positions as markers

#### 2.2 Camera System

**File:** `frontend/src/editor/tunnel/TunnelCamera.tsx`

- Fly camera for free navigation
- Follow camera that moves along spline
- Section-focused camera for editing

#### 2.3 Spline Visualization

**File:** `frontend/src/editor/tunnel/TunnelSpline.tsx`

- Render spline as tube geometry
- Show control nubs as editable handles
- Display up vectors for orientation

### Phase 3: Editor Implementation

#### 3.1 Item Editor

**File:** `frontend/src/editor/tunnel/TunnelItemEditor.tsx`

- List all items with their types
- 3D gizmo for position/rotation/scale
- Snap to spline point
- Copy/paste items
- Item type selector based on level (Plumbing vs Gutter items)

**Plumbing Items:**
- Nail, Blob, HealthPOW, Ring, Spray

**Gutter Items:**
- PineCone, Leaf, Spray

#### 3.2 Spline Editor

**File:** `frontend/src/editor/tunnel/TunnelSplineEditor.tsx`

- Move spline nubs (control points)
- Adjust up vectors
- Re-interpolate spline points
- Preview player path

#### 3.3 Geometry Section Viewer

**File:** `frontend/src/editor/tunnel/SectionInspector.tsx`

- Highlight individual sections
- View section bounds
- Section statistics (vertex count, triangle count)
- Note: Geometry editing is complex and may be out of scope initially

### Phase 4: Integration

#### 4.1 File Loading Integration

Modify `frontend/src/editor/loadLogic/openFile.ts`:
- Detect `.tun` files
- Route to tunnel parser
- Load into separate tunnel editor state

#### 4.2 Tunnel Editor Page

**File:** `frontend/src/pages/TunnelEditor.tsx`

- New route for tunnel editing
- Toolbar with tunnel-specific tools
- Save/export functionality

#### 4.3 State Management

**File:** `frontend/src/data/atoms/tunnelAtoms.ts`

Jotai atoms for:
- Current tunnel data
- Selected item/section
- Editor mode
- Undo/redo history

### Phase 5: Testing

#### 5.1 Parser Tests

**File:** `frontend/tests/tunnel/parseTunnelFile.test.ts`

- Test parsing both Plumbing.tun and Gutter.tun
- Verify header values match expected
- Validate section counts
- Roundtrip test (parse -> serialize -> parse)

#### 5.2 Visual Tests

- Playwright tests for tunnel rendering
- Compare rendered output to game screenshots

## Technical Considerations

### Endianness
All multi-byte values are big-endian (PowerPC legacy). Use `DataView` with explicit endian parameter:
```typescript
const reader = new DataView(buffer);
const value = reader.getInt32(offset, false); // false = big-endian
```

### Swizzling
The game source uses `SwizzleLong`, `SwizzleFloat`, etc. to convert endianness. Our parser must do the same.

### Coordinate System
- Game uses Y-up coordinate system
- Tunnel geometry is pre-transformed
- Item positions are offsets from spline points

### Memory/Performance
- Section meshes can be large (100s of thousands of vertices total)
- Consider lazy loading sections
- Use instancing for repeated items
- Implement frustum culling

## Estimated Complexity

| Phase | Effort | Dependencies |
|-------|--------|--------------|
| Phase 1 (Parser) | Medium | None |
| Phase 2 (Viewer) | Medium | Phase 1, Three.js |
| Phase 3 (Editor) | High | Phases 1-2 |
| Phase 4 (Integration) | Medium | Phases 1-3 |
| Phase 5 (Testing) | Low-Medium | Phases 1-4 |

## Files to Create

```
frontend/src/
├── data/
│   └── tunnelParser/
│       ├── index.ts
│       ├── parseTunnelFile.ts
│       ├── serializeTunnelFile.ts
│       ├── types.ts
│       └── textureUtils.ts
├── editor/
│   └── tunnel/
│       ├── TunnelViewer.tsx
│       ├── TunnelCamera.tsx
│       ├── TunnelSpline.tsx
│       ├── TunnelItemEditor.tsx
│       ├── TunnelSplineEditor.tsx
│       ├── SectionInspector.tsx
│       └── index.ts
├── pages/
│   └── TunnelEditor.tsx
└── data/
    └── atoms/
        └── tunnelAtoms.ts

frontend/tests/
└── tunnel/
    └── parseTunnelFile.test.ts
```

## References

- `games/bugdom2/Source/System/File.c` - LoadTunnel function (lines 1319-1544)
- `games/bugdom2/Source/Headers/tunnel.h` - Type definitions
- `games/bugdom2/Source/Player/Player_Tunnel.c` - Gameplay usage
- Existing similar components:
  - `SplineGeometry.tsx` - For spline rendering patterns
  - `EnhancedModelMesh.tsx` - For mesh rendering patterns
  - `parseLevelBuffer` in `parseLevel.ts` - For binary parsing patterns
