import { describe, it, expect } from "vitest";
import { parseBG3D } from "./parseBG3D";
import { bg3dParsedToGLTF, gltfToBG3D } from "./parsedBg3dGitfConverter";
import { bg3dParsedToBG3D } from "./bg3dParsedToBG3D";
import * as fs from "fs";
import * as path from "path";

// Adjust the path to your testSkeletons folder and BG3D file name
const TEST_BG3D_PATH = path.join(
  __dirname,
  "./testSkeletons/EliteBrainAlien.bg3d",
);

describe("parseBG3DAndUnparse", () => {
  it("parses a real BG3D file from testSkeletons and converts it back and forth", () => {
    const fileBuffer = fs.readFileSync(TEST_BG3D_PATH);
    const arrayBuffer = fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength,
    );

    // Step 1: Parse BG3D
    const parsed = parseBG3D(arrayBuffer);
    expect(parsed).toBeDefined();
    expect(Array.isArray(parsed.materials)).toBe(true);
    expect(Array.isArray(parsed.geometries)).toBe(true);
    expect(Array.isArray(parsed.groups)).toBe(true);

    // Step 2: Back to BG3D
    const outputBuffer = bg3dParsedToBG3D(parsed);
    expect(outputBuffer).toBeInstanceOf(ArrayBuffer);
    expect(outputBuffer.byteLength).toBeGreaterThan(0);
    const outputArray = new Uint8Array(outputBuffer);
    expect(outputArray.length).toBeGreaterThan(0);

    //Step 3: Parse new BG3D
    const parsed2 = parseBG3D(outputBuffer);
    expect(parsed2).toBeDefined();
    expect(Array.isArray(parsed2.materials)).toBe(true);
    expect(Array.isArray(parsed2.geometries)).toBe(true);
    expect(Array.isArray(parsed2.groups)).toBe(true);
    expect(parsed2.materials.length).toBe(parsed.materials.length);
    expect(parsed2.geometries.length).toBe(parsed.geometries.length);
    expect(parsed2.groups.length).toBe(parsed.groups.length);

    //Step 4: Back to BG3D again
    const outputBuffer2 = bg3dParsedToBG3D(parsed2);
    expect(outputBuffer2).toBeInstanceOf(ArrayBuffer);
    expect(outputBuffer2.byteLength).toBeGreaterThan(0);
    const outputArray2 = new Uint8Array(outputBuffer2);

    //Compare both output arrays
    expect(outputArray2.length).toBe(outputArray.length);
    console.log("Lengths Match", outputArray2.length, outputArray.length);
    console.log("Original Length:", fileBuffer.byteLength);
    for (let i = 0; i < outputArray.length; i++) {
      expect(outputArray2[i]).toBe(outputArray[i]);
    }
  });
});

