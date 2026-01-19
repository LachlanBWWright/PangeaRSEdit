import { LevelData } from "@/python/structSpecs/LevelTypes";
import { GlobalsInterface } from "@/data/globals/globals";
import { EditOperation } from "@/data/levelEdit/editOperations";
import { levelEditor } from "@/data/levelEdit/levelEditorService";
import { reverseOperations } from "@/data/levelEdit/editOperationReverse";
// @ts-ignore
import { loadBytesFromJsonAsync, saveToJson } from "@lachlanbwwright/rsrcdump-ts";

/**
 * Serialize level data to bytes using rsrcdump
 */
export async function serializeLevelData(
  levelData: LevelData,
  globals: GlobalsInterface,
): Promise<Uint8Array> {
  // Use rsrcdump-ts to serialize
  const result = await loadBytesFromJsonAsync(levelData, globals.STRUCT_SPECS, [], []);
  if (!result.ok) throw new Error("Failed to serialize level data: " + result.error);
  return result.value;
}

/**
 * Parse bytes to level data using rsrcdump
 */
export async function parseLevelData(
  bytes: Uint8Array,
  globals: GlobalsInterface,
): Promise<LevelData> {
  const result = await saveToJson(bytes, globals.STRUCT_SPECS, [], []);
  if (!result.ok) throw new Error("Failed to parse level data: " + result.error);
  return JSON.parse(result.value) as LevelData;
}

/**
 * Compare two byte arrays
 */
export function compareBytes(
  original: Uint8Array,
  roundtrip: Uint8Array,
): { match: boolean; firstDiff: number | null; diffCount: number } {
  const minLength = Math.min(original.length, roundtrip.length);
  let firstDiff: number | null = null;
  let diffCount = 0;

  for (let i = 0; i < minLength; i++) {
    if (original[i] !== roundtrip[i]) {
      if (firstDiff === null) firstDiff = i;
      diffCount++;
    }
  }

  // Account for length difference
  const lengthDiff = Math.abs(original.length - roundtrip.length);
  diffCount += lengthDiff;
  if (firstDiff === null && lengthDiff > 0) {
    firstDiff = minLength;
  }

  return {
    match: diffCount === 0,
    firstDiff,
    diffCount,
  };
}

/**
 * Perform full edit roundtrip test
 */
export async function testEditRoundtrip(
  originalBytes: Uint8Array,
  globals: GlobalsInterface,
  operations: EditOperation[],
): Promise<{
  success: boolean;
  message: string;
  byteComparison?: ReturnType<typeof compareBytes>;
}> {
  try {
    // 1. Parse original level
    const originalData = await parseLevelData(originalBytes, globals);

    // 2. Apply edit operations
    const editedData = levelEditor.applyOperations(originalData, operations, globals);

    // 3. Serialize edited level
    const editedBytes = await serializeLevelData(editedData, globals);

    // 4. Parse edited level
    const reloadedData = await parseLevelData(editedBytes, globals);

    // 5. Apply reverse operations
    const reverseOps = reverseOperations(operations);
    const restoredData = levelEditor.applyOperations(reloadedData, reverseOps, globals);

    // 6. Serialize restored level
    const restoredBytes = await serializeLevelData(restoredData, globals);

    // 7. Compare with original
    const comparison = compareBytes(originalBytes, restoredBytes);

    if (comparison.match) {
      return {
        success: true,
        message: "Byte-for-byte roundtrip successful",
        byteComparison: comparison,
      };
    } else {
      return {
        success: false,
        message: `Roundtrip failed: ${comparison.diffCount} bytes differ, first at offset ${comparison.firstDiff}`,
        byteComparison: comparison,
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Roundtrip error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
