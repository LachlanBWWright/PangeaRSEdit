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

onmessage = async (event: MessageEvent<unknown>) => {
  const payload = event.data;
  const isCompressMessage = (p: unknown): p is JpegCompressMessage => {
    if (typeof p !== "object" || p === null) return false;
    const obj = p as Record<string, unknown>;
    return obj.type === "compress" && typeof obj.id === "number";
  };

  if (isCompressMessage(payload)) {
    const data = payload;
    let imageData: ImageData;
    if (data.input instanceof ImageData) {
      imageData = data.input;
    } else {
      // Reconstruct ImageData if sent as plain object
      const input = data.input as {
        width: number;
        height: number;
        data: Uint8ClampedArray;
      };
      imageData = new ImageData(
        new Uint8ClampedArray(input.data),
        input.width,
        input.height,
      );
    }
    const jpegResult = await jpegCompress(imageData, data.quality);
    if (!jpegResult.ok) {
      console.error("Failed to compress JPEG:", jpegResult.error);
      return;
    }
    const response: JpegCompressResponse = {
      id: data.id,
      type: "compressRes",
      jpegData: jpegResult.value,
    };
    postMessage(response);
  }
};
