import {
  HeaderData,
  TerrainData,
} from "@/python/structSpecs/LevelTypes";
import { GlobalsInterface } from "@/data/globals/globals";
import { flattenCoords } from "./flattenCoords";

export const getHeightAtTile = (
  xTile: number,
  yTile: number,
  headerData: HeaderData,
  terrainData: TerrainData,
  globals: GlobalsInterface,
) => {
  const header = headerData.Hedr?.[1000]?.obj;
  if (!header || !terrainData.YCrd?.[1000]?.obj) return 0;

  // Call flattenCoords without globals
  const idx = flattenCoords(xTile, yTile, header);
  const yCoords = terrainData.YCrd[1000].obj;
  const mapTileSize = header.tileSize;
  const yScale = globals.TILE_INGAME_SIZE / mapTileSize;
  if (idx < 0 || idx >= yCoords.length) {
    console.warn(
      `Index ${idx} out of bounds for yCoords array of length ${yCoords.length}`,
    );
    return header.minY * yScale; // Fallback if out of bounds
  }
  return (yCoords[idx] ?? header.minY) * yScale;
};
