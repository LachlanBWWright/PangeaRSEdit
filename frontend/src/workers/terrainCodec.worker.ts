import {
  terrainCodecWorkerRequestSchema,
  type TerrainCodecWorkerRequest,
  type TerrainCodecWorkerResponse,
} from "@/data/terrain-io/terrainCodecSchemas";
import {
  encodeJpegTerrainTile,
  encodeLzssTerrainTile,
  decodeJpegTerrainTile,
  decodeLzssTerrainTile,
} from "@/data/terrain-io/terrainCodecWasm";

function createInvalidRequestResponse(
  request: TerrainCodecWorkerRequest,
  message: string,
): TerrainCodecWorkerResponse {
  const responseType =
    request.type === "encode-jpeg" || request.type === "encode-lzss"
      ? "encode-error"
      : "decode-error";
  return {
    type: responseType,
    jobId: request.jobId,
    id: request.id,
    code:
      responseType === "encode-error"
        ? "terrain.encode.failed"
        : "terrain.decode.bad-format",
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
    if (request.type === "encode-lzss") {
      const encodeResult = await encodeLzssTerrainTile(request.id, {
        rgbaBytes: request.rgbaBytes,
        width: request.width,
        height: request.height,
      });
      if (encodeResult.isErr()) {
        return {
          type: "encode-error",
          jobId: request.jobId,
          id: request.id,
          code: encodeResult.error.code,
          message: encodeResult.error.message,
        };
      }

      return {
        type: "encoded",
        jobId: request.jobId,
        id: request.id,
        encodedBytes: encodeResult.value.encodedBytes,
        imageDescriptionBytes: encodeResult.value.imageDescriptionBytes,
      };
    }

    if (request.type === "encode-jpeg") {
      const encodeResult = await encodeJpegTerrainTile(request.id, {
        rgbaBytes: request.rgbaBytes,
        width: request.width,
        height: request.height,
        quality: request.quality,
      });
      if (encodeResult.isErr()) {
        return {
          type: "encode-error",
          jobId: request.jobId,
          id: request.id,
          code: encodeResult.error.code,
          message: encodeResult.error.message,
        };
      }

      return {
        type: "encoded",
        jobId: request.jobId,
        id: request.id,
        encodedBytes: encodeResult.value.encodedBytes,
        imageDescriptionBytes: encodeResult.value.imageDescriptionBytes,
      };
    }

    return createInvalidRequestResponse(request, "Unknown terrain codec request");
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
    const transferables: Transferable[] =
      response.type === "decoded"
        ? [response.rgbaBytes]
        : response.type === "encoded"
          ? response.imageDescriptionBytes
            ? [response.encodedBytes, response.imageDescriptionBytes]
            : [response.encodedBytes]
          : [];
    self.postMessage(response, { transfer: transferables });
  })();
};
