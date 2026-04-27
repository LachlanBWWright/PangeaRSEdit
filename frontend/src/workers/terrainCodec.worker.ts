import { lzssDecompress } from "@/utils/lzss";
import { sixteenBitToImageData } from "@/utils/imageConverter";
import { decodeJpegNode } from "@/utils/jpegDecompress";
import { Result } from "neverthrow";
import {
  terrainCodecWorkerRequestSchema,
  type TerrainCodecWorkerResponse,
} from "@/data/terrain-io/terrainCodecSchemas";

self.onmessage = (event: MessageEvent<unknown>) => {
  const parsed = terrainCodecWorkerRequestSchema.safeParse(event.data);
  if (!parsed.success) {
    return;
  }

  const request = parsed.data;

  if (request.type === "decode-jpeg") {
    const decodeResult = Result.fromThrowable(
      () => decodeJpegNode(request.bytes),
      (error) => String(error),
    )();
    if (decodeResult.isErr()) {
      self.postMessage({
        type: "decode-error",
        jobId: request.jobId,
        id: request.id,
        code: "terrain.decode.failed",
        message: decodeResult.error,
      } satisfies TerrainCodecWorkerResponse);
      return;
    }

    self.postMessage({
      type: "decoded",
      jobId: request.jobId,
      id: request.id,
      imageData: decodeResult.value,
    } satisfies TerrainCodecWorkerResponse);
    return;
  }

  const outputSize = request.supertileTexmapSize * request.supertileTexmapSize * 2;
  const decompressedDataView = lzssDecompress(new DataView(request.bytes), outputSize);
  const canvas = new OffscreenCanvas(
    request.supertileTexmapSize,
    request.supertileTexmapSize,
  );
  const context = canvas.getContext("2d");
  if (!context) {
    self.postMessage({
      type: "decode-error",
      jobId: request.jobId,
      id: request.id,
      code: "terrain.decode.no-canvas-context",
      message: "Failed to get 2D context for terrain decode",
    } satisfies TerrainCodecWorkerResponse);
    return;
  }

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  sixteenBitToImageData(decompressedDataView, imageData);
  self.postMessage({
    type: "decoded",
    jobId: request.jobId,
    id: request.id,
    imageData,
  } satisfies TerrainCodecWorkerResponse);
};
