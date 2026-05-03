import { err, ok, type Result } from "neverthrow";
import type {
  EditOperation,
  MoveFenceNubOperation,
  MoveItemOperation,
  MoveSplineNubOperation,
  UpdateItemParamsOperation,
  UpdateTerrainHeightOperation,
  UpdateTileAttributeOperation,
} from "./editOperationTypes";
export type {
  AddItemOperation,
  AddSplineNubOperation,
  DeleteItemOperation,
  DeleteSplineNubOperation,
  EditOperation,
  ItemParams,
  MoveFenceNubOperation,
  MoveItemOperation,
  MoveSplineNubOperation,
  TileAttribute,
  UpdateItemParamsOperation,
  UpdateTerrainHeightOperation,
  UpdateTileAttributeOperation,
} from "./editOperationTypes";

function reverseMoveItem(op: MoveItemOperation): MoveItemOperation {
  return {
    type: "MoveItem",
    itemIndex: op.itemIndex,
    oldX: op.newX,
    oldZ: op.newZ,
    newX: op.oldX,
    newZ: op.oldZ,
  };
}

function reverseUpdateItemParams(
  op: UpdateItemParamsOperation,
): UpdateItemParamsOperation {
  return {
    type: "UpdateItemParams",
    itemIndex: op.itemIndex,
    oldParams: op.newParams,
    newParams: op.oldParams,
  };
}

function reverseMoveSplineNub(
  op: MoveSplineNubOperation,
): MoveSplineNubOperation {
  return {
    type: "MoveSplineNub",
    splineIndex: op.splineIndex,
    nubIndex: op.nubIndex,
    oldX: op.newX,
    oldZ: op.newZ,
    newX: op.oldX,
    newZ: op.oldZ,
  };
}

function reverseMoveFenceNub(op: MoveFenceNubOperation): MoveFenceNubOperation {
  return {
    type: "MoveFenceNub",
    fenceIndex: op.fenceIndex,
    nubIndex: op.nubIndex,
    oldX: op.newX,
    oldY: op.newY,
    newX: op.oldX,
    newY: op.oldY,
  };
}

function reverseUpdateTerrainHeight(
  op: UpdateTerrainHeightOperation,
): UpdateTerrainHeightOperation {
  return {
    type: "UpdateTerrainHeight",
    x: op.x,
    z: op.z,
    oldHeight: op.newHeight,
    newHeight: op.oldHeight,
    layer: op.layer,
  };
}

function reverseUpdateTileAttribute(
  op: UpdateTileAttributeOperation,
): UpdateTileAttributeOperation {
  return {
    type: "UpdateTileAttribute",
    x: op.x,
    z: op.z,
    oldAttribute: op.newAttribute,
    newAttribute: op.oldAttribute,
  };
}

function reverseDeleteItem(
  op: Extract<EditOperation, { type: "DeleteItem" }>,
): Extract<EditOperation, { type: "AddItem" }> {
  return {
    type: "AddItem",
    item: op.deletedItem,
    insertIndex: op.itemIndex,
  };
}

function reverseAddItem(
  op: Extract<EditOperation, { type: "AddItem" }>,
): Extract<EditOperation, { type: "DeleteItem" }> {
  return {
    type: "DeleteItem",
    itemIndex: op.insertIndex ?? -1,
    deletedItem: op.item,
  };
}

function reverseAddSplineNub(
  op: Extract<EditOperation, { type: "AddSplineNub" }>,
): Extract<EditOperation, { type: "DeleteSplineNub" }> {
  return {
    type: "DeleteSplineNub",
    splineIndex: op.splineIndex,
    nubIndex: op.insertIndex,
    deletedNub: op.nub,
  };
}

function reverseDeleteSplineNub(
  op: Extract<EditOperation, { type: "DeleteSplineNub" }>,
): Extract<EditOperation, { type: "AddSplineNub" }> {
  return {
    type: "AddSplineNub",
    splineIndex: op.splineIndex,
    insertIndex: op.nubIndex,
    nub: op.deletedNub,
  };
}

function mergeTypeError(
  expected: EditOperation["type"],
): Result<never, string> {
  return err(`Incompatible merge: expected ${expected} for second operation`);
}

