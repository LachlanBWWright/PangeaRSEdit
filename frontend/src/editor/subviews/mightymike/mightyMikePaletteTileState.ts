import { err, ok, type Result } from "neverthrow";
import { z } from "zod";
import type { TerrainData } from "@/python/structSpecs/LevelTypes";
import { mightyMikeTileSetSchema } from "@/schemas/common";

const paletteSchema = z.array(z.number().int().min(0).max(255)).length(256 * 4);
const metadataPaletteSchema = z.object({
  obj: z.object({
    mightyMikePaletteRgbaBytes: paletteSchema,
  }),
});

export interface MightyMikePaletteTileState {
  readonly palette: readonly number[];
  readonly transparencyColors: readonly number[];
  readonly paletteIndices: readonly (readonly number[])[];
}

function createCollisionCanvas(
  indices: readonly number[],
  transparencyColors: readonly number[],
): Result<HTMLCanvasElement, string> {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const context = canvas.getContext("2d");
  if (!context) return err("Failed to create the collision preview");
  const transparentIndices = new Set(transparencyColors);
  const rgba = new Uint8ClampedArray(32 * 32 * 4);
  indices.forEach((paletteIndex, pixel) => {
    if (transparentIndices.has(paletteIndex)) return;
    const offset = pixel * 4;
    rgba[offset] = 200;
    rgba[offset + 1] = 120;
    rgba[offset + 3] = 200;
  });
  const imageBytes = new Uint8ClampedArray(rgba.length);
  imageBytes.set(rgba);
  context.putImageData(new ImageData(imageBytes, 32, 32), 0, 0);
  return ok(canvas);
}

export function getMightyMikePaletteTileState(
  terrainData: TerrainData,
): Result<MightyMikePaletteTileState, string> {
  const metadataResult = metadataPaletteSchema.safeParse(
    terrainData._metadata[1000],
  );
  if (!metadataResult.success) {
    return err("The Mighty Mike scene palette is unavailable");
  }
  const tilesetResult = mightyMikeTileSetSchema.safeParse(terrainData.tileset);
  if (!tilesetResult.success) {
    return err("The Mighty Mike tileset is unavailable");
  }
  return ok({
    palette: metadataResult.data.obj.mightyMikePaletteRgbaBytes,
    transparencyColors: tilesetResult.data.transparencyColors,
    paletteIndices: tilesetResult.data.paletteIndices ?? [],
  });
}

export function replaceMightyMikePaletteTileIndices(
  terrainData: TerrainData,
  tileIndex: number,
  indices: readonly number[],
): Result<void, string> {
  const tilesetResult = mightyMikeTileSetSchema.safeParse(terrainData.tileset);
  if (!tilesetResult.success) {
    return err("The Mighty Mike tileset is unavailable");
  }
  const paletteIndices = (tilesetResult.data.paletteIndices ?? []).map(
    (tile) => [...tile],
  );
  paletteIndices[tileIndex] = [...indices];
  const collisionCanvas = createCollisionCanvas(
    indices,
    tilesetResult.data.transparencyColors,
  );
  if (collisionCanvas.isErr()) return err(collisionCanvas.error);
  const collisionImages = [...(tilesetResult.data.collisionImages ?? [])];
  collisionImages[tileIndex] = collisionCanvas.value;
  terrainData.tileset = {
    ...tilesetResult.data,
    paletteIndices,
    collisionImages,
  };
  return ok(undefined);
}

export function removeMightyMikePaletteTileIndices(
  terrainData: TerrainData,
  tileIndex: number,
): Result<void, string> {
  const tilesetResult = mightyMikeTileSetSchema.safeParse(terrainData.tileset);
  if (!tilesetResult.success) {
    return err("The Mighty Mike tileset is unavailable");
  }
  const paletteIndices = (tilesetResult.data.paletteIndices ?? [])
    .filter((_tile, index) => index !== tileIndex)
    .map((tile) => [...tile]);
  const collisionImages = (tilesetResult.data.collisionImages ?? []).filter(
    (_image, index) => index !== tileIndex,
  );
  terrainData.tileset = {
    ...tilesetResult.data,
    paletteIndices,
    collisionImages,
  };
  return ok(undefined);
}
