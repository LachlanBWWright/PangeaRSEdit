import { HeaderData, TerrainData } from "@/python/structSpecs/LevelTypes";
import { GlobalsInterface, DataType } from "@/data/globals/globals";
import { Result } from "neverthrow";
import { ok, err } from "neverthrow";

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
      if (tileImg)
        ctx.drawImage(
          tileImg,
          i * globals.SUPERTILE_TEXMAP_SIZE,
          j * globals.SUPERTILE_TEXMAP_SIZE,
        );
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

  // Tile bit masks from Bugdom source code
  const TILENUM_MASK = 0x0fff; // bits 0-11: tile/image number
  const TILE_FLIPX_MASK = 1 << 15; // bit 15: flip horizontally
  const TILE_FLIPY_MASK = 1 << 14; // bit 14: flip vertically
  const TILE_ROTATE_MASK = (1 << 13) | (1 << 12); // bits 12-13: rotation
  const TILE_ROT1 = 1 << 12; // 90° rotation
  const TILE_ROT2 = 2 << 12; // 180° rotation
  const TILE_ROT3 = 3 << 12; // 270° rotation

  for (let y = 0; y < numHigh; y++) {
    for (let x = 0; x < numWide; x++) {
      const layerIndex = y * numWide + x;
      const tileValue = layerData[layerIndex];

      if (tileValue === undefined) continue;

      // Extract tile index from tileValue (remove flip/rotate bits)
      let tileIndex = tileValue & TILENUM_MASK;

      // Apply Xlat translation if available
      const translated = xlatTable?.[tileIndex];
      if (translated !== undefined) tileIndex = translated.idx;

      const tileImg = mapImages[tileIndex];
      if (!tileImg) continue;

      // Extract flip and rotation bits
      const flipX = (tileValue & TILE_FLIPX_MASK) !== 0;
      const flipY = (tileValue & TILE_FLIPY_MASK) !== 0;
      const rotation = tileValue & TILE_ROTATE_MASK;

      // Draw tile with transformations
      const destX = x * tileSize;
      const destY = y * tileSize;

      ctx.save();
      ctx.translate(destX + tileSize / 2, destY + tileSize / 2);

      // Apply rotation
      if (rotation === TILE_ROT1) ctx.rotate(Math.PI / 2);
      else if (rotation === TILE_ROT2) ctx.rotate(Math.PI);
      else if (rotation === TILE_ROT3) ctx.rotate((3 * Math.PI) / 2);

      // Apply flips
      const scaleX = flipX ? -1 : 1;
      const scaleY = flipY ? -1 : 1;
      ctx.scale(scaleX, scaleY);

      // Draw the tile
      ctx.drawImage(tileImg, -tileSize / 2, -tileSize / 2, tileSize, tileSize);

      ctx.restore();
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
  // Bugdom 1 and Nanosaur 1 use individual tiles (RSRC_FORK and TRT_FILE)
  if (
    globals.DATA_TYPE === DataType.RSRC_FORK ||
    globals.DATA_TYPE === DataType.TRT_FILE
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
