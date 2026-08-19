import { err, ok, type Result } from "neverthrow";
import type { TerrainData } from "@/python/structSpecs/LevelTypes";

export interface TerrainVertexColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

const HEX_BYTE_LENGTH = 2;
const BYTES_PER_COLOR = 2;

function parseHexByte(value: string): Result<number, string> {
  if (!/^[0-9a-fA-F]{2}$/.test(value)) {
    return err("Vertex color data contains invalid hexadecimal bytes");
  }
  return ok(Number.parseInt(value, 16));
}

export function unpackRgb565(value: number): TerrainVertexColor {
  return {
    r: ((value >> 11) & 0x1f) / 32,
    g: ((value >> 5) & 0x3f) / 64,
    b: (value & 0x1f) / 32,
  };
}

export function packRgb565(color: TerrainVertexColor): number {
  const r = Math.max(0, Math.min(31, Math.round(color.r * 31)));
  const g = Math.max(0, Math.min(63, Math.round(color.g * 63)));
  const b = Math.max(0, Math.min(31, Math.round(color.b * 31)));
  return (r << 11) | (g << 5) | b;
}

export function decodeBugdomVertexColors(
  data: string,
  expectedCount: number,
): Result<readonly TerrainVertexColor[], string> {
  const expectedHexLength = expectedCount * BYTES_PER_COLOR * HEX_BYTE_LENGTH;
  if (data.length !== expectedHexLength) {
    return err(
      `Expected ${expectedCount} vertex colors, but Vcol contains ${data.length / 4}`,
    );
  }

  const colors: TerrainVertexColor[] = [];
  for (let offset = 0; offset < data.length; offset += 4) {
    const highResult = parseHexByte(data.slice(offset, offset + 2));
    const lowResult = parseHexByte(data.slice(offset + 2, offset + 4));
    if (highResult.isErr()) return err(highResult.error);
    if (lowResult.isErr()) return err(lowResult.error);
    colors.push(unpackRgb565((highResult.value << 8) | lowResult.value));
  }
  return ok(colors);
}

function packedColorToHex(value: number): string {
  return value.toString(16).padStart(4, "0");
}

export function encodeBugdomVertexColors(
  colors: readonly TerrainVertexColor[],
): string {
  return colors.map(packRgb565).map(packedColorToHex).join("");
}

export function paintBugdomVertexColors(input: {
  readonly terrainData: TerrainData;
  readonly layerKey: 1000 | 1001;
  readonly mapWidth: number;
  readonly mapHeight: number;
  readonly centerColumn: number;
  readonly centerRow: number;
  readonly radius: number;
  readonly color: TerrainVertexColor;
}): Result<string, string> {
  const resource = input.terrainData.Vcol?.[input.layerKey];
  if (!resource) return err(`Vcol ${input.layerKey} is missing`);

  const columns = input.mapWidth + 1;
  const rows = input.mapHeight + 1;
  const colorsResult = decodeBugdomVertexColors(resource.data, columns * rows);
  if (colorsResult.isErr()) return err(colorsResult.error);

  const packed = colorsResult.value.map(packRgb565);
  const radiusSquared = input.radius * input.radius;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const dx = column - input.centerColumn;
      const dy = row - input.centerRow;
      if (dx * dx + dy * dy > radiusSquared) continue;
      packed[row * columns + column] = packRgb565(input.color);
    }
  }
  return ok(packed.map(packedColorToHex).join(""));
}

export function colorToCss(color: TerrainVertexColor): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  return `rgb(${r}, ${g}, ${b})`;
}
