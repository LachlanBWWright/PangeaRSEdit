import { toast } from "sonner";
import type { Updater } from "use-immer";
import type { TerrainData } from "@/python/structSpecs/LevelTypes";
import {
  TILENUM_MASK,
  TILE_FLIPX_MASK,
  TILE_FLIPY_MASK,
  TILE_ROTATE_MASK,
  TILE_ROT1,
  TILE_ROT2,
  TILE_ROT3,
  translateTileIndex,
} from "./BugdomTileRenderer.utils";

export const TILE_IMAGE_SIZE = 32;

function getXlatEntryIdx(entry: unknown): number | null {
  if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
    return null;
  }
  if (!("idx" in entry)) return null;
  const idx = Reflect.get(entry, "idx");
  return typeof idx === "number" ? idx : null;
}

function normalizeXlatTable(
  xlatTable: unknown[] | undefined,
): { idx: number }[] | undefined {
  if (!xlatTable) return undefined;
  const normalized = xlatTable
    .map((entry) => {
      const idx = getXlatEntryIdx(entry);
      return idx === null ? null : { idx };
    })
    .filter((entry): entry is { idx: number } => entry !== null);
  return normalized.length > 0 ? normalized : undefined;
}

function getTileInfo(
  tileValue: number,
  xlatTable: unknown[] | undefined,
  numTileImages: number,
) {
  const tileIndex = tileValue & TILENUM_MASK;
  const flipX = (tileValue & TILE_FLIPX_MASK) !== 0;
  const flipY = (tileValue & TILE_FLIPY_MASK) !== 0;
  const rotation = tileValue & TILE_ROTATE_MASK;

  let rotationDegrees = 0;
  switch (rotation) {
    case TILE_ROT1:
      rotationDegrees = 90;
      break;
    case TILE_ROT2:
      rotationDegrees = 180;
      break;
    case TILE_ROT3:
      rotationDegrees = 270;
      break;
  }

  const translatedValue = translateTileIndex(
    tileValue,
    normalizeXlatTable(xlatTable),
    numTileImages,
  );
  const imageIndex = translatedValue & TILENUM_MASK;

  return { tileIndex, flipX, flipY, rotationDegrees, imageIndex };
}

export function getTilesInSelectedSupertile(
  layerData: number[] | undefined,
  selectedTile: number,
  mapWidth: number,
  mapHeight: number,
  tilesPerSupertile: number,
  numTileImages: number,
  xlatTable: unknown[] | undefined,
): {
  row: number;
  col: number;
  value: number;
  info: ReturnType<typeof getTileInfo>;
}[] {
  if (!layerData) return [];

  const supertilesWide = Math.ceil(mapWidth / tilesPerSupertile);
  const stRow = Math.floor(selectedTile / supertilesWide);
  const stCol = selectedTile % supertilesWide;

  const startRow = stRow * tilesPerSupertile;
  const startCol = stCol * tilesPerSupertile;

  const tiles: {
    row: number;
    col: number;
    value: number;
    info: ReturnType<typeof getTileInfo>;
  }[] = [];

  for (let tileRow = 0; tileRow < tilesPerSupertile; tileRow++) {
    for (let tileCol = 0; tileCol < tilesPerSupertile; tileCol++) {
      const mapRow = startRow + tileRow;
      const mapCol = startCol + tileCol;

      if (mapRow >= mapHeight || mapCol >= mapWidth) continue;

      const flatIndex = mapRow * mapWidth + mapCol;
      if (flatIndex >= layerData.length) continue;

      const tileValue = layerData[flatIndex];
      if (tileValue === undefined) continue;

      tiles.push({
        row: tileRow,
        col: tileCol,
        value: tileValue,
        info: getTileInfo(tileValue, xlatTable, numTileImages),
      });
    }
  }

  return tiles;
}

export function getFlatIndexForTile(
  selectedTile: number,
  tileRow: number,
  tileCol: number,
  mapWidth: number,
  tilesPerSupertile: number,
): number {
  const supertilesWide = Math.ceil(mapWidth / tilesPerSupertile);
  const stRow = Math.floor(selectedTile / supertilesWide);
  const stCol = selectedTile % supertilesWide;

  const mapRow = stRow * tilesPerSupertile + tileRow;
  const mapCol = stCol * tilesPerSupertile + tileCol;
  return mapRow * mapWidth + mapCol;
}

