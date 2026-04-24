import {
  PACK_TYPE_RLB,
  PACK_TYPE_RLW,
  rlbDecompress,
  rlwDecompress,
} from "../utils/rlwDecompress";

export function decompressIfNeeded(buffer: ArrayBuffer): ArrayBuffer {
  const view = new DataView(buffer);
  const compressionType = view.getUint32(4, false);

  if (compressionType <= 6) {
    if (compressionType === PACK_TYPE_RLB) {
      const result = rlbDecompress(buffer);
      if (result.isOk()) return result.value.data;
      console.warn("RLB decompression failed:", result.error);
      return buffer;
    }

    if (compressionType === PACK_TYPE_RLW) {
      const result = rlwDecompress(buffer);
      if (result.isOk()) return result.value.data;
      console.warn("RLW decompression failed:", result.error);
      return buffer;
    }

    return buffer;
  }

  return buffer;
}

function createDefaultPalette(): Uint8Array {
  const palette = new Uint8Array(256 * 4);
  for (let i = 0; i < 256; i++) {
    const value = Math.floor((i / 255) * 255);
    palette[i * 4 + 0] = value;
    palette[i * 4 + 1] = value;
    palette[i * 4 + 2] = value;
    palette[i * 4 + 3] = 255;
  }
  return palette;
}

export function parseTileImages(
  buffer: ArrayBuffer,
  offsetToTileDefinitions: number,
  numTileDefinitions: number,
  transparencyColors?: number[],
  palette?: Uint8Array,
): { tileImages: HTMLCanvasElement[]; collisionImages: HTMLCanvasElement[] } {
  const tileImages: HTMLCanvasElement[] = [];
  const collisionImages: HTMLCanvasElement[] = [];
  const TILE_SIZE = 32;
  const BYTES_PER_TILE = TILE_SIZE * TILE_SIZE;

  const transparentSet = new Set<number>(transparencyColors ?? []);
  const colorPalette = palette || createDefaultPalette();

  if (!palette && numTileDefinitions > 0) {
    console.warn(
      "[TILE RENDER] ⚠️ NO PALETTE PROVIDED - Using default grayscale fallback! This will result in gray tiles!",
    );
  }

  const tileData = new Uint8Array(buffer, offsetToTileDefinitions);

  for (let tileIndex = 0; tileIndex < numTileDefinitions; tileIndex++) {
    const canvas = document.createElement("canvas");
    canvas.width = TILE_SIZE;
    canvas.height = TILE_SIZE;
    const ctx = canvas.getContext("2d");

    const collisionCanvas = document.createElement("canvas");
    collisionCanvas.width = TILE_SIZE;
    collisionCanvas.height = TILE_SIZE;
    const collisionCtx = collisionCanvas.getContext("2d");

    if (!ctx || !collisionCtx) {
      console.warn(`Failed to get canvas context for tile ${tileIndex}`);
      continue;
    }

    const imageData = ctx.createImageData(TILE_SIZE, TILE_SIZE);
    const collisionData = collisionCtx.createImageData(TILE_SIZE, TILE_SIZE);
    const offset = tileIndex * BYTES_PER_TILE;

    for (let i = 0; i < BYTES_PER_TILE; i++) {
      if (offset + i >= tileData.length) break;

      const colorIndex = tileData[offset + i] ?? 0;
      const pixelOffset = i * 4;

      const paletteOffset = (colorIndex & 0xff) * 4;
      if (paletteOffset + 3 < colorPalette.length) {
        imageData.data[pixelOffset + 0] = colorPalette[paletteOffset] ?? 0;
        imageData.data[pixelOffset + 1] = colorPalette[paletteOffset + 1] ?? 0;
        imageData.data[pixelOffset + 2] = colorPalette[paletteOffset + 2] ?? 0;
        imageData.data[pixelOffset + 3] =
          colorPalette[paletteOffset + 3] ?? 255;
      }

      if (!transparentSet.has(colorIndex)) {
        collisionData.data[pixelOffset + 0] = 200;
        collisionData.data[pixelOffset + 1] = 120;
        collisionData.data[pixelOffset + 2] = 0;
        collisionData.data[pixelOffset + 3] = 200;
      } else {
        collisionData.data[pixelOffset + 3] = 0;
      }
    }

    ctx.putImageData(imageData, 0, 0);
    collisionCtx.putImageData(collisionData, 0, 0);
    tileImages.push(canvas);
    collisionImages.push(collisionCanvas);
  }

  return { tileImages, collisionImages };
}
