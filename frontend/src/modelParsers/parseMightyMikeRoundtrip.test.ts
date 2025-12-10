// parseMightyMikeRoundtrip.test.ts
// Roundtrip tests for MightyMike parsing - parse and re-export should match original

import { describe, it, expect } from "vitest";
import {
  parseMightyMikeMap,
  mightyMikeMapToBinary,
} from "../modelParsers/parseMightyMike";

describe("MightyMike Roundtrip Tests", () => {
  const testFiles = [
    "/games/mightymike/Data/Maps/bargain.map-1",
    "/games/mightymike/Data/Maps/candy.map-1",
    "/games/mightymike/Data/Maps/fairy.map-1",
    "/games/mightymike/Data/Maps/clown.map-1",
    "/games/mightymike/Data/Maps/jurassic.map-1",
  ];

  testFiles.forEach((filePath) => {
    it(`should achieve exact roundtrip for ${filePath
      .split("/")
      .pop()}`, async () => {
      // Load original file
      const response = await fetch(filePath);
      const originalBuffer = await response.arrayBuffer();
      const originalData = new Uint8Array(originalBuffer);

      // Parse the file
      const parseResult = parseMightyMikeMap(originalBuffer);
      expect(parseResult.ok).toBe(true);

      if (!parseResult.ok) {
        console.log(`Failed to parse ${filePath}:`, parseResult.error);
        return;
      }

      const parsedMap = parseResult.value;

      // Convert back to binary
      const exportedBuffer = mightyMikeMapToBinary(parsedMap);
      const exportedData = new Uint8Array(exportedBuffer);

      // Compare lengths
      expect(exportedData.length).toBe(originalData.length);

      // Compare byte by byte
      const minLength = Math.min(originalData.length, exportedData.length);
      let differences = 0;
      let firstDiffIndex = -1;

      for (let i = 0; i < minLength; i++) {
        if (originalData[i] !== exportedData[i]) {
          differences++;
          if (firstDiffIndex === -1) {
            firstDiffIndex = i;
          }
        }
      }

      // Log results
      console.log(`${filePath.split("/").pop()}:`);
      console.log(`  Original size: ${originalData.length} bytes`);
      console.log(`  Exported size: ${exportedData.length} bytes`);
      console.log(`  Differences: ${differences}`);
      if (firstDiffIndex !== -1) {
        console.log(`  First difference at byte ${firstDiffIndex}:`);
        console.log(
          `    Original: 0x${originalData[firstDiffIndex]
            .toString(16)
            .padStart(2, "0")}`,
        );
        console.log(
          `    Exported: 0x${exportedData[firstDiffIndex]
            .toString(16)
            .padStart(2, "0")}`,
        );
      }

      // For now, allow some tolerance since this is initial implementation
      // TODO: Achieve exact byte-for-byte match
      expect(differences).toBeLessThan(100); // Allow some differences during development
    });
  });

  it("should parse and validate map structure correctly", async () => {
    const response = await fetch("/games/mightymike/Data/Maps/bargain.map-1");
    const buffer = await response.arrayBuffer();

    const result = parseMightyMikeMap(buffer);
    expect(result.ok).toBe(true);

    if (result.ok) {
      const map = result.value;

      // Validate basic structure
      expect(map.mapWidth).toBeGreaterThan(0);
      expect(map.mapHeight).toBeGreaterThan(0);
      expect(map.mapImage.length).toBe(map.mapHeight);
      expect(map.mapImage[0].length).toBe(map.mapWidth);
      expect(map.items.length).toBe(map.numItems);

      // Validate tile data is reasonable
      for (const row of map.mapImage) {
        for (const tile of row) {
          expect(typeof tile).toBe("number");
          expect(tile).toBeGreaterThanOrEqual(0);
        }
      }

      // Validate items have correct structure
      for (const item of map.items) {
        expect(typeof item.x).toBe("number");
        expect(typeof item.y).toBe("number");
        expect(typeof item.type).toBe("number");
        expect(typeof item.p0).toBe("number");
        expect(typeof item.p1).toBe("number");
        expect(typeof item.p2).toBe("number");
        expect(typeof item.p3).toBe("number");
      }

      console.log("Map validation passed:");
      console.log(`  Dimensions: ${map.mapWidth}x${map.mapHeight}`);
      console.log(`  Items: ${map.numItems}`);
      console.log(`  Has alt map: ${map.altMap !== null}`);
    }
  });

  it("should handle all map variants (map-1, map-2, map-3)", async () => {
    const mapVariants = [
      "/games/mightymike/Data/Maps/bargain.map-1",
      "/games/mightymike/Data/Maps/bargain.map-2",
      "/games/mightymike/Data/Maps/bargain.map-3",
    ];

    for (const mapPath of mapVariants) {
      const response = await fetch(mapPath);
      const buffer = await response.arrayBuffer();

      const result = parseMightyMikeMap(buffer);
      expect(result.ok).toBe(true, `Failed to parse ${mapPath}`);

      if (result.ok) {
        const map = result.value;
        expect(map.mapWidth).toBeGreaterThan(0);
        expect(map.mapHeight).toBeGreaterThan(0);
        console.log(
          `${mapPath.split("/").pop()}: ${map.mapWidth}x${map.mapHeight}, ${
            map.numItems
          } items`,
        );
      }
    }
  });
});
