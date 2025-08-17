import { imageDataToSixteenBit, sixteenBitToImageData } from "./imageConverter";

export type LzssMessage =
  | {
      id: number;
      type: "compress";
      uIntArray: Uint8ClampedArray;
    }
  | {
      id: number;
      type: "decompress";
      compressedDataView: DataView;
      outputSize: number;
      width: number;
      height: number;
    };

export type LzssResponse =
  | {
      id: number;
      type: "compressRes";
      dataBuffer: ArrayBuffer;
    }
  | {
      id: number;
      type: "decompressRes";
      imageData: ImageData;
    };

// Global reference to the WASM module
let wasmModule: any = null;

async function initWasm() {
  if (wasmModule) return wasmModule;
  
  try {
    // Import the WASM module
    const wasmImport = await import('../wasm/lzss_rust.js');
    
    // Initialize the WASM module with the WASM file from public directory
    // Use base URL to ensure correct path resolution
    await wasmImport.default('/PangeaRSEdit/wasm/lzss_rust_bg.wasm');
    
    wasmModule = wasmImport;
    return wasmModule;
  } catch (error) {
    console.error('Failed to load WASM module:', error);
    throw error;
  }
}

onmessage = async (event: MessageEvent<LzssMessage>) => {
  try {
    // Initialize WASM if not already done
    const wasm = await initWasm();
    
    if (event.data.type === "compress") {
      const decompressedDataView = imageDataToSixteenBit(event.data.uIntArray);
      
      // Convert DataView to Uint8Array for WASM
      const inputArray = new Uint8Array(decompressedDataView.buffer);
      
      // Use WASM compression function
      const compressedArray = wasm.wasm_lzss_compress(inputArray);
      
      postMessage(
        {
          id: event.data.id,
          type: "compressRes",
          dataBuffer: compressedArray.buffer,
        } satisfies LzssResponse,
      );
    }
    
    if (event.data.type === "decompress") {
      const { compressedDataView, outputSize, width, height } = event.data;
      
      // Convert DataView to Uint8Array for WASM
      const compressedArray = new Uint8Array(compressedDataView.buffer);
      
      // Use WASM decompression function
      const decompressedArray = wasm.wasm_lzss_decompress(compressedArray, outputSize);
      
      // Convert back to DataView
      const decompressedDataView = new DataView(decompressedArray.buffer);

      const imgCanvas = new OffscreenCanvas(width, height);
      imgCanvas.width = width;
      imgCanvas.height = height;
      const imgCtx = imgCanvas.getContext("2d");

      const imageData = imgCtx?.getImageData(
        0,
        0,
        imgCanvas.width,
        imgCanvas.height,
      );

      if (!imageData) {
        throw new Error("Failed to create ImageData");
      }

      sixteenBitToImageData(decompressedDataView, imageData);

      if (!imgCtx) {
        throw new Error("Failed to get canvas context");
      }

      postMessage({
        id: event.data.id,
        type: "decompressRes",
        imageData: imageData,
      } satisfies LzssResponse);
    }
  } catch (error) {
    console.error('Error in WASM worker:', error);
    // Optionally send error message back to main thread
    postMessage({
      id: event.data.id,
      type: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};