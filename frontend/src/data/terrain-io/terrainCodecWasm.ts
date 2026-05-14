import initTerrainCodecWasm, {
  wasm_decode_jpeg_terrain_tile,
  wasm_decode_lzss_terrain_tile,
  wasm_encode_jpeg_terrain_tile,
  wasm_encode_lzss_terrain_tile,
} from "../../../../terrain-codec-rust/pkg/terrain_codec_rust.js";
import { Result, ResultAsync, err, ok } from "neverthrow";
import { z } from "zod";
import { lzssCompress, lzssDecompress } from "@/utils/lzss";
import { decodeJpegNode } from "@/utils/jpegDecompress";
import {
  imageDataToSixteenBit,
  sixteenBitToImageData,
} from "@/utils/imageConverter";
import { flipRgbaRowsVertically } from "@/data/terrain-io/terrainImageOrientation";
import type {
  DecodeJpegTerrainTileRequest,
  DecodeLzssTerrainTileRequest,
  DecodedTerrainTileBuffer,
  EncodeJpegTerrainTileRequest,
  EncodeLzssTerrainTileRequest,
  EncodedTerrainTileBuffer,
  TerrainCodecRuntimeInfo,
} from "@/data/terrain-io/terrainCodecTypes";
import {
  terrainIoError,
  type TerrainIoError,
  type TerrainIoErrorCode,
} from "@/data/terrain-io/terrainIoErrors";

const terrainCodecBoundaryErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
});

const decodedTerrainTileSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  bytes: z.instanceof(Uint8Array),
});

const encodedTerrainTileSchema = z.object({
  bytes: z.instanceof(Uint8Array),
});

let initPromise: Promise<TerrainCodecRuntimeInfo> | null = null;

function cloneUint8ArrayToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function cloneArrayBuffer(buffer: ArrayBuffer): ArrayBuffer {
  const copy = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(copy).set(new Uint8Array(buffer));
  return copy;
}

function mapBoundaryError(
  error: unknown,
  failureCode: TerrainIoErrorCode,
  invalidCode: TerrainIoErrorCode,
): TerrainIoError {
  const parsed = terrainCodecBoundaryErrorSchema.safeParse(error);
  if (!parsed.success) {
    return terrainIoError(
      "terrain.codec.unavailable",
      `Terrain codec WASM is unavailable: ${String(error)}`,
    );
  }

  if (
    parsed.data.code === "terrain.invalid-dimensions" ||
    parsed.data.code === "terrain.invalid-input"
  ) {
    return terrainIoError(invalidCode, parsed.data.message);
  }

  if (
    parsed.data.code === "terrain.decode-failed" ||
    parsed.data.code === "terrain.encode-failed"
  ) {
    return terrainIoError(failureCode, parsed.data.message);
  }

  return terrainIoError(failureCode, parsed.data.message);
}

function createImageDataFromRgba(
  rgbaBytes: ArrayBuffer,
  width: number,
  height: number,
): Result<ImageData, TerrainIoError> {
  const expectedByteLength = width * height * 4;
  if (rgbaBytes.byteLength !== expectedByteLength) {
    return err(
      terrainIoError(
        "terrain.decode.bad-format",
        `Expected ${expectedByteLength} RGBA bytes for a ${width}x${height} tile, received ${rgbaBytes.byteLength}`,
      ),
    );
  }
  return ok(
    new ImageData(new Uint8ClampedArray(cloneArrayBuffer(rgbaBytes)), width, height),
  );
}

