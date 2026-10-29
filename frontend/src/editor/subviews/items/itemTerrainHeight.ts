import type { GlobalsInterface } from "@/data/globals/globals";
import type { HeaderData, TerrainData } from "@/python/structSpecs/LevelTypes";

/** Match the native terrain's diagonal choice and triangle interpolation. */
export function sampleItemTerrainHeight(
  x: number,
  z: number,
  headerData: HeaderData,
  terrainData: TerrainData,
  globals: GlobalsInterface,
): number {
  const header = headerData.Hedr[1000].obj;
  const heights = terrainData.YCrd?.[1000]?.obj;
  if (!heights?.length || header.mapWidth < 1 || header.mapHeight < 1) return 0;
  const tileX = Math.min(header.mapWidth, Math.max(0, x / globals.TILE_SIZE));
  const tileZ = Math.min(header.mapHeight, Math.max(0, z / globals.TILE_SIZE));
  const column = Math.min(header.mapWidth - 1, Math.floor(tileX));
  const row = Math.min(header.mapHeight - 1, Math.floor(tileZ));
  const dx = tileX - column;
  const dz = tileZ - row;
  const stride = header.mapWidth + 1;
  const y0 = heights[row * stride + column] ?? header.minY;
  const y1 = heights[row * stride + column + 1] ?? y0;
  const y2 = heights[(row + 1) * stride + column + 1] ?? y0;
  const y3 = heights[(row + 1) * stride + column] ?? y0;
  const backward = Math.abs(y0 - y2) < Math.abs(y1 - y3);
  let height: number;
  if (backward) {
    height = dx < dz
      ? y0 + dx * (y2 - y3) + dz * (y3 - y0)
      : y0 + dx * (y1 - y0) + dz * (y2 - y1);
  } else {
    height = dx + dz < 1
      ? y0 + dx * (y1 - y0) + dz * (y3 - y0)
      : y2 + (1 - dz) * (y1 - y2) + (1 - dx) * (y3 - y2);
  }
  return height * globals.TILE_INGAME_SIZE / header.tileSize;
}
