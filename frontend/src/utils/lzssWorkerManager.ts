import { LzssMessage, LzssResponse } from "./lzssWorker";

export interface BatchCompressionTask {
  id: number;
  uIntArray: Uint8ClampedArray;
}

export interface BatchDecompressionTask {
  id: number;
  compressedDataView: DataView;
  outputSize: number;
  width: number;
  height: number;
}

export interface BatchCompressionResult {
  id: number;
  dataBuffer: ArrayBuffer;
}

export interface BatchDecompressionResult {
  id: number;
  imageData: ImageData;
}

/**
 * Singleton worker manager that maintains a single LZSS worker
 * and provides batch processing capabilities using WASM multithreading
 */
class LzssWorkerManager {
  private static instance: LzssWorkerManager;
  private worker: Worker | null = null;
  private taskCounter = 0;
  private pendingTasks = new Map<number, {
    resolve: (result: any) => void;
    reject: (error: any) => void;
  }>();

  private constructor() {}

  public static getInstance(): LzssWorkerManager {
    if (!LzssWorkerManager.instance) {
      LzssWorkerManager.instance = new LzssWorkerManager();
    }
    return LzssWorkerManager.instance;
  }

  private async initWorker(): Promise<Worker> {
    if (this.worker) {
      return this.worker;
    }

    // Import the worker dynamically
    const LzssWorker = (await import("./lzssWorker?worker")).default;
    this.worker = new LzssWorker();

    this.worker.onmessage = (event: MessageEvent<LzssResponse>) => {
      const { id } = event.data;
      const pendingTask = this.pendingTasks.get(id);
      
      if (pendingTask) {
        this.pendingTasks.delete(id);
        if (event.data.type === "error") {
          pendingTask.reject(new Error((event.data as any).error));
        } else {
          pendingTask.resolve(event.data);
        }
      }
    };

    this.worker.onerror = (error) => {
      console.error("Worker error:", error);
      // Reject all pending tasks
      for (const [id, task] of this.pendingTasks) {
        task.reject(new Error("Worker error"));
        this.pendingTasks.delete(id);
      }
    };

    return this.worker;
  }

  /**
   * Compress a single image
   */
  public async compressImage(uIntArray: Uint8ClampedArray): Promise<ArrayBuffer> {
    const worker = await this.initWorker();
    const taskId = this.taskCounter++;

    return new Promise<ArrayBuffer>((resolve, reject) => {
      this.pendingTasks.set(taskId, {
        resolve: (result: LzssResponse) => {
          if (result.type === "compressRes") {
            resolve(result.dataBuffer);
          } else {
            reject(new Error("Unexpected response type"));
          }
        },
        reject,
      });

      worker.postMessage({
        id: taskId,
        type: "compress",
        uIntArray,
      } as LzssMessage, [uIntArray.buffer]);
    });
  }

  /**
   * Decompress a single image
   */
  public async decompressImage(
    compressedDataView: DataView,
    outputSize: number,
    width: number,
    height: number
  ): Promise<ImageData> {
    const worker = await this.initWorker();
    const taskId = this.taskCounter++;

    return new Promise<ImageData>((resolve, reject) => {
      this.pendingTasks.set(taskId, {
        resolve: (result: LzssResponse) => {
          if (result.type === "decompressRes") {
            resolve(result.imageData);
          } else {
            reject(new Error("Unexpected response type"));
          }
        },
        reject,
      });

      worker.postMessage({
        id: taskId,
        type: "decompress",
        compressedDataView,
        outputSize,
        width,
        height,
      } as LzssMessage);
    });
  }

  /**
   * Compress multiple images in batch using WASM multithreading
   */
  public async compressBatch(tasks: BatchCompressionTask[]): Promise<BatchCompressionResult[]> {
    // For batch operations, we can use direct WASM calls since they now support multithreading
    const wasmModule = await this.getWasmModule();
    
    // Convert tasks to WASM format
    const wasmTasks = tasks.map(task => ({
      id: task.id,
      data: Array.from(new Uint8Array(task.uIntArray.buffer)),
    }));

    try {
      // Use the batch compression function
      const results = wasmModule.wasm_lzss_compress_batch(wasmTasks);
      
      // Convert results back to the expected format
      return results.map((result: any) => ({
        id: result.id,
        dataBuffer: new Uint8Array(result.compressed_data).buffer,
      }));
    } catch (error) {
      console.error("Batch compression error:", error);
      throw error;
    }
  }

  /**
   * Decompress multiple images sequentially using the single worker
   * This avoids the complexity of batch ImageData creation
   */
  public async decompressBatch(tasks: BatchDecompressionTask[]): Promise<BatchDecompressionResult[]> {
    const results: BatchDecompressionResult[] = [];
    
    // Process tasks sequentially to avoid memory issues
    for (const task of tasks) {
      try {
        const imageData = await this.decompressImage(
          task.compressedDataView,
          task.outputSize,
          task.width,
          task.height
        );
        
        results.push({
          id: task.id,
          imageData,
        });
      } catch (error) {
        console.error(`Failed to decompress task ${task.id}:`, error);
        throw error;
      }
    }
    
    return results;
  }

  private async getWasmModule(): Promise<any> {
    try {
      // Import the WASM module
      const wasmImport = await import('../wasm/lzss_rust.js');
      
      // Initialize the WASM module
      await wasmImport.default('/PangeaRSEdit/wasm/lzss_rust_bg.wasm');
      
      return wasmImport;
    } catch (error) {
      console.error('Failed to load WASM module:', error);
      throw error;
    }
  }

  /**
   * Dispose of the worker and clean up resources
   */
  public dispose(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    
    // Reject all pending tasks
    for (const [id, task] of this.pendingTasks) {
      task.reject(new Error("Worker disposed"));
      this.pendingTasks.delete(id);
    }
  }
}

// Export singleton instance
export const lzssWorkerManager = LzssWorkerManager.getInstance();