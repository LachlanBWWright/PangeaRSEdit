import { describe, it, expect } from "vitest";
import { parseBG3D, bg3dParsedToBG3D } from "./parseBG3D";
import { bg3dParsedToGLTF, gltfToBG3D } from "./parsedBg3dGitfConverter";
import * as fs from "fs";
import * as path from "path";

import { argb16ToPng, rgb24ToPng, rgba8ToPng } from "./image/pngArgb";

// Utility: Byte-swap a Uint16Array (swap each 16-bit word's bytes)
function byteSwapUint16Array(arr: Uint16Array): Uint16Array {
  const swapped = new Uint16Array(arr.length);
  for (let i = 0; i < arr.length; i++) {
    const val = arr[i];
    swapped[i] = ((val & 0xff) << 8) | ((val >> 8) & 0xff);
  }
  return swapped;
}

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

    console.log("Parsed Materials:", parsed.materials.length);
    parsed.materials.forEach((mat, i) => {
      console.log(`Material[${i}] textures:`, mat.textures.length);
      mat.textures.forEach((tex, j) => {
        // console.log(tex);
        let pngBuffer: Buffer;
        if (tex.srcPixelFormat === 33638) {
          // GL_UNSIGNED_SHORT_1_5_5_5_REV (ARGB16)
          // Convert ARGB16 to PNG, but byte-swap first
          const argb16 = new Uint16Array(
            tex.pixels.buffer,
            tex.pixels.byteOffset,
            tex.pixels.byteLength / 2,
          );
          const swapped = byteSwapUint16Array(argb16);
          pngBuffer = argb16ToPng(swapped, tex.width, tex.height);
        } else {
          console.log(
            `Texture ${i}.${j} has srcPixelFormat: ${tex.srcPixelFormat}`,
          );
          // GL_RGBA
          // You may need a rgba8ToPng function if not present
          // For now, fallback to rgb24ToPng (will be wrong if alpha is used)
          console.log(tex.pixels, tex.width, tex.height);
          pngBuffer = rgba8ToPng(tex.pixels, tex.width, tex.height);
        }
        const pngPath = path.join(
          __dirname,
          `./testSkeletons/output/level10_brainboss.material${i}.texture${j}.png`,
        );
        fs.writeFileSync(pngPath, pngBuffer);
        console.log(`Saved PNG to ${pngPath}`);
      });
    });

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
    expect(outputArray.length).toBe(fileBuffer.byteLength);
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

    // Step 2: Convert to glTF
    const gltf = bg3dParsedToGLTF(parsed);
    expect(gltf).toBeDefined();

    // Step 3: Convert back to Parsed BG3D
    const parsed2 = gltfToBG3D(gltf);
    expect(parsed2).toBeDefined();

    // Check that parsed and parsed2 are identical
    expect(parsed2).toEqual(parsed);

    // Compare top-level materials and groups for equality
    expect(parsed2.materials).toEqual(parsed.materials);
    expect(parsed2.groups).toEqual(parsed.groups);
    console.log("Equality check passed");

    // Step 4: Convert back to BG3D ArrayBuffer
    const outputBuffer = bg3dParsedToBG3D(parsed2);

    //Check it matches the original file
    const outputArray = new Uint8Array(outputBuffer);
    const originalArray = new Uint8Array(arrayBuffer);
    console.log("Lengths Match", outputArray.length, originalArray.length);
    for (let i = 20; i < outputArray.length; i++) {
      expect(outputArray[i], `Byte ${i} mismatch`).toBe(originalArray[i]);
    }
    console.log("All bytes match");
  });
}, 50000);
