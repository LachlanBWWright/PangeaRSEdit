/**
 * Validation tests for ALL games
 * Ensures that parsed level data passes Zod schema validation without errors
 * 
 * This test specifically verifies that the nullToZero fix correctly handles
 * rsrcdump-ts v1.0.4's bug where it returns null for numeric zero values
 */

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import { saveToJson } from "@lachlanbwwright/rsrcdump-ts";
import {
  OttoGlobals,
  BugdomGlobals,
  Bugdom2Globals,
  CroMagGlobals,
  Nanosaur2Globals,
  BillyFrontierGlobals,
} from "../../src/data/globals/globals";
import { fixNullToZero } from "../../src/data/processors/nullToZeroFixer";
import { preprocessJson } from "../../src/data/processors/ottoPreprocessor";
import { validateLevelDataForGame } from "../../src/validation/validateLevelForGame";

interface GameConfig {
  name: string;
  globals: typeof OttoGlobals;
  terrainPath: string;
}

const GAMES: GameConfig[] = [
  {
    name: "Otto Matic",
    globals: OttoGlobals,
    terrainPath: "public/assets/ottoMatic/terrain",
  },
  {
    name: "Bugdom 1",
    globals: BugdomGlobals,
    terrainPath: "public/assets/bugdom/terrain",
  },
  {
    name: "Bugdom 2",
    globals: Bugdom2Globals,
    terrainPath: "public/assets/bugdom2/terrain",
  },
  {
    name: "Cro-Mag Rally",
    globals: CroMagGlobals,
    terrainPath: "public/assets/croMag/terrain",
  },
  {
    name: "Nanosaur 2",
    globals: Nanosaur2Globals,
    terrainPath: "public/assets/nanosaur2/terrain",
  },
  {
    name: "Billy Frontier",
    globals: BillyFrontierGlobals,
    terrainPath: "public/assets/billyFrontier/terrain",
  },
];

describe("All Games Validation Tests", () => {
  for (const game of GAMES) {
    describe(`${game.name}`, () => {
      const terrainDir = join(__dirname, "../../", game.terrainPath);
      let terrainFiles: string[] = [];

      beforeAll(() => {
        if (existsSync(terrainDir)) {
          terrainFiles = readdirSync(terrainDir)
            .filter((f) => f.endsWith(".ter.rsrc"))
            .slice(0, 3); // Test first 3 levels per game for speed
        }
      });

      it("should have terrain files available", () => {
        expect(existsSync(terrainDir)).toBe(true);
        expect(terrainFiles.length).toBeGreaterThan(0);
      });

      for (let i = 0; i < 3; i++) {
        it(`should parse and validate level ${i + 1} without errors`, async () => {
          if (i >= terrainFiles.length) {
            console.warn(`Skipping ${game.name} level ${i + 1} - file not found`);
            return;
          }

          const fileName = terrainFiles[i];
          if (!fileName) {
            console.warn(`Skipping ${game.name} level ${i + 1} - file not found`);
            return;
          }
          const filePath = join(terrainDir, fileName);
          const fileData = readFileSync(filePath);

          // Parse with rsrcdump-ts
          const parseResult = await saveToJson(
            new Uint8Array(fileData),
            game.globals.STRUCT_SPECS,
            [],
            []
          );

          expect(parseResult.ok).toBe(true);
          if (!parseResult.ok) {
            console.error(`${game.name} ${fileName} parse error:`, parseResult.error);
            return;
          }

          function assertIsRecord(x: unknown): asserts x is Record<string, unknown> {
            if (typeof x !== "object" || x === null) {
              expect.fail(`${fileName} parseResult did not return an object`);
            }
          }

          const parsedUnknown: unknown = JSON.parse(parseResult.value);
          assertIsRecord(parsedUnknown);
          const parsed = parsedUnknown;

          // Apply nullToZero fix BEFORE preprocessing (fixes rsrcdump-ts v1.0.5 bug)
          fixNullToZero(parsed);

          // Apply preprocessing
          const preprocessResult = preprocessJson(parsed, game.globals);
          expect(preprocessResult.isOk()).toBe(true);
          if (preprocessResult.isErr()) {
            console.error(
              `${game.name} ${fileName} preprocess error:`,
              preprocessResult.error,
            );
            return;
          }

          // Apply nullToZero fix AFTER preprocessing (preprocessing creates arrays with undefined elements)
          fixNullToZero(parsed);

          // Validate against Zod schema
          const validationResult = validateLevelDataForGame(
            parsed,
            game.globals.GAME_TYPE
          );

          if (validationResult.isErr()) {
            console.error(`${game.name} ${fileName} validation errors:`);
            console.error(validationResult.error);
            
            // Log first few errors for debugging
            const errorLines = validationResult.error.split('\n').slice(0, 20);
            console.error('First 20 validation errors:', errorLines.join('\n'));
          }

          expect(validationResult.isOk()).toBe(true);
          console.log(`✅ ${game.name} ${fileName} passed validation`);
        });
      }
    });
  }
});
