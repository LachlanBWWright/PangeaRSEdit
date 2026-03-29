import { describe, it, expect, vi, afterEach } from "vitest";
import { NodeIO } from "@gltf-transform/core";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { bg3dParsedToBG3D } from "@/modelParsers/parseBG3D";
import { bg3dParsedToGLTF } from "@/modelParsers/parsedBg3dGitfConverter";
import { parse3DMFToMetaFile, metaFileToBG3DParseResult } from "@/modelParsers/threeDMF";
import { get3DMFDownloadBytes } from "@/pages/ModelViewer/utils/downloadUtils";
import type { BG3DParseResult } from "@/modelParsers/parseBG3D";
import type { BG3DGltfWorkerResponse } from "@/modelParsers/bg3dGltfWorker";

let workerBg3dResult: ArrayBuffer | null = null;
let workerParsed: BG3DParseResult | null = null;

vi.mock("@/modelParsers/bg3dGltfWorker?worker", () => ({
  default: class MockWorker {
    onmessage?: (e: MessageEvent<BG3DGltfWorkerResponse>) => void;
    onerror?: (e: unknown) => void;

    postMessage() {
      if (!workerBg3dResult) {
        throw new Error("workerBg3dResult was not initialized");
      }

      this.onmessage?.({
        data: {
          type: "glb-to-bg3d",
          result: workerBg3dResult,
          parsed: workerParsed ?? undefined,
        },
      } as MessageEvent<BG3DGltfWorkerResponse>);
    }

    terminate() {}
  },
}));

function bufferFromFile(filePath: string): ArrayBuffer {
  const buf = readFileSync(filePath);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

afterEach(() => {
  workerBg3dResult = null;
  workerParsed = null;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("3DMF download after GLB import", () => {
  it("produces a valid 3DMF file from GLB-derived BG3D data", async () => {
    const modelPath = join(__dirname, "../../public/games/nanosaur1/skeletons/Rex.3dmf");
    const skelPath = join(__dirname, "../../public/games/nanosaur1/skeletons/Rex.skeleton.rsrc");

    if (!existsSync(modelPath) || !existsSync(skelPath)) {
      console.warn(`Skipping - files not found: ${modelPath}`);
      return;
    }

    const originalModel = bufferFromFile(modelPath);
    const originalSkeleton = bufferFromFile(skelPath);
    const originalMeta = parse3DMFToMetaFile(originalModel);
    expect(originalMeta.ok).toBe(true);
    if (!originalMeta.ok) {
      throw originalMeta.error;
    }

    const parsedResult = metaFileToBG3DParseResult(originalMeta.value);
    expect(parsedResult.isOk()).toBe(true);
    if (parsedResult.isErr()) {
      throw parsedResult.error;
    }

    const parsed = parsedResult.value;

    const gltfDocument = bg3dParsedToGLTF(parsed, {
      bg3dBuffer: bg3dParsedToBG3D(parsed),
      skeletonBuffer: originalSkeleton,
    });

    const io = new NodeIO();
    const glbBytes = await io.writeBinary(gltfDocument);
    const gltfUrl = "blob:rex.glb";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(glbBytes, {
          status: 200,
          headers: { "Content-Type": "model/gltf-binary" },
        }),
      ),
    );

    const postMessage = vi.fn();
    const workerScope = { postMessage } as {
      postMessage: typeof postMessage;
      onmessage?: (e: MessageEvent<any>) => Promise<void> | void;
    };
    vi.stubGlobal("self", workerScope);

    await import("@/modelParsers/bg3dGltfWorker");
    if (typeof workerScope.onmessage !== "function") {
      throw new Error("Expected worker onmessage to be installed");
    }

    await workerScope.onmessage({
      data: {
        type: "glb-to-bg3d",
        buffer: glbBytes,
      },
    } as MessageEvent<any>);

    const response = postMessage.mock.calls.at(-1)?.[0] as BG3DGltfWorkerResponse;
    if (response.type !== "glb-to-bg3d" || !response.parsed) {
      throw new Error("Expected parsed BG3D data from GLB import");
    }

    workerBg3dResult = response.result;
    workerParsed = response.parsed;

    const bytesResult = await get3DMFDownloadBytes(gltfUrl);
    if (bytesResult.isErr()) {
      throw bytesResult.error;
    }

    const bytes = bytesResult.value;
    expect(bytes.byteLength).toBeGreaterThan(0);

    const parseResult = parse3DMFToMetaFile(bytes);
    expect(parseResult.ok).toBe(true);
    if (!parseResult.ok) {
      throw parseResult.error;
    }

    const bg3dResult = metaFileToBG3DParseResult(parseResult.value);
    expect(bg3dResult.isOk()).toBe(true);
    if (bg3dResult.isErr()) {
      throw bg3dResult.error;
    }

    if (bg3dResult.value.skeleton) {
      expect(bg3dResult.value.skeleton.animations.length).toBeGreaterThan(0);
    }
  });
});
