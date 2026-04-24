import { expect } from "vitest";
import { readFileSync } from "fs";
import { NodeIO } from "@gltf-transform/core";
import { validateBytes } from "gltf-validator";
import {
  bg3dParsedToBG3D,
  parseBG3D,
  type BG3DAnimation,
  type BG3DBone,
  type BG3DKeyframe,
  type BG3DSkeleton,
} from "./parseBG3D";
import { bg3dParsedToGLTF, gltfToBG3D } from "./parsedBg3dGitfConverter";
import { parseSkeletonRsrc } from "./skeletonRsrc/parseSkeletonRsrcTS";
import { bg3dSkeletonToSkeletonResource } from "./skeletonExport";
import { skeletonResourceToBinary } from "./skeletonBinaryExport";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function getString(value: unknown, defaultValue = ""): string {
  return typeof value === "string" ? value : defaultValue;
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
  if (!isRecord(value)) return false;
  if (typeof value.version !== "number") return false;
  if (!Array.isArray(value.bones) || !value.bones.every(isBG3DBone))
    return false;
  if (
    !Array.isArray(value.animations) ||
    !value.animations.every(isBG3DAnimation)
  )
    return false;
  return true;
}

function getSkeleton(result: unknown): BG3DSkeleton | undefined {
  if (!isRecord(result)) return undefined;
  return isBG3DSkeleton(result.skeleton) ? result.skeleton : undefined;
}

