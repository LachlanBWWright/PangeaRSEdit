# Dependency Injection and Byte-Accurate Roundtrip Tests

## Overview

This plan describes refactoring logic out of closures into functions with injected dependencies, enabling comprehensive unit tests that can "edit" a level by changing values, save it, load it again, change values back, and verify byte-for-byte accuracy between original and roundtripped levels.

## Problem Statement

### Current Architecture Issues

1. **Logic in Closures**: Many editing functions are defined inside React components as closures, capturing component state. This makes them difficult to test in isolation.

2. **Implicit Dependencies**: Functions rely on global atoms, context, and component state rather than explicit parameters.

3. **Existing Roundtrip Tests**: The project has extensive roundtrip testing for parsing and serialization:
   - `frontend/tests/mapRoundtrip/*.test.ts` - Per-game roundtrip tests
   - `frontend/tests/roundtrip/*.test.ts` - General roundtrip tests
   - `frontend/tests/validation/*.test.ts` - Data validation tests
   
   **However**, these tests verify parsing → serializing → parsing equality, NOT:
   - Loading → **Editing** → Saving → Loading consistency
   - Multiple edit operations being reversible
   - Byte-for-byte accuracy after edit + revert cycles

### Example of Current Pattern (Problematic)

```typescript
// Inside a React component
function handleItemMove(itemIdx: number, newX: number, newZ: number) {
  // Relies on captured setItemData from component state
  setItemData((draft) => {
    const items = draft.Itms?.[1000]?.obj;
    if (items && items[itemIdx]) {
      items[itemIdx].x = newX;
      items[itemIdx].z = newZ;
    }
  });
}
```

This cannot be tested without rendering the component.

---

## Goals

1. Extract editing logic into pure functions with explicit dependencies
2. Create a "Level Editor Service" that manages level state
3. Build comprehensive roundtrip tests that:
   - Load a level
   - Apply a series of edits
   - Save the level
   - Load the saved level
   - Reverse the edits
   - Verify byte-for-byte match with original
4. Ensure all games are covered by these tests

---

## Phase 1: Define Edit Operations

### 1.1 Edit Operation Types

**File:** `frontend/src/data/levelEdit/editOperations.ts`

```typescript
import { TerrainItem, SplineNub, Fence, Liquid } from "@/python/structSpecs/LevelTypes";

/**
 * Discriminated union of all possible edit operations
 * Each operation should be reversible
 */
export type EditOperation =
  | MoveItemOperation
  | UpdateItemParamsOperation
  | DeleteItemOperation
  | AddItemOperation
  | MoveSplineNubOperation
  | AddSplineNubOperation
  | DeleteSplineNubOperation
  | MoveFenceNubOperation
  | UpdateTerrainHeightOperation
  | UpdateTileAttributeOperation
  | UpdateHeaderOperation
  | AddSplineItemOperation
  | DeleteSplineItemOperation
  | UpdateLiquidOperation;

/**
 * Move an item to new coordinates
 */
export interface MoveItemOperation {
  type: "MoveItem";
  itemIndex: number;
  oldX: number;
  oldZ: number;
  newX: number;
  newZ: number;
}

/**
 * Update item parameters
 */
export interface UpdateItemParamsOperation {
  type: "UpdateItemParams";
  itemIndex: number;
  oldParams: { flags: number; p0: number; p1: number; p2: number; p3: number };
  newParams: { flags: number; p0: number; p1: number; p2: number; p3: number };
}

/**
 * Delete an item
 */
export interface DeleteItemOperation {
  type: "DeleteItem";
  itemIndex: number;
  deletedItem: TerrainItem;
}

/**
 * Add a new item
 */
export interface AddItemOperation {
  type: "AddItem";
  item: TerrainItem;
  insertIndex?: number;  // Where to insert, or end if undefined
}

/**
 * Move a spline control point
 */
export interface MoveSplineNubOperation {
  type: "MoveSplineNub";
  splineIndex: number;
  nubIndex: number;
  oldX: number;
  oldZ: number;
  newX: number;
  newZ: number;
}

/**
 * Add a spline nub
 */
export interface AddSplineNubOperation {
  type: "AddSplineNub";
  splineIndex: number;
  insertIndex: number;
  nub: SplineNub;
}

/**
 * Delete a spline nub
 */
export interface DeleteSplineNubOperation {
  type: "DeleteSplineNub";
  splineIndex: number;
  nubIndex: number;
  deletedNub: SplineNub;
}

/**
 * Move a fence nub
 */
export interface MoveFenceNubOperation {
  type: "MoveFenceNub";
  fenceIndex: number;
  nubIndex: number;
  oldX: number;
  oldY: number;
  newX: number;
  newY: number;
}

/**
 * Update terrain height at a coordinate
 */
export interface UpdateTerrainHeightOperation {
  type: "UpdateTerrainHeight";
  x: number;
  z: number;
  oldHeight: number;
  newHeight: number;
  affectsRoof?: boolean;  // For Bugdom 1
}

/**
 * Update tile attribute
 */
export interface UpdateTileAttributeOperation {
  type: "UpdateTileAttribute";
  x: number;
  z: number;
  oldAttribute: { flags: number; p0: number; p1: number };
  newAttribute: { flags: number; p0: number; p1: number };
}

/**
 * Update header field
 */
export interface UpdateHeaderOperation {
  type: "UpdateHeader";
  field: string;
  oldValue: number;
  newValue: number;
}

/**
 * Add spline item
 */
export interface AddSplineItemOperation {
  type: "AddSplineItem";
  splineIndex: number;
  item: SplineItem;
}

/**
 * Delete spline item
 */
export interface DeleteSplineItemOperation {
  type: "DeleteSplineItem";
  splineIndex: number;
  itemIndex: number;
  deletedItem: SplineItem;
}

/**
 * Update liquid/water body
 */
export interface UpdateLiquidOperation {
  type: "UpdateLiquid";
  liquidIndex: number;
  oldLiquid: Liquid;
  newLiquid: Liquid;
}
```

