import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import {
  OttoGlobals,
  Bugdom2Globals,
  BugdomGlobals,
  NanosaurGlobals,
  Nanosaur2Globals,
  CroMagGlobals,
  BillyFrontierGlobals,
  GlobalsInterface,
} from "@/data/globals/globals";
import { testEditRoundtrip, parseLevelData } from "./testUtils";
import {
  generateRandomMoveOperations,
  generateExhaustiveItemOperations,
  generateTerrainHeightOperations,
} from "./operationGenerators";

interface GameTestConfig {
  name: string;
  globals: GlobalsInterface;
  testFile: string;
}

const GAMES: GameTestConfig[] = [
  {
    name: "Otto Matic",
    globals: OttoGlobals,
    testFile: "games/ottomatic/Data/Terrain/Level1_Farm.ter.rsrc"
  },
  {
    name: "Bugdom 2",
    globals: Bugdom2Globals,
    testFile: "games/bugdom2/Data/Terrain/Level1.ter.rsrc"
  },
  {
    name: "Bugdom",
    globals: BugdomGlobals,
    testFile: "games/bugdom/Data/Terrain/lawn.ter"
  },
  {
    name: "Nanosaur 2",
    globals: Nanosaur2Globals,
    testFile: "games/nanosaur2/Data/Terrain/Level1.ter.rsrc"
  },
  {
    name: "Cro-Mag Rally",
    globals: CroMagGlobals,
    testFile: "games/cromagrally/Data/Terrain/Track1.ter.rsrc"
  },
  {
    name: "Billy Frontier",
    globals: BillyFrontierGlobals,
    testFile: "games/billyfrontier/Data/Terrain/Level1.ter.rsrc"
  },
];

describe("Edit Roundtrip Tests", () => {
  for (const game of GAMES) {
    describe(game.name, () => {
      // Adjust path relative to this test file location: frontend/tests/levelEdit/
      const filePath = join(__dirname, "../../../", game.testFile);

      if (!existsSync(filePath)) {
        it.skip(`should have test file: ${game.testFile}`, () => {});
        return;
      }

      const originalBytes = new Uint8Array(readFileSync(filePath));

      it("should roundtrip with no edits", async () => {
        const result = await testEditRoundtrip(originalBytes, game.globals, []);
        expect(result.success, result.message).toBe(true);
      }, 30000);

      it("should roundtrip with random item moves", async () => {
        const levelData = await parseLevelData(originalBytes, game.globals);
        const operations = generateRandomMoveOperations(levelData, 10);

        const result = await testEditRoundtrip(originalBytes, game.globals, operations);
        expect(result.success, result.message).toBe(true);
      }, 30000);

      it("should roundtrip with exhaustive item edits", async () => {
        const levelData = await parseLevelData(originalBytes, game.globals);
        const operations = generateExhaustiveItemOperations(levelData);

        const result = await testEditRoundtrip(originalBytes, game.globals, operations);
        expect(result.success, result.message).toBe(true);
      }, 60000);

      it("should roundtrip with terrain height changes", async () => {
        const levelData = await parseLevelData(originalBytes, game.globals);
        const operations = generateTerrainHeightOperations(levelData, 50);

        const result = await testEditRoundtrip(originalBytes, game.globals, operations);
        expect(result.success, result.message).toBe(true);
      }, 30000);

      it("should roundtrip with mixed operations", async () => {
        const levelData = await parseLevelData(originalBytes, game.globals);
        const operations = [
          ...generateRandomMoveOperations(levelData, 5),
          ...generateTerrainHeightOperations(levelData, 10),
        ];

        const result = await testEditRoundtrip(originalBytes, game.globals, operations);
        expect(result.success, result.message).toBe(true);
      }, 30000);
    });
  }
});
