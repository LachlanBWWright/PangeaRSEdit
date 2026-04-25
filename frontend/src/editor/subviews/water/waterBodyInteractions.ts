import type Konva from "konva";
import type { Updater } from "use-immer";
import type { LiquidData } from "@/python/structSpecs/LevelTypes";
import { View } from "@/editor/viewEnum";

interface WaterSelectionArgs {
  readonly waterBodyIdx: number;
  readonly setSelectedWaterBody: (index: number) => void;
  readonly setActiveView: (view: View) => void;
}

export function selectWaterBody({
  waterBodyIdx,
  setSelectedWaterBody,
  setActiveView,
}: WaterSelectionArgs): void {
  setSelectedWaterBody(waterBodyIdx);
  setActiveView(View.water);
}

interface WaterNubSelectionArgs extends WaterSelectionArgs {
  readonly nubIdx: number;
  readonly setSelectedWaterNub: (index: number) => void;
}

export function selectWaterNub({
  waterBodyIdx,
  nubIdx,
  setSelectedWaterBody,
  setActiveView,
  setSelectedWaterNub,
}: WaterNubSelectionArgs): void {
  selectWaterBody({ waterBodyIdx, setSelectedWaterBody, setActiveView });
  setSelectedWaterNub(nubIdx);
}

export function cloneVisibleWaterNubs(
  nubs: [number, number][],
  numNubs: number,
): [number, number][] {
  return nubs
    .filter((_, index) => index < numNubs)
    .map((nub) => [nub[0], nub[1]]);
}

export function applyDraggedBodyOffset(
  setLiquidData: Updater<LiquidData>,
  waterBodyIdx: number,
  initialDragState: [number, number][],
  dragDx: number,
  dragDz: number,
): void {
  setLiquidData((draft) => {
    const body = draft.Liqd[1000].obj[waterBodyIdx];
    if (!body) {
      return;
    }

    for (let index = 0; index < initialDragState.length; index += 1) {
      const nub = body.nubs[index];
      const initialNub = initialDragState[index];
      if (!nub || !initialNub || index >= body.numNubs) {
        continue;
      }
      nub[0] = initialNub[0] + dragDx;
      nub[1] = initialNub[1] + dragDz;
    }
  });
}

export function updatePreviewNub(
  previewNubs: [number, number][],
  nubIdx: number,
  x: number,
  y: number,
): [number, number][] {
  const updatedNub = previewNubs[nubIdx];
  if (!updatedNub) {
    return previewNubs;
  }
  updatedNub[0] = x;
  updatedNub[1] = y;
  return previewNubs;
}

export function drawPreviewLine(
  line: Konva.Line | null,
  previewNubs: [number, number][],
): void {
  if (!line) {
    return;
  }
  line.points(previewNubs.flatMap((nub) => [nub[0], nub[1]]));
  line.getLayer()?.batchDraw();
}

export function commitWaterNubPosition(
  setLiquidData: Updater<LiquidData>,
  waterBodyIdx: number,
  nubIdx: number,
  x: number,
  y: number,
): void {
  setLiquidData((liquidData) => {
    const waterBody = liquidData.Liqd[1000].obj[waterBodyIdx];
    const nub = waterBody?.nubs[nubIdx];
    if (!nub) {
      return;
    }
    nub[0] = Math.round(x);
    nub[1] = Math.round(y);
  });
}

export function commitWaterHotspotPosition(
  setLiquidData: Updater<LiquidData>,
  waterBodyIdx: number,
  x: number,
  y: number,
): void {
  setLiquidData((liquidData) => {
    const waterBody = liquidData.Liqd[1000].obj[waterBodyIdx];
    if (!waterBody) {
      return;
    }
    waterBody.hotSpotX = Math.round(x);
    waterBody.hotSpotZ = Math.round(y);
  });
}
