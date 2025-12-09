import { HeaderData } from "@/python/structSpecs/ottoMaticLevelData";
import { Game } from "@/data/globals/globals";

// Tile bit masks from Bugdom source code (terrain.h)
export const TILENUM_MASK = 0x0fff; // bits 0-11: tile/image number
export const TILE_FLIPX_MASK = 1 << 15; // bit 15: flip horizontally
export const TILE_FLIPY_MASK = 1 << 14; // bit 14: flip vertically
export const TILE_FLIPXY_MASK = TILE_FLIPY_MASK | TILE_FLIPX_MASK;
export const TILE_ROTATE_MASK = (1 << 13) | (1 << 12); // bits 12-13: rotation
export const TILE_ROT1 = 1 << 12; // 90° rotation
export const TILE_ROT2 = 2 << 12; // 180° rotation
export const TILE_ROT3 = 3 << 12; // 270° rotation

export interface BugdomLevelData {
  Xlat?: {
    1000: {
      obj: Array<{ idx: number }>;
      order: number;
    };
  };
  Timg?: {
    1000: {
      data: string;
      order: number;
    };
  };
  Layr: {
    1000: {
      obj: number[];
      order: number;
    };
  };
}

export function drawTileIntoBuffer(
  tileValue: number,
  tileImages: HTMLCanvasElement[],
  destCtx: CanvasRenderingContext2D,
  destX: number,
  destY: number,
  tileSize: number = 32,
  debugLog: boolean = false,
): void {
  const flipRotBits = tileValue & (TILE_FLIPXY_MASK | TILE_ROTATE_MASK);
  const texMapNum = tileValue & TILENUM_MASK;

  if (texMapNum >= tileImages.length) {
    if (debugLog) {
      console.warn(
        `drawTileIntoBuffer: texMapNum ${texMapNum} >= tileImages.length ${tileImages.length}`,
      );
    }
    destCtx.fillStyle = "magenta";
    destCtx.fillRect(destX, destY, tileSize, tileSize);
    return;
  }

  if (!tileImages[texMapNum]) {
    if (debugLog) {
      console.warn(
        `drawTileIntoBuffer: tileImages[${texMapNum}] is null/undefined`,
      );
    }
    destCtx.fillStyle = "cyan";
    destCtx.fillRect(destX, destY, tileSize, tileSize);
    return;
  }

  const tileCanvas = tileImages[texMapNum];

  destCtx.save();
  destCtx.translate(destX + tileSize / 2, destY + tileSize / 2);

  const flipX = (flipRotBits & TILE_FLIPX_MASK) !== 0;
  const flipY = (flipRotBits & TILE_FLIPY_MASK) !== 0;
  const rotation = flipRotBits & TILE_ROTATE_MASK;

  switch (rotation) {
    case TILE_ROT1:
      destCtx.rotate(Math.PI / 2);
      break;
    case TILE_ROT2:
      destCtx.rotate(Math.PI);
      break;
    case TILE_ROT3:
      destCtx.rotate((3 * Math.PI) / 2);
      break;
    default:
      break;
  }

  const scaleX = flipX ? -1 : 1;
  const scaleY = flipY ? -1 : 1;
  destCtx.scale(scaleX, scaleY);

  destCtx.drawImage(
    tileCanvas,
    -tileSize / 2,
    -tileSize / 2,
    tileSize,
    tileSize,
  );

  destCtx.restore();
}

export function translateTileIndex(
  tileValue: number,
  xlatTable: Array<{ idx: number }> | undefined,
  numTileImages: number,
  logWarnings: boolean = false,
): number {
  if (!xlatTable) return tileValue;

  const tileIndex = tileValue & TILENUM_MASK;
  const otherBits = tileValue & ~TILENUM_MASK;

  if (tileIndex >= xlatTable.length) {
    if (logWarnings) {
      console.warn(
        `translateTileIndex: tile index ${tileIndex} exceeds Xlat table size ${xlatTable.length}`,
      );
    }
    return otherBits;
  }

  const xlatEntry = xlatTable[tileIndex];
  if (!xlatEntry) {
    return otherBits;
  }
  const translatedIndex = xlatEntry.idx;

  if (translatedIndex < 0 || translatedIndex >= numTileImages) {
    if (logWarnings) {
      console.warn(
        `translateTileIndex: Xlat[${tileIndex}] = ${translatedIndex} is out of range [0, ${numTileImages})`,
      );
    }
    return otherBits;
  }

  return otherBits | (translatedIndex & TILENUM_MASK);
}

