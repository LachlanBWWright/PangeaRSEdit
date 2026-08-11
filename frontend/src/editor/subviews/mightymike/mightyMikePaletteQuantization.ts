import { err, ok, ResultAsync, type Result } from "neverthrow";

const TILE_PIXEL_COUNT = 32 * 32;
const PALETTE_COLOR_COUNT = 256;
const RGBA_CHANNEL_COUNT = 4;

interface QuantizeMightyMikeTileInput {
  readonly rgba: Uint8ClampedArray;
  readonly palette: readonly number[];
  readonly transparencyColors: readonly number[];
}

interface QuantizedMightyMikeTile {
  readonly indices: number[];
  readonly rgba: Uint8ClampedArray;
}

function colorDistance(
  rgba: Uint8ClampedArray,
  pixelOffset: number,
  palette: readonly number[],
  paletteIndex: number,
): number {
  const paletteOffset = paletteIndex * RGBA_CHANNEL_COUNT;
  const red = (rgba[pixelOffset] ?? 0) - (palette[paletteOffset] ?? 0);
  const green =
    (rgba[pixelOffset + 1] ?? 0) - (palette[paletteOffset + 1] ?? 0);
  const blue =
    (rgba[pixelOffset + 2] ?? 0) - (palette[paletteOffset + 2] ?? 0);
  return red * red + green * green + blue * blue;
}

function findNearestOpaquePaletteIndex(
  rgba: Uint8ClampedArray,
  pixelOffset: number,
  palette: readonly number[],
  transparentIndices: ReadonlySet<number>,
): number {
  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < PALETTE_COLOR_COUNT; index += 1) {
    if (transparentIndices.has(index)) continue;
    const distance = colorDistance(rgba, pixelOffset, palette, index);
    if (distance >= nearestDistance) continue;
    nearestIndex = index;
    nearestDistance = distance;
    if (distance === 0) break;
  }
  return nearestIndex;
}

export function renderMightyMikePaletteIndices(
  indices: readonly number[],
  palette: readonly number[],
  transparencyColors: readonly number[],
): Result<Uint8ClampedArray, string> {
  if (indices.length !== TILE_PIXEL_COUNT) {
    return err("Mighty Mike tiles must contain 1024 palette indices");
  }
  if (palette.length !== PALETTE_COLOR_COUNT * RGBA_CHANNEL_COUNT) {
    return err("Mighty Mike palettes must contain 256 RGBA colors");
  }
  const transparentIndices = new Set(transparencyColors);
  const rgba = new Uint8ClampedArray(TILE_PIXEL_COUNT * RGBA_CHANNEL_COUNT);
  indices.forEach((paletteIndex, pixel) => {
    const pixelOffset = pixel * RGBA_CHANNEL_COUNT;
    const paletteOffset = paletteIndex * RGBA_CHANNEL_COUNT;
    rgba[pixelOffset] = palette[paletteOffset] ?? 0;
    rgba[pixelOffset + 1] = palette[paletteOffset + 1] ?? 0;
    rgba[pixelOffset + 2] = palette[paletteOffset + 2] ?? 0;
    rgba[pixelOffset + 3] = transparentIndices.has(paletteIndex) ? 0 : 255;
  });
  return ok(rgba);
}

export function quantizeMightyMikeTile(
  input: QuantizeMightyMikeTileInput,
): Result<QuantizedMightyMikeTile, string> {
  if (input.rgba.length !== TILE_PIXEL_COUNT * RGBA_CHANNEL_COUNT) {
    return err("Mighty Mike tile images must be 32x32 RGBA pixels");
  }
  if (input.palette.length !== PALETTE_COLOR_COUNT * RGBA_CHANNEL_COUNT) {
    return err("Mighty Mike palettes must contain 256 RGBA colors");
  }

  const transparentIndices = new Set(input.transparencyColors);
  const transparentIndex = input.transparencyColors[0];
  const indices: number[] = [];
  for (let pixel = 0; pixel < TILE_PIXEL_COUNT; pixel += 1) {
    const pixelOffset = pixel * RGBA_CHANNEL_COUNT;
    const alpha = input.rgba[pixelOffset + 3] ?? 0;
    const paletteIndex =
      alpha < 128 && transparentIndex !== undefined
        ? transparentIndex
        : findNearestOpaquePaletteIndex(
            input.rgba,
            pixelOffset,
            input.palette,
            transparentIndices,
          );
    indices.push(paletteIndex);
  }

  return renderMightyMikePaletteIndices(
    indices,
    input.palette,
    input.transparencyColors,
  ).map((rgba) => ({ indices, rgba }));
}

