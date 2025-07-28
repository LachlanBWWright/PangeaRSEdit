/**
 * Compress an HTMLCanvasElement or ImageData to JPEG (browser only)
 * @param input HTMLCanvasElement or ImageData
 * @param quality JPEG quality (0-1, default 0.92)
 * @returns Promise resolving to ArrayBuffer (JPEG data)
 */
export async function jpegCompress(
  input: HTMLCanvasElement | ImageData,
  quality = 0.92,
): Promise<ArrayBuffer> {
  let canvas: HTMLCanvasElement;
  if (input instanceof HTMLCanvasElement) {
    canvas = input;
  } else {
    // Create a canvas and put the ImageData on it
    canvas = document.createElement("canvas");
    canvas.width = input.width;
    canvas.height = input.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get 2D context");
    ctx.putImageData(input, 0, 0);
  }
  return new Promise<ArrayBuffer>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to encode JPEG"));
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          resolve(reader.result as ArrayBuffer);
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
      },
      "image/jpeg",
      quality,
    );
  });
}
