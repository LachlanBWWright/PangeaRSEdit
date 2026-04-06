import { describe, it, expect, vi, afterEach } from "vitest";
import { NodeIO } from "@gltf-transform/core";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { bg3dParsedToGLTF } from "@/modelParsers/parsedBg3dGitfConverter";
import { parse3DMFToMetaFile, metaFileToBG3DParseResult } from "@/modelParsers/threeDMF";
import { get3DMFDownloadArtifacts } from "@/pages/ModelViewer/utils/downloadUtils";
import type { BG3DParseResult } from "@/modelParsers/parseBG3D";
import type { BG3DGltfWorkerResponse } from "@/modelParsers/bg3dGltfWorker";

let workerBg3dResult: ArrayBuffer | null = null;
let workerParsed: BG3DParseResult | null = null;

function createMessageEvent<T>(data: T): MessageEvent<T> {
  return new MessageEvent("message", { data });
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return copy;
}

interface WorkerScope {
  postMessage: (response: BG3DGltfWorkerResponse) => void;
  onmessage?: (e: MessageEvent<{ type: "glb-to-bg3d"; buffer: ArrayBuffer }>) => Promise<void> | void;
}

vi.mock("@/modelParsers/bg3dGltfWorker?worker", () => ({
  default: class MockWorker {
    onmessage?: (e: MessageEvent<BG3DGltfWorkerResponse>) => void;
    onerror?: (e: unknown) => void;

    postMessage() {
      if (!workerBg3dResult) {
        expect.fail("workerBg3dResult was not initialized");
      }

      this.onmessage?.(
        createMessageEvent({
          type: "glb-to-bg3d",
          result: workerBg3dResult,
          parsed: workerParsed ?? undefined,
        }),
      );
    }

    terminate() {
      return undefined;
    }
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
    expect(originalMeta.isOk()).toBe(true);
    if (!originalMeta.isOk()) {
      expect.fail(String(originalMeta.error));
    }

    const parsedResult = metaFileToBG3DParseResult(originalMeta.value);
    expect(parsedResult.isOk()).toBe(true);
    if (parsedResult.isErr()) {
      expect.fail(String(parsedResult.error));
    }

    const parsed = parsedResult.value;

    void originalSkeleton;
    const gltfDocument = bg3dParsedToGLTF(parsed);

    const io = new NodeIO();
    const glbBytes = await io.writeBinary(gltfDocument);
    const glbBuffer = toArrayBuffer(glbBytes);
    const gltfUrl = "blob:rex.glb";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(glbBuffer, {
          status: 200,
          headers: { "Content-Type": "model/gltf-binary" },
        }),
      ),
    );

    const postMessage = vi.fn<(response: BG3DGltfWorkerResponse) => void>();
    const workerScope: WorkerScope = { postMessage };
    vi.stubGlobal("self", workerScope);

    await import("@/modelParsers/bg3dGltfWorker");
    if (typeof workerScope.onmessage !== "function") {
      expect.fail("Expected worker onmessage to be installed");
    }

	    await workerScope.onmessage(
	        createMessageEvent({
	          type: "glb-to-bg3d",
	          buffer: glbBuffer,
	        }),
	      );

    const response = postMessage.mock.calls.at(-1)?.[0];
    if (!response || response.type !== "glb-to-bg3d" || !response.parsed) {
      expect.fail("Expected parsed BG3D data from GLB import");
    }

    workerBg3dResult = response.result;
    workerParsed = response.parsed;

    const bytesResult = await get3DMFDownloadArtifacts(
      gltfUrl,
      "Rex",
      {
        id: "nanosaur",
        label: "Nanosaur",
        companionExtension: "3df",
        aliasResourceId: 1000,
        aliasName: "Limb 3DMF Alias",
        aliasPathPrefix: "Projects:Nanosaur:Data:Skeletons:",
      },
    );
    if (bytesResult.isErr()) {
      expect.fail(String(bytesResult.error));
    }

    const bytes = bytesResult.value.modelBytes;
    expect(bytes.byteLength).toBeGreaterThan(0);

    const parseResult = parse3DMFToMetaFile(bytes);
    expect(parseResult.isOk()).toBe(true);
    if (!parseResult.isOk()) {
      expect.fail(String(parseResult.error));
    }

    const bg3dResult = metaFileToBG3DParseResult(parseResult.value);
    expect(bg3dResult.isOk()).toBe(true);
    if (bg3dResult.isErr()) {
      expect.fail(String(bg3dResult.error));
    }

    if (bg3dResult.value.skeleton) {
      expect(bg3dResult.value.skeleton.animations.length).toBeGreaterThan(0);
    }
  });
});
