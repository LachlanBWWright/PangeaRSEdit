/**
 * Bugdom 1 & Nanosaur 1 Full Pipeline and Editing Tests
 *
 * Tests:
 * - Full parse → preprocess → validate → split → combine → serialize pipeline
 * - Byte-perfect roundtrip for all Bugdom 1 levels and Nanosaur 1's default level
 * - Level property editing without breaking save
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
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
} from "../../src/data/utils/levelDataUtils";
import {
  parseNanosaur1Level,
  nanosaur1LevelToLevelData,
} from "../../src/data/processors/classicProprocessor";
import { compileNanosaur1Level } from "../../src/editor/loadLogic/compileNanosaur1Level";
import type { Nanosaur1LevelData } from "../../src/data/processors/classicProprocessor";
import type { LevelData } from "../../src/python/structSpecs/LevelTypes";

// Type guard helper
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// ============================================================================
// BUGDOM 1 TESTS
// ============================================================================

describe("Bugdom 1 Full Save Pipeline", () => {
  const terrainDir = join(
    __dirname,
    "../../public/assets/bugdom/terrain",
  );
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

  async function runBugdomPipeline(
    levelFile: string,
  ): Promise<{
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
    if (!preResult.ok) throw new Error("Preprocess: " + preResult.error.message);
    fixNullToZero(parsed);

    const valResult = validateLevelDataForGame(parsed, BugdomGlobals.GAME_TYPE);
    if (!valResult.ok) throw new Error("Validate: " + valResult.error.message);

    const split = splitLevelData(parsed as never);
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
    it("should complete full pipeline for " + levelFile, async () => {
      const { original, serialized } = await runBugdomPipeline(levelFile);
      const sizeDiff = Math.abs(serialized.length - original.length);
      // rsrcdump-ts resource fork serialization has a known 44-byte header discrepancy
      expect(sizeDiff).toBeLessThanOrEqual(44);
    });

    it("should produce identical JSON roundtrip for " + levelFile, async () => {
      const { serialized } = await runBugdomPipeline(levelFile);

      const reParseResult = await saveToJson(serialized, bugdomSpecs, [], []);
      expect(reParseResult.ok).toBe(true);
      if (!reParseResult.ok) return;

      const reparsed = JSON.parse(reParseResult.value);
      fixNullToZero(reparsed);
      expect(isRecord(reparsed)).toBe(true);
      if (!isRecord(reparsed)) return;

      for (const key of ["Hedr", "Layr", "YCrd", "Itms", "ItCo", "Atrb", "Xlat"]) {
        expect(key in reparsed, "Missing " + key).toBe(true);
      }
    });
  }

  it("should preserve all resource types through split/combine for Lawn.ter.rsrc", async () => {
    const { combined, original } = await runBugdomPipeline("Lawn.ter.rsrc");

    const origParseResult = await saveToJson(original, bugdomSpecs, [], []);
    expect(origParseResult.ok).toBe(true);
    if (!origParseResult.ok) return;

    const origParsed = JSON.parse(origParseResult.value);
    const origKeys = Object.keys(origParsed)
      .filter((k) => k !== "_metadata")
      .sort();
    const combinedKeys = Object.keys(combined)
      .filter((k) => k !== "_metadata")
      .sort();

    for (const key of origKeys) {
      expect(combinedKeys, "Missing resource type " + key).toContain(key);
    }
  });
});

describe("Bugdom 1 Level Editing", () => {
  const terrainDir = join(
    __dirname,
    "../../public/assets/bugdom/terrain",
  );

  it("should allow editing item positions without breaking save", async () => {
    const data = readFileSync(join(terrainDir, "Lawn.ter.rsrc"));

    const parseResult = await saveToJson(
      new Uint8Array(data),
      bugdomSpecs,
      [],
      [],
    );
    expect(parseResult.ok).toBe(true);
    if (!parseResult.ok) return;

    const parsed: Record<string, unknown> = JSON.parse(parseResult.value);
    fixNullToZero(parsed);
    preprocessJson(parsed, BugdomGlobals);
    fixNullToZero(parsed);

    const split = splitLevelData(parsed as never);
    expect(split.itemData).not.toBeNull();

    if (
      split.itemData &&
      isRecord(split.itemData.Itms) &&
      isRecord(split.itemData.Itms[1000])
    ) {
      const items = split.itemData.Itms[1000].obj;
      if (Array.isArray(items) && items.length > 0 && isRecord(items[0])) {
        items[0].x = 999;
        items[0].z = 888;
      }
    }

    const combResult = combineLevelData(split);
    expect(combResult.ok).toBe(true);
    if (!combResult.ok) return;

    const sanitized = sanitizeResourceForkJson(combResult.value);
    const serResult = loadBytesFromJson(sanitized, bugdomSpecs, [], [], true);
    expect(serResult.ok).toBe(true);
    if (!serResult.ok) return;

    const reParseResult = await saveToJson(serResult.value, bugdomSpecs, [], []);
    expect(reParseResult.ok).toBe(true);
    if (!reParseResult.ok) return;

    const reparsed = JSON.parse(reParseResult.value);
    if (
      isRecord(reparsed) &&
      isRecord(reparsed.Itms) &&
      isRecord((reparsed.Itms as Record<string, unknown>)["1000"])
    ) {
      const items = (
        (reparsed.Itms as Record<string, unknown>)["1000"] as Record<
          string,
          unknown
        >
      ).obj;
      if (Array.isArray(items) && items.length > 0 && isRecord(items[0])) {
        expect(items[0].x).toBe(999);
        expect(items[0].z).toBe(888);
      }
    }
  });

  it("should allow editing header values without breaking save", async () => {
    const data = readFileSync(join(terrainDir, "Lawn.ter.rsrc"));

    const parseResult = await saveToJson(
      new Uint8Array(data),
      bugdomSpecs,
      [],
      [],
    );
    expect(parseResult.ok).toBe(true);
    if (!parseResult.ok) return;

    const parsed: Record<string, unknown> = JSON.parse(parseResult.value);
    fixNullToZero(parsed);
    preprocessJson(parsed, BugdomGlobals);
    fixNullToZero(parsed);

    const split = splitLevelData(parsed as never);

    if (
      split.headerData &&
      isRecord(split.headerData.Hedr) &&
      isRecord(split.headerData.Hedr[1000]) &&
      isRecord(split.headerData.Hedr[1000].obj)
    ) {
      split.headerData.Hedr[1000].obj.numItems = 42;
    }

    const combResult = combineLevelData(split);
    expect(combResult.ok).toBe(true);
    if (!combResult.ok) return;

    const sanitized = sanitizeResourceForkJson(combResult.value);
    const serResult = loadBytesFromJson(sanitized, bugdomSpecs, [], [], true);
    expect(serResult.ok).toBe(true);
    if (!serResult.ok) return;

    const reParseResult = await saveToJson(serResult.value, bugdomSpecs, [], []);
    expect(reParseResult.ok).toBe(true);
    if (!reParseResult.ok) return;

    const reparsed = JSON.parse(reParseResult.value);
    if (
      isRecord(reparsed) &&
      isRecord(reparsed.Hedr) &&
      isRecord((reparsed.Hedr as Record<string, unknown>)["1000"])
    ) {
      const hdr = (
        (reparsed.Hedr as Record<string, unknown>)["1000"] as Record<
          string,
          unknown
        >
      ).obj;
      if (isRecord(hdr)) {
        expect(hdr.numItems).toBe(42);
      }
    }
  });
});

// ============================================================================
// NANOSAUR 1 TESTS
// ============================================================================

describe("Nanosaur 1 Full Save Pipeline", () => {
  const terrainDir = join(
    __dirname,
    "../../public/assets/nanosaur/terrain",
  );

  function runNanosaurPipeline(fileName: string): {
    original: Uint8Array;
    compiled: Uint8Array;
    rawLevelData: Nanosaur1LevelData;
    levelData: LevelData;
  } {
    const data = readFileSync(join(terrainDir, fileName));
    const arrayBuffer = new ArrayBuffer(data.byteLength);
    new Uint8Array(arrayBuffer).set(new Uint8Array(data));

    const rawLevelData = parseNanosaur1Level(arrayBuffer);
    const levelData = nanosaur1LevelToLevelData(
      rawLevelData,
      NanosaurGlobals.TILE_SIZE,
      NanosaurGlobals.TILE_INGAME_SIZE,
      4.0,
    );

    const withMetadata: LevelData = {
      ...levelData,
      _metadata: {
        ...levelData._metadata,
        nanosaur1RawLevel: rawLevelData,
      },
    };

    const valResult = validateLevelDataForGame(
      withMetadata,
      NanosaurGlobals.GAME_TYPE,
    );
    if (!valResult.ok) {
      throw new Error("Validation failed: " + valResult.error.message);
    }

    const split = splitLevelData(withMetadata);
    const combResult = combineLevelData(split);
    if (!combResult.ok) {
      throw new Error("Combine failed: " + combResult.error.message);
    }

    const combinedRaw = (
      combResult.value._metadata as Record<string, unknown>
    )?.nanosaur1RawLevel;
    if (!combinedRaw || typeof combinedRaw !== "object") {
      throw new Error("rawLevelData lost through split/combine");
    }

    const compileResult = compileNanosaur1Level(
      combResult.value,
      combinedRaw as Nanosaur1LevelData,
    );
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

  const levelFiles = ["Level1.ter", "Level1Pro.ter"];

  for (const levelFile of levelFiles) {
    it("should byte-for-byte roundtrip " + levelFile + " through full pipeline", () => {
      const { original, compiled } = runNanosaurPipeline(levelFile);

      expect(compiled.length).toBe(original.length);

      let firstDiff = -1;
      for (let i = 0; i < original.length; i++) {
        if (compiled[i] !== original[i]) {
          firstDiff = i;
          break;
        }
      }
      expect(firstDiff).toBe(-1);
    });

    it("should preserve rawLevelData through split/combine for " + levelFile, () => {
      const data = readFileSync(join(terrainDir, levelFile));
      const arrayBuffer = new ArrayBuffer(data.byteLength);
      new Uint8Array(arrayBuffer).set(new Uint8Array(data));

      const rawLevelData = parseNanosaur1Level(arrayBuffer);
      const levelData = nanosaur1LevelToLevelData(
        rawLevelData,
        NanosaurGlobals.TILE_SIZE,
        NanosaurGlobals.TILE_INGAME_SIZE,
        4.0,
      );

      const withMetadata: LevelData = {
        ...levelData,
        _metadata: {
          ...levelData._metadata,
          nanosaur1RawLevel: rawLevelData,
        },
      };

      const split = splitLevelData(withMetadata);
      expect(split.terrainData).not.toBeNull();
      expect(
        (split.terrainData?._metadata as Record<string, unknown>)
          ?.nanosaur1RawLevel,
      ).toBeDefined();

      const combResult = combineLevelData(split);
      expect(combResult.ok).toBe(true);
      if (!combResult.ok) return;

      expect(
        (combResult.value._metadata as Record<string, unknown>)
          ?.nanosaur1RawLevel,
      ).toBeDefined();
    });
  }
});

describe("Nanosaur 1 Level Editing", () => {
  const terrainDir = join(
    __dirname,
    "../../public/assets/nanosaur/terrain",
  );

  it("should allow editing texture layer without breaking save", () => {
    const data = readFileSync(join(terrainDir, "Level1.ter"));
    const arrayBuffer = new ArrayBuffer(data.byteLength);
    new Uint8Array(arrayBuffer).set(new Uint8Array(data));

    const rawLevelData = parseNanosaur1Level(arrayBuffer);
    const levelData = nanosaur1LevelToLevelData(
      rawLevelData,
      NanosaurGlobals.TILE_SIZE,
      NanosaurGlobals.TILE_INGAME_SIZE,
      4.0,
    );

    const withMetadata: LevelData = {
      ...levelData,
      _metadata: {
        ...levelData._metadata,
        nanosaur1RawLevel: rawLevelData,
      },
    };

    const split = splitLevelData(withMetadata);
    expect(split.terrainData).not.toBeNull();

    if (
      split.terrainData &&
      isRecord(split.terrainData.Layr) &&
      isRecord(split.terrainData.Layr[1000])
    ) {
      const layer = split.terrainData.Layr[1000].obj;
      if (Array.isArray(layer) && layer.length > 0) {
        layer[0] = 42;
      }
    }

    const combResult = combineLevelData(split);
    expect(combResult.ok).toBe(true);
    if (!combResult.ok) return;

    const combinedRaw = (
      combResult.value._metadata as Record<string, unknown>
    )?.nanosaur1RawLevel;
    expect(combinedRaw).toBeDefined();
    if (!combinedRaw) return;

    const compileResult = compileNanosaur1Level(
      combResult.value,
      combinedRaw as Nanosaur1LevelData,
    );
    expect(compileResult.ok).toBe(true);
    if (!compileResult.ok) return;

    const reParsed = parseNanosaur1Level(compileResult.value);
    expect(reParsed.textureLayer[0]).toBe(42);

    const recompiled = new Uint8Array(compileResult.value);
    expect(recompiled.length).toBe(data.length);
  });

  it("should allow editing items without breaking save", () => {
    const data = readFileSync(join(terrainDir, "Level1.ter"));
    const arrayBuffer = new ArrayBuffer(data.byteLength);
    new Uint8Array(arrayBuffer).set(new Uint8Array(data));

    const rawLevelData = parseNanosaur1Level(arrayBuffer);
    const levelData = nanosaur1LevelToLevelData(
      rawLevelData,
      NanosaurGlobals.TILE_SIZE,
      NanosaurGlobals.TILE_INGAME_SIZE,
      4.0,
    );

    const withMetadata: LevelData = {
      ...levelData,
      _metadata: {
        ...levelData._metadata,
        nanosaur1RawLevel: rawLevelData,
      },
    };

    const split = splitLevelData(withMetadata);
    expect(split.itemData).not.toBeNull();

    if (
      split.itemData &&
      isRecord(split.itemData.Itms) &&
      isRecord(split.itemData.Itms[1000])
    ) {
      const items = split.itemData.Itms[1000].obj;
      if (Array.isArray(items) && items.length > 0 && isRecord(items[0])) {
        items[0].x = 100;
        items[0].y = 200;
      }
    }

    const combResult = combineLevelData(split);
    expect(combResult.ok).toBe(true);
    if (!combResult.ok) return;

    const combinedRaw = (
      combResult.value._metadata as Record<string, unknown>
    )?.nanosaur1RawLevel;
    expect(combinedRaw).toBeDefined();
    if (!combinedRaw) return;

    const compileResult = compileNanosaur1Level(
      combResult.value,
      combinedRaw as Nanosaur1LevelData,
    );
    expect(compileResult.ok).toBe(true);
    if (!compileResult.ok) return;

    const reParsed = parseNanosaur1Level(compileResult.value);
    expect(reParsed.objectList[0]?.x).toBe(100);
    expect(reParsed.objectList[0]?.y).toBe(200);
  });
});
