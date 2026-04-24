import { LzssMessage, LzssResponse } from "@/utils/lzssWorker";
import LzssWorker from "../../utils/lzssWorker?worker";
import { LevelData } from "@/python/structSpecs/LevelTypes";
import { DataType, type GlobalsInterface } from "../globals/globals";
import {
  validateResourceForkJson,
  sanitizeResourceForkJson,
} from "../utils/levelDataUtils";
import { toast } from "../../hooks/use-toast";
import { loadBytesFromJson } from "@lachlanbwwright/rsrcdump-ts";
import { err, ok, type Result } from "neverthrow";
import { bufferToHex } from "@/utils/bufferOperations";
import { canvasDataToSixteenBit } from "@/utils/imageConverter";

function copyToArrayBuffer(data: ArrayBufferView): ArrayBuffer {
  const copy = new ArrayBuffer(data.byteLength);
  new Uint8Array(copy).set(
    new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
  );
  return copy;
}

export function serializeBugdomTileImages(
  mapImages: HTMLCanvasElement[],
): Result<string, Error> {
  const serializedTiles: string[] = [];
  for (let i = 0; i < mapImages.length; i += 1) {
    const canvas = mapImages[i];
    if (!canvas) return err(new Error(`Tile image at index ${i} is missing`));
    const encodedTile = canvasDataToSixteenBit(canvas);
    if (encodedTile.isErr())
      return err(
        new Error(
          `Failed to serialize tile image #${i}: ${encodedTile.error.message}`,
        ),
      );
    serializedTiles.push(bufferToHex(copyToArrayBuffer(encodedTile.value)));
  }
  return ok(serializedTiles.join(""));
}

export function downloadBlob(
  buffer: ArrayBuffer,
  filename: string,
  mime: string,
) {
  const blob = new Blob([buffer], { type: mime });
  const url = URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");
  downloadLink.href = url;
  downloadLink.setAttribute("download", filename);
  downloadLink.click();
}

export async function processMapData({
  data,
  globals,
  mapImages,
}: {
  data: LevelData;
  globals: GlobalsInterface;
  mapImages?: HTMLCanvasElement[];
}): Promise<ArrayBuffer> {
  const sanitized = sanitizeResourceForkJson(data);
  const validation = validateResourceForkJson(sanitized);
  if (validation.isErr()) {
    console.error("Invalid JSON for resource fork:", validation.error);
    toast({
      title: "Saving failed",
      description: `Invalid map data structure: ${validation.error.message}`,
    });
    return new ArrayBuffer(0);
  }

  if (
    globals.DATA_TYPE === DataType.RSRC_FORK &&
    mapImages &&
    mapImages.length > 0
  ) {
    const tileDataResult = serializeBugdomTileImages(mapImages);
    if (tileDataResult.isErr()) {
      console.error("Failed to serialize tile images:", tileDataResult.error);
      toast({
        title: "Saving failed",
        description: tileDataResult.error.message,
      });
      return new ArrayBuffer(0);
    }

    const sanitizedWithTimg = sanitized as typeof sanitized & {
      Timg?: Record<number, { name: string; data: string; order: number }>;
    };
    sanitizedWithTimg.Timg ??= {};
    sanitizedWithTimg.Timg[1000] ??= {
      name: "Extracted Tile Image Data 32x32/16bit",
      data: "",
      order: 1000,
    };
    sanitizedWithTimg.Timg[1000].data = tileDataResult.value;
  }

  const saveResult = loadBytesFromJson(
    sanitized,
    globals.STRUCT_SPECS,
    [],
    [],
    true,
  );
  const serializedResult = saveResult.ok
    ? ok(saveResult.value)
    : err(saveResult.error);
  if (serializedResult.isErr()) {
    const saveErrorMsg =
      typeof serializedResult.error === "string"
        ? serializedResult.error
        : String(serializedResult.error);
    console.error("Failed to serialize:", saveErrorMsg);
    toast({ title: "Saving failed", description: saveErrorMsg });
    return new ArrayBuffer(0);
  }

  const out = serializedResult.value;
  const buffer = out.buffer;
  if (buffer instanceof ArrayBuffer)
    return buffer.slice(out.byteOffset, out.byteOffset + out.byteLength);

  const copy = new ArrayBuffer(out.byteLength);
  new Uint8Array(copy).set(
    new Uint8Array(buffer, out.byteOffset, out.byteLength),
  );
  return copy;
}

export async function compressMapImages(
  mapImages: HTMLCanvasElement[],
): Promise<DataView[]> {
  return new Promise((res, reject) => {
    const compressedTextures: DataView[] = new Array(mapImages.length);
    const resolvedTextures = { count: 0 };
    for (let i = 0; i < mapImages.length; i++) {
      const canvas = mapImages[i];
      if (!canvas) {
        reject(new Error(`Canvas at index ${i} is undefined`));
        return;
      }

      const canvasCtx = canvas.getContext("2d");
      if (!canvasCtx) {
        reject(new Error("Could not get canvas context"));
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
        if (resolvedTextures.count === mapImages.length)
          res(compressedTextures);
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

export function combineBuffersForDownload(bufferList: DataView[]): ArrayBuffer {
  let totalSize = 0;
  for (const buffer of bufferList) totalSize += 4 + buffer.byteLength;

  const imageDownloadBuffer = new DataView(new ArrayBuffer(totalSize));
  let pos2 = 0;
  for (const buffer of bufferList) {
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
