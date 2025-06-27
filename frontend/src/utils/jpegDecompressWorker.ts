import { decodeJpegBrowser, decodeJpegNode } from "./jpegDecompress";

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
    console.log(
      "Decompressing JPEG with ID:",
      event.data.id,
      "and data",
      event.data.jpegData,
    );
    const imageData = await decodeJpegBrowser(event.data.jpegData);
    console.log("JPEG decompression successful with ID:", event.data.id);
    postMessage({
      id: event.data.id,
      type: "decompressRes",
      imageData,
    } satisfies JpegDecompressResponse);
  }
};
