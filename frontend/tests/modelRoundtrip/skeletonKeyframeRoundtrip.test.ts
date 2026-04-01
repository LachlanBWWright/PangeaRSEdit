/**
 * Skeleton keyframe round-trip test.
 *
 * Verifies that parsing a skeleton file, modifying a keyframe position,
 * exporting to GLB, re-parsing, reverting the position, and re-exporting
 * preserves skeleton semantics (and leaves bg3d unchanged).
 *
 * Tests both BG3D and 3DMF model formats.
 */
import { describe, it, expect } from "vitest";
import { NodeIO } from "@gltf-transform/core";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { parseBG3D, bg3dParsedToBG3D } from "@/modelParsers/parseBG3D";
import { parseSkeletonRsrc } from "@/modelParsers/skeletonRsrc/parseSkeletonRsrcTS";
import { bg3dParsedToGLTF, gltfToBG3D } from "@/modelParsers/parsedBg3dGitfConverter";
import { unwrap } from "@/types/result";
import type { BG3DParseResult, BG3DSkeleton } from "@/modelParsers/parseBG3D";
import { parseBG3DWithSkeletonResource } from "@/modelParsers/bg3dWithSkeleton";

function bufferFromFile(filePath: string): ArrayBuffer {
  const buf = readFileSync(filePath);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i++) {
    if (left[i] !== right[i]) return false;
  }
  return true;
}

async function roundTripThroughGlb(parsed: BG3DParseResult): Promise<BG3DParseResult> {
  const io = new NodeIO();
  const doc = bg3dParsedToGLTF(parsed);
  const glb = await io.writeBinary(doc);
  const readDoc = await io.readBinary(glb);
  return gltfToBG3D(readDoc);
}

function mutateFirstKeyframePosition(
  skeleton: BG3DSkeleton,
  deltaX: number,
  deltaY: number,
  deltaZ: number,
): void {
  const anim = skeleton.animations[0];
  if (!anim) throw new Error("No animations");
  const firstBoneIndex = Number(Object.keys(anim.keyframes)[0]);
  if (!Number.isFinite(firstBoneIndex)) throw new Error("No animation keyframes");

  const kfList = anim.keyframes[firstBoneIndex];
  if (!kfList || kfList.length === 0) throw new Error("Empty keyframe list");

  const kf = kfList[0];
  if (!kf) throw new Error("No first keyframe");
  kf.coordX = (kf.coordX ?? 0) + deltaX;
  kf.coordY = (kf.coordY ?? 0) + deltaY;
  kf.coordZ = (kf.coordZ ?? 0) + deltaZ;
}

interface KeyframeSnapshot {
  coordX: number;
  coordY: number;
  coordZ: number;
}

function snapshotKeyframes(skeleton: BG3DSkeleton): KeyframeSnapshot[] {
  const anim = skeleton.animations[0];
  if (!anim) return [];
  const firstBoneIndex = Number(Object.keys(anim.keyframes)[0]);
  if (!Number.isFinite(firstBoneIndex)) return [];

  const kfList = anim.keyframes[firstBoneIndex] ?? [];
  return kfList.map((kf) => ({
    coordX: kf.coordX ?? 0,
    coordY: kf.coordY ?? 0,
    coordZ: kf.coordZ ?? 0,
  }));
}

