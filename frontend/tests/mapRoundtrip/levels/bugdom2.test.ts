/**
 * Bugdom 2 Level Roundtrip Tests
 *
 * Tests byte-for-byte roundtrip accuracy for all Bugdom 2 terrain files.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  saveToJsonObject,
  loadFromJson,
  saveToBytes,
} from "../../../src/rsrcdump-ts/rsrcdump";
import { bugdom2Specs } from "../../../src/python/structSpecs/bugdom2";

describe("Bugdom 2 Level Roundtrip", () => {
  const terrainDir = join(
    __dirname,
    "../../../../public/assets/bugdom2/terrain",
  );
  const levelFiles = [
    "Level1_Garden.ter.rsrc",
    "Level2_SideWalk.ter.rsrc",
    "Level3_DogHair.ter.rsrc",
    "Level5_Playroom.ter.rsrc",
    "Level6_Closet.ter.rsrc",
    "Level8_Garbage.ter.rsrc",
    "Level9_Balsa.ter.rsrc",
    "Level10_Park.ter.rsrc",
    "Title.ter.rsrc",
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

    it(`should parse ${levelFile} to JSON with bugdom2 specs`, () => {
      const filePath = join(terrainDir, levelFile);
      const originalData = readFileSync(filePath);

      // Parse with specs (structured data)
      const jsonResult = saveToJsonObject(
        originalData,
        bugdom2Specs,
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
