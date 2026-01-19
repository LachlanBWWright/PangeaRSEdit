# 3D Editor Item Display for All Games

## Overview

This plan describes extending the 3D editor view to display items for all supported games, accounting for the various ways model data is packed and the game-specific hardcoding that determines which models to display for each item type.

## Current State

Currently, 3D item display is **partially implemented for Otto Matic only**:

### Existing Infrastructure (Otto Matic)
- **Item Geometry Component**: `frontend/src/editor/threejs/ItemGeometry.tsx`
  - Uses `useOttoItemModelCache` hook to load BG3D models
  - Maps item types to models via `ottoItemModelMapping.ts`
  - Displays colored cubes as fallback for unmapped items
  - Supports liquid patches for Bugdom 1 and Nanosaur 1
  
- **Model Loading Hook**: `frontend/src/editor/threejs/hooks/useOttoItemModelCache.ts`
  - Uses Web Worker to convert BG3D → glTF off main thread
  - Caches converted models in memory
  - Extracts specific meshes from multi-geometry BG3D files
  
- **Model Mapping**: `frontend/src/data/items/ottoItemModelMapping.ts`
  - Maps item types to `{ modelFile, modelIndex, scale?, rotationY? }`
  - Uses `Game.OTTO_MATIC` check to limit to Otto only
  
- **Toggle UI**: `Show3DItemModels` atom in `canvasViewAtoms.ts`
  - Toggle in `OttoMaticTilesMenu.tsx`
  - Off by default

### Placeholder Mapping Files (Empty/Incomplete)
- `bugdom2ItemModelMapping.ts` - TODOs for all 11 level types
- `bugdomItemModelMapping.ts` - Partial coverage (~50 items)
- `billyFrontierItemModelMapping.ts` - Structure defined, no mappings
- `nanosaurItemModelMapping.ts` - Not created yet
- `nanosaur2ItemModelMapping.ts` - Not created yet
- `cromagItemModelMapping.ts` - Not created yet

## Goals

1. Create a unified item model system that works across all games
2. Map all item types to their corresponding 3D models
3. Handle game-specific model packing and organization
4. Support fallback rendering for unmapped items
5. Use standard parameter types from Plan 001 for rotation/scale

---

## Phase 1: Game Model Analysis

### 1.1 Document Model Organization Per Game

Each game organizes models differently. Analysis needed:

#### Otto Matic
- **Models path**: `models/` and `skeletons/`
- **Organization**: Level-specific files (`level1_farm.bg3d`, `level2_slime.bg3d`, etc.)
- **Global items**: `global.bg3d`
- **Skeletons**: Separate `.bg3d` and `.skeleton.rsrc` files
- **Current mapping**: ~83 items mapped in `ottoItemModelMapping.ts`

#### Bugdom 2
- **Models path**: `models/` and `skeletons/`
- **Organization**: Level files (`garden.bg3d`, `sidewalk.bg3d`, `playroom.bg3d`, etc.)
- **Global items**: `global.bg3d`, `foliage.bg3d`
- **Complexity**: Items are level-specific (same item type = different model per level)
- **Level model files**: 11 level-specific BG3D files defined
- **Current mapping**: ~12 items/TODOs in `bugdom2ItemModelMapping.ts`

#### Bugdom 1
- **Models path**: `models/` and `skeletons/`
- **Organization**: Level files (`lawn1.bg3d`, `lawn2.bg3d`, `pond.bg3d`, etc.)
- **Global items**: `global1.bg3d`, `global2.bg3d`
- **Current mapping**: Partial coverage in `bugdomItemModelMapping.ts`

#### Nanosaur 1
- **Models path**: `models/`
- **Organization**: Single model files per enemy/item
- **Simpler structure**: ~20 item types
- **Current mapping**: No mapping file exists yet

#### Nanosaur 2
- **Models path**: `models/` and `skeletons/`
- **Organization**: Similar to Otto Matic
- **Current mapping**: No mapping file exists yet

#### Cro-Mag Rally
- **Models path**: `models/` and `skeletons/`
- **Organization**: Track-specific and global models
- **Current mapping**: No mapping file exists yet