### 1.2 Operation Reversibility

**File:** `frontend/src/data/levelEdit/editOperationReverse.ts`

```typescript
import { EditOperation } from "./editOperations";

/**
 * Create the reverse of an edit operation
 * Applying the reverse undoes the original operation
 */
export function reverseOperation(op: EditOperation): EditOperation {
  switch (op.type) {
    case "MoveItem":
      return {
        ...op,
        oldX: op.newX,
        oldZ: op.newZ,
        newX: op.oldX,
        newZ: op.oldZ,
      };
      
    case "UpdateItemParams":
      return {
        ...op,
        oldParams: op.newParams,
        newParams: op.oldParams,
      };
      
    case "DeleteItem":
      return {
        type: "AddItem",
        item: op.deletedItem,
        insertIndex: op.itemIndex,
      };
      
    case "AddItem":
      // Find the index where item was added
      return {
        type: "DeleteItem",
        itemIndex: op.insertIndex ?? -1,  // -1 means last
        deletedItem: op.item,
      };
      
    case "MoveSplineNub":
      return {
        ...op,
        oldX: op.newX,
        oldZ: op.newZ,
        newX: op.oldX,
        newZ: op.oldZ,
      };
      
    case "UpdateTerrainHeight":
      return {
        ...op,
        oldHeight: op.newHeight,
        newHeight: op.oldHeight,
      };
      
    case "UpdateTileAttribute":
      return {
        ...op,
        oldAttribute: op.newAttribute,
        newAttribute: op.oldAttribute,
      };
      
    case "UpdateHeader":
      return {
        ...op,
        oldValue: op.newValue,
        newValue: op.oldValue,
      };
      
    // ... handle other operation types
      
    default:
      throw new Error(`Cannot reverse operation type: ${(op as EditOperation).type}`);
  }
}

/**
 * Reverse a list of operations (in reverse order)
 */
export function reverseOperations(ops: EditOperation[]): EditOperation[] {
  return ops.map(reverseOperation).reverse();
}
```

---

## Phase 2: Level Editor Service

### 2.1 Level Editor Core

**File:** `frontend/src/data/levelEdit/levelEditorService.ts`

