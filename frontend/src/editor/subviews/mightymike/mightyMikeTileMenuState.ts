import type { TerrainData } from "@/python/structSpecs/LevelTypes";
import { setMightyMikeTileLogicalIndex } from "@/data/game/mightyMikeTileValueUtils";
import { isArray, isRecord } from "./MightyMikeTileMenuUtils";

interface MutableTileAttribute {
  flags: number;
  p0: number;
  p1: number;
  p2: number;
  p3: number;
  p4: number;
}

interface MutableTilesetRecord {
  tileAttributes: unknown[];
  xlateTable: unknown[];
}

const DEFAULT_TILE_ATTRIBUTE: MutableTileAttribute = {
  flags: 0,
  p0: 0,
  p1: 0,
  p2: 0,
  p3: 0,
  p4: 0,
};

function cloneTileAttribute(value: unknown): MutableTileAttribute {
  if (!isRecord(value)) {
    return { ...DEFAULT_TILE_ATTRIBUTE };
  }

  return {
    flags: typeof value.flags === "number" ? value.flags : 0,
    p0: typeof value.p0 === "number" ? value.p0 : 0,
    p1: typeof value.p1 === "number" ? value.p1 : 0,
    p2: typeof value.p2 === "number" ? value.p2 : 0,
    p3: typeof value.p3 === "number" ? value.p3 : 0,
    p4: typeof value.p4 === "number" ? value.p4 : 0,
  };
}

function ensureTilesetRecord(
  terrainData: TerrainData,
): MutableTilesetRecord | null {
  const tileset = isRecord(terrainData.tileset) ? terrainData.tileset : null;
  if (!tileset) {
    return null;
  }
  if (!isArray(tileset.tileAttributes)) {
    tileset.tileAttributes = [];
  }
  if (!isArray(tileset.xlateTable)) {
    tileset.xlateTable = [];
  }
  const tileAttributes = tileset.tileAttributes;
  const xlateTable = tileset.xlateTable;
  if (!isArray(tileAttributes) || !isArray(xlateTable)) return null;
  return { tileAttributes, xlateTable };
}

function ensureXlatTable(
  data: TerrainData,
  minLength: number,
): { idx: number }[] {
  const existing = data.Xlat?.[1000]?.obj;
  if (existing) {
    while (existing.length < minLength) {
      existing.push({ idx: existing.length });
    }
    return existing;
  }

  const created = Array.from({ length: minLength }, (_, index) => ({
    idx: index,
  }));
  if (data.Xlat?.[1000]) {
    data.Xlat[1000].obj = created;
  } else {
    data.Xlat = {
      1000: {
        name: "Tile Index Translation Table",
        obj: created,
        order: 7,
      },
    };
  }
  return created;
}

function getCurrentLogicalTileIndex(
  terrainData: TerrainData,
  selectedTile: number,
): number | null {
  const layr = terrainData.Layr?.[1000]?.obj;
  if (!layr || selectedTile < 0 || selectedTile >= layr.length) {
    return null;
  }
  return layr[selectedTile] ?? null;
}

function ensureLevelAttributesArray(data: TerrainData): unknown[] | null {
  const atrbEntry = data.Atrb?.[1000];
  if (!atrbEntry) {
    return null;
  }
  if (!isArray(atrbEntry.obj)) {
    atrbEntry.obj = [];
  }
  return atrbEntry.obj;
}

export function getCurrentTileAttributeIndex(
  terrainData: TerrainData,
  selectedTile: number,
): number | null {
  return getCurrentLogicalTileIndex(terrainData, selectedTile);
}

export function getTotalTileCount(mapWidth: number, mapHeight: number): number {
  return mapWidth * mapHeight;
}

export function getEffectiveSelectedTile(
  selectedTile: number,
  totalTiles: number,
): number {
  return totalTiles > 0 && selectedTile >= 0 && selectedTile < totalTiles
    ? selectedTile
    : 0;
}

