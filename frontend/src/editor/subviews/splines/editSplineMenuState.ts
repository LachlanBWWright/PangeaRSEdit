import type { SplineData } from "@/python/structSpecs/LevelTypes";

export function createReindexedRecord<T extends { obj: unknown }>(
  record: Record<number, T>,
  removedIndex: number,
): Record<number, T> {
  const entries = Object.entries(record)
    .map(([key, value]) => [Number(key), value] as const)
    .filter(([key]) => key !== removedIndex)
    .sort(([left], [right]) => left - right);

  return Object.fromEntries(
    entries.map(([key, value]) => [key > removedIndex ? key - 1 : key, value]),
  ) as Record<number, T>;
}

export function removeSplineAtIndex(
  splineData: SplineData,
  splineIdx: number,
): void {
  const splines = splineData.Spln?.[1000]?.obj;
  if (!splines || splineIdx < 0 || splineIdx >= splines.length) {
    return;
  }

  splines.splice(splineIdx, 1);

  if (splineData.SpNb) {
    splineData.SpNb = createReindexedRecord(splineData.SpNb, splineIdx);
  }
  if (splineData.SpPt) {
    splineData.SpPt = createReindexedRecord(splineData.SpPt, splineIdx);
  }
  if (splineData.SpIt) {
    splineData.SpIt = createReindexedRecord(splineData.SpIt, splineIdx);
  }

  if (splineData.Spln?.[1000]?.obj) {
    splineData.Spln[1000].obj.forEach((spline, index) => {
      spline.numNubs = splineData.SpNb?.[index]?.obj.length ?? spline.numNubs;
      spline.numPoints =
        splineData.SpPt?.[index]?.obj.length ?? spline.numPoints;
      spline.numItems = splineData.SpIt?.[index]?.obj.length ?? spline.numItems;
    });
  }
}
