/**
 * Level I/O Service
 *
 * This module provides testable functions for importing, exporting, and
 * downloading level data. Logic is extracted from React components to
 * enable unit testing with roundtrip verification.
 *
 * All functions return Result types instead of throwing errors.
 */

import { GlobalsInterface, DataType } from "../globals/globals";
import { preprocessJson } from "../processors/ottoPreprocessor";
import { LevelData } from "@/python/structSpecs/LevelTypes";
import {
  parseNanosaur1Level,
  nanosaur1LevelToLevelData,
  parseNanosaurTerrainTextures,
} from "../processors/classicProprocessor";
import { Result, ok, err, fromPromise, isErr } from "../../types/result";

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
  ) => Promise<LevelData>;
  serializeLevel: (
    levelData: LevelData,
    structSpecs: string[],
    onlyTypes?: string[],
    skipTypes?: string[],
    adf?: boolean,
  ) => Promise<ArrayBuffer>;
}

/**
 * Result of a roundtrip test (parse -> serialize -> parse)
 */
export interface RoundtripResult {
  original: LevelData;
  serialized: ArrayBuffer;
  roundtrip: LevelData;
  bytesMatch: boolean;
  jsonMatch: boolean;
  originalSize: number;
  roundtripSize: number;
  differences: { path: string; original: unknown; roundtrip: unknown }[];
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
 * @returns Result with parsed level data or error
 */
export async function parseLevelBuffer(
  buffer: ArrayBuffer,
  gameType: GlobalsInterface,
  pyodideRunner?: PyodideRunner,
): Promise<Result<LevelData, Error>> {
  if (gameType.DATA_TYPE === DataType.TRT_FILE) {
    // Nanosaur 1 uses proprietary TRT binary format
    const result = parseNanosaur1LevelBuffer(buffer, gameType);
    if (isErr(result)) {
      return result;
    }
    return ok(result.value);
  }

  // All other games use resource fork format
  if (!pyodideRunner) {
    return err(new Error("PyodideRunner required for non-Nanosaur 1 games"));
  }

  const parseResult = await fromPromise(
    pyodideRunner.parseBuffer(buffer, gameType.STRUCT_SPECS, [], []),
  );

  if (isErr(parseResult)) {
    return parseResult;
  }

  // Apply preprocessing (modifies levelData in place)
  const parsedUnknown: unknown = parseResult.value;
  function isRecord(x: unknown): x is Record<string, unknown> {
    return typeof x === "object" && x !== null && !Array.isArray(x);
  }
  if (!isRecord(parsedUnknown)) {
    return err(new Error("Parsed level data is not an object"));
  }
  const preprocessResult = preprocessJson(parsedUnknown, gameType);
  if (isErr(preprocessResult)) {
    return preprocessResult;
  }

  return ok(parseResult.value);
}

/**
 * Parse a Nanosaur 1 .ter file buffer
 * (JavaScript-based parser, no pyodide needed)
 */
export function parseNanosaur1LevelBuffer(
  buffer: ArrayBuffer,
  gameType?: GlobalsInterface,
): Result<LevelData, Error> {
  try {
    const rawLevelData = parseNanosaur1Level(buffer);
    const converted = nanosaur1LevelToLevelData(
      rawLevelData,
      gameType?.TILE_SIZE ?? 32,
      gameType?.TILE_INGAME_SIZE ?? 140,
      4.0,
    );
    return ok(converted);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Parse a Nanosaur 1 .trt texture file
 * @returns Result with array of tile textures as Uint16Arrays
 */
export function parseNanosaur1TextureBuffer(
  buffer: ArrayBuffer,
): Result<Uint16Array[], Error> {
  try {
    const textures = parseNanosaurTerrainTextures(buffer);
    return ok(textures);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
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
 * @returns Result with serialized binary buffer or error
 */
export async function serializeLevelData(
  levelData: LevelData,
  gameType: GlobalsInterface,
  pyodideRunner: PyodideRunner,
): Promise<Result<ArrayBuffer, Error>> {
  if (gameType.DATA_TYPE === DataType.TRT_FILE) {
    // Nanosaur 1 TRT file serialization not supported (proprietary format)
    return err(
      new Error("Nanosaur 1 TRT level serialization is not yet supported"),
    );
  }

  return fromPromise(
    pyodideRunner.serializeLevel(
      levelData,
      gameType.STRUCT_SPECS,
      [],
      [],
      true,
    ),
  );
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
 * @returns Result with roundtrip test results or error
 */
export async function performRoundtrip(
  buffer: ArrayBuffer,
  gameType: GlobalsInterface,
  pyodideRunner: PyodideRunner,
): Promise<Result<RoundtripResult, Error>> {
  // Parse original
  const originalResult = await parseLevelBuffer(
    buffer,
    gameType,
    pyodideRunner,
  );
  if (isErr(originalResult)) {
    return err(
      new Error(`Failed to parse original: ${originalResult.error.message}`),
    );
  }

  // Serialize back to binary
  const serializeResult = await serializeLevelData(
    originalResult.value,
    gameType,
    pyodideRunner,
  );
  if (isErr(serializeResult)) {
    return err(
      new Error(`Failed to serialize: ${serializeResult.error.message}`),
    );
  }

  // Parse the serialized buffer
  const roundtripResult = await parseLevelBuffer(
    serializeResult.value,
    gameType,
    pyodideRunner,
  );
  if (isErr(roundtripResult)) {
    return err(
      new Error(`Failed to parse roundtrip: ${roundtripResult.error.message}`),
    );
  }

  // Compare the two parsed results
  const comparison = compareLevelDataObjects(
    originalResult.value,
    roundtripResult.value,
  );

  // Compare binary sizes
  const bytesMatch =
    buffer.byteLength === serializeResult.value.byteLength &&
    compareBuffersEqual(buffer, serializeResult.value);

  return ok({
    original: originalResult.value,
    serialized: serializeResult.value,
    roundtrip: roundtripResult.value,
    bytesMatch,
    jsonMatch: comparison.equal,
    originalSize: buffer.byteLength,
    roundtripSize: serializeResult.value.byteLength,
    differences: comparison.differences,
  });
}

/**
 * Compare two level data objects deeply
 */
export function compareLevelDataObjects(
  original: LevelData,
  roundtrip: LevelData,
): {
  equal: boolean;
  differences: { path: string; original: unknown; roundtrip: unknown }[];
} {
  const differences: {
    path: string;
    original: unknown;
    roundtrip: unknown;
  }[] = [];

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

    function isRecord(x: unknown): x is Record<string, unknown> {
      return typeof x === "object" && x !== null && !Array.isArray(x);
    }

    if (isRecord(obj1) && isRecord(obj2)) {
      const keys1 = Object.keys(obj1);
      const keys2 = Object.keys(obj2);
      const allKeys = new Set([...keys1, ...keys2]);

      for (const key of allKeys) {
        compare(obj1[key], obj2[key], path ? `${path}.${key}` : key);
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
 * @returns Result with blob and filename, or error
 */
export async function createDownloadableLevel(
  levelData: LevelData,
  filename: string,
  gameType: GlobalsInterface,
  pyodideRunner: PyodideRunner,
): Promise<Result<{ blob: Blob; filename: string }, Error>> {
  const result = await serializeLevelData(levelData, gameType, pyodideRunner);
  if (isErr(result)) {
    return err(new Error(`Failed to serialize level: ${result.error.message}`));
  }

  const blob = new Blob([result.value], { type: "application/octet-stream" });
  return ok({ blob, filename });
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
export async function fetchLevelFile(
  url: string,
): Promise<Result<ArrayBuffer, Error>> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return err(new Error(`Failed to fetch ${url}: ${response.statusText}`));
    }
    const buffer = await response.arrayBuffer();
    return ok(buffer);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
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