#### Billy Frontier
- **Models path**: `models/` and `skeletons/`
- **Organization**: Scene-specific models
- **Current mapping**: Structure defined but empty

#### Mighty Mike
- **2D game**: No 3D models (uses sprites)

### 1.2 Create Game Model Registry

**File:** `frontend/src/data/items/gameModelRegistry.ts`

```typescript
import { Game } from "@/data/globals/globals";

export interface ModelRegistry {
  game: Game;
  modelPath: string;
  skeletonPath: string;
  globalModels: string[];
  levelModels: Record<number, string[]>;  // levelNum -> model files
}

export const GAME_MODEL_REGISTRIES: Record<Game, ModelRegistry> = {
  [Game.OTTO_MATIC]: {
    game: Game.OTTO_MATIC,
    modelPath: "games/ottomatic/models",
    skeletonPath: "games/ottomatic/skeletons",
    globalModels: ["global.bg3d"],
    levelModels: {
      1: ["level1_farm.bg3d"],
      2: ["level2_slime.bg3d"],
      3: ["level3_blobboss.bg3d"],
      // ... etc
    },
  },
  // ... other games
};
```

---

## Phase 2: Unified Item Model Mapping Interface

### 2.1 Standardized Model Mapping Type

**File:** `frontend/src/data/items/itemModelTypes.ts`

```typescript
import { StandardParamType, ROTATION_4_WAY, ROTATION_8_WAY } from "./standardParamTypes";

/**
 * Universal model mapping that works across all games
 */
export interface UniversalItemModelMapping {
  /** BG3D filename */
  modelFile: string;
  
  /** Path type */
  modelPath: "models" | "skeletons";
  
  /** Model index within the BG3D file (maps to Subgroup_N) */
  modelIndex: number;
  
  /** Alternative models for variants (indexed by p0 value) */
  variants?: Record<number, {
    modelFile?: string;  // Optional different file
    modelIndex: number;  // Different subgroup
  }>;
  
  /** True if model requires skeleton data */
  requiresSkeleton?: boolean;
  
  /** Skeleton file */
  skeletonFile?: string;
  
  /** Base scale multiplier */
  scale?: number;
  
  /** Rotation offset (radians) */
  rotationY?: number;
  
  /** Which parameter controls rotation (uses StandardParamType) */
  rotationParam?: {
    paramIndex: 0 | 1 | 2 | 3;
    rotationType: StandardParamType;
  };
  
  /** Which parameter controls scale */
  scaleParam?: {
    paramIndex: 0 | 1 | 2 | 3;
    multiplier: number;
    offset: number;
  };
  
  /** Level restriction (0 = all levels, -1 = not available) */
  levelRestriction?: number;
}

/**
 * Game-specific model mapper interface
 */
export interface GameItemModelMapper {
  /**
   * Get model mapping for an item type
   * @param itemType Item type ID
   * @param levelNum Current level number (for level-specific models)
   * @param params Item parameters (for variant selection)
   */
  getMapping(
    itemType: number,
    levelNum?: number,
    params?: { p0: number; p1: number; p2: number; p3: number },
  ): UniversalItemModelMapping | undefined;
  
  /**
   * Get all mapped item types
   */
  getMappedTypes(): number[];
  
  /**
   * Check if an item type has a model
   */
  hasModel(itemType: number): boolean;
}
```

### 2.2 Game-Specific Mapper Implementations

**File:** `frontend/src/data/items/mappers/ottoItemMapper.ts`

```typescript
import { GameItemModelMapper, UniversalItemModelMapping } from "../itemModelTypes";
import { OTTO_ITEM_MODEL_MAPPINGS } from "../ottoItemModelMapping";

export class OttoItemMapper implements GameItemModelMapper {
  getMapping(
    itemType: number,
    _levelNum?: number,
    params?: { p0: number; p1: number; p2: number; p3: number },
  ): UniversalItemModelMapping | undefined {
    const base = OTTO_ITEM_MODEL_MAPPINGS[itemType];
    if (!base) return undefined;
    
    // Handle variants based on p0
    if (base.variants && params) {
      const variant = base.variants[params.p0];
      if (variant) {
        return {
          ...base,
          modelFile: variant.modelFile ?? base.modelFile,
          modelIndex: variant.modelIndex,
        };
      }
    }
    
    return base;
  }
  
  getMappedTypes(): number[] {
    return Object.keys(OTTO_ITEM_MODEL_MAPPINGS)
      .map(Number)
      .filter(k => OTTO_ITEM_MODEL_MAPPINGS[k] !== undefined);
  }
  
  hasModel(itemType: number): boolean {
    return OTTO_ITEM_MODEL_MAPPINGS[itemType] !== undefined;
  }
}
```

