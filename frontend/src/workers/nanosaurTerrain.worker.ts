import { Result } from "neverthrow";
import {
  parseNanosaurTerrainTextures,
} from "@/data/processors/classicProprocessor";
import {
  nanosaurTerrainWorkerRequestSchema,
  type NanosaurTerrainWorkerRequest,
  type NanosaurTerrainWorkerResponse,
} from "@/data/level-io/nanosaurTerrainWorkerSchemas";

function tileToImagePayload(tile: Uint16Array): {
  readonly width: number;
  readonly height: number;
  readonly rgbaBytes: ArrayBuffer;
} {
  const rgbaBytes = new Uint8Array(tile.length * 4);
  for (let index = 0; index < tile.length; index += 1) {
    const value = tile[index] ?? 0;
    rgbaBytes[index * 4] = ((value >> 10) & 0x1f) << 3;
    rgbaBytes[index * 4 + 1] = ((value >> 5) & 0x1f) << 3;
    rgbaBytes[index * 4 + 2] = (value & 0x1f) << 3;
    rgbaBytes[index * 4 + 3] = 255;
  }
  return { width: 32, height: 32, rgbaBytes: rgbaBytes.buffer };
}

function parseRequest(
  request: NanosaurTerrainWorkerRequest,
): NanosaurTerrainWorkerResponse {
  const parseResult = Result.fromThrowable(
    () => parseNanosaurTerrainTextures(request.buffer),
    (error) => String(error),
  )();
  if (parseResult.isErr()) {
    return {
      requestId: request.requestId,
      type: "failed",
      message: parseResult.error,
    };
  }

  return {
    requestId: request.requestId,
    type: "parsed",
    images: parseResult.value.map(tileToImagePayload),
  };
}

self.onmessage = (event: MessageEvent<unknown>) => {
  const parsedRequest = nanosaurTerrainWorkerRequestSchema.safeParse(event.data);
  if (!parsedRequest.success) {
    return;
  }

  const response = parseRequest(parsedRequest.data);
  const transfers =
    response.type === "parsed"
      ? response.images.map((image) => image.rgbaBytes)
      : [];
  self.postMessage(response, { transfer: transfers });
};