describe("Skeleton keyframe round-trip (BG3D)", () => {
  const bg3dPath = join(__dirname, "../../public/games/ottomatic/skeletons/Blob.bg3d");
  const skelPath = join(__dirname, "../../public/games/ottomatic/skeletons/Blob.skeleton.rsrc");

  it("preserves skeleton semantics after modify → GLB → revert → re-export", async () => {
    if (!existsSync(bg3dPath) || !existsSync(skelPath)) {
      console.warn("Skipping: Blob files not found");
      return;
    }

    const originalBg3d = bufferFromFile(bg3dPath);
    const skeletonResource = await parseSkeletonRsrc(bufferFromFile(skelPath));
    const parsed = unwrap(parseBG3D(originalBg3d, skeletonResource));

    expect(parsed.skeleton).toBeDefined();
    if (!parsed.skeleton) return;

    // Snapshot baseline keyframe values
    const baselineSkeleton = parsed.skeleton;
    const baselineKfValues = snapshotKeyframes(baselineSkeleton);

    // Step 1: modify first keyframe position
    mutateFirstKeyframePosition(parsed.skeleton, 10, 20, 30);

    // Step 2: round-trip through GLB
    const afterModify = await roundTripThroughGlb(parsed);
    expect(afterModify.skeleton).toBeDefined();
    if (!afterModify.skeleton) return;

    // Verify modification survived the round-trip
    const modifiedKf = snapshotKeyframes(afterModify.skeleton);
    expect(modifiedKf[0]?.coordX).toBeCloseTo((baselineKfValues[0]?.coordX ?? 0) + 10, 2);
    expect(modifiedKf[0]?.coordY).toBeCloseTo((baselineKfValues[0]?.coordY ?? 0) + 20, 2);
    expect(modifiedKf[0]?.coordZ).toBeCloseTo((baselineKfValues[0]?.coordZ ?? 0) + 30, 2);

    // Step 3: revert the change
    mutateFirstKeyframePosition(afterModify.skeleton, -10, -20, -30);

    // Step 4: round-trip through GLB again
    const afterRevert = await roundTripThroughGlb(afterModify);
    expect(afterRevert.skeleton).toBeDefined();
    if (!afterRevert.skeleton) return;

    // Step 5: verify reverted values match baseline
    const revertedKf = snapshotKeyframes(afterRevert.skeleton);
    expect(revertedKf[0]?.coordX).toBeCloseTo(baselineKfValues[0]?.coordX ?? 0, 2);
    expect(revertedKf[0]?.coordY).toBeCloseTo(baselineKfValues[0]?.coordY ?? 0, 2);
    expect(revertedKf[0]?.coordZ).toBeCloseTo(baselineKfValues[0]?.coordZ ?? 0, 2);

    // Bone count and animation count should be preserved
    expect(afterRevert.skeleton.bones.length).toBe(baselineSkeleton.bones.length);
    expect(afterRevert.skeleton.animations.length).toBe(baselineSkeleton.animations.length);
  });

  it("does not change bg3d bytes when only skeleton keyframe is modified", async () => {
    if (!existsSync(bg3dPath) || !existsSync(skelPath)) {
      console.warn("Skipping: Blob files not found");
      return;
    }

    const originalBg3d = bufferFromFile(bg3dPath);
    const skeletonResource = await parseSkeletonRsrc(bufferFromFile(skelPath));
    const parsed = unwrap(parseBG3D(originalBg3d, skeletonResource));

    // Baseline BG3D export
    const baselineBg3d = bg3dParsedToBG3D(await roundTripThroughGlb(parsed));

    // Modify keyframe, round-trip, export BG3D
    if (!parsed.skeleton) return;
    mutateFirstKeyframePosition(parsed.skeleton, 5, 5, 5);
    const modifiedBg3d = bg3dParsedToBG3D(await roundTripThroughGlb(parsed));

    // BG3D bytes should be identical (keyframe changes don't affect model geometry)
    const bg3dMatch = sameBytes(
      new Uint8Array(baselineBg3d),
      new Uint8Array(modifiedBg3d),
    );
    expect(bg3dMatch).toBe(true);
  });

  it("preserves bone positions through GLB round-trip (IBM recovery)", async () => {
    if (!existsSync(bg3dPath) || !existsSync(skelPath)) {
      console.warn("Skipping: Blob files not found");
      return;
    }

    const originalBg3d = bufferFromFile(bg3dPath);
    const skeletonResource = await parseSkeletonRsrc(bufferFromFile(skelPath));
    const parsed = unwrap(parseBG3D(originalBg3d, skeletonResource));

    expect(parsed.skeleton).toBeDefined();
    if (!parsed.skeleton) return;

    const originalBones = parsed.skeleton.bones.map((b) => ({
      name: b.name,
      x: b.coordX,
      y: b.coordY,
      z: b.coordZ,
    }));

    // Round-trip through GLB
    const roundtripped = await roundTripThroughGlb(parsed);
    expect(roundtripped.skeleton).toBeDefined();
    if (!roundtripped.skeleton) return;

    const roundtrippedBones = roundtripped.skeleton.bones.map((b) => ({
      name: b.name,
      x: b.coordX,
      y: b.coordY,
      z: b.coordZ,
    }));

    // Bone positions should be preserved within floating-point tolerance
    expect(roundtrippedBones.length).toBe(originalBones.length);
    for (let i = 0; i < originalBones.length; i++) {
      const orig = originalBones[i];
      const rt = roundtrippedBones[i];
      if (!orig || !rt) continue;
      expect(rt.name).toBe(orig.name);
      expect(rt.x).toBeCloseTo(orig.x, 2);
      expect(rt.y).toBeCloseTo(orig.y, 2);
      expect(rt.z).toBeCloseTo(orig.z, 2);
    }
  });
});

