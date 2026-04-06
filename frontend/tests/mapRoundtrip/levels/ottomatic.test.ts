/**
 * Otto Matic Level Roundtrip Tests
 *
 * Tests byte-for-byte roundtrip accuracy for all Otto Matic terrain files.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  saveToJson,
  loadBytesFromJsonAsync,
} from "@lachlanbwwright/rsrcdump-ts";
import { ottoMaticSpecs } from "../../../src/python/structSpecs/ottoMatic";

describe("Otto Matic Level Roundtrip", () => {
  const terrainDir = join(
    __dirname,
    "../../../../public/assets/ottoMatic/terrain",
  );
  const levelFiles = [
    "Apocalypse.ter.rsrc",
    "Asteroid.ter.rsrc",
    "Atlantis.ter.rsrc",
    "Beach.ter.rsrc",
    "Canyon.ter.rsrc",
    "Castle.ter.rsrc",
    "City.ter.rsrc",
    "Desert.ter.rsrc",
    "Forest.ter.rsrc",
    "Ice.ter.rsrc",
    "Island.ter.rsrc",
    "Mountain.ter.rsrc",
    "Saucer.ter.rsrc",
    "Swamp.ter.rsrc",
    "Volcano.ter.rsrc",
  ];

  for (const levelFile of levelFiles) {
    it(`should roundtrip ${levelFile} byte-for-byte`, async () => {
      const filePath = join(terrainDir, levelFile);
      const originalData = readFileSync(filePath);

      // Parse to JSON (hex data only for byte accuracy)
      const jsonStringResult = await saveToJson(
        new Uint8Array(originalData),
        [],
        [],
        [],
      );
      expect(jsonStringResult.ok).toBe(true);
      if (!jsonStringResult.ok) {
        console.error(`Failed to parse ${levelFile}:`, jsonStringResult.error);
        return;
      }
      const jsonData = JSON.parse(jsonStringResult.value);

      // Serialize back to binary
      const bytesResult = await loadBytesFromJsonAsync(jsonData, [], [], []);
      expect(bytesResult.ok).toBe(true);
      if (!bytesResult.ok) {
        console.error(
          `Failed to load from JSON ${levelFile}:`,
          bytesResult.error,
        );
        return;
      }
      const roundtripData = bytesResult.value;

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

    it(`should parse ${levelFile} to JSON with ottoMatic specs`, async () => {
      const filePath = join(terrainDir, levelFile);
      const originalData = readFileSync(filePath);

      // Parse with specs (structured data)
      const jsonStringResult = await saveToJson(
        new Uint8Array(originalData),
        ottoMaticSpecs,
        [],
        [],
      );
      expect(jsonStringResult.ok).toBe(true);
      if (!jsonStringResult.ok) {
        console.error(
          `Failed to parse ${levelFile} with specs:`,
          jsonStringResult.error,
        );
        return;
      }

      const jsonData = JSON.parse(jsonStringResult.value);
      function assertIsRecord(
        x: unknown,
      ): asserts x is Record<string, unknown> {
        if (typeof x !== "object" || x === null)
          expect.fail("Parsed data is not an object");
      }
      assertIsRecord(jsonData);
      expect(jsonData).toBeDefined();
      expect(jsonData.Hedr).toBeDefined();
    });
  }
});
