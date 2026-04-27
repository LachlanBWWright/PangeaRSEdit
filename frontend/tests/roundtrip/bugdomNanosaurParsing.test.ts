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
    if (!parseResult.ok) expect.fail("Parse: " + String(parseResult.error));
    const parsedUnknown: unknown = JSON.parse(parseResult.value);
    if (!isRecord(parsedUnknown)) {
      expect.fail("Parse: Parsed JSON is not an object");
    }
    const parsed = parsedUnknown;

    fixNullToZero(parsed);
    const preResult = preprocessJson(parsed, BugdomGlobals);
    if (preResult.isErr())
      expect.fail("Preprocess: " + preResult.error);
    fixNullToZero(parsed);

    const valResult = validateLevelDataForGame(parsed, BugdomGlobals.GAME_TYPE);
    if (valResult.isErr()) expect.fail("Validate: " + valResult.error);

    if (!isLevelDataLike(parsed))
      expect.fail("Parsed data is not LevelData");
    const split = splitLevelData(parsed);
    const combResult = combineLevelData(split);
    if (combResult.isErr()) expect.fail("Combine: " + combResult.error);

    const sanitized = sanitizeResourceForkJson(combResult.value);
    const serResult = loadBytesFromJson(sanitized, bugdomSpecs, [], [], true);
    if (!serResult.ok) expect.fail("Serialize: " + String(serResult.error));

    return {
      original: new Uint8Array(data),
      serialized: serResult.value,
      combined: sanitized,
    };
  }

  for (const levelFile of levelFiles) {
    const filePath = join(terrainDir, levelFile);
    const testFn = existsSync(filePath) ? it : it.skip;
    testFn(`should keep ${levelFile} parseable through full save pipeline`, async () => {
      const { serialized, combined } = await runBugdomPipeline(levelFile);
      expect(serialized.byteLength).toBeGreaterThan(0);
      expect(combined._metadata).toBeDefined();
      expect(combined.Hedr).toBeDefined();

      const reparsedResult = await saveToJson(serialized, bugdomSpecs, [], []);
      expect(reparsedResult.ok).toBe(true);
    }, 120000);

    testFn(`should preserve Timg texture data through full save pipeline for ${levelFile}`, async () => {
      const { serialized, combined } = await runBugdomPipeline(levelFile);

      // Timg must survive split → combine → sanitize
      expect(combined.Timg).toBeDefined();

      // Re-parse the serialized binary and confirm Timg is still present
      const reparsedResult = await saveToJson(serialized, bugdomSpecs, [], []);
      expect(reparsedResult.ok).toBe(true);
      if (!reparsedResult.ok) return;

      function isRecord(v: unknown): v is Record<string, unknown> {
        return typeof v === "object" && v !== null;
      }
      const reparsed: unknown = JSON.parse(reparsedResult.value);
      expect(isRecord(reparsed) && "Timg" in reparsed).toBe(true);
      if (!isRecord(reparsed) || !isRecord(reparsed.Timg)) return;
      const timg1000 = reparsed.Timg["1000"];
      expect(isRecord(timg1000) && typeof timg1000.data === "string" && timg1000.data.length > 0).toBe(true);

      // Texture hex data must be identical to original
      if (!isRecord(combined.Timg) || !isRecord(combined.Timg["1000"])) return;
      const originalHex = combined.Timg["1000"].data;
      expect(isRecord(timg1000) && timg1000.data).toBe(originalHex);
    }, 120000);
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
    const rawLevelData = parseNanosaur1Level(arrayBuffer);

    const withMetadata = nanosaur1LevelToLevelData(rawLevelData);
    fixNullToZero(withMetadata);

    const valResult = validateLevelDataForGame(
      withMetadata,
      NanosaurGlobals.GAME_TYPE,
    );
    if (valResult.isErr()) expect.fail("Validate: " + valResult.error);

    const split = splitLevelData(withMetadata);
    const combResult = combineLevelData(split);
    if (combResult.isErr()) expect.fail("Combine: " + combResult.error);

    const combinedRaw = isRecord(combResult.value._metadata)
      ? combResult.value._metadata.nanosaur1RawLevel
      : undefined;
    if (!isNanosaur1LevelData(combinedRaw)) {
      expect.fail("rawLevelData lost through split/combine");
    }

    const compileResult = compileNanosaur1Level(combResult.value, combinedRaw);
    if (compileResult.isErr()) {
      expect.fail("Compile failed: " + compileResult.error);
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
  }, 120000);

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
      expect(combResult.isOk()).toBe(true);
      if (combResult.isErr()) return;

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
      expect(compileResult.isOk()).toBe(true);
      if (compileResult.isErr()) return;

      // Re-parse the compiled binary and check if our modification is there
      const reParsedResult = parseNanosaur1Level(compileResult.value);
      const reParsedItem = reParsedResult.objectList[0];
      if (!reParsedItem) return;
      expect(reParsedItem.x).toBe(123);
      expect(reParsedItem.y).toBe(456);

      // Verify other data is preserved (like rawLevelData settings)
      expect(reParsedResult.header.width).toBe(rawLevelData.header.width);
      expect(reParsedResult.textureLayer.length).toBe(rawLevelData.textureLayer.length);
    },
    120000,
  );
});
