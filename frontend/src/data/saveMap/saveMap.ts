import { PyodideMessage, PyodideResponse } from "../../python/pyodideWorker";
import { LzssMessage, LzssResponse } from "@/utils/lzssWorker";
import LzssWorker from "../utils/lzssWorker?worker";
import { ottoMaticLevel } from "../../python/structSpecs/ottoMaticInterface";
import { Game, type GlobalsInterface } from "../globals/globals";

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
  data: ottoMaticLevel;
  pyodideWorker: Worker;
  globals: GlobalsInterface;
  toast: (opts: { title: string; description?: string }) => void;
}) {
  if (!mapFile || !mapImagesFile) return;

  // Download Images
  if (mapImages) {
    toast({
      title: "Saving Map",
      description: "Compressing textures",
    });

    const bufferList = await compressMapImages(mapImages);
    const imageDownloadBuffer = combineBuffersForDownload(bufferList);
    downloadBlob(imageDownloadBuffer, mapImagesFile.name, ".ter");
  }

  console.log("TESThhhhhhh\n\n\n\n\n\n\ne\n\n\n\n\n\n\n");
  toast({
    title: "Saving Map",
    description: "Processing map data test (THIS FILE IS NOT USED)",
  });

  if (globals.GAME_TYPE === Game.NANOSAUR_2) {
    //TODO: Nanosaur 2 map logic
  }
  //if bugdom 1
  else if (globals.GAME_TYPE === Game.BUGDOM) {
    //Should save images here too as Bugdom 1 has terrain and image data in the same file
    //TODO
  } else if (globals.GAME_TYPE === Game.NANOSAUR) {
    //TODO
  } else {
    const mapBuffer = await processMapData({ data, pyodideWorker, globals });
    console.log("test\n\n\n");
    downloadBlob(mapBuffer, mapFile.name, ".ter.rsrc");
  }

  toast({
    title: "Map Downloaded!",
  });
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
  data: ottoMaticLevel;
  pyodideWorker: Worker;
  globals: GlobalsInterface;
}): Promise<ArrayBuffer> {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    console.log("saving");
    console.log(data);
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
      const canvasCtx = mapImages[i].getContext("2d");
      if (!canvasCtx) {
        err(new Error("Could not get canvas context"));
        return;
      }
      const imageData = canvasCtx.getImageData(
        0,
        0,
        mapImages[i].width,
        mapImages[i].height,
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
    imageDownloadBuffer.setInt32(pos2, buffer.byteLength);
    pos2 += 4;
    for (let j = 0; j < buffer.byteLength; j++) {
      imageDownloadBuffer.setUint8(pos2, buffer.getUint8(j));
      pos2++;
    }
  }
  return imageDownloadBuffer.buffer;
}
