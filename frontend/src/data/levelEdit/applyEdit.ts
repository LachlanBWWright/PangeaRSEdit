/**
 * Pure Functions for Applying Edit Operations
 * 
 * These functions take level data and an edit operation, returning the modified data.
 * They are designed to be pure functions with explicit dependencies for testability.
 */

import type { Draft } from "immer";
import type {
  ItemData,
  SplineData,
  FenceData,
  TerrainData,
  TerrainItem,
} from "@/python/structSpecs/LevelTypes";
import type {
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
} from "./editOperations";
import { getPoints } from "@/utils/spline";

const SPLINE_KEY_BASE = 1000;
const FENCE_KEY_BASE = 1000;

/**
 * Apply a single edit operation to item data.
 * Mutates the draft directly (use within immer producer).
 */
export function applyItemEditToDraft(
  draft: Draft<ItemData>,
  operation: EditOperation,
): void {
  switch (operation.type) {
    case "MoveItem":
      applyMoveItem(draft, operation);
      break;
    case "UpdateItemParams":
      applyUpdateItemParams(draft, operation);
      break;
    case "DeleteItem":
      applyDeleteItem(draft, operation);
      break;
    case "AddItem":
      applyAddItem(draft, operation);
      break;
  }
}

/**
 * Apply a single edit operation to spline data.
 * Mutates the draft directly (use within immer producer).
 */
export function applySplineEditToDraft(
  draft: Draft<SplineData>,
  operation: EditOperation,
): void {
  switch (operation.type) {
    case "MoveSplineNub":
      applyMoveSplineNub(draft, operation);
      break;
    case "AddSplineNub":
      applyAddSplineNub(draft, operation);
      break;
    case "DeleteSplineNub":
      applyDeleteSplineNub(draft, operation);
      break;
  }
}

/**
 * Apply a single edit operation to fence data.
 * Mutates the draft directly (use within immer producer).
 */
export function applyFenceEditToDraft(
  draft: Draft<FenceData>,
  operation: EditOperation,
): void {
  switch (operation.type) {
    case "MoveFenceNub":
      applyMoveFenceNub(draft, operation);
      break;
  }
}

/**
 * Apply a single edit operation to terrain data.
 * Mutates the draft directly (use within immer producer).
 */
export function applyTerrainEditToDraft(
  draft: Draft<TerrainData>,
  operation: EditOperation,
  mapWidth: number,
): void {
  switch (operation.type) {
    case "UpdateTerrainHeight":
      applyUpdateTerrainHeight(draft, operation, mapWidth);
      break;
    case "UpdateTileAttribute":
      applyUpdateTileAttribute(draft, operation, mapWidth);
      break;
  }
}

// Item Operations

function applyMoveItem(
  draft: Draft<ItemData>,
  op: MoveItemOperation,
): void {
  const items = draft.Itms?.[1000]?.obj;
  if (!items) return;

  const item = items[op.itemIndex];
  if (!item) return;

  item.x = op.newX;
  item.z = op.newZ;
}

function applyUpdateItemParams(
  draft: Draft<ItemData>,
  op: UpdateItemParamsOperation,
): void {
  const items = draft.Itms?.[1000]?.obj;
  if (!items) return;

  const item = items[op.itemIndex];
  if (!item) return;

  item.flags = op.newParams.flags;
  item.p0 = op.newParams.p0;
  item.p1 = op.newParams.p1;
  item.p2 = op.newParams.p2;
  item.p3 = op.newParams.p3;
}

function applyDeleteItem(
  draft: Draft<ItemData>,
  op: DeleteItemOperation,
): void {
  const items = draft.Itms?.[1000]?.obj;
  if (!items) return;

  const index = op.itemIndex === -1 ? items.length - 1 : op.itemIndex;
  if (index >= 0 && index < items.length) {
    items.splice(index, 1);
  }
}

function applyAddItem(
  draft: Draft<ItemData>,
  op: AddItemOperation,
): void {
  const items = draft.Itms?.[1000]?.obj;
  if (!items) return;

  const newItem: TerrainItem = {
    x: op.item.x,
    z: op.item.z,
    type: op.item.type,
    flags: op.item.flags,
    p0: op.item.p0,
    p1: op.item.p1,
    p2: op.item.p2,
    p3: op.item.p3,
  };

  if (op.insertIndex !== undefined && op.insertIndex >= 0) {
    items.splice(op.insertIndex, 0, newItem);
  } else {
    items.push(newItem);
  }
}

// Spline Operations

function applyMoveSplineNub(
  draft: Draft<SplineData>,
  op: MoveSplineNubOperation,
): void {
  const splineKey = SPLINE_KEY_BASE + op.splineIndex;
  const nubs = draft.SpNb?.[splineKey]?.obj;
  if (!nubs) return;

  const nub = nubs[op.nubIndex];
  if (!nub) return;

  nub.x = op.newX;
  nub.z = op.newZ;

  // Recalculate spline points
  updateSplinePoints(draft, op.splineIndex, nubs);
}