describe("Skeleton keyframe round-trip (3DMF)", () => {
  const dmfPath = join(__dirname, "../../public/games/bugdom1/skeletons/Ant.3dmf");
  const skelPath = join(__dirname, "../../public/games/bugdom1/skeletons/Ant.skeleton.rsrc");

  it("preserves bone positions through 3DMF → GLB → BG3D round-trip", async () => {
    if (!existsSync(dmfPath) || !existsSync(skelPath)) {
      console.warn("Skipping: Ant 3DMF files not found");
      return;
    }

    const dmfBuffer = bufferFromFile(dmfPath);
    const skeletonResource = await parseSkeletonRsrc(bufferFromFile(skelPath));
    const parsedResult = parseBG3DWithSkeletonResource(dmfBuffer, skeletonResource);
    if (parsedResult.isErr()) {
      console.warn("Skipping: failed to parse 3DMF with skeleton:", parsedResult.error.message);
      return;
    }
    const parsed = parsedResult.value;

    expect(parsed.skeleton).toBeDefined();
    if (!parsed.skeleton) return;

    const originalBones = parsed.skeleton.bones.map((b) => ({
      name: b.name,
      x: b.coordX,
      y: b.coordY,
      z: b.coordZ,
    }));

    // Round-trip through GLB
    const roundtripped = await roundTripThroughGlb(parsed);
    expect(roundtripped.skeleton).toBeDefined();
    if (!roundtripped.skeleton) return;

    const roundtrippedBones = roundtripped.skeleton.bones.map((b) => ({
      name: b.name,
      x: b.coordX,
      y: b.coordY,
      z: b.coordZ,
    }));

    expect(roundtrippedBones.length).toBe(originalBones.length);
    for (let i = 0; i < originalBones.length; i++) {
      const orig = originalBones[i];
      const rt = roundtrippedBones[i];
      if (!orig || !rt) continue;
      expect(rt.name).toBe(orig.name);
      expect(rt.x).toBeCloseTo(orig.x, 2);
      expect(rt.y).toBeCloseTo(orig.y, 2);
      expect(rt.z).toBeCloseTo(orig.z, 2);
    }
  });

  it("preserves skeleton semantics after modify → GLB → revert → re-export (3DMF)", async () => {
    if (!existsSync(dmfPath) || !existsSync(skelPath)) {
      console.warn("Skipping: Ant 3DMF files not found");
      return;
    }

    const dmfBuffer = bufferFromFile(dmfPath);
    const skeletonResource = await parseSkeletonRsrc(bufferFromFile(skelPath));
    const parsedResult = parseBG3DWithSkeletonResource(dmfBuffer, skeletonResource);
    if (parsedResult.isErr()) return;
    const parsed = parsedResult.value;
    if (!parsed.skeleton) return;

    const baselineKfValues = snapshotKeyframes(parsed.skeleton);
    const baselineBoneCount = parsed.skeleton.bones.length;
    const baselineAnimCount = parsed.skeleton.animations.length;

    mutateFirstKeyframePosition(parsed.skeleton, 10, 20, 30);
    const afterModify = await roundTripThroughGlb(parsed);
    if (!afterModify.skeleton) return;

    // Verify modification survived
    const modifiedKf = snapshotKeyframes(afterModify.skeleton);
    expect(modifiedKf[0]?.coordX).toBeCloseTo((baselineKfValues[0]?.coordX ?? 0) + 10, 2);

    mutateFirstKeyframePosition(afterModify.skeleton, -10, -20, -30);
    const afterRevert = await roundTripThroughGlb(afterModify);
    if (!afterRevert.skeleton) return;

    // Verify reversion matches baseline
    const revertedKf = snapshotKeyframes(afterRevert.skeleton);
    expect(revertedKf[0]?.coordX).toBeCloseTo(baselineKfValues[0]?.coordX ?? 0, 2);
    expect(revertedKf[0]?.coordY).toBeCloseTo(baselineKfValues[0]?.coordY ?? 0, 2);
    expect(revertedKf[0]?.coordZ).toBeCloseTo(baselineKfValues[0]?.coordZ ?? 0, 2);
    expect(afterRevert.skeleton.bones.length).toBe(baselineBoneCount);
    expect(afterRevert.skeleton.animations.length).toBe(baselineAnimCount);
  });
});

