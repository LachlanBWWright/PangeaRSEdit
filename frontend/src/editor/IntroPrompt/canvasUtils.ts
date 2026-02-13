/**
 * Utilities for creating blank canvases and levels
 */

import type { GlobalsInterface } from "../../data/globals/globals";
import { DataType } from "../../data/globals/globals";
import type { HeaderData, TerrainData } from "../../python/structSpecs/LevelTypes";

export function createBlankCanvas(size: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, size, size);
  }
  return canvas;
}

export function createBlankMapImagesForGame(
  globals: GlobalsInterface,
  headerData: HeaderData,
  terrainData: TerrainData,
): HTMLCanvasElement[] {
  const header = headerData.Hedr?.[1000]?.obj;
  if (!header) return [];
  const tileSize =
    globals.DATA_TYPE === DataType.STANDARD
      ? globals.SUPERTILE_TEXMAP_SIZE
      : globals.TILE_SIZE;
  if (globals.DATA_TYPE === DataType.STANDARD) {
    const supertileCount = terrainData.STgd?.[1000]?.obj.length ?? 1;
    return new Array(Math.max(supertileCount, 1))
      .fill(null)
      .map(() => createBlankCanvas(tileSize));
  }
  if (globals.DATA_TYPE === DataType.MIGHTY_MIKE) {
    const tileCount = header.mapWidth * header.mapHeight;
    return new Array(Math.max(tileCount, 1))
      .fill(null)
      .map(() => createBlankCanvas(tileSize));
  }
  const tileCount =
    terrainData.Xlat?.[1000]?.obj.length ?? header.mapWidth * header.mapHeight;
  return new Array(Math.max(tileCount, 1))
    .fill(null)
    .map(() => createBlankCanvas(tileSize));
}
