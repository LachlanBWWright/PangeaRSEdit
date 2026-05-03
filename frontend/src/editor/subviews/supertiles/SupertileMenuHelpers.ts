import { toast } from "sonner";
import {
  HeaderData,
  TerrainData,
  createBlankSupertileEntry,
  isSupertileEmpty,
  type SupertileGridEntry,
  type SimplifiedSupertileGridEntry,
} from "@/python/structSpecs/LevelTypes";
import type { Updater } from "use-immer";
import type { GlobalsInterface } from "@/data/globals/globals";

export async function loadImageIntoCanvas(
  file: File,
  width: number,
  height: number,
): Promise<HTMLCanvasElement | null> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    toast.error("Failed to create canvas context");
    return null;
  }
  context.fillStyle = "black";
  context.fillRect(0, 0, width, height);
  const imageBitmap = await createImageBitmap(file, {
    resizeWidth: width,
    resizeHeight: height,
    resizeQuality: "high",
  });
  context.drawImage(imageBitmap, 0, 0);
  return canvas;
}

export function applyWholeMapCanvas(
  canvas: HTMLCanvasElement,
  mode: "non-empty" | "regenerate-all",
  hedr: HeaderData["Hedr"][1000]["obj"],
  globals: GlobalsInterface,
  mapImages: HTMLCanvasElement[],
  setTerrainData: Updater<TerrainData>,
  setMapImages: (newCanvases: HTMLCanvasElement[]) => void,
  setHeaderData: Updater<HeaderData>,
): void {
  const tilesWide = hedr.mapWidth / globals.TILES_PER_SUPERTILE;
  const tilesHigh = hedr.mapHeight / globals.TILES_PER_SUPERTILE;
  const nextImages = [...mapImages];
  let nextId = 1;

  setTerrainData((terrainDraft) => {
    const stgdEntry = terrainDraft.STgd?.[1000];
    if (!stgdEntry?.obj) return;

    for (let y = 0; y < tilesHigh; y++) {
      for (let x = 0; x < tilesWide; x++) {
        const tileIndex = y * tilesWide + x;
        const slice = document.createElement("canvas");
        slice.width = globals.SUPERTILE_TEXMAP_SIZE;
        slice.height = globals.SUPERTILE_TEXMAP_SIZE;
        const sliceContext = slice.getContext("2d");
        if (!sliceContext) continue;

        sliceContext.drawImage(
          canvas,
          x * globals.SUPERTILE_TEXMAP_SIZE,
          y * globals.SUPERTILE_TEXMAP_SIZE,
          globals.SUPERTILE_TEXMAP_SIZE,
          globals.SUPERTILE_TEXMAP_SIZE,
          0,
          0,
          globals.SUPERTILE_TEXMAP_SIZE,
          globals.SUPERTILE_TEXMAP_SIZE,
        );

        const tileEntry = stgdEntry.obj[tileIndex];
        if (!tileEntry) continue;

        if (mode === "non-empty") {
          if (!isSupertileEmpty(tileEntry)) {
            nextImages[tileEntry.superTileId] = slice;
          }
          continue;
        }

        tileEntry.superTileId = nextId;
        nextImages[nextId] = slice;
        nextId++;
      }
    }
  });

  setMapImages(nextImages);
  if (mode === "regenerate-all") {
    setHeaderData((draft) => {
      draft.Hedr[1000].obj.numUniqueSupertiles = nextId;
    });
  }
  toast.success("Map image updated");
}

export function buildWholeMapCanvas(
  hedr: HeaderData["Hedr"][1000]["obj"],
  globals: GlobalsInterface,
  stgd: (SupertileGridEntry | SimplifiedSupertileGridEntry)[],
  mapImages: HTMLCanvasElement[],
): HTMLCanvasElement | null {
  const tilesWide = hedr.mapWidth / globals.TILES_PER_SUPERTILE;
  const tilesHigh = hedr.mapHeight / globals.TILES_PER_SUPERTILE;
  const canvas = document.createElement("canvas");
  canvas.width = globals.SUPERTILE_TEXMAP_SIZE * tilesWide;
  canvas.height = globals.SUPERTILE_TEXMAP_SIZE * tilesHigh;
  const context = canvas.getContext("2d");
  if (!context) {
    toast.error("Failed to create map canvas");
    return null;
  }

  context.fillStyle = "black";
  context.fillRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < tilesHigh; y++) {
    for (let x = 0; x < tilesWide; x++) {
      const tileIndex = y * tilesWide + x;
      const tileEntry = stgd[tileIndex];
      if (!tileEntry || isSupertileEmpty(tileEntry)) continue;
      const tileImage = mapImages[tileEntry.superTileId];
      if (!tileImage) continue;
      context.drawImage(
        tileImage,
        x * globals.SUPERTILE_TEXMAP_SIZE,
        y * globals.SUPERTILE_TEXMAP_SIZE,
      );
    }
  }
  return canvas;
}

export function saveWholeMapImageData(
  editedImageData: ImageData,
  mode: "non-empty" | "regenerate-all",
  applyCanvas: (
    canvas: HTMLCanvasElement,
    mode: "non-empty" | "regenerate-all",
  ) => void,
): void {
  const editedCanvas = document.createElement("canvas");
  editedCanvas.width = editedImageData.width;
  editedCanvas.height = editedImageData.height;
  const context = editedCanvas.getContext("2d");
  if (!context) {
    toast.error("Failed to create canvas context");
    return;
  }
  context.putImageData(editedImageData, 0, 0);
  applyCanvas(editedCanvas, mode);
}

export function setSelectedTileBlank(
  selectedTile: number,
  globals: GlobalsInterface,
  setTerrainData: Updater<TerrainData>,
): void {
  setTerrainData((terrainDraft) => {
    const stgdEntry = terrainDraft.STgd?.[1000];
    if (!stgdEntry?.obj) return;
    stgdEntry.obj[selectedTile] = createBlankSupertileEntry(
      globals.EMPTY_TILE_IDX,
    );
  });
}
