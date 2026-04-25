import type Konva from "konva";
import type {
  HeaderData,
  ItemData,
} from "@/python/structSpecs/LevelTypes";

export interface StageData {
  scale: number;
  x: number;
  y: number;
}

export interface ContainerSize {
  width: number;
  height: number;
}

export function getContainerSize(element: HTMLElement | null): ContainerSize {
  if (!element) {
    return { width: 3000, height: 2000 };
  }
  return {
    width: element.offsetWidth,
    height: element.offsetHeight,
  };
}

export function getTerrainContentSize(
  headerData: HeaderData,
  tileSize: number,
  scale: number,
): ContainerSize {
  const header = headerData.Hedr?.[1000]?.obj;
  if (!header) {
    return { width: 3000, height: 2000 };
  }

  return {
    width: (header.mapWidth + 1) * tileSize * scale,
    height: (header.mapHeight + 1) * tileSize * scale,
  };
}

export function addPlacedItem(
  data: ItemData,
  x: number,
  z: number,
  type: number,
): void {
  data.Itms[1000].obj.push({
    x,
    z,
    type,
    flags: 0,
    p0: 0,
    p1: 0,
    p2: 0,
    p3: 0,
  });
}

export function getPointerTilePosition(
  event: Konva.KonvaEventObject<MouseEvent>,
): { x: number; z: number } | null {
  const stage = event.target.getStage();
  const pointerPosition = stage?.getRelativePointerPosition();
  if (!pointerPosition) {
    return null;
  }
  return {
    x: Math.round(pointerPosition.x),
    z: Math.round(pointerPosition.y),
  };
}

export function clearCanvasSelections(
  setSelectedFence: (value: number | undefined) => void,
  setSelectedItem: (value: number | undefined) => void,
  setSelectedSpline: (value: number | undefined) => void,
  setSelectedWaterBody: (value: number | null) => void,
): void {
  setSelectedFence(undefined);
  setSelectedItem(undefined);
  setSelectedSpline(undefined);
  setSelectedWaterBody(null);
}

export function computeWheelZoomStage(
  event: Konva.KonvaEventObject<WheelEvent>,
): StageData | null {
  event.evt.preventDefault();

  const scaleBy = 1.05;
  const stage = event.target.getStage();
  if (!stage) {
    return null;
  }

  const oldScale = stage.scaleX();
  const pointerPosition = stage.getPointerPosition();
  if (!pointerPosition) {
    return null;
  }

  const mousePointTo = {
    x: pointerPosition.x / oldScale - stage.x() / oldScale,
    y: pointerPosition.y / oldScale - stage.y() / oldScale,
  };

  const newScale =
    event.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;

  return {
    scale: newScale,
    x: (pointerPosition.x / newScale - mousePointTo.x) * newScale,
    y: (pointerPosition.y / newScale - mousePointTo.y) * newScale,
  };
}

export function getStickyStageOffset(
  isTopologyMode: boolean,
  scrollOffset: { x: number; y: number },
  stage: StageData,
): { x: number; y: number } {
  if (isTopologyMode) {
    return { x: -scrollOffset.x, y: -scrollOffset.y };
  }
  return { x: stage.x, y: stage.y };
}



