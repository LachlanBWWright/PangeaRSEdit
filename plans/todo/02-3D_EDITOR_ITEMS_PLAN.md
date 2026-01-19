# 3D Editor Items for All Games Plan

## Overview

This plan outlines the implementation of displaying 3D models for items in the editor view across all supported games. The system must account for different model packing strategies, file formats, and game-specific hardcoding patterns.

---

## Current State Analysis

### Existing Infrastructure

The codebase already has partial item model support:

| Component | File | Status |
|-----------|------|--------|
| Item geometry renderer | `src/editor/threejs/ItemGeometry.tsx` | Otto Matic only |
| Item model cache | `src/editor/threejs/hooks/useOttoItemModelCache.ts` | Otto Matic only |
| Item-to-model mapping | `src/data/items/ottoItemModelMapping.ts` | Otto Matic complete |
| BG3D parser | `src/modelParsers/parseBG3D.ts` | Works for all games |
| Skeleton parser | `src/modelParsers/parseSkeletons.ts` | Works for all games |

### Model Formats by Game

| Game | Primary Format | Model Location | Skeleton Support |
|------|---------------|----------------|------------------|
| Otto Matic | BG3D | `models/`, `skeletons/` | Yes |
| Bugdom 1 | BG3D | `models/`, `skeletons/` | Yes |
| Bugdom 2 | BG3D | `Models3D/`, `Skeletons/` | Yes |
| Nanosaur 1 | BG3D (limited) | `3D Models/` | Limited |
| Nanosaur 2 | BG3D | `Models3D/`, `Skeletons/` | Yes |
| Cro-Mag Rally | BG3D | `Models3D/` | Limited (vehicles) |
| Billy Frontier | BG3D | `Models3D/`, `Skeletons/` | Yes |
| Mighty Mike | Sprites | N/A | No (2D game) |

---

## Implementation Plan

### Phase 1: Abstract Model Loading System

#### 1.1 Generic Model Mapping Interface

**File:** `src/data/items/modelMapping/types.ts`

```typescript
/**
 * Describes how to load and render a 3D model for an item type.
 * Used across all games with 3D item support.
 */
export interface ItemModelMapping {
  /** BG3D filename (e.g., "level1_farm.bg3d") */
  modelFile: string;

  /** Subdirectory within game assets */
  modelPath: string;

  /** Model/group index within the BG3D file (0-indexed) */
  modelIndex: number;

  /** For multi-mesh groups, specific mesh indices to use */
  meshIndices?: number[];

  /** True if model requires skeleton data for rigging */
  requiresSkeleton?: boolean;

  /** Skeleton file name (if different from model) */
  skeletonFile?: string;

  /** Scale multiplier for the model (default: 1.0) */
  scale?: number;

  /** Y-axis rotation offset in radians (default: 0) */
  rotationY?: number;

  /** Y-axis position offset (for items that float above terrain) */
  offsetY?: number;

  /** Whether to use transparency (for glass, water effects) */
  transparent?: boolean;

  /** Override color (for team colors, variants) */
  colorOverride?: number;

  /** Parameter-based variant selector function */
  variantSelector?: (params: ItemParams) => number;
}

export interface ItemParams {
  p0: number;
  p1: number;
  p2: number;
  p3: number;
}
```

#### 1.2 Game-Agnostic Model Cache Hook

**File:** `src/editor/threejs/hooks/useItemModelCache.ts`

