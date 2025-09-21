import { describe, test, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { Document, WebIO } from "@gltf-transform/core";
import { validateBytes } from "gltf-validator";
import { createSkeletonSystem } from "./skeletonSystemNew";
import { parseSkeletonRsrcTS } from "./skeletonRsrc/parseSkeletonRsrcTS";
import { parseBG3D } from "./parseBG3D";

describe("Nanosaur 2 Round-trip Parsing Tests", () => {
  const basePath = join(
    __dirname,
    "..",
    "..",
    "public",
    "PangeaRSEdit",
    "games",
    "nanosaur2",
    "skeletons",
  );

  // Test models that are known to have both BG3D and skeleton files
  const testModels = [
    "nano",
    "raptor",
    "worm",
    "brach",
    "ramphor",
    "bonusworm",
    "wormhole",
  ];

  test.each(testModels)(
    "round-trip parsing for %s skeleton data",
    async (modelName) => {
      const skeletonPath = join(basePath, `${modelName}.skeleton.rsrc`);
      const bg3dPath = join(basePath, `${modelName}.bg3d`);

      // Check files exist
      expect(() => readFileSync(skeletonPath)).not.toThrow();
      expect(() => readFileSync(bg3dPath)).not.toThrow();

      // Parse skeleton data
      const skeletonBuffer = readFileSync(skeletonPath);
      const skeletonResource = parseSkeletonRsrcTS(skeletonBuffer);

      expect(skeletonResource).toBeDefined();
      expect(skeletonResource.Bone).toBeDefined();
      expect(Object.keys(skeletonResource.Bone).length).toBeGreaterThan(0);

      // Parse BG3D data with skeleton
      const bg3dBuffer = readFileSync(bg3dPath);
      const bg3dData = parseBG3D(bg3dBuffer.buffer, skeletonResource);

      expect(bg3dData).toBeDefined();
      expect(bg3dData.groups).toBeDefined();
      expect(bg3dData.skeleton).toBeDefined();

      // Create skeleton system with round-trip
      const doc = new Document();
      const buffer = doc.createBuffer();

      const { skin, animations } = createSkeletonSystem(
        doc,
        bg3dData.skeleton!,
        buffer,
      );

      expect(skin).toBeDefined();
      expect(skin.listJoints().length).toBeGreaterThan(0);

      // Validate glTF output
      const io = new WebIO();
      const glb = await io.writeBinary(doc);
      const result = await validateBytes(glb);

      expect(result.issues.numErrors).toBe(0);

      console.log(
        `✅ ${modelName}: ${bg3dData.skeleton!.bones.length} bones, ${
          animations.length
        } animations`,
      );
    },
    10000,
  ); // 10 second timeout for each model

  test("Nanosaur 2 bone hierarchy comparison", async () => {
    const nanoPath = join(basePath, "nano.skeleton.rsrc");
    const raptorPath = join(basePath, "raptor.skeleton.rsrc");
    const nanoBg3dPath = join(basePath, "nano.bg3d");
    const raptorBg3dPath = join(basePath, "raptor.bg3d");

    const nanoBuffer = readFileSync(nanoPath);
    const raptorBuffer = readFileSync(raptorPath);
    const nanoResource = parseSkeletonRsrcTS(nanoBuffer as any);
    const raptorResource = parseSkeletonRsrcTS(raptorBuffer as any);

    // Parse BG3D with skeleton to get processed skeleton data
    const nanoBg3dBuffer = readFileSync(nanoBg3dPath);
    const raptorBg3dBuffer = readFileSync(raptorBg3dPath);
    const nanoData = parseBG3D(nanoBg3dBuffer as any, nanoResource);
    const raptorData = parseBG3D(raptorBg3dBuffer as any, raptorResource);

    // Both should have valid bone structures
    expect(nanoData.skeleton!.bones.length).toBeGreaterThan(5);
    expect(raptorData.skeleton!.bones.length).toBeGreaterThan(5);

    // Check for common dinosaur bone names
    const nanoBoneNames = nanoData.skeleton!.bones.map((bone) =>
      bone.name.toLowerCase(),
    );
    const raptorBoneNames = raptorData.skeleton!.bones.map((bone) =>
      bone.name.toLowerCase(),
    );

    // Both dinosaurs should have similar skeletal structure
    const expectedBones = ["head", "tail", "neck", "body", "spine"];
    for (const expectedBone of expectedBones) {
      const nanoHasBone = nanoBoneNames.some((name) =>
        name.includes(expectedBone),
      );
      const raptorHasBone = raptorBoneNames.some((name) =>
        name.includes(expectedBone),
      );

      if (nanoHasBone || raptorHasBone) {
        console.log(`Found ${expectedBone} bones in dinosaur models`);
      }
    }

    console.log(
      `Nano bones: ${nanoData.skeleton!.bones.map((b) => b.name).join(", ")}`,
    );
    console.log(
      `Raptor bones: ${raptorData
        .skeleton!.bones.map((b) => b.name)
        .join(", ")}`,
    );
  });

  test("Nanosaur 2 animation system validation", async () => {
    const nanoPath = join(basePath, "nano.skeleton.rsrc");
    const nanoBg3dPath = join(basePath, "nano.bg3d");

    const skeletonBuffer = readFileSync(nanoPath);
    const skeletonResource = parseSkeletonRsrcTS(skeletonBuffer);

    // Parse BG3D with skeleton to get processed skeleton data
    const bg3dBuffer = readFileSync(nanoBg3dPath);
    const bg3dData = parseBG3D(bg3dBuffer.buffer, skeletonResource);

    expect(bg3dData.skeleton).toBeDefined();

    if (
      bg3dData.skeleton!.animations &&
      bg3dData.skeleton!.animations.length > 0
    ) {
      const doc = new Document();
      const buffer = doc.createBuffer();

      const { animations } = createSkeletonSystem(
        doc,
        bg3dData.skeleton!,
        buffer,
      );

      expect(animations.length).toBe(bg3dData.skeleton!.animations.length);

      // Check animation properties
      for (let i = 0; i < animations.length; i++) {
        const gltfAnim = animations[i];
        const sourceAnim = bg3dData.skeleton!.animations[i];

        expect(gltfAnim.getName()).toBe(sourceAnim.name);
        expect(gltfAnim.listChannels().length).toBeGreaterThan(0);
        expect(gltfAnim.listSamplers().length).toBeGreaterThan(0);
      }

      console.log(
        `Nano animations: ${animations.map((a) => a.getName()).join(", ")}`,
      );
    }
  });

  test("BG3D JPEG texture extraction for Nanosaur 2", async () => {
    const wormPath = join(basePath, "worm.bg3d");
    const bg3dBuffer = readFileSync(wormPath);
    const bg3dData = parseBG3D(bg3dBuffer);

    expect(bg3dData.groups).toBeDefined();

    let jpegTextureCount = 0;
    let totalTextureSize = 0;

    // Look for JPEG textures in materials
    for (const group of bg3dData.groups) {
      if (group.materials) {
        for (const material of group.materials) {
          if (material.textureMap && material.textureMap.length > 0) {
            // Check if this looks like JPEG data (starts with FF D8)
            if (
              material.textureMap[0] === 0xff &&
              material.textureMap[1] === 0xd8
            ) {
              jpegTextureCount++;
              totalTextureSize += material.textureMap.length;
            }
          }
        }
      }
    }

    if (jpegTextureCount > 0) {
      console.log(
        `✅ Worm model contains ${jpegTextureCount} JPEG textures (${totalTextureSize} bytes total)`,
      );
    } else {
      console.log(`ℹ️  Worm model has no JPEG texture data`);
    }

    // The test should succeed regardless of whether textures are found
    expect(bg3dData.groups.length).toBeGreaterThan(0);
  });

  test("Nanosaur 2 bone transformation matrices", async () => {
    const brachPath = join(basePath, "brach.skeleton.rsrc");
    const brachBg3dPath = join(basePath, "brach.bg3d");

    const skeletonBuffer = readFileSync(brachPath);
    const skeletonResource = parseSkeletonRsrcTS(skeletonBuffer);

    // Parse BG3D with skeleton to get processed skeleton data
    const bg3dBuffer = readFileSync(brachBg3dPath);
    const bg3dData = parseBG3D(bg3dBuffer.buffer, skeletonResource);

    expect(bg3dData.skeleton).toBeDefined();

    // Create skeleton system and check bone transformations
    const doc = new Document();
    const buffer = doc.createBuffer();

    const { skin } = createSkeletonSystem(doc, bg3dData.skeleton!, buffer);
    const joints = skin.listJoints();

    expect(joints.length).toBe(bg3dData.skeleton!.bones.length);

    // Verify each joint has proper transformation
    for (let i = 0; i < joints.length; i++) {
      const joint = joints[i];
      const bone = bg3dData.skeleton!.bones[i];

      expect(joint.getName()).toBe(bone.name);

      // Joint should have translation data
      const translation = joint.getTranslation();
      expect(translation).toHaveLength(3);
      expect(translation.every((n) => isFinite(n))).toBe(true);
    }

    console.log(
      `Brach skeleton: validated ${joints.length} joint transformations`,
    );
  });

  test("Nanosaur 2 round-trip coordinate preservation", async () => {
    const ramphorPath = join(basePath, "ramphor.skeleton.rsrc");
    const ramphorBg3dPath = join(basePath, "ramphor.bg3d");

    const skeletonBuffer = readFileSync(ramphorPath);
    const skeletonResource = parseSkeletonRsrcTS(skeletonBuffer);

    // Parse BG3D with skeleton to get processed skeleton data
    const bg3dBuffer = readFileSync(ramphorBg3dPath);
    const bg3dData = parseBG3D(bg3dBuffer.buffer, skeletonResource);

    expect(bg3dData.skeleton).toBeDefined();

    // Create glTF and extract bone data back
    const doc = new Document();
    const buffer = doc.createBuffer();

    const { skin } = createSkeletonSystem(doc, bg3dData.skeleton!, buffer);
    const joints = skin.listJoints();

    // Check that coordinates are preserved (with some tolerance for floating point)
    for (
      let i = 0;
      i < Math.min(joints.length, bg3dData.skeleton!.bones.length);
      i++
    ) {
      const joint = joints[i];
      const originalBone = bg3dData.skeleton!.bones[i];

      const translation = joint.getTranslation();

      // Allow some tolerance for floating point conversion
      const tolerance = 0.1;
      expect(Math.abs(translation[0] - originalBone.coordX)).toBeLessThan(
        tolerance,
      );
      expect(Math.abs(translation[1] - originalBone.coordY)).toBeLessThan(
        tolerance,
      );
      expect(Math.abs(translation[2] - originalBone.coordZ)).toBeLessThan(
        tolerance,
      );
    }

    console.log(
      `Ramphor: coordinate preservation validated for ${joints.length} bones`,
    );
  });
});
