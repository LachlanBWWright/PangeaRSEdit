import { PyodideMessage, PyodideResponse } from "../../python/pyodideWorker";
import { LzssMessage, LzssResponse } from "@/utils/lzssWorker";
import LzssWorker from "../utils/lzssWorker?worker";
import { LevelData } from "@/python/structSpecs/LevelTypes";
import { DataType, TileImageFormat, type GlobalsInterface } from "../globals/globals";
import { validateResourceForkJson } from "../utils/levelDataUtils";
import { toast } from "../../hooks/use-toast";

/**
 * Save and download map and images as in IntroPrompt
 */
export async function saveMap({
  mapFile,
  mapImagesFile,
  mapImages,
  data,
  pyodideWorker,
  globals,
  toast,
}: {
  mapFile: File | undefined;
  mapImagesFile: File | undefined;
  mapImages: HTMLCanvasElement[] | undefined;
  data: LevelData;
  pyodideWorker: Worker;
  globals: GlobalsInterface;
  toast: (opts: { title: string; description?: string }) => void;
}) {
  // Allow RSRC_FORK games to save even if a separate images file isn't present
  if (!mapFile || (globals.DATA_TYPE !== DataType.RSRC_FORK && !mapImagesFile)) return;

  // Download Images
  if (mapImages) {
    toast({
      title: "Saving Map",
      description: "Compressing textures",
    });

    const bufferList = await compressMapImages(mapImages);
    const imageDownloadBuffer = combineBuffersForDownload(bufferList);
    downloadBlob(imageDownloadBuffer, mapImagesFile?.name || "images", ".ter");
  }

  console.log("TESThhhhhhh\n\n\n\n\n\n\ne\n\n\n\n\n\n\n");
  toast({
    title: "Saving Map",
    description: "Processing map data test (THIS FILE IS NOT USED)",
  });

  if (globals.TILE_IMAGE_FORMAT === TileImageFormat.JPG) {
    //TODO: JPEG-based map logic (e.g., Nanosaur 2)
  }
  //if bugdom 1 (resource fork)
  else if (globals.DATA_TYPE === DataType.RSRC_FORK) {
    // For RSRC_FORK (Bugdom 1), Timg should be embedded in `data` and pyodide
    // should serialize it into the single .ter.rsrc file. Serialize and
    // download the combined resource fork map file.
    const mapBuffer = await processMapData({ data, pyodideWorker, globals });
    downloadBlob(mapBuffer, mapFile.name, ".ter.rsrc");
    toast({
      title: "Map Downloaded!",
    });
  } else if (globals.DATA_TYPE === DataType.TRT_FILE) {
    // Nanosaur 1: Compile back to .ter format
    const { compileNanosaur1Level } = await import("@/editor/loadLogic/compileNanosaur1Level");
    
    // We need the original raw level data to preserve binary-specific information
    // This should be stored in data._metadata if available
    const rawLevelData = (data as unknown as { _metadata?: { 1000?: { obj?: { nanosaur1RawLevel?: unknown } } } })?._metadata?.[1000]?.obj?.nanosaur1RawLevel;
    
    if (!rawLevelData) {
      toast({
        title: "Cannot save Nanosaur 1 level",
        description: "Original level data not found in metadata",
      });
      return;
    }
    
    const compileResult = compileNanosaur1Level(data, rawLevelData as ReturnType<typeof parseNanosaur1Level>);
    
    if (!compileResult.ok) {
      toast({
        title: "Failed to compile Nanosaur 1 level",
        description: compileResult.error.message,
      });
      return;
    }
    
    downloadBlob(compileResult.value, mapFile.name, ".ter");
    toast({
      title: "Nanosaur 1 Map Downloaded!",
    });
  } else if (globals.GAME_NAME === "Mighty Mike") {
    // Mighty Mike: Compile back to .map format
    const { mightyMikeMapToCompressedBinary } = await import("@/modelParsers/parseMightyMike");
    
    // Extract Mighty Mike-specific data from metadata
    const mightyMikeData = (data as unknown as { _metadata?: { 1000?: { obj?: { mightyMikeMapData?: unknown } } } })?._metadata?.[1000]?.obj?.mightyMikeMapData;
    
    if (!mightyMikeData) {
      toast({
        title: "Cannot save Mighty Mike level",
        description: "Original level data not found in metadata",
      });
      return;
    }
    
    const mapBuffer = mightyMikeMapToCompressedBinary(mightyMikeData as Parameters<typeof mightyMikeMapToCompressedBinary>[0]);
    downloadBlob(mapBuffer, mapFile.name, ".map");
    toast({
      title: "Mighty Mike Map Downloaded!",
    });
  } else {
    const mapBuffer = await processMapData({ data, pyodideWorker, globals });
    console.log("test\n\n\n");
    downloadBlob(mapBuffer, mapFile.name, ".ter.rsrc");
    toast({
      title: "Map Downloaded!",
    });
  }
}

