import {
  terrainCodecWorkerRequestSchema,
  type TerrainCodecWorkerRequest,
  type TerrainCodecWorkerResponse,
} from "@/data/terrain-io/terrainCodecSchemas";
import {
  decodeJpegTerrainTile,
  decodeLzssTerrainTile,
} from "@/data/terrain-io/terrainCodecWasm";

function createInvalidRequestResponse(
  request: TerrainCodecWorkerRequest,
  message: string,
): TerrainCodecWorkerResponse {
  return {
    type: "decode-error",
    jobId: request.jobId,
    id: request.id,
    code: "terrain.decode.bad-format",
    message,
  };
}

async function decodeRequest(
  request: TerrainCodecWorkerRequest,
): Promise<TerrainCodecWorkerResponse> {
  if (request.type === "decode-jpeg") {
    const decodeResult = await decodeJpegTerrainTile(request.id, {
      jpegBytes: request.bytes,
      width: request.supertileTexmapSize,
      height: request.supertileTexmapSize,
    });
    if (decodeResult.isErr()) {
      return {
        type: "decode-error",
        jobId: request.jobId,
        id: request.id,
        code: decodeResult.error.code,
        message: decodeResult.error.message,
      };
    }

    return {
      type: "decoded",
      jobId: request.jobId,
      id: request.id,
      width: decodeResult.value.width,
      height: decodeResult.value.height,
      rgbaBytes: decodeResult.value.rgbaBytes,
    };
  }

  if (request.type !== "decode-lzss") {
    return createInvalidRequestResponse(
      request,
      "Expected an LZSS terrain decode request",
    );
  }

  const decodeResult = await decodeLzssTerrainTile(request.id, {
    compressedBytes: request.bytes,
    width: request.supertileTexmapSize,
    height: request.supertileTexmapSize,
  });
  if (decodeResult.isErr()) {
    return {
      type: "decode-error",
      jobId: request.jobId,
      id: request.id,
      code: decodeResult.error.code,
      message: decodeResult.error.message,
    };
  }

  return {
    type: "decoded",
    jobId: request.jobId,
    id: request.id,
    width: decodeResult.value.width,
    height: decodeResult.value.height,
    rgbaBytes: decodeResult.value.rgbaBytes,
  };
}

self.onmessage = (event: MessageEvent<unknown>) => {
  const parsed = terrainCodecWorkerRequestSchema.safeParse(event.data);
  if (!parsed.success) {
    return;
  }

  void (async () => {
    const response = await decodeRequest(parsed.data);
    const transferables =
      response.type === "decoded" ? [response.rgbaBytes] : [];
    self.postMessage(response, { transfer: transferables });
  })();
};
