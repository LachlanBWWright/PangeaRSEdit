/**
 * Mighty Mike Level Roundtrip Tests
 *
 * Tests byte-for-byte roundtrip accuracy for all Mighty Mike map files.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parseMightyMikeMap, mightyMikeMapToCompressedBinary } from "../../../src/modelParsers/parseMightyMike";

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  const out = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(out).set(buffer);
  return out;
}

describe("Mighty Mike Level Roundtrip", () => {
  const terrainDir = join(
    __dirname,
    "../../../../public/assets/mightyMike/terrain",
  );
  const levelFiles = [
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

  for (const levelFile of levelFiles) {
    it(`should roundtrip ${levelFile} byte-for-byte`, () => {
      const filePath = join(terrainDir, levelFile);
      const originalData = readFileSync(filePath);
      const parseResult = parseMightyMikeMap(toArrayBuffer(originalData));

      expect(parseResult.isOk()).toBe(true);
      if (!parseResult.isOk()) {
        return;
      }

      const serializedData = mightyMikeMapToCompressedBinary(parseResult.value);
      const roundtrip = new Uint8Array(serializedData);
      expect(roundtrip.length).toBe(originalData.length);

      let firstDiff = -1;
      for (let i = 0; i < originalData.length; i++) {
        if (roundtrip[i] !== originalData[i]) {
          firstDiff = i;
          break;
        }
      }

      expect(firstDiff).toBe(-1);
    });
  }
});
