/**
 * Bugdom 1 & Nanosaur 1 Full Pipeline and Editing Tests
 *
 * Tests:
 * - Full parse → preprocess → validate → split → combine → serialize pipeline
 * - Byte-perfect roundtrip for all Bugdom 1 levels and Nanosaur 1's default level
 * - Level property editing without breaking save
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { saveToJson, loadBytesFromJson } from "@lachlanbwwright/rsrcdump-ts";
import { bugdomSpecs } from "../../src/python/structSpecs/bugdom";
import { preprocessJson } from "../../src/data/processors/ottoPreprocessor";
import { fixNullToZero } from "../../src/data/processors/nullToZeroFixer";
import { BugdomGlobals, NanosaurGlobals } from "../../src/data/globals/globals";
import { validateLevelDataForGame } from "../../src/validation/validateLevelForGame";
import {
  splitLevelData,
  combineLevelData,
  sanitizeResourceForkJson,
  isLevelDataLike,
} from "../../src/data/utils/levelDataUtils";
import {
  parseNanosaur1Level,
  nanosaur1LevelToLevelData,
} from "../../src/data/processors/classicProprocessor";
import {
  isRecord,
  isNanosaur1LevelData,
} from "../../src/editor/loadLogic/typeGuards";
import { compileNanosaur1Level } from "../../src/editor/loadLogic/compileNanosaur1Level";
import type { Nanosaur1LevelData } from "../../src/data/processors/classicProprocessor";
import type { LevelData } from "../../src/python/structSpecs/LevelTypes";

// ============================================================================
// BUGDOM 1 TESTS
// ============================================================================

describe("Bugdom 1 Full Save Pipeline", () => {
  const terrainDir = join(__dirname, "../../public/assets/bugdom/terrain");
  const levelFiles = [
    "AntHill.ter.rsrc",
    "AntKing.ter.rsrc",
    "Beach.ter.rsrc",
    "BeeHive.ter.rsrc",
    "Flight.ter.rsrc",
    "Lawn.ter.rsrc",
    "Night.ter.rsrc",
    "Pond.ter.rsrc",
    "QueenBee.ter.rsrc",
    "Training.ter.rsrc",
    "Training.ter.rsrc",
  ];

  async function runBugdomPipeline(levelFile: string): Promise<{
    original: Uint8Array;
    serialized: Uint8Array;
    combined: Record<string, unknown>;
  }> {
    const data = readFileSync(join(terrainDir, levelFile));

    const parseResult = await saveToJson(
      new Uint8Array(data),
      bugdomSpecs,
      [],
      [],
    );
    if (!parseResult.ok) throw new Error("Parse: " + parseResult.error);
    const parsed: Record<string, unknown> = JSON.parse(parseResult.value);

    fixNullToZero(parsed);
    const preResult = preprocessJson(parsed, BugdomGlobals);
    if (!preResult.ok)
      throw new Error("Preprocess: " + preResult.error.message);
    fixNullToZero(parsed);

    const valResult = validateLevelDataForGame(parsed, BugdomGlobals.GAME_TYPE);
    if (!valResult.ok) throw new Error("Validate: " + valResult.error.message);

    if (!isLevelDataLike(parsed))
      throw new Error("Parsed data is not LevelData");
    const split = splitLevelData(parsed);
    const combResult = combineLevelData(split);
    if (!combResult.ok) throw new Error("Combine: " + combResult.error.message);

    const sanitized = sanitizeResourceForkJson(combResult.value);
    const serResult = loadBytesFromJson(sanitized, bugdomSpecs, [], [], true);
    if (!serResult.ok) throw new Error("Serialize: " + serResult.error);

    return {
      original: new Uint8Array(data),
      serialized: serResult.value,
      combined: sanitized,
    };
  }

  for (const levelFile of levelFiles) {
    const filePath = join(terrainDir, levelFile);
    const testFn = existsSync(filePath) ? it : it.skip;
    testFn(`should roundtrip ${levelFile} byte-perfectly`, async () => {
      const { original, serialized } = await runBugdomPipeline(levelFile);
      expect(serialized).toEqual(original);
    });
  }
});

// ============================================================================
// NANOSAUR 1 TESTS
// ============================================================================

describe("Nanosaur 1 Full Save Pipeline", () => {
  const assetDir = join(__dirname, "../../public/assets/nanosaur");

  async function runNanosaurPipeline(arrayBuffer: ArrayBuffer): Promise<{
    original: Uint8Array;
    compiled: Uint8Array;
    rawLevelData: Nanosaur1LevelData;
    levelData: LevelData;
  }> {
    const parseResult = parseNanosaur1Level(arrayBuffer);
    if (!parseResult.ok) throw new Error("Parse: " + parseResult.error.message);
    const rawLevelData = parseResult.value;

    const withMetadata = nanosaur1LevelToLevelData(rawLevelData);
    fixNullToZero(withMetadata);

    const valResult = validateLevelDataForGame(
      withMetadata,
      NanosaurGlobals.GAME_TYPE,
    );
    if (!valResult.ok) throw new Error("Validate: " + valResult.error.message);

    const split = splitLevelData(withMetadata);
    const combResult = combineLevelData(split);
    if (!combResult.ok) throw new Error("Combine: " + combResult.error.message);

    const combinedRaw = isRecord(combResult.value._metadata)
      ? combResult.value._metadata.nanosaur1RawLevel
      : undefined;
    if (!isNanosaur1LevelData(combinedRaw)) {
      throw new Error("rawLevelData lost through split/combine");
    }

    const compileResult = compileNanosaur1Level(combResult.value, combinedRaw);
    if (!compileResult.ok) {
      throw new Error("Compile failed: " + compileResult.error.message);
    }

    return {
      original: new Uint8Array(arrayBuffer),
      compiled: new Uint8Array(compileResult.value),
      rawLevelData,
      levelData: withMetadata,
    };
  }

  const level1Path = join(assetDir, "Level1.ter");
  const level1Test = existsSync(level1Path) ? it : it.skip;

  level1Test("should roundtrip Level1.ter byte-perfectly", async () => {
    const data = readFileSync(level1Path);
    const { original, compiled } = await runNanosaurPipeline(data.buffer);
    expect(compiled).toEqual(original);
  });

  level1Test(
    "should preserve modifications through the pipeline for Level1.ter",
    async () => {
      const data = readFileSync(level1Path);
      const { levelData, rawLevelData } = await runNanosaurPipeline(
        data.buffer,
      );

      // Modify an item's position in the high-level LevelData
      const items = levelData.Itms?.[1000]?.obj;
      if (Array.isArray(items) && items.length > 0 && isRecord(items[0])) {
        items[0].x = 123;
        items[0].z = 456;
      }

      // Process the modified levelData back to binary
      const split = splitLevelData(levelData);
      const combResult = combineLevelData(split);
      expect(combResult.ok).toBe(true);
      if (!combResult.ok) return;

      const combinedRaw = isRecord(combResult.value._metadata)
        ? combResult.value._metadata.nanosaur1RawLevel
        : undefined;
      expect(combinedRaw).toBeDefined();
      if (!isNanosaur1LevelData(combinedRaw)) {
        return;
      }

      const compileResult = compileNanosaur1Level(
        combResult.value,
        combinedRaw,
      );
      expect(compileResult.ok).toBe(true);
      if (!compileResult.ok) return;

      // Re-parse the compiled binary and check if our modification is there
      const reParsedResult = parseNanosaur1Level(compileResult.value);
      expect(reParsedResult.ok).toBe(true);
      if (!reParsedResult.ok) return;

      const reParsedItem = reParsedResult.value.items[0];
      expect(reParsedItem.x).toBe(123);
      expect(reParsedItem.y).toBe(456);

      // Verify other data is preserved (like rawLevelData settings)
      expect(reParsedResult.value.skyColor).toEqual(rawLevelData.skyColor);
    },
  );
});