```typescript
import { useState, useCallback, useEffect, useRef } from 'react';
import { useAtomValue } from 'jotai';
import { Group } from 'three';
import { GLTF } from 'three-stdlib';
import { Globals, Game } from '@/data/globals/globals';
import { getItemModelMappingForGame } from '@/data/items/modelMapping';
import { loadBG3DModel, extractModelGroup } from '@/modelParsers/bg3dLoader';

interface CachedModel {
  gltf: GLTF | null;
  scene: Group | null;
  loading: boolean;
  error: string | null;
}

export function useItemModelCache() {
  const globals = useAtomValue(Globals);
  const [modelCache, setModelCache] = useState<Map<string, CachedModel>>(new Map());
  const loadingPromises = useRef<Map<string, Promise<void>>>(new Map());

  const getCacheKey = useCallback((itemType: number, variant?: number) => {
    return `${globals.GAME_TYPE}-${itemType}-${variant ?? 0}`;
  }, [globals.GAME_TYPE]);

  const loadModel = useCallback(async (
    itemType: number,
    params?: ItemParams
  ): Promise<void> => {
    const mapping = getItemModelMappingForGame(globals.GAME_TYPE, itemType);
    if (!mapping) return;

    // Calculate variant if needed
    const variant = mapping.variantSelector?.(params ?? { p0: 0, p1: 0, p2: 0, p3: 0 }) ?? 0;
    const cacheKey = getCacheKey(itemType, variant);

    // Check if already loaded or loading
    if (modelCache.has(cacheKey) || loadingPromises.current.has(cacheKey)) {
      return loadingPromises.current.get(cacheKey);
    }

    // Start loading
    const loadPromise = (async () => {
      setModelCache(prev => new Map(prev).set(cacheKey, {
        gltf: null,
        scene: null,
        loading: true,
        error: null,
      }));

      try {
        // Build path based on game
        const basePath = getGameModelBasePath(globals.GAME_TYPE);
        const fullPath = `${basePath}/${mapping.modelPath}/${mapping.modelFile}`;

        // Load BG3D model
        const result = await loadBG3DModel(fullPath);
        if (!result.ok) {
          throw new Error(result.error.message);
        }

        // Extract specific model group
        const modelIndex = mapping.modelIndex + (variant ?? 0);
        const scene = extractModelGroup(result.value, modelIndex, mapping.meshIndices);

        // Apply transformations
        if (mapping.scale && mapping.scale !== 1) {
          scene.scale.setScalar(mapping.scale);
        }
        if (mapping.rotationY) {
          scene.rotation.y = mapping.rotationY;
        }

        setModelCache(prev => new Map(prev).set(cacheKey, {
          gltf: result.value,
          scene,
          loading: false,
          error: null,
        }));
      } catch (error) {
        setModelCache(prev => new Map(prev).set(cacheKey, {
          gltf: null,
          scene: null,
          loading: false,
          error: error instanceof Error ? error.message : String(error),
        }));
      }
    })();

    loadingPromises.current.set(cacheKey, loadPromise);
    return loadPromise;
  }, [globals.GAME_TYPE, modelCache, getCacheKey]);

  const getModel = useCallback((itemType: number, variant?: number) => {
    const cacheKey = getCacheKey(itemType, variant);
    return modelCache.get(cacheKey);
  }, [modelCache, getCacheKey]);

  // Clear cache when game changes
  useEffect(() => {
    setModelCache(new Map());
    loadingPromises.current.clear();
  }, [globals.GAME_TYPE]);

  return { modelCache, loadModel, getModel };
}

function getGameModelBasePath(game: Game): string {
  switch (game) {
    case Game.OTTO_MATIC:
      return '/games/ottomatic';
    case Game.BUGDOM:
      return '/games/bugdom';
    case Game.BUGDOM_2:
      return '/games/bugdom2';
    case Game.NANOSAUR:
      return '/games/nanosaur';
    case Game.NANOSAUR_2:
      return '/games/nanosaur2';
    case Game.CRO_MAG:
      return '/games/cromagrally';
    case Game.BILLY_FRONTIER:
      return '/games/billyfrontier';
    default:
      return '/games/unknown';
  }
}
```

### Phase 2: Per-Game Model Mappings

#### 2.1 Bugdom 1 Model Mapping

**File:** `src/data/items/bugdomItemModelMapping.ts`