function decodeLzssWithTypescript(
  request: DecodeLzssTerrainTileRequest,
): Result<DecodedTerrainTileBuffer, TerrainIoError> {
  const outputSize = request.width * request.height * 2;
  const decompressedResult = Result.fromThrowable(
    () => lzssDecompress(new DataView(request.compressedBytes), outputSize),
    (error: unknown) =>
      terrainIoError("terrain.decode.failed", String(error)),
  )();
  if (decompressedResult.isErr()) {
    return err(decompressedResult.error);
  }

  const imageDataResult = createImageDataFromRgba(
    new ArrayBuffer(request.width * request.height * 4),
    request.width,
    request.height,
  );
  if (imageDataResult.isErr()) {
    return err(imageDataResult.error);
  }
  const imageResult = sixteenBitToImageData(
    decompressedResult.value,
    imageDataResult.value,
  );
  if (imageResult.isErr()) {
    return err(terrainIoError("terrain.decode.bad-format", imageResult.error));
  }

  return ok({
    id: -1,
    width: request.width,
    height: request.height,
    rgbaBytes: cloneArrayBuffer(imageDataResult.value.data.buffer),
  });
}

function decodeJpegWithTypescript(
  request: DecodeJpegTerrainTileRequest,
): Result<DecodedTerrainTileBuffer, TerrainIoError> {
  const decodeResult = Result.fromThrowable(
    () => decodeJpegNode(request.jpegBytes),
    (error: unknown) =>
      terrainIoError("terrain.decode.failed", String(error)),
  )();
  if (decodeResult.isErr()) {
    return err(decodeResult.error);
  }

  if (
    decodeResult.value.width !== request.width ||
    decodeResult.value.height !== request.height
  ) {
    return err(
      terrainIoError(
        "terrain.decode.bad-format",
        `Expected JPEG tile dimensions ${request.width}x${request.height}, decoded ${decodeResult.value.width}x${decodeResult.value.height}`,
      ),
    );
  }

  const flippedResult = flipRgbaRowsVertically(
    cloneArrayBuffer(decodeResult.value.data.buffer),
    decodeResult.value.width,
    decodeResult.value.height,
  );
  if (flippedResult.isErr()) {
    return err(flippedResult.error);
  }

  return ok({
    id: -1,
    width: decodeResult.value.width,
    height: decodeResult.value.height,
    rgbaBytes: flippedResult.value,
  });
}

function encodeLzssWithTypescript(
  request: EncodeLzssTerrainTileRequest,
): Result<EncodedTerrainTileBuffer, TerrainIoError> {
  const encoded = lzssCompress(
    imageDataToSixteenBit(new Uint8ClampedArray(request.rgbaBytes)),
  );
  return ok({
    id: -1,
    encodedBytes: cloneArrayBuffer(encoded.buffer),
  });
}

function normalizeJpegQuality(quality: number): number {
  return Math.max(1, Math.min(100, Math.round(quality)));
}

async function encodeJpegWithTypescript(
  request: EncodeJpegTerrainTileRequest,
): Promise<Result<EncodedTerrainTileBuffer, TerrainIoError>> {
  if (typeof OffscreenCanvas === "undefined") {
    return err(
      terrainIoError(
        "terrain.codec.unavailable",
        "OffscreenCanvas is unavailable for the JPEG terrain codec fallback",
      ),
    );
  }

  const canvas = new OffscreenCanvas(request.width, request.height);
  const context = canvas.getContext("2d");
  if (!context) {
    return err(
      terrainIoError(
        "terrain.encode.failed",
        "Failed to create an OffscreenCanvas 2D context for JPEG encoding",
      ),
    );
  }

  const flippedInputResult = flipRgbaRowsVertically(
    request.rgbaBytes,
    request.width,
    request.height,
  );
  if (flippedInputResult.isErr()) {
    return err(flippedInputResult.error);
  }

  const imageDataResult = createImageDataFromRgba(
    flippedInputResult.value,
    request.width,
    request.height,
  );
  if (imageDataResult.isErr()) {
    return err(imageDataResult.error);
  }
  context.putImageData(imageDataResult.value, 0, 0);

  const blobResult = await ResultAsync.fromPromise(
    canvas.convertToBlob({
      type: "image/jpeg",
      quality: normalizeJpegQuality(request.quality) / 100,
    }),
    () =>
      terrainIoError("terrain.encode.failed", "Failed to encode a JPEG terrain tile"),
  );
  if (blobResult.isErr()) {
    return err(blobResult.error);
  }

  const bufferResult = await ResultAsync.fromPromise(
    blobResult.value.arrayBuffer(),
    () =>
      terrainIoError(
        "terrain.encode.failed",
        "Failed to read encoded JPEG terrain bytes",
      ),
  );
  if (bufferResult.isErr()) {
    return err(bufferResult.error);
  }

  return ok({
    id: -1,
    encodedBytes: bufferResult.value,
  });
}

