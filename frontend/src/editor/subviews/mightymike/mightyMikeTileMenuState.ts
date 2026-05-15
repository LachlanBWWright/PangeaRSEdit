import type { TerrainData } from "@/python/structSpecs/LevelTypes";
import { setMightyMikeTileLogicalIndex } from "@/data/game/mightyMikeTileValueUtils";
import { isArray, isRecord } from "./MightyMikeTileMenuUtils";

export function getTotalTileCount(mapWidth: number, mapHeight: number): number {
  return mapWidth * mapHeight;
}

export function getEffectiveSelectedTile(
  selectedTile: number,
  totalTiles: number,
): number {
  return totalTiles > 0 && selectedTile >= 0 && selectedTile < totalTiles
    ? selectedTile
    : 0;
}

export function getCurrentTileCanvas(
  mapImages: HTMLCanvasElement[],
  currentImageIndex: number | null,
): HTMLCanvasElement | null {
  if (currentImageIndex === null) {
    return null;
  }
  return mapImages[currentImageIndex] ?? null;
}

export function getCurrentTileAttributes(
  terrainData: TerrainData,
  currentImageIndex: number | null,
): Record<string, unknown> | null {
  if (currentImageIndex === null) {
    return null;
  }
  const tileset = isRecord(terrainData.tileset)
    ? terrainData.tileset
    : undefined;
  const tileAttributes =
    tileset && isArray(tileset.tileAttributes) ? tileset.tileAttributes : [];
  const attribute = tileAttributes[currentImageIndex];
  return isRecord(attribute) ? attribute : null;
}

export function isValidPaletteTileIndex(
  selectedPaletteTile: number,
  imageCount: number,
): boolean {
  return selectedPaletteTile >= 0 && selectedPaletteTile < imageCount;
}

export function applySelectedTileLogicalIndex(
  terrainData: TerrainData,
  selectedTile: number,
  logicalIndex: number,
): void {
  setMightyMikeTileLogicalIndex(terrainData, selectedTile, logicalIndex);
}

export function appendPaletteMapping(
  terrainData: TerrainData,
  imageIndex: number,
): void {
  if (terrainData.Xlat?.[1000]?.obj) {
    terrainData.Xlat[1000].obj.push({ idx: imageIndex });
  }
}

export function findOrCreateLogicalIndexForImage(
  terrainData: TerrainData,
  imageIndex: number,
): number | null {
  if (imageIndex < 0) {
    return null;
  }

  const xlatTable = terrainData.Xlat?.[1000]?.obj;
  if (!xlatTable) {
    return imageIndex;
  }

  const existingIndex = xlatTable.findIndex((entry) => entry.idx === imageIndex);
  if (existingIndex >= 0) {
    return existingIndex;
  }

  xlatTable.push({ idx: imageIndex });
  return xlatTable.length - 1;
}