---

## Phase 3: Unified Model Loading System

### 3.1 Generic Model Cache Hook

**File:** `frontend/src/editor/threejs/hooks/useItemModelCache.ts`

```typescript
import { Game } from "@/data/globals/globals";
import { GameItemModelMapper, UniversalItemModelMapping } from "@/data/items/itemModelTypes";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";

interface ModelCacheEntry {
  gltf: GLTF | null;
  loading: boolean;
  error: string | null;
}

interface UseItemModelCacheResult {
  modelCache: Map<string, ModelCacheEntry>;  // key: "modelFile:modelIndex"
  loadModel: (mapping: UniversalItemModelMapping) => Promise<void>;
  getModel: (mapping: UniversalItemModelMapping) => ModelCacheEntry | undefined;
}

/**
 * Generic hook for loading item models for any game
 */
export function useItemModelCache(game: Game): UseItemModelCacheResult;

/**
 * Factory to create game-specific model mapper
 */
export function createGameMapper(game: Game): GameItemModelMapper;
```

### 3.2 BG3D Model Loader with Subgroup Extraction

**File:** `frontend/src/editor/threejs/utils/bg3dLoader.ts`

```typescript
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { Group } from "three";

/**
 * Load a BG3D model file and extract a specific subgroup
 */
export async function loadBg3dSubgroup(
  game: Game,
  modelPath: "models" | "skeletons",
  modelFile: string,
  modelIndex: number,
): Promise<Group | null>;

/**
 * Cache for loaded BG3D files (not individual subgroups)
 */
export class Bg3dFileCache {
  private cache: Map<string, GLTF>;
  
  async loadFile(
    game: Game,
    modelPath: "models" | "skeletons",
    modelFile: string,
  ): Promise<GLTF>;
  
  extractSubgroup(gltf: GLTF, modelIndex: number): Group | null;
}
```

---

## Phase 4: Update ItemGeometry Component

### 4.1 Refactor to Support All Games

**File:** `frontend/src/editor/threejs/ItemGeometry.tsx`

```typescript
import { Game } from "@/data/globals/globals";
import { useItemModelCache, createGameMapper } from "./hooks/useItemModelCache";

export const ItemGeometry: React.FC<ItemGeometryProps> = ({
  itemData,
  headerData,
  terrainData,
}) => {
  const globals = useAtomValue(Globals);
  const show3DItemModels = useAtomValue(Show3DItemModels);
  
  // Get appropriate mapper for current game
  const mapper = useMemo(
    () => createGameMapper(globals.GAME_TYPE),
    [globals.GAME_TYPE]
  );
  
  // Use unified model cache
  const { modelCache, loadModel, getModel } = useItemModelCache(globals.GAME_TYPE);
  
  // Get current level number from header (for level-specific models)
  const levelNum = headerData.Hedr[1000].obj.version; // or dedicated level field
  
  // ... rest of component using mapper and unified cache
};
```

### 4.2 Add Level-Aware Model Selection

For games like Bugdom 2 where item appearance changes by level:

```typescript
// In render loop
const mapping = mapper.getMapping(
  item.type,
  levelNum,
  { p0: item.p0, p1: item.p1, p2: item.p2, p3: item.p3 }
);

if (mapping) {
  // Apply rotation from standard param type
  let rotation = mapping.rotationY ?? 0;
  if (mapping.rotationParam) {
    const paramValue = item[`p${mapping.rotationParam.paramIndex}`];
    rotation += calculateRotation(paramValue, mapping.rotationParam.rotationType);
  }
  
  // Apply scale
  let scale = mapping.scale ?? 1;
  if (mapping.scaleParam) {
    const paramValue = item[`p${mapping.scaleParam.paramIndex}`];
    scale *= paramValue * mapping.scaleParam.multiplier + mapping.scaleParam.offset;
  }
  
  return <ItemModel mapping={mapping} position={position} rotation={rotation} scale={scale} />;
}
```

