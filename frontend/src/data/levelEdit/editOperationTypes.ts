import type { TerrainItem, SplineNub } from "@/python/structSpecs/LevelTypes";

/** Records moving a single item from one location to another. */
export interface MoveItemOperation {
  type: "MoveItem";
  itemIndex: number;
  oldX: number;
  oldZ: number;
  newX: number;
  newZ: number;
}

/** Records a parameter edit on a single item. */
export interface UpdateItemParamsOperation {
  type: "UpdateItemParams";
  itemIndex: number;
  oldParams: ItemParams;
  newParams: ItemParams;
}

/** Item parameter payload used by level edit operations. */
export interface ItemParams {
  flags: number;
  p0: number;
  p1: number;
  p2: number;
  p3: number;
}

/** Records removal of a single item from the level. */
export interface DeleteItemOperation {
  type: "DeleteItem";
  itemIndex: number;
  deletedItem: TerrainItem;
}

/** Records insertion of a single item into the level. */
export interface AddItemOperation {
  type: "AddItem";
  item: TerrainItem;
  insertIndex?: number;
}

/** Records moving a spline control nub. */
export interface MoveSplineNubOperation {
  type: "MoveSplineNub";
  splineIndex: number;
  nubIndex: number;
  oldX: number;
  oldZ: number;
  newX: number;
  newZ: number;
}

/** Records inserting a spline control nub. */
export interface AddSplineNubOperation {
  type: "AddSplineNub";
  splineIndex: number;
  insertIndex: number;
  nub: SplineNub;
}

/** Records deleting a spline control nub. */
export interface DeleteSplineNubOperation {
  type: "DeleteSplineNub";
  splineIndex: number;
  nubIndex: number;
  deletedNub: SplineNub;
}

/** Records moving a fence control nub. */
export interface MoveFenceNubOperation {
  type: "MoveFenceNub";
  fenceIndex: number;
  nubIndex: number;
  oldX: number;
  oldY: number;
  newX: number;
  newY: number;
}

/** Records an edit to a single terrain height sample. */
export interface UpdateTerrainHeightOperation {
  type: "UpdateTerrainHeight";
  x: number;
  z: number;
  oldHeight: number;
  newHeight: number;
  layer?: number;
}

/** Records an edit to a single tile attribute. */
export interface UpdateTileAttributeOperation {
  type: "UpdateTileAttribute";
  x: number;
  z: number;
  oldAttribute: TileAttribute;
  newAttribute: TileAttribute;
}

/** Tile attribute payload used by the terrain edit system. */
export interface TileAttribute {
  flags: number;
  p0: number;
  p1: number;
}

/** Union of every undoable level-edit operation supported by the editor. */
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
