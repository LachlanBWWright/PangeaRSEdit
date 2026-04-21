import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { NodeIO } from "@gltf-transform/core";
import { parseBG3D, type BG3DSkeleton } from "@/modelParsers/parseBG3D";
import { parseSkeletonRsrc } from "@/modelParsers/skeletonRsrc/parseSkeletonRsrcTS";
import {
  bg3dParsedToGLTF,
  gltfToBG3D,
} from "@/modelParsers/parsedBg3dGitfConverter";
import { bg3dSkeletonToSkeletonResource } from "@/modelParsers/skeletonExport";
import { skeletonResourceToBinary } from "@/modelParsers/skeletonBinaryExport";
// migrated from custom unwrap helper to neverthrow instance methods

function bufferFromFile(filePath: string): ArrayBuffer {
  const buf = readFileSync(filePath);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

function countBonePointIndices(
  skeleton: BG3DSkeleton,
): number {
  return skeleton.bones.reduce(
    (total, bone) => total + (bone.pointIndices?.length ?? 0),
    0,
  );
}

describe("Skeleton re-import and skinning roundtrip", () => {
  it("re-imports Otto skeleton bytes exported from BG3D+skeleton data", async () => {
    const bg3dPath = join(
      __dirname,
      "../../public/games/ottomatic/skeletons/Otto.bg3d",
    );
    const skelPath = join(
      __dirname,
      "../../public/games/ottomatic/skeletons/Otto.skeleton.rsrc",
    );

    if (!existsSync(bg3dPath) || !existsSync(skelPath)) {
      return;
    }

    const originalSkeleton = await parseSkeletonRsrc(bufferFromFile(skelPath));
    const parsedRes = parseBG3D(bufferFromFile(bg3dPath), originalSkeleton);
    expect(parsedRes.isOk()).toBe(true);
    if (!parsedRes.isOk()) return;
    const parsed = parsedRes.value;
    expect(parsed.skeleton).toBeDefined();
    if (!parsed.skeleton) {
      return;
    }

    const exportedSkeleton = bg3dSkeletonToSkeletonResource(
      parsed.skeleton,
      undefined,
      undefined,
      undefined,
      parsed.skeleton.metadata,
      "Otto",
    );
    const binaryResult = skeletonResourceToBinary(exportedSkeleton);
    expect(binaryResult.isOk()).toBe(true);
    if (binaryResult.isErr()) {
      return;
    }

    const reparsedSkeleton = await parseSkeletonRsrc(binaryResult.value);
    expect(Object.keys(reparsedSkeleton.Bone)).toHaveLength(
      Object.keys(originalSkeleton.Bone).length,
    );
    expect(Object.keys(reparsedSkeleton.Hedr)).toHaveLength(1);
  });

  it("preserves Bugdom 2 bone point coverage through GLB roundtrip", async () => {
    const bg3dPath = join(
      __dirname,
      "../../public/games/bugdom2/skeletons/Ant.bg3d",
    );
    const skelPath = join(
      __dirname,
      "../../public/games/bugdom2/skeletons/Ant.skeleton.rsrc",
    );

    if (!existsSync(bg3dPath) || !existsSync(skelPath)) {
      return;
    }

    const originalSkeleton = await parseSkeletonRsrc(bufferFromFile(skelPath));
    const parsedRes = parseBG3D(bufferFromFile(bg3dPath), originalSkeleton);
    expect(parsedRes.isOk()).toBe(true);
    if (!parsedRes.isOk()) return;
    const parsed = parsedRes.value;
    expect(parsed.skeleton).toBeDefined();
    if (!parsed.skeleton) {
      return;
    }

    const baselinePointCount = countBonePointIndices(parsed.skeleton);

    const io = new NodeIO();
    const glbBytes = await io.writeBinary(bg3dParsedToGLTF(parsed));
    const roundtripped = await gltfToBG3D(await io.readBinary(glbBytes));

    expect(roundtripped.skeleton).toBeDefined();
    if (!roundtripped.skeleton) {
      return;
    }

    expect(countBonePointIndices(roundtripped.skeleton)).toBeGreaterThanOrEqual(
      baselinePointCount,
    );
  });
});
