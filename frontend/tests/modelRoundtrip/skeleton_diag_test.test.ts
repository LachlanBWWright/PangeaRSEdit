import { describe, it, expect } from "vitest";
import { NodeIO } from "@gltf-transform/core";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { parseBG3D } from "@/modelParsers/parseBG3D";
import { parseSkeletonRsrc } from "@/modelParsers/skeletonRsrc/parseSkeletonRsrcTS";
import { bg3dParsedToGLTF, gltfToBG3D } from "@/modelParsers/parsedBg3dGitfConverter";
import { unwrap } from "@/types/result";

function bufferFromFile(filePath: string): ArrayBuffer {
  const buf = readFileSync(filePath);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

describe("Skeleton data diagnostic", () => {
  const bg3dPath = join(__dirname, "../../public/games/ottomatic/skeletons/Blob.bg3d");
  const skelPath = join(__dirname, "../../public/games/ottomatic/skeletons/Blob.skeleton.rsrc");

  it("reveals keyframe coordinate format (local vs absolute)", async () => {
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

    let localMatches = 0;
    let absoluteMatches = 0;
    let neitherMatches = 0;
    let totalBones = 0;

    for (let i = 0; i < skel.bones.length; i++) {
      const bone = skel.bones[i];
      if (!bone) continue;
      const kfs = firstAnim.keyframes[i];
      if (!kfs || kfs.length === 0) continue;
      const kf0 = kfs[0];
      if (!kf0) continue;

      totalBones++;
      const parentBone = bone.parentBone >= 0 ? skel.bones[bone.parentBone] : null;
      const localX = parentBone ? bone.coordX - parentBone.coordX : bone.coordX;
      const localY = parentBone ? bone.coordY - parentBone.coordY : bone.coordY;
      const localZ = parentBone ? bone.coordZ - parentBone.coordZ : bone.coordZ;

      const matchesAbsolute =
        Math.abs(kf0.coordX - bone.coordX) < 0.01 &&
        Math.abs(kf0.coordY - bone.coordY) < 0.01 &&
        Math.abs(kf0.coordZ - bone.coordZ) < 0.01;
      const matchesLocal =
        Math.abs(kf0.coordX - localX) < 0.01 &&
        Math.abs(kf0.coordY - localY) < 0.01 &&
        Math.abs(kf0.coordZ - localZ) < 0.01;

      if (matchesLocal && !matchesAbsolute) localMatches++;
      else if (matchesAbsolute && !matchesLocal) absoluteMatches++;
      else if (matchesAbsolute && matchesLocal) localMatches++; // They can match both when parent is at origin
      else {
        neitherMatches++;
        console.log(`Bone ${i} "${bone.name}": matches neither!`);
        console.log(`  KF[0]: (${kf0.coordX}, ${kf0.coordY}, ${kf0.coordZ})`);
        console.log(`  ABS:   (${bone.coordX}, ${bone.coordY}, ${bone.coordZ})`);
        console.log(`  LOCAL: (${localX}, ${localY}, ${localZ})`);
      }
    }

    console.log(`\nSummary: ${totalBones} bones checked`);
    console.log(`  Local matches: ${localMatches}`);
    console.log(`  Absolute-only matches: ${absoluteMatches}`);
    console.log(`  Neither: ${neitherMatches}`);

    // Check if keyframe coords are near zero (default rest pose)
    let zeroCoords = 0;
    for (let i = 0; i < skel.bones.length; i++) {
      const kfs = firstAnim.keyframes[i];
      if (!kfs || kfs.length === 0) continue;
      const kf0 = kfs[0];
      if (!kf0) continue;
      if (Math.abs(kf0.coordX) < 0.01 && Math.abs(kf0.coordY) < 0.01 && Math.abs(kf0.coordZ) < 0.01) {
        zeroCoords++;
      }
    }
    console.log(`  Zero/near-zero coords: ${zeroCoords}`);
  });

  it("round-trips real data correctly", async () => {
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
    const io = new NodeIO();
    const doc = bg3dParsedToGLTF(parsed);
    const glb = await io.writeBinary(doc);
    const readDoc = await io.readBinary(glb);
    const roundtripped = gltfToBG3D(readDoc);

    expect(roundtripped.skeleton).toBeDefined();
    if (!roundtripped.skeleton) return;

    const rtSkel = roundtripped.skeleton;
    
    // Check ALL bone positions
    for (let i = 0; i < skel.bones.length; i++) {
      const orig = skel.bones[i];
      const rt = rtSkel.bones[i];
      if (!orig || !rt) continue;
      
      expect(rt.coordX).toBeCloseTo(orig.coordX, 1);
      expect(rt.coordY).toBeCloseTo(orig.coordY, 1);
      expect(rt.coordZ).toBeCloseTo(orig.coordZ, 1);
    }

    // Check ALL animation keyframe coords
    const origAnim = skel.animations[0];
    const rtAnim = rtSkel.animations[0];
    if (!origAnim || !rtAnim) return;

    for (let i = 0; i < skel.bones.length; i++) {
      const origKfs = origAnim.keyframes[i];
      const rtKfs = rtAnim.keyframes[i];
      if (!origKfs || !rtKfs) continue;

      expect(rtKfs.length).toBe(origKfs.length);

      for (let k = 0; k < origKfs.length; k++) {
        const o = origKfs[k];
        const r = rtKfs[k];
        if (!o || !r) continue;
        
        const dc = Math.max(
          Math.abs(o.coordX - r.coordX),
          Math.abs(o.coordY - r.coordY),
          Math.abs(o.coordZ - r.coordZ)
        );
        if (dc > 0.01) {
          console.log(`Bone ${i} KF[${k}]: coord mismatch! diff=${dc.toFixed(4)}`);
          console.log(`  Orig: (${o.coordX}, ${o.coordY}, ${o.coordZ})`);
          console.log(`  RT: (${r.coordX}, ${r.coordY}, ${r.coordZ})`);
        }
        
        expect(r.coordX).toBeCloseTo(o.coordX, 1);
        expect(r.coordY).toBeCloseTo(o.coordY, 1);
        expect(r.coordZ).toBeCloseTo(o.coordZ, 1);
      }
    }
  });
});
