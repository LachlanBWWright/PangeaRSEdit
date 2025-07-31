import { describe, it, expect } from "vitest";
import { parseBG3D, bg3dParsedToBG3D } from "./parseBG3D";
import * as fs from "fs";
import * as path from "path";

import { argb16ToPng, rgba8ToPng } from "./image/pngArgb";

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
  "./testSkeletons/level4_apocalypse.bg3d",
);

const DESERT_BG3D_PATH = path.join(
  __dirname,
  "./testSkeletons/desert.bg3d",
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
          `./testSkeletons/output/level4_apocalypse.material${i}.texture${j}.png`,
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
      "./testSkeletons/output/level4_apocalypse.roundtrip1.bg3d",
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

describe("Desert BG3D with JPEGTEXTURE support", () => {
  it("parses desert.bg3d file containing JPEGTEXTURE tags", () => {
    const fileBuffer = fs.readFileSync(DESERT_BG3D_PATH);
    const arrayBuffer = fileBuffer.buffer;

    // Parse the file
    const parsed = parseBG3D(arrayBuffer);
    expect(parsed).toBeDefined();
    expect(parsed.materials).toBeDefined();
    expect(parsed.groups).toBeDefined();

    console.log("Desert.bg3d parsed successfully");
    console.log(`Materials: ${parsed.materials.length}`);

    // Check if any materials have JPEG textures
    let totalJpegTextures = 0;
    let totalRegularTextures = 0;
    
    parsed.materials.forEach((material, i) => {
      totalJpegTextures += material.jpegTextures?.length || 0;
      totalRegularTextures += material.textures?.length || 0;
      
      if (material.jpegTextures && material.jpegTextures.length > 0) {
        console.log(`Material ${i} has ${material.jpegTextures.length} JPEG textures`);
        material.jpegTextures.forEach((jpegTex, j) => {
          expect(jpegTex.width).toBeGreaterThan(0);
          expect(jpegTex.height).toBeGreaterThan(0);
          expect(jpegTex.bufferSize).toBeGreaterThan(0);
          expect(jpegTex.jpegData).toBeDefined();
          expect(jpegTex.jpegData.length).toBe(jpegTex.bufferSize);
          console.log(`  JPEG texture ${j}: ${jpegTex.width}x${jpegTex.height}, ${jpegTex.bufferSize} bytes`);
        });
      }
    });

    console.log(`Total JPEG textures: ${totalJpegTextures}`);
    console.log(`Total regular textures: ${totalRegularTextures}`);
    expect(totalJpegTextures).toBeGreaterThan(0); // Desert should have JPEG textures
  });

  it("round-trip conversion of desert.bg3d preserves JPEG textures", () => {
    const fileBuffer = fs.readFileSync(DESERT_BG3D_PATH);
    const arrayBuffer = fileBuffer.buffer;

    // Parse -> Serialize -> Parse again
    const parsed1 = parseBG3D(arrayBuffer);
    const serialized = bg3dParsedToBG3D(parsed1);
    const parsed2 = parseBG3D(serialized);

    // Verify JPEG textures are preserved
    expect(parsed2.materials.length).toBe(parsed1.materials.length);
    
    let originalJpegCount = 0;
    let roundtripJpegCount = 0;
    
    for (let i = 0; i < parsed1.materials.length; i++) {
      const original = parsed1.materials[i];
      const roundtrip = parsed2.materials[i];
      
      originalJpegCount += original.jpegTextures?.length || 0;
      roundtripJpegCount += roundtrip.jpegTextures?.length || 0;
      
      if (original.jpegTextures && roundtrip.jpegTextures) {
        expect(roundtrip.jpegTextures.length).toBe(original.jpegTextures.length);
        
        for (let j = 0; j < original.jpegTextures.length; j++) {
          const origTex = original.jpegTextures[j];
          const roundTex = roundtrip.jpegTextures[j];
          
          expect(roundTex.width).toBe(origTex.width);
          expect(roundTex.height).toBe(origTex.height);
          expect(roundTex.bufferSize).toBe(origTex.bufferSize);
          expect(roundTex.jpegData.length).toBe(origTex.jpegData.length);
          
          // Compare JPEG data byte-by-byte
          for (let k = 0; k < origTex.jpegData.length; k++) {
            expect(roundTex.jpegData[k]).toBe(origTex.jpegData[k]);
          }
        }
      }
    }
    
    expect(roundtripJpegCount).toBe(originalJpegCount);
    console.log(`Preserved ${roundtripJpegCount} JPEG textures through round-trip`);
  });

  it("verifies desert.bg3d is compatible with new parser (no errors)", () => {
    // This test ensures the desert.bg3d file doesn't trigger any unknown tag errors
    const fileBuffer = fs.readFileSync(DESERT_BG3D_PATH);
    const arrayBuffer = fileBuffer.buffer;

    // This should not throw any errors
    expect(() => parseBG3D(arrayBuffer)).not.toThrow();
    
    const parsed = parseBG3D(arrayBuffer);
    expect(parsed).toBeDefined();
    expect(parsed.materials.length).toBeGreaterThan(0);
    expect(parsed.groups.length).toBeGreaterThan(0);
    
    console.log("Desert.bg3d parsed without errors - demonstrating improved parser capability");
  });

  it("correctly identifies JPEG texture format in desert.bg3d", () => {
    const fileBuffer = fs.readFileSync(DESERT_BG3D_PATH);
    const arrayBuffer = fileBuffer.buffer;

    const parsed = parseBG3D(arrayBuffer);
    
    // Find materials with JPEG textures
    const materialsWithJpeg = parsed.materials.filter(mat => 
      mat.jpegTextures && mat.jpegTextures.length > 0
    );
    
    expect(materialsWithJpeg.length).toBeGreaterThan(0);
    
    materialsWithJpeg.forEach(material => {
      material.jpegTextures.forEach(jpegTex => {
        // Verify JPEG header (should start with FF D8)
        expect(jpegTex.jpegData[0]).toBe(0xFF);
        expect(jpegTex.jpegData[1]).toBe(0xD8);
        console.log(`Verified JPEG header for ${jpegTex.width}x${jpegTex.height} texture`);
      });
    });
  });
});
