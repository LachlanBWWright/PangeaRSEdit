/**
 * Core map parsing utilities - extracted from UploadPrompt.tsx
 * These functions can be used both in React components and in tests
 */

import { LevelData } from "@/python/structSpecs/LevelTypes";
import { ParseLevelOptions, SerializeLevelOptions } from "./types";
import {
  nanosaur1LevelToLevelData,
  parseNanosaur1Level,
} from "../processors/classicProprocessor";
import { preprocessJson } from "../processors/ottoPreprocessor";
import { fixNullToZero } from "../processors/nullToZeroFixer";
import { DataType, GlobalsInterface } from "../globals/globals";
import { Result, ok, err, isErr, tryFn } from "../../types/result";
import { saveToJson, loadBytesFromJson } from "@lachlanbwwright/rsrcdump-ts";

// Type guard helper
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Parse a level data buffer to JSON using rsrcdump-ts
 * This is the core parsing function that wraps the rsrcdump-ts library
 *
 * @param buffer - The raw binary level data
 * @param options - Parsing options including struct specs
 * @returns Result with the parsed level data as LevelData
 */
export async function parseLevelBuffer(
  buffer: ArrayBuffer,
  options: ParseLevelOptions,
): Promise<Result<LevelData, Error>> {
  const { structSpecs, includeTypes = [], excludeTypes = [] } = options;

  const bytes = new Uint8Array(buffer);
  const parseResult = await saveToJson(
    bytes,
    structSpecs || [],
    includeTypes,
    excludeTypes,
  );

  if (!parseResult.ok) {
    return err(new Error(parseResult.error));
  }

  const jsonParseResult = tryFn(() => JSON.parse(parseResult.value));
  if (!jsonParseResult.ok) {
    return err(new Error(`JSON parse failed: ${jsonParseResult.error.message}`));
  }

  const parsed: unknown = jsonParseResult.value;

  // Fix null values from rsrcdump-ts v1.0.4 bug (returns null for numeric zeros)
  if (isRecord(parsed)) {
    fixNullToZero(parsed);
    // Validate the parsed structure has the expected LevelData shape
    if (isLevelDataLike(parsed)) {
      return ok(parsed);
    }
    return err(new Error("Parsed data does not match LevelData structure"));
  }
  return err(new Error("Parsed data is not an object"));
}

// Type guard for LevelData - checks basic structure
function isLevelDataLike(value: unknown): value is LevelData {
  // LevelData is a generic type with optional fields, so a basic record check is sufficient here
  return isRecord(value);
}

/**
 * Parse a Nanosaur 1 level file (uses different format than other games)
 *
 * @param buffer - The raw .ter file data
 * @returns Result with the parsed level data converted to LevelData format
 */
export function parseNanosaur1Buffer(
  buffer: ArrayBuffer,
  gameType?: GlobalsInterface,
): Result<LevelData, Error> {
  const parseResult = tryFn(() => {
    const rawLevelData = parseNanosaur1Level(buffer);
    return nanosaur1LevelToLevelData(
      rawLevelData,
      gameType?.TILE_SIZE ?? 32,
      gameType?.TILE_INGAME_SIZE ?? 140,
      4.0,
    );
  });

  if (!parseResult.ok) {
    return err(parseResult.error);
  }

  return ok(parseResult.value);
}

/**
 * Serialize level data back to binary format using rsrcdump-ts
 *
 * @param levelData - The level data to serialize
 * @param options - Serialization options including struct specs
 * @returns Result with the serialized binary buffer
 */
export async function serializeLevelData(
  levelData: LevelData,
  options: SerializeLevelOptions,
): Promise<Result<ArrayBuffer, Error>> {
  const { structSpecs } = options;

  const saveResult = loadBytesFromJson(
    levelData,
    structSpecs || [],
    [], // onlyTypes
    [], // skipTypes
    true, // adf
  );

  if (!saveResult.ok) {
    return err(new Error(saveResult.error));
  }

  const resultBuffer = saveResult.value.buffer;
  if (!(resultBuffer instanceof ArrayBuffer)) {
    return err(new Error("Result buffer is not an ArrayBuffer"));
  }
  return ok(resultBuffer);
}

/**
 * Parse a level file based on game type
 * Handles both rsrcdump-ts parsing and Nanosaur 1 special case
 *
 * @param buffer - The raw binary level data
 * @param gameType - The game type configuration
 * @returns Result with the parsed level data
 */
export async function parseLevelForGame(
  buffer: ArrayBuffer,
  gameType: GlobalsInterface,
): Promise<Result<LevelData, Error>> {
  if (gameType.DATA_TYPE === DataType.TRT_FILE) {
    // Nanosaur 1 uses its own TRT file parser
    return parseNanosaur1Buffer(buffer, gameType);
  }

  const parseResult = await parseLevelBuffer(buffer, {
    structSpecs: gameType.STRUCT_SPECS,
  });

  if (isErr(parseResult)) {
    return parseResult;
  }

  // Apply preprocessing (LevelData must be a record for preprocessJson)
  if (!isRecord(parseResult.value)) {
    return err(new Error("Parsed data is not an object"));
  }
  const preprocessResult = preprocessJson(parseResult.value, gameType);
  if (isErr(preprocessResult)) {
    return preprocessResult;
  }

  return ok(parseResult.value);
}

/**
 * Perform a complete roundtrip: parse -> serialize -> parse
 * Returns both the original and roundtrip parsed data for comparison
 *
 * @param buffer - The raw binary level data
 * @param gameType - The game type configuration
 * @returns Result with object containing original, serialized, and re-parsed data
 */
export async function performRoundtrip(
  buffer: ArrayBuffer,
  gameType: GlobalsInterface,
): Promise<
  Result<
    {
      original: LevelData;
      serialized: ArrayBuffer;
      roundtrip: LevelData;
    },
    Error
  >
> {
  // Parse the original buffer
  const originalResult = await parseLevelForGame(buffer, gameType);

  if (isErr(originalResult)) {
    return err(
      new Error(`Failed to parse original: ${originalResult.error.message}`),
    );
  }

  // Serialize back to binary
  const serializedResult = await serializeLevelData(originalResult.value, {
    structSpecs: gameType.STRUCT_SPECS,
  });

  if (isErr(serializedResult)) {
    return err(
      new Error(`Failed to serialize: ${serializedResult.error.message}`),
    );
  }

  // Parse the serialized buffer
  const roundtripResult = await parseLevelForGame(
    serializedResult.value,
    gameType,
  );

  if (isErr(roundtripResult)) {
    return err(
      new Error(`Failed to parse roundtrip: ${roundtripResult.error.message}`),
    );
  }

  return ok({
    original: originalResult.value,
    serialized: serializedResult.value,
    roundtrip: roundtripResult.value,
  });
}

/**
 * Compare two level data objects for equality
 * Useful for roundtrip testing
 *
 * @param original - The original parsed level data
 * @param roundtrip - The roundtrip parsed level data
 * @returns Comparison result with details about any differences
 */
export function compareLevelData(
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

    if (isRecord(obj1) && isRecord(obj2)) {
      const keys1 = Object.keys(obj1);
      const keys2 = Object.keys(obj2);
      const allKeys = new Set([...keys1, ...keys2]);

      for (const key of allKeys) {
        compare(obj1[key], obj2[key], `${path}.${key}`);
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
 * Compare two binary buffers byte by byte
 *
 * @param buffer1 - First buffer
 * @param buffer2 - Second buffer
 * @returns Comparison result
 */
export function compareBuffers(
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