export async function runDoubleRoundtripNoExtrasTest(
  ottoBg3dPath: string,
  ottoSkeletonPath: string,
): Promise<void> {
  const originalBg3dData = readFileSync(ottoBg3dPath);
  const originalSkeletonData = readFileSync(ottoSkeletonPath);

  const originalSkeletonResource = await parseSkeletonRsrc(
    originalSkeletonData.buffer.slice(
      originalSkeletonData.byteOffset,
      originalSkeletonData.byteOffset + originalSkeletonData.byteLength,
    ),
  );
  const originalBg3d = parseBG3D(
    originalBg3dData.buffer.slice(
      originalBg3dData.byteOffset,
      originalBg3dData.byteOffset + originalBg3dData.byteLength,
    ),
    originalSkeletonResource,
  );

  expect(originalBg3d.isOk()).toBe(true);
  if (!originalBg3d.isOk()) return;
  const gltf1 = await bg3dParsedToGLTF(originalBg3d.value);

  const gltf1ExtrasRaw = gltf1.getRoot().getExtras();
  const gltf1Extras = isRecord(gltf1ExtrasRaw) ? gltf1ExtrasRaw : undefined;
  const bg3dFieldsRaw = gltf1Extras?.["bg3dFields"];
  const bg3dFields = isRecord(bg3dFieldsRaw) ? bg3dFieldsRaw : undefined;
  const skeletonExtrasRaw = bg3dFields?.["skeletonExtras"];
  const skeletonExtras = isRecord(skeletonExtrasRaw)
    ? skeletonExtrasRaw
    : undefined;
  const keyframeDataRaw = skeletonExtras?.["keyframeData"];
  const keyframeData = isArray(keyframeDataRaw) ? keyframeDataRaw : undefined;

  expect(!!skeletonExtras).toBe(true);
  expect(!!keyframeData).toBe(true);
  expect(keyframeData?.length || 0).toBeGreaterThan(0);

  const io = new NodeIO();
  const glb1Buffer = await io.writeBinary(gltf1);
  const validation1 = await validateBytes(glb1Buffer);
  expect(validation1.issues.numErrors).toBe(0);

  const roundtrip1Result = await gltfToBG3D(gltf1);
  const roundtrip1Bg3dBinary = bg3dParsedToBG3D(roundtrip1Result);
  const roundtrip1Skeleton = getSkeleton(roundtrip1Result);
  if (!roundtrip1Skeleton) return;

  const roundtrip1SkeletonResource =
    bg3dSkeletonToSkeletonResource(roundtrip1Skeleton);
  const roundtrip1SkeletonBinaryResult = skeletonResourceToBinary(
    roundtrip1SkeletonResource,
  );
  if (!roundtrip1SkeletonBinaryResult.isOk()) return;
  const roundtrip1SkeletonBinary = roundtrip1SkeletonBinaryResult.value;

  const roundtrip1SkeletonResourceParsed = await parseSkeletonRsrc(
    roundtrip1SkeletonBinary,
  );
  const roundtrip1Bg3dParsed = parseBG3D(
    roundtrip1Bg3dBinary,
    roundtrip1SkeletonResourceParsed,
  );
  expect(roundtrip1Bg3dParsed.isOk()).toBe(true);
  if (!roundtrip1Bg3dParsed.isOk()) return;

  const gltf2 = await bg3dParsedToGLTF(roundtrip1Bg3dParsed.value);
  const glb2Buffer = await io.writeBinary(gltf2);
  const validation2 = await validateBytes(glb2Buffer);
  expect(validation2.issues.numErrors).toBe(0);

  const roundtrip2Result = await gltfToBG3D(gltf2);
  const roundtrip2Bg3dBinary = bg3dParsedToBG3D(roundtrip2Result);
  const rt2SkeletonTemp = getSkeleton(roundtrip2Result);
  if (!rt2SkeletonTemp) return;

  const roundtrip2SkeletonResource =
    bg3dSkeletonToSkeletonResource(rt2SkeletonTemp);
  const roundtrip2SkeletonBinaryResult = skeletonResourceToBinary(
    roundtrip2SkeletonResource,
  );
  if (!roundtrip2SkeletonBinaryResult.isOk()) return;
  const roundtrip2SkeletonBinary = roundtrip2SkeletonBinaryResult.value;

  const rt2Skeleton = getSkeleton(roundtrip2Result);
  if (!rt2Skeleton) return;

  const rt1BoneCount = roundtrip1Skeleton.bones.length;
  const rt2BoneCount = rt2Skeleton.bones.length;
  const rt1AnimCount = roundtrip1Skeleton.animations.length;
  const rt2AnimCount = rt2Skeleton.animations.length;

  expect(rt1BoneCount).toBe(rt2BoneCount);
  expect(rt1AnimCount).toBe(rt2AnimCount);

  if (rt1AnimCount > 0 && rt2AnimCount > 0) {
    const rt1Anim = roundtrip1Skeleton.animations[0];
    const rt2Anim = rt2Skeleton.animations[0];
    if (!rt1Anim || !rt2Anim) return;

    const rt1BoneWithKfCount = Object.keys(rt1Anim.keyframes).length;
    const rt2BoneWithKfCount = Object.keys(rt2Anim.keyframes).length;
    expect(rt1BoneWithKfCount).toBe(rt2BoneWithKfCount);

    const rt1BoneKeys = Object.keys(rt1Anim.keyframes).sort(
      (a, b) => parseInt(a) - parseInt(b),
    );
    for (let bi = 0; bi < Math.min(3, rt1BoneKeys.length); bi++) {
      const boneKey = getString(rt1BoneKeys[bi]);
      const rt1Kfs = rt1Anim.keyframes[parseInt(boneKey)];
      const rt2Kfs = rt2Anim.keyframes[parseInt(boneKey)];
      if (!rt1Kfs || !rt2Kfs) continue;

      if (rt1Kfs.length > 0 && rt2Kfs.length > 0) {
        const kf1 = rt1Kfs[0];
        const kf2 = rt2Kfs[0];
        if (!kf1 || !kf2) continue;
        expect(kf1.tick).toBe(kf2.tick);
      }
    }
  }

  const rt1Bg3dArray = new Uint8Array(roundtrip1Bg3dBinary);
  const rt2Bg3dArray = new Uint8Array(roundtrip2Bg3dBinary);
  const maxBg3dLength = Math.max(rt1Bg3dArray.length, rt2Bg3dArray.length);
  const minBg3dLength = Math.min(rt1Bg3dArray.length, rt2Bg3dArray.length);

  let bg3dMismatches = 0;
  for (let i = 0; i < minBg3dLength; i++) {
    if (rt1Bg3dArray[i] !== rt2Bg3dArray[i]) bg3dMismatches++;
  }
  bg3dMismatches += Math.abs(rt1Bg3dArray.length - rt2Bg3dArray.length);
  const bg3dAccuracy = 1 - bg3dMismatches / maxBg3dLength;

  const rt1SkeletonArray = new Uint8Array(roundtrip1SkeletonBinary);
  const rt2SkeletonArray = new Uint8Array(roundtrip2SkeletonBinary);
  const maxSkeletonLength = Math.max(
    rt1SkeletonArray.length,
    rt2SkeletonArray.length,
  );
  const minSkeletonLength = Math.min(
    rt1SkeletonArray.length,
    rt2SkeletonArray.length,
  );

  let skeletonMismatches = 0;
  for (let i = 0; i < minSkeletonLength; i++) {
    if (rt1SkeletonArray[i] !== rt2SkeletonArray[i]) skeletonMismatches++;
  }
  skeletonMismatches += Math.abs(
    rt1SkeletonArray.length - rt2SkeletonArray.length,
  );
  const skeletonAccuracy = 1 - skeletonMismatches / maxSkeletonLength;

  expect(bg3dAccuracy).toBeGreaterThan(0.9999);
  expect(skeletonAccuracy).toBeGreaterThan(0.99);
}
