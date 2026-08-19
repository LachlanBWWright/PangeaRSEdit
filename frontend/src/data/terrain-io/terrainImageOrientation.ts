import { err, ok, type Result } from "neverthrow";
import { terrainIoError, type TerrainIoError } from "@/data/terrain-io/terrainIoErrors";

export function flipRgbaRowsVertically(
  rgbaBytes: ArrayBuffer,
  width: number,
  height: number,
): Result<ArrayBuffer, TerrainIoError> {
  const rowByteLength = width * 4;
  const expectedByteLength = rowByteLength * height;
  if (rgbaBytes.byteLength !== expectedByteLength) {
    return err(
      terrainIoError(
        "terrain.decode.bad-format",
        `Expected ${expectedByteLength} RGBA bytes for a ${width}x${height} image, received ${rgbaBytes.byteLength}`,
      ),
    );
  }

  const source = new Uint8Array(rgbaBytes);
  const flipped = new Uint8Array(rgbaBytes.byteLength);

  for (let rowIndex = 0; rowIndex < height; rowIndex += 1) {
    const sourceOffset = rowIndex * rowByteLength;
    const targetOffset = (height - rowIndex - 1) * rowByteLength;
    flipped.set(
      source.subarray(sourceOffset, sourceOffset + rowByteLength),
      targetOffset,
    );
  }

  return ok(flipped.buffer);
}
