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
export async function decodeJpegBrowser(
  jpegData: ArrayBuffer | Uint8Array,
): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    // Always copy to a new ArrayBuffer to avoid SharedArrayBuffer issues
    let arrayBuffer: ArrayBuffer;
    if (jpegData instanceof Uint8Array) {
      const tmp = new Uint8Array(jpegData.byteLength);
      for (let i = 0; i < jpegData.byteLength; i++) tmp[i] = jpegData[i];
      arrayBuffer = tmp.buffer;
    } else if (jpegData instanceof ArrayBuffer) {
      const tmp = new Uint8Array(jpegData.byteLength);
      tmp.set(new Uint8Array(jpegData));
      arrayBuffer = tmp.buffer;
    } else {
      reject(new Error("Invalid jpegData type"));
      return;
    }
    const blob = new Blob([arrayBuffer], { type: "image/jpeg" });

    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get 2D context"));
        return;
      }
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
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const resData = Jpeg.decode(new Uint8Array(jpegData), { useTArray: true });
  // Copy to a new Uint8ClampedArray backed by a real ArrayBuffer
  const clamped = new Uint8ClampedArray(resData.data.length);
  for (let i = 0; i < resData.data.length; i++) clamped[i] = resData.data[i];
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
  let bytes: Uint8Array;
  if (buffer instanceof Uint8Array) {
    bytes = buffer;
  } else {
    bytes = new Uint8Array(buffer);
  }
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