export function transformMightyMikePaletteIndices(
  indices: readonly number[],
  transform: "rotate" | "flipX" | "flipY",
): Result<number[], string> {
  if (indices.length !== TILE_PIXEL_COUNT) {
    return err("Mighty Mike tiles must contain 1024 palette indices");
  }
  const transformed = new Array<number>(TILE_PIXEL_COUNT).fill(0);
  for (let y = 0; y < 32; y += 1) {
    for (let x = 0; x < 32; x += 1) {
      const sourceIndex = y * 32 + x;
      const targetX = transform === "flipX" ? 31 - x : transform === "rotate" ? 31 - y : x;
      const targetY = transform === "flipY" ? 31 - y : transform === "rotate" ? x : y;
      transformed[targetY * 32 + targetX] = indices[sourceIndex] ?? 0;
    }
  }
  return ok(transformed);
}

export function createMightyMikePaletteCanvas(
  rgba: Uint8ClampedArray,
): Result<HTMLCanvasElement, string> {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const context = canvas.getContext("2d");
  if (!context) return err("Failed to create a tile canvas");
  const canvasRgba = new Uint8ClampedArray(rgba.length);
  canvasRgba.set(rgba);
  context.putImageData(new ImageData(canvasRgba, 32, 32), 0, 0);
  return ok(canvas);
}

export function quantizeMightyMikeCanvas(
  canvas: HTMLCanvasElement,
  palette: readonly number[],
  transparencyColors: readonly number[],
): Result<QuantizedMightyMikeTile, string> {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return err("Failed to read the Mighty Mike tile canvas");
  return quantizeMightyMikeTile({
    rgba: context.getImageData(0, 0, canvas.width, canvas.height).data,
    palette,
    transparencyColors,
  });
}

export function findMatchingMightyMikePaletteTile(
  tiles: readonly (readonly number[])[],
  candidate: readonly number[],
): number | null {
  const index = tiles.findIndex(
    (tile) =>
      tile.length === candidate.length &&
      tile.every((value, pixel) => value === candidate[pixel]),
  );
  return index >= 0 ? index : null;
}

export function loadAndQuantizeMightyMikeTile(
  file: File,
  palette: readonly number[],
  transparencyColors: readonly number[],
): ResultAsync<QuantizedMightyMikeTile & { readonly canvas: HTMLCanvasElement }, string> {
  return ResultAsync.fromPromise(
    createImageBitmap(file),
    () => "Failed to decode the uploaded tile image",
  ).andThen((bitmap) => {
    if (bitmap.width !== 32 || bitmap.height !== 32) {
      bitmap.close();
      return err("Mighty Mike tile images must be 32x32 pixels");
    }
    const sourceCanvas = document.createElement("canvas");
    sourceCanvas.width = 32;
    sourceCanvas.height = 32;
    const context = sourceCanvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      bitmap.close();
      return err("Failed to create an upload canvas");
    }
    context.clearRect(0, 0, 32, 32);
    context.drawImage(bitmap, 0, 0);
    bitmap.close();
    const quantized = quantizeMightyMikeTile({
      rgba: context.getImageData(0, 0, 32, 32).data,
      palette,
      transparencyColors,
    });
    return quantized.andThen((tile) =>
      createMightyMikePaletteCanvas(tile.rgba).map((canvas) => ({
        ...tile,
        canvas,
      })),
    );
  });
}
