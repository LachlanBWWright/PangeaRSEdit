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
    }
  | {
      id: number;
      type: "batch_compress";
      tasks: Array<{
        id: number;
        uIntArray: Uint8ClampedArray;
      }>;
    }
  | {
      id: number;
      type: "batch_decompress";
      tasks: Array<{
        id: number;
        compressedDataView: DataView;
        outputSize: number;
        width: number;
        height: number;
      }>;
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
    }
  | {
      id: number;
      type: "batch_compressRes";
      results: Array<{
        id: number;
        dataBuffer: ArrayBuffer;
      }>;
    }
  | {
      id: number;
      type: "batch_decompressRes";
      results: Array<{
        id: number;
        imageData: ImageData;
      }>;
    }
  | {
      id: number;
      type: "error";
      error: string;
    };

// Global reference to the WASM module
let wasmModule: any = null;

async function initWasm() {
  if (wasmModule) return wasmModule;
  
  try {
    // Import the WASM module
    const wasmImport = await import('../wasm/lzss_rust.js');
    
    // Initialize the WASM module with the WASM file from public directory
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
    
    else if (event.data.type === "decompress") {
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

    else if (event.data.type === "batch_compress") {
      const { tasks } = event.data;
      
      // Prepare tasks for WASM batch processing
      const wasmTasks = tasks.map(task => {
        const decompressedDataView = imageDataToSixteenBit(task.uIntArray);
        return {
          id: task.id,
          data: Array.from(new Uint8Array(decompressedDataView.buffer)),
        };
      });

      // Use WASM batch compression function
      const wasmResults = wasm.wasm_lzss_compress_batch(wasmTasks);
      
      // Convert results back to expected format
      const results = wasmResults.map((result: any) => ({
        id: result.id,
        dataBuffer: new Uint8Array(result.compressed_data).buffer,
      }));

      postMessage({
        id: event.data.id,
        type: "batch_compressRes",
        results: results,
      } satisfies LzssResponse);
    }

    else if (event.data.type === "batch_decompress") {
      const { tasks } = event.data;
      
      // Process each task individually for now (can be optimized later)
      const results = [];
      
      for (const task of tasks) {
        const { compressedDataView, outputSize, width, height } = task;
        
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

        results.push({
          id: task.id,
          imageData: imageData,
        });
      }

      postMessage({
        id: event.data.id,
        type: "batch_decompressRes",
        results: results,
      } satisfies LzssResponse);
    }
  } catch (error) {
    console.error('Error in WASM worker:', error);
    postMessage({
      id: event.data.id,
      type: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    } satisfies LzssResponse);
  }
};
