import { lzssDecompress } from "@/utils/lzss";
import { sixteenBitToImageData } from "@/utils/imageConverter";
import { decodeJpegNode } from "@/utils/jpegDecompress";
import { Result } from "neverthrow";
import {
  terrainCodecWorkerRequestSchema,
  type TerrainCodecWorkerRequest,
  type TerrainCodecWorkerResponse,
} from "@/data/terrain-io/terrainCodecSchemas";

function decodeJpegRequest(
  request: TerrainCodecWorkerRequest,
): TerrainCodecWorkerResponse {
  if (request.type === "decode-jpeg") {
    const decodeResult = Result.fromThrowable(
      () => decodeJpegNode(request.bytes),
      (error) => String(error),
    )();
    if (decodeResult.isErr()) {
      return {
        type: "decode-error",
        jobId: request.jobId,
        id: request.id,
        code: "terrain.decode.failed",
        message: decodeResult.error,
      };
    }

    return {
      type: "decoded",
      jobId: request.jobId,
      id: request.id,
      imageData: decodeResult.value,
    };
  }

  return {
    type: "decode-error",
    jobId: request.jobId,
    id: request.id,
    code: "terrain.decode.bad-format",
    message: "Expected a JPEG terrain decode request",
  };
}

function decodeLzssRequest(
  request: TerrainCodecWorkerRequest,
): TerrainCodecWorkerResponse {
  if (request.type !== "decode-lzss") {
    return {
      type: "decode-error",
      jobId: request.jobId,
      id: request.id,
      code: "terrain.decode.bad-format",
      message: "Expected an LZSS terrain decode request",
    };
  }

  const outputSize =
    request.supertileTexmapSize * request.supertileTexmapSize * 2;
  const decompressedResult = Result.fromThrowable(
    () => lzssDecompress(new DataView(request.bytes), outputSize),
    (error) => String(error),
  )();
  if (decompressedResult.isErr()) {
    return {
      type: "decode-error",
      jobId: request.jobId,
      id: request.id,
      code: "terrain.decode.failed",
      message: decompressedResult.error,
    };
  }

  const canvas = new OffscreenCanvas(
    request.supertileTexmapSize,
    request.supertileTexmapSize,
  );
  const context = canvas.getContext("2d");
  if (!context) {
    return {
      type: "decode-error",
      jobId: request.jobId,
      id: request.id,
      code: "terrain.decode.no-canvas-context",
      message: "Failed to get 2D context for terrain decode",
    };
  }

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const imageResult = sixteenBitToImageData(decompressedResult.value, imageData);
  if (imageResult.isErr()) {
    return {
      type: "decode-error",
      jobId: request.jobId,
      id: request.id,
      code: "terrain.decode.bad-format",
      message: imageResult.error,
    };
  }

  return {
    type: "decoded",
    jobId: request.jobId,
    id: request.id,
    imageData,
  };
}

self.onmessage = (event: MessageEvent<unknown>) => {
  const parsed = terrainCodecWorkerRequestSchema.safeParse(event.data);
  if (!parsed.success) {
    return;
  }

  const request = parsed.data;
  const response =
    request.type === "decode-jpeg"
      ? decodeJpegRequest(request)
      : decodeLzssRequest(request);
  self.postMessage(response);
};
