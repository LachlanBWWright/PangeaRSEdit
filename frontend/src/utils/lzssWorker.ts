import { imageDataToSixteenBit, sixteenBitToImageData } from "./imageConverter";
import { lzssCompress, lzssDecompress } from "./lzss";

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

onmessage = (event: MessageEvent<unknown>) => {
  const payload = event.data;

  const isCompress = (p: unknown): p is LzssMessage & { type: "compress" } => {
    if (typeof p !== "object" || p === null) return false;
    const obj = p as Record<string, unknown>;
    return (
      obj.type === "compress" &&
      obj.uIntArray instanceof Uint8ClampedArray &&
      typeof obj.id === "number"
    );
  };

  const isDecompress = (
    p: unknown,
  ): p is LzssMessage & { type: "decompress" } => {
    if (typeof p !== "object" || p === null) return false;
    const obj = p as Record<string, unknown>;
    return (
      obj.type === "decompress" &&
      typeof obj.outputSize === "number" &&
      typeof obj.width === "number" &&
      typeof obj.height === "number"
    );
  };

  if (isCompress(payload)) {
    const data = payload;
    const decompressedDataView = imageDataToSixteenBit(data.uIntArray);

    const compressedDataView = lzssCompress(decompressedDataView);
    const response: LzssResponse = {
      id: data.id,
      type: "compressRes",
      dataBuffer: compressedDataView.buffer,
    };
    postMessage(response);
  }

  if (isDecompress(payload)) {
    const data = payload;
    const { compressedDataView, outputSize, width, height } = data;
    const decompressedDataView = lzssDecompress(compressedDataView, outputSize);

    const imgCanvas = new OffscreenCanvas(width, height); //document.createElement("canvas");
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
      return;
    }

    sixteenBitToImageData(decompressedDataView, imageData);

    if (!imgCtx) {
      return;
    }

    const response: LzssResponse = {
      id: data.id,
      type: "decompressRes",
      imageData: imageData,
    };
    postMessage(response);
  }
};