```typescript
import { ItemModelMapping } from './modelMapping/types';
import { ItemType } from './bugdomItemType';

export const BUGDOM_ITEM_MODEL_MAPPINGS: Record<number, ItemModelMapping | undefined> = {
  [ItemType.StartCoords]: undefined, // No visual model

  [ItemType.LadyBug]: {
    modelFile: 'LadyBug.bg3d',
    modelPath: 'skeletons',
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: 'LadyBug.skeleton.rsrc',
    scale: 1.0,
  },

  [ItemType.FireAnt]: {
    modelFile: 'FireAnt.bg3d',
    modelPath: 'skeletons',
    modelIndex: 0,
    requiresSkeleton: true,
    scale: 0.8,
  },

  [ItemType.SlugEnemy]: {
    modelFile: 'Slug.bg3d',
    modelPath: 'skeletons',
    modelIndex: 0,
    requiresSkeleton: true,
    scale: 1.0,
  },

  [ItemType.Clover]: {
    modelFile: 'Level_Lawn.bg3d',
    modelPath: 'models',
    modelIndex: 5, // Clover model index
    scale: 1.0,
  },

  [ItemType.BerryBush]: {
    modelFile: 'Level_Lawn.bg3d',
    modelPath: 'models',
    modelIndex: 12, // Berry bush
    scale: 1.0,
  },

  [ItemType.HealthPOW]: {
    modelFile: 'Global.bg3d',
    modelPath: 'models',
    modelIndex: 2, // Health powerup
    scale: 0.5,
    offsetY: 30,
  },

  // ... more mappings
};

export function getBugdomItemModelMapping(itemType: number): ItemModelMapping | undefined {
  return BUGDOM_ITEM_MODEL_MAPPINGS[itemType];
}
```

#### 2.2 Bugdom 2 Model Mapping

**File:** `src/data/items/bugdom2ItemModelMapping.ts`

```typescript
import { ItemModelMapping, ItemParams } from './modelMapping/types';
import { ItemType } from './bugdom2ItemType';

export const BUGDOM2_ITEM_MODEL_MAPPINGS: Record<number, ItemModelMapping | undefined> = {
  [ItemType.StartCoords]: undefined,

  [ItemType.Skip]: {
    modelFile: 'Skip.bg3d',
    modelPath: 'Skeletons',
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: 'Skip.skeleton.rsrc',
  },

  [ItemType.Ant]: {
    modelFile: 'Ant.bg3d',
    modelPath: 'Skeletons',
    modelIndex: 0,
    requiresSkeleton: true,
    // Different ant types use different textures
    variantSelector: (params: ItemParams) => params.p0, // Ant color/type
  },

  [ItemType.Acorn]: {
    modelFile: 'Level1_Garden.bg3d',
    modelPath: 'Models3D',
    modelIndex: 15, // Acorn
    scale: 1.0,
    offsetY: 10,
  },

  [ItemType.WaterBug]: {
    modelFile: 'WaterBug.bg3d',
    modelPath: 'Skeletons',
    modelIndex: 0,
    requiresSkeleton: true,
    scale: 1.2,
  },

  [ItemType.Checkpoint]: {
    modelFile: 'Global.bg3d',
    modelPath: 'Models3D',
    modelIndex: 8, // Checkpoint flag
    scale: 1.0,
  },

  // ... more mappings
};
```

#### 2.3 Nanosaur 2 Model Mapping

**File:** `src/data/items/nanosaur2ItemModelMapping.ts`

```typescript
import { ItemModelMapping } from './modelMapping/types';
import { ItemType } from './nanosaur2ItemType';

export const NANOSAUR2_ITEM_MODEL_MAPPINGS: Record<number, ItemModelMapping | undefined> = {
  [ItemType.StartCoords]: undefined,

  [ItemType.Pteranodon]: {
    modelFile: 'Pteranodon.bg3d',
    modelPath: 'Skeletons',
    modelIndex: 0,
    requiresSkeleton: true,
  },

  [ItemType.TriCeratops]: {
    modelFile: 'Triceratops.bg3d',
    modelPath: 'Skeletons',
    modelIndex: 0,
    requiresSkeleton: true,
    scale: 1.5,
  },

  [ItemType.Egg]: {
    modelFile: 'Global.bg3d',
    modelPath: 'Models3D',
    modelIndex: 3, // Egg model
    scale: 1.0,
    // Color based on egg type
    variantSelector: (params) => params.p0,
  },

  [ItemType.FuelPod]: {
    modelFile: 'Global.bg3d',
    modelPath: 'Models3D',
    modelIndex: 5, // Fuel pod
    scale: 0.8,
    offsetY: 20,
  },

  // ... more mappings
};
```

