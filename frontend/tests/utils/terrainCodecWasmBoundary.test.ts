import { describe, expect, it, vi } from "vitest";

const wasmCalls = vi.hoisted(() => ({
  decodeLzss: vi.fn(),
  decodeJpeg: vi.fn(),
  encodeLzss: vi.fn(),
  encodeJpeg: vi.fn(),
}));

vi.mock("../../../terrain-codec-rust/pkg/terrain_codec_rust.js", () => ({
  default: () => Promise.resolve(undefined),
  wasm_decode_jpeg_terrain_tile: wasmCalls.decodeJpeg,
  wasm_decode_lzss_terrain_tile: wasmCalls.decodeLzss,
  wasm_encode_jpeg_terrain_tile: wasmCalls.encodeJpeg,
  wasm_encode_lzss_terrain_tile: wasmCalls.encodeLzss,
}));

import {
  decodeJpegTerrainTile,
  decodeLzssTerrainTile,
  encodeJpegTerrainTile,
  encodeLzssTerrainTile,
} from "@/data/terrain-io/terrainCodecWasm";

const lzssRequest = {
  compressedBytes: new ArrayBuffer(2),
  width: 2,
  height: 2,
};

const jpegRequest = {
  jpegBytes: new ArrayBuffer(2),
  width: 2,
  height: 2,
};

const encodeRequest = {
  rgbaBytes: new ArrayBuffer(16),
  width: 2,
  height: 2,
};

describe("terrain codec WASM response boundary", () => {
  it("accepts valid decoded and encoded WASM responses", async () => {
    wasmCalls.decodeLzss.mockReturnValueOnce({
      width: 2,
      height: 2,
      bytes: new Uint8Array(16),
    });
    wasmCalls.encodeLzss.mockReturnValueOnce({ bytes: new Uint8Array([1, 2]) });

    const decoded = await decodeLzssTerrainTile(12, lzssRequest);
    const encoded = await encodeLzssTerrainTile(13, encodeRequest);

    expect(decoded.isOk()).toBe(true);
    expect(encoded.isOk()).toBe(true);
    if (decoded.isOk()) expect(decoded.value.id).toBe(12);
    if (encoded.isOk()) expect(encoded.value.id).toBe(13);
  });

  it("rejects malformed WASM responses with invalid-response errors", async () => {
    wasmCalls.decodeJpeg.mockReturnValueOnce({ width: 2, height: 2 });
    wasmCalls.encodeJpeg.mockReturnValueOnce({ bytes: "not-bytes" });

    const decoded = await decodeJpegTerrainTile(14, jpegRequest);
    const encoded = await encodeJpegTerrainTile(15, {
      ...encodeRequest,
      quality: 101,
    });

    expect(decoded.isErr()).toBe(true);
    expect(encoded.isErr()).toBe(true);
    if (decoded.isErr()) {
      expect(decoded.error.code).toBe("terrain.codec.invalid-response");
    }
    if (encoded.isErr()) {
      expect(encoded.error.code).toBe("terrain.codec.invalid-response");
    }
  });

  it("maps non-object WASM exceptions to unavailable errors", async () => {
    wasmCalls.encodeLzss.mockImplementationOnce(() =>
      new DataView(new ArrayBuffer(0)).getUint8(1),
    );

    const result = await encodeLzssTerrainTile(17, encodeRequest);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("terrain.codec.unavailable");
      expect(result.error.message).toContain("Offset is outside the bounds");
    }
  });
});
