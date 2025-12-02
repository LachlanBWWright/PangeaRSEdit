/**
 * Level I/O Service
 *
 * This module provides testable functions for importing, exporting, and
 * downloading level data. Logic is extracted from React components to
 * enable unit testing with roundtrip verification.
 */

import { Game, GlobalsInterface, DataType } from "../globals/globals";
import { preprocessJson } from "../processors/ottoPreprocessor";
import { ottoMaticLevel } from "../../python/structSpecs/ottoMaticInterface";
import {
  parseNanosaur1Level,
  nanosaur1LevelToOttoMaticLevel,
  parseNanosaurTerrainTextures,
} from "../processors/classicProprocessor";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Interface for pyodide worker communication
 */
export interface PyodideRunner {
  parseBuffer: (
    buffer: ArrayBuffer,
    structSpecs: string[],
    includeTypes?: string[],
    excludeTypes?: string[],
  ) => Promise<ottoMaticLevel>;
  serializeLevel: (
    levelData: ottoMaticLevel,
    structSpecs: string[],
    onlyTypes?: string[],
    skipTypes?: string[],
    adf?: boolean,
  ) => Promise<ArrayBuffer>;
}

/**
 * Result of parsing a level file
 */
export interface ParseResult {
  levelData: ottoMaticLevel;
  success: boolean;
  error?: string;
}

/**
 * Result of serializing level data
 */
export interface SerializeResult {
  buffer: ArrayBuffer;
  success: boolean;
  error?: string;
}

/**
 * Result of a roundtrip test (parse -> serialize -> parse)
 */
export interface RoundtripResult {
  original: ottoMaticLevel;
  serialized: ArrayBuffer;
  roundtrip: ottoMaticLevel;
  bytesMatch: boolean;
  jsonMatch: boolean;
  originalSize: number;
  roundtripSize: number;
  differences: Array<{ path: string; original: unknown; roundtrip: unknown }>;
}

// ============================================================================
// PARSING FUNCTIONS
// ============================================================================

/**
 * Parse a level file buffer based on game type.
 * This is the main entry point for loading level data.
 *
 * @param buffer - Raw binary level data
 * @param gameType - Game-specific configuration
 * @param pyodideRunner - Pyodide interface (optional for Nanosaur 1)
 * @returns Parsed level data
 */