function downloadBlob(buffer: ArrayBuffer, filename: string, mime: string) {
  const blob = new Blob([buffer], { type: mime });
  const url = URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");
  downloadLink.href = url;
  downloadLink.setAttribute("download", filename);
  downloadLink.click();
}

async function processMapData({
  data,
  pyodideWorker,
  globals,
}: {
  data: LevelData;
  pyodideWorker: Worker;
  globals: GlobalsInterface;
}): Promise<ArrayBuffer> {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    console.log("saving");
    console.log(data);
    // Validate the JSON before passing to pyodide to avoid uncaught Python assertion errors
    const validation = validateResourceForkJson(data as unknown as Record<string, unknown>);
    if (!validation.ok) {
      console.error("Invalid JSON for resource fork:", validation);
      toast({
        title: "Saving failed",
        description: `Invalid map data structure: ${validation.message}`,
      });
      return new ArrayBuffer(0);
    }

    pyodideWorker.postMessage({
      type: "load_bytes_from_json",
      json_blob: data,
      converters: globals.STRUCT_SPECS,
      only_types: [],
      skip_types: [],
      adf: "True",
    } satisfies PyodideMessage);

    pyodideWorker.onmessage = (event: MessageEvent<PyodideResponse>) => {
      if (event.data.type === "load_bytes_from_json") {
        resolve(event.data.result);
      } else {
        reject(new Error("Unexpected response from pyodide worker"));
      }
    };
  });
}

async function compressMapImages(
  mapImages: HTMLCanvasElement[],
): Promise<DataView[]> {
  return new Promise((res, err) => {
    const compressedTextures: DataView[] = new Array(mapImages.length);
    const resolvedTextures = { count: 0 };
    console.time("compress");
    for (let i = 0; i < mapImages.length; i++) {
      const canvas = mapImages[i];
      if (!canvas) {
        err(new Error(`Canvas at index ${i} is undefined`));
        return;
      }
      const canvasCtx = canvas.getContext("2d");
      if (!canvasCtx) {
        err(new Error("Could not get canvas context"));
        return;
      }
      const imageData = canvasCtx.getImageData(
        0,
        0,
        canvas.width,
        canvas.height,
      );
      const lzssWorker = new LzssWorker();
      lzssWorker.onmessage = (e: MessageEvent<LzssResponse>) => {
        const data = e.data;
        if (data.type !== "compressRes") return;
        compressedTextures[data.id] = new DataView(data.dataBuffer);
        resolvedTextures.count++;
        if (resolvedTextures.count === mapImages.length) {
          console.timeEnd("compress");
          res(compressedTextures);
        }
        lzssWorker.terminate();
      };
      lzssWorker.postMessage(
        {
          uIntArray: imageData.data,
          type: "compress",
          id: i,
        } satisfies LzssMessage,
        [imageData.data.buffer],
      );
    }
  });
}

function combineBuffersForDownload(bufferList: DataView[]): ArrayBuffer {
  let totalSize = 0;
  for (const buffer of bufferList) {
    totalSize += 4 + buffer.byteLength; // 4 bytes for size header + buffer size
  }
  const imageDownloadBuffer = new DataView(new ArrayBuffer(totalSize));
  let pos2 = 0;
  for (let i = 0; i < bufferList.length; i++) {
    const buffer = bufferList[i];
    if (!buffer) continue;
    imageDownloadBuffer.setInt32(pos2, buffer.byteLength);
    pos2 += 4;
    for (let j = 0; j < buffer.byteLength; j++) {
      imageDownloadBuffer.setUint8(pos2, buffer.getUint8(j));
      pos2++;
    }
  }
  return imageDownloadBuffer.buffer;
}
