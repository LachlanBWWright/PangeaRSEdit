import type { TunnelItem } from "@/data/tunnelParser/types";

export function getSplineProgress(
  splineIndex: number,
  totalSplinePoints: number,
): number {
  if (totalSplinePoints <= 1) {
    return 0;
  }
  return (splineIndex / (totalSplinePoints - 1)) * 100;
}

export function getSplineIndexFromProgress(
  progress: number,
  totalSplinePoints: number,
): number {
  if (totalSplinePoints <= 1) {
    return 0;
  }
  return Math.round((progress / 100) * (totalSplinePoints - 1));
}

export function radToDeg(radians: number): number {
  return (radians * 180) / Math.PI;
}

export function degToRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function filterTunnelItemsByName(
  items: readonly TunnelItem[],
  searchTerm: string,
  getItemName: (type: number) => string,
): { item: TunnelItem; index: number }[] {
  return items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) =>
      getItemName(item.type).toLowerCase().includes(searchTerm.toLowerCase()),
    )
    .sort((left, right) => left.item.splineIndex - right.item.splineIndex);
}

export function updateTunnelItemRotation(
  item: TunnelItem,
  axis: "x" | "y" | "z",
  degrees: number,
): TunnelItem {
  return {
    ...item,
    rot: {
      ...item.rot,
      [axis]: degToRad(degrees),
    },
  };
}

export function updateTunnelItemOffset(
  item: TunnelItem,
  axis: "x" | "y" | "z",
  value: number,
): TunnelItem {
  return {
    ...item,
    positionOffset: {
      ...item.positionOffset,
      [axis]: value,
    },
  };
}
