import { describe, expect, it } from "vitest";
import { parseSkeletonRsrc } from "./skeletonRsrc/parseSkeletonRsrcTS";
import { bg3dParsedToGLTF, gltfToBG3D } from "./parsedBg3dGitfConverter";
import { parseBG3D } from "./parseBG3D";
import { readFileSync } from "fs";
import { join } from "path";
import type { BG3DAnimation, BG3DBone, BG3DKeyframe, BG3DSkeleton } from "./parseBG3D";
import { runDoubleRoundtripNoExtrasTest } from "./roundtripSkeletonDoubleRoundtripHelper";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function isBG3DKeyframe(value: unknown): value is BG3DKeyframe {
  return (
    isRecord(value) &&
    typeof value.tick === "number" &&
    typeof value.coordX === "number" &&
    typeof value.coordY === "number" &&
    typeof value.coordZ === "number" &&
    typeof value.rotationX === "number" &&
    typeof value.rotationY === "number" &&
    typeof value.rotationZ === "number"
  );
}

function isBG3DAnimation(value: unknown): value is BG3DAnimation {
  if (!isRecord(value) || typeof value.name !== "string") return false;
  const kf = value.keyframes;
  if (!isRecord(kf) && typeof kf !== "object") return false;
  for (const arr of Object.values(kf || {})) {
    if (!Array.isArray(arr)) return false;
    for (const item of arr) {
      if (!isBG3DKeyframe(item)) return false;
    }
  }
  return true;
}

function isBG3DBone(value: unknown): value is BG3DBone {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    typeof value.parentBone === "number" &&
    typeof value.coordX === "number" &&
    typeof value.coordY === "number" &&
    typeof value.coordZ === "number"
  );
}

function isBG3DSkeleton(value: unknown): value is BG3DSkeleton {
  if (!isRecord(value) || typeof value.version !== "number") return false;
  if (!Array.isArray(value.bones) || !value.bones.every(isBG3DBone)) return false;
  if (!Array.isArray(value.animations) || !value.animations.every(isBG3DAnimation)) return false;
  return true;
}

function getSkeleton(result: unknown): BG3DSkeleton | undefined {
  if (!isRecord(result)) return undefined;
  return isBG3DSkeleton(result.skeleton) ? result.skeleton : undefined;
}