```typescript
import { LevelData } from "@/python/structSpecs/LevelTypes";
import { GlobalsInterface } from "@/data/globals/globals";
import { EditOperation } from "./editOperations";
import { reverseOperation } from "./editOperationReverse";
import { produce } from "immer";

/**
 * Service for applying edit operations to level data
 * Uses Immer for immutable updates
 */
export class LevelEditorService {
  /**
   * Apply a single edit operation to level data
   * Returns new level data (immutable)
   */
  applyOperation(
    levelData: LevelData,
    operation: EditOperation,
    globals: GlobalsInterface,
  ): LevelData {
    return produce(levelData, (draft) => {
      this.applyOperationMutably(draft, operation, globals);
    });
  }
  
  /**
   * Apply multiple operations in sequence
   */
  applyOperations(
    levelData: LevelData,
    operations: EditOperation[],
    globals: GlobalsInterface,
  ): LevelData {
    return operations.reduce(
      (data, op) => this.applyOperation(data, op, globals),
      levelData,
    );
  }
  
  /**
   * Apply operation mutably (for use inside Immer produce)
   */
  private applyOperationMutably(
    draft: LevelData,
    operation: EditOperation,
    globals: GlobalsInterface,
  ): void {
    switch (operation.type) {
      case "MoveItem":
        this.applyMoveItem(draft, operation);
        break;
        
      case "UpdateItemParams":
        this.applyUpdateItemParams(draft, operation);
        break;
        
      case "DeleteItem":
        this.applyDeleteItem(draft, operation);
        break;
        
      case "AddItem":
        this.applyAddItem(draft, operation);
        break;
        
      case "MoveSplineNub":
        this.applyMoveSplineNub(draft, operation, globals);
        break;
        
      case "UpdateTerrainHeight":
        this.applyUpdateTerrainHeight(draft, operation, globals);
        break;
        
      case "UpdateTileAttribute":
        this.applyUpdateTileAttribute(draft, operation, globals);
        break;
        
      case "UpdateHeader":
        this.applyUpdateHeader(draft, operation);
        break;
        
      // ... other operation types
        
      default:
        throw new Error(`Unknown operation type: ${(operation as EditOperation).type}`);
    }
  }
  
  private applyMoveItem(draft: LevelData, op: MoveItemOperation): void {
    const items = draft.Itms?.[1000]?.obj;
    if (items && items[op.itemIndex]) {
      items[op.itemIndex].x = op.newX;
      items[op.itemIndex].z = op.newZ;
    }
  }
  
  private applyUpdateItemParams(draft: LevelData, op: UpdateItemParamsOperation): void {
    const items = draft.Itms?.[1000]?.obj;
    if (items && items[op.itemIndex]) {
      const item = items[op.itemIndex];
      item.flags = op.newParams.flags;
      item.p0 = op.newParams.p0;
      item.p1 = op.newParams.p1;
      item.p2 = op.newParams.p2;
      item.p3 = op.newParams.p3;
    }
  }
  
  private applyDeleteItem(draft: LevelData, op: DeleteItemOperation): void {
    const items = draft.Itms?.[1000]?.obj;
    if (items) {
      items.splice(op.itemIndex, 1);
      // Update header
      const header = draft.Hedr[1000].obj;
      header.numItems = items.length;
    }
  }
  
  private applyAddItem(draft: LevelData, op: AddItemOperation): void {
    const items = draft.Itms?.[1000]?.obj;
    if (items) {
      if (op.insertIndex !== undefined && op.insertIndex >= 0) {
        items.splice(op.insertIndex, 0, op.item);
      } else {
        items.push(op.item);
      }
      // Update header
      const header = draft.Hedr[1000].obj;
      header.numItems = items.length;
    }
  }
  
  private applyMoveSplineNub(
    draft: LevelData,
    op: MoveSplineNubOperation,
    globals: GlobalsInterface,
  ): void {
    const splineKey = 1000 + op.splineIndex;
    const nubs = draft.SpNb?.[splineKey]?.obj;
    if (nubs && nubs[op.nubIndex]) {
      nubs[op.nubIndex].x = op.newX;
      nubs[op.nubIndex].z = op.newZ;
      
      // Recalculate spline points
      const newPoints = getPoints(nubs);
      const spPt = draft.SpPt?.[splineKey];
      if (spPt) spPt.obj = newPoints;
      
      // Update spline header
      const spln = draft.Spln?.[1000]?.obj?.[op.splineIndex];
      if (spln) {
        spln.numPoints = newPoints.length;
      }
    }
  }
  
  private applyUpdateTerrainHeight(
    draft: LevelData,
    op: UpdateTerrainHeightOperation,
    globals: GlobalsInterface,
  ): void {
    const header = draft.Hedr[1000].obj;
    const mapWidth = header.mapWidth;
    const index = op.z * (mapWidth + 1) + op.x;
    
    const ycrd = draft.YCrd[1000].obj;
    if (ycrd && index >= 0 && index < ycrd.length) {
      ycrd[index] = op.newHeight;
    }
    
    // Handle roof (Bugdom 1)
    if (op.affectsRoof && draft.YCrd[1001]) {
      const roofYcrd = draft.YCrd[1001].obj;
      if (roofYcrd && index >= 0 && index < roofYcrd.length) {
        roofYcrd[index] = op.newHeight;
      }
    }
  }
  
  private applyUpdateTileAttribute(
    draft: LevelData,
    op: UpdateTileAttributeOperation,
    globals: GlobalsInterface,
  ): void {
    const header = draft.Hedr[1000].obj;
    const mapWidth = header.mapWidth;
    const index = op.z * mapWidth + op.x;
    
    const atrb = draft.Atrb[1000].obj;
    if (atrb && index >= 0 && index < atrb.length) {
      atrb[index] = {
        flags: op.newAttribute.flags,
        p0: op.newAttribute.p0,
        p1: op.newAttribute.p1,
      };
    }
  }
  
  private applyUpdateHeader(draft: LevelData, op: UpdateHeaderOperation): void {
    const header = draft.Hedr[1000].obj;
    if (op.field in header) {
      (header as Record<string, unknown>)[op.field] = op.newValue;
    }
  }
}

// Singleton instance
export const levelEditor = new LevelEditorService();
```

