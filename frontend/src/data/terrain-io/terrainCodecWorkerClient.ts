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

    const transferables = [request.bytes] as Transferable[];
    worker.postMessage(request, transferables);
  });
}

export function decodeTerrainChunks(
  codec: TerrainTextureCodec,
  chunks: TerrainTextureChunk[],
  onProgress?: (progress: TerrainDecodeProgress) => void,
): ResultAsync<DecodedTerrainTile[], TerrainIoError> {
  if (chunks.length === 0) {
    return okAsync([]);
  }

  return ResultAsync.fromPromise(
    Promise.all(
      chunks.map((chunk, chunkIndex) => {
        const worker = new TerrainCodecWorker();
        const request = createDecodeRequest(codec, chunkIndex + 1, chunk);
        return decodeChunk(worker, request).then(
          (tile) => {
            worker.terminate();
            return tile;
          },
          (error) => {
            worker.terminate();
            return Promise.reject(error);
          },
        );
      }),
    ).then((tiles) => {
      let completed = 0;
      const sortedTiles = [...tiles].sort((left, right) => left.id - right.id);
      sortedTiles.forEach(() => {
        completed += 1;
        onProgress?.({ completed, total: chunks.length });
      });
      return sortedTiles;
    }),
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
