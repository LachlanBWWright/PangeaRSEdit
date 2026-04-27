import { hexToRgb } from "@/utils/colorUtils";
import {
  exportPaletteFile,
  renamePalette,
  updatePaletteColor,
  type Palette,
} from "@/pages/SpriteViewer/utils/paletteUtils";
import { toast } from "sonner";

/** Tries to replace a palette color from a hex string and leaves the palette unchanged on parse failure. */
export function tryApplyPaletteHexColor(
  palette: Palette,
  index: number,
  hex: string,
): Palette {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return palette;
  }
  return updatePaletteColor(palette, index, rgb);
}

/** Applies a single RGB channel update to a palette entry and clamps the value into range. */
export function applyPaletteChannelChange(
  palette: Palette,
  index: number,
  channel: "r" | "g" | "b",
  value: number,
): Palette {
  const color = palette.colors[index];
  if (!color) {
    return palette;
  }

  const updatedColor = {
    ...color,
    [channel]: Math.min(255, Math.max(0, value)),
  };
  return updatePaletteColor(palette, index, updatedColor);
}

/** Trims and applies a palette rename, reporting whether the rename actually happened. */
export function tryRenamePalette(
  palette: Palette,
  newName: string,
): { palette: Palette; renamed: boolean; name: string } {
  const trimmedName = newName.trim();
  if (!trimmedName) {
    return { palette, renamed: false, name: newName };
  }

  return {
    palette: renamePalette(palette, trimmedName),
    renamed: true,
    name: trimmedName,
  };
}

/** Exports the palette file and shows a success toast. */
export function exportPaletteWithToast(palette: Palette): void {
  exportPaletteFile(palette);
  toast.success("Palette exported");
}

/** Saves the palette as a new palette and shows a success toast. */
export function savePaletteAsNewWithToast(
  palette: Palette,
  onSaveAsNew: (palette: Palette) => void,
): void {
  onSaveAsNew(palette);
  toast.success("Saved as new palette");
}
