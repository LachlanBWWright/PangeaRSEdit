import type { SplineData, SplineItem } from "@/python/structSpecs/LevelTypes";
import { SPLINE_KEY_BASE } from "@/editor/subviews/splines/splineUtils";

export function initSplineItem(
  splineData: SplineData,
  selectedSpline: number | undefined,
): number | null {
  if (selectedSpline === undefined) {
    return null;
  }

  const splineItems = splineData.SpIt[SPLINE_KEY_BASE + selectedSpline]?.obj;
  if (!splineItems) {
    return null;
  }

  splineItems.push({
    placement: 0,
    type: 0,
    p0: 0,
    p1: 0,
    p2: 0,
    p3: 0,
    flags: 0,
  });

  const newItemIndex = splineItems.length - 1;
  const spline = splineData.Spln[1000]?.obj?.[selectedSpline];
  if (spline) {
    spline.numItems = splineItems.length;
  }

  return newItemIndex;
}

export function clampPlacement(value: string): number {
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) {
    return 0;
  }
  if (parsed < 0) {
    return 0;
  }
  if (parsed > 1) {
    return 1;
  }
  return parsed;
}

export function deleteSelectedSplineItem(
  splineData: SplineData,
  selectedSpline: number | undefined,
  selectedSplineItem: number | undefined,
): void {
  if (selectedSpline === undefined || selectedSplineItem === undefined) {
    return;
  }

  const splineItems = splineData.SpIt[SPLINE_KEY_BASE + selectedSpline]?.obj;
  if (!splineItems) {
    return;
  }

  splineItems.splice(selectedSplineItem, 1);
}

export function updateSplineItemParam(
  splineData: SplineData,
  selectedSpline: number | undefined,
  selectedSplineItem: number | undefined,
  key: "p0" | "p1" | "p2" | "p3",
  value: number,
): void {
  if (selectedSpline === undefined || selectedSplineItem === undefined) {
    return;
  }

  const splineItems = splineData.SpIt[SPLINE_KEY_BASE + selectedSpline]?.obj;
  const item = splineItems?.[selectedSplineItem];
  if (!item) {
    return;
  }

  item[key] = value;
}

export function updateSplineItemPlacement(
  splineData: SplineData,
  selectedSpline: number | undefined,
  selectedSplineItem: number | undefined,
  value: number,
): void {
  if (selectedSpline === undefined || selectedSplineItem === undefined) {
    return;
  }

  const splineItems = splineData.SpIt[SPLINE_KEY_BASE + selectedSpline]?.obj;
  const item = splineItems?.[selectedSplineItem];
  if (!item) {
    return;
  }

  item.placement = value;
}

export function updateSplineItemType(
  splineData: SplineData,
  selectedSpline: number | undefined,
  selectedSplineItem: number | undefined,
  itemType: number,
): void {
  if (selectedSpline === undefined || selectedSplineItem === undefined) {
    return;
  }

  const splineItems = splineData.SpIt[SPLINE_KEY_BASE + selectedSpline]?.obj;
  const item = splineItems?.[selectedSplineItem];
  if (!item) {
    return;
  }

  item.type = itemType;
}

export function updateSplineItemFlags(
  item: SplineItem,
  bitIndex: number,
  checked: boolean,
): SplineItem {
  const mask = 1 << bitIndex;
  const nextValue = checked ? item.flags | mask : item.flags & ~mask;
  return {
    ...item,
    flags: nextValue,
  };
}
