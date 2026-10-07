import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseSkeletonRsrcResult } from "./skeletonRsrc/parseSkeletonRsrcTS";
import { skeletonResourceToBinary } from "./skeletonBinaryExport";

function fixture(): ArrayBuffer {
  const bytes = readFileSync(new URL("../../../../frontend/public/games/ottomatic/skeletons/Blob.skeleton.rsrc", import.meta.url));
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

describe("standalone skeleton codec", () => {
  it("returns typed failures for truncated resource forks without rejecting", async () => {
    for (const length of [0, 1, 16, 128]) {
      const result = await parseSkeletonRsrcResult(new ArrayBuffer(length));
      expect(result.isErr()).toBe(true);
    }
  });

  it("roundtrips a production skeleton without mutating names in the input", async () => {
    const parsed = await parseSkeletonRsrcResult(fixture());
    expect(parsed.isOk()).toBe(true);
    if (parsed.isErr()) return;
    const names = Object.values(parsed.value.Bone).map((bone) => bone.obj.name);
    const animations = Object.values(parsed.value.AnHd ?? {}).map((animation) => animation.obj.animName);
    const serialized = skeletonResourceToBinary(parsed.value);
    expect(serialized.isOk()).toBe(true);
    if (serialized.isErr()) return;
    expect(Object.values(parsed.value.Bone).map((bone) => bone.obj.name)).toEqual(names);
    expect(Object.values(parsed.value.AnHd ?? {}).map((animation) => animation.obj.animName)).toEqual(animations);
    const reparsed = await parseSkeletonRsrcResult(serialized.value);
    expect(reparsed.isOk()).toBe(true);
    if (reparsed.isErr()) return;
    expect(reparsed.value.Hedr).toEqual(parsed.value.Hedr);
    expect(reparsed.value.Bone).toEqual(parsed.value.Bone);
    expect(reparsed.value.AnHd).toEqual(parsed.value.AnHd);
    expect(reparsed.value.KeyF).toEqual(parsed.value.KeyF);
  });
});
