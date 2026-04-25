import type { TerrainData } from "@/python/structSpecs/LevelTypes";
import {
  canRemoveSupertileColumn,
  canRemoveSupertileRow,
} from "@/editor/subviews/supertiles/supertileResizeGuards";

export function normalizeSelectedSupertile(
  selectedTile: number,
  totalSupertiles: number,
): number {
  if (totalSupertiles <= 0) {
    return selectedTile;
  }
  if (selectedTile < 0 || selectedTile >= totalSupertiles) {
    return 0;
  }
  return selectedTile;
}

export function canRemoveBugdomSupertile(
  direction: "top" | "bottom" | "left" | "right",
  width: number,
  height: number,
): boolean {
  const removingRow = direction === "top" || direction === "bottom";
  return removingRow
    ? canRemoveSupertileRow(height)
    : canRemoveSupertileColumn(width);
}

export function appendBugdomTileImageMapping(
  data: TerrainData,
  imageIndex: number,
): void {
  if (data.Xlat?.[1000]?.obj) {
    data.Xlat[1000].obj.push({ idx: imageIndex });
  }
}

export function isValidTileImageSelection(
  selectedTileImageIndex: number,
  imageCount: number,
): boolean {
  return selectedTileImageIndex >= 0 && selectedTileImageIndex < imageCount;
}

export function getEditingTileIndex(
  editingTileImageIndex: number | null,
  selectedTileImageIndex: number,
): number {
  return editingTileImageIndex ?? selectedTileImageIndex;
}