export function rotateTileAtIndex(
  setTerrainData: Updater<TerrainData>,
  flatIndex: number,
): void {
  setTerrainData((data) => {
    if (!data.Layr?.[1000]?.obj) return;

    const currentValue = data.Layr[1000].obj[flatIndex];
    if (currentValue === undefined) return;
    const currentRotation = currentValue & TILE_ROTATE_MASK;

    let newRotation = 0;
    switch (currentRotation) {
      case 0:
        newRotation = TILE_ROT1;
        break;
      case TILE_ROT1:
        newRotation = TILE_ROT2;
        break;
      case TILE_ROT2:
        newRotation = TILE_ROT3;
        break;
      case TILE_ROT3:
        newRotation = 0;
        break;
    }

    data.Layr[1000].obj[flatIndex] =
      (currentValue & ~TILE_ROTATE_MASK) | newRotation;
  });
}

export function flipTileXAtIndex(
  setTerrainData: Updater<TerrainData>,
  flatIndex: number,
): void {
  setTerrainData((data) => {
    if (!data.Layr?.[1000]?.obj) return;
    const currentValue = data.Layr[1000].obj[flatIndex];
    if (currentValue === undefined) return;
    data.Layr[1000].obj[flatIndex] = currentValue ^ TILE_FLIPX_MASK;
  });
}

export function flipTileYAtIndex(
  setTerrainData: Updater<TerrainData>,
  flatIndex: number,
): void {
  setTerrainData((data) => {
    if (!data.Layr?.[1000]?.obj) return;
    const currentValue = data.Layr[1000].obj[flatIndex];
    if (currentValue === undefined) return;
    data.Layr[1000].obj[flatIndex] = currentValue ^ TILE_FLIPY_MASK;
  });
}

export function findTileIndexForImage(
  imageIndex: number,
  xlatTable: unknown[] | undefined,
): number | null {
  if (!xlatTable) return imageIndex;

  for (let tileIdx = 0; tileIdx < xlatTable.length; tileIdx++) {
    if (getXlatEntryIdx(xlatTable[tileIdx]) === imageIndex) return tileIdx;
  }

  if (imageIndex < xlatTable.length) return imageIndex;
  return null;
}

export function replaceTileAtIndex(
  setTerrainData: Updater<TerrainData>,
  flatIndex: number,
  tileIndexForImage: number,
): void {
  setTerrainData((data) => {
    if (!data.Layr?.[1000]?.obj) return;
    const currentValue = data.Layr[1000].obj[flatIndex];
    if (currentValue === undefined) return;
    const newValue =
      (currentValue & ~TILENUM_MASK) | (tileIndexForImage & TILENUM_MASK);
    data.Layr[1000].obj[flatIndex] = newValue;
  });
}

export async function uploadTileImageToIndex(
  file: File,
  imageIndex: number,
  mapImages: HTMLCanvasElement[],
  updateTileImages: (nextMapImages: HTMLCanvasElement[]) => void,
): Promise<boolean> {
  if (!mapImages[imageIndex]) {
    toast.error("Selected tile image is missing");
    return false;
  }

  const canvas = document.createElement("canvas");
  canvas.width = TILE_IMAGE_SIZE;
  canvas.height = TILE_IMAGE_SIZE;
  const context = canvas.getContext("2d");
  if (!context) {
    toast.error("Failed to create canvas context");
    return false;
  }

  const sourceBitmap = await createImageBitmap(file);
  if (
    sourceBitmap.width !== TILE_IMAGE_SIZE ||
    sourceBitmap.height !== TILE_IMAGE_SIZE
  ) {
    toast.error(`Tile images must be ${TILE_IMAGE_SIZE}x${TILE_IMAGE_SIZE}`);
    return false;
  }

  context.fillStyle = "black";
  context.fillRect(0, 0, TILE_IMAGE_SIZE, TILE_IMAGE_SIZE);
  const imageBitmap = await createImageBitmap(file, {
    resizeWidth: TILE_IMAGE_SIZE,
    resizeHeight: TILE_IMAGE_SIZE,
    resizeQuality: "high",
  });
  context.drawImage(imageBitmap, 0, 0);

  const newMapImages = [...mapImages];
  newMapImages[imageIndex] = canvas;
  updateTileImages(newMapImages);
  return true;
}

