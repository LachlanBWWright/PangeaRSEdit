import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  terrainCodecWorkerRequestSchema,
  type TerrainCodecWorkerResponse,
} from "@/data/terrain-io/terrainCodecSchemas";
import {
  decodeTerrainChunks,
  encodeTerrainImages,
} from "@/data/terrain-io/terrainCodecWorkerClient";
import type { TerrainTextureCodec } from "@/data/terrain-io/terrainCodecTypes";

const workerControl = vi.hoisted(() => {
  type WorkerMode =
    | "success"
    | "decode-error"
    | "encode-error"
    | "error"
    | "foreign-then-success"
    | "invalid-then-success"
    | "delayed-success";

  const control: {
    mode: WorkerMode;
    active: number;
    maxActive: number;
    posted: unknown[];
  } = {
    mode: "success",
    active: 0,
    maxActive: 0,
    posted: [],
  };

  class MockTerrainWorker {
    private readonly messageListeners = new Set<
      (event: MessageEvent<unknown>) => void
    >();
    private readonly errorListeners = new Set<
      (event: MessageEvent<unknown>) => void
    >();

    addEventListener(
      type: string,
      listener: (event: MessageEvent<unknown>) => void,
    ): void {
      if (type === "message") {
        this.messageListeners.add(listener);
      } else if (type === "error") {
        this.errorListeners.add(listener);
      }
    }

    removeEventListener(
      type: string,
      listener: (event: MessageEvent<unknown>) => void,
    ): void {
      if (type === "message") {
        this.messageListeners.delete(listener);
      } else if (type === "error") {
        this.errorListeners.delete(listener);
      }
    }

    postMessage(message: unknown): void {
      const parsed = terrainCodecWorkerRequestSchema.safeParse(message);
      if (!parsed.success) {
        return;
      }
      control.posted.push(parsed.data);
      control.active += 1;
      control.maxActive = Math.max(control.maxActive, control.active);

      const deliver = (): void => {
        control.active -= 1;
        if (control.mode === "error") {
          for (const listener of this.errorListeners) {
            listener(new MessageEvent("error"));
          }
          return;
        }

        const request = parsed.data;
        const response: TerrainCodecWorkerResponse =
          request.type === "decode-lzss" || request.type === "decode-jpeg"
            ? control.mode === "decode-error"
              ? {
                  type: "decode-error",
                  jobId: request.jobId,
                  id: request.id,
                  code: "terrain.decode.bad-format",
                  message: "bad terrain bytes",
                }
              : {
                  type: "decoded",
                  jobId: request.jobId,
                  id: request.id,
                  width: request.supertileTexmapSize,
                  height: request.supertileTexmapSize,
                  rgbaBytes: new ArrayBuffer(
                    request.supertileTexmapSize *
                      request.supertileTexmapSize *
                      4,
                  ),
                }
            : control.mode === "encode-error"
              ? {
                  type: "encode-error",
                  jobId: request.jobId,
                  id: request.id,
                  code: "terrain.encode.failed",
                  message: "encode failed",
                }
              : {
                  type: "encoded",
                  jobId: request.jobId,
                  id: request.id,
                  encodedBytes: Uint8Array.from([request.id, 255]).buffer,
                  imageDescriptionBytes: Uint8Array.from([1, 2]).buffer,
                };

        if (control.mode === "foreign-then-success") {
          this.dispatch({
            data: { ...response, jobId: response.jobId + 100 },
          });
        }
        if (control.mode === "invalid-then-success") {
          this.dispatch({ data: { type: "not-a-terrain-response" } });
        }
        this.dispatch({ data: response });
      };

      if (control.mode === "delayed-success") {
        setTimeout(deliver, 5);
      } else {
        queueMicrotask(deliver);
      }
    }

    private dispatch(event: { data: unknown }): void {
      const messageEvent = new MessageEvent("message", { data: event.data });
      for (const listener of this.messageListeners) {
        listener(messageEvent);
      }
    }
  }

  return { control, MockTerrainWorker };
});

vi.mock("@/workers/terrainCodec.worker?worker", () => ({
  default: workerControl.MockTerrainWorker,
}));