### 2.2 Operation Factory Functions

**File:** `frontend/src/data/levelEdit/operationFactories.ts`

```typescript
import { LevelData, TerrainItem, SplineNub } from "@/python/structSpecs/LevelTypes";
import { EditOperation, MoveItemOperation, UpdateItemParamsOperation } from "./editOperations";

/**
 * Create a MoveItem operation from current level data
 */
export function createMoveItemOperation(
  levelData: LevelData,
  itemIndex: number,
  newX: number,
  newZ: number,
): MoveItemOperation | null {
  const item = levelData.Itms?.[1000]?.obj?.[itemIndex];
  if (!item) return null;
  
  return {
    type: "MoveItem",
    itemIndex,
    oldX: item.x,
    oldZ: item.z,
    newX,
    newZ,
  };
}

/**
 * Create operation to update item parameters
 */
export function createUpdateItemParamsOperation(
  levelData: LevelData,
  itemIndex: number,
  newParams: Partial<{ flags: number; p0: number; p1: number; p2: number; p3: number }>,
): UpdateItemParamsOperation | null {
  const item = levelData.Itms?.[1000]?.obj?.[itemIndex];
  if (!item) return null;
  
  return {
    type: "UpdateItemParams",
    itemIndex,
    oldParams: {
      flags: item.flags,
      p0: item.p0,
      p1: item.p1,
      p2: item.p2,
      p3: item.p3,
    },
    newParams: {
      flags: newParams.flags ?? item.flags,
      p0: newParams.p0 ?? item.p0,
      p1: newParams.p1 ?? item.p1,
      p2: newParams.p2 ?? item.p2,
      p3: newParams.p3 ?? item.p3,
    },
  };
}

/**
 * Create operation to move spline nub
 */
export function createMoveSplineNubOperation(
  levelData: LevelData,
  splineIndex: number,
  nubIndex: number,
  newX: number,
  newZ: number,
): MoveSplineNubOperation | null {
  const nub = levelData.SpNb?.[1000 + splineIndex]?.obj?.[nubIndex];
  if (!nub) return null;
  
  return {
    type: "MoveSplineNub",
    splineIndex,
    nubIndex,
    oldX: nub.x,
    oldZ: nub.z,
    newX,
    newZ,
  };
}

// ... more factory functions for other operations
```

---

## Phase 3: Roundtrip Test Infrastructure

### 3.1 Test Utilities

**File:** `frontend/tests/levelEdit/testUtils.ts`