describe("parseBG3D", () => {
  it("parses a real BG3D file from testSkeletons", () => {
    const fileBuffer = fs.readFileSync(TEST_BG3D_PATH);
    const arrayBuffer = fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength,
    );

    // Step 1: Parse BG3D
    const parsed = parseBG3D(arrayBuffer);
    expect(parsed).toBeDefined();
    expect(Array.isArray(parsed.materials)).toBe(true);
    expect(Array.isArray(parsed.geometries)).toBe(true);
    console.log(
      "Original: materials",
      parsed.materials.length,
      "geometries",
      parsed.geometries.length,
    );
    parsed.materials.forEach((mat, i) => {
      console.log(`Original material[${i}] textures:`, mat.textures.length);
    });

    // Step 2: Convert to glTF
    const gltf = bg3dParsedToGLTF(parsed);
    expect(gltf).toBeDefined();

    // Step 3: Convert back to BG3D
    const parsed2_rt = gltfToBG3D(gltf);
    expect(parsed2_rt).toBeDefined();
    expect(Array.isArray(parsed2_rt.materials)).toBe(true);
    expect(Array.isArray(parsed2_rt.geometries)).toBe(true);
    console.log(
      "Roundtrip: materials",
      parsed2_rt.materials.length,
      "geometries",
      parsed2_rt.geometries.length,
    );
    parsed2_rt.materials.forEach((mat, i) => {
      console.log(`Roundtrip material[${i}] textures:`, mat.textures.length);
    });

    // Step 4: Serialize back to BG3D
    // Pass the original header (first 20 bytes) to preserve version info
    const orig_rt = new Uint8Array(arrayBuffer);
    const origHeader = orig_rt.slice(0, 20);
    const outputBuffer_rt = bg3dParsedToBG3D(parsed2_rt, origHeader);
    const roundtrip_rt = new Uint8Array(outputBuffer_rt);
    if (roundtrip_rt.length !== orig_rt.length) {
      console.log(
        "First 64 bytes of original:",
        Array.from(orig_rt.slice(0, 64)),
      );
      console.log(
        "First 64 bytes of roundtrip:",
        Array.from(roundtrip_rt.slice(0, 64)),
      );
      console.log("Last 64 bytes of original:", Array.from(orig_rt.slice(-64)));
      console.log(
        "Last 64 bytes of roundtrip:",
        Array.from(roundtrip_rt.slice(-64)),
      );
    }
    //expect(roundtrip_rt.length).toBe(orig_rt.length);
    for (let i = 0; i < orig_rt.length; i++) {
      try {
        expect(roundtrip_rt[i], `Byte ${i} mismatch`).toBe(orig_rt[i]);
      } catch (e) {
        console.error(`Error at byte ${i}:`, e);
        throw e;
      }
    }

    // Step 3: Convert glTF back to parsed BG3D
    const parsed2 = gltfToBG3D(gltf);
    expect(parsed2).toBeDefined();
    expect(Array.isArray(parsed2.materials)).toBe(true);
    expect(Array.isArray(parsed2.geometries)).toBe(true);

    // Step 3.5: Deep equality check between initial and round-tripped parsed BG3D
    console.log("Checking equality of parsed objects...");
    expect(parsed2.materials.length).toBe(parsed.materials.length);
    console.log("Materials length:", parsed2.materials.length);
    expect(parsed2.geometries.length).toBe(parsed.geometries.length);
    console.log("Geometries length:", parsed2.geometries.length);
    expect(parsed2.groups.length).toBe(parsed.groups.length);
    console.log("Groups length:", parsed2.groups.length);
    console.log("Lengths match, checking contents...");

    for (let i = 0; i < parsed.geometries.length; i++) {
      console.log(`Checking geometry ${i}...`);
      try {
        expect(parsed2.geometries[i]).toEqual(parsed.geometries[i]);
      } catch (e) {
        const expected = parsed.geometries[i];
        const actual = parsed2.geometries[i];
        console.error(`Geometry ${i} mismatch:`);
        console.error("Expected:", JSON.stringify(expected, null, 2));
        console.error("Actual:", JSON.stringify(actual, null, 2));
        // Print keys and types for both
        const expKeys = Object.keys(expected);
        const actKeys = Object.keys(actual);
        console.error("Expected keys:", expKeys);
        console.error("Actual keys:", actKeys);
        for (const key of new Set([...expKeys, ...actKeys])) {
          const expVal = (expected as any)[key];
          const actVal = (actual as any)[key];
          const same = JSON.stringify(expVal) === JSON.stringify(actVal);
          console.error(
            `Key: ${key}, Same: ${same}, Expected type: ${typeof expVal}, Actual type: ${typeof actVal}`,
          );
          if (!same) {
            console.error(`  Expected:`, expVal);
            console.error(`  Actual:  `, actVal);
          }
        }
        throw e;
      }
    }
    for (let i = 0; i < parsed.groups.length; i++) {
      console.log(`Checking group ${i}...`);
      try {
        expect(parsed2.groups[i]).toEqual(parsed.groups[i]);
      } catch (e) {
        console.error(`Group ${i} mismatch:`);
        console.error("Expected:", JSON.stringify(parsed.groups[i], null, 2));
        console.error("Actual:", JSON.stringify(parsed2.groups[i], null, 2));
        throw e;
      }
    }
    for (let i = 0; i < parsed.materials.length; i++) {
      console.log(`Checking material ${i}...`);
      try {
        expect(parsed2.materials[i]).toEqual(parsed.materials[i]);
      } catch (e) {
        console.error(`Material ${i} mismatch:`);
        console.error(
          "Expected:",
          JSON.stringify(parsed.materials[i], null, 2),
        );
        console.error("Actual:", JSON.stringify(parsed2.materials[i], null, 2));
        throw e;
      }
    }
    //expect(parsed2).toEqual(parsed);

    console.log("Round trip successful!");

    // Step 4: Serialize parsed BG3D back to file
    const outputBuffer = bg3dParsedToBG3D(parsed2);
    expect(outputBuffer).toBeInstanceOf(ArrayBuffer);

    // Step 5: Compare input and output buffers (byte-for-byte)
    const orig = new Uint8Array(arrayBuffer);
    const roundtrip = new Uint8Array(outputBuffer);
    expect(roundtrip.length).toBe(orig.length);
    for (let i = 0; i < orig.length; i++) {
      expect(roundtrip[i]).toBe(orig[i]);
    }
  });
});
