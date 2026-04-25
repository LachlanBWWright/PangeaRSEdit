import { rgbToHex } from "@/utils/colorUtils";

export interface PaletteEditorState {
  readonly index: number;
  readonly color: string;
}

export interface PaletteCommitState {
  readonly index: number;
  readonly nextColor: string;
  readonly originalColor: string;
}

function clampRgbValue(value: number): number {
  return Math.min(255, Math.max(0, value));
}

export function deriveBrushColorFromRgbChannel(
  rgb: { r: number; g: number; b: number },
  channel: "r" | "g" | "b",
  value: number,
): string {
  const nextRgb = {
    ...rgb,
    [channel]: clampRgbValue(value),
  };

  return rgbToHex(nextRgb.r, nextRgb.g, nextRgb.b);
}

export function getPaletteEditorState(
  paletteColors: string[] | undefined,
  canEditPalette: boolean,
  index: number,
): PaletteEditorState | null {
  if (!paletteColors || !canEditPalette) {
    return null;
  }

  const color = paletteColors[index];
  if (!color) {
    return null;
  }

  return {
    index,
    color,
  };
}

export function getPaletteCommitState(
  editingPaletteIndex: number | null,
  editingPaletteColor: string,
  editingPaletteOriginalColor: string,
): PaletteCommitState | null {
  if (editingPaletteIndex === null) {
    return null;
  }

  const nextColor = editingPaletteColor;
  const originalColor = editingPaletteOriginalColor;
  if (!nextColor || nextColor === originalColor) {
    return null;
  }

  return {
    index: editingPaletteIndex,
    nextColor,
    originalColor,
  };
}

export function getPaletteSwatchColor(
  paletteColors: string[] | undefined,
  index: number,
): string | null {
  const color = paletteColors?.[index];
  return color ?? null;
}
