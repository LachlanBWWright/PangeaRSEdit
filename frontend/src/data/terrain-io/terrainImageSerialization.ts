import { err, ok, type Result } from "neverthrow";
import type { LevelIoImagePayload, LevelIoProgress } from "@/data/level-io/levelIoTypes";
import { levelIoError, type LevelIoError } from "@/data/level-io/levelIoErrors";
import { encodeLzssTerrainTile } from "@/data/terrain-io/terrainCodecWasm";

function combineCompressedBuffers(bufferList: readonly ArrayBuffer[]): Uint8Array {
  let totalSize = 0;
  for (const buffer of bufferList) {
    totalSize += 4 + buffer.byteLength;
  }

  const combined = new DataView(new ArrayBuffer(totalSize));
  let position = 0;
  for (const buffer of bufferList) {
    combined.setInt32(position, buffer.byteLength);
    position += 4;
    new Uint8Array(combined.buffer, position, buffer.byteLength).set(
      new Uint8Array(buffer),
    );
    position += buffer.byteLength;
  }

  return new Uint8Array(combined.buffer);
}

function notify(
  onProgress: ((progress: LevelIoProgress) => void) | undefined,
  progress: LevelIoProgress,
): void {
  onProgress?.(progress);
}

export async function serializeCompressedTerrainImages(
  mapImages: readonly LevelIoImagePayload[],
  onProgress?: (progress: LevelIoProgress) => void,
): Promise<Result<Uint8Array, LevelIoError>> {
  const compressedBuffers: ArrayBuffer[] = [];

  for (let index = 0; index < mapImages.length; index += 1) {
    const image = mapImages[index];
    if (!image) {
      return err(levelIoError("serialize.failed", `Missing image #${index}`));
    }

    notify(onProgress, {
      stage: "serialize.textures",
      message: "Compressing terrain textures",
      completed: index + 1,
      total: mapImages.length,
    });

    const encodeResult = await encodeLzssTerrainTile(index, {
      rgbaBytes: image.rgbaBytes,
      width: image.width,
      height: image.height,
    });
    if (encodeResult.isErr()) {
      return err(levelIoError("serialize.failed", encodeResult.error.message));
    }

    compressedBuffers.push(encodeResult.value.encodedBytes);
  }

  return ok(combineCompressedBuffers(compressedBuffers));
}
