import type Konva from "konva";
import type {
  FenceData,
  LiquidData,
} from "@/python/structSpecs/LevelTypes";

export type CanvasPoint = readonly [number, number];

const SNAP_DISTANCE_PX = 14;
const FENCE_NUB_KEY_BASE = 1000;

function getWaterPoints(
  liquidData: LiquidData | null,
  excludedWaterIndex: number | null,
): CanvasPoint[] {
  return liquidData
    ? liquidData.Liqd[1000].obj.flatMap((body, waterIndex) =>
        waterIndex === excludedWaterIndex
          ? []
          : body.nubs.filter((_, index) => index < body.numNubs),
      )
    : [];
}

export function getFenceNubSnapTargets(
  fenceData: FenceData,
  liquidData: LiquidData | null,
  fenceIndex: number,
): CanvasPoint[] {
  const otherFencePoints = Object.entries(fenceData.FnNb).flatMap(
    ([key, entry]) =>
      Number(key) === FENCE_NUB_KEY_BASE + fenceIndex ? [] : entry.obj,
  );
  return [...otherFencePoints, ...getWaterPoints(liquidData, null)];
}

export function getWaterNubSnapTargets(
  fenceData: FenceData | null,
  liquidData: LiquidData,
  waterIndex: number,
): CanvasPoint[] {
  const fencePoints = fenceData
    ? Object.values(fenceData.FnNb).flatMap((entry) => entry.obj)
    : [];
  return [...fencePoints, ...getWaterPoints(liquidData, waterIndex)];
}

export function getHotspotSnapTargets(
  liquidData: LiquidData,
  waterIndex: number,
): CanvasPoint[] {
  return liquidData.Liqd[1000].obj.flatMap((body, index) =>
    index === waterIndex ? [] : [[body.hotSpotX, body.hotSpotZ]],
  );
}

export function snapCanvasPoint(
  point: CanvasPoint,
  targets: readonly CanvasPoint[],
  stage: Konva.Stage | null,
): [number, number] {
  return snapCanvasPointAtScale(point, targets, stage?.scaleX() ?? 1);
}

export function snapCanvasPointAtScale(
  point: CanvasPoint,
  targets: readonly CanvasPoint[],
  scale: number,
): [number, number] {
  let closest: CanvasPoint | null = null;
  let closestDistance = SNAP_DISTANCE_PX / scale;

  for (const target of targets) {
    const distance = Math.hypot(target[0] - point[0], target[1] - point[1]);
    if (distance <= closestDistance) {
      closest = target;
      closestDistance = distance;
    }
  }

  return closest
    ? [Math.round(closest[0]), Math.round(closest[1])]
    : [Math.round(point[0]), Math.round(point[1])];
}
