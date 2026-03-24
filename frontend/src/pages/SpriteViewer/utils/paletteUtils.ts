/**
 * Pure functions for palette manipulation
 * These functions don't depend on external state and can be composed
 */
import { tryFn } from "@/types/result";
import { hexToRgb as hexToRgbUtil, rgbToHex as rgbToHexUtil } from "@/utils/colorUtils";

export interface PaletteColor {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
}

export interface Palette {
  name: string;
  colors: PaletteColor[];
}

/**
 * Create a new palette with default name
 */
export function createPalette(name: string, colors?: PaletteColor[]): Palette {
  return {
    name,
    colors: colors || Array(256).fill({ r: 0, g: 0, b: 0 }),
  };
}

/**
 * Clone a palette
 */
export function clonePalette(palette: Palette): Palette {
  return {
    name: palette.name,
    colors: palette.colors.map((c) => ({ r: c.r, g: c.g, b: c.b })),
  };
}

/**
 * Update a single color in a palette
 */
export function updatePaletteColor(
  palette: Palette,
  index: number,
  color: PaletteColor,
): Palette {
  if (index < 0 || index >= 256) return palette;

  const newColors = [...palette.colors];
  newColors[index] = { r: color.r, g: color.g, b: color.b };

  return {
    ...palette,
    colors: newColors,
  };
}

/**
 * Update multiple colors in a palette
 */
export function updatePaletteColors(
  palette: Palette,
  updates: Record<number, PaletteColor>,
): Palette {
  const newColors = [...palette.colors];

  Object.entries(updates).forEach(([indexStr, color]) => {
    const index = parseInt(indexStr);
    if (index >= 0 && index < 256) {
      newColors[index] = { r: color.r, g: color.g, b: color.b };
    }
  });

  return {
    ...palette,
    colors: newColors,
  };
}

/**
 * Rename a palette
 */
export function renamePalette(palette: Palette, newName: string): Palette {
  return {
    ...palette,
    name: newName,
  };
}

/**
 * Convert RGB to Hex string
 */
export function rgbToHex(color: PaletteColor): string {
  return rgbToHexUtil(color.r, color.g, color.b);
}

/**
 * Convert Hex string to RGB
 */
export function hexToRgb(hex: string): PaletteColor | null {
  return hexToRgbUtil(hex);
}

/**
 * Create predefined palettes
 */
export const PREDEFINED_PALETTES: Record<string, Palette> = {
  candy: createPalette("Candy"),
  bargain: createPalette("Bargain"),
  clown: createPalette("Clown"),
  fairy: createPalette("Fairy"),
  jurassic: createPalette("Jurassic"),
};

/**
 * Serialize palette to JSON
 */
export function serializePalette(palette: Palette): string {
  return JSON.stringify(palette);
}

/**
 * Deserialize palette from JSON
 */
export function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

export function isPalette(x: unknown): x is Palette {
  if (!isRecord(x)) return false;
  if (typeof x.name !== "string") return false;
  if (!Array.isArray(x.colors)) return false;
  for (const c of x.colors) {
    if (!isRecord(c)) return false;
    if (typeof c.r !== "number" || typeof c.g !== "number" || typeof c.b !== "number") return false;
  }
  return true;
}

export function deserializePalette(json: string): Palette | null {
  const parseResult = tryFn(() => JSON.parse(json) as unknown);
  if (parseResult.isErr()) {
    console.error("Failed to deserialize palette:", parseResult.error);
    return null;
  }
  if (isPalette(parseResult.value)) {
    return parseResult.value;
  }
  return null;
}

/**
 * Export palette as downloadable file
 */
export function exportPaletteFile(palette: Palette): void {
  const json = serializePalette(palette);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${palette.name}.palette.json`;
  a.click();
  URL.revokeObjectURL(url);
}