describe("BG3D + Skeleton Roundtrip Tests with FULL ACCURACY", () => {
  const ottoBg3dPath = join(
    __dirname,
    "../../public/games/ottomatic/skeletons/Otto.bg3d",
  );
  const ottoSkeletonPath = join(
    __dirname,
    "../../public/games/ottomatic/skeletons/Otto.skeleton.rsrc",
  );

  it("should achieve 100% semantic accuracy via double roundtrip test (no glTF extras)", async () => {
    await runDoubleRoundtripNoExtrasTest(ottoBg3dPath, ottoSkeletonPath);
  });

  it("should preserve skeleton bone structure and coordinates with 100% accuracy", async () => {
    const bg3dData = readFileSync(ottoBg3dPath);
    const skeletonData = readFileSync(ottoSkeletonPath);

    const originalSkeletonResource = await parseSkeletonRsrc(
      skeletonData.buffer.slice(
        skeletonData.byteOffset,
        skeletonData.byteOffset + skeletonData.byteLength,
      ),
    );
    const originalBg3d = parseBG3D(
      bg3dData.buffer.slice(
        bg3dData.byteOffset,
        bg3dData.byteOffset + bg3dData.byteLength,
      ),
      originalSkeletonResource,
    );

    expect(originalBg3d.isOk()).toBe(true);
    if (!originalBg3d.isOk()) return;

    const gltfResult = await bg3dParsedToGLTF(originalBg3d.value);
    const roundtripResult = await gltfToBG3D(gltfResult);

    const originalSkeleton = getSkeleton(originalBg3d.value);
    const roundtripSkeleton = getSkeleton(roundtripResult);
    if (!originalSkeleton || !roundtripSkeleton) return;

    expect(roundtripSkeleton.bones.length).toBe(originalSkeleton.bones.length);

    for (let i = 0; i < originalSkeleton.bones.length; i++) {
      const originalBone = originalSkeleton.bones[i];
      const roundtripBone = roundtripSkeleton.bones[i];
      if (!originalBone || !roundtripBone) continue;

      expect(roundtripBone.name).toBe(originalBone.name);
      expect(roundtripBone.parentBone).toBe(originalBone.parentBone);
      expect(roundtripBone.coordX).toBeCloseTo(originalBone.coordX, 5);
      expect(roundtripBone.coordY).toBeCloseTo(originalBone.coordY, 5);
      expect(roundtripBone.coordZ).toBeCloseTo(originalBone.coordZ, 5);
    }

    const originalRoot = originalSkeleton.bones.find((b) => b.parentBone === -1);
    const roundtripRoot = roundtripSkeleton.bones.find((b) => b.parentBone === -1);
    expect(originalRoot).toBeDefined();
    expect(roundtripRoot).toBeDefined();
    if (roundtripRoot && originalRoot) {
      expect(roundtripRoot.name).toBe(originalRoot.name);
    }
  });

  it("should maintain animation timing with 100% precision", async () => {
    const bg3dData = readFileSync(ottoBg3dPath);
    const skeletonData = readFileSync(ottoSkeletonPath);

    const originalSkeletonResource = await parseSkeletonRsrc(
      skeletonData.buffer.slice(
        skeletonData.byteOffset,
        skeletonData.byteOffset + skeletonData.byteLength,
      ),
    );
    const originalBg3d = parseBG3D(
      bg3dData.buffer.slice(
        bg3dData.byteOffset,
        bg3dData.byteOffset + bg3dData.byteLength,
      ),
      originalSkeletonResource,
    );

    expect(originalBg3d.isOk()).toBe(true);
    if (!originalBg3d.isOk()) return;

    const gltfResult = await bg3dParsedToGLTF(originalBg3d.value);
    const animations = gltfResult.getRoot().listAnimations();
    const originalParsedSkeleton = getSkeleton(originalBg3d.value);
    if (!originalParsedSkeleton) return;

    const originalTimingData: Record<string, Record<string, number[]>> = {};
    originalParsedSkeleton.animations.forEach((anim) => {
      originalTimingData[anim.name] = {};
      Object.entries(anim.keyframes).forEach(([boneIndexStr, keyframes]) => {
        const boneIndex = parseInt(boneIndexStr);
        const bone = originalParsedSkeleton.bones[boneIndex];
        if (bone && isArray(keyframes)) {
          originalTimingData[anim.name] = originalTimingData[anim.name] || {};
          const animTiming = originalTimingData[anim.name];
          if (animTiming) {
            animTiming[bone.name] = keyframes.map((kf) => {
              if (isRecord(kf) && typeof kf.tick === "number") {
                return kf.tick / 30.0;
              }
              return 0;
            });
          }
        }
      });
    });

    const gltfTimingData: Record<string, Record<string, number[]>> = {};
    animations.forEach((animation) => {
      const animName = animation.getName() || "unnamed";
      gltfTimingData[animName] = {};
      animation.listChannels().forEach((channel) => {
        const node = channel.getTargetNode();
        const boneName = node?.getName() || "unknown";
        const sampler = channel.getSampler();
        if (!sampler) return;
        const input = sampler.getInput();
        if (!input) return;
        const times = input.getArray();
        if (!times) return;

        gltfTimingData[animName] = gltfTimingData[animName] || {};
        const animBones = gltfTimingData[animName];
        if (animBones) {
          const timesArr: number[] = [];
          for (const t of times) {
            if (typeof t === "number") timesArr.push(t);
          }
          animBones[boneName] = timesArr;
        }
      });
    });

    Object.entries(originalTimingData).forEach(([animName, originalBones]) => {
      const gltfBones = gltfTimingData[animName];
      expect(gltfBones).toBeDefined();
      if (!gltfBones) return;

      Object.entries(originalBones).forEach(([boneName, originalTimes]) => {
        const gltfTimes = gltfBones[boneName];
        expect(gltfTimes).toBeDefined();
        if (!gltfTimes) return;

        expect(gltfTimes.length).toBe(originalTimes.length);
        originalTimes.forEach((originalTime, index) => {
          const gltfTime = gltfTimes[index];
          expect(gltfTime).toBeDefined();
          if (gltfTime === undefined) return;
          expect(Math.abs(gltfTime - originalTime)).toBeLessThan(0.0001);
        });
      });
    });
  });
});
