import { expect, test, describe } from "vitest";
import { lzssCompress, lzssDecompress } from "./lzss";
import { imageDataToSixteenBit, sixteenBitToImageData } from "./imageConverter";
import * as fs from 'fs';
import * as path from 'path';

// Import WebAssembly functions for testing
async function loadWasmModule() {
  try {
    const wasmModule = await import('../wasm/lzss_rust.js');
    
    // Load WASM file directly from filesystem for testing
    const wasmPath = path.join(__dirname, '../../public/wasm/lzss_rust_bg.wasm');
    const wasmBytes = fs.readFileSync(wasmPath);
    
    await wasmModule.default(wasmBytes);
    return wasmModule;
  } catch (error) {
    console.error('Failed to load WASM module:', error);
    throw error;
  }
}

// Create simulated Otto Matic terrain image data
function createSimulatedTerrainData(width: number, height: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  
  // Simulate terrain with patterns that should compress well
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      
      // Create terrain-like patterns with grass, dirt, rock colors
      const grass = { r: 34, g: 139, b: 34, a: 255 };
      const dirt = { r: 139, g: 69, b: 19, a: 255 };
      const rock = { r: 105, g: 105, b: 105, a: 255 };
      
      let color;
      if (x % 4 === 0 && y % 4 === 0) {
        color = rock; // Rocks at regular intervals
      } else if ((x + y) % 8 < 4) {
        color = grass; // Grass in checkerboard pattern
      } else {
        color = dirt; // Dirt elsewhere
      }
      
      data[index] = color.r;
      data[index + 1] = color.g;
      data[index + 2] = color.b;
      data[index + 3] = color.a;
    }
  }
  
  return data;
}

