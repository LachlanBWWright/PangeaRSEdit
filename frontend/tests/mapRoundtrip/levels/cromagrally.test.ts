/**
 * Cro-Mag Rally Level Roundtrip Tests
 *
 * Tests byte-for-byte roundtrip accuracy for all Cro-Mag Rally terrain files.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  load,
  saveToJsonObject,
  loadFromJson,
  saveToBytes,
} from "../../../src/rsrcdump-ts/rsrcdump";
import { croMagSpecs } from "../../../src/python/structSpecs/croMag";

describe("Cro-Mag Rally Level Roundtrip", () => {
  const terrainDir = join(
    __dirname,
    "../../../../public/assets/croMag/terrain",
  );
  const levelFiles = [
    "Battle_Aztec.ter.rsrc",
    "Battle_Celtic.ter.rsrc",
    "Battle_Coliseum.ter.rsrc",
    "Battle_Maze.ter.rsrc",
    "Battle_Ramps.ter.rsrc",
    "Battle_Spiral.ter.rsrc",
    "Battle_StoneHenge.ter.rsrc",
    "Battle_TarPits.ter.rsrc",
    "BronzeAge_China.ter.rsrc",
    "BronzeAge_Crete.ter.rsrc",
    "BronzeAge_Egypt.ter.rsrc",
    "IronAge_Atlantis.ter.rsrc",
    "IronAge_Europe.ter.rsrc",
    "IronAge_Scandinavia.ter.rsrc",
    "StoneAge_Desert.ter.rsrc",
    "StoneAge_Ice.ter.rsrc",
    "StoneAge_Jungle.ter.rsrc",
  ];

  for (const levelFile of levelFiles) {
    it(`should roundtrip ${levelFile} byte-for-byte`, () => {
      const filePath = join(terrainDir, levelFile);
      const originalData = readFileSync(filePath);

      // Parse to JSON (hex data only for byte accuracy)
      const jsonResult = saveToJsonObject(originalData, [], [], [], false);
      expect(jsonResult.ok).toBe(true);
      if (!jsonResult.ok) {
        console.error(`Failed to parse ${levelFile}:`, jsonResult.error);
        return;
      }
      const jsonData = jsonResult.value;

      // Serialize back to binary
      const forkResult = loadFromJson(jsonData, [], false);
      expect(forkResult.ok).toBe(true);
      if (!forkResult.ok) {
        console.error(
          `Failed to load from JSON ${levelFile}:`,
          forkResult.error,
        );
        return;
      }
      const fork = forkResult.value;
      const roundtripData = saveToBytes(fork);

      // Compare byte-for-byte
      expect(roundtripData.length).toBe(originalData.length);

      let firstDiff = -1;
      for (let i = 0; i < originalData.length; i++) {
        if (roundtripData[i] !== originalData[i]) {
          firstDiff = i;
          break;
        }
      }

      if (firstDiff !== -1) {
        console.error(
          `Byte difference in ${levelFile} at offset ${firstDiff}: original=${originalData[firstDiff]}, roundtrip=${roundtripData[firstDiff]}`,
        );
      }

      expect(firstDiff).toBe(-1); // No differences
    });

    it(`should parse ${levelFile} to JSON with croMag specs`, () => {
      const filePath = join(terrainDir, levelFile);
      const originalData = readFileSync(filePath);

      // Parse with specs (structured data)
      const jsonResult = saveToJsonObject(
        originalData,
        croMagSpecs,
        [],
        [],
        true,
      );
      expect(jsonResult.ok).toBe(true);
      if (!jsonResult.ok) {
        console.error(
          `Failed to parse ${levelFile} with specs:`,
          jsonResult.error,
        );
        return;
      }

      const jsonData = jsonResult.value;
      expect(jsonData).toBeDefined();
      expect(jsonData.Hedr).toBeDefined();
    });
  }
});
