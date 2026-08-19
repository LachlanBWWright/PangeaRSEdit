import type { LevelData } from "@/python/structSpecs/LevelTypes";

interface Bounds {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

function getBounds(points: readonly [number, number][]): Bounds | null {
  const first = points[0];
  if (!first) return null;
  let left = first[0];
  let right = first[0];
  let top = first[1];
  let bottom = first[1];
  for (const [x, z] of points) {
    left = Math.min(left, x);
    right = Math.max(right, x);
    top = Math.min(top, z);
    bottom = Math.max(bottom, z);
  }
  return { left, right, top, bottom };
}

export function regenerateDerivedLevelData(levelData: LevelData): void {
  const header = levelData.Hedr[1000].obj;
  header.numItems = levelData.Itms?.[1000]?.obj.length ?? 0;
  header.numSplines = levelData.Spln?.[1000]?.obj.length ?? 0;
  header.numFences = levelData.Fenc?.[1000]?.obj.length ?? 0;
  header.numCheckpoints = levelData.CkPt?.[1000]?.obj.length ?? 0;
  if ("numWaterPatches" in header) {
    header.numWaterPatches = levelData.Liqd?.[1000]?.obj.length ?? 0;
  }
  if ("numPaths" in header) {
    header.numPaths = levelData.Path?.[1000]?.obj.length ?? 0;
  }

  levelData.Spln?.[1000]?.obj.forEach((spline, index) => {
    const resourceId = 1000 + index;
    spline.numNubs = levelData.SpNb?.[resourceId]?.obj.length ?? 0;
    spline.numPoints = levelData.SpPt?.[resourceId]?.obj.length ?? 0;
    spline.numItems = levelData.SpIt?.[resourceId]?.obj.length ?? 0;
    const bounds = getBounds(
      (levelData.SpNb?.[resourceId]?.obj ?? []).map((point) => [point.x, point.z]),
    );
    if (!bounds) return;
    spline.bbLeft = bounds.left;
    spline.bbRight = bounds.right;
    spline.bbTop = bounds.top;
    spline.bbBottom = bounds.bottom;
  });

  levelData.Fenc?.[1000]?.obj.forEach((fence, index) => {
    const nubs = levelData.FnNb?.[1000 + index]?.obj ?? [];
    fence.numNubs = nubs.length;
    const bounds = getBounds(nubs);
    if (!bounds) return;
    fence.bbLeft = bounds.left;
    fence.bbRight = bounds.right;
    fence.bbTop = bounds.top;
    fence.bbBottom = bounds.bottom;
  });

  levelData.Liqd?.[1000]?.obj.forEach((liquid) => {
    const activeNubs = liquid.nubs.slice(0, liquid.numNubs);
    const bounds = getBounds(activeNubs);
    if (!bounds) return;
    liquid.bBoxLeft = bounds.left;
    liquid.bBoxRight = bounds.right;
    liquid.bBoxTop = bounds.top;
    liquid.bBoxBottom = bounds.bottom;
  });

  levelData.Path?.[1000]?.obj.forEach((path, index) => {
    const points = levelData.PaPt?.[1000 + index]?.obj ?? [];
    path.numPoints = points.length;
    const bounds = getBounds(points.map((point) => [point.x, point.z]));
    if (!bounds) return;
    path.bbLeft = bounds.left;
    path.bbRight = bounds.right;
    path.bbTop = bounds.top;
    path.bbBottom = bounds.bottom;
  });
}