```typescript
import { LevelData } from "@/python/structSpecs/LevelTypes";
import { GlobalsInterface } from "@/data/globals/globals";
import { EditOperation } from "@/data/levelEdit/editOperations";
import { levelEditor } from "@/data/levelEdit/levelEditorService";
import { reverseOperations } from "@/data/levelEdit/editOperationReverse";

/**
 * Serialize level data to bytes using rsrcdump
 */
export async function serializeLevelData(
  levelData: LevelData,
  globals: GlobalsInterface,
): Promise<Uint8Array> {
  // Use rsrcdump-ts to serialize
  const { loadBytesFromJsonAsync } = await import("@lachlanbwwright/rsrcdump-ts");
  const result = await loadBytesFromJsonAsync(levelData, globals.STRUCT_SPECS, [], []);
  if (!result.ok) throw new Error("Failed to serialize level data");
  return result.value;
}

/**
 * Parse bytes to level data using rsrcdump
 */
export async function parseLevelData(
  bytes: Uint8Array,
  globals: GlobalsInterface,
): Promise<LevelData> {
  const { saveToJson } = await import("@lachlanbwwright/rsrcdump-ts");
  const result = await saveToJson(bytes, globals.STRUCT_SPECS, [], []);
  if (!result.ok) throw new Error("Failed to parse level data");
  return JSON.parse(result.value) as LevelData;
}

/**
 * Compare two byte arrays
 */
export function compareBytes(
  original: Uint8Array,
  roundtrip: Uint8Array,
): { match: boolean; firstDiff: number | null; diffCount: number } {
  const minLength = Math.min(original.length, roundtrip.length);
  let firstDiff: number | null = null;
  let diffCount = 0;
  
  for (let i = 0; i < minLength; i++) {
    if (original[i] !== roundtrip[i]) {
      if (firstDiff === null) firstDiff = i;
      diffCount++;
    }
  }
  
  // Account for length difference
  const lengthDiff = Math.abs(original.length - roundtrip.length);
  diffCount += lengthDiff;
  if (firstDiff === null && lengthDiff > 0) {
    firstDiff = minLength;
  }
  
  return {
    match: diffCount === 0,
    firstDiff,
    diffCount,
  };
}

/**
 * Perform full edit roundtrip test
 */
export async function testEditRoundtrip(
  originalBytes: Uint8Array,
  globals: GlobalsInterface,
  operations: EditOperation[],
): Promise<{
  success: boolean;
  message: string;
  byteComparison?: ReturnType<typeof compareBytes>;
}> {
  try {
    // 1. Parse original level
    const originalData = await parseLevelData(originalBytes, globals);
    
    // 2. Apply edit operations
    const editedData = levelEditor.applyOperations(originalData, operations, globals);
    
    // 3. Serialize edited level
    const editedBytes = await serializeLevelData(editedData, globals);
    
    // 4. Parse edited level
    const reloadedData = await parseLevelData(editedBytes, globals);
    
    // 5. Apply reverse operations
    const reverseOps = reverseOperations(operations);
    const restoredData = levelEditor.applyOperations(reloadedData, reverseOps, globals);
    
    // 6. Serialize restored level
    const restoredBytes = await serializeLevelData(restoredData, globals);
    
    // 7. Compare with original
    const comparison = compareBytes(originalBytes, restoredBytes);
    
    if (comparison.match) {
      return {
        success: true,
        message: "Byte-for-byte roundtrip successful",
        byteComparison: comparison,
      };
    } else {
      return {
        success: false,
        message: `Roundtrip failed: ${comparison.diffCount} bytes differ, first at offset ${comparison.firstDiff}`,
        byteComparison: comparison,
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Roundtrip error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
```

### 3.2 Operation Generators for Testing

**File:** `frontend/tests/levelEdit/operationGenerators.ts`

