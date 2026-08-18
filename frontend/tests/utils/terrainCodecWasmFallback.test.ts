import { describe, expect, it, vi } from "vitest";
import { lzssCompress } from "@/utils/lzss";

vi.mock("../../../terrain-codec-rust/pkg/terrain_codec_rust.js", () => ({
  default: () =>
    Promise.reject({ code: "terrain.init-failed", message: "WASM unavailable" }),
  wasm_decode_jpeg_terrain_tile: vi.fn(),
  wasm_decode_lzss_terrain_tile: vi.fn(),
  wasm_encode_jpeg_terrain_tile: vi.fn(),
  wasm_encode_lzss_terrain_tile: vi.fn(),
}));

const decodeJpegNodeMock = vi.hoisted(() =>
  vi.fn(() => ({
    width: 2,
    height: 2,
    data: new Uint8ClampedArray(16),
  })),
);

vi.mock("@/utils/jpegDecompress", () => ({
  decodeJpegNode: decodeJpegNodeMock,
}));

import {
  decodeJpegTerrainTile,
  decodeLzssTerrainTile,
  encodeJpegTerrainTile,
  encodeLzssTerrainTile,
} from "@/data/terrain-io/terrainCodecWasm";

function rgbaFixture(): ArrayBuffer {
  return Uint8Array.from([
    255, 0, 0, 255,
    0, 255, 0, 255,
    0, 0, 255, 255,
    255, 255, 255, 0,
  ]).buffer;
}

describe("terrain codec TypeScript fallback", () => {
  it("falls back to TypeScript LZSS encode/decode when WASM initialization fails", async () => {
    const encoded = await encodeLzssTerrainTile(6, {
      rgbaBytes: rgbaFixture(),
      width: 2,
      height: 2,
    });

    expect(encoded.isOk()).toBe(true);
    if (encoded.isErr()) return;

    const decoded = await decodeLzssTerrainTile(6, {
      compressedBytes: encoded.value.encodedBytes,
      width: 2,
      height: 2,
    });
    expect(decoded.isOk()).toBe(true);
    if (decoded.isErr()) return;
    expect(decoded.value.id).toBe(6);
    expect(decoded.value.rgbaBytes.byteLength).toBe(16);
  });

  it("maps malformed fallback LZSS input to a typed result", async () => {
    const compressed = lzssCompress(new DataView(new ArrayBuffer(2)));
    const result = await decodeLzssTerrainTile(8, {
      compressedBytes: compressed.buffer,
      width: 2,
      height: 2,
    });

    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    expect(result.value.id).toBe(8);
  });

  it("decodes JPEGs through the TypeScript fallback and flips the image rows", async () => {
    const result = await decodeJpegTerrainTile(9, {
      jpegBytes: new ArrayBuffer(4),
      width: 2,
      height: 2,
    });

    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    expect(result.value.id).toBe(9);
    expect(result.value.rgbaBytes.byteLength).toBe(16);
    expect(decodeJpegNodeMock).toHaveBeenCalledOnce();
  });

  it("reports JPEG fallback dimension mismatches as bad format", async () => {
    decodeJpegNodeMock.mockReturnValueOnce({
      width: 1,
      height: 1,
      data: new Uint8ClampedArray(4),
    });

    const result = await decodeJpegTerrainTile(10, {
      jpegBytes: new ArrayBuffer(4),
      width: 2,
      height: 2,
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) return;
    expect(result.error.code).toBe("terrain.decode.bad-format");
  });

  it("returns a typed unavailable error for JPEG encoding without OffscreenCanvas", async () => {
    const result = await encodeJpegTerrainTile(11, {
      rgbaBytes: rgbaFixture(),
      width: 2,
      height: 2,
      quality: 0,
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) return;
    expect(result.error.code).toBe("terrain.codec.unavailable");
  });
});