export function getCurrentTileCanvas(
  mapImages: HTMLCanvasElement[],
  currentImageIndex: number | null,
): HTMLCanvasElement | null {
  if (currentImageIndex === null) {
    return null;
  }
  return mapImages[currentImageIndex] ?? null;
}

export function getCurrentTileAttributes(
  terrainData: TerrainData,
  selectedTile: number,
): Record<string, unknown> | null {
  const currentAttributeIndex = getCurrentTileAttributeIndex(
    terrainData,
    selectedTile,
  );
  if (currentAttributeIndex === null) {
    return null;
  }
  const atrb = terrainData.Atrb?.[1000]?.obj;
  const attribute = atrb?.[currentAttributeIndex];
  return isRecord(attribute) ? attribute : null;
}

function getLogicalIndicesForImage(
  terrainData: TerrainData,
  imageIndex: number,
): number[] {
  const xlat = terrainData.Xlat?.[1000]?.obj;
  if (!xlat) {
    return [imageIndex];
  }
  return xlat.flatMap((entry, logicalIndex) =>
    entry.idx === imageIndex ? [logicalIndex] : [],
  );
}

export function getPaletteTileAttributes(
  terrainData: TerrainData,
  imageIndex: number,
): Record<string, unknown> | null {
  const logicalIndex = getLogicalIndicesForImage(terrainData, imageIndex)[0];
  if (logicalIndex === undefined) {
    return null;
  }
  const attribute = terrainData.Atrb?.[1000]?.obj?.[logicalIndex];
  return isRecord(attribute) ? attribute : null;
}

export function ensureUniqueTileAttributeIndex(
  terrainData: TerrainData,
  selectedTile: number,
): number | null {
  const currentIndex = getCurrentLogicalTileIndex(terrainData, selectedTile);
  if (currentIndex === null) {
    return null;
  }

  const layr = terrainData.Layr?.[1000]?.obj;
  const levelAttributes = ensureLevelAttributesArray(terrainData);
  if (
    !layr ||
    !levelAttributes ||
    currentIndex < 0 ||
    currentIndex >= levelAttributes.length
  ) {
    return null;
  }

  let usageCount = 0;
  for (const entry of layr) {
    if (entry === currentIndex) {
      usageCount += 1;
      if (usageCount > 1) {
        break;
      }
    }
  }

  if (usageCount <= 1) {
    return currentIndex;
  }

  const tileset = ensureTilesetRecord(terrainData);
  const xlatTable = ensureXlatTable(terrainData, levelAttributes.length);
  const sourceLevelAttribute = cloneTileAttribute(
    levelAttributes[currentIndex],
  );
  const sourceTilesetAttribute = cloneTileAttribute(
    tileset?.tileAttributes?.[currentIndex],
  );
  const sourceImageIndex =
    currentIndex < xlatTable.length
      ? (xlatTable[currentIndex]?.idx ?? currentIndex)
      : currentIndex;

  levelAttributes.push(sourceLevelAttribute);
  xlatTable.push({ idx: sourceImageIndex });

  if (tileset) {
    const tilesetAttributes = tileset.tileAttributes;
    if (isArray(tilesetAttributes)) {
      tilesetAttributes.push(sourceTilesetAttribute);
    }
    const tilesetXlat = tileset.xlateTable;
    if (isArray(tilesetXlat)) {
      tilesetXlat.push(sourceImageIndex);
    }
  }

  const nextIndex = levelAttributes.length - 1;
  setMightyMikeTileLogicalIndex(terrainData, selectedTile, nextIndex);
  return nextIndex;
}

export function updateTileAttributeForSelectedTile(
  terrainData: TerrainData,
  selectedTile: number,
  property: keyof MutableTileAttribute,
  value: number,
): void {
  const attributeIndex = ensureUniqueTileAttributeIndex(
    terrainData,
    selectedTile,
  );
  if (attributeIndex === null) {
    return;
  }

  const levelAttribute = terrainData.Atrb?.[1000]?.obj?.[attributeIndex];
  if (isRecord(levelAttribute)) {
    levelAttribute[property] = value;
  }

  const tileset = ensureTilesetRecord(terrainData);
  const tilesetAttribute = tileset?.tileAttributes?.[attributeIndex];
  if (isRecord(tilesetAttribute)) {
    tilesetAttribute[property] = value;
  }
}

