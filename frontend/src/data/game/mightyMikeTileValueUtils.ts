import type { TerrainData } from "@/python/structSpecs/LevelTypes";
import {
  mightyMikeTileValueSchema,
  plainObjectSchema,
  unknownArraySchema,
  type MightyMikeTileValue,
} from "@/schemas/common";

export const MIGHTY_MIKE_TILE_INDEX_MASK = 0x07ff;
const MIGHTY_MIKE_COLLISION_MASK = 0x8000;
const MIGHTY_MIKE_PIXEL_COLLISION_MASK = 0x4000;

function normalizeTileIndex(tileIndex: number): number {
  return tileIndex & MIGHTY_MIKE_TILE_INDEX_MASK;
}

function buildMightyMikeTileValue(
  tileIndex: number,
  hasCollisionMask: boolean,
  usePixelAccurateCollision: boolean,
): MightyMikeTileValue {
  const normalizedTileIndex = normalizeTileIndex(tileIndex);
  let rawValue = normalizedTileIndex;
  if (hasCollisionMask) {
    rawValue |= MIGHTY_MIKE_COLLISION_MASK;
  }
  if (usePixelAccurateCollision) {
    rawValue |= MIGHTY_MIKE_PIXEL_COLLISION_MASK;
  }
  return {
    rawValue,
    tileIndex: normalizedTileIndex,
    hasCollisionMask,
    usePixelAccurateCollision,
  };
}

function ensureMetadataObject(data: TerrainData): Record<string, unknown> {
  const entryResult = plainObjectSchema.safeParse(data._metadata[1000]);
  const metadataEntry = entryResult.success
    ? entryResult.data
    : { name: "Metadata", obj: {}, order: 100 };
  const objectResult = plainObjectSchema.safeParse(metadataEntry.obj);
  const metadataObject = objectResult.success ? objectResult.data : {};
  data._metadata[1000] = {
    ...metadataEntry,
    obj: metadataObject,
  };
  return metadataObject;
}

function ensureTileValuesArray(data: TerrainData): unknown[] {
  const metadataObject = ensureMetadataObject(data);
  const tileValuesResult = unknownArraySchema.safeParse(
    metadataObject.mightyMikeTileValues,
  );
  const tileValues = tileValuesResult.success ? tileValuesResult.data : [];
  metadataObject.mightyMikeTileValues = tileValues;
  return tileValues;
}

function getLayerTileIndex(data: TerrainData, tileIndex: number): number {
  const layerData = data.Layr?.[1000]?.obj ?? [];
  return normalizeTileIndex(layerData[tileIndex] ?? 0);
}

function getExistingTileValue(
  tileValues: unknown[],
  tileIndex: number,
  fallbackTileIndex: number,
): MightyMikeTileValue {
  const tileValueResult = mightyMikeTileValueSchema.safeParse(
    tileValues[tileIndex],
  );
  if (tileValueResult.success) {
    return tileValueResult.data;
  }
  return buildMightyMikeTileValue(fallbackTileIndex, false, false);
}

export function setMightyMikeTileLogicalIndex(
  data: TerrainData,
  tileIndex: number,
  logicalIndex: number,
): void {
  const layerData = data.Layr?.[1000]?.obj;
  if (!layerData || tileIndex < 0 || tileIndex >= layerData.length) {
    return;
  }

  const normalizedTileIndex = normalizeTileIndex(logicalIndex);
  layerData[tileIndex] = normalizedTileIndex;

  const tileValues = ensureTileValuesArray(data);
  const existing = getExistingTileValue(tileValues, tileIndex, normalizedTileIndex);
  tileValues[tileIndex] = buildMightyMikeTileValue(
    normalizedTileIndex,
    existing.hasCollisionMask,
    existing.usePixelAccurateCollision,
  );
}

export function setMightyMikeCollisionProperty(
  data: TerrainData,
  tileIndex: number,
  property: "hasCollisionMask" | "usePixelAccurateCollision",
  value: boolean,
): void {
  const layerData = data.Layr?.[1000]?.obj;
  if (!layerData || tileIndex < 0 || tileIndex >= layerData.length) {
    return;
  }

  const tileValues = ensureTileValuesArray(data);
  const layerTileIndex = getLayerTileIndex(data, tileIndex);
  const existing = getExistingTileValue(tileValues, tileIndex, layerTileIndex);
  tileValues[tileIndex] = buildMightyMikeTileValue(
    layerTileIndex,
    property === "hasCollisionMask" ? value : existing.hasCollisionMask,
    property === "usePixelAccurateCollision"
      ? value
      : existing.usePixelAccurateCollision,
  );
}

export function toggleMightyMikeCollisionMask(
  data: TerrainData,
  tileIndex: number,
): void {
  const tileValues = ensureTileValuesArray(data);
  const layerTileIndex = getLayerTileIndex(data, tileIndex);
  const existing = getExistingTileValue(tileValues, tileIndex, layerTileIndex);
  tileValues[tileIndex] = buildMightyMikeTileValue(
    layerTileIndex,
    !existing.hasCollisionMask,
    existing.usePixelAccurateCollision,
  );
}

export function syncMightyMikeTileValuesFromLayer(
  data: TerrainData,
  indices?: readonly number[],
): void {
  const layerData = data.Layr?.[1000]?.obj;
  if (!layerData) {
    return;
  }

  const tileValues = ensureTileValuesArray(data);
  const targets = indices ?? layerData.map((_, index) => index);

  targets.forEach((tileIndex) => {
    if (tileIndex < 0 || tileIndex >= layerData.length) {
      return;
    }
    const layerTileIndex = getLayerTileIndex(data, tileIndex);
    const existing = getExistingTileValue(tileValues, tileIndex, layerTileIndex);
    tileValues[tileIndex] = buildMightyMikeTileValue(
      layerTileIndex,
      existing.hasCollisionMask,
      existing.usePixelAccurateCollision,
    );
  });
}
