import { describe, it, expect } from "vitest";
import { parseBG3D } from "./parseBG3D";
import { Game } from "../data/globals/globals";
import * as fs from "fs";
import * as path from "path";

// Adjust the path to your testSkeletons folder and BG3D file name
const TEST_BG3D_PATH = path.join(
  __dirname,
  "./testSkeletons/EliteBrainAlien.bg3d",
);

describe("parseBG3D", () => {
  it("parses a real BG3D file from testSkeletons", () => {
    const fileBuffer = fs.readFileSync(TEST_BG3D_PATH);
    const arrayBuffer = fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength,
    );

    // Debug: print bytes at offset 4-7 and tag values
    const view = new DataView(arrayBuffer);
    const bytes = [
      view.getUint8(4),
      view.getUint8(5),
      view.getUint8(6),
      view.getUint8(7),
    ];
    const tagBE = view.getUint32(4, false);
    const tagLE = view.getUint32(4, true);
    console.log("Bytes at offset 4-7:", bytes);
    console.log("Tag as big-endian:", tagBE);
    console.log("Tag as little-endian:", tagLE);

    const result = parseBG3D(arrayBuffer);
    expect(result).toBeDefined();
    expect(Array.isArray(result.materials)).toBe(true);
    expect(Array.isArray(result.geometries)).toBe(true);
    // Optionally, check for at least one geometry or material
    // expect(result.materials.length).toBeGreaterThan(0);
    // expect(result.geometries.length).toBeGreaterThan(0);
  });
});
