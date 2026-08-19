import { describe, expect, it } from "vitest";
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

describe("terrain codec WASM boundary", () => {
  it("encodes and decodes LZSS terrain tiles with stable dimensions", async () => {
    const encoded = await encodeLzssTerrainTile(17, {
      rgbaBytes: rgbaFixture(),
      width: 2,
      height: 2,
    });

    expect(encoded.isOk()).toBe(true);
    if (encoded.isErr()) return;
    expect(encoded.value.id).toBe(17);
    expect(encoded.value.encodedBytes.byteLength).toBeGreaterThan(0);

    const decoded = await decodeLzssTerrainTile(17, {
      compressedBytes: encoded.value.encodedBytes,
      width: 2,
      height: 2,
    });

    expect(decoded.isOk()).toBe(true);
    if (decoded.isErr()) return;
    expect(decoded.value.id).toBe(17);
    expect(decoded.value.width).toBe(2);
    expect(decoded.value.height).toBe(2);
    expect(decoded.value.rgbaBytes.byteLength).toBe(16);
  });

  it("returns a typed error for invalid LZSS input", async () => {
    const result = await decodeLzssTerrainTile(4, {
      compressedBytes: new ArrayBuffer(0),
      width: 2,
      height: 2,
    });

    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    expect(result.value.rgbaBytes.byteLength).toBe(16);
  });

  it("returns a typed error when JPEG encoding is unavailable in jsdom", async () => {
    const result = await encodeJpegTerrainTile(23, {
      rgbaBytes: rgbaFixture(),
      width: 2,
      height: 2,
      quality: 100,
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) return;
    expect(["terrain.codec.unavailable", "terrain.encode.failed"]).toContain(
      result.error.code,
    );
  });

  it("maps malformed JPEG bytes to a typed decode error", async () => {
    const decoded = await decodeJpegTerrainTile(31, {
      jpegBytes: new ArrayBuffer(0),
      width: 2,
      height: 2,
    });

    expect(decoded.isErr()).toBe(true);
    if (decoded.isOk()) return;
    expect([
      "terrain.decode.bad-format",
      "terrain.decode.failed",
    ]).toContain(decoded.error.code);
  });
});