export function saveEditedTileImageToIndex(
  editedImageData: ImageData,
  imageIndex: number,
  mapImages: HTMLCanvasElement[],
  updateTileImages: (nextMapImages: HTMLCanvasElement[]) => void,
): boolean {
  if (!mapImages[imageIndex]) {
    toast.error("Selected tile has no image");
    return false;
  }

  const canvas = document.createElement("canvas");
  canvas.width = editedImageData.width;
  canvas.height = editedImageData.height;
  const context = canvas.getContext("2d");
  if (!context) {
    toast.error("Failed to create canvas context");
    return false;
  }

  context.putImageData(editedImageData, 0, 0);
  const newMapImages = [...mapImages];
  newMapImages[imageIndex] = canvas;
  updateTileImages(newMapImages);
  return true;
}

export function createBlankTileCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = TILE_IMAGE_SIZE;
  canvas.height = TILE_IMAGE_SIZE;
  const context = canvas.getContext("2d");
  if (context) context.clearRect(0, 0, TILE_IMAGE_SIZE, TILE_IMAGE_SIZE);
  return canvas;
}

export function computeIsTileImageInUse(
  layerData: number[] | undefined,
  selectedTileImageIndex: number,
  xlatTable: unknown[] | undefined,
): boolean {
  if (!layerData) return false;

  const matchingLogicalIndices = new Set<number>();
  if (xlatTable) {
    xlatTable.forEach((entry, logicalIndex) => {
      if (getXlatEntryIdx(entry) === selectedTileImageIndex) {
        matchingLogicalIndices.add(logicalIndex);
      }
    });
  } else {
    matchingLogicalIndices.add(selectedTileImageIndex);
  }

  if (matchingLogicalIndices.size === 0) return false;
  return layerData.some((tileValue) =>
    matchingLogicalIndices.has(tileValue & TILENUM_MASK),
  );
}

export function removeTileImageAndRemap(
  selectedTileImageIndex: number,
  mapImages: HTMLCanvasElement[],
  updateTileImages: (nextMapImages: HTMLCanvasElement[]) => void,
  setTerrainData: Updater<TerrainData>,
): void {
  const nextMapImages = mapImages.filter(
    (_, index) => index !== selectedTileImageIndex,
  );
  updateTileImages(nextMapImages);

  setTerrainData((data) => {
    const xlat = data.Xlat?.[1000]?.obj;
    if (!xlat) return;

    const keptEntries = xlat
      .map((entry, logicalIndex) => ({ entry, logicalIndex }))
      .filter(({ entry }) => getXlatEntryIdx(entry) !== selectedTileImageIndex);

    const logicalIndexMap = new Map<number, number>();
    keptEntries.forEach(({ logicalIndex }, nextLogicalIndex) => {
      logicalIndexMap.set(logicalIndex, nextLogicalIndex);
    });

    const xlatEntry = data.Xlat?.[1000];
    if (xlatEntry) {
      xlatEntry.obj = keptEntries.map(({ entry }) => {
        const idx = getXlatEntryIdx(entry) ?? 0;
        return { idx: idx > selectedTileImageIndex ? idx - 1 : idx };
      });
    }

    if (data.Layr?.[1000]?.obj) {
      data.Layr[1000].obj = data.Layr[1000].obj.map((tileValue) => {
        const logicalIndex = tileValue & TILENUM_MASK;
        const remappedLogicalIndex = logicalIndexMap.get(logicalIndex);
        if (remappedLogicalIndex === undefined) return tileValue;
        return (tileValue & ~TILENUM_MASK) | remappedLogicalIndex;
      });
    }
  });
}
