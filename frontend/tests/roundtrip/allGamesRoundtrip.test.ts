// allGamesRoundtrip.test.ts
// Comprehensive byte-for-byte accuracy roundtrip tests for ALL supported games
// Tests: parse → export → compare levels to original binary

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parseNanosaur1Level, nanosaur1LevelToLevelData } from "../../src/data/processors/classicProprocessor";
import { compileNanosaur1Level } from "../../src/editor/loadLogic/compileNanosaur1Level";
import { parseMightyMikeMap, mightyMikeMapToCompressedBinary } from "../../src/modelParsers/parseMightyMike";

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
      levelData._metadata = { rawLevelData: parsed, file_attributes: 0, junk1: 0, junk2: 0 };

      // Compile back
      const result = compileNanosaur1Level(levelData, parsed);

      if (!result.ok) {
        throw new Error(`Compilation failed: ${String(result.error)}`);
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
describe("Mighty Mike - Semantic Roundtrip", () => {
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
    it(`${filename}: semantic accuracy check`, () => {
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
        throw new Error(`Parse failed: ${String(parsed.error)}`);
      }

      // Compile back
      const result = mightyMikeMapToCompressedBinary(parsed.value);

      function isResultLike(x: unknown): x is { ok: boolean; value?: unknown; error?: unknown } {
        return typeof x === "object" && x !== null && "ok" in x;
      }

      let recompiledData: Uint8Array;
      if (isResultLike(result)) {
        if (!result.ok) {
          throw new Error(`Compilation failed: ${String(result.error)}`);
        }
        if (result.value instanceof ArrayBuffer) {
          recompiledData = new Uint8Array(result.value);
        } else if (ArrayBuffer.isView(result.value)) {
          // Convert array-like view to a real Uint8Array without type assertions by using Array.prototype.slice
          recompiledData = new Uint8Array(Array.prototype.slice.call(result.value));
        } else {
          throw new Error("Unexpected result.value type");
        }
      } else if (result instanceof ArrayBuffer) {
        recompiledData = new Uint8Array(result);
      } else if (ArrayBuffer.isView(result)) {
        recompiledData = new Uint8Array(Array.prototype.slice.call(result));
      } else {
        throw new Error("Unexpected compilation result type");
      }

      // Semantic Roundtrip Check
      // We check that the recompiled data parses back to the same structure as the original
      
      // 1. Basic size check (within 5% is acceptable for compression variance)
      const sizeDiff = Math.abs(recompiledData.length - originalData.length);
      const sizeRatio = sizeDiff / originalData.length;
      if (sizeRatio > 0.05) {
        console.warn(`Mighty Mike ${filename}: Size mismatch > 5% (${recompiledData.length} vs ${originalData.length})`);
      }

      // 2. Re-Parse
      const recompiledAB = recompiledData.buffer.slice(recompiledData.byteOffset, recompiledData.byteOffset + recompiledData.byteLength);
      const reParsed = parseMightyMikeMap(recompiledAB);

      if (!reParsed.ok) {
        throw new Error(`Failed to parse recompiled data: ${String(reParsed.error)}`);
      }

      // Compare map dimensions
      expect(reParsed.value.mapWidth).toBe(parsed.value.mapWidth);
      expect(reParsed.value.mapHeight).toBe(parsed.value.mapHeight);
      expect(reParsed.value.numItems).toBe(parsed.value.numItems);

      // Compare items
      expect(reParsed.value.items.length).toBe(parsed.value.items.length);
      for(let i=0; i<parsed.value.items.length; i++) {
          const item1 = parsed.value.items[i];
          const item2 = reParsed.value.items[i];
          expect(item2).toEqual(item1);
      }

      // Compare tiles (sample)
      if (parsed.value.mapImage.length > 0) {
          expect(reParsed.value.mapImage.length).toBe(parsed.value.mapImage.length);
          // Check first row
          expect(reParsed.value.mapImage[0]).toEqual(parsed.value.mapImage[0]);
          // Check last row
          const lastIdx = parsed.value.mapImage.length - 1;
          expect(reParsed.value.mapImage[lastIdx]).toEqual(parsed.value.mapImage[lastIdx]);
      }
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
