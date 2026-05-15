import type { TerrainData } from "@/python/structSpecs/LevelTypes";
import { ALT_TILE_OPTIONS } from "../mightymike/MightyMikeAltMapEditor";
import { plainObjectSchema, unknownArraySchema } from "@/schemas/common";
import { z } from "zod";

export const TILE_SIZE = 32;

const numberSchema = z.number();

/** Returns true when a value is a plain object record. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return plainObjectSchema.safeParse(value).success && !Array.isArray(value);
}

/** Returns true when a value is an array. */
export function isArray(value: unknown): value is unknown[] {
  return unknownArraySchema.safeParse(value).success;
}

/** Extracts the nested Mighty Mike alt-map array from level metadata. */
export function getAltMapArray(metadata: unknown): unknown[] | null {
  if (!isRecord(metadata)) return null;
  const entry = isRecord(metadata[1000]) ? metadata[1000] : null;
  if (!entry) return null;
  const obj = isRecord(entry.obj) ? entry.obj : null;
  if (!obj) return null;
  const mapData = isRecord(obj.mightyMikeMapData)
    ? obj.mightyMikeMapData
    : null;
  if (!mapData) return null;
  const altMap = mapData.altMap;
  return isArray(altMap) ? altMap : null;
}

/** Filters tile-set collision images down to usable canvas elements. */
export function getCollisionImages(
  tileset: TerrainData["tileset"],
): HTMLCanvasElement[] {
  const tilesetRaw = isRecord(tileset) ? tileset : undefined;
  const raw =
    tilesetRaw && isArray(tilesetRaw.collisionImages)
      ? tilesetRaw.collisionImages
      : [];
  const canvasSchema = z.object({ getContext: z.function() });
  return raw.filter(
    (img): img is HTMLCanvasElement =>
      isRecord(img) && canvasSchema.safeParse(img).success,
  );
}

/** Returns the tile-attribute records used to render Mighty Mike param overlays. */
export function getTileAttributes(
  tileset: TerrainData["tileset"],
): Record<string, unknown>[] {
  const tilesetRaw = isRecord(tileset) ? tileset : undefined;
  const attrs =
    tilesetRaw && isArray(tilesetRaw.tileAttributes)
      ? tilesetRaw.tileAttributes
      : [];
  return attrs.filter(isRecord);
}

/** Flattens the nested alt-map grid into a one-dimensional list. */
export function flattenAltMap(metadata: unknown): number[] {
  const altMap2d = getAltMapArray(metadata);
  if (!altMap2d) return [];
  const flat: number[] = [];
  for (const row of altMap2d) {
    if (!isArray(row)) continue;
    for (const cell of row) {
      const numResult = numberSchema.safeParse(cell);
      flat.push(numResult.success ? numResult.data : 0);
    }
  }
  return flat;
}

function resolveXlatIndex(entry: unknown, fallback: number): number {
  if (!isRecord(entry)) return fallback;
  const idxResult = numberSchema.safeParse(entry.idx);
  return idxResult.success ? idxResult.data : fallback;
}

/** Resolves tile indices through the Xlat table and rejects out-of-range images. */
export function resolveImageIndices(
  layr: number[],
  xlatTable: unknown[] | undefined,
  mapImagesLength: number,
): (number | null)[] {
  return layr.map((logicalTileIndex) => {
    if (logicalTileIndex < 0 || logicalTileIndex >= 2048) return null;
    let imageIndex = logicalTileIndex;
    if (xlatTable && logicalTileIndex < xlatTable.length) {
      imageIndex = resolveXlatIndex(xlatTable[logicalTileIndex], imageIndex);
    }
    if (imageIndex < 0 || imageIndex >= mapImagesLength) return null;
    return imageIndex;
  });
}

/** Renders the visible tile map into an off-screen canvas. */
export function buildBackgroundCanvas(
  mapImages: HTMLCanvasElement[],
  layr: number[],
  mapWidth: number,
  mapHeight: number,
  resolvedImageIndices: (number | null)[],
): HTMLCanvasElement | null {
  if (mapImages.length === 0 || layr.length === 0) return null;
  const canvas = document.createElement("canvas");
  canvas.width = mapWidth * TILE_SIZE;
  canvas.height = mapHeight * TILE_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  layr.forEach((_, i) => {
    const imgIdx = resolvedImageIndices[i];
    const idxResult = numberSchema.safeParse(imgIdx);
    if (!idxResult.success) return;
    const img = mapImages[idxResult.data];
    if (!img) return;
    const tx = (i % mapWidth) * TILE_SIZE;
    const ty = Math.floor(i / mapWidth) * TILE_SIZE;
    ctx.drawImage(img, tx, ty, TILE_SIZE, TILE_SIZE);
  });
  return canvas;
}

