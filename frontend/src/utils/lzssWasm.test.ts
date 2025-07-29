import { expect, test, describe } from "vitest";
import { lzssCompress, lzssDecompress } from "./lzss";

// Import WebAssembly functions (should be available after build)
async function loadWasmModule() {
  try {
    const wasmModule = await import('../wasm/lzss_rust.js');
    await wasmModule.default('/wasm/lzss_rust_bg.wasm');
    return wasmModule;
  } catch (error) {
    console.error('Failed to load WASM module:', error);
    throw error;
  }
}

describe("WebAssembly LZSS Integration", () => {
  test("WASM and JavaScript implementations produce identical results", async () => {
    // Create test data
    const inputDataView = new DataView(new ArrayBuffer(1000));
    for (let i = 0; i < 1000; i++) {
      inputDataView.setUint8(i, Math.floor(Math.random() * 256));
    }

    // JavaScript implementation
    const jsCompressed = lzssCompress(inputDataView);
    const jsDecompressed = lzssDecompress(jsCompressed, 1000);

    // WebAssembly implementation
    const wasm = await loadWasmModule();
    const inputArray = new Uint8Array(inputDataView.buffer);
    const wasmCompressed = wasm.wasm_lzss_compress(inputArray);
    const wasmDecompressed = wasm.wasm_lzss_decompress(wasmCompressed, 1000);

    // Compare compressed data
    expect(wasmCompressed.length).toBe(jsCompressed.byteLength);
    for (let i = 0; i < wasmCompressed.length; i++) {
      expect(wasmCompressed[i]).toBe(jsCompressed.getUint8(i));
    }

    // Compare decompressed data
    expect(wasmDecompressed.length).toBe(jsDecompressed.byteLength);
    for (let i = 0; i < wasmDecompressed.length; i++) {
      expect(wasmDecompressed[i]).toBe(jsDecompressed.getUint8(i));
    }

    // Verify original data is restored
    for (let i = 0; i < inputDataView.byteLength; i++) {
      expect(wasmDecompressed[i]).toBe(inputDataView.getUint8(i));
    }
  });

  test("WASM compression of repeating pattern", async () => {
    // Create a pattern that should compress well
    const inputDataView = new DataView(new ArrayBuffer(1000));
    for (let i = 0; i < 1000; i++) {
      inputDataView.setUint8(i, i % 16);
    }

    const wasm = await loadWasmModule();
    const inputArray = new Uint8Array(inputDataView.buffer);
    const compressed = wasm.wasm_lzss_compress(inputArray);
    const decompressed = wasm.wasm_lzss_decompress(compressed, 1000);

    // Verify decompression
    for (let i = 0; i < 1000; i++) {
      expect(decompressed[i]).toBe(i % 16);
    }

    // Check compression ratio
    const ratio = compressed.length / inputArray.length;
    console.log(`WASM repeating pattern compression ratio: ${ratio.toFixed(2)}`);
    expect(ratio).toBeLessThan(0.5); // Should compress well
  });

  test("WASM compression performance comparison", async () => {
    // Create larger test data
    const size = 10000;
    const inputDataView = new DataView(new ArrayBuffer(size));
    for (let i = 0; i < size; i++) {
      inputDataView.setUint8(i, Math.floor(Math.random() * 256));
    }

    // Time JavaScript implementation
    const jsStartTime = performance.now();
    const jsCompressed = lzssCompress(inputDataView);
    const jsDecompressed = lzssDecompress(jsCompressed, size);
    const jsEndTime = performance.now();
    const jsTime = jsEndTime - jsStartTime;

    // Time WebAssembly implementation
    const wasm = await loadWasmModule();
    const inputArray = new Uint8Array(inputDataView.buffer);
    
    const wasmStartTime = performance.now();
    const wasmCompressed = wasm.wasm_lzss_compress(inputArray);
    const wasmDecompressed = wasm.wasm_lzss_decompress(wasmCompressed, size);
    const wasmEndTime = performance.now();
    const wasmTime = wasmEndTime - wasmStartTime;

    console.log(`JavaScript time: ${jsTime.toFixed(2)}ms`);
    console.log(`WebAssembly time: ${wasmTime.toFixed(2)}ms`);
    console.log(`Speedup: ${(jsTime / wasmTime).toFixed(2)}x`);

    // Verify results are identical
    expect(wasmCompressed.length).toBe(jsCompressed.byteLength);
    expect(wasmDecompressed.length).toBe(jsDecompressed.byteLength);
    
    for (let i = 0; i < wasmDecompressed.length; i++) {
      expect(wasmDecompressed[i]).toBe(jsDecompressed.getUint8(i));
    }
  });

  test("WASM edge cases", async () => {
    const wasm = await loadWasmModule();

    // Test empty data
    const emptyData = new Uint8Array(0);
    const emptyCompressed = wasm.wasm_lzss_compress(emptyData);
    const emptyDecompressed = wasm.wasm_lzss_decompress(emptyCompressed, 0);
    expect(emptyDecompressed.length).toBe(0);

    // Test single byte
    const singleByte = new Uint8Array([42]);
    const singleCompressed = wasm.wasm_lzss_compress(singleByte);
    const singleDecompressed = wasm.wasm_lzss_decompress(singleCompressed, 1);
    expect(singleDecompressed.length).toBe(1);
    expect(singleDecompressed[0]).toBe(42);

    // Test all zeros
    const zeros = new Uint8Array(100).fill(0);
    const zerosCompressed = wasm.wasm_lzss_compress(zeros);
    const zerosDecompressed = wasm.wasm_lzss_decompress(zerosCompressed, 100);
    expect(zerosDecompressed.length).toBe(100);
    for (let i = 0; i < 100; i++) {
      expect(zerosDecompressed[i]).toBe(0);
    }
  });
});