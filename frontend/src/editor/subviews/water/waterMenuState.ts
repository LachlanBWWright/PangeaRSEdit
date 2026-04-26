import type { GlobalsInterface } from "@/data/globals/globals";
import type { LiquidData, Liquid } from "@/python/structSpecs/LevelTypes";
import { getWaterBodyTypes } from "@/data/water/getWaterBodyTypes";

export function getWaterBodyValues(globals: GlobalsInterface): number[] {
  const result = getWaterBodyTypes(globals);
  if (!result.isOk()) return [];
  return result.value
    .map((key) => Number.parseInt(key, 10))
    .filter((key) => !Number.isNaN(key));
}

export function getSelectedWaterBody(
  liquidData: LiquidData,
  selectedWaterBody: number | null,
) {
  if (selectedWaterBody === null) {
    return null;
  }
  return liquidData.Liqd?.[1000]?.obj?.[selectedWaterBody] ?? null;
}

export function getSelectedWaterNub(
  selectedWaterBodyData: Liquid | null,
  selectedWaterNub: number | null,
): [number, number] | null {
  if (
    !selectedWaterBodyData ||
    selectedWaterNub === null ||
    selectedWaterNub >= selectedWaterBodyData.numNubs
  ) {
    return null;
  }

  return selectedWaterBodyData.nubs[selectedWaterNub] ?? null;
}

export function addDefaultWaterBody(
  draft: LiquidData,
  globals: GlobalsInterface,
): number {
  const nextWaterBodyIndex = draft.Liqd[1000].obj.length;
  draft.Liqd[1000].obj.push({
    type: 0,
    nubs: [
      [100, 100],
      [100, 200],
      [200, 200],
      [200, 100],
    ],
    numNubs: 4,
    hotSpotX: 150,
    hotSpotZ: 150,
    bBoxTop: 200,
    bBoxLeft: 200,
    bBoxBottom: 200,
    bBoxRight: 200,
    height: 0,
    flags: 0,
    reserved: 0,
  });

  for (let index = 4; index < globals.LIQD_NUBS; index++) {
    draft.Liqd[1000].obj.at(-1)?.nubs.push([0, 0]);
  }

  return nextWaterBodyIndex;
}

export function updateWaterBodyType(
  draft: LiquidData,
  selectedWaterBody: number | null,
  newType: number,
): void {
  if (selectedWaterBody === null) {
    return;
  }
  const waterObj = draft.Liqd[1000]?.obj?.[selectedWaterBody];
  if (waterObj) {
    waterObj.type = newType;
  }
}

export function updateWaterBodyHotspot(
  draft: LiquidData,
  selectedWaterBody: number | null,
  axis: "x" | "z",
  value: number,
): void {
  if (selectedWaterBody === null) {
    return;
  }
  const waterObj = draft.Liqd[1000]?.obj?.[selectedWaterBody];
  if (!waterObj) {
    return;
  }
  if (axis === "x") {
    waterObj.hotSpotX = value;
  } else {
    waterObj.hotSpotZ = value;
  }
}

export function updateWaterBodyNub(
  draft: LiquidData,
  selectedWaterBody: number | null,
  selectedWaterNub: number | null,
  axis: 0 | 1,
  value: number,
): void {
  if (selectedWaterBody === null || selectedWaterNub === null) {
    return;
  }
  const waterObj = draft.Liqd[1000]?.obj?.[selectedWaterBody];
  const nub = waterObj?.nubs?.[selectedWaterNub];
  if (nub) {
    nub[axis] = value;
  }
}

export function addWaterBodyNub(
  draft: LiquidData,
  selectedWaterBody: number | null,
  maxNubs: number,
): void {
  if (selectedWaterBody === null) {
    return;
  }
  const waterObj = draft.Liqd[1000]?.obj?.[selectedWaterBody];
  if (!waterObj || waterObj.numNubs === maxNubs) {
    return;
  }
  const prevNub = waterObj.nubs?.[waterObj.numNubs - 1];
  if (!prevNub) {
    return;
  }
  waterObj.nubs[waterObj.numNubs] = [prevNub[0] + 50, prevNub[1] + 50];
  waterObj.numNubs += 1;
}

export function canDeleteWaterBodyNub(
  liquidData: LiquidData,
  selectedWaterBody: number | null,
): boolean {
  if (selectedWaterBody === null) {
    return false;
  }
  const count = liquidData.Liqd[1000]?.obj?.[selectedWaterBody]?.numNubs ?? 0;
  return count > 3;
}

export function deleteWaterBodyNub(
  draft: LiquidData,
  selectedWaterBody: number | null,
): void {
  if (selectedWaterBody === null) {
    return;
  }
  const waterObj = draft.Liqd[1000]?.obj?.[selectedWaterBody];
  if (!waterObj || waterObj.numNubs <= 3) {
    return;
  }
  waterObj.numNubs -= 1;
}

export function deleteWaterBody(
  draft: LiquidData,
  selectedWaterBody: number | null,
): void {
  if (selectedWaterBody === null) {
    return;
  }
  draft.Liqd[1000].obj.splice(selectedWaterBody, 1);
}
