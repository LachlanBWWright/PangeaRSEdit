import type { SplineData, SplineNub } from "@/python/structSpecs/LevelTypes";
import { getPoints } from "@/utils/spline";
import { SPLINE_KEY_BASE } from "@/editor/subviews/splines/splineUtils";

export function getSplinePoints(
  splinePoints: { x: number; z: number }[] | undefined,
): number[] {
  if (!splinePoints) {
    return [];
  }
  return splinePoints.flatMap((point) => [point.x, point.z]);
}

export function buildPreviewNubs(
  previousPreview: { x: number; z: number }[] | null,
  sourceNubs: SplineNub[],
): { x: number; z: number }[] {
  if (previousPreview) {
    return previousPreview;
  }
  return sourceNubs.map((nub) => ({ x: nub.x, z: nub.z }));
}

export function updatePreviewNubs(
  previewNubs: { x: number; z: number }[],
  nubIndex: number,
  newX: number,
  newZ: number,
  syncFirstAndLast: boolean,
): { x: number; z: number }[] {
  const updated = previewNubs.map((nub, index) =>
    index === nubIndex ? { x: newX, z: newZ } : nub,
  );

  if (syncFirstAndLast && nubIndex === updated.length - 1 && updated[0]) {
    updated[0] = { x: newX, z: newZ };
  }

  return updated;
}

export function getPreviewSplinePoints(
  previewNubs: { x: number; z: number }[],
  syncFirstAndLast: boolean,
): number[] {
  const workingNubs =
    syncFirstAndLast && previewNubs.length > 1
      ? previewNubs.slice(0, -1)
      : previewNubs;

  const points =
    workingNubs.length === 1 && workingNubs[0]
      ? [workingNubs[0]]
      : getPoints(workingNubs, syncFirstAndLast);

  return points.flatMap((point) => [point.x, point.z]);
}

export function applySplineLineDrag(
  initialDragState: { x: number; z: number }[],
  dragDx: number,
  dragDz: number,
): { x: number; z: number }[] {
  return initialDragState.map((initPos) => ({
    x: initPos.x + dragDx,
    z: initPos.z + dragDz,
  }));
}

export function offsetRenderedLinePoints(
  points: number[],
  dragDx: number,
  dragDz: number,
): number[] {
  return points.map((value, index) =>
    index % 2 === 0 ? value + dragDx : value + dragDz,
  );
}

export function commitSplineNubs(
  draft: SplineData,
  splineIdx: number,
  updatedNubs: { x: number; z: number }[],
): void {
  const spNb = draft.SpNb?.[SPLINE_KEY_BASE + splineIdx];
  if (spNb) {
    spNb.obj = updatedNubs;
  }
  const spln = draft.Spln?.[1000]?.obj?.[splineIdx];
  if (spln) {
    spln.numNubs = updatedNubs.length;
  }
}

export function getSplineItemPointIndex(
  points: number[],
  placement: number,
): number {
  let pointIdx = Math.floor(points.length * Math.min(0.99, placement));
  if (pointIdx % 2 !== 0) {
    pointIdx -= 1;
  }
  return pointIdx;
}
