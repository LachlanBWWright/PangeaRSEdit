import type { TunnelData, TunnelItem } from "@/data/tunnelParser/types";
import { GutterItemType, PlumbingItemType } from "@/data/tunnelParser/types";

export function getItemTypeOptions(
  isPlumbing: boolean,
): { value: string; label: string }[] {
  if (isPlumbing) {
    return [
      { value: String(PlumbingItemType.NAIL), label: "Nail" },
      { value: String(PlumbingItemType.BLOB), label: "Blob" },
      { value: String(PlumbingItemType.HEALTH_POW), label: "Health POW" },
      { value: String(PlumbingItemType.RING), label: "Ring" },
      { value: String(PlumbingItemType.SPRAY), label: "Spray" },
    ];
  }

  return [
    { value: String(GutterItemType.PINE_CONE), label: "Pine Cone" },
    { value: String(GutterItemType.LEAF), label: "Leaf" },
    { value: String(GutterItemType.SPRAY), label: "Spray" },
  ];
}

export function createDefaultItem(isPlumbing: boolean): TunnelItem {
  return {
    type: isPlumbing ? PlumbingItemType.RING : GutterItemType.LEAF,
    splineIndex: 0,
    sectionNum: 0,
    scale: 1,
    rot: { x: 0, y: 0, z: 0 },
    positionOffset: { x: 0, y: 0, z: 0 },
    flags: 0,
    parms: [0, 0, 0],
  };
}

export function filterTunnelItems(
  tunnelData: TunnelData,
  searchTerm: string,
  getItemName: (type: number) => string,
): { item: TunnelItem; index: number }[] {
  return tunnelData.items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) =>
      getItemName(item.type).toLowerCase().includes(searchTerm.toLowerCase()),
    );
}

export function updateTunnelItemField<K extends keyof TunnelItem>(
  item: TunnelItem,
  field: K,
  value: TunnelItem[K],
): TunnelItem {
  return {
    ...item,
    [field]: value,
  };
}

export function canUseSplineIndex(
  index: number,
  tunnelData: TunnelData,
): boolean {
  return index >= 0 && index < tunnelData.splinePoints.length;
}

export function canUseSectionNumber(
  sectionNumber: number,
  tunnelData: TunnelData,
): boolean {
  return sectionNumber >= -1 && sectionNumber < tunnelData.sections.length;
}

export function parsePositiveScale(value: string): number | null {
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}
