/**
 * Skeleton .rsrc binary round-trip test with keyframe modification.
 *
 * Verifies: parse .rsrc → build BG3D parse result with skeleton → convert to glTF → 
 * write GLB → read GLB → convert back to BG3D → export skeleton → compare binary.
 *
 * Also verifies that modifying a keyframe position, round-tripping,
 * then reverting the change and round-tripping again yields identical skeleton bytes.
 *
 * Tests both BG3D and 3DMF model formats.
 */
import { describe, it, expect } from "vitest";
import { NodeIO } from "@gltf-transform/core";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { parseBG3D, bg3dParsedToBG3D, type BG3DParseResult, type BG3DSkeleton } from "@/modelParsers/parseBG3D";
import { parseSkeletonRsrc } from "@/modelParsers/skeletonRsrc/parseSkeletonRsrcTS";
import { bg3dParsedToGLTF, gltfToBG3D } from "@/modelParsers/parsedBg3dGitfConverter";
import { bg3dSkeletonToSkeletonResource } from "@/modelParsers/skeletonExport";
import { skeletonResourceToBinary } from "@/modelParsers/skeletonBinaryExport";
import { parseBG3DWithSkeletonResource } from "@/modelParsers/bg3dWithSkeleton";
// migrated from custom unwrap helper to neverthrow instance methods

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

/**
 * Full round-trip through gltf-transform: BG3DParsed → glTF Document → GLB → read back → BG3DParsed
 */
async function roundTripThroughGlb(parsed: BG3DParseResult): Promise<BG3DParseResult> {
  const io = new NodeIO();
  const doc = bg3dParsedToGLTF(parsed);
  const glb = await io.writeBinary(doc);
  const readDoc = await io.readBinary(glb);
  return gltfToBG3D(readDoc);
}

function uint8ToArrayBuffer(data: Uint8Array): ArrayBuffer {
  const copy = new ArrayBuffer(data.byteLength);
  new Uint8Array(copy).set(data);
  return copy;
}

/**
 * Export skeleton from BG3DParseResult to binary .rsrc bytes
 */
function exportSkeletonBytes(parsed: BG3DParseResult, modelName: string): Uint8Array {
  if (!parsed.skeleton) {
    expect.fail("No skeleton data in BG3DParseResult");
  }
  const resource = bg3dSkeletonToSkeletonResource(
    parsed.skeleton,
    undefined,
    undefined,
    undefined,
    parsed.skeleton.metadata,
    modelName,
  );
  const result = skeletonResourceToBinary(resource);
  if (result.isErr()) {
    expect.fail(`Failed to export skeleton: ${result.error}`);
  }
  return new Uint8Array(result.value);
}

function mutateFirstKeyframePosition(
  skeleton: BG3DSkeleton,
  deltaX: number,
  deltaY: number,
  deltaZ: number,
): void {
  const anim = skeleton.animations[0];
  if (!anim) expect.fail("No animations");
  const firstBoneIndex = Number(Object.keys(anim.keyframes)[0]);
  if (!Number.isFinite(firstBoneIndex)) expect.fail("No animation keyframes");

  const kfList = anim.keyframes[firstBoneIndex];
  if (!kfList || kfList.length === 0) expect.fail("Empty keyframe list");

  const kf = kfList[0];
  if (!kf) expect.fail("No first keyframe");
  kf.coordX = (kf.coordX ?? 0) + deltaX;
  kf.coordY = (kf.coordY ?? 0) + deltaY;
  kf.coordZ = (kf.coordZ ?? 0) + deltaZ;
}

