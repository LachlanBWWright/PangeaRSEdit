import { decodeJpegNode } from "./jpegDecompress";

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

onmessage = (event: MessageEvent<unknown>) => {
  const payload = event.data;
  const isDecompressMessage = (p: unknown): p is JpegDecompressMessage => {
    if (typeof p !== "object" || p === null) return false;
    const obj = p as Record<string, unknown>;
    return (
      obj.type === "decompress" &&
      typeof obj.id === "number" &&
      obj.jpegData instanceof ArrayBuffer
    );
  };

  if (isDecompressMessage(payload)) {
    const data = payload;
    const imageData = decodeJpegNode(data.jpegData);
    const response: JpegDecompressResponse = {
      id: data.id,
      type: "decompressRes",
      imageData,
    };
    postMessage(response);
  }
};
