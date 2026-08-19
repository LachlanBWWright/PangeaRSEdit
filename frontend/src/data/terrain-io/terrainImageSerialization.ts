import { err, ok, type Result } from "neverthrow";
import type { LevelIoImagePayload, LevelIoProgress } from "@/data/level-io/levelIoTypes";
import { levelIoError, type LevelIoError } from "@/data/level-io/levelIoErrors";
import { encodeTerrainImages } from "@/data/terrain-io/terrainCodecWorkerClient";
import type { TerrainTextureCodec } from "@/data/terrain-io/terrainCodecTypes";

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

function combineJpegBuffers(bufferList: readonly ArrayBuffer[]): Uint8Array {
  let totalSize = 0;
  for (const buffer of bufferList) {
    totalSize += 8 + buffer.byteLength;
  }

  const combined = new DataView(new ArrayBuffer(totalSize));
  let position = 0;
  for (const buffer of bufferList) {
    const declaredChunkSize = 4 + buffer.byteLength;
    combined.setInt32(position, declaredChunkSize);
    position += 4;
    // JPEG chunks are read as [declared-size][image-description-offset][jpeg-bytes].
    // The minimal valid layout stores only the offset field itself.
    combined.setInt32(position, 4);
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
  const terrainCodec: TerrainTextureCodec = {
    kind: "lzss-rgb555",
    supertileTexmapSize: mapImages[0]?.width ?? 1,
    bytesPerPixel: 2,
  };

  const encodeResult = await encodeTerrainImages(
    terrainCodec,
    mapImages.map((image, index) => ({
      id: index,
      request: {
        rgbaBytes: image.rgbaBytes,
        width: image.width,
        height: image.height,
      },
    })),
    (progress) => {
      notify(onProgress, {
        stage: "serialize.textures",
        message: "Compressing terrain textures",
        completed: progress.completed,
        total: progress.total,
      });
    },
  );

  if (encodeResult.isErr()) {
    return err(levelIoError("serialize.failed", encodeResult.error.message));
  }

  return ok(
    combineCompressedBuffers(
      encodeResult.value.map((encoded) => encoded.encodedBytes),
    ),
  );
}

export async function serializeJpegTerrainImages(
  mapImages: readonly LevelIoImagePayload[],
  onProgress?: (progress: LevelIoProgress) => void,
): Promise<Result<Uint8Array, LevelIoError>> {
  if (mapImages.length === 0) {
    return ok(new Uint8Array(0));
  }

  const terrainCodec: TerrainTextureCodec = {
    kind: "jpeg-supertile",
    supertileTexmapSize: mapImages[0]?.width ?? 1,
  };

  const encodeResult = await encodeTerrainImages(
    terrainCodec,
    mapImages.map((image, index) => ({
      id: index,
      request: {
        rgbaBytes: image.rgbaBytes,
        width: image.width,
        height: image.height,
      },
    })),
    (progress) => {
      notify(onProgress, {
        stage: "serialize.textures",
        message: "Encoding JPEG terrain textures",
        completed: progress.completed,
        total: progress.total,
      });
    },
  );

  if (encodeResult.isErr()) {
    return err(levelIoError("serialize.failed", encodeResult.error.message));
  }

  return ok(
    combineJpegBuffers(
      encodeResult.value.map((encoded) => encoded.encodedBytes),
    ),
  );
}