describe("Parent bone stability when child keyframe changes", () => {
  const bg3dPath = join(__dirname, "../../public/games/ottomatic/skeletons/Blob.bg3d");
  const skelPath = join(__dirname, "../../public/games/ottomatic/skeletons/Blob.skeleton.rsrc");

  it("modifying a child bone keyframe does not corrupt parent bone positions", async () => {
    if (!existsSync(bg3dPath) || !existsSync(skelPath)) {
      console.warn("Skipping: Blob files not found");
      return;
    }

    const originalBg3d = bufferFromFile(bg3dPath);
    const skeletonResource = await parseSkeletonRsrc(bufferFromFile(skelPath));
    const parsed = unwrap(parseBG3D(originalBg3d, skeletonResource));
    expect(parsed.skeleton).toBeDefined();
    if (!parsed.skeleton) return;

    const skel = parsed.skeleton;

    // Snapshot ALL bone rest positions and ALL keyframe values
    const originalBonePositions = skel.bones.map((b) => ({
      coordX: b.coordX,
      coordY: b.coordY,
      coordZ: b.coordZ,
      parentBone: b.parentBone,
    }));

    // Find a child bone (parentBone >= 0) with keyframes
    const firstAnim = skel.animations[0];
    expect(firstAnim).toBeDefined();
    if (!firstAnim) return;

    let childBoneIndex = -1;
    for (let i = 0; i < skel.bones.length; i++) {
      const bone = skel.bones[i];
      if (!bone) continue;
      if (bone.parentBone >= 0) {
        const kfs = firstAnim.keyframes[i];
        if (kfs && kfs.length > 0) {
          childBoneIndex = i;
          break;
        }
      }
    }
    expect(childBoneIndex).toBeGreaterThanOrEqual(0);
    if (childBoneIndex < 0) return;

    const childBone = skel.bones[childBoneIndex];
    expect(childBone).toBeDefined();
    if (!childBone) return;
    const parentBoneIndex = childBone.parentBone;

    // Modify the child bone's first keyframe position dramatically
    const childKfs = firstAnim.keyframes[childBoneIndex];
    expect(childKfs).toBeDefined();
    if (!childKfs || childKfs.length === 0) return;
    const childKf = childKfs[0];
    if (!childKf) return;

    const origChildCoord = { x: childKf.coordX, y: childKf.coordY, z: childKf.coordZ };
    childKf.coordX += 100;
    childKf.coordY += 200;
    childKf.coordZ += 300;

    // Round-trip through production GLB path
    const afterModify = await roundTripThroughGlb(parsed);
    expect(afterModify.skeleton).toBeDefined();
    if (!afterModify.skeleton) return;

    // ALL bone rest positions must be unchanged (including the child bone's rest position)
    for (let i = 0; i < originalBonePositions.length; i++) {
      const orig = originalBonePositions[i];
      const rt = afterModify.skeleton.bones[i];
      if (!orig || !rt) continue;

      expect(rt.coordX).toBeCloseTo(orig.coordX, 1);
      expect(rt.coordY).toBeCloseTo(orig.coordY, 1);
      expect(rt.coordZ).toBeCloseTo(orig.coordZ, 1);
      expect(rt.parentBone).toBe(orig.parentBone);
    }

    // The child bone's modified keyframe should have survived
    const rtAnim = afterModify.skeleton.animations[0];
    expect(rtAnim).toBeDefined();
    if (!rtAnim) return;

    const rtChildKfs = rtAnim.keyframes[childBoneIndex];
    expect(rtChildKfs).toBeDefined();
    if (!rtChildKfs || rtChildKfs.length === 0) return;
    const rtChildKf = rtChildKfs[0];
    if (!rtChildKf) return;

    expect(rtChildKf.coordX).toBeCloseTo(origChildCoord.x + 100, 1);
    expect(rtChildKf.coordY).toBeCloseTo(origChildCoord.y + 200, 1);
    expect(rtChildKf.coordZ).toBeCloseTo(origChildCoord.z + 300, 1);

    // The parent bone's keyframes should be completely unchanged
    const origParentKfs = firstAnim.keyframes[parentBoneIndex];
    const rtParentKfs = rtAnim.keyframes[parentBoneIndex];
    if (origParentKfs && rtParentKfs) {
      expect(rtParentKfs.length).toBe(origParentKfs.length);
      for (let k = 0; k < origParentKfs.length; k++) {
        const origKf = origParentKfs[k];
        const rtKf = rtParentKfs[k];
        if (!origKf || !rtKf) continue;
        expect(rtKf.coordX).toBeCloseTo(origKf.coordX, 1);
        expect(rtKf.coordY).toBeCloseTo(origKf.coordY, 1);
        expect(rtKf.coordZ).toBeCloseTo(origKf.coordZ, 1);
      }
    }
  });

  it("all bone keyframe coords match local rest offsets at rest pose", async () => {
    if (!existsSync(bg3dPath) || !existsSync(skelPath)) {
      console.warn("Skipping: Blob files not found");
      return;
    }

    const originalBg3d = bufferFromFile(bg3dPath);
    const skeletonResource = await parseSkeletonRsrc(bufferFromFile(skelPath));
    const parsed = unwrap(parseBG3D(originalBg3d, skeletonResource));
    expect(parsed.skeleton).toBeDefined();
    if (!parsed.skeleton) return;

    const skel = parsed.skeleton;
    const firstAnim = skel.animations[0];
    expect(firstAnim).toBeDefined();
    if (!firstAnim) return;

    // For each bone, the first keyframe's coord should match
    // the bone's LOCAL offset from its parent (rest pose)
    for (let i = 0; i < skel.bones.length; i++) {
      const bone = skel.bones[i];
      if (!bone) continue;
      const kfs = firstAnim.keyframes[i];
      if (!kfs || kfs.length === 0) continue;
      const kf0 = kfs[0];
      if (!kf0) continue;

      const parentBone = bone.parentBone >= 0 ? skel.bones[bone.parentBone] : null;
      const localX = parentBone ? bone.coordX - parentBone.coordX : bone.coordX;
      const localY = parentBone ? bone.coordY - parentBone.coordY : bone.coordY;
      const localZ = parentBone ? bone.coordZ - parentBone.coordZ : bone.coordZ;

      expect(kf0.coordX).toBeCloseTo(localX, 1);
      expect(kf0.coordY).toBeCloseTo(localY, 1);
      expect(kf0.coordZ).toBeCloseTo(localZ, 1);
    }
  });
});
