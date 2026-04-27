import TerrainCodecWorker from "@/workers/terrainCodec.worker?worker";
import { okAsync, ResultAsync } from "neverthrow";
import type {
  DecodedTerrainTile,
  TerrainDecodeProgress,
  TerrainTextureChunk,
  TerrainTextureCodec,
} from "@/data/terrain-io/terrainCodecTypes";
import {
  terrainCodecWorkerResponseSchema,
  type TerrainCodecWorkerRequest,
} from "@/data/terrain-io/terrainCodecSchemas";
import {
  terrainIoError,
  type TerrainIoError,
} from "@/data/terrain-io/terrainIoErrors";
import { z } from "zod";

const terrainIoErrorLikeSchema = z.object({
  code: z.string(),
  message: z.string(),
});

function createDecodeRequest(
  codec: TerrainTextureCodec,
  jobId: number,
  chunk: TerrainTextureChunk,
): TerrainCodecWorkerRequest {
  if (codec.kind === "jpeg-supertile") {
    return {
      type: "decode-jpeg",
      jobId,
      id: chunk.id,
      supertileTexmapSize: codec.supertileTexmapSize,
      bytes: chunk.bytes,
    };
  }

  return {
    type: "decode-lzss",
    jobId,
    id: chunk.id,
    supertileTexmapSize: codec.supertileTexmapSize,
    bytes: chunk.bytes,
  };
}

async function decodeChunk(
  worker: Worker,
  request: TerrainCodecWorkerRequest,
): Promise<DecodedTerrainTile> {
  return new Promise((resolve, reject) => {
    const onMessage = (event: MessageEvent<unknown>) => {
      const parsed = terrainCodecWorkerResponseSchema.safeParse(event.data);
      if (!parsed.success || parsed.data.jobId !== request.jobId) {
        return;
      }

      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);

      if (parsed.data.type === "decode-error") {
        reject(
          terrainIoError(
            "terrain.decode.failed",
            `${parsed.data.code}: ${parsed.data.message}`,
          ),
        );
        return;
      }

      resolve({ id: parsed.data.id, imageData: parsed.data.imageData });
    };

    const onError = () => {
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
      reject(
        terrainIoError(
          "terrain.decode.failed",
          "Terrain worker encountered an error",
        ),
      );
    };

    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", onError);

    const transferables: Transferable[] = [request.bytes];
    worker.postMessage(request, transferables);
  });
}

async function decodeChunkWithNewWorker(
  codec: TerrainTextureCodec,
  chunk: TerrainTextureChunk,
  jobId: number,
): Promise<DecodedTerrainTile> {
  const worker = new TerrainCodecWorker();
  const request = createDecodeRequest(codec, jobId, chunk);
  return decodeChunk(worker, request).finally(() => {
    worker.terminate();
  });
}

async function decodeChunksWithLimit(
  codec: TerrainTextureCodec,
  chunks: TerrainTextureChunk[],
  workerLimit: number,
  onProgress?: (progress: TerrainDecodeProgress) => void,
): Promise<DecodedTerrainTile[]> {
  const decodedTiles: DecodedTerrainTile[] = [];
  let nextChunkIndex = 0;
  let completedChunks = 0;

  async function decodeNextChunk(): Promise<void> {
    const chunkIndex = nextChunkIndex;
    nextChunkIndex += 1;

    const chunk = chunks[chunkIndex];
    if (!chunk) {
      return;
    }

    const tile = await decodeChunkWithNewWorker(codec, chunk, chunkIndex + 1);
    decodedTiles.push(tile);
    completedChunks += 1;
    onProgress?.({ completed: completedChunks, total: chunks.length });
    await decodeNextChunk();
  }

  const activeWorkerCount = Math.min(workerLimit, chunks.length);
  const workers = Array.from({ length: activeWorkerCount }, () =>
    decodeNextChunk(),
  );
  await Promise.all(workers);
  return [...decodedTiles].sort((left, right) => left.id - right.id);
}

function getTerrainDecodeWorkerLimit(): number {
  const browserWorkerLimit = navigator.hardwareConcurrency;
  if (browserWorkerLimit > 0) {
    return Math.max(1, Math.min(4, browserWorkerLimit));
  }
  return 4;
}

export function decodeTerrainChunks(
  codec: TerrainTextureCodec,
  chunks: TerrainTextureChunk[],
  onProgress?: (progress: TerrainDecodeProgress) => void,
): ResultAsync<DecodedTerrainTile[], TerrainIoError> {
  if (chunks.length === 0) {
    return okAsync([]);
  }

  console.info("[terrain] decoding terrain chunks", {
    codec: codec.kind,
    chunks: chunks.length,
    supertileTexmapSize: codec.supertileTexmapSize,
  });

  return ResultAsync.fromPromise(
    decodeChunksWithLimit(
      codec,
      chunks,
      getTerrainDecodeWorkerLimit(),
      onProgress,
    ),
    (error) => {
      const parsed = terrainIoErrorLikeSchema.safeParse(error);
      if (parsed.success) {
        return terrainIoError("terrain.decode.failed", parsed.data.message);
      }
      return terrainIoError(
        "terrain.decode.failed",
        "Failed to decode terrain textures",
      );
    },
  );
}
