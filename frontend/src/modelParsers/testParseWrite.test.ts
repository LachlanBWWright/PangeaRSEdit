// Test to verify that bg3dParsedToBG3D output can be parsed by parseBG3D
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { parseBG3D, bg3dParsedToBG3D } from "./parseBG3D";

describe("BG3D Parse-Write Cycle", () => {
  it("should be able to parse the output of bg3dParsedToBG3D", async () => {
    const ottoPath = __dirname + "/testSkeletons/Otto.bg3d";
    const ottoBytes = readFileSync(ottoPath);

    console.log(`Original file: ${ottoBytes.byteLength} bytes`);

    // Parse original
    const parsed1 = await parseBG3D(ottoBytes.buffer as ArrayBuffer);
    console.log(`Parsed 1: ${parsed1.materials.length} materials, ${parsed1.groups.length} groups`);

    // Write it back
    const written1 = bg3dParsedToBG3D(parsed1);
    console.log(`Written 1: ${written1.byteLength} bytes`);

    // Try to parse what we just wrote
    const parsed2 = await parseBG3D(written1);
    console.log(`Parsed 2: ${parsed2.materials.length} materials, ${parsed2.groups.length} groups`);

    // Compare structures
    expect(parsed2.materials.length).toBe(parsed1.materials.length);
    expect(parsed2.groups.length).toBe(parsed1.groups.length);

    // Write again
    const written2 = bg3dParsedToBG3D(parsed2);
    console.log(`Written 2: ${written2.byteLength} bytes`);

    // Sizes should stabilize
    const sizeStability = Math.abs(written2.byteLength - written1.byteLength) / written1.byteLength;
    console.log(`Size stability: ${(1 - sizeStability) * 100}%`);

    expect(sizeStability).toBeLessThan(0.01); // Less than 1% size change
  });
});
