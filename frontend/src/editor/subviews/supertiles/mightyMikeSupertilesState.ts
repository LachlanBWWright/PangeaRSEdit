import type Konva from "konva";
import {
  getAltMapArray,
  isArray,
  isRecord,
} from "@/editor/subviews/supertiles/mightyMikeSupertilesHelpers";
import type { TerrainData } from "@/python/structSpecs/LevelTypes";

export function getTileIndexFromPointerPosition(
  x: number,
  y: number,
  tileSize: number,
  mapWidth: number,
  mapHeight: number,
  layrLength: number,
): number | null {
  const col = Math.floor(x / tileSize);
  const row = Math.floor(y / tileSize);
  if (col < 0 || row < 0 || col >= mapWidth || row >= mapHeight) {
    return null;
  }
  const tileIdx = row * mapWidth + col;
  if (tileIdx >= layrLength) {
    return null;
  }
  return tileIdx;
}

export function getTileIndexFromKonvaEvent(
  event: Konva.KonvaEventObject<MouseEvent>,
  tileSize: number,
  mapWidth: number,
  mapHeight: number,
  layrLength: number,
): number | null {
  const stage = event.target.getStage();
  const position = stage?.getRelativePointerPosition();
  if (!position) {
    return null;
  }
  return getTileIndexFromPointerPosition(
    position.x,
    position.y,
    tileSize,
    mapWidth,
    mapHeight,
    layrLength,
  );
}

export function applyCollisionMaskToggle(
  data: TerrainData,
  tileIdx: number,
): void {
  const metadata =
    isRecord(data._metadata) &&
    isRecord(data._metadata[1000]) &&
    isRecord(data._metadata[1000].obj)
      ? data._metadata[1000].obj
      : undefined;
  const tileValues =
    metadata && isArray(metadata.mightyMikeTileValues)
      ? metadata.mightyMikeTileValues
      : undefined;
  if (!tileValues || tileIdx < 0 || tileIdx >= tileValues.length) {
    return;
  }
  const tileValue = tileValues[tileIdx];
  if (!isRecord(tileValue)) {
    return;
  }
  tileValue.hasCollisionMask = !tileValue.hasCollisionMask;
}

export function applyParamBrush(
  data: TerrainData,
  tileIdx: number,
  paramBrushField: "flags" | "p0" | "p1",
  paramBrushValue: number,
): void {
  const logicalIndex = data.Layr?.[1000]?.obj?.[tileIdx];
  if (logicalIndex === undefined) {
    return;
  }
  const xlatTable = data.Xlat?.[1000]?.obj;
  const physicalIndex =
    xlatTable &&
    logicalIndex < xlatTable.length &&
    isRecord(xlatTable[logicalIndex]) &&
    typeof xlatTable[logicalIndex].idx === "number"
      ? xlatTable[logicalIndex].idx
      : logicalIndex;

  const tileset = isRecord(data.tileset) ? data.tileset : undefined;
  const tileAttributes =
    tileset && isArray(tileset.tileAttributes)
      ? tileset.tileAttributes
      : undefined;
  const tileAttribute = tileAttributes?.[physicalIndex];
  if (isRecord(tileAttribute)) {
    tileAttribute[paramBrushField] = paramBrushValue;
  }

  const levelAttribute = data.Atrb?.[1000]?.obj?.[physicalIndex];
  if (levelAttribute) {
    levelAttribute[paramBrushField] = paramBrushValue;
  }
}

export function applyAltMapBrush(
  data: TerrainData,
  tileIdx: number,
  mapWidth: number,
  layrLength: number,
  altMapBrushValue: number,
): void {
  let altMap = getAltMapArray(data._metadata);
  if (!altMap) {
    const metadata: Record<string, unknown> = isRecord(data._metadata)
      ? data._metadata
      : {};
    const entry: Record<string, unknown> = isRecord(metadata["1000"])
      ? metadata["1000"]
      : { obj: {} };
    const obj: Record<string, unknown> = isRecord(entry.obj) ? entry.obj : {};
    if (!isRecord(obj.mightyMikeMapData)) {
      obj.mightyMikeMapData = {};
    }
    const mapDataEntry = obj.mightyMikeMapData;
    if (!isRecord(mapDataEntry)) {
      return;
    }
    const mapHeight = Math.ceil(layrLength / mapWidth);
    const nextAltMap: number[][] = Array.from({ length: mapHeight }, () =>
      new Array<number>(mapWidth).fill(0),
    );
    mapDataEntry.altMap = nextAltMap;
    entry.obj = obj;
    metadata["1000"] = entry;
    altMap = nextAltMap;
  }

  const row = Math.floor(tileIdx / mapWidth);
  const col = tileIdx % mapWidth;
  const rowArray = altMap[row];
  if (isArray(rowArray) && col < rowArray.length) {
    rowArray[col] = altMapBrushValue;
  }
}