describe("Otto Matic Terrain Compatibility Tests", () => {
  test("WASM and JS produce identical results with terrain-like data", async () => {
    // Create simulated 128x128 terrain image
    const width = 128;
    const height = 128;
    const terrainImageData = createSimulatedTerrainData(width, height);
    
    // Convert to 16-bit format (like Otto Matic terrain data)
    const sixteenBitData = imageDataToSixteenBit(terrainImageData);
    
    // Test JavaScript implementation
    const jsCompressed = lzssCompress(sixteenBitData);
    const jsDecompressed = lzssDecompress(jsCompressed, sixteenBitData.byteLength);
    
    // Test WebAssembly implementation
    const wasm = await loadWasmModule();
    const inputArray = new Uint8Array(sixteenBitData.buffer);
    const wasmCompressed = wasm.wasm_lzss_compress(inputArray);
    const wasmDecompressed = wasm.wasm_lzss_decompress(wasmCompressed, sixteenBitData.byteLength);
    
    // Verify compressed data is identical
    expect(wasmCompressed.length).toBe(jsCompressed.byteLength);
    for (let i = 0; i < wasmCompressed.length; i++) {
      expect(wasmCompressed[i]).toBe(jsCompressed.getUint8(i));
    }
    
    // Verify decompressed data is identical
    expect(wasmDecompressed.length).toBe(jsDecompressed.byteLength);
    for (let i = 0; i < wasmDecompressed.length; i++) {
      expect(wasmDecompressed[i]).toBe(jsDecompressed.getUint8(i));
    }
    
    // Check compression ratio
    const compressionRatio = wasmCompressed.length / inputArray.length;
    console.log(`Terrain data compression ratio: ${compressionRatio.toFixed(3)}`);
    
    // Terrain-like data should compress reasonably well
    expect(compressionRatio).toBeLessThan(0.8);
  });

  test("Round-trip conversion with imageConverter functions", async () => {
    // Create test image data
    const width = 64;
    const height = 64;
    const originalImageData = createSimulatedTerrainData(width, height);
    
    // Convert to 16-bit, compress with WASM, decompress, convert back
    const sixteenBitData = imageDataToSixteenBit(originalImageData);
    
    const wasm = await loadWasmModule();
    const inputArray = new Uint8Array(sixteenBitData.buffer);
    const compressed = wasm.wasm_lzss_compress(inputArray);
    const decompressed = wasm.wasm_lzss_decompress(compressed, sixteenBitData.byteLength);
    
    // Convert back to image data
    const decompressedDataView = new DataView(decompressed.buffer);
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    
    const finalImageData = ctx.getImageData(0, 0, width, height);
    sixteenBitToImageData(decompressedDataView, finalImageData);
    
    // Compare original and final image data
    // Note: 16-bit conversion loses some precision (8-bit to 5-bit per channel)
    // so we check that colors are approximately correct
    let totalDifference = 0;
    let maxDifference = 0;
    
    for (let i = 0; i < originalImageData.length; i += 4) {
      // Skip alpha channel for this test as it's handled differently
      for (let j = 0; j < 3; j++) {
        const original = originalImageData[i + j];
        const final = finalImageData.data[i + j];
        const diff = Math.abs(original - final);
        totalDifference += diff;
        maxDifference = Math.max(maxDifference, diff);
      }
    }
    
    const avgDifference = totalDifference / (originalImageData.length * 3 / 4);
    console.log(`Average color difference: ${avgDifference.toFixed(2)}`);
    console.log(`Maximum color difference: ${maxDifference}`);
    
    // Due to 16-bit conversion, expect some loss but not too much
    expect(avgDifference).toBeLessThan(10); // Average difference less than 10 color values
    expect(maxDifference).toBeLessThan(32); // Max difference less than 32 color values
  });

  test("Worker-style image processing", async () => {
    // Simulate the worker processing workflow
    const width = 32;
    const height = 32;
    const imageData = createSimulatedTerrainData(width, height);
    
    // Step 1: Convert to 16-bit (like imageDataToSixteenBit in worker)
    const sixteenBitData = imageDataToSixteenBit(imageData);
    
    // Step 2: Compress with WASM (like WASM compression in worker)
    const wasm = await loadWasmModule();
    const inputArray = new Uint8Array(sixteenBitData.buffer);
    const compressed = wasm.wasm_lzss_compress(inputArray);
    
    console.log(`Original size: ${inputArray.length} bytes`);
    console.log(`Compressed size: ${compressed.length} bytes`);
    console.log(`Compression ratio: ${(compressed.length / inputArray.length).toFixed(3)}`);
    
    // Step 3: Decompress (like WASM decompression in worker)
    const decompressed = wasm.wasm_lzss_decompress(compressed, sixteenBitData.byteLength);
    
    // Step 4: Convert back to ImageData (like sixteenBitToImageData in worker)
    const decompressedDataView = new DataView(decompressed.buffer);
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    
    const resultImageData = ctx.getImageData(0, 0, width, height);
    sixteenBitToImageData(decompressedDataView, resultImageData);
    
    // Verify the process worked
    expect(decompressed.length).toBe(sixteenBitData.byteLength);
    expect(resultImageData.width).toBe(width);
    expect(resultImageData.height).toBe(height);
    expect(resultImageData.data.length).toBe(width * height * 4);
  });

  test("Endianness handling in image conversion", async () => {
    // Test that our endianness fixes work correctly
    const testData = new Uint8ClampedArray([
      255, 0, 0, 255,   // Red pixel
      0, 255, 0, 255,   // Green pixel  
      0, 0, 255, 255,   // Blue pixel
      255, 255, 255, 255 // White pixel
    ]);
    
    // Convert to 16-bit with explicit endianness
    const sixteenBit = imageDataToSixteenBit(testData);
    
    // Check that the first pixel (red) has the expected value
    // Red (255, 0, 0) -> (31, 0, 0) in 5-bit -> 0x7C00 in big-endian
    const firstPixel = sixteenBit.getUint16(0, false); // Explicitly big-endian
    expect(firstPixel).toBe(0x7C00); // Red in 15-bit format
    
    // Convert back to image data
    const canvas = new OffscreenCanvas(2, 2);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    
    const resultImageData = ctx.getImageData(0, 0, 2, 2);
    sixteenBitToImageData(sixteenBit, resultImageData);
    
    // Check that red pixel is still red (approximately)
    expect(resultImageData.data[0]).toBeGreaterThan(240); // Red channel
    expect(resultImageData.data[1]).toBeLessThan(10);     // Green channel
    expect(resultImageData.data[2]).toBeLessThan(10);     // Blue channel
  });
});