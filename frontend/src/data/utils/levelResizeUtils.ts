import type { GlobalsInterface } from "@/data/globals/globals";
import type {
  LevelData,
  TerrainData,
  HeaderData,
  ItemData,
  TerrainItem,
} from "@/python/structSpecs/LevelTypes";
import type { MightyMikeMap, MightyMikeTileValue } from "@/python/structSpecs/mightyMikeInterface";

export type ResizeDirection = "top" | "bottom" | "left" | "right";

export interface ResizeOptions {
  direction: ResizeDirection;
  tileCount: number;
  defaultHeight: number;
}

export interface ResizeResult {
  ok: boolean;
  levelData: LevelData;
  warnings: string[];
  itemsOutOfBounds: TerrainItem[];
}

interface ResizeDimensions {
  newWidth: number;
  newHeight: number;
  offsetX: number;
  offsetZ: number;
}

function getResizeDimensions(
  header: { mapWidth: number; mapHeight: number },
  options: ResizeOptions,
): ResizeDimensions {
  const { tileCount, direction } = options;
  const widthDelta = direction === "left" || direction === "right" ? tileCount : 0;
  const heightDelta = direction === "top" || direction === "bottom" ? tileCount : 0;
  const newWidth = Math.max(1, header.mapWidth + widthDelta);
  const newHeight = Math.max(1, header.mapHeight + heightDelta);
  const offsetX = direction === "left" ? tileCount : 0;
  const offsetZ = direction === "top" ? tileCount : 0;
  return { newWidth, newHeight, offsetX, offsetZ };
}

function resize1DArray<T>(
  array: T[],
  oldWidth: number,
  oldHeight: number,
  newWidth: number,
  newHeight: number,
  offsetX: number,
  offsetZ: number,
  defaultValue: T,
): T[] {
  const newArray = new Array<T>(newWidth * newHeight);
  for (let z = 0; z < newHeight; z++) {
    for (let x = 0; x < newWidth; x++) {
      const oldX = x - offsetX;
      const oldZ = z - offsetZ;
      const newIndex = z * newWidth + x;
      if (oldX >= 0 && oldX < oldWidth && oldZ >= 0 && oldZ < oldHeight) {
        const oldIndex = oldZ * oldWidth + oldX;
        newArray[newIndex] = array[oldIndex] ?? defaultValue;
      } else {
        newArray[newIndex] = defaultValue;
      }
    }
  }
  return newArray;
}

function resizeYCrdArray(
  array: number[],
  oldWidth: number,
  oldHeight: number,
  newWidth: number,
  newHeight: number,
  offsetX: number,
  offsetZ: number,
  defaultHeight: number,
): number[] {
  const widthPlus = newWidth + 1;
  const heightPlus = newHeight + 1;
  const oldWidthPlus = oldWidth + 1;
  const oldHeightPlus = oldHeight + 1;
  const newArray = new Array<number>(widthPlus * heightPlus).fill(defaultHeight);
  for (let z = 0; z < heightPlus; z++) {
    for (let x = 0; x < widthPlus; x++) {
      const oldX = x - offsetX;
      const oldZ = z - offsetZ;
      if (oldX >= 0 && oldX < oldWidthPlus && oldZ >= 0 && oldZ < oldHeightPlus) {
        const oldIndex = oldZ * oldWidthPlus + oldX;
        const newIndex = z * widthPlus + x;
        newArray[newIndex] = array[oldIndex] ?? defaultHeight;
      }
    }
  }
  return newArray;
}

function resizeTerrainData(
  terrainData: TerrainData,
  header: { mapWidth: number; mapHeight: number },
  globals: GlobalsInterface,
  options: ResizeOptions,
): TerrainData {
  const { newWidth, newHeight, offsetX, offsetZ } = getResizeDimensions(header, options);
  const layr = terrainData.Layr?.[1000]?.obj ?? [];
  const resizedLayr = resize1DArray(
    layr,
    header.mapWidth,
    header.mapHeight,
    newWidth,
    newHeight,
    offsetX,
    offsetZ,
    0,
  );

  const ycrd = terrainData.YCrd?.[1000]?.obj ?? [];
  const resizedYCrd = resizeYCrdArray(
    ycrd,
    header.mapWidth,
    header.mapHeight,
    newWidth,
    newHeight,
    offsetX,
    offsetZ,
    options.defaultHeight,
  );

  const resized: TerrainData = {
    ...terrainData,
    Layr: terrainData.Layr
      ? {
          ...terrainData.Layr,
          1000: {
            ...terrainData.Layr[1000],
            obj: resizedLayr,
          },
        }
      : terrainData.Layr,
    YCrd: terrainData.YCrd
      ? {
          ...terrainData.YCrd,
          1000: {
            ...terrainData.YCrd[1000],
            obj: resizedYCrd,
          },
        }
      : terrainData.YCrd,
  };
  if (terrainData.YCrd?.[1001]?.obj) {
    const roof = resizeYCrdArray(
      terrainData.YCrd[1001].obj,
      header.mapWidth,
      header.mapHeight,
      newWidth,
      newHeight,
      offsetX,
      offsetZ,
      options.defaultHeight,
    );
    resized.YCrd = {
      ...resized.YCrd,
      1001: {
        ...terrainData.YCrd[1001],
        obj: roof,
      },
    };
  }
  if (terrainData.STgd?.[1000]?.obj) {
    const stgd = terrainData.STgd[1000].obj;
    const oldSTWidth = Math.ceil(header.mapWidth / globals.TILES_PER_SUPERTILE);
    const oldSTHeight = Math.ceil(header.mapHeight / globals.TILES_PER_SUPERTILE);
    const newSTWidth = Math.ceil(newWidth / globals.TILES_PER_SUPERTILE);
    const newSTHeight = Math.ceil(newHeight / globals.TILES_PER_SUPERTILE);
    const offsetSTX = Math.ceil(offsetX / globals.TILES_PER_SUPERTILE);
    const offsetSTZ = Math.ceil(offsetZ / globals.TILES_PER_SUPERTILE);
    const resizedStgd = resize1DArray(
      stgd,
      oldSTWidth,
      oldSTHeight,
      newSTWidth,
      newSTHeight,
      offsetSTX,
      offsetSTZ,
      { isEmpty: true, superTileId: 0 },
    );
    resized.STgd = {
      ...terrainData.STgd,
      1000: {
        ...terrainData.STgd[1000],
        obj: resizedStgd,
      },
    };
  }
  return resized;
}

