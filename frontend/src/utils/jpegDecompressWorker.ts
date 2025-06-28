import {  decodeJpegNode } from "./jpegDecompress";

export type JpegDecompressMessage = {
  id: number;
  type: "decompress";
  jpegData: ArrayBuffer;
};

export type JpegDecompressResponse = {
  id: number;
  type: "decompressRes";
  imageData: ImageData;
};

onmessage = async (event: MessageEvent<JpegDecompressMessage>) => {
  if (event.data.type === "decompress") {
    const imageData = await decodeJpegNode(event.data.jpegData);
    postMessage({
      id: event.data.id,
      type: "decompressRes",
      imageData,
    } satisfies JpegDecompressResponse);
  }
};