export function updateTileAttributeForPaletteImage(
  terrainData: TerrainData,
  imageIndex: number,
  property: keyof MutableTileAttribute,
  value: number,
): void {
  const logicalIndices = getLogicalIndicesForImage(terrainData, imageIndex);
  const levelAttributes = ensureLevelAttributesArray(terrainData);
  const tileset = ensureTilesetRecord(terrainData);
  if (!levelAttributes || !tileset) {
    return;
  }

  if (logicalIndices.length === 0) {
    const xlat = ensureXlatTable(terrainData, levelAttributes.length);
    levelAttributes.push({ ...DEFAULT_TILE_ATTRIBUTE, [property]: value });
    xlat.push({ idx: imageIndex });
    if (isArray(tileset.xlateTable)) {
      tileset.xlateTable.push(imageIndex);
    }
    if (isArray(tileset.tileAttributes)) {
      tileset.tileAttributes.push({
        ...DEFAULT_TILE_ATTRIBUTE,
        [property]: value,
      });
    }
    return;
  }

  const sharedAttribute = cloneTileAttribute(
    levelAttributes[logicalIndices[0] ?? -1],
  );
  sharedAttribute[property] = value;
  for (const logicalIndex of logicalIndices) {
    const levelAttribute = levelAttributes[logicalIndex];
    if (isRecord(levelAttribute)) {
      Object.assign(levelAttribute, sharedAttribute);
    }
    const tilesetAttribute = tileset.tileAttributes?.[logicalIndex];
    if (isRecord(tilesetAttribute)) {
      Object.assign(tilesetAttribute, sharedAttribute);
    }
  }
}

export function isValidPaletteTileIndex(
  selectedPaletteTile: number,
  imageCount: number,
): boolean {
  return selectedPaletteTile >= 0 && selectedPaletteTile < imageCount;
}

export function applySelectedTileLogicalIndex(
  terrainData: TerrainData,
  selectedTile: number,
  logicalIndex: number,
): void {
  setMightyMikeTileLogicalIndex(terrainData, selectedTile, logicalIndex);
}

export function findOrCreateLogicalIndexForImage(
  terrainData: TerrainData,
  imageIndex: number,
  templateImageIndex?: number,
): number | null {
  if (imageIndex < 0) {
    return null;
  }

  const xlatTable = terrainData.Xlat?.[1000]?.obj;
  if (!xlatTable) {
    return imageIndex;
  }

  const existingIndex = xlatTable.findIndex(
    (entry) => entry.idx === imageIndex,
  );
  if (existingIndex >= 0) {
    return existingIndex;
  }

  const levelAttributes = ensureLevelAttributesArray(terrainData);
  const tileset = ensureTilesetRecord(terrainData);
  if (!levelAttributes || !tileset) {
    return null;
  }
  const templateAttribute =
    templateImageIndex === undefined
      ? DEFAULT_TILE_ATTRIBUTE
      : getPaletteTileAttributes(terrainData, templateImageIndex) ??
        DEFAULT_TILE_ATTRIBUTE;
  const nextAttribute = cloneTileAttribute(templateAttribute);
  const nextIndex = xlatTable.length;
  while (levelAttributes.length < nextIndex) {
    levelAttributes.push({ ...DEFAULT_TILE_ATTRIBUTE });
  }
  levelAttributes.push(nextAttribute);
  xlatTable.push({ idx: imageIndex });

  if (isArray(tileset.xlateTable)) {
    tileset.xlateTable.push(imageIndex);
  }
  if (isArray(tileset.tileAttributes)) {
    tileset.tileAttributes.push({ ...nextAttribute });
  }
  return nextIndex;
}
