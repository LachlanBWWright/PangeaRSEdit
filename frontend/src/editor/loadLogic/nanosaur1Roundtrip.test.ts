// nanosaur1Roundtrip.test.ts
// Byte-for-byte accuracy roundtrip tests for Nanosaur 1 level parsing
// Tests: parse → export → compare levels to original binary

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  parseNanosaur1Level,
  nanosaur1LevelToLevelData,
} from "@/data/processors/classicProprocessor";
import { compileNanosaur1Level } from "./compileNanosaur1Level";

/**
 * Converts a Node.js Buffer to an ArrayBuffer
 */
function bufferToArrayBuffer(buf: Buffer): ArrayBuffer {
  const ab = new ArrayBuffer(buf.length);
  const view = new Uint8Array(ab);
  for (let i = 0; i < buf.length; ++i) {
    view[i] = buf[i]!;
  }
  return ab;
}

describe("Nanosaur 1 Byte-Accurate Roundtrip Tests", () => {
  const gamesRoot = join(__dirname, "../../../games/nanosaur1");

  const levels = [
    { name: "level1", path: join(gamesRoot, "Data/Terrain/level1.ter") },
    { name: "level2", path: join(gamesRoot, "Data/Terrain/level2.ter") },
    { name: "level3", path: join(gamesRoot, "Data/Terrain/level3.ter") },
    { name: "level4", path: join(gamesRoot, "Data/Terrain/level4.ter") },
    { name: "level5", path: join(gamesRoot, "Data/Terrain/level5.ter") },
  ];

  describe("Parse → Export → Byte-Compare Roundtrip", () => {
    levels.forEach(({ name, path }) => {
      it(`${name}: byte-for-byte accuracy check`, () => {
        // Load original file
        let originalBuffer: Buffer;
        try {
          originalBuffer = readFileSync(path);
        } catch {
          console.warn(`Could not find file ${path}, skipping test`);
          return; // Skip if file not found
        }

        const originalData = new Uint8Array(originalBuffer);
        expect(originalData.length).toBeGreaterThan(0);
        console.log(`\n${name}.ter: Loading ${originalData.length} bytes`);

        // Parse the Nanosaur 1 level
        const rawLevelData = parseNanosaur1Level(bufferToArrayBuffer(originalBuffer));
        console.log(`  Parsed: ${rawLevelData.header.width}x${rawLevelData.header.height}`);
        console.log(`    Objects: ${rawLevelData.objectList.length}`);
        console.log(`    Texture layer tiles: ${rawLevelData.textureLayer.length}`);
        console.log(`    Heightmap tiles: ${rawLevelData.heightmapTiles?.length || 0}`);

        // Convert to LevelData format
        const compatibleLevel = nanosaur1LevelToLevelData(rawLevelData, 32, 64, 4.0);
        expect(compatibleLevel).toBeDefined();
        expect(compatibleLevel.Hedr).toBeDefined();
        expect(compatibleLevel.Layr).toBeDefined();

        // Compile back to binary
        const compileResult = compileNanosaur1Level(compatibleLevel, rawLevelData);
        
        if (!compileResult.ok) {
          throw new Error(`Compilation failed: ${compileResult.error.message}`);
        }
        
        const exportedData = new Uint8Array(compileResult.value);
        console.log(`  Export: ${exportedData.length} bytes`);

        // Byte-for-byte comparison
        expect(exportedData.length).toBe(originalData.length);
        
        let differenceCount = 0;
        const maxDiffsToLog = 10;
        for (let i = 0; i < originalData.length; i++) {
          if (originalData[i] !== exportedData[i]) {
            if (differenceCount < maxDiffsToLog) {
              console.log(
                `  Diff at byte ${i}: orig=${originalData[i]} export=${exportedData[i]}`
              );
            }
            differenceCount++;
          }
        }

        if (differenceCount > 0) {
          console.log(`  Total differences: ${differenceCount} bytes`);
        }

        // Expect byte-for-byte identity
        expect(exportedData).toEqual(originalData);
        
        console.log(`  ✓ ${name}: Byte-for-byte match achieved`);
      });
    });
  });

  describe("Semantic Roundtrip (Parse → Convert → Parse Again)", () => {
    levels.forEach(({ name, path }) => {
      it(`${name}: semantic consistency check`, () => {
        let originalBuffer: Buffer;
        try {
          originalBuffer = readFileSync(path);
        } catch {
          console.warn(`Could not find file ${path}, skipping test`);
          return;
        }

        // Parse original
        const rawLevelData1 = parseNanosaur1Level(bufferToArrayBuffer(originalBuffer));
        const compatibleLevel = nanosaur1LevelToLevelData(rawLevelData1, 32, 64, 4.0);

        // Compile and re-parse
        const compileResult = compileNanosaur1Level(compatibleLevel, rawLevelData1);
        
        if (!compileResult.ok) {
          throw new Error(`Compilation failed: ${compileResult.error.message}`);
        }
        
        const rawLevelData2 = parseNanosaur1Level(compileResult.value);

        // Compare structures
        expect(rawLevelData2.header.width).toBe(rawLevelData1.header.width);
        expect(rawLevelData2.header.height).toBe(rawLevelData1.header.height);
        expect(rawLevelData2.objectList.length).toBe(rawLevelData1.objectList.length);
        expect(rawLevelData2.textureLayer.length).toBe(rawLevelData1.textureLayer.length);
        expect(rawLevelData2.heightmapTiles?.length || 0).toBe(rawLevelData1.heightmapTiles?.length || 0);

        // Compare textureLayer
        const layer1 = rawLevelData1.textureLayer;
        const layer2 = rawLevelData2.textureLayer;
        expect(layer2.length).toBe(layer1.length);
        for (let i = 0; i < layer1.length; i++) {
          expect(layer2[i]).toEqual(layer1[i]);
        }

        // Compare items
        for (let i = 0; i < rawLevelData1.objectList.length; i++) {
          expect(rawLevelData2.objectList[i]).toEqual(rawLevelData1.objectList[i]);
        }

        console.log(`  ✓ ${name}: Semantic consistency maintained`);
      });
    });
  });
});