const lzssCodec: TerrainTextureCodec = {
  kind: "lzss-rgb555",
  supertileTexmapSize: 2,
  bytesPerPixel: 2,
};

const jpegCodec: TerrainTextureCodec = {
  kind: "jpeg-supertile",
  supertileTexmapSize: 2,
};

function chunk(id: number): { id: number; bytes: ArrayBuffer } {
  return { id, bytes: new ArrayBuffer(2) };
}

beforeEach(() => {
  workerControl.control.mode = "success";
  workerControl.control.active = 0;
  workerControl.control.maxActive = 0;
  workerControl.control.posted.length = 0;
  vi.stubGlobal("navigator", { hardwareConcurrency: 5 });
});

describe("terrain codec worker client", () => {
  it("returns empty results without creating worker jobs", async () => {
    const decoded = await decodeTerrainChunks(lzssCodec, []).unwrapOr([]);
    const encoded = await encodeTerrainImages(lzssCodec, []).unwrapOr([]);

    expect(decoded).toEqual([]);
    expect(encoded).toEqual([]);
    expect(workerControl.control.posted).toHaveLength(0);
  });

  it("decodes chunks in sorted order and reports progress", async () => {
    const progress: { completed: number; total: number }[] = [];
    const result = await decodeTerrainChunks(
      lzssCodec,
      [chunk(20), chunk(10)],
      (value) => progress.push(value),
    );

    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    expect(result.value.map((tile) => tile.id)).toEqual([10, 20]);
    expect(result.value[0]?.imageData.width).toBe(2);
    expect(progress).toEqual([
      { completed: 1, total: 2 },
      { completed: 2, total: 2 },
    ]);
    expect(workerControl.control.posted).toHaveLength(2);
  });

  it("limits concurrent jobs and ignores a response for another job", async () => {
    workerControl.control.mode = "foreign-then-success";
    vi.stubGlobal("navigator", { hardwareConcurrency: 2 });

    const result = await decodeTerrainChunks(lzssCodec, [chunk(1), chunk(2)]);

    expect(result.isOk()).toBe(true);
    expect(workerControl.control.maxActive).toBe(1);
  });

  it("ignores malformed worker responses until a matching response arrives", async () => {
    workerControl.control.mode = "invalid-then-success";

    const result = await decodeTerrainChunks(lzssCodec, [chunk(1)]);

    expect(result.isOk()).toBe(true);
  });

  const workerFailureCases: [
    "decode-error" | "error",
    "terrain.decode.failed",
  ][] = [
    ["decode-error", "terrain.decode.failed"],
    ["error", "terrain.decode.failed"],
  ];

  it.each(workerFailureCases)("maps worker %s into a typed error", async (mode, code) => {
    workerControl.control.mode = mode;

    const result = await decodeTerrainChunks(lzssCodec, [chunk(1)]);

    expect(result.isErr()).toBe(true);
    if (result.isOk()) return;
    expect(result.error.code).toBe(code);
  });

  it("encodes JPEG images, preserving IDs and optional descriptions", async () => {
    const result = await encodeTerrainImages(
      jpegCodec,
      [
        {
          id: 8,
          request: {
            rgbaBytes: new ArrayBuffer(16),
            width: 2,
            height: 2,
          },
        },
      ],
    );

    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    expect(result.value[0]?.id).toBe(8);
    expect(Array.from(new Uint8Array(result.value[0]?.encodedBytes ?? []))).toEqual([
      8,
      255,
    ]);
    expect(result.value[0]?.imageDescriptionBytes).toBeDefined();
  });

  it("maps encode failures and releases the worker for later jobs", async () => {
    workerControl.control.mode = "encode-error";
    const failed = await encodeTerrainImages(lzssCodec, [
      { id: 0, request: { rgbaBytes: new ArrayBuffer(16), width: 2, height: 2 } },
    ]);
    expect(failed.isErr()).toBe(true);

    workerControl.control.mode = "success";
    const recovered = await encodeTerrainImages(lzssCodec, [
      { id: 0, request: { rgbaBytes: new ArrayBuffer(16), width: 2, height: 2 } },
    ]);
    expect(recovered.isOk()).toBe(true);
  });
});
