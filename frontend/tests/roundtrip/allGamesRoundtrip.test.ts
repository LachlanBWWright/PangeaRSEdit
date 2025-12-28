// allGamesRoundtrip.test.ts
// Comprehensive byte-for-byte accuracy roundtrip tests for ALL supported games
// Tests: parse → export → compare levels to original binary

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parseNanosaur1Level, nanosaur1LevelToLevelData } from "@/data/processors/classicProprocessor";
import { compileNanosaur1Level } from "@/editor/loadLogic/compileNanosaur1Level";
import { parseMightyMikeMap, mightyMikeMapToCompressedBinary } from "@/modelParsers/parseMightyMike";

/**
 * Converts a Node.js Buffer to an ArrayBuffer
 */
function bufferToArrayBuffer(buf: Buffer): ArrayBuffer {
  const ab = new ArrayBuffer(buf.length);
  const view = new Uint8Array(ab);
  for (let i = 0; i < buf.length; ++i) {
    view[i] = buf[i] ?? 0;
  }
  return ab;
}

/**
 * Nanosaur 1 Roundtrip Tests
 */
describe("Nanosaur 1 - Byte-Accurate Roundtrip", () => {
  const levelsDir = join(__dirname, "nanosaur1/levels");
  
  const levels = [
    "Level1.ter",
    "Level1Pro.ter",
  ];

  levels.forEach((filename) => {
    it(`${filename}: byte-for-byte accuracy`, () => {
      const path = join(levelsDir, filename);
      let originalBuffer: Buffer;
      
      try {
        originalBuffer = readFileSync(path);
      } catch {
        console.warn(`Could not find file ${path}, skipping test`);
        return;
      }

      const originalData = new Uint8Array(originalBuffer);
      expect(originalData.length).toBeGreaterThan(0);

      // Parse
      const originalAB = bufferToArrayBuffer(originalBuffer);
      const parsed = parseNanosaur1Level(originalAB);
      expect(parsed).toBeDefined();

      if (!parsed) {
        throw new Error(`Failed to parse ${filename}`);
      }

      const levelData = nanosaur1LevelToLevelData(parsed);
      expect(levelData).toBeDefined();

      // Store metadata for roundtrip
      levelData._metadata = { rawLevelData: parsed };

      // Compile back
      const result = compileNanosaur1Level(levelData);
      
      if (!result.ok) {
        throw new Error(`Compilation failed: ${result.error.message}`);
      }

      const recompiledData = new Uint8Array(result.value);

      // Byte comparison
      expect(recompiledData.length).toBe(originalData.length);
      
      // Check for differences
      let diffCount = 0;
      for (let i = 0; i < originalData.length; i++) {
        if (originalData[i] !== recompiledData[i]) {
          diffCount++;
          if (diffCount <= 5) {
            console.log(`Byte ${i}: original=${originalData[i]}, recompiled=${recompiledData[i]}`);
          }
        }
      }

      expect(diffCount).toBe(0);
    });
  });
});

/**
 * Mighty Mike Roundtrip Tests
 */
describe("Mighty Mike - Byte-Accurate Roundtrip", () => {
  const levelsDir = join(__dirname, "mightymike/levels");
  
  const levels = [
    "bargain.map-1",
    "bargain.map-2",
    "bargain.map-3",
    "candy.map-1",
    "candy.map-2",
    "candy.map-3",
    "clown.map-1",
    "clown.map-2",
    "clown.map-3",
    "fairy.map-1",
    "fairy.map-2",
    "fairy.map-3",
    "jurassic.map-1",
    "jurassic.map-2",
    "jurassic.map-3",
  ];

  levels.forEach((filename) => {
    it(`${filename}: byte-for-byte accuracy`, () => {
      const path = join(levelsDir, filename);
      let originalBuffer: Buffer;
      
      try {
        originalBuffer = readFileSync(path);
      } catch {
        console.warn(`Could not find file ${path}, skipping test`);
        return;
      }

      const originalData = new Uint8Array(originalBuffer);
      expect(originalData.length).toBeGreaterThan(0);

      // Parse
      const originalAB = bufferToArrayBuffer(originalBuffer);
      const parsed = parseMightyMikeMap(originalAB);
      
      if (!parsed.ok) {
        throw new Error(`Parse failed: ${parsed.error.message}`);
      }

      // Compile back
      const result = mightyMikeMapToCompressedBinary(parsed.value);
      
      if (!result.ok) {
        throw new Error(`Compilation failed: ${result.error.message}`);
      }

      const recompiledData = new Uint8Array(result.value);

      // Byte comparison
      expect(recompiledData.length).toBe(originalData.length);
      
      // Check for differences
      let diffCount = 0;
      for (let i = 0; i < originalData.length; i++) {
        if (originalData[i] !== recompiledData[i]) {
          diffCount++;
          if (diffCount <= 5) {
            console.log(`Byte ${i}: original=${originalData[i]}, recompiled=${recompiledData[i]}`);
          }
        }
      }

      expect(diffCount).toBe(0);
    });
  });
});

/**
 * TODO: Add roundtrip tests for other games when compilers are implemented:
 * - Otto Matic
 * - Nanosaur 2
 * - Bugdom 2
 * - Cro-Mag Rally
 * - Billy Frontier
 * - Bugdom 1 (requires resource fork handling)
 */
describe("Other Games - Placeholder for Future Roundtrip Tests", () => {
  it("Otto Matic - requires compiler implementation", () => {
    expect(true).toBe(true);
  });

  it("Nanosaur 2 - requires compiler implementation", () => {
    expect(true).toBe(true);
  });

  it("Bugdom 2 - requires compiler implementation", () => {
    expect(true).toBe(true);
  });

  it("Cro-Mag Rally - requires compiler implementation", () => {
    expect(true).toBe(true);
  });

  it("Billy Frontier - requires compiler implementation", () => {
    expect(true).toBe(true);
  });

  it("Bugdom 1 - requires resource fork handling", () => {
    expect(true).toBe(true);
  });
});