#### 2.4 Cro-Mag Rally Model Mapping

**File:** `src/data/items/cromagItemModelMapping.ts`

```typescript
import { ItemModelMapping } from './modelMapping/types';
import { ItemType } from './croMagItemType';

export const CROMAG_ITEM_MODEL_MAPPINGS: Record<number, ItemModelMapping | undefined> = {
  [ItemType.StartCoords]: undefined,

  // Track items
  [ItemType.ArrowSign]: {
    modelFile: 'Global.bg3d',
    modelPath: 'Models3D',
    modelIndex: 10, // Arrow sign
    scale: 1.0,
    // Rotation based on param
    rotationY: 0,
  },

  [ItemType.Tree]: {
    modelFile: 'Level_Jungle.bg3d',
    modelPath: 'Models3D',
    modelIndex: 0, // Tree
    // Tree type variant
    variantSelector: (params) => params.p0,
    scale: 1.0,
  },

  [ItemType.Rock]: {
    modelFile: 'Global.bg3d',
    modelPath: 'Models3D',
    modelIndex: 15, // Rock
    variantSelector: (params) => params.p0, // Rock size
    scale: 1.0,
  },

  [ItemType.Powerup]: {
    modelFile: 'Global.bg3d',
    modelPath: 'Models3D',
    modelIndex: 20, // Powerup box
    scale: 0.6,
    offsetY: 30,
  },

  // ... more mappings
};
```

#### 2.5 Billy Frontier Model Mapping

**File:** `src/data/items/billyFrontierItemModelMapping.ts`

```typescript
import { ItemModelMapping } from './modelMapping/types';
import { ItemType } from './billyFrontierItemType';

export const BILLY_FRONTIER_ITEM_MODEL_MAPPINGS: Record<number, ItemModelMapping | undefined> = {
  [ItemType.StartCoords]: undefined,

  [ItemType.Dueler]: {
    modelFile: 'Billy.bg3d',
    modelPath: 'Skeletons',
    modelIndex: 0,
    requiresSkeleton: true,
    // Dueler type determines character model
    variantSelector: (params) => params.p0,
  },

  [ItemType.Building]: {
    modelFile: 'Town.bg3d',
    modelPath: 'Models3D',
    modelIndex: 0, // Saloon base
    // Building type
    variantSelector: (params) => params.p0,
    scale: 1.0,
  },

  [ItemType.HeadStone]: {
    modelFile: 'Town.bg3d',
    modelPath: 'Models3D',
    modelIndex: 15, // Headstone variants
    variantSelector: (params) => params.p0,
  },

  [ItemType.Barrel]: {
    modelFile: 'Global.bg3d',
    modelPath: 'Models3D',
    modelIndex: 5, // Barrel
    // TNT barrel vs regular
    variantSelector: (params) => params.p0,
  },

  [ItemType.FrogMan_Shootout]: {
    modelFile: 'FrogMan.bg3d',
    modelPath: 'Skeletons',
    modelIndex: 0,
    requiresSkeleton: true,
  },

  // ... more mappings
};
```

### Phase 3: Unified Item Geometry Component

#### 3.1 Refactored ItemGeometry Component

**File:** `src/editor/threejs/ItemGeometry.tsx` (refactored)