---

## Phase 5: Complete Model Mappings

### 5.1 Otto Matic (Already Mostly Complete)

Review and fill gaps in `ottoItemModelMapping.ts`:
- [ ] Verify all 109 item types have mappings
- [ ] Add variant support for items with multiple appearances
- [ ] Add rotation/scale param mappings

### 5.2 Bugdom 2

Complete `bugdom2ItemModelMapping.ts`:
- [ ] Map all GARDEN level items (0-17)
- [ ] Map all SIDEWALK level items (0-41)
- [ ] Map all PLUMBING level items (0-4)
- [ ] Map all PLAYROOM level items (0-43)
- [ ] Map all CLOSET level items (0-30)
- [ ] Map all GUTTER level items (0-5)
- [ ] Map all GARBAGE level items (0-19)
- [ ] Map all BALSA level items (0-7)
- [ ] Map all PARK level items (0-29)
- [ ] Map all GLOBAL items (0-42)
- [ ] Map all FOLIAGE items (0-12)

### 5.3 Bugdom 1

Complete `bugdomItemModelMapping.ts`:
- [ ] Map all LAWN level items
- [ ] Map all POND level items
- [ ] Map all FOREST level items
- [ ] Map all HIVE level items
- [ ] Map all NIGHT level items
- [ ] Map all ANTHILL level items
- [ ] Map all GLOBAL items

### 5.4 Nanosaur 1

Create `nanosaurItemModelMapping.ts`:
- [ ] Map enemy models
- [ ] Map pickup models
- [ ] Map environmental items

### 5.5 Nanosaur 2

Complete `nanosaur2ItemModelMapping.ts`:
- [ ] Map all item types
- [ ] Handle JPG texture format differences

### 5.6 Cro-Mag Rally

Complete `cromagItemModelMapping.ts`:
- [ ] Map track obstacles
- [ ] Map powerups
- [ ] Map environmental items

### 5.7 Billy Frontier

Complete `billyFrontierItemModelMapping.ts`:
- [ ] Map shootout scene items
- [ ] Map stampede scene items
- [ ] Map duel scene items

---

## Phase 6: Fallback Rendering Improvements

### 6.1 Better Placeholder Visuals

**File:** `frontend/src/editor/threejs/components/ItemPlaceholder.tsx`

```typescript
interface ItemPlaceholderProps {
  position: [number, number, number];
  itemType: number;
  itemName: string;
  category: "enemy" | "powerup" | "environmental" | "trigger" | "unknown";
}

/**
 * Enhanced placeholder with category-based coloring and labels
 */
export const ItemPlaceholder: React.FC<ItemPlaceholderProps> = ({
  position,
  itemType,
  itemName,
  category,
}) => {
  const colors = {
    enemy: 0xff4444,
    powerup: 0x44ff44,
    environmental: 0x8888ff,
    trigger: 0xffff44,
    unknown: 0xaaaaaa,
  };
  
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[50, 50, 50]} />
        <meshStandardMaterial 
          color={colors[category]} 
          opacity={0.7}
          transparent
        />
      </mesh>
      <Html center>
        <div className="item-label">{itemName}</div>
      </Html>
    </group>
  );
};
```

### 6.2 Item Categorization

**File:** `frontend/src/data/items/itemCategories.ts`

```typescript
export type ItemCategory = "enemy" | "powerup" | "environmental" | "trigger" | "player" | "unknown";

export function categorizeItem(game: Game, itemType: number): ItemCategory;

// Game-specific categorization rules
const OTTO_CATEGORIES: Record<number, ItemCategory> = {
  [ItemType.Enemy_Squooshy]: "enemy",
  [ItemType.Enemy_Blob]: "enemy",
  [ItemType.Atom]: "powerup",
  [ItemType.PowerupPod]: "powerup",
  [ItemType.Barn]: "environmental",
  [ItemType.Teleporter]: "trigger",
  [ItemType.StartCoords]: "player",
  // ...
};
```