async function ensureTerrainCodecInitialized(): Promise<
  Result<TerrainCodecRuntimeInfo, TerrainIoError>
> {
  if (!initPromise) {
    initPromise = initTerrainCodecWasm().then(() => ({
      backend: "wasm" as const,
      threadMode: globalThis.crossOriginIsolated === true ? "threaded" : "single",
      crossOriginIsolated: globalThis.crossOriginIsolated === true,
    }));
  }

  const result = await ResultAsync.fromPromise(initPromise, (error) => {
    const parsed = terrainCodecBoundaryErrorSchema.safeParse(error);
    if (parsed.success) {
      return terrainIoError("terrain.codec.unavailable", parsed.data.message);
    }
    return terrainIoError("terrain.codec.unavailable", String(error));
  });

  if (result.isErr()) {
    return err(result.error);
  }

  return ok(result.value);
}

function parseDecodedTerrainTileResult(
  tileId: number,
  result: unknown,
): Result<DecodedTerrainTileBuffer, TerrainIoError> {
  const parsed = decodedTerrainTileSchema.safeParse(result);
  if (!parsed.success) {
    return err(
      terrainIoError(
        "terrain.codec.invalid-response",
        parsed.error.message,
      ),
    );
  }

  return ok({
    id: tileId,
    width: parsed.data.width,
    height: parsed.data.height,
    rgbaBytes: cloneUint8ArrayToArrayBuffer(parsed.data.bytes),
  });
}

function parseEncodedTerrainTileResult(
  tileId: number,
  result: unknown,
): Result<EncodedTerrainTileBuffer, TerrainIoError> {
  const parsed = encodedTerrainTileSchema.safeParse(result);
  if (!parsed.success) {
    return err(
      terrainIoError(
        "terrain.codec.invalid-response",
        parsed.error.message,
      ),
    );
  }

  return ok({
    id: tileId,
    encodedBytes: cloneUint8ArrayToArrayBuffer(parsed.data.bytes),
  });
}

async function runDecodeLzssTerrainTile(
  tileId: number,
  request: DecodeLzssTerrainTileRequest,
): Promise<Result<DecodedTerrainTileBuffer, TerrainIoError>> {
  const initializedResult = await ensureTerrainCodecInitialized();
  if (initializedResult.isErr()) {
    const fallbackResult = decodeLzssWithTypescript(request);
    return fallbackResult.map((value) => ({ ...value, id: tileId }));
  }

  const callResult = Result.fromThrowable(
    () =>
      wasm_decode_lzss_terrain_tile(
        new Uint8Array(request.compressedBytes),
        request.width,
        request.height,
      ),
    (error: unknown) =>
      mapBoundaryError(
        error,
        "terrain.decode.failed",
        "terrain.decode.bad-format",
      ),
  )();
  if (callResult.isErr()) {
    return err(callResult.error);
  }

  return parseDecodedTerrainTileResult(tileId, callResult.value);
}

async function runDecodeJpegTerrainTile(
  tileId: number,
  request: DecodeJpegTerrainTileRequest,
): Promise<Result<DecodedTerrainTileBuffer, TerrainIoError>> {
  const initializedResult = await ensureTerrainCodecInitialized();
  if (initializedResult.isErr()) {
    const fallbackResult = decodeJpegWithTypescript(request);
    return fallbackResult.map((value) => ({ ...value, id: tileId }));
  }

  const callResult = Result.fromThrowable(
    () =>
      wasm_decode_jpeg_terrain_tile(
        new Uint8Array(request.jpegBytes),
        request.width,
        request.height,
      ),
    (error: unknown) =>
      mapBoundaryError(
        error,
        "terrain.decode.failed",
        "terrain.decode.bad-format",
      ),
  )();
  if (callResult.isErr()) {
    return err(callResult.error);
  }

  return parseDecodedTerrainTileResult(tileId, callResult.value);
}

