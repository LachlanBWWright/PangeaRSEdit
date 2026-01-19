import { TerrainData } from "@/python/structSpecs/LevelTypes";

function clampInt16(val: number): number {
  return Math.max(-32768, Math.min(32767, Math.round(val)));
}

export function createRoofDataFromFloor(
  floorData: number[] | Int16Array,
  defaultOffset: number = 100
): number[] {
  // Convert to regular array if it's Int16Array
  const floorArray = Array.from(floorData);
  return floorArray.map(floor => clampInt16(floor + defaultOffset));
}

export function createFlatRoof(
  size: number,
  elevation: number = 500
): number[] {
  return new Array(size).fill(elevation);
}

export function copyFloorToRoof(
  terrainData: TerrainData,
  offset: number
): TerrainData {
  if (!terrainData.YCrd || !terrainData.YCrd[1000]) {
      return terrainData;
  }

  const floorData = terrainData.YCrd[1000].obj;
  const newRoofData = createRoofDataFromFloor(floorData, offset);

  return {
    ...terrainData,
    YCrd: {
      ...terrainData.YCrd,
      1001: {
        name: 'Roof Y Coords',
        obj: newRoofData,
        order: terrainData.YCrd[1000].order + 1,
      },
    },
  };
}
