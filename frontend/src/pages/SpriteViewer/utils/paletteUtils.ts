/**
 * Pure functions for palette manipulation
 * These functions don't depend on external state and can be composed
 */

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
    colors: colors || Array.from({ length: 256 }, () => ({ r: 0, g: 0, b: 0 })),
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
  const hex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${hex(color.r)}${hex(color.g)}${hex(color.b)}`;
}

/**
 * Convert Hex string to RGB
 */
export function hexToRgb(hex: string): PaletteColor | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result && result[1] && result[2] && result[3]
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
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
export function deserializePalette(json: string): Palette | null {
  try {
    const parsed: unknown = JSON.parse(json);
    if (typeof parsed === "object" && parsed !== null) {
      const obj = parsed as Record<string, unknown>;
      const maybeName = obj.name;
      const maybeColors = obj.colors;

      if (typeof maybeName === "string" && Array.isArray(maybeColors)) {
        const colors = maybeColors.map((c: unknown) => {
          if (typeof c === "object" && c !== null) {
            const cc = c as Record<string, unknown>;
            return {
              r: Number(cc.r ?? 0),
              g: Number(cc.g ?? 0),
              b: Number(cc.b ?? 0),
            };
          }
          return { r: 0, g: 0, b: 0 };
        });
        return { name: maybeName, colors };
      }
    }
  } catch (e) {
    console.error("Failed to deserialize palette:", e);
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
