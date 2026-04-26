// JPEG decompression utility in the style of lzss.ts
// Supports browser (Canvas) and Node.js (jpeg-js) environments

// In the browser, use decodeJpegBrowser
// In Node.js, use decodeJpegNode (requires jpeg-js)

/**
 * Decompress a JPEG image in the browser using Canvas.
 * @param jpegData - JPEG data as ArrayBuffer or Uint8Array
 * @returns Promise resolving to ImageData (RGBA)
 */
import Jpeg from "jpeg-js";
import { uint8ArraySchema, arrayBufferSchema } from "../schemas/common";

export async function decodeJpegBrowser(
  jpegData: ArrayBuffer | Uint8Array,
): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    // Always copy to a new ArrayBuffer to avoid SharedArrayBuffer issues
    let arrayBuffer: ArrayBuffer;
    const uint8ParseResult = uint8ArraySchema.safeParse(jpegData);
    if (uint8ParseResult.success) {
      const tmp = new Uint8Array(uint8ParseResult.data.byteLength);
      tmp.set(uint8ParseResult.data);
      arrayBuffer = tmp.buffer;
    } else {
      const arrayBufferParseResult = arrayBufferSchema.safeParse(jpegData);
      if (!arrayBufferParseResult.success) {
        reject(new Error("Invalid jpegData type"));
        return;
      }
      const tmp = new Uint8Array(arrayBufferParseResult.data.byteLength);
      tmp.set(new Uint8Array(arrayBufferParseResult.data));
      arrayBuffer = tmp.buffer;
    }
    const blob = new Blob([arrayBuffer], { type: "image/jpeg" });

    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Could not get 2D context"));
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      URL.revokeObjectURL(url);
      resolve(imageData);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load JPEG image"));
    };
    img.src = url;
  });
}

/**
 * Decompress a JPEG image in Node.js using jpeg-js.
 * @param jpegData - JPEG data as ArrayBuffer
 * @returns ImageData (RGBA)
 */
export function decodeJpegNode(jpegData: ArrayBuffer): ImageData {
  const resData = Jpeg.decode(new Uint8Array(jpegData), { useTArray: true });
  // Copy to a new Uint8ClampedArray backed by a real ArrayBuffer
  const clamped = new Uint8ClampedArray(resData.data.length);
  clamped.set(resData.data);
  if (typeof ImageData !== "undefined") {
    return new ImageData(clamped, resData.width, resData.height);
  } else {
    // Node.js: return a plain object with width, height, and data
    // (You may want to use node-canvas or similar for true ImageData)
    return {
      width: resData.width,
      height: resData.height,
      colorSpace: "srgb",
      data: clamped,
    };
  }
}

/**
 * Encode an ArrayBuffer or Uint8Array to a base64 string
 */
export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const uint8Result = uint8ArraySchema.safeParse(buffer);
  if (uint8Result.success) {
    const bytes = uint8Result.data;
    let binary = "";
    for (const byte of bytes) {
      binary += String.fromCharCode(byte ?? 0);
    }
    return btoa(binary);
  }

  const arrayBufferResult = arrayBufferSchema.safeParse(buffer);
  if (arrayBufferResult.success) {
    const bytes = new Uint8Array(arrayBufferResult.data);
    let binary = "";
    for (const byte of bytes) {
      binary += String.fromCharCode(byte ?? 0);
    }
    return btoa(binary);
  }

  // If not Uint8Array and not ArrayBuffer, still try with type hint for fallback
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte ?? 0);
  }
  return btoa(binary);
}
