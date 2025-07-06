import { describe, it, expect } from "vitest";
import { parseBG3D, bg3dParsedToBG3D } from "./parseBG3D";
import { bg3dParsedToGLTF, gltfToBG3D } from "./parsedBg3dGitfConverter";
import * as fs from "fs";
import * as path from "path";
import { argb16ToPng, rgb24ToPng } from "./image/pngArgb";

// Adjust the path to your testSkeletons folder and BG3D file name
const TEST_BG3D_PATH = path.join(
  __dirname,
  "./testSkeletons/level10_brainboss.bg3d",
);

describe("parseBG3DAndUnparse", () => {
  it("parses a real BG3D file from testSkeletons and converts it back and forth", () => {
    const fileBuffer = fs.readFileSync(TEST_BG3D_PATH);
    const arrayBuffer = fileBuffer.buffer;

    // Step 1: Parse BG3D
    const parsed = parseBG3D(arrayBuffer);
    expect(parsed).toBeDefined();
    //expect(Array.isArray(parsed.materials)).toBe(true);
    expect(Array.isArray(parsed.groups)).toBe(true);

    /*     console.log("Parsed Materials:", parsed.materials.length);
    parsed.materials.forEach((mat, i) => {
      console.log(`Material[${i}] textures:`, mat.textures.length);
      mat.textures.forEach((tex, j) => {
        console.log(tex);
        const pngBuffer = rgb24ToPng(tex.pixels, tex.width, tex.height);

        const pngPath = path.join(
          __dirname,
          `./testSkeletons/output/level10_brainboss.material${i}.texture${j}.png`,
        );
        fs.writeFileSync(pngPath, pngBuffer);
        console.log(`Saved PNG to ${pngPath}`);
      });
    }); */

    // Step 2: Back to BG3D
    const outputBuffer = bg3dParsedToBG3D(parsed);
    expect(outputBuffer).toBeInstanceOf(ArrayBuffer);
    expect(outputBuffer.byteLength).toBeGreaterThan(0);
    const outputArray = new Uint8Array(outputBuffer);
    expect(outputArray.length).toBeGreaterThan(0);

    // Save the new BG3D file for inspection
    const roundtripPath = path.join(
      __dirname,
      "./testSkeletons/output/level10_brainboss.roundtrip1.bg3d",
    );
    fs.writeFileSync(roundtripPath, Buffer.from(outputBuffer));

    //Compare original and output arrays
    //Compare all bytes
    console.log("Lengths Match", outputArray.length, fileBuffer.byteLength);
    let errorCount = 0;
    for (let i = 20; i < outputArray.length; i++) {
      if (outputArray[i] !== fileBuffer[i]) {
        if (errorCount < 10) {
          console.error(
            `Byte ${i} mismatch: expected ${fileBuffer[i]}, got ${outputArray[i]}`,
          );
        }
        errorCount++;
      }
      // expect(outputArray[i], `Byte ${i} mismatch`).toBe(fileBuffer[i]);
    }
    console.log(`Total mismatches: ${errorCount}`);
    // If there are more than 10 mismatches
    //Check length
    //expect(errorCount).toBe(0);
    //expect(outputArray.length).toBe(fileBuffer.byteLength);

    //Step 3: Parse new BG3D
    const parsed2 = parseBG3D(outputBuffer);
    expect(parsed2).toBeDefined();
    expect(Array.isArray(parsed2.materials)).toBe(true);
    expect(Array.isArray(parsed2.groups)).toBe(true);
    expect(parsed2.groups.length).toBe(parsed.groups.length);
    expect(parsed2.materials.length).toBe(parsed.materials.length);
    expect(parsed2.groups.length).toBe(parsed.groups.length);

    //expect(parsed2.materials.length).toBe(parsed.materials.length);

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
    expect(Array.isArray(parsed.groups)).toBe(true);
    // Flatten all geometries from all groups for comparison
    const flattenGeometries = (groups: any[]): any[] => {
      let result: any[] = [];
      for (const group of groups) {
        if (group.geometries) result = result.concat(group.geometries);
        if (group.groups)
          result = result.concat(flattenGeometries(group.groups));
      }
      return result;
    };
    const allGeometries = flattenGeometries(parsed.groups);
    console.log(
      "Original: materials",
      parsed.materials.length,
      "geometries",
      allGeometries.length,
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
    expect(Array.isArray(parsed2_rt.groups)).toBe(true);
    const allGeometries2 = flattenGeometries(parsed2_rt.groups);
    console.log(
      "Roundtrip: materials",
      parsed2_rt.materials.length,
      "geometries",
      allGeometries2.length,
    );
    parsed2_rt.materials.forEach((mat, i) => {
      // console.log(`Roundtrip material[${i}] textures:`, mat.textures.length);
    });

    // Compare top-level materials and groups for equality
    expect(parsed2_rt.materials).toEqual(parsed.materials);
    expect(parsed2_rt.groups).toEqual(parsed.groups);
    console.log("Equality check passed");

    // Step 4: Serialize back to BG3D
    // Pass the original header (first 20 bytes) to preserve version info
    const orig_rt = new Uint8Array(arrayBuffer);
    const origHeader = orig_rt.slice(0, 20);
    const outputBuffer_rt = bg3dParsedToBG3D(parsed2_rt);
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
    expect(Array.isArray(parsed2.groups)).toBe(true);

    // Step 3.5: Deep equality check between initial and round-tripped parsed BG3D
    console.log("Checking equality of parsed objects...");
    expect(parsed2.materials.length).toBe(parsed.materials.length);
    expect(parsed2.groups.length).toBe(parsed.groups.length);
    // Compare all geometries in all groups
    const allGeometriesA = flattenGeometries(parsed.groups);
    const allGeometriesB = flattenGeometries(parsed2.groups);
    expect(allGeometriesB.length).toBe(allGeometriesA.length);
    for (let i = 0; i < allGeometriesA.length; i++) {
      expect(allGeometriesB[i]).toEqual(allGeometriesA[i]);
    }
    for (let i = 0; i < parsed.groups.length; i++) {
      expect(parsed2.groups[i]).toEqual(parsed.groups[i]);
    }
    for (let i = 0; i < parsed.materials.length; i++) {
      expect(parsed2.materials[i]).toEqual(parsed.materials[i]);
    }
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