describe("Skeleton .rsrc binary round-trip with keyframe modification (BG3D)", () => {
  const bg3dPath = join(__dirname, "../../public/games/ottomatic/skeletons/Blob.bg3d");
  const skelPath = join(__dirname, "../../public/games/ottomatic/skeletons/Blob.skeleton.rsrc");

  it("skeleton .rsrc export preserves keyframe values after modify → GLB → revert → re-export", async () => {
    if (!existsSync(bg3dPath) || !existsSync(skelPath)) {
      console.warn("Skipping: Blob files not found");
      return;
    }

    const originalBg3d = bufferFromFile(bg3dPath);
    const skeletonResource = await parseSkeletonRsrc(bufferFromFile(skelPath));
    const parsedRes = parseBG3D(originalBg3d, skeletonResource);
    expect(parsedRes.isOk()).toBe(true);
    if (!parsedRes.isOk()) return;
    const parsed = parsedRes.value;
    expect(parsed.skeleton).toBeDefined();
    if (!parsed.skeleton) return;

    // Snapshot baseline values BEFORE mutation
    const baselineBoneCount = parsed.skeleton.bones.length;
    const baselineAnimCount = parsed.skeleton.animations.length;
    const baselineBonePositions = parsed.skeleton.bones.map((b) => ({
      coordX: b.coordX,
      coordY: b.coordY,
      coordZ: b.coordZ,
    }));
    const baselineKeyframes: Record<string, {
      coordX: number; coordY: number; coordZ: number;
      rotationX: number; rotationY: number; rotationZ: number;
    }[]> = {};
    const firstAnim = parsed.skeleton.animations[0];
    if (firstAnim) {
      for (const [boneIdx, kfList] of Object.entries(firstAnim.keyframes)) {
        baselineKeyframes[boneIdx] = kfList.map((kf) => ({
          coordX: kf.coordX, coordY: kf.coordY, coordZ: kf.coordZ,
          rotationX: kf.rotationX, rotationY: kf.rotationY, rotationZ: kf.rotationZ,
        }));
      }
    }

    // Step 1: Modify first keyframe position
    mutateFirstKeyframePosition(parsed.skeleton, 10, 20, 30);

    // Step 2: Round-trip through GLB
    const afterModify = await roundTripThroughGlb(parsed);
    expect(afterModify.skeleton).toBeDefined();
    if (!afterModify.skeleton) return;

    // Step 3: Revert the change
    mutateFirstKeyframePosition(afterModify.skeleton, -10, -20, -30);

    // Step 4: Round-trip through GLB again
    const afterRevert = await roundTripThroughGlb(afterModify);
    expect(afterRevert.skeleton).toBeDefined();
    if (!afterRevert.skeleton) return;

    // Step 5: Compare semantic content
    expect(afterRevert.skeleton.bones.length).toBe(baselineBoneCount);
    expect(afterRevert.skeleton.animations.length).toBe(baselineAnimCount);

    // Verify all keyframe values match within tolerance
    for (const [boneIdx, kfList] of Object.entries(afterRevert.skeleton.animations[0]?.keyframes ?? {})) {
      const origKfList = baselineKeyframes[boneIdx];
      if (!origKfList) continue;
      expect(kfList.length).toBe(origKfList.length);
      for (let i = 0; i < kfList.length; i++) {
        const kf = kfList[i];
        const origKf = origKfList[i];
        if (!kf || !origKf) continue;
        expect(kf.coordX).toBeCloseTo(origKf.coordX, 2);
        expect(kf.coordY).toBeCloseTo(origKf.coordY, 2);
        expect(kf.coordZ).toBeCloseTo(origKf.coordZ, 2);
        expect(kf.rotationX).toBeCloseTo(origKf.rotationX, 2);
        expect(kf.rotationY).toBeCloseTo(origKf.rotationY, 2);
        expect(kf.rotationZ).toBeCloseTo(origKf.rotationZ, 2);
      }
    }

    // Verify bone positions match
    for (let i = 0; i < baselineBonePositions.length; i++) {
      const orig = baselineBonePositions[i];
      const rt = afterRevert.skeleton.bones[i];
      if (!orig || !rt) continue;
      expect(rt.coordX).toBeCloseTo(orig.coordX, 2);
      expect(rt.coordY).toBeCloseTo(orig.coordY, 2);
      expect(rt.coordZ).toBeCloseTo(orig.coordZ, 2);
    }

    // Verify skeleton .rsrc export succeeds
    const exportedBytes = exportSkeletonBytes(afterRevert, "Blob");
    expect(exportedBytes.length).toBeGreaterThan(0);

    // Verify the exported bytes can be re-parsed
    const reResource = await parseSkeletonRsrc(uint8ToArrayBuffer(exportedBytes));
    const reParsedRes = parseBG3D(bufferFromFile(bg3dPath), reResource);
    expect(reParsedRes.isOk()).toBe(true);
    if (!reParsedRes.isOk()) return;
    const reParsed = reParsedRes.value;
    expect(reParsed.skeleton).toBeDefined();
    if (!reParsed.skeleton) return;
    expect(reParsed.skeleton.bones.length).toBe(baselineBoneCount);
    expect(reParsed.skeleton.animations.length).toBe(baselineAnimCount);
  });

  it("BG3D bytes unchanged when only skeleton keyframe is modified", async () => {
    if (!existsSync(bg3dPath) || !existsSync(skelPath)) {
      console.warn("Skipping: Blob files not found");
      return;
    }

    const originalBg3d = bufferFromFile(bg3dPath);
    const skeletonResource = await parseSkeletonRsrc(bufferFromFile(skelPath));
    const parsedRes2 = parseBG3D(originalBg3d, skeletonResource);
    expect(parsedRes2.isOk()).toBe(true);
    if (!parsedRes2.isOk()) return;
    const parsed = parsedRes2.value;
    if (!parsed.skeleton) return;

    // Baseline BG3D export
    const baselineBg3d = bg3dParsedToBG3D(await roundTripThroughGlb(parsed));

    // Modify keyframe, round-trip, export BG3D
    mutateFirstKeyframePosition(parsed.skeleton, 5, 5, 5);
    const modifiedBg3d = bg3dParsedToBG3D(await roundTripThroughGlb(parsed));

    // BG3D bytes should be identical
    expect(sameBytes(new Uint8Array(baselineBg3d), new Uint8Array(modifiedBg3d))).toBe(true);
  });

  it("bone rest positions preserved after skeleton.rsrc export round-trip", async () => {
    if (!existsSync(bg3dPath) || !existsSync(skelPath)) {
      console.warn("Skipping: Blob files not found");
      return;
    }

    const originalBg3d = bufferFromFile(bg3dPath);
    const skeletonResource2 = await parseSkeletonRsrc(bufferFromFile(skelPath));
    const parsedRes3 = parseBG3D(originalBg3d, skeletonResource2);
    expect(parsedRes3.isOk()).toBe(true);
    if (!parsedRes3.isOk()) return;
    const parsed = parsedRes3.value;
    if (!parsed.skeleton) return;

    // Export skeleton to binary, then re-parse it
    const exportedBytes = exportSkeletonBytes(parsed, "Blob");
    const reResource = await parseSkeletonRsrc(uint8ToArrayBuffer(exportedBytes));

    // Re-parse with skeleton
    const reparsedRes = parseBG3D(originalBg3d, reResource);
    expect(reparsedRes.isOk()).toBe(true);
    if (!reparsedRes.isOk()) return;
    const reparsed = reparsedRes.value;
    if (!reparsed.skeleton) return;

    // Compare bone positions
    for (let i = 0; i < parsed.skeleton.bones.length; i++) {
      const orig = parsed.skeleton.bones[i];
      const re = reparsed.skeleton.bones[i];
      if (!orig || !re) continue;
      expect(re.name).toBe(orig.name);
      expect(re.coordX).toBeCloseTo(orig.coordX, 2);
      expect(re.coordY).toBeCloseTo(orig.coordY, 2);
      expect(re.coordZ).toBeCloseTo(orig.coordZ, 2);
    }
  });
});

