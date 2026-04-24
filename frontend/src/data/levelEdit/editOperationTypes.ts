import type { TerrainItem, SplineNub } from "@/python/structSpecs/LevelTypes";

export interface MoveItemOperation {
  type: "MoveItem";
  itemIndex: number;
  oldX: number;
  oldZ: number;
  newX: number;
  newZ: number;
}

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

export interface DeleteItemOperation {
  type: "DeleteItem";
  itemIndex: number;
  deletedItem: TerrainItem;
}

export interface AddItemOperation {
  type: "AddItem";
  item: TerrainItem;
  insertIndex?: number;
}

export interface MoveSplineNubOperation {
  type: "MoveSplineNub";
  splineIndex: number;
  nubIndex: number;
  oldX: number;
  oldZ: number;
  newX: number;
  newZ: number;
}

export interface AddSplineNubOperation {
  type: "AddSplineNub";
  splineIndex: number;
  insertIndex: number;
  nub: SplineNub;
}

export interface DeleteSplineNubOperation {
  type: "DeleteSplineNub";
  splineIndex: number;
  nubIndex: number;
  deletedNub: SplineNub;
}

export interface MoveFenceNubOperation {
  type: "MoveFenceNub";
  fenceIndex: number;
  nubIndex: number;
  oldX: number;
  oldY: number;
  newX: number;
  newY: number;
}

export interface UpdateTerrainHeightOperation {
  type: "UpdateTerrainHeight";
  x: number;
  z: number;
  oldHeight: number;
  newHeight: number;
  layer?: number;
}

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