/** Renders the collision overlay into an off-screen canvas. */
export function buildCollisionCanvas(
  showCollisionOverlay: boolean,
  mapWidth: number,
  mapHeight: number,
  layr: number[],
  resolvedImageIndices: (number | null)[],
  collisionImages: HTMLCanvasElement[],
): HTMLCanvasElement | null {
  if (!showCollisionOverlay) return null;
  const canvas = document.createElement("canvas");
  canvas.width = mapWidth * TILE_SIZE;
  canvas.height = mapHeight * TILE_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  layr.forEach((rawTileIndex, i) => {
    if (
      rawTileIndex === 0 ||
      rawTileIndex === undefined ||
      rawTileIndex === null
    ) {
      return;
    }
    const imgIdx = resolvedImageIndices[i];
    const tx = (i % mapWidth) * TILE_SIZE;
    const ty = Math.floor(i / mapWidth) * TILE_SIZE;
    const idxResult = numberSchema.safeParse(imgIdx);
    if (!idxResult.success || idxResult.data >= collisionImages.length) return;
    const collisionImg = collisionImages[idxResult.data];
    if (collisionImg) {
      ctx.drawImage(collisionImg, tx, ty, TILE_SIZE, TILE_SIZE);
      return;
    }
    ctx.fillStyle = "rgba(200, 120, 0, 0.5)";
    ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
  });
  return canvas;
}

/** Renders the alt-map direction overlay into an off-screen canvas. */
export function buildAltMapCanvas(
  showAltMap: boolean,
  mapWidth: number,
  mapHeight: number,
  altMapFlat: number[],
): HTMLCanvasElement | null {
  if (!showAltMap) return null;
  const canvas = document.createElement("canvas");
  canvas.width = mapWidth * TILE_SIZE;
  canvas.height = mapHeight * TILE_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.font = `bold ${Math.floor(TILE_SIZE * 0.8)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  altMapFlat.forEach((val, i) => {
    if (val === 0) return;
    const option = ALT_TILE_OPTIONS.find((o) => o.value === val);
    if (!option) return;
    const tx = (i % mapWidth) * TILE_SIZE;
    const ty = Math.floor(i / mapWidth) * TILE_SIZE;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = option.color === "transparent" ? "#ffffff" : option.color;
    ctx.fillText(option.glyph, tx + TILE_SIZE / 2, ty + TILE_SIZE / 2);
  });
  return canvas;
}

/** Renders param-flag overlays for the currently visible tiles. */
export function buildParamsCanvas(
  showParamsOverlay: boolean,
  overlayMode: "flagsAny" | "flagBit" | "p0" | "p1",
  overlayFlagBit: number,
  tileAttributes: Record<string, unknown>[],
  mapWidth: number,
  mapHeight: number,
  layr: number[],
  resolvedImageIndices: (number | null)[],
): HTMLCanvasElement | null {
  if (!showParamsOverlay || tileAttributes.length === 0) return null;
  const canvas = document.createElement("canvas");
  canvas.width = mapWidth * TILE_SIZE;
  canvas.height = mapHeight * TILE_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  layr.forEach((rawTileIndex, i) => {
    if (
      rawTileIndex === 0 ||
      rawTileIndex === undefined ||
      rawTileIndex === null
    ) {
      return;
    }
    const imgIdx = resolvedImageIndices[i];
    const idxResult = numberSchema.safeParse(imgIdx);
    if (!idxResult.success || idxResult.data >= tileAttributes.length) return;
    const attr = tileAttributes[idxResult.data];
    if (!attr) return;

    const flagsResult = numberSchema.safeParse(attr["flags"]);
    const flags = flagsResult.success ? flagsResult.data : 0;
    const p0Result = numberSchema.safeParse(attr["p0"]);
    const p0 = p0Result.success ? p0Result.data : 0;
    const p1Result = numberSchema.safeParse(attr["p1"]);
    const p1 = p1Result.success ? p1Result.data : 0;
    const hasFlagBit = (flags & (1 << overlayFlagBit)) !== 0;

    let overlayAlpha = 0;
    let overlayColor = "rgba(220, 50, 50, 0.55)";
    if (overlayMode === "flagsAny") {
      if (flags === 0) {
        return;
      }
      overlayAlpha = 0.55;
      overlayColor = "rgba(220, 50, 50, 0.55)";
    } else if (overlayMode === "flagBit") {
      if (!hasFlagBit) {
        return;
      }
      overlayAlpha = 0.65;
      overlayColor = "rgba(255, 120, 40, 0.65)";
    } else if (overlayMode === "p0") {
      if (p0 === 0) {
        return;
      }
      overlayAlpha = 0.55;
      overlayColor = "rgba(50, 200, 50, 0.55)";
    } else {
      if (p1 === 0) {
        return;
      }
      overlayAlpha = 0.55;
      overlayColor = "rgba(50, 100, 220, 0.55)";
    }

    const tx = (i % mapWidth) * TILE_SIZE;
    const ty = Math.floor(i / mapWidth) * TILE_SIZE;

    ctx.fillStyle = overlayColor;
    ctx.globalAlpha = overlayAlpha;
    ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
    ctx.globalAlpha = 1;

    if (overlayMode === "flagBit") {
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(tx, ty, TILE_SIZE, 12);
      ctx.fillStyle = "#ffffff";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(`B${overlayFlagBit}`, tx + 2, ty + 1);
    }
  });
  return canvas;
}