```typescript
import React, { useMemo, useEffect } from 'react';
import { useAtomValue } from 'jotai';
import { Globals, Game } from '@/data/globals/globals';
import { Show3DItemModels } from '@/data/canvasView/canvasViewAtoms';
import { useItemModelCache } from './hooks/useItemModelCache';
import { getItemModelMappingForGame } from '@/data/items/modelMapping';
import { ItemData, HeaderData, TerrainData } from '@/python/structSpecs/LevelTypes';
import { getTerrainHeightAtPoint } from './fenceUtils/getTerrainHeightAtPoint';
import { ColoredCube, LoadingCube, ItemModel } from './itemComponents';

interface ItemGeometryProps {
  itemData: ItemData;
  headerData: HeaderData;
  terrainData: TerrainData;
}

const ITEM_SIZE = 50;

export const ItemGeometry: React.FC<ItemGeometryProps> = ({
  itemData,
  headerData,
  terrainData,
}) => {
  const globals = useAtomValue(Globals);
  const show3DItemModels = useAtomValue(Show3DItemModels);
  const { loadModel, getModel } = useItemModelCache();

  const items = itemData.Itms?.[1000]?.obj;

  // Skip 3D models for 2D games
  const supports3DModels = useMemo(() => {
    return globals.GAME_TYPE !== Game.MIGHTY_MIKE;
  }, [globals.GAME_TYPE]);

  // Group items by type for batch loading
  const itemsByType = useMemo(() => {
    if (!items) return new Map();
    const groups = new Map<number, typeof items>();
    items.forEach(item => {
      if (!groups.has(item.type)) {
        groups.set(item.type, []);
      }
      groups.get(item.type)?.push(item);
    });
    return groups;
  }, [items]);

  // Pre-load models for visible item types
  useEffect(() => {
    if (show3DItemModels && supports3DModels) {
      itemsByType.forEach((items, itemType) => {
        // Load base model
        loadModel(itemType).catch(console.error);
        
        // Load variants if needed
        const mapping = getItemModelMappingForGame(globals.GAME_TYPE, itemType);
        if (mapping?.variantSelector) {
          const variants = new Set<number>();
          items.forEach(item => {
            const variant = mapping.variantSelector?.({
              p0: item.p0,
              p1: item.p1,
              p2: item.p2,
              p3: item.p3,
            });
            if (variant !== undefined) variants.add(variant);
          });
          variants.forEach(variant => {
            loadModel(itemType, { p0: variant, p1: 0, p2: 0, p3: 0 }).catch(console.error);
          });
        }
      });
    }
  }, [show3DItemModels, supports3DModels, itemsByType, loadModel, globals.GAME_TYPE]);

  if (!items || items.length === 0) return null;

  return (
    <group name="items">
      {items.map((item, idx) => {
        const scale = globals.TILE_INGAME_SIZE / globals.TILE_SIZE;
        const worldX = item.x * scale;
        const worldZ = item.z * scale;

        const terrainY = getTerrainHeightAtPoint(
          item.x,
          item.z,
          headerData,
          terrainData,
          globals,
        );

        const mapping = getItemModelMappingForGame(globals.GAME_TYPE, item.type);
        const offsetY = mapping?.offsetY ?? 0;

        const position: [number, number, number] = [
          worldX,
          terrainY + ITEM_SIZE / 2 + offsetY,
          worldZ,
        ];

        // Try to render 3D model if enabled
        if (show3DItemModels && supports3DModels && mapping) {
          const variant = mapping.variantSelector?.({
            p0: item.p0,
            p1: item.p1,
            p2: item.p2,
            p3: item.p3,
          });
          
          const cachedModel = getModel(item.type, variant);

          if (cachedModel?.loading) {
            return (
              <LoadingCube
                key={`item-loading-${idx}`}
                position={position}
                itemType={item.type}
              />
            );
          }

          if (cachedModel?.scene && !cachedModel.error) {
            // Calculate rotation from item params
            let rotation = 0;
            if (item.p0 !== undefined) {
              // Most games use p0 or p1 for rotation
              // The mapping's rotationY provides base offset
              rotation = (mapping.rotationY ?? 0);
            }

            return (
              <ItemModel
                key={`item-model-${idx}`}
                position={position}
                rotation={rotation}
                scene={cachedModel.scene}
              />
            );
          }
        }

        // Fallback: colored cube
        return (
          <ColoredCube
            key={`item-cube-${idx}`}
            position={position}
            itemType={item.type}
          />
        );
      })}
    </group>
  );
};
```

### Phase 4: Game-Specific Hardcoding

#### 4.1 BG3D Index Discovery Tool

Create a tool to help discover correct model indices:

**File:** `scripts/discoverBG3DIndices.ts`

