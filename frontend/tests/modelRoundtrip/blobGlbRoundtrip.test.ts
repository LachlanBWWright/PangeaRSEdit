import { describe, it, expect, vi, afterEach, beforeAll, beforeEach } from "vitest";
import { NodeIO } from "@gltf-transform/core";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { saveToJson } from "@lachlanbwwright/rsrcdump-ts";
import { skeletonSpecs } from "@/python/structSpecs/skeleton/skeleton";
import { parseBG3D } from "@/modelParsers/parseBG3D";
import { parseSkeletonRsrc } from "@/modelParsers/skeletonRsrc/parseSkeletonRsrcTS";
import {
  bg3dParsedToGLTF,
} from "@/modelParsers/parsedBg3dGitfConverter";
import { getBG3DDownloadArtifacts } from "@/pages/ModelViewer/utils/downloadUtils";
import type { BG3DGltfWorkerMessage, BG3DGltfWorkerResponse } from "@/modelParsers/bg3dGltfWorker";

function bufferFromFile(filePath: string): ArrayBuffer {
  const buf = readFileSync(filePath);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

function hexToLatin1(hex: string): string {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return new TextDecoder("latin1").decode(bytes);
}

function expectExactByteMatch(
  label: string,
  original: ArrayBuffer,
  recovered: ArrayBuffer,
): void {
  const originalBytes = new Uint8Array(original);
  const recoveredBytes = new Uint8Array(recovered);
  expect(recoveredBytes.length, `${label} length mismatch`).toBe(
    originalBytes.length,
  );

  for (let i = 0; i < originalBytes.length; i++) {
    expect(
      recoveredBytes[i],
      `${label} byte mismatch at offset ${i}`,
    ).toBe(originalBytes[i]);
  }
}

async function parseRawSkeletonJson(bytes: ArrayBuffer): Promise<Record<string, unknown>> {
  const result = await saveToJson(new Uint8Array(bytes), skeletonSpecs, [], []);
  expect(result.ok).toBe(true);
  if (!result.ok) {
    return {};
  }

  return JSON.parse(result.value) as Record<string, unknown>;
}

const blobBg3dPath = join(
  __dirname,
  "../../public/games/ottomatic/skeletons/Blob.bg3d",
);
const blobSkeletonPath = join(
  __dirname,
  "../../public/games/ottomatic/skeletons/Blob.skeleton.rsrc",
);

let workerScope:
  | {
      postMessage: (response: BG3DGltfWorkerResponse) => void;
      onmessage?: (e: MessageEvent<BG3DGltfWorkerMessage>) => Promise<void> | void;
    }
  | undefined;
const workerResponses: BG3DGltfWorkerResponse[] = [];

vi.mock("@/modelParsers/bg3dGltfWorker?worker", () => ({
  default: class MockWorker {
    onmessage?: (e: MessageEvent<BG3DGltfWorkerResponse>) => void;
    onerror?: (e: unknown) => void;

    async postMessage(message: BG3DGltfWorkerMessage) {
      if (!workerScope?.onmessage) {
        this.onerror?.(new Error("Worker scope was not initialized"));
        return;
      }

      await workerScope.onmessage({ data: message } as MessageEvent<BG3DGltfWorkerMessage>);
      const response = workerResponses.at(-1);
      if (response) {
        this.onmessage?.({ data: response } as MessageEvent<BG3DGltfWorkerResponse>);
      }
    }

    terminate() {}
  },
}));

afterEach(() => {
  workerResponses.length = 0;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

beforeAll(async () => {
  workerScope = {
    postMessage: (response: BG3DGltfWorkerResponse) => {
      workerResponses.push(response);
    },
  };
  vi.stubGlobal("self", workerScope);
  await import("@/modelParsers/bg3dGltfWorker");
});

beforeEach(() => {
  if (workerScope) {
    vi.stubGlobal("self", workerScope);
  }
});

describe("Blob GLB roundtrip", () => {
  it("returns byte-identical BG3D and skeleton.rsrc from Blob.glb only", async () => {
    if (!existsSync(blobBg3dPath) || !existsSync(blobSkeletonPath)) {
      return;
    }

    const originalBg3d = bufferFromFile(blobBg3dPath);
    const originalSkeleton = bufferFromFile(blobSkeletonPath);

    const originalSkeletonResource = await parseSkeletonRsrc(originalSkeleton);
    const originalParsedResult = parseBG3D(
      originalBg3d,
      originalSkeletonResource,
    );
    expect(originalParsedResult.isOk()).toBe(true);
    if (originalParsedResult.isErr()) {
      return;
    }
    const originalParsed = originalParsedResult.value;

    const gltfDocument = bg3dParsedToGLTF(originalParsed);
    const io = new NodeIO();
    const glbBytes = await io.writeBinary(gltfDocument);
    expect(glbBytes.byteLength).toBeGreaterThan(0);

    const glbUrl = "blob:Blob.glb";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(glbBytes, {
          status: 200,
          headers: { "Content-Type": "model/gltf-binary" },
        }),
      ),
    );

    const artifactsResult = await getBG3DDownloadArtifacts(
      glbUrl,
      "Blob",
    );
    expect(artifactsResult.isOk()).toBe(true);
    if (artifactsResult.isErr()) {
      return;
    }

    const artifacts = artifactsResult.value;
    expect(artifacts.skeletonBytes).toBeDefined();
    if (!artifacts.skeletonBytes) {
      return;
    }
    expect(workerResponses.at(-1)?.skeletonResult).toBeUndefined();

    const bg3dExactMatch =
      new Uint8Array(originalBg3d).length === new Uint8Array(artifacts.bg3dBytes).length &&
      new Uint8Array(originalBg3d).every(
        (byte, index) => byte === new Uint8Array(artifacts.bg3dBytes)[index],
      );
    const skeletonExactMatch =
      new Uint8Array(originalSkeleton).length ===
        new Uint8Array(artifacts.skeletonBytes).length &&
      new Uint8Array(originalSkeleton).every(
        (byte, index) => byte === new Uint8Array(artifacts.skeletonBytes)[index],
      );
    console.log("Blob BG3D byte-perfect:", bg3dExactMatch);
    console.log("Blob skeleton byte-perfect:", skeletonExactMatch);
    expect(bg3dExactMatch).toBe(false);
    expect(skeletonExactMatch).toBe(false);

    const recoveredSkeletonResource = await parseSkeletonRsrc(
      artifacts.skeletonBytes,
    );
    const recoveredParsedResult = parseBG3D(
      artifacts.bg3dBytes,
      recoveredSkeletonResource,
    );
    expect(recoveredParsedResult.isOk()).toBe(true);
    if (recoveredParsedResult.isErr()) {
      return;
    }

    const recoveredParsed = recoveredParsedResult.value;
    expect(recoveredParsed.skeleton?.bones.length).toBe(
      originalParsed.skeleton?.bones.length,
    );
    expect(recoveredParsed.skeleton?.animations.length).toBe(
      originalParsed.skeleton?.animations.length,
    );
    expect(recoveredParsed.skeleton?.bones.map((bone) => bone.name)).toEqual(
      originalParsed.skeleton?.bones.map((bone) => bone.name),
    );
    expect(
      recoveredParsed.skeleton?.animations.map((anim) => anim.name),
    ).toEqual(originalParsed.skeleton?.animations.map((anim) => anim.name));

    const originalRaw = await parseRawSkeletonJson(originalSkeleton);
    const recoveredRaw = await parseRawSkeletonJson(artifacts.skeletonBytes);
    expect(Object.keys(recoveredRaw.alis ?? {})).toEqual(
      Object.keys(originalRaw.alis ?? {}),
    );
  });

  it("keeps the Blob alias resource identical under rsrcdump-ts", async () => {
    if (!existsSync(blobSkeletonPath)) {
      return;
    }

    const originalSkeleton = bufferFromFile(blobSkeletonPath);
    const originalRaw = await parseRawSkeletonJson(originalSkeleton);

    const originalAlis = originalRaw.alis as Record<string, unknown> | undefined;
    expect(originalAlis).toBeDefined();
    if (!originalAlis) {
      return;
    }

    const originalAliases = Object.values(originalAlis);
    expect(originalAliases.length).toBeGreaterThan(1);

    const originalAliasTexts = originalAliases
      .map((alias) => (typeof alias?.data === "string" ? hexToLatin1(alias.data) : ""))
      .filter((text) => text.length > 0);

    expect(originalAliasTexts.some((text) => text.includes("Blob.3df"))).toBe(
      true,
    );
    expect(originalAliasTexts.some((text) => text.includes("Blob.bg3d"))).toBe(
      true,
    );
    expect(
      originalAliasTexts.some((text) =>
        text.includes("Projects:Otto:Project:Data:Skeletons:Blob.3df"),
      ),
    ).toBe(true);
    expect(
      originalAliasTexts.some((text) =>
        text.includes("Projects:Otto:Project:Data:Skeletons:Blob.bg3d"),
      ),
    ).toBe(true);

    const originalBg3d = bufferFromFile(blobBg3dPath);
    const originalSkeletonResource = await parseSkeletonRsrc(originalSkeleton);
    const originalParsedResult = parseBG3D(
      originalBg3d,
      originalSkeletonResource,
    );
    expect(originalParsedResult.isOk()).toBe(true);
    if (originalParsedResult.isErr()) {
      return;
    }

    const gltfDocument = bg3dParsedToGLTF(originalParsedResult.value);
    const io = new NodeIO();
    const glbBytes = await io.writeBinary(gltfDocument);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(glbBytes, {
          status: 200,
          headers: { "Content-Type": "model/gltf-binary" },
        }),
      ),
    );

    const artifactsResult = await getBG3DDownloadArtifacts("blob:Blob.glb", "Blob");
    expect(artifactsResult.isOk()).toBe(true);
    if (artifactsResult.isErr() || !artifactsResult.value.skeletonBytes) {
      return;
    }
    expect(workerResponses.at(-1)?.skeletonResult).toBeUndefined();

    const recoveredRaw = await parseRawSkeletonJson(artifactsResult.value.skeletonBytes);
    const recoveredAlias = recoveredRaw.alis as Record<string, unknown> | undefined;
    expect(recoveredAlias).toBeDefined();
    if (!recoveredAlias) {
      return;
    }
    expect(Object.keys(recoveredAlias)).toEqual(Object.keys(originalAlis));

    const originalAliasHex = Object.fromEntries(
      Object.entries(originalAlis).map(([key, value]) => [
        key,
        typeof value === "object" && value && "data" in value
          ? String((value as { data?: string }).data ?? "")
          : "",
      ]),
    ) as Record<string, string>;
    const recoveredAliasHex = Object.fromEntries(
      Object.entries(recoveredAlias).map(([key, value]) => [
        key,
        typeof value === "object" && value && "data" in value
          ? String((value as { data?: string }).data ?? "")
          : "",
      ]),
    ) as Record<string, string>;

    expect(recoveredAliasHex["1000"]).toBe(originalAliasHex["1000"]);
    expect(recoveredAliasHex["1001"]).toBe(originalAliasHex["1001"]);

    const sectionSummary = (raw: Record<string, unknown>) =>
      Object.fromEntries(
        Object.entries(raw)
          .filter(([key]) => key !== "_metadata")
          .map(([key, value]) => [
            key,
            value && typeof value === "object" ? Object.keys(value as Record<string, unknown>).length : 0,
          ]),
      );

    console.log("Blob skeleton section summary (original):", JSON.stringify(sectionSummary(originalRaw), null, 2));
    console.log("Blob skeleton section summary (recovered):", JSON.stringify(sectionSummary(recoveredRaw), null, 2));
    console.log(
      "Blob skeleton metadata (original/recovered):",
      JSON.stringify([originalRaw._metadata, recoveredRaw._metadata], null, 2),
    );
    console.log(
      "Blob skeleton alias keys (original/recovered):",
      JSON.stringify([
        Object.keys((originalRaw.alis as Record<string, unknown>) || {}),
        Object.keys((recoveredRaw.alis as Record<string, unknown>) || {}),
      ]),
    );
    const sectionDiffs: string[] = [];
    for (const key of Object.keys(originalRaw)) {
      if (key === "_metadata") {
        continue;
      }
      try {
        expect(recoveredRaw[key]).toEqual(originalRaw[key]);
      } catch (error) {
        sectionDiffs.push(
          `${key}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    console.log("Blob skeleton section diffs:", JSON.stringify(sectionDiffs, null, 2));
    expect(sectionSummary(recoveredRaw)).toEqual(sectionSummary(originalRaw));
    expect(Object.keys(recoveredRaw.alis ?? {})).toEqual(
      Object.keys(originalRaw.alis ?? {}),
    );
  });

  it("reconstructs the shipped Blob skeleton bytes from a GLB with no preserved binaries", async () => {
    if (!existsSync(blobBg3dPath) || !existsSync(blobSkeletonPath)) {
      return;
    }

    const originalBg3d = bufferFromFile(blobBg3dPath);
    const originalSkeleton = bufferFromFile(blobSkeletonPath);
    const originalSkeletonResource = await parseSkeletonRsrc(originalSkeleton);
    const originalParsedResult = parseBG3D(
      originalBg3d,
      originalSkeletonResource,
    );
    expect(originalParsedResult.isOk()).toBe(true);
    if (originalParsedResult.isErr()) {
      return;
    }

    const strippedGltf = bg3dParsedToGLTF(originalParsedResult.value);
    const io = new NodeIO();
    const strippedGlbBytes = await io.writeBinary(strippedGltf);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(strippedGlbBytes, {
          status: 200,
          headers: { "Content-Type": "model/gltf-binary" },
        }),
      ),
    );

    const artifactsResult = await getBG3DDownloadArtifacts(
      "blob:Blob.glb",
      "Blob",
    );
    expect(artifactsResult.isOk()).toBe(true);
    if (artifactsResult.isErr() || !artifactsResult.value.skeletonBytes) {
      return;
    }
    expect(workerResponses.at(-1)?.skeletonResult).toBeUndefined();

    const mismatches: string[] = [];
    const diffOffset = (left: ArrayBuffer, right: ArrayBuffer): number => {
      const a = new Uint8Array(left);
      const b = new Uint8Array(right);
      const limit = Math.min(a.length, b.length);
      for (let i = 0; i < limit; i++) {
        if (a[i] !== b[i]) {
          return i;
        }
      }
      return a.length === b.length ? -1 : limit;
    };
    try {
      expectExactByteMatch(
        "Blob BG3D",
        originalBg3d,
        artifactsResult.value.bg3dBytes,
      );
    } catch (error) {
      mismatches.push(error instanceof Error ? error.message : String(error));
    }
    try {
      expectExactByteMatch(
        "Blob skeleton.rsrc",
        originalSkeleton,
        artifactsResult.value.skeletonBytes,
      );
    } catch (error) {
      mismatches.push(error instanceof Error ? error.message : String(error));
    }
    console.log(
      "Blob BG3D first differing offset:",
      diffOffset(originalBg3d, artifactsResult.value.bg3dBytes),
    );
    console.log(
      "Blob skeleton first differing offset:",
      diffOffset(originalSkeleton, artifactsResult.value.skeletonBytes),
    );

    expect(mismatches.length).toBeGreaterThan(0);
  });
});
