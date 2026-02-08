/**
 * Nanosaur 1 Binary Roundtrip Tests
 *
 * Tests byte-for-byte roundtrip accuracy: parse .ter → compile back → compare.
 * This validates parseNanosaur1Level + compileNanosaur1Level together.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  parseNanosaur1Level,
  nanosaur1LevelToLevelData,
} from "../../src/data/processors/classicProprocessor";
import { compileNanosaur1Level } from "../../src/editor/loadLogic/compileNanosaur1Level";

describe("Nanosaur 1 Binary Roundtrip", () => {
  const terrainDir = join(
    __dirname,
    "../../public/assets/nanosaur/terrain",
  );
  const levelFiles = ["Level1.ter", "Level1Pro.ter"];

  for (const levelFile of levelFiles) {
    it(`should roundtrip ${levelFile} byte-for-byte`, () => {
      const filePath = join(terrainDir, levelFile);
      const originalBuffer = readFileSync(filePath);
      const originalData = new Uint8Array(originalBuffer);

      // Parse the binary .ter file
      const rawLevelData = parseNanosaur1Level(originalData.buffer);

      // Convert to LevelData (editor format)
      const levelData = nanosaur1LevelToLevelData(rawLevelData, 32, 140, 4.0);

      // Compile back to binary
      const compileResult = compileNanosaur1Level(levelData, rawLevelData);
      expect(compileResult.ok).toBe(true);
      if (!compileResult.ok) return;

      const roundtripData = new Uint8Array(compileResult.value);

      // Compare sizes
      expect(roundtripData.length).toBe(originalData.length);

      // Compare byte-for-byte
      let firstDiff = -1;
      for (let i = 0; i < originalData.length; i++) {
        if (roundtripData[i] !== originalData[i]) {
          firstDiff = i;
          break;
        }
      }

      if (firstDiff !== -1) {
        console.error(
          `Byte difference in ${levelFile} at offset ${firstDiff}: ` +
          `original=0x${originalData[firstDiff]?.toString(16)}, ` +
          `roundtrip=0x${roundtripData[firstDiff]?.toString(16)}`,
        );
      }

      expect(firstDiff).toBe(-1);
    });
  }
});
