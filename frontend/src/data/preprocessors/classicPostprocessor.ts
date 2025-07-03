// classicPostprocessor.ts
// Converts an array of 32x32 HTMLCanvasElement images into the Nanosaur 1/Bugdom 1 tile file format (big-endian ARGB1555)

/**
 * Convert an array of 32x32 canvas images to a Nanosaur 1/Bugdom 1 tile ArrayBuffer
 * @param canvases Array of 32x32 HTMLCanvasElement
 * @returns ArrayBuffer in classic tile format
 */
export function classicPostprocessor(
  canvases: HTMLCanvasElement[],
): ArrayBuffer {
  const TILE_SIZE = 32;
  const BYTES_PER_TILE = TILE_SIZE * TILE_SIZE * 2;
  const tileCount = canvases.length;
  const totalBytes = 4 + tileCount * BYTES_PER_TILE;
  const buffer = new ArrayBuffer(totalBytes);
  const view = new DataView(buffer);
  // Write tile count (big-endian)
  view.setInt32(0, tileCount, false);

  for (let t = 0; t < tileCount; t++) {
    const canvas = canvases[t];
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context not available");
    const imageData = ctx.getImageData(0, 0, TILE_SIZE, TILE_SIZE);
    const data = imageData.data;
    const tileOffset = 4 + t * BYTES_PER_TILE;
    for (let i = 0; i < TILE_SIZE * TILE_SIZE; i++) {
      const r = data[i * 4 + 0];
      const g = data[i * 4 + 1];
      const b = data[i * 4 + 2];
      // Alpha is ignored, always set high bit
      let val = 0x8000;
      val |= ((r >> 3) & 0x1f) << 10;
      val |= ((g >> 3) & 0x1f) << 5;
      val |= (b >> 3) & 0x1f;
      view.setUint16(tileOffset + i * 2, val, false); // big-endian
    }
  }
  return buffer;
}