---

## Phase 7: Performance Optimization

### 7.1 Instanced Rendering

For items that appear many times:

```typescript
/**
 * Use Three.js InstancedMesh for repeated items
 */
export const InstancedItems: React.FC<{
  items: TerrainItem[];
  mapping: UniversalItemModelMapping;
}> = ({ items, mapping }) => {
  const instancedMesh = useMemo(() => {
    // Create instanced geometry
  }, [items, mapping]);
  
  return <primitive object={instancedMesh} />;
};
```

### 7.2 Level-of-Detail (LOD)

For distant items:

```typescript
/**
 * LOD wrapper for item models
 */
export const ItemLOD: React.FC<ItemProps> = (props) => {
  return (
    <LOD>
      <ItemModel detail="high" />
      <ItemModel detail="medium" />
      <ItemPlaceholder /> {/* Lowest LOD */}
    </LOD>
  );
};
```

### 7.3 Frustum Culling

Already handled by Three.js, but ensure proper bounding boxes:

```typescript
// Set proper bounding box for culling
mesh.geometry.computeBoundingBox();
mesh.geometry.computeBoundingSphere();
```

---

## File Summary

### New Files to Create

```
frontend/src/data/items/
├── itemModelTypes.ts           # Universal model mapping types
├── gameModelRegistry.ts        # Game model organization info
├── itemCategories.ts           # Item categorization
└── mappers/
    ├── index.ts                # Export all mappers
    ├── ottoItemMapper.ts       # Otto Matic mapper
    ├── bugdom2ItemMapper.ts    # Bugdom 2 mapper
    ├── bugdomItemMapper.ts     # Bugdom 1 mapper
    ├── nanosaurItemMapper.ts   # Nanosaur 1 mapper
    ├── nanosaur2ItemMapper.ts  # Nanosaur 2 mapper
    ├── cromagItemMapper.ts     # Cro-Mag Rally mapper
    └── billyItemMapper.ts      # Billy Frontier mapper

frontend/src/editor/threejs/
├── hooks/
│   └── useItemModelCache.ts    # Generic model cache hook
├── utils/
│   └── bg3dLoader.ts           # BG3D loading utilities
└── components/
    ├── ItemPlaceholder.tsx     # Enhanced placeholder
    └── InstancedItems.tsx      # Instanced rendering
```

### Files to Modify

```
frontend/src/editor/threejs/ItemGeometry.tsx
  - Refactor to use unified system

frontend/src/data/items/*ItemModelMapping.ts
  - Complete all mappings

frontend/src/data/items/standardParamTypes.ts
  - Add rotation/scale helpers (from Plan 001)
```

---

## Implementation Order

1. **Phase 1**: Document model organization (4 hours research)
2. **Phase 2**: Create unified interfaces (3 hours)
3. **Phase 3**: Build model loading system (4 hours)
4. **Phase 4**: Refactor ItemGeometry (3 hours)
5. **Phase 5**: Complete all mappings (10 hours per game)
6. **Phase 6**: Fallback improvements (2 hours)
7. **Phase 7**: Performance optimization (4 hours)

**Total estimated effort**: 80+ hours

---

## Testing Strategy

1. **Unit tests** for mappers
2. **Visual tests** comparing rendered items to game screenshots
3. **Performance tests** for large levels
4. **Regression tests** for existing Otto Matic functionality

---

## Dependencies

- Plan 001 (Standard Parameter Types) for rotation/scale handling
- BG3D parser (`parseBG3D.ts`) already exists
- Skeleton system (`skeletonSystemNew.ts`) already exists

---

## Risk Assessment

### High Risk
- Some games may have undocumented model packing
- Model indices may not match enum values

### Medium Risk  
- Performance issues with many models loaded
- Memory usage with large model caches

### Low Risk
- Fallback rendering ensures graceful degradation
- Existing Otto Matic implementation proves concept

---

## Success Criteria

1. All games display 3D models for at least 80% of item types
2. Fallback placeholders clearly show unmapped items
3. Performance remains smooth with 500+ items on screen
4. Item rotation/scale correctly follows parameter values