export function buildSupertileFromTiles(
  startRow: number,
  startCol: number,
  mapWidth: number,
  mapHeight: number,
  layerData: number[],
  xlatTable: Array<{ idx: number }> | undefined,
  tileImages: HTMLCanvasElement[],
  tilesPerSupertile: number = 5,
  tileSize: number = 32,
  debugFirstSupertile: boolean = false,
): HTMLCanvasElement {
  const supertilePixelSize = tilesPerSupertile * tileSize;
  const canvas = document.createElement("canvas");
  canvas.width = supertilePixelSize;
  canvas.height = supertilePixelSize;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    console.error("Could not get canvas context for supertile");
    return canvas;
  }

  ctx.fillStyle = debugFirstSupertile ? "magenta" : "black";
  ctx.fillRect(0, 0, supertilePixelSize, supertilePixelSize);

  let tilesDrawn = 0;

  for (let tileRow = 0; tileRow < tilesPerSupertile; tileRow++) {
    for (let tileCol = 0; tileCol < tilesPerSupertile; tileCol++) {
      const mapRow = startRow + tileRow;
      const mapCol = startCol + tileCol;

      if (mapRow >= mapHeight || mapCol >= mapWidth) {
        continue;
      }

      const flatIndex = mapRow * mapWidth + mapCol;
      if (flatIndex >= layerData.length) {
        continue;
      }

      const tileValue = layerData[flatIndex];
      if (tileValue === undefined) {
        continue;
      }

      const translatedTile = translateTileIndex(
        tileValue,
        xlatTable,
        tileImages.length,
        debugFirstSupertile && tilesDrawn < 5,
      );

      const destX = tileCol * tileSize;
      const destY = tileRow * tileSize;

      drawTileIntoBuffer(
        translatedTile,
        tileImages,
        ctx,
        destX,
        destY,
        tileSize,
        debugFirstSupertile && tilesDrawn < 10,
      );
      tilesDrawn++;
    }
  }

  return canvas;
}

export function buildAllBugdomSupertiles(
  headerData: HeaderData,
  layerData: number[],
  xlatTable: Array<{ idx: number }> | undefined,
  tileImages: HTMLCanvasElement[],
  tilesPerSupertile: number = 5,
  tileSize: number = 32,
): HTMLCanvasElement[] {
  const header = headerData.Hedr[1000].obj;
  const mapWidth = header.mapWidth;
  const mapHeight = header.mapHeight;

  const supertilesWide = Math.ceil(mapWidth / tilesPerSupertile);
  const supertilesDeep = Math.ceil(mapHeight / tilesPerSupertile);

  const supertileImages: HTMLCanvasElement[] = [];

  for (let stRow = 0; stRow < supertilesDeep; stRow++) {
    for (let stCol = 0; stCol < supertilesWide; stCol++) {
      const startRow = stRow * tilesPerSupertile;
      const startCol = stCol * tilesPerSupertile;
      const isFirstSupertile = stRow === 0 && stCol === 0;

      const supertile = buildSupertileFromTiles(
        startRow,
        startCol,
        mapWidth,
        mapHeight,
        layerData,
        xlatTable,
        tileImages,
        tilesPerSupertile,
        tileSize,
        isFirstSupertile,
      );

      supertileImages.push(supertile);
    }
  }

  return supertileImages;
}

/**
 * Check if the current game is Bugdom 1 (uses tile-based supertile construction)
 */
export function isBugdomGame(globals: { GAME_TYPE: Game }): boolean {
  return globals.GAME_TYPE === Game.BUGDOM;
}

/**
 * Check if the current game uses individual tiles to construct supertiles
 * (Bugdom 1 and Nanosaur 1 both use 5x5 grids of 32x32 tiles)
 */
export function usesIndividualTiles(globals: { GAME_TYPE: Game }): boolean {
  return (
    globals.GAME_TYPE === Game.BUGDOM || globals.GAME_TYPE === Game.NANOSAUR
  );
}

export default {
  TILENUM_MASK,
  TILE_FLIPX_MASK,
  TILE_FLIPY_MASK,
  TILE_FLIPXY_MASK,
  TILE_ROTATE_MASK,
  TILE_ROT1,
  TILE_ROT2,
  TILE_ROT3,
  drawTileIntoBuffer,
  translateTileIndex,
  buildSupertileFromTiles,
  buildAllBugdomSupertiles,
};
