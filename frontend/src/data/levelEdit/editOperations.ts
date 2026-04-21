/**
 * Edit Operations for Level Data
 * 
 * Discriminated union types for all possible level editing operations.
 * Each operation is designed to be reversible for undo/redo support.
 * 
 * These types enable pure function implementations that can be tested
 * independently of React components.
 */

import type {
  TerrainItem,
  SplineNub,
} from "@/python/structSpecs/LevelTypes";
import { Result } from "neverthrow";
import { ok, err } from "neverthrow";

/**
 * All possible edit operations that can be performed on level data.
 * Each operation captures the data needed to apply and reverse it.
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
  | UpdateTileAttributeOperation;

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
 * Update item parameters (flags and p0-p3)
 */
export interface UpdateItemParamsOperation {
  type: "UpdateItemParams";
  itemIndex: number;
  oldParams: ItemParams;
  newParams: ItemParams;
}

export interface ItemParams {
  flags: number;
  p0: number;
  p1: number;
  p2: number;
  p3: number;
}

/**
 * Delete an item from the level
 */
export interface DeleteItemOperation {
  type: "DeleteItem";
  itemIndex: number;
  deletedItem: TerrainItem;
}

/**
 * Add a new item to the level
 */
export interface AddItemOperation {
  type: "AddItem";
  item: TerrainItem;
  insertIndex?: number;
}

/**
 * Move a spline control point (nub)
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
 * Add a new nub to a spline
 */
export interface AddSplineNubOperation {
  type: "AddSplineNub";
  splineIndex: number;
  insertIndex: number;
  nub: SplineNub;
}

/**
 * Delete a nub from a spline
 */
export interface DeleteSplineNubOperation {
  type: "DeleteSplineNub";
  splineIndex: number;
  nubIndex: number;
  deletedNub: SplineNub;
}

/**
 * Move a fence control point
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
  layer?: number;
}

/**
 * Update tile attribute at a coordinate
 */
export interface UpdateTileAttributeOperation {
  type: "UpdateTileAttribute";
  x: number;
  z: number;
  oldAttribute: TileAttribute;
  newAttribute: TileAttribute;
}

export interface TileAttribute {
  flags: number;
  p0: number;
  p1: number;
}

/**
 * Create a reverse operation for undo support.
 * Returns the operation that would undo the given operation.
 */
