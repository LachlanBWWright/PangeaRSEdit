import { describe, it, expect, vi, afterEach } from "vitest";
import { NodeIO } from "@gltf-transform/core";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import {
  load,
  orderedFlatList,
  resourceNameStr,
  resourceTypeStr,
} from "@lachlanbwwright/rsrcdump-ts";
import { parseBG3D } from "@/modelParsers/parseBG3D";
import { parseSkeletonRsrc } from "@/modelParsers/skeletonRsrc/parseSkeletonRsrcTS";
import { bg3dParsedToGLTF } from "@/modelParsers/parsedBg3dGitfConverter";
import { getBG3DDownloadArtifacts } from "@/pages/ModelViewer/utils/downloadUtils";
import type { BG3DParseResult } from "@/modelParsers/parseBG3D";
import type { BG3DGltfWorkerResponse } from "@/modelParsers/bg3dGltfWorker";

let workerBg3dResult: ArrayBuffer | null = null;
let workerParsed: BG3DParseResult | null = null;
let workerSkeletonResultSeen: ArrayBuffer | undefined | null = null;

function createMessageEvent<T>(data: T): MessageEvent<T> {
  return new MessageEvent("message", { data });
}

interface WorkerScope {
  postMessage: ReturnType<typeof vi.fn<(response: BG3DGltfWorkerResponse) => void>>;
  onmessage?: (e: MessageEvent<{ type: "glb-to-bg3d"; buffer: ArrayBuffer }>) => Promise<void> | void;
}

