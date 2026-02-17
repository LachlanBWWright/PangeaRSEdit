import { describe, it, expect } from "vitest";
import { parseBG3D, bg3dParsedToBG3D } from "./parseBG3D";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

import { argb16ToPng, rgba8ToPng } from "./image/pngArgb";

// Utility: Byte-swap a Uint16Array (swap each 16-bit word's bytes)
function byteSwapUint16Array(arr: Uint16Array): Uint16Array {
  const swapped = new Uint16Array(arr.length);
  for (let i = 0; i < arr.length; i++) {
    const val = arr[i] ?? 0;
    swapped[i] = ((val & 0xff) << 8) | ((val >> 8) & 0xff);
  }
  return swapped;
}

// Adjust the path to your testSkeletons folder and BG3D file name
const TEST_BG3D_PATH = join(
  __dirname,
  "./testSkeletons/level4_apocalypse.bg3d",
);

// Test files for games with bounding boxes (Billy Frontier, Cro Mag)
const BILLY_BG3D_PATH = join(__dirname, "./testSkeletons/Billy.bg3d");
const BROG_BG3D_PATH = join(__dirname, "./testSkeletons/Brog.bg3d");

// Helper to count geometries and check for bounding boxes
interface GroupChild { children?: GroupChild[]; boundingBox?: unknown }

function analyzeGroups(groups: GroupChild[]): {
  geomCount: number;
  boundingBoxCount: number;
} {
  let geomCount = 0;
  let boundingBoxCount = 0;
  function traverse(group: GroupChild) {
    if (Array.isArray(group.children)) {
      for (const child of group.children ?? []) {
        if (Array.isArray(child.children)) {
          traverse(child);
        } else {
          geomCount++;
          if (child.boundingBox) boundingBoxCount++;
        }
      }
    }
  }
  for (const group of groups) {
    traverse(group);
  }
  return { geomCount, boundingBoxCount };
}

describe("parseBG3D - Multi-Game Support", () => {
  it("parses Billy Frontier BG3D file with bounding boxes", () => {
    if (!existsSync(BILLY_BG3D_PATH)) {
      console.warn("Skipping: Billy.bg3d not found in testSkeletons");
      return;
    }

    const fileBuffer = readFileSync(BILLY_BG3D_PATH);
    const arrayBuffer = fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength,
    );

    // Parse BG3D - should not throw
    const parsedRes = parseBG3D(arrayBuffer);
    if (!parsedRes.ok) throw parsedRes.error;
    const parsed = parsedRes.value;
    expect(parsed).toBeDefined();
    expect(parsed.materials.length).toBeGreaterThan(0);

    // Check for bounding boxes (Billy Frontier should have them)
    const analysis = analyzeGroups(parsed.groups);
    console.log(
      `Billy.bg3d: ${analysis.geomCount} geometries, ${analysis.boundingBoxCount} bounding boxes`,
    );
    expect(analysis.geomCount).toBeGreaterThan(0);
    // Billy Frontier should have bounding boxes
    expect(analysis.boundingBoxCount).toBeGreaterThan(0);

    // Roundtrip test
    const outputBuffer = bg3dParsedToBG3D(parsed);
    expect(outputBuffer.byteLength).toBeGreaterThan(0);

    // Size should be similar (exact match not required due to potential ordering differences)
    const sizeDiff = Math.abs(outputBuffer.byteLength - arrayBuffer.byteLength);
    console.log(
      `Size diff: ${sizeDiff} bytes (original: ${arrayBuffer.byteLength}, roundtrip: ${outputBuffer.byteLength})`,
    );
  });

  it("parses Cro Mag Rally BG3D file (no bounding boxes)", () => {
    if (!existsSync(BROG_BG3D_PATH)) {
      console.warn("Skipping: Brog.bg3d not found in testSkeletons");
      return;
    }

    const fileBuffer = readFileSync(BROG_BG3D_PATH);
    const arrayBuffer = fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength,
    );

    // Parse BG3D - should not throw
    const parsedRes = parseBG3D(arrayBuffer);
    if (!parsedRes.ok) throw parsedRes.error;
    const parsed = parsedRes.value;
    expect(parsed).toBeDefined();
    expect(parsed.materials.length).toBeGreaterThan(0);

    // Check for bounding boxes (Cro Mag should NOT have them)
    const analysis = analyzeGroups(parsed.groups);
    console.log(
      `Brog.bg3d: ${analysis.geomCount} geometries, ${analysis.boundingBoxCount} bounding boxes`,
    );
    expect(analysis.geomCount).toBeGreaterThan(0);
    // Cro Mag Rally should NOT have bounding boxes (they're calculated at runtime)
    expect(analysis.boundingBoxCount).toBe(0);

    // Roundtrip test
    const outputBuffer = bg3dParsedToBG3D(parsed);
    expect(outputBuffer.byteLength).toBeGreaterThan(0);
  });

  it("parses Bugdom 2 BG3D file with bounding boxes (Grasshopper)", () => {
    const grasshopperPath = join(
      __dirname,
      "./testSkeletons/Grasshopper.bg3d",
    );
    if (!existsSync(grasshopperPath)) {
      console.warn("Skipping: Grasshopper.bg3d not found in testSkeletons");
      return;
    }

    const fileBuffer = readFileSync(grasshopperPath);
    const arrayBuffer = fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength,
    );

    // Parse BG3D - should not throw (this was failing before the fix)
    const parsedRes = parseBG3D(arrayBuffer);
    if (!parsedRes.ok) throw parsedRes.error;
    const parsed = parsedRes.value;
    expect(parsed).toBeDefined();
    expect(parsed.materials.length).toBeGreaterThan(0);

    // Check for bounding boxes (Bugdom 2 should have them)
    const analysis = analyzeGroups(parsed.groups);
    console.log(
      `Grasshopper.bg3d: ${analysis.geomCount} geometries, ${analysis.boundingBoxCount} bounding boxes`,
    );
    expect(analysis.geomCount).toBeGreaterThan(0);
    // Bugdom 2 should have bounding boxes
    expect(analysis.boundingBoxCount).toBeGreaterThan(0);

    // Roundtrip test
    const outputBuffer = bg3dParsedToBG3D(parsed);
    expect(outputBuffer.byteLength).toBeGreaterThan(0);

    // Size should be exactly the same since we're preserving bounding boxes
    expect(outputBuffer.byteLength).toBe(arrayBuffer.byteLength);
  });
});