export function reverseOperation(op: EditOperation): EditOperation {
  switch (op.type) {
    case "MoveItem":
      return {
        type: "MoveItem",
        itemIndex: op.itemIndex,
        oldX: op.newX,
        oldZ: op.newZ,
        newX: op.oldX,
        newZ: op.oldZ,
      };

    case "UpdateItemParams":
      return {
        type: "UpdateItemParams",
        itemIndex: op.itemIndex,
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
      // For undoing an add, we need the added item's data
      // This assumes the add was at the end if no insertIndex
      return {
        type: "DeleteItem",
        itemIndex: op.insertIndex ?? -1, // -1 means last item
        deletedItem: op.item,
      };

    case "MoveSplineNub":
      return {
        type: "MoveSplineNub",
        splineIndex: op.splineIndex,
        nubIndex: op.nubIndex,
        oldX: op.newX,
        oldZ: op.newZ,
        newX: op.oldX,
        newZ: op.oldZ,
      };

    case "AddSplineNub":
      return {
        type: "DeleteSplineNub",
        splineIndex: op.splineIndex,
        nubIndex: op.insertIndex,
        deletedNub: op.nub,
      };

    case "DeleteSplineNub":
      return {
        type: "AddSplineNub",
        splineIndex: op.splineIndex,
        insertIndex: op.nubIndex,
        nub: op.deletedNub,
      };

    case "MoveFenceNub":
      return {
        type: "MoveFenceNub",
        fenceIndex: op.fenceIndex,
        nubIndex: op.nubIndex,
        oldX: op.newX,
        oldY: op.newY,
        newX: op.oldX,
        newY: op.oldY,
      };

    case "UpdateTerrainHeight":
      return {
        type: "UpdateTerrainHeight",
        x: op.x,
        z: op.z,
        oldHeight: op.newHeight,
        newHeight: op.oldHeight,
        layer: op.layer,
      };

    case "UpdateTileAttribute":
      return {
        type: "UpdateTileAttribute",
        x: op.x,
        z: op.z,
        oldAttribute: op.newAttribute,
        newAttribute: op.oldAttribute,
      };
  }
}

/**
 * Check if two operations can be merged (for combining rapid edits).
 * Returns true if both operations modify the same entity.
 */
export function canMergeOperations(
  first: EditOperation,
  second: EditOperation,
): boolean {
  if (first.type !== second.type) return false;

  switch (first.type) {
    case "MoveItem":
      return (
        second.type === "MoveItem" && first.itemIndex === second.itemIndex
      );

    case "UpdateItemParams":
      return (
        second.type === "UpdateItemParams" &&
        first.itemIndex === second.itemIndex
      );

    case "MoveSplineNub":
      return (
        second.type === "MoveSplineNub" &&
        first.splineIndex === second.splineIndex &&
        first.nubIndex === second.nubIndex
      );

    case "MoveFenceNub":
      return (
        second.type === "MoveFenceNub" &&
        first.fenceIndex === second.fenceIndex &&
        first.nubIndex === second.nubIndex
      );

    case "UpdateTerrainHeight":
      return (
        second.type === "UpdateTerrainHeight" &&
        first.x === second.x &&
        first.z === second.z
      );

    case "UpdateTileAttribute":
      return (
        second.type === "UpdateTileAttribute" &&
        first.x === second.x &&
        first.z === second.z
      );

    default:
      return false;
  }
}

/**
 * Merge two compatible operations into one.
 * Returns Ok with merged operation if compatible, or Err if operations cannot be merged.
 * For safety, check canMergeOperations before calling this function.
 */
export function mergeOperations(
  first: EditOperation,
  second: EditOperation,
): Result<EditOperation, Error> {
  switch (first.type) {
    case "MoveItem":
      if (second.type !== "MoveItem") {
        return err(new Error("Incompatible merge: expected MoveItem for second operation"));
      }
      return ok({
        type: "MoveItem",
        itemIndex: first.itemIndex,
        oldX: first.oldX,
        oldZ: first.oldZ,
        newX: second.newX,
        newZ: second.newZ,
      });

    case "UpdateItemParams":
      if (second.type !== "UpdateItemParams") {
        return err(new Error("Incompatible merge: expected UpdateItemParams for second operation"));
      }
      return ok({
        type: "UpdateItemParams",
        itemIndex: first.itemIndex,
        oldParams: first.oldParams,
        newParams: second.newParams,
      });

    case "MoveSplineNub":
      if (second.type !== "MoveSplineNub") {
        return err(new Error("Incompatible merge: expected MoveSplineNub for second operation"));
      }
      return ok({
        type: "MoveSplineNub",
        splineIndex: first.splineIndex,
        nubIndex: first.nubIndex,
        oldX: first.oldX,
        oldZ: first.oldZ,
        newX: second.newX,
        newZ: second.newZ,
      });

    case "MoveFenceNub":
      if (second.type !== "MoveFenceNub") {
        return err(new Error("Incompatible merge: expected MoveFenceNub for second operation"));
      }
      return ok({
        type: "MoveFenceNub",
        fenceIndex: first.fenceIndex,
        nubIndex: first.nubIndex,
        oldX: first.oldX,
        oldY: first.oldY,
        newX: second.newX,
        newY: second.newY,
      });

    case "UpdateTerrainHeight":
      if (second.type !== "UpdateTerrainHeight") {
        return err(new Error("Incompatible merge: expected UpdateTerrainHeight for second operation"));
      }
      return ok({
        type: "UpdateTerrainHeight",
        x: first.x,
        z: first.z,
        oldHeight: first.oldHeight,
        newHeight: second.newHeight,
        layer: first.layer,
      });

    case "UpdateTileAttribute":
      if (second.type !== "UpdateTileAttribute") {
        return err(new Error("Incompatible merge: expected UpdateTileAttribute for second operation"));
      }
      return ok({
        type: "UpdateTileAttribute",
        x: first.x,
        z: first.z,
        oldAttribute: first.oldAttribute,
        newAttribute: second.newAttribute,
      });

    default:
      return err(new Error("Cannot merge operations of this type"));
  }
}
