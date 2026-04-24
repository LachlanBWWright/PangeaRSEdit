import { toast } from "sonner";
import type { ChangeEvent } from "react";
import type { Updater } from "use-immer";
import type { TerrainData } from "@/python/structSpecs/LevelTypes";

export const TILE_SIZE = 32;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

export function getBoolean(value: unknown, defaultValue = false): boolean {
  return typeof value === "boolean" ? value : defaultValue;
}

export function getNumber(value: unknown, defaultValue = 0): number {
  return typeof value === "number" ? value : defaultValue;
}

function getXlatEntryIndex(entry: unknown): number | null {
  if (!isRecord(entry) || typeof entry.idx !== "number") return null;
  return entry.idx;
}

export function getCurrentTileImageIndex(
  effectiveSelectedTile: number,
  layr: number[],
  xlatTable: unknown[] | undefined,
  mapImagesLength: number,
): number | null {
  if (effectiveSelectedTile < 0 || effectiveSelectedTile >= layr.length)
    return null;

  const tileIndexValue = layr[effectiveSelectedTile];
  if (tileIndexValue === undefined || tileIndexValue === null) return null;

  let imageIndex = tileIndexValue;
  if (xlatTable && tileIndexValue >= 0 && tileIndexValue < xlatTable.length) {
    const idx = getXlatEntryIndex(xlatTable[tileIndexValue]);
    if (idx !== null) imageIndex = idx;
  }

  if (imageIndex < 0 || imageIndex >= mapImagesLength) return null;
  return imageIndex;
}

export function computeSelectedPaletteTile(
  effectiveSelectedTile: number,
  layr: number[],
  xlatTable: unknown[] | undefined,
  mapImagesLength: number,
  manualTilePaletteSelection: { tile: number; palette: number } | null,
): number {
  const imageIndex = getCurrentTileImageIndex(
    effectiveSelectedTile,
    layr,
    xlatTable,
    mapImagesLength,
  );
  if (imageIndex === null) return 0;

  if (manualTilePaletteSelection?.tile === effectiveSelectedTile) {
    return manualTilePaletteSelection.palette;
  }
  return imageIndex;
}

export function getCollisionProperties(
  effectiveSelectedTile: number,
  mightyMikeTileValuesArray: unknown[],
): {
  hasCollisionMask: boolean;
  usePixelAccurateCollision: boolean;
} | null {
  if (
    effectiveSelectedTile < 0 ||
    effectiveSelectedTile >= mightyMikeTileValuesArray.length
  ) {
    return null;
  }

  const tileValue = mightyMikeTileValuesArray[effectiveSelectedTile];
  if (!isRecord(tileValue)) return null;

  return {
    hasCollisionMask: getBoolean(tileValue.hasCollisionMask),
    usePixelAccurateCollision: getBoolean(tileValue.usePixelAccurateCollision),
  };
}

export function findTileIndexForImage(
  imageIndex: number,
  xlatTable: unknown[] | undefined,
  mapImagesLength: number,
): number | null {
  if (!xlatTable) {
    return imageIndex >= 0 && imageIndex < mapImagesLength ? imageIndex : null;
  }

  for (let tileIdx = 0; tileIdx < xlatTable.length; tileIdx++) {
    const idx = getXlatEntryIndex(xlatTable[tileIdx]);
    if (idx === imageIndex) return tileIdx;
  }

  if (imageIndex >= 0 && imageIndex < xlatTable.length) {
    return imageIndex;
  }

  return null;
}

export function createBlankTileCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = TILE_SIZE;
  canvas.height = TILE_SIZE;
  const context = canvas.getContext("2d");
  if (context) context.clearRect(0, 0, TILE_SIZE, TILE_SIZE);
  return canvas;
}

