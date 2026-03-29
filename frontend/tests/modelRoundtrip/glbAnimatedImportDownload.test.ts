import { describe, it, expect, vi, afterEach } from "vitest";
import { NodeIO } from "@gltf-transform/core";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { parseBG3D } from "@/modelParsers/parseBG3D";
import { parseSkeletonRsrc } from "@/modelParsers/skeletonRsrc/parseSkeletonRsrcTS";
import { bg3dParsedToGLTF } from "@/modelParsers/parsedBg3dGitfConverter";
import { parseBG3DWithSkeletonResource } from "@/modelParsers/bg3dWithSkeleton";
import { getBG3DDownloadArtifacts } from "@/pages/ModelViewer/utils/downloadUtils";
import type { BG3DParseResult } from "@/modelParsers/parseBG3D";
import type { BG3DGltfWorkerResponse } from "@/modelParsers/bg3dGltfWorker";
import { unwrap } from "@/types/result";

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
        throw new Error("workerBg3dResult was not initialized");
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

describe("Animated GLB import download", () => {
  it("downloads a .skeleton.rsrc even when the GLB does not preserve original skeleton bytes", async () => {
    const bg3dPath = join(__dirname, "../../public/games/ottomatic/skeletons/Otto.bg3d");
    const skelPath = join(__dirname, "../../public/games/ottomatic/skeletons/Otto.skeleton.rsrc");

    if (!existsSync(bg3dPath) || !existsSync(skelPath)) {
      console.warn(`Skipping - files not found: ${bg3dPath}`);
      return;
    }

    const originalBg3d = bufferFromFile(bg3dPath);
    const originalSkeleton = bufferFromFile(skelPath);
    const skeletonResource = await parseSkeletonRsrc(originalSkeleton);
    const parsed = unwrap(parseBG3D(originalBg3d, skeletonResource));

    // Build a GLB without preserving original alias data so the export path
    // must synthesize a valid alias record from the selected game preset.
    const parsedWithoutAlias = {
      ...parsed,
      skeleton: parsed.skeleton
        ? { ...parsed.skeleton, alisData: undefined }
        : undefined,
    };
    const gltfDocument = bg3dParsedToGLTF(parsedWithoutAlias);
    const io = new NodeIO();
    const glbBytes = await io.writeBinary(gltfDocument);
    const glbBuffer = toArrayBuffer(glbBytes);
    const gltfUrl = "blob:animated.glb";
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
      throw new Error("Expected worker onmessage to be installed");
    }

    await workerScope.onmessage(
        createMessageEvent({
          type: "glb-to-bg3d" as const,
          buffer: glbBuffer,
        }),
      );

    const response = postMessage.mock.calls.at(-1)?.[0];
    if (!response || response.type !== "glb-to-bg3d" || !response.parsed) {
      throw new Error("Expected parsed BG3D data from animated GLB import");
    }

    workerBg3dResult = response.result;
    workerParsed = response.parsed;

    const artifactsResult = await getBG3DDownloadArtifacts(gltfUrl);
    if (artifactsResult.isErr()) {
      throw artifactsResult.error;
    }

    const artifacts = artifactsResult.value;
    if (!artifacts.skeletonBytes) {
      throw new Error("Expected synthesized skeleton bytes from animated GLB import");
    }

    const importedSkeleton = await parseSkeletonRsrc(artifacts.skeletonBytes);
    const importedParsed = parseBG3DWithSkeletonResource(artifacts.bg3dBytes, importedSkeleton);
    if (importedParsed.isErr()) {
      throw importedParsed.error;
    }

    expect(artifacts.bg3dBytes.byteLength).toBeGreaterThan(0);
    expect(importedParsed.value.skeleton?.animations.length).toBeGreaterThan(0);
  });
});