function mergeMoveItem(
  first: MoveItemOperation,
  second: EditOperation,
): Result<EditOperation, string> {
  if (second.type !== "MoveItem") return mergeTypeError("MoveItem");
  return ok({
    type: "MoveItem",
    itemIndex: first.itemIndex,
    oldX: first.oldX,
    oldZ: first.oldZ,
    newX: second.newX,
    newZ: second.newZ,
  });
}

function mergeUpdateItemParams(
  first: UpdateItemParamsOperation,
  second: EditOperation,
): Result<EditOperation, string> {
  if (second.type !== "UpdateItemParams") {
    return mergeTypeError("UpdateItemParams");
  }

  return ok({
    type: "UpdateItemParams",
    itemIndex: first.itemIndex,
    oldParams: first.oldParams,
    newParams: second.newParams,
  });
}

function mergeMoveSplineNub(
  first: MoveSplineNubOperation,
  second: EditOperation,
): Result<EditOperation, string> {
  if (second.type !== "MoveSplineNub") return mergeTypeError("MoveSplineNub");
  return ok({
    type: "MoveSplineNub",
    splineIndex: first.splineIndex,
    nubIndex: first.nubIndex,
    oldX: first.oldX,
    oldZ: first.oldZ,
    newX: second.newX,
    newZ: second.newZ,
  });
}

function mergeMoveFenceNub(
  first: MoveFenceNubOperation,
  second: EditOperation,
): Result<EditOperation, string> {
  if (second.type !== "MoveFenceNub") return mergeTypeError("MoveFenceNub");
  return ok({
    type: "MoveFenceNub",
    fenceIndex: first.fenceIndex,
    nubIndex: first.nubIndex,
    oldX: first.oldX,
    oldY: first.oldY,
    newX: second.newX,
    newY: second.newY,
  });
}

function mergeUpdateTerrainHeight(
  first: UpdateTerrainHeightOperation,
  second: EditOperation,
): Result<EditOperation, string> {
  if (second.type !== "UpdateTerrainHeight") {
    return mergeTypeError("UpdateTerrainHeight");
  }

  return ok({
    type: "UpdateTerrainHeight",
    x: first.x,
    z: first.z,
    oldHeight: first.oldHeight,
    newHeight: second.newHeight,
    layer: first.layer,
  });
}

function mergeUpdateTileAttribute(
  first: UpdateTileAttributeOperation,
  second: EditOperation,
): Result<EditOperation, string> {
  if (second.type !== "UpdateTileAttribute") {
    return mergeTypeError("UpdateTileAttribute");
  }

  return ok({
    type: "UpdateTileAttribute",
    x: first.x,
    z: first.z,
    oldAttribute: first.oldAttribute,
    newAttribute: second.newAttribute,
  });
}

/**
 * Create a reverse operation for undo support.
 * Returns the operation that would undo the given operation.
 */
export function reverseOperation(op: EditOperation): EditOperation {
  switch (op.type) {
    case "MoveItem":
      return reverseMoveItem(op);

    case "UpdateItemParams":
      return reverseUpdateItemParams(op);

    case "DeleteItem":
      return reverseDeleteItem(op);

    case "AddItem":
      return reverseAddItem(op);

    case "MoveSplineNub":
      return reverseMoveSplineNub(op);

    case "AddSplineNub":
      return reverseAddSplineNub(op);

    case "DeleteSplineNub":
      return reverseDeleteSplineNub(op);

    case "MoveFenceNub":
      return reverseMoveFenceNub(op);

    case "UpdateTerrainHeight":
      return reverseUpdateTerrainHeight(op);

    case "UpdateTileAttribute":
      return reverseUpdateTileAttribute(op);
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
      return second.type === "MoveItem" && first.itemIndex === second.itemIndex;

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
): Result<EditOperation, string> {
  switch (first.type) {
    case "MoveItem":
      return mergeMoveItem(first, second);

    case "UpdateItemParams":
      return mergeUpdateItemParams(first, second);

    case "MoveSplineNub":
      return mergeMoveSplineNub(first, second);

    case "MoveFenceNub":
      return mergeMoveFenceNub(first, second);

    case "UpdateTerrainHeight":
      return mergeUpdateTerrainHeight(first, second);

    case "UpdateTileAttribute":
      return mergeUpdateTileAttribute(first, second);

    default:
      return err("Cannot merge operations of this type");
  }
}