```typescript
import { LevelData, TerrainItem } from "@/python/structSpecs/LevelTypes";
import { EditOperation, MoveItemOperation, UpdateItemParamsOperation } from "@/data/levelEdit/editOperations";

/**
 * Generate random valid move operations for items in a level
 */
export function generateRandomMoveOperations(
  levelData: LevelData,
  count: number,
): MoveItemOperation[] {
  const items = levelData.Itms?.[1000]?.obj ?? [];
  if (items.length === 0) return [];
  
  const operations: MoveItemOperation[] = [];
  
  for (let i = 0; i < count; i++) {
    const itemIndex = Math.floor(Math.random() * items.length);
    const item = items[itemIndex];
    if (!item) continue;
    
    // Random offset within reasonable bounds
    const offsetX = Math.round((Math.random() - 0.5) * 200);
    const offsetZ = Math.round((Math.random() - 0.5) * 200);
    
    operations.push({
      type: "MoveItem",
      itemIndex,
      oldX: item.x,
      oldZ: item.z,
      newX: item.x + offsetX,
      newZ: item.z + offsetZ,
    });
  }
  
  return operations;
}

/**
 * Generate operations that modify every item in a level
 */
export function generateExhaustiveItemOperations(
  levelData: LevelData,
): EditOperation[] {
  const items = levelData.Itms?.[1000]?.obj ?? [];
  const operations: EditOperation[] = [];
  
  items.forEach((item, index) => {
    // Move each item
    operations.push({
      type: "MoveItem",
      itemIndex: index,
      oldX: item.x,
      oldZ: item.z,
      newX: item.x + 10,
      newZ: item.z + 10,
    });
    
    // Modify params
    operations.push({
      type: "UpdateItemParams",
      itemIndex: index,
      oldParams: { flags: item.flags, p0: item.p0, p1: item.p1, p2: item.p2, p3: item.p3 },
      newParams: { flags: item.flags + 1, p0: item.p0 + 1, p1: item.p1, p2: item.p2, p3: item.p3 },
    });
  });
  
  return operations;
}

/**
 * Generate operations for terrain height changes
 */
export function generateTerrainHeightOperations(
  levelData: LevelData,
  count: number,
): EditOperation[] {
  const header = levelData.Hedr[1000].obj;
  const mapWidth = header.mapWidth;
  const mapHeight = header.mapHeight;
  const operations: EditOperation[] = [];
  
  const ycrd = levelData.YCrd[1000].obj;
  if (!ycrd) return [];
  
  for (let i = 0; i < count; i++) {
    const x = Math.floor(Math.random() * (mapWidth + 1));
    const z = Math.floor(Math.random() * (mapHeight + 1));
    const index = z * (mapWidth + 1) + x;
    
    if (index >= 0 && index < ycrd.length) {
      const oldHeight = ycrd[index];
      operations.push({
        type: "UpdateTerrainHeight",
        x,
        z,
        oldHeight,
        newHeight: oldHeight + Math.round((Math.random() - 0.5) * 100),
      });
    }
  }
  
  return operations;
}
```

---

## Phase 4: Comprehensive Test Suite

### 4.1 Per-Game Roundtrip Tests

**File:** `frontend/tests/levelEdit/editRoundtrip.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { 
  OttoGlobals, 
  Bugdom2Globals, 
  BugdomGlobals,
  NanosaurGlobals,
  Nanosaur2Globals,
  CroMagGlobals,
  BillyFrontierGlobals,
  GlobalsInterface,
} from "@/data/globals/globals";
import { testEditRoundtrip } from "./testUtils";
import { 
  generateRandomMoveOperations,
  generateExhaustiveItemOperations,
  generateTerrainHeightOperations,
} from "./operationGenerators";
import { parseLevelData } from "./testUtils";

interface GameTestConfig {
  name: string;
  globals: GlobalsInterface;
  testFile: string;
}

const GAMES: GameTestConfig[] = [
  { 
    name: "Otto Matic", 
    globals: OttoGlobals, 
    testFile: "games/ottomatic/Data/Terrain/Level1_Farm.ter.rsrc" 
  },
  { 
    name: "Bugdom 2", 
    globals: Bugdom2Globals, 
    testFile: "games/bugdom2/Data/Terrain/Level1.ter.rsrc" 
  },
  { 
    name: "Bugdom", 
    globals: BugdomGlobals, 
    testFile: "games/bugdom/Data/Terrain/lawn.ter" 
  },
  { 
    name: "Nanosaur 2", 
    globals: Nanosaur2Globals, 
    testFile: "games/nanosaur2/Data/Terrain/Level1.ter.rsrc" 
  },
  { 
    name: "Cro-Mag Rally", 
    globals: CroMagGlobals, 
    testFile: "games/cromagrally/Data/Terrain/Track1.ter.rsrc" 
  },
  { 
    name: "Billy Frontier", 
    globals: BillyFrontierGlobals, 
    testFile: "games/billyfrontier/Data/Terrain/Level1.ter.rsrc" 
  },
];

describe("Edit Roundtrip Tests", () => {
  for (const game of GAMES) {
    describe(game.name, () => {
      const filePath = join(__dirname, "../../../", game.testFile);
      
      if (!existsSync(filePath)) {
        it.skip(`should have test file: ${game.testFile}`, () => {});
        return;
      }
      
      const originalBytes = new Uint8Array(readFileSync(filePath));
      
      it("should roundtrip with no edits", async () => {
        const result = await testEditRoundtrip(originalBytes, game.globals, []);
        expect(result.success).toBe(true);
      }, 30000);
      
      it("should roundtrip with random item moves", async () => {
        const levelData = await parseLevelData(originalBytes, game.globals);
        const operations = generateRandomMoveOperations(levelData, 10);
        
        const result = await testEditRoundtrip(originalBytes, game.globals, operations);
        expect(result.success).toBe(true);
      }, 30000);
      
      it("should roundtrip with exhaustive item edits", async () => {
        const levelData = await parseLevelData(originalBytes, game.globals);
        const operations = generateExhaustiveItemOperations(levelData);
        
        const result = await testEditRoundtrip(originalBytes, game.globals, operations);
        expect(result.success).toBe(true);
      }, 60000);
      
      it("should roundtrip with terrain height changes", async () => {
        const levelData = await parseLevelData(originalBytes, game.globals);
        const operations = generateTerrainHeightOperations(levelData, 50);
        
        const result = await testEditRoundtrip(originalBytes, game.globals, operations);
        expect(result.success).toBe(true);
      }, 30000);
      
      it("should roundtrip with mixed operations", async () => {
        const levelData = await parseLevelData(originalBytes, game.globals);
        const operations = [
          ...generateRandomMoveOperations(levelData, 5),
          ...generateTerrainHeightOperations(levelData, 10),
        ];
        
        const result = await testEditRoundtrip(originalBytes, game.globals, operations);
        expect(result.success).toBe(true);
      }, 30000);
    });
  }
});
```

