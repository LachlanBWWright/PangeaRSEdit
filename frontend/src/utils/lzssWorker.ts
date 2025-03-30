import { sixteenBitToImageData } from "./imageConverter";
import { lzssCompress, lzssDecompress } from "./lzss";

export type LzssMessage =
  | {
      id: number;
      type: "compress";
      decompressedDataView: DataView;
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
      dataView: DataView;
    }
  | {
      id: number;
      type: "decompressRes";
      imageData: ImageData;
    };

onmessage = async (event: MessageEvent<LzssMessage>) => {
  if (event.data.type === "compress") {
    const { decompressedDataView } = event.data;
    const compressedDataView = lzssCompress(decompressedDataView);
    postMessage({
      id: event.data.id,
      type: "compressRes",
      dataView: compressedDataView,
    } satisfies LzssResponse);
  }
  if (event.data.type === "decompress") {
    const { compressedDataView, outputSize, width, height } = event.data;
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

    postMessage({
      id: event.data.id,
      type: "decompressRes",
      imageData: imageData,
    } satisfies LzssResponse);
  }
};