export async function parseLevelBuffer(
  buffer: ArrayBuffer,
  gameType: GlobalsInterface,
  pyodideRunner?: PyodideRunner,
): Promise<ParseResult> {
  try {
    let levelData: ottoMaticLevel;

    if (gameType.GAME_TYPE === Game.NANOSAUR) {
      // Nanosaur 1 uses proprietary binary format
      levelData = parseNanosaur1LevelBuffer(buffer);
    } else {
      // All other games use resource fork format
      if (!pyodideRunner) {
        return {
          levelData: {} as ottoMaticLevel,
          success: false,
          error: "PyodideRunner required for non-Nanosaur 1 games",
        };
      }

      levelData = await pyodideRunner.parseBuffer(
        buffer,
        gameType.STRUCT_SPECS,
        [],
        [],
      );

      // Apply preprocessing (modifies levelData in place)
      preprocessJson(levelData, gameType);
    }

    return { levelData, success: true };
  } catch (error) {
    return {
      levelData: {} as ottoMaticLevel,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Parse a Nanosaur 1 .ter file buffer
 * (JavaScript-based parser, no pyodide needed)
 */
export function parseNanosaur1LevelBuffer(buffer: ArrayBuffer): ottoMaticLevel {
  const rawLevelData = parseNanosaur1Level(buffer);
  return nanosaur1LevelToOttoMaticLevel(rawLevelData);
}

/**
 * Parse a Nanosaur 1 .trt texture file
 * @returns Array of tile textures as Uint16Arrays
 */
export function parseNanosaur1TextureBuffer(buffer: ArrayBuffer): Uint16Array[] {
  return parseNanosaurTerrainTextures(buffer);
}

// ============================================================================
// SERIALIZATION FUNCTIONS
// ============================================================================

/**
 * Serialize level data back to binary format
 *
 * @param levelData - The level data to serialize
 * @param gameType - Game-specific configuration
 * @param pyodideRunner - Pyodide interface
 * @returns Serialized binary buffer
 */
export async function serializeLevelData(
  levelData: ottoMaticLevel,
  gameType: GlobalsInterface,
  pyodideRunner: PyodideRunner,
): Promise<SerializeResult> {
  try {
    if (gameType.GAME_TYPE === Game.NANOSAUR) {
      // Nanosaur 1 serialization not supported (proprietary format)
      return {
        buffer: new ArrayBuffer(0),
        success: false,
        error: "Nanosaur 1 level serialization is not yet supported",
      };
    }

    const buffer = await pyodideRunner.serializeLevel(
      levelData,
      gameType.STRUCT_SPECS,
      [],
      [],
      true, // use ADF format
    );

    return { buffer, success: true };
  } catch (error) {
    return {
      buffer: new ArrayBuffer(0),
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ============================================================================
// ROUNDTRIP TESTING FUNCTIONS
// ============================================================================

/**
 * Perform a complete roundtrip test: parse -> serialize -> parse
 * This verifies that level data can be losslessly converted.
 *
 * @param buffer - Original binary level data
 * @param gameType - Game-specific configuration
 * @param pyodideRunner - Pyodide interface
 * @returns Roundtrip test results
 */
export async function performRoundtrip(
  buffer: ArrayBuffer,
  gameType: GlobalsInterface,
  pyodideRunner: PyodideRunner,
): Promise<RoundtripResult> {
  // Parse original
  const originalResult = await parseLevelBuffer(buffer, gameType, pyodideRunner);
  if (!originalResult.success) {
    throw new Error(`Failed to parse original: ${originalResult.error}`);
  }

  // Serialize back to binary
  const serializeResult = await serializeLevelData(
    originalResult.levelData,
    gameType,
    pyodideRunner,
  );
  if (!serializeResult.success) {
    throw new Error(`Failed to serialize: ${serializeResult.error}`);
  }

  // Parse the serialized buffer
  const roundtripResult = await parseLevelBuffer(
    serializeResult.buffer,
    gameType,
    pyodideRunner,
  );
  if (!roundtripResult.success) {
    throw new Error(`Failed to parse roundtrip: ${roundtripResult.error}`);
  }

  // Compare the two parsed results
  const comparison = compareLevelDataObjects(
    originalResult.levelData,
    roundtripResult.levelData,
  );

  // Compare binary sizes
  const bytesMatch =
    buffer.byteLength === serializeResult.buffer.byteLength &&
    compareBuffersEqual(buffer, serializeResult.buffer);

  return {
    original: originalResult.levelData,
    serialized: serializeResult.buffer,
    roundtrip: roundtripResult.levelData,
    bytesMatch,
    jsonMatch: comparison.equal,
    originalSize: buffer.byteLength,
    roundtripSize: serializeResult.buffer.byteLength,
    differences: comparison.differences,
  };
}

/**
 * Compare two level data objects deeply
 */
export function compareLevelDataObjects(
  original: ottoMaticLevel,
  roundtrip: ottoMaticLevel,
): {
  equal: boolean;
  differences: Array<{ path: string; original: unknown; roundtrip: unknown }>;
} {
  const differences: Array<{
    path: string;
    original: unknown;
    roundtrip: unknown;
  }> = [];

  function compare(obj1: unknown, obj2: unknown, path: string): void {
    if (obj1 === obj2) return;

    if (typeof obj1 !== typeof obj2) {
      differences.push({ path, original: obj1, roundtrip: obj2 });
      return;
    }

    if (obj1 === null || obj2 === null) {
      if (obj1 !== obj2) {
        differences.push({ path, original: obj1, roundtrip: obj2 });
      }
      return;
    }

    if (Array.isArray(obj1) && Array.isArray(obj2)) {
      if (obj1.length !== obj2.length) {
        differences.push({
          path: `${path}.length`,
          original: obj1.length,
          roundtrip: obj2.length,
        });
      }
      const maxLen = Math.max(obj1.length, obj2.length);
      for (let i = 0; i < maxLen; i++) {
        compare(obj1[i], obj2[i], `${path}[${i}]`);
      }
      return;
    }

    if (typeof obj1 === "object" && typeof obj2 === "object") {
      const keys1 = Object.keys(obj1 as object);
      const keys2 = Object.keys(obj2 as object);
      const allKeys = new Set([...keys1, ...keys2]);

      for (const key of allKeys) {
        compare(
          (obj1 as Record<string, unknown>)[key],
          (obj2 as Record<string, unknown>)[key],
          path ? `${path}.${key}` : key,
        );
      }
      return;
    }

    // Primitive values
    if (obj1 !== obj2) {
      // For numbers, allow small floating point differences
      if (typeof obj1 === "number" && typeof obj2 === "number") {
        const diff = Math.abs(obj1 - obj2);
        if (diff > 0.0001) {
          differences.push({ path, original: obj1, roundtrip: obj2 });
        }
      } else {
        differences.push({ path, original: obj1, roundtrip: obj2 });
      }
    }
  }

  compare(original, roundtrip, "");

  return {
    equal: differences.length === 0,
    differences,
  };
}

/**
 * Compare two binary buffers for equality
 */
export function compareBuffersEqual(
  buffer1: ArrayBuffer,
  buffer2: ArrayBuffer,
): boolean {
  if (buffer1.byteLength !== buffer2.byteLength) {
    return false;
  }

  const view1 = new Uint8Array(buffer1);
  const view2 = new Uint8Array(buffer2);

  for (let i = 0; i < view1.length; i++) {
    if (view1[i] !== view2[i]) {
      return false;
    }
  }

  return true;
}

/**
 * Get detailed buffer comparison
 */
export function compareBuffersDetailed(
  buffer1: ArrayBuffer,
  buffer2: ArrayBuffer,
): {
  equal: boolean;
  sizeDiff: number;
  firstDifferenceOffset: number | null;
  differenceCount: number;
} {
  const view1 = new Uint8Array(buffer1);
  const view2 = new Uint8Array(buffer2);

  const sizeDiff = view1.length - view2.length;
  const minLen = Math.min(view1.length, view2.length);

  let firstDifferenceOffset: number | null = null;
  let differenceCount = 0;

  for (let i = 0; i < minLen; i++) {
    if (view1[i] !== view2[i]) {
      if (firstDifferenceOffset === null) {
        firstDifferenceOffset = i;
      }
      differenceCount++;
    }
  }

  // Count extra bytes as differences
  differenceCount += Math.abs(sizeDiff);

  return {
    equal: differenceCount === 0 && sizeDiff === 0,
    sizeDiff,
    firstDifferenceOffset,
    differenceCount,
  };
}

// ============================================================================
// DOWNLOAD HELPER FUNCTIONS
// ============================================================================

/**
 * Create a downloadable file from level data
 *
 * @param levelData - The level data to download
 * @param filename - Target filename
 * @param gameType - Game-specific configuration
 * @param pyodideRunner - Pyodide interface
 * @returns Blob of the serialized level
 */
export async function createDownloadableLevel(
  levelData: ottoMaticLevel,
  filename: string,
  gameType: GlobalsInterface,
  pyodideRunner: PyodideRunner,
): Promise<{ blob: Blob; filename: string } | null> {
  const result = await serializeLevelData(levelData, gameType, pyodideRunner);
  if (!result.success) {
    console.error(`Failed to serialize level: ${result.error}`);
    return null;
  }

  const blob = new Blob([result.buffer], { type: "application/octet-stream" });
  return { blob, filename };
}

/**
 * Trigger a file download in the browser
 */
export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================================================
// URL FETCHING HELPERS
// ============================================================================

/**
 * Fetch a level file from a URL
 */
export async function fetchLevelFile(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }
  return response.arrayBuffer();
}

/**
 * Get the appropriate file URLs for a game type
 */
export function getLevelFileUrls(
  baseUrl: string,
  gameType: GlobalsInterface,
): { rsrcUrl: string; terUrl: string | null } {
  if (gameType.DATA_TYPE === DataType.TRT_FILE) {
    // Nanosaur 1: .ter for data, .trt for textures
    return {
      rsrcUrl: baseUrl, // .ter file
      terUrl: baseUrl.replace(/\.ter$/, ".trt"), // .trt file
    };
  } else if (gameType.DATA_TYPE === DataType.RSRC_FORK) {
    // Bugdom 1: Everything in .ter.rsrc
    return {
      rsrcUrl: baseUrl + ".rsrc",
      terUrl: null, // No separate texture file
    };
  } else {
    // Standard: .ter.rsrc for data, .ter for textures
    return {
      rsrcUrl: baseUrl + ".rsrc",
      terUrl: baseUrl,
    };
  }
}