async function loadStrictTileBitmap(
  file: File,
  errorPrefix: string,
): Promise<ImageBitmap | null> {
  const sourceBitmap = await createImageBitmap(file).catch((error: unknown) => {
    toast.error(
      `${errorPrefix}: ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  });

  if (!sourceBitmap) return null;
  if (sourceBitmap.width !== TILE_SIZE || sourceBitmap.height !== TILE_SIZE) {
    toast.error(`Tiles must be ${TILE_SIZE}x${TILE_SIZE}`);
    return null;
  }

  return createImageBitmap(file, {
    resizeWidth: TILE_SIZE,
    resizeHeight: TILE_SIZE,
    resizeQuality: "high",
  }).catch((error: unknown) => {
    toast.error(
      `${errorPrefix}: ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  });
}

export async function replaceTileImage(
  file: File,
  imageIndex: number,
  mapImages: HTMLCanvasElement[],
  setMapImages: (newCanvases: HTMLCanvasElement[]) => void,
  successMessage: string,
): Promise<void> {
  const bitmap = await loadStrictTileBitmap(file, "Failed to upload tile");
  if (!bitmap) return;

  const canvas = document.createElement("canvas");
  canvas.width = TILE_SIZE;
  canvas.height = TILE_SIZE;
  const context = canvas.getContext("2d");
  if (!context) {
    toast.error("Failed to create canvas context");
    return;
  }

  context.fillStyle = "black";
  context.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  context.drawImage(bitmap, 0, 0);

  const nextImages = [...mapImages];
  nextImages[imageIndex] = canvas;
  setMapImages(nextImages);
  toast.success(successMessage);
}

export async function saveEditedImage(
  editedImageData: ImageData,
  imageIndex: number,
  mapImages: HTMLCanvasElement[],
  setMapImages: (newCanvases: HTMLCanvasElement[]) => void,
): Promise<void> {
  const canvas = document.createElement("canvas");
  canvas.width = editedImageData.width;
  canvas.height = editedImageData.height;
  const context = canvas.getContext("2d");
  if (!context) {
    toast.error("Failed to get canvas context");
    return;
  }

  context.putImageData(editedImageData, 0, 0);
  const nextImages = [...mapImages];
  nextImages[imageIndex] = canvas;
  setMapImages(nextImages);
}

export function isPaletteTileInUse(
  layr: number[],
  selectedPaletteTile: number,
  xlatTable: unknown[] | undefined,
): boolean {
  const matchingLogicalIndices = new Set<number>();

  if (xlatTable) {
    xlatTable.forEach((entry, logicalIndex) => {
      if (getXlatEntryIndex(entry) === selectedPaletteTile) {
        matchingLogicalIndices.add(logicalIndex);
      }
    });
  } else {
    matchingLogicalIndices.add(selectedPaletteTile);
  }

  if (matchingLogicalIndices.size === 0) return false;
  return layr.some((tileIndex) => matchingLogicalIndices.has(tileIndex));
}

export function removePaletteTile(
  selectedPaletteTile: number,
  mapImages: HTMLCanvasElement[],
  setMapImages: (newCanvases: HTMLCanvasElement[]) => void,
  setTerrainData: Updater<TerrainData>,
): void {
  setMapImages(mapImages.filter((_, index) => index !== selectedPaletteTile));

  setTerrainData((data) => {
    const xlat = data.Xlat?.[1000]?.obj;
    if (!xlat) return;

    const keptEntries = xlat
      .map((entry, logicalIndex) => ({ entry, logicalIndex }))
      .filter(({ entry }) => getXlatEntryIndex(entry) !== selectedPaletteTile);

    const logicalIndexMap = new Map<number, number>();
    keptEntries.forEach(({ logicalIndex }, nextLogicalIndex) => {
      logicalIndexMap.set(logicalIndex, nextLogicalIndex);
    });

    const xlatEntry = data.Xlat?.[1000];
    if (!xlatEntry) return;

    xlatEntry.obj = keptEntries.map(({ entry }) => {
      const idx = getXlatEntryIndex(entry);
      return {
        idx:
          idx !== null && idx > selectedPaletteTile ? idx - 1 : getNumber(idx),
      };
    });

    if (data.Layr?.[1000]?.obj) {
      data.Layr[1000].obj = data.Layr[1000].obj.map(
        (logicalIndex) => logicalIndexMap.get(logicalIndex) ?? logicalIndex,
      );
    }
  });
}

export function downloadCanvasAsPng(
  canvas: HTMLCanvasElement,
  filename: string,
): void {
  canvas.toBlob((blob) => {
    if (!blob) {
      toast.error("Failed to create blob from tile");
      return;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Tile downloaded");
  });
}

export function getFileFromInputEvent(
  event: ChangeEvent<HTMLInputElement>,
): File | null {
  const file = event.target?.files?.[0];
  return file ?? null;
}
