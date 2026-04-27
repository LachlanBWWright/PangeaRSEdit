import { jpegCompress } from "./jpegCompress";

/** Message sent to the JPEG compression worker. */
export interface JpegCompressMessage {
  id: number;
  type: "compress";
  input: ImageData | { width: number; height: number; data: Uint8ClampedArray };
  quality?: number;
}

/** Response posted back from the JPEG compression worker. */
export interface JpegCompressResponse {
  id: number;
  type: "compressRes";
  jpegData: ArrayBuffer;
}

onmessage = async (event: MessageEvent<JpegCompressMessage>) => {
  if (event.data.type === "compress") {
    let imageData: ImageData;
    if (event.data.input instanceof ImageData) {
      imageData = event.data.input;
    } else {
      // Reconstruct ImageData if sent as plain object
      const { data, width, height } = event.data.input;
      imageData = new ImageData(new Uint8ClampedArray(data), width, height);
    }
    const jpegResult = await jpegCompress(imageData, event.data.quality);
    if (jpegResult.isErr()) {
      console.error("Failed to compress JPEG:", jpegResult.error);
      return;
    }
    postMessage({
      id: event.data.id,
      type: "compressRes",
      jpegData: jpegResult.value,
    } satisfies JpegCompressResponse);
  }
};
