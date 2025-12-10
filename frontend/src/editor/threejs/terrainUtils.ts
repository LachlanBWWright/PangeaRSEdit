import {
  HeaderData,
  TerrainData,
} from "@/python/structSpecs/LevelTypes";
import { GlobalsInterface, Game } from "@/data/globals/globals";
import { Result, ok, err } from "@/types/result";

export function combineMapImagesFromSTgd(
  mapImages: HTMLCanvasElement[],
  headerData: HeaderData,
  terrainData: TerrainData,
  globals: GlobalsInterface,
): Result<HTMLCanvasElement, Error> {
  if (mapImages.length === 0) {
    return err(new Error("No map images to combine"));
  }

  const header = headerData.Hedr?.[1000]?.obj;
  if (!header || !terrainData.STgd?.[1000]?.obj) {
    return err(new Error("Missing header or supertile data"));
  }

  const numWide = header.mapWidth;
  const numHigh = header.mapHeight;

  // Combine vertically (can be adjusted as needed)
  const combinedCanvas = document.createElement("canvas");
  combinedCanvas.width =
    (globals.SUPERTILE_TEXMAP_SIZE / globals.TILES_PER_SUPERTILE) * numWide;
  combinedCanvas.height =
    (globals.SUPERTILE_TEXMAP_SIZE / globals.TILES_PER_SUPERTILE) * numHigh;
  const ctx = combinedCanvas.getContext("2d");
  if (!ctx) return err(new Error("Could not get canvas context"));

  const supertilesWide = numWide / globals.TILES_PER_SUPERTILE;
  const supertilesHigh = numHigh / globals.TILES_PER_SUPERTILE;

  const stgdObj = terrainData.STgd[1000].obj;
  for (let i = 0; i < supertilesWide; i++) {
    for (let j = 0; j < supertilesHigh; j++) {
      const stgdEntry = stgdObj[i + j * supertilesWide];
      if (!stgdEntry) continue;
      const tileId = stgdEntry.superTileId ?? stgdEntry;
      if (tileId === globals.EMPTY_TILE_IDX) continue;
      const tileImg = mapImages[tileId];
      if (tileImg) {
        ctx.drawImage(
          tileImg,
          i * globals.SUPERTILE_TEXMAP_SIZE,
          j * globals.SUPERTILE_TEXMAP_SIZE,
        );
      }
    }
  }

  return ok(combinedCanvas);
}

export function combineMapImagesFromTiles(
  mapImages: HTMLCanvasElement[],
  headerData: HeaderData,
  terrainData: TerrainData,
  globals: GlobalsInterface,
): Result<HTMLCanvasElement, Error> {
  if (mapImages.length === 0) {
    return err(new Error("No tile images to combine"));
  }

  const header = headerData.Hedr?.[1000]?.obj;
  if (!header || !terrainData.Layr?.[1000]?.obj) {
    return err(new Error("Missing header or layer data"));
  }

  const numWide = header.mapWidth;
  const numHigh = header.mapHeight;
  const tileSize = globals.TILE_SIZE;

  // Create combined canvas sized for the full terrain
  const combinedCanvas = document.createElement("canvas");
  combinedCanvas.width = numWide * tileSize;
  combinedCanvas.height = numHigh * tileSize;
  const ctx = combinedCanvas.getContext("2d");
  if (!ctx) return err(new Error("Could not get canvas context"));

  const layerData = terrainData.Layr[1000].obj;
  const xlatTable = terrainData.Xlat?.[1000]?.obj;

  for (let y = 0; y < numHigh; y++) {
    for (let x = 0; x < numWide; x++) {
      const layerIndex = y * numWide + x;
      let tileIndex = layerData[layerIndex];

      if (tileIndex === undefined) continue;

      // Apply Xlat translation if available
      if (xlatTable) {
        const translatedEntry = xlatTable[tileIndex];
        if (translatedEntry !== undefined) {
          tileIndex = translatedEntry.idx;
        }
      }

      const tileImg = mapImages[tileIndex];
      if (tileImg) {
        ctx.drawImage(tileImg, x * tileSize, y * tileSize, tileSize, tileSize);
      }
    }
  }

  return ok(combinedCanvas);
}

export function combineMapImages(
  mapImages: HTMLCanvasElement[],
  headerData: HeaderData,
  terrainData: TerrainData,
  globals: GlobalsInterface,
): Result<HTMLCanvasElement, Error> {
  if (
    globals.GAME_TYPE === Game.BUGDOM ||
    globals.GAME_TYPE === Game.NANOSAUR
  ) {
    return combineMapImagesFromTiles(
      mapImages,
      headerData,
      terrainData,
      globals,
    );
  }

  return combineMapImagesFromSTgd(mapImages, headerData, terrainData, globals);
}

export default combineMapImages;
