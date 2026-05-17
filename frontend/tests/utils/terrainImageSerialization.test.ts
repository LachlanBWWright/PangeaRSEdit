import { beforeEach, describe, expect, it, vi } from "vitest";
import { errAsync, okAsync } from "neverthrow";
import {
  serializeCompressedTerrainImages,
  serializeJpegTerrainImages,
} from "@/data/terrain-io/terrainImageSerialization";
import { encodeTerrainImages } from "@/data/terrain-io/terrainCodecWorkerClient";
import { terrainIoError } from "@/data/terrain-io/terrainIoErrors";

vi.mock("@/data/terrain-io/terrainCodecWorkerClient", () => ({
  encodeTerrainImages: vi.fn(),
}));

describe("serializeCompressedTerrainImages", () => {
  const encodeTerrainImagesMock = vi.mocked(encodeTerrainImages);

  beforeEach(() => {
    encodeTerrainImagesMock.mockReset();
  });

  it("writes [size][chunk] pairs in tile order", async () => {
    encodeTerrainImagesMock.mockReturnValue(
      okAsync([
        { id: 0, encodedBytes: Uint8Array.from([1, 2]).buffer },
        { id: 1, encodedBytes: Uint8Array.from([3]).buffer },
      ]),
    );

    const result = await serializeCompressedTerrainImages([
      {
        rgbaBytes: new ArrayBuffer(4),
        width: 1,
        height: 1,
      },
      {
        rgbaBytes: new ArrayBuffer(4),
        width: 1,
        height: 1,
      },
    ]);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      return;
    }

    const view = new DataView(result.value.buffer);
    expect(view.getInt32(0)).toBe(2);
    expect(Array.from(result.value.slice(4, 6))).toEqual([1, 2]);
    expect(view.getInt32(6)).toBe(1);
    expect(Array.from(result.value.slice(10, 11))).toEqual([3]);
  });

  it("propagates worker encode failures", async () => {
    encodeTerrainImagesMock.mockReturnValue(
      errAsync(terrainIoError("terrain.encode.failed", "encode failed")),
    );

    const result = await serializeCompressedTerrainImages([
      {
        rgbaBytes: new ArrayBuffer(4),
        width: 1,
        height: 1,
      },
    ]);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("serialize.failed");
      expect(result.error.message).toContain("encode failed");
    }
  });

  it("writes JPEG chunks with image-description offset header", async () => {
    encodeTerrainImagesMock.mockReturnValue(
      okAsync([{ id: 0, encodedBytes: Uint8Array.from([0xff, 0xd8]).buffer }]),
    );

    const result = await serializeJpegTerrainImages([
      {
        rgbaBytes: new ArrayBuffer(4),
        width: 1,
        height: 1,
      },
    ]);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      return;
    }

    const view = new DataView(result.value.buffer);
    expect(view.getInt32(0)).toBe(6);
    expect(view.getInt32(4)).toBe(4);
    expect(Array.from(result.value.slice(8, 10))).toEqual([0xff, 0xd8]);
  });
});