### 4.2 Unit Tests for Edit Operations

**File:** `frontend/tests/levelEdit/editOperations.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { levelEditor } from "@/data/levelEdit/levelEditorService";
import { reverseOperation, reverseOperations } from "@/data/levelEdit/editOperationReverse";
import { OttoGlobals } from "@/data/globals/globals";
import { createMockLevelData } from "./mocks";

describe("Edit Operations", () => {
  describe("MoveItem", () => {
    it("should move item to new position", () => {
      const levelData = createMockLevelData({ numItems: 5 });
      const original = levelData.Itms![1000].obj[0];
      
      const result = levelEditor.applyOperation(levelData, {
        type: "MoveItem",
        itemIndex: 0,
        oldX: original.x,
        oldZ: original.z,
        newX: 500,
        newZ: 600,
      }, OttoGlobals);
      
      expect(result.Itms![1000].obj[0].x).toBe(500);
      expect(result.Itms![1000].obj[0].z).toBe(600);
    });
    
    it("should be reversible", () => {
      const op = {
        type: "MoveItem" as const,
        itemIndex: 0,
        oldX: 100,
        oldZ: 200,
        newX: 500,
        newZ: 600,
      };
      
      const reversed = reverseOperation(op);
      
      expect(reversed.type).toBe("MoveItem");
      expect(reversed.newX).toBe(100);
      expect(reversed.newZ).toBe(200);
      expect(reversed.oldX).toBe(500);
      expect(reversed.oldZ).toBe(600);
    });
  });
  
  describe("DeleteItem / AddItem", () => {
    it("delete should be reversed by add", () => {
      const levelData = createMockLevelData({ numItems: 5 });
      const item = levelData.Itms![1000].obj[2];
      
      // Delete item
      const afterDelete = levelEditor.applyOperation(levelData, {
        type: "DeleteItem",
        itemIndex: 2,
        deletedItem: item,
      }, OttoGlobals);
      
      expect(afterDelete.Itms![1000].obj.length).toBe(4);
      
      // Reverse (add back)
      const reverseOp = reverseOperation({
        type: "DeleteItem",
        itemIndex: 2,
        deletedItem: item,
      });
      
      const restored = levelEditor.applyOperation(afterDelete, reverseOp, OttoGlobals);
      
      expect(restored.Itms![1000].obj.length).toBe(5);
      expect(restored.Itms![1000].obj[2]).toEqual(item);
    });
  });
  
  // ... more tests for other operations
});
```

---

## Phase 5: Refactor Component Handlers

### 5.1 Extract Handlers from Components

**Before (in component):**
```typescript
function ItemPanel() {
  const [itemData, setItemData] = useAtom(ItemDataAtom);
  
  const handleMoveItem = (idx, x, z) => {
    setItemData(draft => {
      draft.Itms[1000].obj[idx].x = x;
      draft.Itms[1000].obj[idx].z = z;
    });
  };
}
```

**After (extracted):**

**File:** `frontend/src/editor/handlers/itemHandlers.ts`

