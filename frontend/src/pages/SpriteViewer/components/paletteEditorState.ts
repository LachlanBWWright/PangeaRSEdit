import { hexToRgb } from "@/utils/colorUtils";
import {
  exportPaletteFile,
  renamePalette,
  updatePaletteColor,
  type Palette,
} from "@/pages/SpriteViewer/utils/paletteUtils";
import { toast } from "sonner";

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

export function exportPaletteWithToast(palette: Palette): void {
  exportPaletteFile(palette);
  toast.success("Palette exported");
}

export function savePaletteAsNewWithToast(
  palette: Palette,
  onSaveAsNew: (palette: Palette) => void,
): void {
  onSaveAsNew(palette);
  toast.success("Saved as new palette");
}