function resizeItems(
  itemData: ItemData | null,
  options: ResizeOptions,
  header: { mapWidth: number; mapHeight: number },
  globals: GlobalsInterface,
): { data: ItemData | null; outOfBounds: TerrainItem[] } {
  if (!itemData?.Itms?.[1000]?.obj) return { data: itemData, outOfBounds: [] };
  const { offsetX, offsetZ, newWidth, newHeight } = getResizeDimensions(header, options);
  const tileSize = globals.TILE_INGAME_SIZE;
  const offsetXUnits = offsetX * tileSize;
  const offsetZUnits = offsetZ * tileSize;
  const maxX = newWidth * tileSize;
  const maxZ = newHeight * tileSize;
  const adjustedItems: TerrainItem[] = [];
  const outOfBounds: TerrainItem[] = [];
  for (const item of itemData.Itms[1000].obj) {
    const updated = {
      ...item,
      x: item.x + offsetXUnits,
      z: item.z + offsetZUnits,
    };
    if (updated.x < 0 || updated.z < 0 || updated.x > maxX || updated.z > maxZ) {
      outOfBounds.push(updated);
    } else {
      adjustedItems.push(updated);
    }
  }
  return {
    data: {
      ...itemData,
      Itms: {
        ...itemData.Itms,
        1000: {
          ...itemData.Itms[1000],
          obj: adjustedItems,
        },
      },
    },
    outOfBounds,
  };
}

function resizeItCo(data: TerrainData, header: { mapWidth: number; mapHeight: number }): TerrainData {
  const itco = data.ItCo?.[1000];
  if (!itco) return data;
  const updated = {
    ...itco,
    data: "",
  };
  return {
    ...data,
    ItCo: {
      ...data.ItCo,
      1000: updated,
    },
  };
}

function updateHeader(
  headerData: HeaderData,
  options: ResizeOptions,
): HeaderData {
  const header = headerData.Hedr[1000].obj;
  const { newWidth, newHeight } = getResizeDimensions(header, options);
  const updated = {
    ...header,
    mapWidth: newWidth,
    mapHeight: newHeight,
  };
  return {
    Hedr: {
      1000: {
        ...headerData.Hedr[1000],
        obj: updated,
      },
    },
  };
}

export function resizeLevel(
  levelData: LevelData,
  globals: GlobalsInterface,
  options: ResizeOptions,
): ResizeResult {
  const headerData: HeaderData = { Hedr: levelData.Hedr };
  const header = headerData.Hedr[1000].obj;
  const terrainData: TerrainData = {
    Atrb: levelData.Atrb,
    Timg: levelData.Timg,
    ItCo: levelData.ItCo,
    Layr: levelData.Layr,
    STgd: levelData.STgd,
    YCrd: levelData.YCrd,
    alis: levelData.alis,
    _metadata: levelData._metadata,
    ...(levelData.Xlat !== undefined ? { Xlat: levelData.Xlat } : {}),
    ...(levelData.Vcol !== undefined ? { Vcol: levelData.Vcol } : {}),
  };
  const resizedTerrain = resizeTerrainData(terrainData, header, globals, options);
  const resizedTerrainWithItCo = resizeItCo(resizedTerrain, header);
  const { data: resizedItems, outOfBounds } = resizeItems(
    levelData.Itms ? { Itms: levelData.Itms } : null,
    options,
    header,
    globals,
  );
  const updatedHeader = updateHeader(headerData, options);
  const resizedLevel: LevelData = {
    ...levelData,
    ...updatedHeader,
    ...resizedTerrainWithItCo,
    ...(resizedItems ? resizedItems : {}),
  } as LevelData;
  return {
    ok: true,
    levelData: resizedLevel,
    warnings: outOfBounds.length ? ["Some items were outside the new bounds."] : [],
    itemsOutOfBounds: outOfBounds,
  };
}

export function resizeMightyMikeMap(
  mapData: MightyMikeMap,
  options: ResizeOptions,
): { map: MightyMikeMap; tileValues: MightyMikeTileValue[] } {
  const { newWidth, newHeight, offsetX, offsetZ } = getResizeDimensions(
    { mapWidth: mapData.mapWidth, mapHeight: mapData.mapHeight },
    options,
  );
  const blankTile: MightyMikeTileValue = {
    rawValue: 0,
    tileIndex: 0,
    hasCollisionMask: false,
    usePixelAccurateCollision: false,
  };
  const resizedRows = resize1DArray(
    mapData.mapImage.flat(),
    mapData.mapWidth,
    mapData.mapHeight,
    newWidth,
    newHeight,
    offsetX,
    offsetZ,
    blankTile,
  );
  const mapImage: MightyMikeTileValue[][] = [];
  for (let z = 0; z < newHeight; z++) {
    mapImage.push(resizedRows.slice(z * newWidth, (z + 1) * newWidth));
  }
  return {
    map: {
      ...mapData,
      mapWidth: newWidth,
      mapHeight: newHeight,
      mapImage,
    },
    tileValues: resizedRows,
  };
}
