import {
  HeaderData,
  TerrainData,
} from "@/python/structSpecs/LevelTypes";
import { GlobalsInterface } from "@/data/globals/globals";
import { getHeightAtTile } from "./getHeightAtTile";

export const getTerrainHeightAtPoint = (
  x: number, // world x
  z: number, // world z
  headerData: HeaderData,
  terrainData: TerrainData,
  globals: GlobalsInterface,
) => {
  // Scale world coordinates to tile coordinates (where 1 unit = 1 tile)
  const x_tile_units = x / globals.TILE_SIZE;
  const z_tile_units = z / globals.TILE_SIZE;

  // Get the four surrounding tile integer indices
  const x1 = Math.floor(x_tile_units);
  const z1 = Math.floor(z_tile_units);
  const x2 = Math.ceil(x_tile_units);
  const z2 = Math.ceil(z_tile_units);

  // Get heights at the four corner points
  const h11 = getHeightAtTile(x1, z1, headerData, terrainData, globals);
  const h21 = getHeightAtTile(x2, z1, headerData, terrainData, globals);
  const h12 = getHeightAtTile(x1, z2, headerData, terrainData, globals);
  const h22 = getHeightAtTile(x2, z2, headerData, terrainData, globals);

  if (isNaN(h11) || isNaN(h21) || isNaN(h12) || isNaN(h22)) {
    console.warn("NaN height value(s) from getHeightAtTile:", {
      x,
      z,
      x1,
      z1,
      x2,
      z2,
      h11,
      h21,
      h12,
      h22,
    });
  }

  // Bilinear interpolation factors
  const dx = x2 - x1;
  const dz = z2 - z1;

  const xFactor = dx === 0 ? 0 : (x_tile_units - x1) / dx;
  const zFactor = dz === 0 ? 0 : (z_tile_units - z1) / dz;

  const interpolatedHeight =
    h11 * (1 - xFactor) * (1 - zFactor) +
    h21 * xFactor * (1 - zFactor) +
    h12 * (1 - xFactor) * zFactor +
    h22 * xFactor * zFactor;

  if (isNaN(interpolatedHeight)) {
    console.warn("Interpolated height is NaN. Inputs:", {
      x_world: x,
      z_world: z,
      x_tile_units,
      z_tile_units,
      x1,
      z1,
      x2,
      z2,
      h11,
      h21,
      h12,
      h22,
      xFactor,
      zFactor,
      dx,
      dz,
    });
  }

  return interpolatedHeight;
};
