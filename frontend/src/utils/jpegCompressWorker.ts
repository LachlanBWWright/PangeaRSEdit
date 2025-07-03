import { jpegCompress } from "./jpegCompress";

export type JpegCompressMessage = {
  id: number;
  type: "compress";
  input: ImageData | { width: number; height: number; data: Uint8ClampedArray };
  quality?: number;
};

export type JpegCompressResponse = {
  id: number;
  type: "compressRes";
  jpegData: ArrayBuffer;
};

onmessage = async (event: MessageEvent<JpegCompressMessage>) => {
  if (event.data.type === "compress") {
    let imageData: ImageData;
    if (event.data.input instanceof ImageData) {
      imageData = event.data.input;
    } else {
      // Reconstruct ImageData if sent as plain object
      imageData = new ImageData(
        new Uint8ClampedArray(event.data.input.data),
        event.data.input.width,
        event.data.input.height,
      );
    }
    const jpegData = await jpegCompress(imageData, event.data.quality);
    postMessage({
      id: event.data.id,
      type: "compressRes",
      jpegData,
    } satisfies JpegCompressResponse);
  }
};