```typescript
import { Updater } from "use-immer";
import { ItemData, LevelData } from "@/python/structSpecs/LevelTypes";
import { levelEditor } from "@/data/levelEdit/levelEditorService";
import { createMoveItemOperation } from "@/data/levelEdit/operationFactories";
import { GlobalsInterface } from "@/data/globals/globals";

/**
 * Create item movement handler
 * Returns a function that can be used in components
 */
export function createMoveItemHandler(
  setItemData: Updater<ItemData | null>,
  getLevelData: () => LevelData,
  globals: GlobalsInterface,
) {
  return (itemIndex: number, newX: number, newZ: number) => {
    const levelData = getLevelData();
    const operation = createMoveItemOperation(levelData, itemIndex, newX, newZ);
    if (!operation) return;
    
    setItemData((draft) => {
      if (!draft) return;
      const items = draft.Itms?.[1000]?.obj;
      if (items && items[itemIndex]) {
        items[itemIndex].x = operation.newX;
        items[itemIndex].z = operation.newZ;
      }
    });
    
    // Optionally track operation for undo/redo
    // undoStack.push(operation);
  };
}

/**
 * Create item parameter update handler
 */
export function createUpdateItemParamsHandler(
  setItemData: Updater<ItemData | null>,
  getLevelData: () => LevelData,
  globals: GlobalsInterface,
) {
  return (
    itemIndex: number,
    params: Partial<{ flags: number; p0: number; p1: number; p2: number; p3: number }>,
  ) => {
    setItemData((draft) => {
      if (!draft) return;
      const item = draft.Itms?.[1000]?.obj?.[itemIndex];
      if (item) {
        if (params.flags !== undefined) item.flags = params.flags;
        if (params.p0 !== undefined) item.p0 = params.p0;
        if (params.p1 !== undefined) item.p1 = params.p1;
        if (params.p2 !== undefined) item.p2 = params.p2;
        if (params.p3 !== undefined) item.p3 = params.p3;
      }
    });
  };
}
```

### 5.2 Use Handlers in Components

```typescript
function ItemPanel() {
  const [itemData, setItemData] = useAtom(ItemDataAtom);
  const globals = useAtomValue(Globals);
  const getLevelData = useCallback(() => /* construct LevelData */, [itemData, /* ... */]);
  
  const handleMoveItem = useMemo(
    () => createMoveItemHandler(setItemData, getLevelData, globals),
    [setItemData, getLevelData, globals]
  );
  
  const handleUpdateParams = useMemo(
    () => createUpdateItemParamsHandler(setItemData, getLevelData, globals),
    [setItemData, getLevelData, globals]
  );
  
  // Use handlers
  // ...
}
```

---

## File Summary

### New Files to Create

```
frontend/src/data/levelEdit/
├── index.ts                     # Export all
├── editOperations.ts            # Operation type definitions
├── editOperationReverse.ts      # Reverse operations
├── levelEditorService.ts        # Core editor service
└── operationFactories.ts        # Operation creation helpers

frontend/src/editor/handlers/
├── index.ts                     # Export all handlers
├── itemHandlers.ts              # Item editing handlers
├── splineHandlers.ts            # Spline editing handlers
├── terrainHandlers.ts           # Terrain editing handlers
└── fenceHandlers.ts             # Fence editing handlers

frontend/tests/levelEdit/
├── testUtils.ts                 # Test utilities
├── operationGenerators.ts       # Test data generators
├── mocks.ts                     # Mock level data
├── editOperations.test.ts       # Unit tests
└── editRoundtrip.test.ts        # Integration tests
```

### Files to Modify

Component files to refactor handlers:
- `frontend/src/editor/subviews/Items.tsx`
- `frontend/src/editor/subviews/splines/Spline.tsx`
- `frontend/src/editor/subviews/Fences.tsx`
- `frontend/src/editor/threejs/Three.tsx`
- etc.

---

## Implementation Order

1. **Phase 1**: Define edit operation types (2 hours)
2. **Phase 2**: Build level editor service (4 hours)
3. **Phase 3**: Create test infrastructure (4 hours)
4. **Phase 4**: Implement comprehensive tests (6 hours)
5. **Phase 5**: Refactor component handlers (8 hours)

**Total estimated effort**: 24 hours

---

## Success Criteria

1. All edit operations are reversible
2. Byte-for-byte roundtrip passes for all supported games
3. Component handlers are extracted and testable
4. CI runs roundtrip tests on every commit
5. Test coverage > 80% for level editing logic
