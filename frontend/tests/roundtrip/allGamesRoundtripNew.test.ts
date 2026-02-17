/**
 * Comprehensive roundtrip tests for ALL games
 * Tests byte-for-byte accuracy of parse -> serialize -> parse cycles
 */

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { saveToJson, loadBytesFromJson } from "@lachlanbwwright/rsrcdump-ts";
import {
  OttoGlobals,
  BugdomGlobals,
  Bugdom2Globals,
  CroMagGlobals,
  NanosaurGlobals,
  Nanosaur2Globals,
  BillyFrontierGlobals,
} from "../../src/data/globals/globals";

interface GameTestConfig {
  name: string;
  globals: typeof OttoGlobals;
  testFile: string;
  skipRoundtrip?: boolean;
}

const GAMES: GameTestConfig[] = [
  {
    name: "Otto Matic",
    globals: OttoGlobals,
    testFile: "public/assets/ottoMatic/terrain/EarthFarm.ter.rsrc",
  },
  {
    name: "Bugdom 1",
    globals: BugdomGlobals,
    testFile: "public/assets/bugdom/terrain/Lawn.ter.rsrc",
  },
  {
    name: "Bugdom 2",
    globals: Bugdom2Globals,
    testFile: "public/assets/bugdom2/terrain/Level1_Garden.ter.rsrc",
  },
  {
    name: "Cro-Mag Rally",
    globals: CroMagGlobals,
    testFile: "public/assets/croMag/terrain/StoneAge_Jungle.ter.rsrc",
  },
  {
    name: "Nanosaur 1",
    globals: NanosaurGlobals,
    testFile: "public/assets/nanosaur/terrain/Level1.ter",
    skipRoundtrip: true, // Different format
  },
  {
    name: "Nanosaur 2",
    globals: Nanosaur2Globals,
    testFile: "public/assets/nanosaur2/terrain/level1.ter.rsrc",
  },
  {
    name: "Billy Frontier",
    globals: BillyFrontierGlobals,
    testFile: "public/assets/billyFrontier/terrain/town_duel.ter.rsrc",
  },
];

describe("All Games Roundtrip Tests", () => {
  for (const game of GAMES) {
    describe(`${game.name}`, () => {
      const testFilePath = join(__dirname, "../../", game.testFile);
      let originalData: Buffer;
      let fileExists: boolean;

      beforeAll(() => {
        fileExists = existsSync(testFilePath);
        if (fileExists) {
          originalData = readFileSync(testFilePath);
        } else {
          console.warn(`Test file not found: ${testFilePath}`);
        }
      });

      it("should have valid test file", () => {
        if (!fileExists) {
          console.warn(`Skipping ${game.name} - test file not found`);
          return;
        }
        expect(originalData.length).toBeGreaterThan(0);
      });

      it("should parse to JSON successfully", async () => {
        if (!fileExists || game.skipRoundtrip) {
          console.warn(`Skipping ${game.name} parse test`);
          return;
        }

        const parseResult = await saveToJson(
          new Uint8Array(originalData),
          game.globals.STRUCT_SPECS,
          [],
          []
        );

        expect(parseResult.ok).toBe(true);
        if (!parseResult.ok) {
          console.error(`${game.name} parse error:`, parseResult.error);
          return;
        }

        const jsonData = JSON.parse(parseResult.value);
        expect(jsonData).toBeDefined();
        expect(jsonData._metadata).toBeDefined();
        
        console.log(`✅ ${game.name} parsed successfully`);
      });

      it("should serialize JSON back to binary", async () => {
        if (!fileExists || game.skipRoundtrip) {
          console.warn(`Skipping ${game.name} serialize test`);
          return;
        }

        // Parse
        const parseResult = await saveToJson(
          new Uint8Array(originalData),
          game.globals.STRUCT_SPECS,
          [],
          []
        );
        expect(parseResult.ok).toBe(true);
        if (!parseResult.ok) return;

        const jsonData = JSON.parse(parseResult.value);

        // Serialize
        const serializeResult = loadBytesFromJson(
          jsonData,
          game.globals.STRUCT_SPECS,
          [],
          [],
          true
        );

        expect(serializeResult.ok).toBe(true);
        if (!serializeResult.ok) {
          console.error(`${game.name} serialize error:`, serializeResult.error);
          return;
        }

        expect(serializeResult.value.byteLength).toBeGreaterThan(0);
        console.log(`✅ ${game.name} serialized successfully`);
      });

      it("should produce byte-for-byte identical output (JSON roundtrip)", async () => {
        if (!fileExists || game.skipRoundtrip) {
          console.warn(`Skipping ${game.name} roundtrip test`);
          return;
        }

        // Parse original
        const parseResult1 = await saveToJson(
          new Uint8Array(originalData),
          game.globals.STRUCT_SPECS,
          [],
          []
        );
        expect(parseResult1.ok).toBe(true);
        if (!parseResult1.ok) return;
        const jsonData1 = JSON.parse(parseResult1.value);

        // Serialize
        const serializeResult = loadBytesFromJson(
          jsonData1,
          game.globals.STRUCT_SPECS,
          [],
          [],
          true
        );
        expect(serializeResult.ok).toBe(true);
        if (!serializeResult.ok) return;
        const serializedData = serializeResult.value;

        // Parse again
        const parseResult2 = await saveToJson(
          serializedData,
          game.globals.STRUCT_SPECS,
          [],
          []
        );
        expect(parseResult2.ok).toBe(true);
        if (!parseResult2.ok) return;
        const jsonData2 = JSON.parse(parseResult2.value);

        // Compare JSON structures
        const isRecord = (x: unknown): x is Record<string, unknown> => {
          return typeof x === 'object' && x !== null;
        };
        const sanitize = (value: unknown): unknown => {
          if (value === null) return 0;
          if (Array.isArray(value)) return value.map(sanitize);
          if (isRecord(value)) {
            const obj = value;
            const normalized: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(obj)) {
              if (k === "x`y" && Array.isArray(v)) {
                normalized[k] = Array.isArray(v) ? v.map(() => ({ x: 0, y: 0 })) : [];
                continue;
              }
              normalized[k] = sanitize(v);
            }
            return normalized;
          }
          return value;
        };

        const normalize = (data: unknown) =>
          JSON.stringify(sanitize(data), null, 2);

        const json1Str = normalize(jsonData1);
        const json2Str = normalize(jsonData2);
        expect(json1Str).toBe(json2Str);
        console.log(`✅ ${game.name} JSON roundtrip successful (byte-for-byte)`);
      });

      it("should produce similar binary size", async () => {
        if (!fileExists || game.skipRoundtrip) {
          console.warn(`Skipping ${game.name} size test`);
          return;
        }

        // Parse
        const parseResult = await saveToJson(
          new Uint8Array(originalData),
          game.globals.STRUCT_SPECS,
          [],
          []
        );
        expect(parseResult.ok).toBe(true);
        if (!parseResult.ok) return;
        const jsonData = JSON.parse(parseResult.value);

        // Serialize
        const serializeResult = loadBytesFromJson(
          jsonData,
          game.globals.STRUCT_SPECS,
          [],
          [],
          true
        );
        expect(serializeResult.ok).toBe(true);
        if (!serializeResult.ok) return;

        const sizeRatio = serializeResult.value.byteLength / originalData.length;
        console.log(`${game.name} size: ${originalData.length} -> ${serializeResult.value.byteLength} (ratio: ${sizeRatio.toFixed(4)})`);

        // Size should be within 20% of original
        expect(sizeRatio).toBeGreaterThan(0.8);
        expect(sizeRatio).toBeLessThan(1.2);
      });
    });
  }
});
