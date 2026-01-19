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
        itemIndex: op.insertIndex ?? -1,  // Note: Consumer needs to handle -1 if it means "last"
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
            ...op,
            oldX: op.newX,
            oldY: op.newY,
            newX: op.oldX,
            newY: op.oldY,
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

    case "AddSplineItem":
        return {
            type: "DeleteSplineItem",
            splineIndex: op.splineIndex,
            itemIndex: op.insertIndex ?? -1,
            deletedItem: op.item,
        };

    case "DeleteSplineItem":
        return {
            type: "AddSplineItem",
            splineIndex: op.splineIndex,
            item: op.deletedItem,
            insertIndex: op.itemIndex,
        };

    case "UpdateLiquid":
        return {
            ...op,
            oldLiquid: op.newLiquid,
            newLiquid: op.oldLiquid,
        };

    default:
        const _exhaustiveCheck: never = op;
        throw new Error(`Cannot reverse operation type: ${(op as EditOperation).type}`);
  }
}

/**
 * Reverse a list of operations (in reverse order)
 */
export function reverseOperations(ops: EditOperation[]): EditOperation[] {
  return ops.map(reverseOperation).reverse();
}