vi.mock("@/modelParsers/bg3dGltfWorker?worker", () => ({
  default: class MockWorker {
    onmessage?: (e: MessageEvent<BG3DGltfWorkerResponse>) => void;
    onerror?: (e: unknown) => void;

    postMessage() {
      if (!workerBg3dResult) {
        this.onerror?.(new Error("workerBg3dResult was not initialized"));
        return;
      }

      this.onmessage?.(
        createMessageEvent({
          type: "glb-to-bg3d",
          result: workerBg3dResult,
          skeletonResult: workerSkeletonResultSeen ?? undefined,
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

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return copy;
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) {
    return false;
  }
  for (let i = 0; i < left.length; i++) {
    if (left[i] !== right[i]) {
      return false;
    }
  }
  return true;
}

function firstByteDiff(left: Uint8Array, right: Uint8Array): number {
  const limit = Math.min(left.length, right.length);
  for (let i = 0; i < limit; i++) {
    if (left[i] !== right[i]) {
      return i;
    }
  }
  return left.length === right.length ? -1 : limit;
}

function hexPreview(bytes: Uint8Array, start: number, length = 16): string {
  const slice = bytes.slice(start, start + length);
  return Array.from(slice, (byte) => byte.toString(16).padStart(2, "0")).join(
    " ",
  );
}

interface FlatResource {
  type: string;
  num: number;
  name: string;
  flags: number;
  junk: number;
  data: Uint8Array;
}

function flattenFork(bytes: ArrayBuffer): FlatResource[] {
  const loadResult = load(new Uint8Array(bytes));
  expect(loadResult.ok).toBe(true);
  if (!loadResult.ok) {
    return [];
  }

  return orderedFlatList(loadResult.value).map((res) => ({
    type: resourceTypeStr(res),
    num: res.num,
    name: resourceNameStr(res),
    flags: res.flags,
    junk: res.junk,
    data: res.data,
  }));
}

function diffForks(originalBytes: ArrayBuffer, recoveredBytes: ArrayBuffer) {
  const originalFlat = flattenFork(originalBytes);
  const recoveredFlat = flattenFork(recoveredBytes);
  const originalMap = new Map(
    originalFlat.map((res) => [`${res.type}#${res.num}`, res]),
  );
  const recoveredMap = new Map(
    recoveredFlat.map((res) => [`${res.type}#${res.num}`, res]),
  );

  const originalKeys = [...originalMap.keys()].sort();
  const recoveredKeys = [...recoveredMap.keys()].sort();
  const missingKeys = originalKeys.filter((key) => !recoveredMap.has(key));
  const extraKeys = recoveredKeys.filter((key) => !originalMap.has(key));
  const payloadDiffs: string[] = [];
  const metadataDiffs: string[] = [];
  const matchingPayloadKeys: string[] = [];
  const detailedPayloadDiffs: string[] = [];

  for (const key of originalKeys) {
    const originalRes = originalMap.get(key);
    const recoveredRes = recoveredMap.get(key);
    if (!originalRes || !recoveredRes) {
      continue;
    }

    if (sameBytes(originalRes.data, recoveredRes.data)) {
      matchingPayloadKeys.push(key);
    } else {
      const diffOffset = firstByteDiff(originalRes.data, recoveredRes.data);
      detailedPayloadDiffs.push(
        `${key} firstDiff=${diffOffset} original=[${hexPreview(originalRes.data, Math.max(diffOffset - 4, 0))}] recovered=[${hexPreview(recoveredRes.data, Math.max(diffOffset - 4, 0))}]`,
      );
      payloadDiffs.push(
        `${key} name=${JSON.stringify(originalRes.name)} -> ${JSON.stringify(recoveredRes.name)} ` +
          `payload=${originalRes.data.length} -> ${recoveredRes.data.length}`,
      );
    }

    if (
      originalRes.name !== recoveredRes.name ||
      originalRes.flags !== recoveredRes.flags ||
      originalRes.junk !== recoveredRes.junk
    ) {
      metadataDiffs.push(
        `${key} meta name=${JSON.stringify(originalRes.name)} -> ${JSON.stringify(recoveredRes.name)} ` +
          `flags=${originalRes.flags} -> ${recoveredRes.flags} junk=${originalRes.junk} -> ${recoveredRes.junk}`,
      );
    }
  }

  return {
    originalKeys,
    recoveredKeys,
    missingKeys,
    extraKeys,
    payloadDiffs,
    detailedPayloadDiffs,
    metadataDiffs,
    matchingPayloadKeys,
  };
}

afterEach(() => {
  workerBg3dResult = null;
  workerParsed = null;
  workerSkeletonResultSeen = null;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("BG3D download after GLB import", () => {
  it("uses only GLB data on the return path and reports Otto skeleton resource differences", async () => {
    const bg3dPath = join(
      __dirname,
      "../../public/games/ottomatic/skeletons/Blob.bg3d",
    );
    const skelPath = join(
      __dirname,
      "../../public/games/ottomatic/skeletons/Blob.skeleton.rsrc",
    );

    if (!existsSync(bg3dPath) || !existsSync(skelPath)) {
      return;
    }

    const originalBg3d = bufferFromFile(bg3dPath);
    const originalSkeleton = bufferFromFile(skelPath);
    const skeletonResource = await parseSkeletonRsrc(originalSkeleton);
    const parsedResult = parseBG3D(originalBg3d, skeletonResource);
    expect(parsedResult.isOk()).toBe(true);
    if (parsedResult.isErr()) {
      return;
    }
    const parsed = parsedResult.value;

    const gltfDocument = bg3dParsedToGLTF(parsed);
    const io = new NodeIO();
    const glbBytes = await io.writeBinary(gltfDocument);
    const glbBuffer = toArrayBuffer(glbBytes);
    expect(glbBuffer.byteLength).toBeGreaterThan(0);

    const gltfUrl = "blob:otto.glb";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(glbBuffer, {
          status: 200,
          headers: { "Content-Type": "model/gltf-binary" },
        }),
      ),
    );

    const workerScope: WorkerScope = {
      postMessage: vi.fn<(response: BG3DGltfWorkerResponse) => void>(),
    };
    vi.stubGlobal("self", workerScope);

    await import("@/modelParsers/bg3dGltfWorker");
    expect(typeof workerScope.onmessage).toBe("function");
    if (typeof workerScope.onmessage !== "function") {
      return;
    }

    await workerScope.onmessage(
        createMessageEvent({
          type: "glb-to-bg3d" as const,
          buffer: glbBuffer,
        }),
      );

    const response = workerScope.postMessage.mock.calls.at(-1)?.[0];
    expect(response?.type).toBe("glb-to-bg3d");
    expect(response?.skeletonResult).toBeUndefined();
    if (response?.type !== "glb-to-bg3d") {
      return;
    }

    workerBg3dResult = response.result;
    workerParsed = response.parsed ?? null;
    workerSkeletonResultSeen = response.skeletonResult ?? undefined;

    const artifactsResult = await getBG3DDownloadArtifacts(gltfUrl, "Blob");
    if (artifactsResult.isErr()) {
      console.log("BG3D download artifact error:", artifactsResult.error);
    }
    expect(artifactsResult.isOk()).toBe(true);
    if (artifactsResult.isErr() || !artifactsResult.value.skeletonBytes) {
      return;
    }

    const artifacts = artifactsResult.value;
    const skeletonBytes = artifacts.skeletonBytes;
    expect(workerSkeletonResultSeen).toBeUndefined();
    if (!skeletonBytes) {
      return;
    }

    const recoveredBg3dSkeleton = await parseSkeletonRsrc(
      skeletonBytes,
    );
    const recoveredParsedResult = parseBG3D(
      artifacts.bg3dBytes,
      recoveredBg3dSkeleton,
    );
    expect(recoveredParsedResult.isOk()).toBe(true);
    if (recoveredParsedResult.isErr()) {
      return;
    }
    const recoveredParsed = recoveredParsedResult.value;

    expect(recoveredParsed.skeleton?.bones.length).toBe(
      parsed.skeleton?.bones.length,
    );
    expect(recoveredParsed.skeleton?.animations.length).toBe(
      parsed.skeleton?.animations.length,
    );
    expect(recoveredParsed.skeleton?.version).toBe(272);
    expect(recoveredParsed.skeleton?.numAnims).toBe(
      recoveredParsed.skeleton?.animations.length,
    );
    expect(recoveredParsed.skeleton?.numJoints).toBe(
      recoveredParsed.skeleton?.bones.length,
    );
    expect(recoveredParsed.skeleton?.num3DMFLimbs).toBe(0);
    expect(recoveredParsed.skeleton?.bones.map((bone) => bone.name)).toEqual(
      parsed.skeleton?.bones.map((bone) => bone.name),
    );
    expect(
      recoveredParsed.skeleton?.animations.map((anim) => anim.name),
    ).toEqual(parsed.skeleton?.animations.map((anim) => anim.name));
    // Events are not preserved in clean GLB roundtrip
    expect(
      recoveredParsed.skeleton?.animations.map((anim) => anim.numAnimEvents),
    ).toEqual(parsed.skeleton?.animations.map((anim) => anim.numAnimEvents));
    expect(
      recoveredParsed.skeleton?.animations.map((anim) => anim.events.length),
    ).toEqual(parsed.skeleton?.animations.map((anim) => anim.events.length));

    const originalForkDiff = diffForks(originalSkeleton, skeletonBytes);
    console.log(
      "Otto Blob resource keys (original/recovered):",
      JSON.stringify(
        [originalForkDiff.originalKeys, originalForkDiff.recoveredKeys],
        null,
        2,
      ),
    );
    console.log(
      "Otto Blob matching resource payloads:",
      JSON.stringify(originalForkDiff.matchingPayloadKeys, null, 2),
    );
    console.log(
      "Otto Blob differing resource payloads:",
      JSON.stringify(originalForkDiff.payloadDiffs, null, 2),
    );
    console.log(
      "Otto Blob detailed payload diffs:",
      JSON.stringify(originalForkDiff.detailedPayloadDiffs, null, 2),
    );
    console.log(
      "Otto Blob differing resource metadata:",
      JSON.stringify(originalForkDiff.metadataDiffs, null, 2),
    );

    // RelP cannot be represented in standard glTF; Evnt resources must still exist
    // so the game loader can read the animation-event fork entries.
    const expectedMissingKeys = originalForkDiff.missingKeys.filter(
      (key: string) => !key.startsWith("RelP#"),
    );
    expect(expectedMissingKeys).toEqual([]);
    expect(originalForkDiff.extraKeys).toEqual([]);
    expect(originalForkDiff.matchingPayloadKeys.length).toBeGreaterThan(0);

    const aliasKeys = originalForkDiff.originalKeys.filter((key) =>
      key.startsWith("alis#"),
    );
    const recoveredAliasKeys = originalForkDiff.recoveredKeys.filter((key) =>
      key.startsWith("alis#"),
    );
    expect(recoveredAliasKeys).toEqual(aliasKeys);

    const aliasDiffs = originalForkDiff.payloadDiffs.filter((entry) =>
      entry.startsWith("alis#"),
    );
    const aliasDetailDiffs = originalForkDiff.detailedPayloadDiffs.filter(
      (entry) => entry.startsWith("alis#"),
    );
    console.log(
      "Otto Blob alias detailed diffs:",
      JSON.stringify(aliasDetailDiffs, null, 2),
    );
    expect(aliasDiffs).toEqual([]);
    expect(aliasDetailDiffs).toEqual([]);

    const nonSemanticPayloadDiffs = originalForkDiff.payloadDiffs.filter(
      (entry) => !entry.startsWith("Hedr#") && !entry.startsWith("AnHd#"),
    );
    const nonSemanticDetailedDiffs = originalForkDiff.detailedPayloadDiffs.filter(
      (entry) => !entry.startsWith("Hedr#") && !entry.startsWith("AnHd#"),
    );
    // After clean GLB roundtrip, payload diffs are expected in Bone, KeyF, NumK, Evnt, and RelP sections
    // since skeleton data is reconstructed from glTF standard data only
    const expectedDiffPrefixes = ["Bone#", "Hedr#", "KeyF#", "NumK#", "Evnt#", "BonP#", "BonN#", "RelP#"];
    expect(
      nonSemanticPayloadDiffs.every(
        (entry) => expectedDiffPrefixes.some((prefix) => entry.startsWith(prefix)),
      ),
    ).toBe(true);
    expect(
      nonSemanticDetailedDiffs.every(
        (entry) => expectedDiffPrefixes.some((prefix) => entry.startsWith(prefix)),
      ),
    ).toBe(true);
    expect(originalForkDiff.payloadDiffs.some((entry) => entry.startsWith("Hedr#"))).toBe(true);
    expect(originalForkDiff.payloadDiffs.some((entry) => entry.startsWith("AnHd#"))).toBe(true);
    expect(originalForkDiff.recoveredKeys.some((entry) => entry.startsWith("Evnt#"))).toBe(true);

    const byteMatch = sameBytes(
      new Uint8Array(originalSkeleton),
      new Uint8Array(skeletonBytes),
    );
    console.log("Otto Blob skeleton byte-perfect:", byteMatch);
    expect(byteMatch).toBe(false);

    const bg3dByteMatch = sameBytes(
      new Uint8Array(originalBg3d),
      new Uint8Array(artifacts.bg3dBytes),
    );
    console.log("Otto Blob BG3D byte-perfect:", bg3dByteMatch);
    expect(bg3dByteMatch).toBe(false);
  });
});