async function runEncodeLzssTerrainTile(
  tileId: number,
  request: EncodeLzssTerrainTileRequest,
): Promise<Result<EncodedTerrainTileBuffer, TerrainIoError>> {
  const initializedResult = await ensureTerrainCodecInitialized();
  if (initializedResult.isErr()) {
    const fallbackResult = encodeLzssWithTypescript(request);
    return fallbackResult.map((value) => ({ ...value, id: tileId }));
  }

  const callResult = Result.fromThrowable(
    () =>
      wasm_encode_lzss_terrain_tile(
        new Uint8Array(request.rgbaBytes),
        request.width,
        request.height,
      ),
    (error: unknown) =>
      mapBoundaryError(
        error,
        "terrain.encode.failed",
        "terrain.encode.failed",
      ),
  )();
  if (callResult.isErr()) {
    return err(callResult.error);
  }

  return parseEncodedTerrainTileResult(tileId, callResult.value);
}

async function runEncodeJpegTerrainTile(
  tileId: number,
  request: EncodeJpegTerrainTileRequest,
): Promise<Result<EncodedTerrainTileBuffer, TerrainIoError>> {
  const initializedResult = await ensureTerrainCodecInitialized();
  if (initializedResult.isErr()) {
    const fallbackResult = await encodeJpegWithTypescript(request);
    return fallbackResult.map((value) => ({ ...value, id: tileId }));
  }

  const callResult = Result.fromThrowable(
    () =>
      wasm_encode_jpeg_terrain_tile(
        new Uint8Array(request.rgbaBytes),
        request.width,
        request.height,
        normalizeJpegQuality(request.quality),
      ),
    (error: unknown) =>
      mapBoundaryError(
        error,
        "terrain.encode.failed",
        "terrain.encode.failed",
      ),
  )();
  if (callResult.isErr()) {
    return err(callResult.error);
  }

  return parseEncodedTerrainTileResult(tileId, callResult.value);
}

export function decodeLzssTerrainTile(
  tileId: number,
  request: DecodeLzssTerrainTileRequest,
): ResultAsync<DecodedTerrainTileBuffer, TerrainIoError> {
  return ResultAsync.fromPromise(runDecodeLzssTerrainTile(tileId, request), () =>
    terrainIoError(
      "terrain.decode.failed",
      "Failed to decode the LZSS terrain tile",
    ),
  ).andThen((result) => result);
}

export function decodeJpegTerrainTile(
  tileId: number,
  request: DecodeJpegTerrainTileRequest,
): ResultAsync<DecodedTerrainTileBuffer, TerrainIoError> {
  return ResultAsync.fromPromise(runDecodeJpegTerrainTile(tileId, request), () =>
    terrainIoError(
      "terrain.decode.failed",
      "Failed to decode the JPEG terrain tile",
    ),
  ).andThen((result) => result);
}

export function encodeLzssTerrainTile(
  tileId: number,
  request: EncodeLzssTerrainTileRequest,
): ResultAsync<EncodedTerrainTileBuffer, TerrainIoError> {
  return ResultAsync.fromPromise(runEncodeLzssTerrainTile(tileId, request), () =>
    terrainIoError(
      "terrain.encode.failed",
      "Failed to encode the LZSS terrain tile",
    ),
  ).andThen((result) => result);
}

export function encodeJpegTerrainTile(
  tileId: number,
  request: EncodeJpegTerrainTileRequest,
): ResultAsync<EncodedTerrainTileBuffer, TerrainIoError> {
  return ResultAsync.fromPromise(runEncodeJpegTerrainTile(tileId, request), () =>
    terrainIoError(
      "terrain.encode.failed",
      "Failed to encode the JPEG terrain tile",
    ),
  ).andThen((result) => result);
}