```typescript
#!/usr/bin/env ts-node

/**
 * Tool to list all models in a BG3D file with their indices
 * Usage: npx ts-node scripts/discoverBG3DIndices.ts <bg3d-file>
 */

import { parseBG3DFile } from '../src/modelParsers/parseBG3D';
import { readFileSync } from 'fs';

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: ts-node discoverBG3DIndices.ts <bg3d-file>');
    process.exit(1);
  }

  const buffer = readFileSync(filePath);
  const result = await parseBG3DFile(new Uint8Array(buffer));
  
  if (!result.ok) {
    console.error('Failed to parse:', result.error);
    process.exit(1);
  }

  console.log(`\nBG3D File: ${filePath}`);
  console.log('='.repeat(60));

  const { groups, textures } = result.value;

  console.log(`\nGroups (${groups.length}):`);
  groups.forEach((group, idx) => {
    const meshCount = group.meshes?.length ?? 0;
    const vertexCount = group.meshes?.reduce((sum, m) => sum + (m.vertices?.length ?? 0), 0) ?? 0;
    console.log(`  [${idx.toString().padStart(3)}] ${group.name ?? 'unnamed'} - ${meshCount} meshes, ${vertexCount} vertices`);
  });

  console.log(`\nTextures (${textures.length}):`);
  textures.forEach((tex, idx) => {
    console.log(`  [${idx.toString().padStart(3)}] ${tex.name ?? 'unnamed'} - ${tex.width}x${tex.height}`);
  });
}

main().catch(console.error);
```

#### 4.2 Model Mapping Discovery

Document the process for discovering model indices:

```markdown
## How to Find Model Indices

1. **Check source code headers** (e.g., `mobjtypes.h`)
   - Enums define the order of models in each BG3D file
   - Example: `FARM_ObjType_Barn = 1` means Barn is at index 1

2. **Run the discovery tool**
   ```bash
   npx ts-node scripts/discoverBG3DIndices.ts public/games/ottomatic/models/level1_farm.bg3d
   ```

3. **Match against game code**
   - Search for `gNewObjectDefinition.type = ` patterns
   - Note which enum value is assigned for each item type
```

---

## Testing Strategy

### Unit Tests
- Test model cache loading/caching
- Test mapping lookups for each game
- Test variant selector functions

### Visual Tests
- Playwright tests comparing rendered items
- Screenshot comparisons across games

### Manual Testing
- Load each game's levels
- Verify items render correctly
- Check positioning, scale, rotation

---

## File Summary

| File | Purpose |
|------|---------|
| `src/data/items/modelMapping/types.ts` | Shared mapping interface |
| `src/data/items/modelMapping/index.ts` | Game dispatcher |
| `src/data/items/bugdomItemModelMapping.ts` | Bugdom 1 mappings |
| `src/data/items/bugdom2ItemModelMapping.ts` | Bugdom 2 mappings |
| `src/data/items/nanosaur2ItemModelMapping.ts` | Nanosaur 2 mappings |
| `src/data/items/cromagItemModelMapping.ts` | Cro-Mag Rally mappings |
| `src/data/items/billyFrontierItemModelMapping.ts` | Billy Frontier mappings |
| `src/editor/threejs/hooks/useItemModelCache.ts` | Universal model cache |
| `src/editor/threejs/ItemGeometry.tsx` | Unified renderer |
| `scripts/discoverBG3DIndices.ts` | Model discovery tool |

---

## Implementation Order

1. **Phase 1**: Abstract model loading system
2. **Phase 2**: Per-game mappings (start with Billy Frontier as it's most documented)
3. **Phase 3**: Unified renderer component
4. **Phase 4**: Testing and refinement

---

## Risk Assessment

### High Risk
- Model index discovery requires trial-and-error for undocumented games
- Skeleton animation state may differ from static poses

### Medium Risk
- Scale/rotation parameters vary by game
- Some models require multiple meshes assembled

### Mitigation
- Create comprehensive discovery tooling
- Document all discovered indices
- Allow fallback to colored cubes

---

## Dependencies on Plan 1

This plan references the item parameter types defined in Plan 1 for:
- Variant selector parameters (rotation, type selection)
- Scale multiplier parameters
- Common parameter patterns

When implementing, refer to the `paramTypes.ts` definitions from Plan 1.
