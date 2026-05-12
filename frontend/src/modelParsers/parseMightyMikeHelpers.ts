import {
  PACK_TYPE_RLB,
  PACK_TYPE_RLW,
  rlbDecompress,
  rlwDecompress,
} from "../utils/rlwDecompress";
import type { LevelIoImagePayload } from "@/data/level-io/levelIoTypes";
import {
  imagePayloadToCanvas,
} from "@/data/level-io/terrainImageSnapshots";

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

function createImagePayload(
  width: number,
  height: number,
  rgbaData: Uint8ClampedArray,
): LevelIoImagePayload {
  const rgbaBytes = new ArrayBuffer(rgbaData.byteLength);
  new Uint8Array(rgbaBytes).set(
    new Uint8Array(rgbaData.buffer, rgbaData.byteOffset, rgbaData.byteLength),
  );
  return { width, height, rgbaBytes };
}

function readTileSetImageLayout(buffer: ArrayBuffer): {
  readonly decompressedBuffer: ArrayBuffer;
  readonly offsetToTileDefinitions: number;
  readonly numTileDefinitions: number;
  readonly transparencyColors: number[];
} {
  const decompressedBuffer = decompressIfNeeded(buffer);
  const data = new DataView(decompressedBuffer);
  const dataLength = decompressedBuffer.byteLength;
  const offsetToTileDefinitions = data.getUint32(6, false) + 2;
  const offsetToTileXparentList = data.getUint32(26, false) + 2;
  const numTileDefinitions = data.getUint16(offsetToTileDefinitions - 2, false);
  const numTileXparentColors = data.getUint16(
    offsetToTileXparentList - 2,
    false,
  );
  const transparencyColors: number[] = [];
  for (let index = 0; index < numTileXparentColors; index += 1) {
    const offset = offsetToTileXparentList + index * 2;
    if (offset + 2 > dataLength) {
      break;
    }
    transparencyColors.push(data.getUint16(offset, false));
  }
  return {
    decompressedBuffer,
    offsetToTileDefinitions,
    numTileDefinitions,
    transparencyColors,
  };
}

function buildTileImagePayloads(
  buffer: ArrayBuffer,
  offsetToTileDefinitions: number,
  numTileDefinitions: number,
  transparencyColors?: number[],
  palette?: Uint8Array,
): {
  tileImages: LevelIoImagePayload[];
  collisionImages: LevelIoImagePayload[];
} {
  const tileImages: LevelIoImagePayload[] = [];
  const collisionImages: LevelIoImagePayload[] = [];
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

  for (let tileIndex = 0; tileIndex < numTileDefinitions; tileIndex += 1) {
    const imageData = new Uint8ClampedArray(TILE_SIZE * TILE_SIZE * 4);
    const collisionData = new Uint8ClampedArray(TILE_SIZE * TILE_SIZE * 4);
    const offset = tileIndex * BYTES_PER_TILE;

    for (let pixelIndex = 0; pixelIndex < BYTES_PER_TILE; pixelIndex += 1) {
      if (offset + pixelIndex >= tileData.length) {
        break;
      }

      const colorIndex = tileData[offset + pixelIndex] ?? 0;
      const pixelOffset = pixelIndex * 4;
      const paletteOffset = (colorIndex & 0xff) * 4;

      if (paletteOffset + 3 < colorPalette.length) {
        imageData[pixelOffset + 0] = colorPalette[paletteOffset] ?? 0;
        imageData[pixelOffset + 1] = colorPalette[paletteOffset + 1] ?? 0;
        imageData[pixelOffset + 2] = colorPalette[paletteOffset + 2] ?? 0;
        imageData[pixelOffset + 3] = colorPalette[paletteOffset + 3] ?? 255;
      }

      if (!transparentSet.has(colorIndex)) {
        collisionData[pixelOffset + 0] = 200;
        collisionData[pixelOffset + 1] = 120;
        collisionData[pixelOffset + 2] = 0;
        collisionData[pixelOffset + 3] = 200;
      }
    }

    tileImages.push(createImagePayload(TILE_SIZE, TILE_SIZE, imageData));
    collisionImages.push(
      createImagePayload(TILE_SIZE, TILE_SIZE, collisionData),
    );
  }

  return { tileImages, collisionImages };
}

export function parseMightyMikeTileImagePayloads(
  buffer: ArrayBuffer,
  palette?: Uint8Array,
): {
  tileImages: LevelIoImagePayload[];
  collisionImages: LevelIoImagePayload[];
} {
  const layout = readTileSetImageLayout(buffer);
  return buildTileImagePayloads(
    layout.decompressedBuffer,
    layout.offsetToTileDefinitions,
    layout.numTileDefinitions,
    layout.transparencyColors,
    palette,
  );
}

export function parseTileImages(
  buffer: ArrayBuffer,
  offsetToTileDefinitions: number,
  numTileDefinitions: number,
  transparencyColors?: number[],
  palette?: Uint8Array,
): { tileImages: HTMLCanvasElement[]; collisionImages: HTMLCanvasElement[] } {
  const payloads = buildTileImagePayloads(
    buffer,
    offsetToTileDefinitions,
    numTileDefinitions,
    transparencyColors,
    palette,
  );
  const tileImages: HTMLCanvasElement[] = [];
  const collisionImages: HTMLCanvasElement[] = [];
  for (const [index, imagePayload] of payloads.tileImages.entries()) {
    const collisionPayload = payloads.collisionImages[index];
    if (!collisionPayload) {
      console.warn(`Missing collision payload for tile ${index}`);
      continue;
    }
    const imageCanvasResult = imagePayloadToCanvas(imagePayload);
    const collisionCanvasResult = imagePayloadToCanvas(collisionPayload);
    if (imageCanvasResult.isErr() || collisionCanvasResult.isErr()) {
      console.warn(`Failed to materialize canvas for tile ${index}`);
      continue;
    }
    tileImages.push(imageCanvasResult.value);
    collisionImages.push(collisionCanvasResult.value);
  }

  return { tileImages, collisionImages };
}
