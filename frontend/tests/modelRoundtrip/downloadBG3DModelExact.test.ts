import { describe, it, expect, vi, afterEach } from "vitest";
import { NodeIO } from "@gltf-transform/core";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { parseBG3D } from "@/modelParsers/parseBG3D";
import { parseSkeletonRsrc } from "@/modelParsers/skeletonRsrc/parseSkeletonRsrcTS";
import { bg3dParsedToGLTF } from "@/modelParsers/parsedBg3dGitfConverter";
import { getBG3DDownloadArtifacts } from "@/pages/ModelViewer/utils/downloadUtils";
import type { BG3DParseResult } from "@/modelParsers/parseBG3D";
import type { BG3DGltfWorkerResponse } from "@/modelParsers/bg3dGltfWorker";
import { unwrap } from "@/types/result";

let workerBg3dResult: ArrayBuffer | null = null;
let workerSkeletonResult: ArrayBuffer | null = null;
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
          skeletonResult: workerSkeletonResult ?? undefined,
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

function expectExactByteMatch(label: string, original: ArrayBuffer, recovered: ArrayBuffer) {
  const originalBytes = new Uint8Array(original);
  const recoveredBytes = new Uint8Array(recovered);

  expect(recoveredBytes.length, `${label} length mismatch`).toBe(originalBytes.length);

  for (let i = 0; i < originalBytes.length; i++) {
    if (originalBytes[i] !== recoveredBytes[i]) {
      throw new Error(
        `${label} byte mismatch at offset ${i}: original=0x${(originalBytes[i] ?? 0).toString(16)} recovered=0x${(recoveredBytes[i] ?? 0).toString(16)}`,
      );
    }
  }
}

afterEach(() => {
  workerBg3dResult = null;
  workerSkeletonResult = null;
  workerParsed = null;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("BG3D download after GLB import", () => {
  it("downloads a byte-perfect .skeleton.rsrc from imported GLB model state", async () => {
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
    const gltfDocument = bg3dParsedToGLTF(parsed, {
      bg3dBuffer: originalBg3d,
      skeletonBuffer: originalSkeleton,
    });

    const io = new NodeIO();
    const glbBytes = await io.writeBinary(gltfDocument);
    const gltfUrl = "blob:otto.glb";
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
    workerSkeletonResult = response.skeletonResult ?? null;
    workerParsed = response.parsed;

    const artifactsResult = await getBG3DDownloadArtifacts(gltfUrl);
    if (artifactsResult.isErr()) {
      throw artifactsResult.error;
    }

    const artifacts = artifactsResult.value;
    if (!artifacts.skeletonBytes) {
      throw new Error("Expected skeleton bytes to be available from GLB download artifacts");
    }

    expectExactByteMatch("BG3D download", originalBg3d, artifacts.bg3dBytes);
    expectExactByteMatch("skeleton.rsrc download", originalSkeleton, artifacts.skeletonBytes);
  });
});
