import { LevelData, TerrainItem, SplineNub, Fence, Liquid, SplineItem } from "@/python/structSpecs/LevelTypes";
import { GlobalsInterface } from "@/data/globals/globals";
import {
  EditOperation,
  MoveItemOperation,
  UpdateItemParamsOperation,
  DeleteItemOperation,
  AddItemOperation,
  MoveSplineNubOperation,
  AddSplineNubOperation,
  DeleteSplineNubOperation,
  MoveFenceNubOperation,
  UpdateTerrainHeightOperation,
  UpdateTileAttributeOperation,
  UpdateHeaderOperation,
  AddSplineItemOperation,
  DeleteSplineItemOperation,
  UpdateLiquidOperation
} from "./editOperations";
import { produce } from "immer";
import { getPoints } from "@/utils/spline";

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

      case "AddSplineNub":
        this.applyAddSplineNub(draft, operation, globals);
        break;

      case "DeleteSplineNub":
        this.applyDeleteSplineNub(draft, operation, globals);
        break;

      case "MoveFenceNub":
        this.applyMoveFenceNub(draft, operation);
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

      case "AddSplineItem":
        this.applyAddSplineItem(draft, operation);
        break;

      case "DeleteSplineItem":
        this.applyDeleteSplineItem(draft, operation);
        break;

      case "UpdateLiquid":
        this.applyUpdateLiquid(draft, operation);
        break;

      default:
        // @ts-expect-error exhaustiveness check
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

      this.recalculateSpline(draft, op.splineIndex);
    }
  }

  private applyAddSplineNub(
    draft: LevelData,
    op: AddSplineNubOperation,
    globals: GlobalsInterface,
  ): void {
      const splineKey = 1000 + op.splineIndex;
      const nubs = draft.SpNb?.[splineKey]?.obj;
      if (nubs) {
          nubs.splice(op.insertIndex, 0, op.nub);
          this.recalculateSpline(draft, op.splineIndex);
      }
  }

  private applyDeleteSplineNub(
    draft: LevelData,
    op: DeleteSplineNubOperation,
    globals: GlobalsInterface,
  ): void {
      const splineKey = 1000 + op.splineIndex;
      const nubs = draft.SpNb?.[splineKey]?.obj;
      if (nubs) {
          nubs.splice(op.nubIndex, 1);
          this.recalculateSpline(draft, op.splineIndex);
      }
  }

  private recalculateSpline(draft: LevelData, splineIndex: number): void {
      const splineKey = 1000 + splineIndex;
      const nubs = draft.SpNb?.[splineKey]?.obj;
      if (nubs) {
        const newPoints = getPoints(nubs);
        const spPt = draft.SpPt?.[splineKey];
        if (spPt) spPt.obj = newPoints;

        // Update spline header
        const spln = draft.Spln?.[1000]?.obj?.[splineIndex];
        if (spln) {
            spln.numPoints = newPoints.length;
            spln.numNubs = nubs.length; // Ensure numNubs is updated
        }
      }
  }

  private applyMoveFenceNub(draft: LevelData, op: MoveFenceNubOperation): void {
      const fenceNubKey = 1000 + op.fenceIndex;
      const nubs = draft.FnNb?.[fenceNubKey]?.obj;
      if (nubs && nubs[op.nubIndex]) {
          nubs[op.nubIndex] = [op.newX, op.newY]; // Fence nub is [x, y]
          // Recalculating fence bbox might be needed but skipping for now as it's not strictly required for reversibility if we don't change bbox here
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

  private applyAddSplineItem(draft: LevelData, op: AddSplineItemOperation): void {
      const splineKey = 1000 + op.splineIndex;
      const items = draft.SpIt?.[splineKey]?.obj;
      if (items) {
          if (op.insertIndex !== undefined && op.insertIndex >= 0) {
              items.splice(op.insertIndex, 0, op.item);
          } else {
              items.push(op.item);
          }

          const spln = draft.Spln?.[1000]?.obj?.[op.splineIndex];
          if (spln) {
              spln.numItems = items.length;
          }
      }
  }

  private applyDeleteSplineItem(draft: LevelData, op: DeleteSplineItemOperation): void {
      const splineKey = 1000 + op.splineIndex;
      const items = draft.SpIt?.[splineKey]?.obj;
      if (items) {
          items.splice(op.itemIndex, 1);

          const spln = draft.Spln?.[1000]?.obj?.[op.splineIndex];
          if (spln) {
              spln.numItems = items.length;
          }
      }
  }

  private applyUpdateLiquid(draft: LevelData, op: UpdateLiquidOperation): void {
      const liquids = draft.Liqd?.[1000]?.obj;
      if (liquids && liquids[op.liquidIndex]) {
          liquids[op.liquidIndex] = op.newLiquid;
      }
  }
}

// Singleton instance
export const levelEditor = new LevelEditorService();
