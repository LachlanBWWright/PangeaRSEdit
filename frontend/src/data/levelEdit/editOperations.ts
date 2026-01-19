import { TerrainItem, SplineNub, Fence, Liquid, SplineItem } from "@/python/structSpecs/LevelTypes";

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
  oldY: number; // Fence nubs are x,y (2D) in the struct definition I saw earlier?
  newX: number;
  newY: number;
}
// Note: FenceNub is [number, number] in LevelTypes.ts.

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
  insertIndex?: number;
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
