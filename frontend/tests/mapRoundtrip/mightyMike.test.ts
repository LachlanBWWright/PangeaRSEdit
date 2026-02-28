import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parseMightyMikeMap, mightyMikeMapToBinary, mightyMikeMapToCompressedBinary } from "@/modelParsers/parseMightyMike";
import { rlwDecompress } from "@/utils/rlwDecompress";
import { isOk } from "@/types/result";

function bufferToArrayBuffer(buf: Buffer): ArrayBuffer {
  const ab = new ArrayBuffer(buf.length);
  const view = new Uint8Array(ab);
  for (let i = 0; i < buf.length; ++i) {
    const val = buf[i];
    if (val !== undefined) view[i] = val;
  }
  return ab;
}

describe("Byte-perfect roundtrip", () => {
  const gamesRoot = join(__dirname, "../../../games/mightymike");
  const files = [
    "jurassic.map-1", "candy.map-1", "clown.map-1", "fairy.map-1", "bargain.map-1",
    "jurassic.map-2", "candy.map-2", "clown.map-2", "fairy.map-2", "bargain.map-2",
    "jurassic.map-3", "candy.map-3", "clown.map-3", "fairy.map-3", "bargain.map-3",
  ];

  files.forEach((filename) => {
    it(`${filename}: uncompressed byte-for-byte match`, () => {
      const path = join(gamesRoot, "Data/Maps", filename);
      const originalBuffer = readFileSync(path);
      const originalAB = bufferToArrayBuffer(originalBuffer);

      // Decompress original
      const decompResult = rlwDecompress(originalAB);
      expect(isOk(decompResult)).toBe(true);
      if (!isOk(decompResult)) return;
      const originalDecompressed = new Uint8Array(decompResult.value.data);

      // Parse
      const parseResult = parseMightyMikeMap(originalAB);
      expect(parseResult.ok).toBe(true);
      if (!parseResult.ok) return;

      // Export to uncompressed
      const exportedUncompressed = new Uint8Array(mightyMikeMapToBinary(parseResult.value));

      // Compare sizes
      expect(exportedUncompressed.length).toBe(originalDecompressed.length);

      // Compare bytes
      for (let i = 0; i < originalDecompressed.length; i++) {
        if (exportedUncompressed[i] !== originalDecompressed[i]) {
          throw new Error(
            `Byte mismatch at offset ${i}: original=0x${(originalDecompressed[i] ?? 0).toString(16)} exported=0x${(exportedUncompressed[i] ?? 0).toString(16)}`
          );
        }
      }
    });
  });

  files.forEach((filename) => {
    it(`${filename}: compressed roundtrip data integrity`, () => {
      const path = join(gamesRoot, "Data/Maps", filename);
      const originalBuffer = readFileSync(path);
      const originalAB = bufferToArrayBuffer(originalBuffer);

      // Parse original
      const parseResult = parseMightyMikeMap(originalAB);
      expect(parseResult.ok).toBe(true);
      if (!parseResult.ok) return;

      // Export to compressed binary
      const compressed = mightyMikeMapToCompressedBinary(parseResult.value);

      // Re-parse compressed output
      const reParseResult = parseMightyMikeMap(compressed);
      expect(reParseResult.ok).toBe(true);
      if (!reParseResult.ok) return;

      const reParsed = reParseResult.value;
      expect(reParsed.mapWidth).toBe(parseResult.value.mapWidth);
      expect(reParsed.mapHeight).toBe(parseResult.value.mapHeight);
      expect(reParsed.numItems).toBe(parseResult.value.numItems);

      // Verify uncompressed data from both sources matches byte-for-byte
      const origBinary = new Uint8Array(mightyMikeMapToBinary(parseResult.value));
      const reExportBinary = new Uint8Array(mightyMikeMapToBinary(reParsed));

      expect(reExportBinary.length).toBe(origBinary.length);
      for (let i = 0; i < origBinary.length; i++) {
        if (reExportBinary[i] !== origBinary[i]) {
          throw new Error(
            `Byte mismatch at offset ${i} after compressed roundtrip`
          );
        }
      }
    });
  });
});
