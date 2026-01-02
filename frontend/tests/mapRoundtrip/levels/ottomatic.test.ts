/**
 * Otto Matic Level Roundtrip Tests
 *
 * Tests byte-for-byte roundtrip accuracy for all Otto Matic terrain files.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { saveToJsonObject, loadFromJson, saveToBytes } from "@/rsrcdump-ts/rsrcdump";
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
      const jsonResult = await saveToJsonObject(originalData, [], [], [], false);
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

    it(`should parse ${levelFile} to JSON with ottoMatic specs`, async () => {
      const filePath = join(terrainDir, levelFile);
      const originalData = readFileSync(filePath);

      // Parse with specs (structured data)
      const jsonResult = await saveToJsonObject(
        originalData,
        ottoMaticSpecs,
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
      function assertIsRecord(x: unknown): asserts x is Record<string, unknown> {
        if (typeof x !== 'object' || x === null) throw new Error('Parsed data is not an object');
      }
      assertIsRecord(jsonData);
      expect(jsonData).toBeDefined();
      expect(jsonData.Hedr).toBeDefined();
    });
  }
});
