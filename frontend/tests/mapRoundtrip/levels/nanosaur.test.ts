/**
 * Nanosaur Level Roundtrip Tests
 *
 * Tests byte-for-byte roundtrip accuracy for all Nanosaur terrain files.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { saveToJsonObject, loadFromJson, saveToBytes } from "@/rsrcdump-ts/rsrcdump";
// Note: Nanosaur may not have specs defined yet
// import { nanosaurSpecs } from "../../../src/python/structSpecs/nanosaur";

describe("Nanosaur Level Roundtrip", () => {
  const terrainDir = join(
    __dirname,
    "../../../../public/assets/nanosaur/terrain",
  );
  const levelFiles = ["Level1.ter", "Level1Pro.ter"];

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

    it.skip(`should parse ${levelFile} to JSON with nanosaur specs`, () => {
      // Skip: Specs not defined yet
      // Skipped: keep file path available if tests are enabled in the future (no runtime usage)
      // Parse with specs (structured data)
      // const jsonResult = saveToJsonObject(originalData, nanosaurSpecs, [], [], true);
      // expect(jsonResult.ok).toBe(true);
      // ...
    });
  }
});