function applyAddSplineNub(
  draft: Draft<SplineData>,
  op: AddSplineNubOperation,
): void {
  const splineKey = SPLINE_KEY_BASE + op.splineIndex;
  const nubs = draft.SpNb?.[splineKey]?.obj;
  if (!nubs) return;

  nubs.splice(op.insertIndex, 0, { x: op.nub.x, z: op.nub.z });

  // Update spline header
  const spln = draft.Spln?.[1000]?.obj?.[op.splineIndex];
  if (spln) {
    spln.numNubs = nubs.length;
  }

  // Recalculate spline points
  updateSplinePoints(draft, op.splineIndex, nubs);
}

function applyDeleteSplineNub(
  draft: Draft<SplineData>,
  op: DeleteSplineNubOperation,
): void {
  const splineKey = SPLINE_KEY_BASE + op.splineIndex;
  const nubs = draft.SpNb?.[splineKey]?.obj;
  if (!nubs) return;

  if (op.nubIndex >= 0 && op.nubIndex < nubs.length) {
    nubs.splice(op.nubIndex, 1);
  }

  // Update spline header
  const spln = draft.Spln?.[1000]?.obj?.[op.splineIndex];
  if (spln) {
    spln.numNubs = nubs.length;
  }

  // Recalculate spline points
  updateSplinePoints(draft, op.splineIndex, nubs);
}

function updateSplinePoints(
  draft: Draft<SplineData>,
  splineIndex: number,
  nubs: { x: number; z: number }[],
): void {
  const splineKey = SPLINE_KEY_BASE + splineIndex;
  const spPt = draft.SpPt?.[splineKey];

  if (spPt && nubs.length > 0) {
    const firstNub = nubs[0];
    const newPoints = nubs.length === 1 && firstNub
      ? [{ x: firstNub.x, z: firstNub.z }]
      : getPoints(nubs);
    spPt.obj = newPoints;

    // Update header
    const spln = draft.Spln?.[1000]?.obj?.[splineIndex];
    if (spln) {
      spln.numPoints = newPoints.length;
    }
  }
}

// Fence Operations

function applyMoveFenceNub(
  draft: Draft<FenceData>,
  op: MoveFenceNubOperation,
): void {
  const fenceKey = FENCE_KEY_BASE + op.fenceIndex;
  const nubs = draft.FnNb?.[fenceKey]?.obj;
  if (!nubs) return;

  const nub = nubs[op.nubIndex];
  if (!nub) return;

  // FenceNub is a tuple [x, y]
  nub[0] = op.newX;
  nub[1] = op.newY;
}

// Terrain Operations

function applyUpdateTerrainHeight(
  draft: Draft<TerrainData>,
  op: UpdateTerrainHeightOperation,
  mapWidth: number,
): void {
  // YCrd uses keys 1000 (floor) and optionally 1001 (roof)
  const layerKey = op.layer === 1001 ? 1001 : 1000;
  
  const yCrdContainer = layerKey === 1001 ? draft.YCrd?.[1001] : draft.YCrd?.[1000];
  const yCrd = yCrdContainer?.obj;
  if (!yCrd) return;

  const index = op.z * mapWidth + op.x;
  if (index >= 0 && index < yCrd.length) {
    yCrd[index] = op.newHeight;
  }
}

function applyUpdateTileAttribute(
  draft: Draft<TerrainData>,
  op: UpdateTileAttributeOperation,
  mapWidth: number,
): void {
  const atrb = draft.Atrb?.[1000]?.obj;
  const layr = draft.Layr?.[1000]?.obj;
  if (!atrb || !layr) return;

  const layerIndex = op.z * mapWidth + op.x;
  if (layerIndex < 0 || layerIndex >= layr.length) return;

  const attrIndex = layr[layerIndex];
  if (attrIndex === undefined) return;

  const attr = atrb[attrIndex];
  if (!attr) return;

  attr.flags = op.newAttribute.flags;
  attr.p0 = op.newAttribute.p0;
  attr.p1 = op.newAttribute.p1;
}

/**
 * Create item move operation from before/after positions.
 */
export function createMoveItemOperation(
  itemIndex: number,
  oldX: number,
  oldZ: number,
  newX: number,
  newZ: number,
): MoveItemOperation {
  return {
    type: "MoveItem",
    itemIndex,
    oldX,
    oldZ,
    newX,
    newZ,
  };
}

/**
 * Create item params update operation.
 */
export function createUpdateItemParamsOperation(
  itemIndex: number,
  oldParams: { flags: number; p0: number; p1: number; p2: number; p3: number },
  newParams: { flags: number; p0: number; p1: number; p2: number; p3: number },
): UpdateItemParamsOperation {
  return {
    type: "UpdateItemParams",
    itemIndex,
    oldParams,
    newParams,
  };
}

/**
 * Create spline nub move operation.
 */
export function createMoveSplineNubOperation(
  splineIndex: number,
  nubIndex: number,
  oldX: number,
  oldZ: number,
  newX: number,
  newZ: number,
): MoveSplineNubOperation {
  return {
    type: "MoveSplineNub",
    splineIndex,
    nubIndex,
    oldX,
    oldZ,
    newX,
    newZ,
  };
}