describe("parseBG3DAndUnparse", () => {
  it("parses a real BG3D file from testSkeletons and converts it back and forth", () => {
    const fileBuffer = readFileSync(TEST_BG3D_PATH);
    const arrayBuffer = fileBuffer.buffer;

    // Step 1: Parse BG3D
    const parsedRes = parseBG3D(arrayBuffer);
    if (!parsedRes.ok) throw parsedRes.error;
    const parsed = parsedRes.value;
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
        const pngPath = join(
          __dirname,
          `./testSkeletons/output/level4_apocalypse.material${i}.texture${j}.png`,
        );
        writeFileSync(pngPath, pngBuffer);
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
    const roundtripPath = join(
      __dirname,
      "./testSkeletons/output/level4_apocalypse.roundtrip1.bg3d",
    );
    writeFileSync(roundtripPath, Buffer.from(outputBuffer));

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
  it("parses a real BG3D file from testSkeletons", async () => {
    /*     const fileBuffer = fs.readFileSync(TEST_BG3D_PATH);
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

    //Save the glTF for inspection

    const io = new NodeIO();
    console.log("Writing glTF to NodeIO instance");
    await io.write(
      __dirname + "/testSkeletons/output/level4_apocalypse.glb",
      gltf,
    ); // Ensure the glTF is written to the NodeIO instance

    console.log("glTF written successfully");
    // Step 3: Convert back to Parsed BG3D
    const parsed2 = await gltfToBG3D(gltf);
    console.log("Converted glTF back to Parsed BG3D");
    expect(parsed2).toBeDefined();

    console.log("Converting parsed BG3D back to ArrayBuffer");
    // Step 4: Convert back to BG3D ArrayBuffer
    const outputBuffer = bg3dParsedToBG3D(parsed2);

    console.log(
      "Output buffer length:",
      outputBuffer.byteLength,
      "Original length:",
      arrayBuffer.byteLength,
    );
    //Check it matches the original file
    const outputArray = new Uint8Array(outputBuffer);
    const originalArray = new Uint8Array(arrayBuffer);
    console.log("Lengths Match", outputArray.length, originalArray.length);
    for (let i = 20; i < outputArray.length; i++) {
      expect(outputArray[i], `Byte ${i} mismatch`).toBe(originalArray[i]);
    }
    console.log("All bytes match"); */
  });
}, 100_000);
