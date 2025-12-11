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
import { DataType, GlobalsInterface } from "../globals/globals";
import { Result, ok, err, isErr } from "../../types/result";

/**
 * Parse a level data buffer to JSON using pyodide
 * This is the core parsing function that wraps the pyodide worker call
 *
 * @param buffer - The raw binary level data
 * @param options - Parsing options including struct specs
 * @param pyodideRunner - A function that runs pyodide code (can be worker or direct)
 * @returns Result with the parsed level data as LevelData
 */
export async function parseLevelBuffer(
  buffer: ArrayBuffer,
  options: ParseLevelOptions,
  pyodideRunner: (code: string, buffer: ArrayBuffer) => Promise<string>,
): Promise<Result<LevelData, Error>> {
  const { structSpecs, includeTypes = [], excludeTypes = [] } = options;

  try {
    const resultJson = await pyodideRunner(
      `rsrcdump.save_to_json(
        buffer,
        ${JSON.stringify(structSpecs)},
        ${JSON.stringify(includeTypes)},
        ${JSON.stringify(excludeTypes)}
      )`,
      buffer,
    );

    return ok(JSON.parse(resultJson) as LevelData);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
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
  try {
    const rawLevelData = parseNanosaur1Level(buffer);
    return ok(
      nanosaur1LevelToLevelData(
        rawLevelData,
        gameType?.TILE_SIZE ?? 32,
        gameType?.TILE_INGAME_SIZE ?? 140,
        4.0,
      ),
    );
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Serialize level data back to binary format using pyodide
 *
 * @param levelData - The level data to serialize
 * @param options - Serialization options including struct specs
 * @param pyodideRunner - A function that runs pyodide code
 * @returns Result with the serialized binary buffer
 */
export async function serializeLevelData(
  levelData: LevelData,
  options: SerializeLevelOptions,
  pyodideRunner: (code: string, jsonData: object) => Promise<ArrayBuffer>,
): Promise<Result<ArrayBuffer, Error>> {
  const { structSpecs, onlyTypes = [], skipTypes = [], adf = true } = options;

  try {
    const result = await pyodideRunner(
      `rsrcdump.load_bytes_from_json(
        json_buffer,
        ${JSON.stringify(structSpecs)},
        ${JSON.stringify(onlyTypes)},
        ${JSON.stringify(skipTypes)},
        ${adf ? "True" : "False"}
      )`,
      levelData,
    );
    return ok(result);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Parse a level file based on game type
 * Handles both pyodide-based parsing and Nanosaur 1 special case
 *
 * @param buffer - The raw binary level data
 * @param gameType - The game type configuration
 * @param pyodideRunner - A function that runs pyodide code (optional for Nanosaur 1)
 * @returns Result with the parsed level data
 */
export async function parseLevelForGame(
  buffer: ArrayBuffer,
  gameType: GlobalsInterface,
  pyodideRunner?: (code: string, buffer: ArrayBuffer) => Promise<string>,
): Promise<Result<LevelData, Error>> {
  if (gameType.DATA_TYPE === DataType.TRT_FILE) {
    // Nanosaur 1 uses its own TRT file parser
    return parseNanosaur1Buffer(buffer, gameType);
  }

  if (!pyodideRunner) {
    return err(new Error("pyodideRunner is required for non-TRT file games"));
  }

  const parseResult = await parseLevelBuffer(
    buffer,
    {
      structSpecs: gameType.STRUCT_SPECS,
    },
    pyodideRunner,
  );

  if (isErr(parseResult)) {
    return parseResult;
  }

  // Apply preprocessing
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
 * @param pyodideRunner - Functions for running pyodide code
 * @returns Result with object containing original, serialized, and re-parsed data
 */
export async function performRoundtrip(
  buffer: ArrayBuffer,
  gameType: GlobalsInterface,
  pyodideRunner: {
    parse: (code: string, buffer: ArrayBuffer) => Promise<string>;
    serialize: (code: string, jsonData: object) => Promise<ArrayBuffer>;
  },
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
  const originalResult = await parseLevelForGame(
    buffer,
    gameType,
    pyodideRunner.parse,
  );

  if (isErr(originalResult)) {
    return err(
      new Error(`Failed to parse original: ${originalResult.error.message}`),
    );
  }

  // Serialize back to binary
  const serializedResult = await serializeLevelData(
    originalResult.value,
    {
      structSpecs: gameType.STRUCT_SPECS,
    },
    pyodideRunner.serialize,
  );

  if (isErr(serializedResult)) {
    return err(
      new Error(`Failed to serialize: ${serializedResult.error.message}`),
    );
  }

  // Parse the serialized buffer
  const roundtripResult = await parseLevelForGame(
    serializedResult.value,
    gameType,
    pyodideRunner.parse,
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
          `${path}.${key}`,
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
