import { LevelData } from "@/python/structSpecs/LevelTypes";
import { MoveItemOperation, UpdateItemParamsOperation, MoveSplineNubOperation } from "./editOperations";

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
