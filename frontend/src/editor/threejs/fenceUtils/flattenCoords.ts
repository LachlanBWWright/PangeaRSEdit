import { ottoHeader } from "@/python/structSpecs/ottoMaticInterface";

// xTile and yTile are expected to be integer tile indices.
// Math.floor is for safety if they are somehow passed as float tile indices.
export const flattenCoords = (
  xTile: number, // Integer tile index
  yTile: number, // Integer tile index for Z
  header: ottoHeader,
) => {
  const finalXTile = Math.floor(xTile);
  const finalZTile = Math.floor(yTile); // yTile is already the Z tile index, no division needed.
  return finalZTile * (header.mapWidth + 1) + finalXTile;
};
