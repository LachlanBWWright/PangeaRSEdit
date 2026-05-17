import { describe, expect, it } from "vitest";
import {
  terrainCodecWorkerRequestSchema,
  terrainCodecWorkerResponseSchema,
} from "@/data/terrain-io/terrainCodecSchemas";

describe("terrainCodecWorker schemas", () => {
  it("accepts encode-lzss requests", () => {
    const parsed = terrainCodecWorkerRequestSchema.safeParse({
      type: "encode-lzss",
      jobId: 1,
      id: 0,
      width: 64,
      height: 64,
      rgbaBytes: new ArrayBuffer(64 * 64 * 4),
    });

    expect(parsed.success).toBe(true);
  });

  it("accepts encode-jpeg requests", () => {
    const parsed = terrainCodecWorkerRequestSchema.safeParse({
      type: "encode-jpeg",
      jobId: 2,
      id: 1,
      width: 128,
      height: 128,
      quality: 90,
      rgbaBytes: new ArrayBuffer(128 * 128 * 4),
    });

    expect(parsed.success).toBe(true);
  });

  it("accepts encoded responses", () => {
    const parsed = terrainCodecWorkerResponseSchema.safeParse({
      type: "encoded",
      jobId: 3,
      id: 7,
      encodedBytes: new ArrayBuffer(32),
      imageDescriptionBytes: new ArrayBuffer(8),
    });

    expect(parsed.success).toBe(true);
  });

  it("accepts encode-error responses", () => {
    const parsed = terrainCodecWorkerResponseSchema.safeParse({
      type: "encode-error",
      jobId: 4,
      id: 9,
      code: "terrain.encode.failed",
      message: "Codec failed",
    });

    expect(parsed.success).toBe(true);
  });
});
