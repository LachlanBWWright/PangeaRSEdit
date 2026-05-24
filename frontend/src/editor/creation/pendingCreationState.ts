import { Game, type GlobalsInterface } from "@/data/globals/globals";
import {
  SPLINE_KEY_BASE,
  getSplinePointGenerationInput,
} from "@/editor/subviews/splines/splineUtils";
import { getPoints } from "@/utils/spline";
import type {
  FenceData,
  LiquidData,
  SplineData,
} from "@/python/structSpecs/LevelTypes";
import type { CreationPoint } from "@/data/creation/pendingCreationAtom";

const FENCE_NUB_KEY_BASE = 1000;

function computeBounds(points: readonly CreationPoint[]) {
  const first = points[0];
  if (!first) {
    return {
      minX: 0,
      maxX: 0,
      minZ: 0,
      maxZ: 0,
    };
  }

  let minX = first.x;
  let maxX = first.x;
  let minZ = first.z;
  let maxZ = first.z;

  points.forEach((point) => {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minZ = Math.min(minZ, point.z);
    maxZ = Math.max(maxZ, point.z);
  });

  return {
    minX,
    maxX,
    minZ,
    maxZ,
  };
}

export function appendCreationPoint(
  points: readonly CreationPoint[],
  point: CreationPoint,
): CreationPoint[] {
  return [...points, point];
}

export function popCreationPoint(
  points: readonly CreationPoint[],
): CreationPoint[] {
  return points.slice(0, -1);
}

export function isCircularSplineGame(globals: GlobalsInterface): boolean {
  return globals.GAME_TYPE !== Game.BILLY_FRONTIER;
}

export function canFinalizeCreation(
  kind: "fence" | "water" | "spline",
  points: readonly CreationPoint[],
  globals: GlobalsInterface,
): boolean {
  if (kind === "fence") {
    return points.length >= 2;
  }
  if (kind === "water") {
    return points.length >= 3;
  }
  if (kind === "spline") {
    return isCircularSplineGame(globals)
      ? points.length >= 3
      : points.length >= 2;
  }
  return false;
}

export function finalizeFenceFromPoints(
  draft: FenceData,
  points: readonly CreationPoint[],
): number {
  const nextFenceIndex = draft.Fenc[1000].obj.length;
  const bounds = computeBounds(points);

  draft.Fenc[1000].obj.push({
    fenceType: 0,
    numNubs: points.length,
    junkNubListPtr: 0,
    bbTop: bounds.minZ,
    bbBottom: bounds.maxZ,
    bbLeft: bounds.minX,
    bbRight: bounds.maxX,
  });

  draft.FnNb[FENCE_NUB_KEY_BASE + nextFenceIndex] = {
    name: "Fence Nub List",
    obj: points.map((point) => [point.x, point.z]),
    order: 999,
  };

  return nextFenceIndex;
}

export function finalizeWaterFromPoints(
  draft: LiquidData,
  points: readonly CreationPoint[],
  globals: GlobalsInterface,
): number {
  const nextWaterBodyIndex = draft.Liqd[1000].obj.length;
  const bounds = computeBounds(points);
  const hotspot = points.reduce(
    (acc, point) => ({
      x: acc.x + point.x,
      z: acc.z + point.z,
    }),
    { x: 0, z: 0 },
  );

  const nubs = points.map((point) => [point.x, point.z] as [number, number]);
  while (nubs.length < globals.LIQD_NUBS) {
    nubs.push([0, 0]);
  }

  draft.Liqd[1000].obj.push({
    type: 0,
    nubs,
    numNubs: points.length,
    hotSpotX: Math.round(hotspot.x / points.length),
    hotSpotZ: Math.round(hotspot.z / points.length),
    bBoxTop: bounds.minZ,
    bBoxLeft: bounds.minX,
    bBoxBottom: bounds.maxZ,
    bBoxRight: bounds.maxX,
    height: 0,
    flags: 0,
    reserved: 0,
  });

  return nextWaterBodyIndex;
}

export function finalizeSplineFromPoints(
  draft: SplineData,
  points: readonly CreationPoint[],
  globals: GlobalsInterface,
): number {
  const nextSplineIndex = draft.Spln[1000].obj.length;
  const splinePos = SPLINE_KEY_BASE + nextSplineIndex;
  const circular = isCircularSplineGame(globals);
  const sourceNubs = points.map((point) => ({ x: point.x, z: point.z }));
  const storedNubs = circular
    ? [...sourceNubs, { x: sourceNubs[0]?.x ?? 0, z: sourceNubs[0]?.z ?? 0 }]
    : sourceNubs;

  const splineNubInput = getSplinePointGenerationInput(storedNubs);
  const splinePoints = getPoints(
    splineNubInput.workingNubs,
    splineNubInput.isCircular,
  );
  const bounds = computeBounds(sourceNubs);

  draft.Spln[1000].obj.push({
    bbBottom: bounds.maxZ,
    bbLeft: bounds.minX,
    bbRight: bounds.maxX,
    bbTop: bounds.minZ,
    numItems: 0,
    numNubs: storedNubs.length,
    numPoints: splinePoints.length,
  });

  draft.SpIt[splinePos] = { obj: [] };
  draft.SpNb[splinePos] = { obj: storedNubs };
  draft.SpPt[splinePos] = { obj: splinePoints };

  return nextSplineIndex;
}
