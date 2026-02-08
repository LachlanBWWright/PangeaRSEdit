/**
 * Bugdom 1 & Nanosaur 1 Full Pipeline Parsing Tests
 *
 * Tests the complete parse → editor format → serialize roundtrip for both games.
 * Validates byte-perfect accuracy where applicable.
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
import { splitLevelData, combineLevelData } from "../../src/data/utils/levelDataUtils";
import {
  parseNanosaur1Level,
  nanosaur1LevelToLevelData,
} from "../../src/data/processors/classicProprocessor";
import { compileNanosaur1Level } from "../../src/editor/loadLogic/compileNanosaur1Level";

// Type guard helper
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

describe("Bugdom 1 Full Pipeline", () => {
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

  for (const levelFile of levelFiles) {
    it(`should parse ${levelFile} through full editor pipeline`, async () => {
      const filePath = join(terrainDir, levelFile);
      const data = readFileSync(filePath);

      // Step 1: Parse with rsrcdump-ts + bugdom specs
      const parseResult = await saveToJson(
        new Uint8Array(data),
        bugdomSpecs,
        [],
        [],
      );
      expect(parseResult.ok, `Parse failed for ${levelFile}`).toBe(true);
      if (!parseResult.ok) return;

      const parsed: Record<string, unknown> = JSON.parse(parseResult.value);

      // Step 2: Fix null values
      fixNullToZero(parsed);

      // Step 3: Preprocess
      const preprocessResult = preprocessJson(parsed, BugdomGlobals);
      expect(
        preprocessResult.ok,
        `Preprocess failed for ${levelFile}: ${!preprocessResult.ok ? preprocessResult.error.message : ""}`,
      ).toBe(true);

      // Step 4: Fix null again after preprocessing
      fixNullToZero(parsed);

      // Step 5: Validate
      const validationResult = validateLevelDataForGame(
        parsed,
        BugdomGlobals.GAME_TYPE,
      );
      expect(
        validationResult.ok,
        `Validation failed for ${levelFile}: ${!validationResult.ok ? validationResult.error.message : ""}`,
      ).toBe(true);

      // Step 6: Split into atomic data (editor format)
      const splitResult = splitLevelData(parsed as never);
      expect(
        splitResult.terrainData,
        `terrainData null for ${levelFile}`,
      ).not.toBeNull();
      expect(
        splitResult.headerData,
        `headerData null for ${levelFile}`,
      ).not.toBeNull();
    });

    it(`should roundtrip ${levelFile} through serialize pipeline`, async () => {
      const filePath = join(terrainDir, levelFile);
      const data = readFileSync(filePath);

      // Parse
      const parseResult = await saveToJson(
        new Uint8Array(data),
        bugdomSpecs,
        [],
        [],
      );
      expect(parseResult.ok).toBe(true);
      if (!parseResult.ok) return;

      const parsed = JSON.parse(parseResult.value);

      // Serialize back
      const serializeResult = loadBytesFromJson(
        parsed,
        bugdomSpecs,
        [],
        [],
        true,
      );
      expect(serializeResult.ok).toBe(true);
      if (!serializeResult.ok) return;

      // Size should be within 44 bytes (known resource fork header discrepancy)
      const sizeDiff = Math.abs(
        serializeResult.value.length - data.length,
      );
      expect(sizeDiff).toBeLessThanOrEqual(44);
    });
  }
});

describe("Nanosaur 1 Full Pipeline", () => {
  const levelFiles = [
    { name: "Level1.ter", path: "Level1.ter" },
    { name: "Level1Pro.ter", path: "Level1Pro.ter" },
  ];

  for (const { name, path: levelPath } of levelFiles) {
    it(`should parse ${name} through full editor pipeline`, () => {
      const filePath = join(
        __dirname,
        "../../public/assets/nanosaur/terrain",
        levelPath,
      );
      const data = readFileSync(filePath);

      const arrayBuffer = new ArrayBuffer(data.byteLength);
      new Uint8Array(arrayBuffer).set(new Uint8Array(data));

      // Step 1: Parse binary format
      const rawLevelData = parseNanosaur1Level(arrayBuffer);
      expect(rawLevelData.header.width).toBeGreaterThan(0);
      expect(rawLevelData.header.depth).toBeGreaterThan(0);

      // Step 2: Convert to editor format
      const levelData = nanosaur1LevelToLevelData(
        rawLevelData,
        NanosaurGlobals.TILE_SIZE,
        NanosaurGlobals.TILE_INGAME_SIZE,
        4.0,
      );
      expect(levelData.Hedr[1000].obj.mapWidth).toBe(rawLevelData.header.width);

      // Step 3: Validate
      const validationResult = validateLevelDataForGame(
        levelData,
        NanosaurGlobals.GAME_TYPE,
      );
      expect(
        validationResult.ok,
        `Validation failed for ${name}: ${!validationResult.ok ? validationResult.error.message : ""}`,
      ).toBe(true);

      // Step 4: Split into atomic data
      const splitResult = splitLevelData(levelData);
      expect(splitResult.terrainData).not.toBeNull();
      expect(splitResult.headerData).not.toBeNull();
    });

    it(`should byte-for-byte roundtrip ${name}`, () => {
      const filePath = join(
        __dirname,
        "../../public/assets/nanosaur/terrain",
        levelPath,
      );
      const data = readFileSync(filePath);

      const arrayBuffer = new ArrayBuffer(data.byteLength);
      new Uint8Array(arrayBuffer).set(new Uint8Array(data));

      // Parse
      const rawLevelData = parseNanosaur1Level(arrayBuffer);
      const levelData = nanosaur1LevelToLevelData(
        rawLevelData,
        NanosaurGlobals.TILE_SIZE,
        NanosaurGlobals.TILE_INGAME_SIZE,
        4.0,
      );

      // Compile back
      const compileResult = compileNanosaur1Level(levelData, rawLevelData);
      expect(compileResult.ok).toBe(true);
      if (!compileResult.ok) return;

      // Compare
      const compiled = new Uint8Array(compileResult.value);
      const original = new Uint8Array(arrayBuffer);
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

    it(`should preserve rawLevelData through split/combine for ${name}`, () => {
      const filePath = join(
        __dirname,
        "../../public/assets/nanosaur/terrain",
        levelPath,
      );
      const data = readFileSync(filePath);

      const arrayBuffer = new ArrayBuffer(data.byteLength);
      new Uint8Array(arrayBuffer).set(new Uint8Array(data));

      const rawLevelData = parseNanosaur1Level(arrayBuffer);
      const levelData = nanosaur1LevelToLevelData(
        rawLevelData,
        NanosaurGlobals.TILE_SIZE,
        NanosaurGlobals.TILE_INGAME_SIZE,
        4.0,
      );

      // Simulate parseNanosaurLevelFile metadata attachment
      const withMetadata = {
        ...levelData,
        _metadata: {
          file_attributes: 0,
          junk1: 0,
          junk2: 0,
          nanosaur1RawLevel: rawLevelData,
        },
      };

      // Split
      const splitResult = splitLevelData(withMetadata as never);
      expect(splitResult.terrainData).not.toBeNull();
      expect(splitResult.terrainData?._metadata?.nanosaur1RawLevel).toBeDefined();

      // Combine
      const combineResult = combineLevelData(splitResult);
      expect(combineResult.ok).toBe(true);
      if (!combineResult.ok) return;

      // Verify rawLevelData survives
      const combined = combineResult.value;
      expect(combined._metadata?.nanosaur1RawLevel).toBeDefined();

      // Use the rawLevelData from combined data to compile
      const rawFromMetadata = combined._metadata.nanosaur1RawLevel;
      expect(rawFromMetadata).toBeDefined();
      expect(isRecord(rawFromMetadata)).toBe(true);

      if (
        isRecord(rawFromMetadata) &&
        "header" in rawFromMetadata &&
        "textureLayer" in rawFromMetadata &&
        "objectList" in rawFromMetadata
      ) {
        const compileResult = compileNanosaur1Level(
          combined,
          rawFromMetadata as never,
        );
        expect(compileResult.ok).toBe(true);
        if (!compileResult.ok) return;

        const compiled = new Uint8Array(compileResult.value);
        const original = new Uint8Array(arrayBuffer);
        expect(compiled.length).toBe(original.length);
      }
    });
  }
});