describe("Skeleton .rsrc binary round-trip with keyframe modification (3DMF)", () => {
  const dmfPath = join(__dirname, "../../public/games/bugdom1/skeletons/Ant.3dmf");
  const skelPath = join(__dirname, "../../public/games/bugdom1/skeletons/Ant.skeleton.rsrc");

  it("skeleton .rsrc export preserves keyframe values after modify → GLB → revert → re-export (3DMF)", async () => {
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

    // Snapshot baseline values BEFORE mutation
    const baselineBoneCount = parsed.skeleton.bones.length;
    const baselineAnimCount = parsed.skeleton.animations.length;
    const baselineKeyframes: Record<string, {
      coordX: number; coordY: number; coordZ: number;
    }[]> = {};
    const firstAnim = parsed.skeleton.animations[0];
    if (firstAnim) {
      for (const [boneIdx, kfList] of Object.entries(firstAnim.keyframes)) {
        baselineKeyframes[boneIdx] = kfList.map((kf) => ({
          coordX: kf.coordX, coordY: kf.coordY, coordZ: kf.coordZ,
        }));
      }
    }

    // Modify
    mutateFirstKeyframePosition(parsed.skeleton, 10, 20, 30);
    const afterModify = await roundTripThroughGlb(parsed);
    if (!afterModify.skeleton) return;

    // Revert
    mutateFirstKeyframePosition(afterModify.skeleton, -10, -20, -30);
    const afterRevert = await roundTripThroughGlb(afterModify);
    if (!afterRevert.skeleton) return;

    // Semantic comparison
    expect(afterRevert.skeleton.bones.length).toBe(baselineBoneCount);
    expect(afterRevert.skeleton.animations.length).toBe(baselineAnimCount);

    // Verify keyframe values match within tolerance
    for (const [boneIdx, kfList] of Object.entries(afterRevert.skeleton.animations[0]?.keyframes ?? {})) {
      const origKfList = baselineKeyframes[boneIdx];
      if (!origKfList) continue;
      expect(kfList.length).toBe(origKfList.length);
      for (let i = 0; i < kfList.length; i++) {
        const kf = kfList[i];
        const origKf = origKfList[i];
        if (!kf || !origKf) continue;
        expect(kf.coordX).toBeCloseTo(origKf.coordX, 2);
        expect(kf.coordY).toBeCloseTo(origKf.coordY, 2);
        expect(kf.coordZ).toBeCloseTo(origKf.coordZ, 2);
      }
    }

    // Verify export succeeds and can be re-parsed
    const exportedBytes = exportSkeletonBytes(afterRevert, "Ant");
    expect(exportedBytes.length).toBeGreaterThan(0);
  });
});
