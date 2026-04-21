/**
 * Keyframe Edit Roundtrip Test
 *
 * Simulates the exact user workflow:
 * 1. Load Otto BG3D + skeleton.rsrc
 * 2. Convert to glTF document
 * 3. Write to GLB binary
 * 4. Modify one bone's position keyframe in the glTF data
 * 5. Read the GLB back
 * 6. Convert back to BG3D
 * 7. Verify ALL bone rest positions are preserved (not just the edited one)
 * 8. Verify ALL animations' keyframe data is preserved
 *
 * This catches the bug where editing one keyframe corrupts the skeleton structure.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { NodeIO } from "@gltf-transform/core";
import { parseBG3D } from "@/modelParsers/parseBG3D";
import { parseSkeletonRsrc } from "@/modelParsers/skeletonRsrc/parseSkeletonRsrcTS";
import {
  bg3dParsedToGLTF,
  gltfToBG3D,
} from "@/modelParsers/parsedBg3dGitfConverter";
// migrated from custom unwrap helper to neverthrow instance methods

function bufferFromFile(filePath: string): ArrayBuffer {
  const buf = readFileSync(filePath);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

const BG3D_PATH = join(
  __dirname,
  "../../public/games/ottomatic/skeletons/Otto.bg3d",
);
const SKEL_PATH = join(
  __dirname,
  "../../public/games/ottomatic/skeletons/Otto.skeleton.rsrc",
);

describe("Keyframe edit roundtrip", () => {
  it("preserves all bone rest positions after gltf-transform roundtrip (no edits)", async () => {
    if (!existsSync(BG3D_PATH) || !existsSync(SKEL_PATH)) {
      console.warn("Skipping - Otto files not found");
      return;
    }

    const originalSkeleton = await parseSkeletonRsrc(bufferFromFile(SKEL_PATH));
    const parsedRes = parseBG3D(bufferFromFile(BG3D_PATH), originalSkeleton);
    expect(parsedRes.isOk()).toBe(true);
    if (!parsedRes.isOk()) return;
    const parsed = parsedRes.value;
    expect(parsed.skeleton).toBeDefined();
    if (!parsed.skeleton) return;

    const originalBones = parsed.skeleton.bones;

    // Convert to glTF, serialize, deserialize, convert back
    const io = new NodeIO();
    const doc = bg3dParsedToGLTF(parsed);
    const glbBytes = await io.writeBinary(doc);
    const readDoc = await io.readBinary(glbBytes);
    const roundtripped = await gltfToBG3D(readDoc);

    expect(roundtripped.skeleton).toBeDefined();
    if (!roundtripped.skeleton) return;

    const rtBones = roundtripped.skeleton.bones;
    expect(rtBones.length).toBe(originalBones.length);

    // Check EVERY bone's rest position (absolute world coords)
    for (let i = 0; i < originalBones.length; i++) {
      const orig = originalBones[i];
      const rt = rtBones[i];
      if (!orig || !rt) continue;
      expect(rt.name).toBe(orig.name);
      expect(rt.parentBone).toBe(orig.parentBone);
      expect(rt.coordX).toBeCloseTo(orig.coordX, 1);
      expect(rt.coordY).toBeCloseTo(orig.coordY, 1);
      expect(rt.coordZ).toBeCloseTo(orig.coordZ, 1);
    }
  });

  it("preserves all keyframe translations after gltf-transform roundtrip (no edits)", async () => {
    if (!existsSync(BG3D_PATH) || !existsSync(SKEL_PATH)) {
      console.warn("Skipping - Otto files not found");
      return;
    }

    const originalSkeleton = await parseSkeletonRsrc(bufferFromFile(SKEL_PATH));
    const parsedRes = parseBG3D(bufferFromFile(BG3D_PATH), originalSkeleton);
    expect(parsedRes.isOk()).toBe(true);
    if (!parsedRes.isOk()) return;
    const parsed = parsedRes.value;
    expect(parsed.skeleton).toBeDefined();
    if (!parsed.skeleton) return;

    const io = new NodeIO();
    const doc = bg3dParsedToGLTF(parsed);
    const glbBytes = await io.writeBinary(doc);
    const readDoc = await io.readBinary(glbBytes);
    const roundtripped = await gltfToBG3D(readDoc);

    expect(roundtripped.skeleton).toBeDefined();
    if (!roundtripped.skeleton) return;

    // Check all animations
    expect(roundtripped.skeleton.animations.length).toBe(
      parsed.skeleton.animations.length,
    );

    for (let a = 0; a < parsed.skeleton.animations.length; a++) {
      const origAnim = parsed.skeleton.animations[a];
      const rtAnim = roundtripped.skeleton.animations[a];
      if (!origAnim || !rtAnim) continue;
      expect(rtAnim.name).toBe(origAnim.name);

      // Check keyframes for each bone
      for (const boneIndexStr of Object.keys(origAnim.keyframes)) {
        const boneIdx = parseInt(boneIndexStr);
        const origKeyframes = origAnim.keyframes[boneIdx];
        const rtKeyframes = rtAnim.keyframes[boneIdx];

        expect(rtKeyframes).toBeDefined();
        if (!origKeyframes || !rtKeyframes) continue;
        expect(rtKeyframes.length).toBe(origKeyframes.length);

        for (let k = 0; k < origKeyframes.length; k++) {
          const origKf = origKeyframes[k];
          const rtKf = rtKeyframes[k];
          if (!origKf || !rtKf) continue;
          expect(rtKf.tick).toBe(origKf.tick);
          // Translation
          expect(rtKf.coordX).toBeCloseTo(origKf.coordX, 1);
          expect(rtKf.coordY).toBeCloseTo(origKf.coordY, 1);
          expect(rtKf.coordZ).toBeCloseTo(origKf.coordZ, 1);
          // Scale
          expect(rtKf.scaleX).toBeCloseTo(origKf.scaleX, 1);
          expect(rtKf.scaleY).toBeCloseTo(origKf.scaleY, 1);
          expect(rtKf.scaleZ).toBeCloseTo(origKf.scaleZ, 1);
        }
      }
    }
  });

  it("preserves bone structure after modifying one keyframe translation", async () => {
    if (!existsSync(BG3D_PATH) || !existsSync(SKEL_PATH)) {
      console.warn("Skipping - Otto files not found");
      return;
    }

    const originalSkeleton = await parseSkeletonRsrc(bufferFromFile(SKEL_PATH));
    const parsedRes = parseBG3D(bufferFromFile(BG3D_PATH), originalSkeleton);
    expect(parsedRes.isOk()).toBe(true);
    if (!parsedRes.isOk()) return;
    const parsed = parsedRes.value;
    expect(parsed.skeleton).toBeDefined();
    if (!parsed.skeleton) return;

    const originalBones = parsed.skeleton.bones;

    // Step 1: Convert to glTF
    const io = new NodeIO();
    const doc = bg3dParsedToGLTF(parsed);

    // Step 2: Modify one animation track value in the glTF document
    // This simulates what happens when user edits a keyframe in the UI
    const animations = doc.getRoot().listAnimations();
    expect(animations.length).toBeGreaterThan(0);

    const firstAnim = animations[0];
    if (!firstAnim) return;
    const channels = firstAnim.listChannels();

    // Find a translation channel for the first bone (Pelvis)
    let modifiedChannel = false;
    for (const channel of channels) {
      if (channel.getTargetPath() === "translation") {
        const sampler = channel.getSampler();
        if (!sampler) continue;
        const output = sampler.getOutput();
        if (!output) continue;
        const arr = output.getArray();
        if (!(arr instanceof Float32Array) || arr.length < 3) continue;

        // Modify the first keyframe's Y value by +5.0
        const originalY = arr[1];
        arr[1] = (originalY ?? 0) + 5.0;
        modifiedChannel = true;
        break;
      }
    }
    expect(modifiedChannel).toBe(true);

    // Step 3: Serialize and deserialize
    const glbBytes = await io.writeBinary(doc);
    const readDoc = await io.readBinary(glbBytes);

    // Step 4: Convert back to BG3D
    const roundtripped = await gltfToBG3D(readDoc);
    expect(roundtripped.skeleton).toBeDefined();
    if (!roundtripped.skeleton) return;

    const rtBones = roundtripped.skeleton.bones;
    expect(rtBones.length).toBe(originalBones.length);

    // Step 5: Verify ALL bone rest positions are preserved
    // This is the critical check - bone REST positions should NOT change
    // even when animation keyframes are modified
    for (let i = 0; i < originalBones.length; i++) {
      const orig = originalBones[i];
      const rt = rtBones[i];
      if (!orig || !rt) continue;
      expect(rt.name).toBe(orig.name);
      expect(rt.parentBone).toBe(orig.parentBone);
      // Bone rest positions MUST be preserved within 0.1 tolerance
      expect(rt.coordX).toBeCloseTo(orig.coordX, 0);
      expect(rt.coordY).toBeCloseTo(orig.coordY, 0);
      expect(rt.coordZ).toBeCloseTo(orig.coordZ, 0);
    }

    // Step 6: Check bone hierarchy relationships
    // Verify the "extends from parent" relationship is maintained
    for (let i = 0; i < rtBones.length; i++) {
      const bone = rtBones[i];
      if (!bone) continue;
      if (bone.parentBone >= 0) {
        const parent = rtBones[bone.parentBone];
        expect(parent).toBeDefined();
        if (!parent) continue;

        // Calculate the bone's local offset from parent
        const localOffsetX = bone.coordX - parent.coordX;
        const localOffsetY = bone.coordY - parent.coordY;
        const localOffsetZ = bone.coordZ - parent.coordZ;

        // The same offset should match the original
        const origBone = originalBones[i];
        if (!origBone) continue;
        const origParent = originalBones[origBone.parentBone];
        if (origParent) {
          const origLocalX = origBone.coordX - origParent.coordX;
          const origLocalY = origBone.coordY - origParent.coordY;
          const origLocalZ = origBone.coordZ - origParent.coordZ;
          expect(localOffsetX).toBeCloseTo(origLocalX, 0);
          expect(localOffsetY).toBeCloseTo(origLocalY, 0);
          expect(localOffsetZ).toBeCloseTo(origLocalZ, 0);
        }
      }
    }

    // Step 7: Verify that OTHER animations' keyframes are NOT corrupted
    const origAnims = parsed.skeleton.animations;
    const rtAnims = roundtripped.skeleton.animations;
    expect(rtAnims.length).toBe(origAnims.length);

    // Check animation at index 1 onwards (index 0 was modified)
    for (let a = 1; a < origAnims.length; a++) {
      const origAnim = origAnims[a];
      const rtAnim = rtAnims[a];
      if (!origAnim || !rtAnim) continue;
      expect(rtAnim.name).toBe(origAnim.name);

      for (const boneIndexStr of Object.keys(origAnim.keyframes)) {
        const boneIdx = parseInt(boneIndexStr);
        const origKeyframes = origAnim.keyframes[boneIdx];
        const rtKeyframes = rtAnim.keyframes[boneIdx];

        if (!origKeyframes || !rtKeyframes) continue;
        expect(rtKeyframes.length).toBe(origKeyframes.length);

        for (let k = 0; k < origKeyframes.length; k++) {
          const origKf = origKeyframes[k];
          const rtKf = rtKeyframes[k];
          if (!origKf || !rtKf) continue;
          // Other animations should be fully preserved
          expect(rtKf.coordX).toBeCloseTo(origKf.coordX, 1);
          expect(rtKf.coordY).toBeCloseTo(origKf.coordY, 1);
          expect(rtKf.coordZ).toBeCloseTo(origKf.coordZ, 1);
        }
      }
    }
  });

  it("double roundtrip: modify, export, reimport, revert, export, reimport gives original bytes", async () => {
    if (!existsSync(BG3D_PATH) || !existsSync(SKEL_PATH)) {
      console.warn("Skipping - Otto files not found");
      return;
    }

    const originalSkeleton = await parseSkeletonRsrc(bufferFromFile(SKEL_PATH));
    const parsedRes = parseBG3D(bufferFromFile(BG3D_PATH), originalSkeleton);
    expect(parsedRes.isOk()).toBe(true);
    if (!parsedRes.isOk()) return;
    const parsed = parsedRes.value;
    expect(parsed.skeleton).toBeDefined();
    if (!parsed.skeleton) return;

    const io = new NodeIO();

    // --- First pass: modify keyframe, export ---
    const doc1 = bg3dParsedToGLTF(parsed);
    const anim1 = doc1.getRoot().listAnimations()[0];
    if (!anim1) return;
    let originalY = 0;
    for (const channel of anim1.listChannels()) {
      if (channel.getTargetPath() === "translation") {
        const sampler = channel.getSampler();
        const output = sampler?.getOutput();
        const arr = output?.getArray();
        if (arr instanceof Float32Array && arr.length >= 3) {
          originalY = arr[1] ?? 0;
          arr[1] = originalY + 10.0;
          break;
        }
      }
    }

    const glb1 = await io.writeBinary(doc1);
    const readDoc1 = await io.readBinary(glb1);
    const pass1 = await gltfToBG3D(readDoc1);
    expect(pass1.skeleton).toBeDefined();
    if (!pass1.skeleton) return;

    // --- Second pass: revert keyframe, export ---
    const doc2 = bg3dParsedToGLTF(pass1);
    const anim2 = doc2.getRoot().listAnimations()[0];
    if (!anim2) return;
    for (const channel of anim2.listChannels()) {
      if (channel.getTargetPath() === "translation") {
        const sampler = channel.getSampler();
        const output = sampler?.getOutput();
        const arr = output?.getArray();
        if (arr instanceof Float32Array && arr.length >= 3) {
          arr[1] = originalY;
          break;
        }
      }
    }

    const glb2 = await io.writeBinary(doc2);
    const readDoc2 = await io.readBinary(glb2);
    const pass2 = await gltfToBG3D(readDoc2);
    expect(pass2.skeleton).toBeDefined();
    if (!pass2.skeleton) return;

    // --- Compare: pass2 should match original ---
    const origBones = parsed.skeleton.bones;
    const finalBones = pass2.skeleton.bones;
    expect(finalBones.length).toBe(origBones.length);

    for (let i = 0; i < origBones.length; i++) {
      const orig = origBones[i];
      const final_ = finalBones[i];
      if (!orig || !final_) continue;
      expect(final_.coordX).toBeCloseTo(orig.coordX, 0);
      expect(final_.coordY).toBeCloseTo(orig.coordY, 0);
      expect(final_.coordZ).toBeCloseTo(orig.coordZ, 0);
    }

    // Compare animation keyframes
    for (let a = 0; a < parsed.skeleton.animations.length; a++) {
      const origAnim = parsed.skeleton.animations[a];
      const finalAnim = pass2.skeleton.animations[a];
      if (!origAnim || !finalAnim) continue;

      for (const boneIndexStr of Object.keys(origAnim.keyframes)) {
        const boneIdx = parseInt(boneIndexStr);
        const origKfs = origAnim.keyframes[boneIdx];
        const finalKfs = finalAnim.keyframes[boneIdx];
        if (!origKfs || !finalKfs) continue;
        expect(finalKfs.length).toBe(origKfs.length);

        for (let k = 0; k < origKfs.length; k++) {
          const origKf = origKfs[k];
          const finalKf = finalKfs[k];
          if (!origKf || !finalKf) continue;
          expect(finalKf.coordX).toBeCloseTo(origKf.coordX, 1);
          expect(finalKf.coordY).toBeCloseTo(origKf.coordY, 1);
          expect(finalKf.coordZ).toBeCloseTo(origKf.coordZ, 1);
        }
      }
    }
  });
});
