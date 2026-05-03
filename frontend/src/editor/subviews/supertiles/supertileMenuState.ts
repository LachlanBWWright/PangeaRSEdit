import type { GlobalsInterface } from "@/data/globals/globals";
import type { HeaderData, TerrainData } from "@/python/structSpecs/LevelTypes";
import type { Updater } from "use-immer";
import {
  canRemoveSupertileColumn,
  canRemoveSupertileRow,
} from "@/editor/subviews/supertiles/supertileResizeGuards";
import {
  applyWholeMapCanvas,
  buildWholeMapCanvas,
} from "@/editor/subviews/supertiles/SupertileMenuHelpers";

export function updateSelectedTileTexture(
  selectedTile: number,
  stgd: { superTileId: number }[],
  mapImages: HTMLCanvasElement[],
  canvas: HTMLCanvasElement,
): { mapImages: HTMLCanvasElement[] } | { error: string } {
  const tileEntry = stgd[selectedTile];
  if (!tileEntry) {
    return { error: "No tile data at this position" };
  }

  const tileId = tileEntry.superTileId;
  if (tileId === 0) {
    return { error: "Selected tile is empty and cannot be replaced" };
  }

  const nextMapImages = [...mapImages];
  nextMapImages[tileId] = canvas;
  return { mapImages: nextMapImages };
}

export function canEditTileTexture(
  selectedTile: number,
  stgd: { superTileId: number }[],
  mapImages: HTMLCanvasElement[],
): { ok: true } | { ok: false; error: string } {
  const tileEntry = stgd[selectedTile];
  if (!tileEntry) {
    return { ok: false, error: "No tile data at this position" };
  }

  const tileId = tileEntry.superTileId;
  if (tileId === 0 || !mapImages[tileId]) {
    return { ok: false, error: "No texture available for this tile" };
  }

  return { ok: true };
}

export function canRemoveSupertile(
  direction: "top" | "bottom" | "left" | "right",
  width: number,
  height: number,
): boolean {
  const removingRow = direction === "top" || direction === "bottom";
  return removingRow
    ? canRemoveSupertileRow(height)
    : canRemoveSupertileColumn(width);
}

export function applyCanvasToWholeMap(
  canvas: HTMLCanvasElement,
  mode: "non-empty" | "regenerate-all",
  headerData: HeaderData,
  globals: GlobalsInterface,
  mapImages: HTMLCanvasElement[],
  setTerrainData: Updater<TerrainData>,
  setMapImages: (newCanvases: HTMLCanvasElement[]) => void,
  setHeaderData: Updater<HeaderData>,
): void {
  applyWholeMapCanvas(
    canvas,
    mode,
    headerData.Hedr[1000].obj,
    globals,
    mapImages,
    setTerrainData,
    setMapImages,
    setHeaderData,
  );
}

export function buildWholeMapEditorImage(
  headerData: HeaderData,
  globals: GlobalsInterface,
  stgd: { superTileId: number }[],
  mapImages: HTMLCanvasElement[],
): string | null {
  const mapCanvas = buildWholeMapCanvas(
    headerData.Hedr[1000].obj,
    globals,
    stgd,
    mapImages,
  );
  if (!mapCanvas) {
    return null;
  }
  return mapCanvas.toDataURL("image/png");
}
