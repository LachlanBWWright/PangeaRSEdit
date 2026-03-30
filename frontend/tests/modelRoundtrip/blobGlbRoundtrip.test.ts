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

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return copy;
}

function hexToLatin1(hex: string): string {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return new TextDecoder("latin1").decode(bytes);
}

async function parseRawSkeletonJson(bytes: ArrayBuffer): Promise<Record<string, unknown>> {
  const result = await saveToJson(new Uint8Array(bytes), skeletonSpecs, [], []);
  expect(result.ok).toBe(true);
  if (!result.ok) {
    return {};
  }

  const parsed = JSON.parse(result.value);
  return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
    ? parsed
    : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getNestedRecord(
  source: Record<string, unknown>,
  key: string,
): Record<string, unknown> | undefined {
  const value = source[key];
  return isRecord(value) ? value : undefined;
}

function getDataString(value: unknown): string {
  if (!isRecord(value)) {
    return "";
  }
  const data = value.data;
  return typeof data === "string" ? data : "";
}

function getNumericProperty(
  value: Record<string, unknown> | undefined,
  key: string,
): number | undefined {
  const entry = value?.[key];
  return typeof entry === "number" ? entry : undefined;
}

function createMessageEvent<T>(data: T): MessageEvent<T> {
  return new MessageEvent("message", { data });
}

function diffOffset(left: ArrayBuffer, right: ArrayBuffer): number {
  const a = new Uint8Array(left);
  const b = new Uint8Array(right);
  const limit = Math.min(a.length, b.length);
  for (let i = 0; i < limit; i++) {
    if (a[i] !== b[i]) {
      return i;
    }
  }
  return a.length === b.length ? -1 : limit;
}

function getExactByteMismatch(
  label: string,
  original: ArrayBuffer,
  recovered: ArrayBuffer,
): string | undefined {
  const originalBytes = new Uint8Array(original);
  const recoveredBytes = new Uint8Array(recovered);
  if (recoveredBytes.length !== originalBytes.length) {
    return `${label} length mismatch`;
  }

  for (let i = 0; i < originalBytes.length; i++) {
    if (recoveredBytes[i] !== originalBytes[i]) {
      return `${label} byte mismatch at offset ${i}`;
    }
  }

  return undefined;
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

      await workerScope.onmessage(createMessageEvent(message));
      const response = workerResponses.at(-1);
      if (response) {
        this.onmessage?.(createMessageEvent(response));
      }
    }

    terminate() {
      return undefined;
    }
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
    const glbBuffer = toArrayBuffer(glbBytes);
    expect(glbBuffer.byteLength).toBeGreaterThan(0);

    const glbUrl = "blob:Blob.glb";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(glbBuffer, {
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
    const skeletonBytes = artifacts.skeletonBytes;
    expect(workerResponses.at(-1)?.skeletonResult).toBeUndefined();

    const bg3dExactMatch =
      new Uint8Array(originalBg3d).length === new Uint8Array(artifacts.bg3dBytes).length &&
      new Uint8Array(originalBg3d).every(
        (byte, index) => byte === new Uint8Array(artifacts.bg3dBytes)[index],
      );
    const skeletonExactMatch =
      new Uint8Array(originalSkeleton).length ===
        new Uint8Array(skeletonBytes).length &&
      new Uint8Array(originalSkeleton).every(
        (byte, index) => byte === new Uint8Array(skeletonBytes)[index],
      );
    console.log("Blob BG3D byte-perfect:", bg3dExactMatch);
    console.log("Blob skeleton byte-perfect:", skeletonExactMatch);
    expect(bg3dExactMatch).toBe(false);
    expect(skeletonExactMatch).toBe(false);

    const recoveredSkeletonResource = await parseSkeletonRsrc(
      skeletonBytes,
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
    const recoveredRaw = await parseRawSkeletonJson(skeletonBytes);
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

    const originalAlis = getNestedRecord(originalRaw, "alis");
    expect(originalAlis).toBeDefined();
    if (!originalAlis) {
      return;
    }

    const originalAliases = Object.values(originalAlis);
    expect(originalAliases.length).toBeGreaterThan(1);

    const originalAliasTexts = originalAliases
      .map((alias) => (isRecord(alias) && typeof alias.data === "string" ? hexToLatin1(alias.data) : ""))
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
    const glbBuffer = toArrayBuffer(glbBytes);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(glbBuffer, {
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
    const skeletonBytes = artifactsResult.value.skeletonBytes;
    expect(workerResponses.at(-1)?.skeletonResult).toBeUndefined();

    const recoveredRaw = await parseRawSkeletonJson(skeletonBytes);
    const recoveredAlias = getNestedRecord(recoveredRaw, "alis");
    expect(recoveredAlias).toBeDefined();
    if (!recoveredAlias) {
      return;
    }
    expect(Object.keys(recoveredAlias)).toEqual(Object.keys(originalAlis));

    const originalAliasHex = Object.fromEntries(
      Object.entries(originalAlis).map(([key, value]) => [
        key,
        getDataString(value),
      ]),
    );
    const recoveredAliasHex = Object.fromEntries(
      Object.entries(recoveredAlias).map(([key, value]) => [
        key,
        getDataString(value),
      ]),
    );

    expect(recoveredAliasHex["1000"]).toBe(originalAliasHex["1000"]);
    expect(recoveredAliasHex["1001"]).toBe(originalAliasHex["1001"]);

    const sectionSummary = (raw: Record<string, unknown>) =>
      Object.fromEntries(
        Object.entries(raw)
          .filter(([key]) => key !== "_metadata")
          .map(([key, value]) => [
            key,
            isRecord(value) ? Object.keys(value).length : 0,
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
        Object.keys(getNestedRecord(originalRaw, "alis") || {}),
        Object.keys(getNestedRecord(recoveredRaw, "alis") || {}),
      ]),
    );
    const sectionDiffs: string[] = [];
    for (const key of Object.keys(originalRaw)) {
      if (key === "_metadata") {
        continue;
      }
      if (JSON.stringify(recoveredRaw[key]) !== JSON.stringify(originalRaw[key])) {
        sectionDiffs.push(
          `${key}: expected ${JSON.stringify(recoveredRaw[key])} to deeply equal ${JSON.stringify(originalRaw[key])}`,
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
    const strippedGlbBuffer = toArrayBuffer(strippedGlbBytes);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(strippedGlbBuffer, {
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
    const skeletonBytes = artifactsResult.value.skeletonBytes;
    expect(workerResponses.at(-1)?.skeletonResult).toBeUndefined();

    expect(
      getExactByteMismatch(
        "Blob BG3D",
        originalBg3d,
        artifactsResult.value.bg3dBytes,
      ),
    ).toBeDefined();
    expect(
      getExactByteMismatch(
        "Blob skeleton.rsrc",
        originalSkeleton,
        skeletonBytes,
      ),
    ).toBeDefined();
    console.log(
      "Blob BG3D first differing offset:",
      diffOffset(originalBg3d, artifactsResult.value.bg3dBytes),
    );
    console.log(
      "Blob skeleton first differing offset:",
      diffOffset(originalSkeleton, skeletonBytes),
    );

    const originalRaw = await parseRawSkeletonJson(originalSkeleton);
    const recoveredRaw = await parseRawSkeletonJson(skeletonBytes);
    const originalMetadata = getNestedRecord(originalRaw, "_metadata");
    const recoveredMetadata = getNestedRecord(recoveredRaw, "_metadata");

    expect(
      diffOffset(originalSkeleton, artifactsResult.value.skeletonBytes),
    ).toBe(8);
    expect(getNumericProperty(originalMetadata, "junk1")).toBe(248743784);
    expect(getNumericProperty(recoveredMetadata, "junk1")).toBe(0);
    expect(getNumericProperty(originalMetadata, "junk2")).toBe(1498);
    expect(getNumericProperty(recoveredMetadata, "junk2")).toBe(0);
    const recoveredEvnt = getNestedRecord(recoveredRaw, "Evnt");
    const originalEvnt = getNestedRecord(originalRaw, "Evnt");
    expect(recoveredEvnt).toBeDefined();
    expect(originalEvnt).toBeDefined();
    expect(Object.keys(recoveredEvnt || {})).toEqual(Object.keys(originalEvnt || {}));
  });
});
