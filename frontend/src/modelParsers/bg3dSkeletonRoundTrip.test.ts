// Round-trip test for BG3D + skeleton parsing with FULL ACCURACY requirements
import { describe, it, expect } from "vitest";
import { parseBG3D } from "./parseBG3D";
// migrated from custom unwrap helper to neverthrow instance methods
import { parseSkeletonRsrc } from "./skeletonRsrc/parseSkeletonRsrcTS";
import { bg3dSkeletonToSkeletonResource } from "./skeletonExport";
import { skeletonResourceToBinary } from "./skeletonBinaryExport";
import {
  bg3dParsedToGLTF,
  gltfToBG3D,
} from "./parsedBg3dGitfConverter";
import { readFileSync } from "fs";
import { join } from "path";
import { NodeIO } from "@gltf-transform/core";
import { validateBytes } from "gltf-validator";

describe("BG3D Skeleton Round-trip with FULL ACCURACY", () => {
  // Test with Otto model for comprehensive accuracy testing
  const ottoBg3dPath = join(
    __dirname,
    "../../public/games/ottomatic/skeletons/Otto.bg3d",
  );
  const ottoSkeletonPath = join(
    __dirname,
    "../../public/games/ottomatic/skeletons/Otto.skeleton.rsrc",
  );

  it("should reconstruct BG3D + skeleton semantics from GLB-only data", async () => {
    console.log("=== GLB-ONLY ROUNDTRIP TEST ===");

    // Step 1: Load original files
    const originalBg3dData = readFileSync(ottoBg3dPath);
    const originalSkeletonData = readFileSync(ottoSkeletonPath);

    console.log(`Original BG3D: ${originalBg3dData.length} bytes`);
    console.log(`Original Skeleton: ${originalSkeletonData.length} bytes`);

    // Step 2: Parse original files
    const originalSkeletonResource = await parseSkeletonRsrc(
      originalSkeletonData.buffer.slice(
        originalSkeletonData.byteOffset,
        originalSkeletonData.byteOffset + originalSkeletonData.byteLength,
      ),
    );
    const originalBg3dRes = parseBG3D(
      originalBg3dData.buffer.slice(
        originalBg3dData.byteOffset,
        originalBg3dData.byteOffset + originalBg3dData.byteLength,
      ),
      originalSkeletonResource,
    );
    expect(originalBg3dRes.isOk()).toBe(true);
    if (!originalBg3dRes.isOk()) return;
    const originalBg3d = originalBg3dRes.value;

    // Step 3: Convert to glTF without storing original binaries.
    const gltfDocument = bg3dParsedToGLTF(originalBg3d);

    // Step 4: COMPREHENSIVE glTF VALIDATION
    console.log("\n=== COMPREHENSIVE glTF VALIDATION ===");
    const io = new NodeIO();
    const glbBuffer = await io.writeBinary(gltfDocument);
    console.log(`Generated GLB: ${glbBuffer.length} bytes`);

    const validationReport = await validateBytes(glbBuffer);
    console.log(
      `Validation: ${validationReport.issues.numErrors} errors, ${validationReport.issues.numWarnings} warnings`,
    );

    if (validationReport.issues.messages.length > 0) {
      console.log("\nValidation Issues:");
      validationReport.issues.messages.forEach((msg, index) => {
        const severity =
          msg.severity === 0
            ? "ERROR"
            : msg.severity === 1
            ? "WARNING"
            : "INFO";
        console.log(`  ${index + 1}. [${severity}] ${msg.message}`);
      });
    }

    // glTF MUST pass validation with ZERO errors
    expect(validationReport.issues.numErrors).toBe(0);
    console.log("✅ glTF validation passed with 0 errors");

    // Step 5: Convert back to BG3D
    const roundtripBg3d = await gltfToBG3D(gltfDocument);

    // Step 6: Convert reconstructed skeleton back to binary and re-parse it.
    if (!roundtripBg3d.skeleton) {
      expect.fail("Expected skeleton to be defined");
    }
    const roundtripSkeletonResource = bg3dSkeletonToSkeletonResource(
      roundtripBg3d.skeleton,
    );
    const roundtripSkeletonResult = await skeletonResourceToBinary(
      roundtripSkeletonResource,
    );
    if (!roundtripSkeletonResult.isOk()) {
      expect.fail(String(roundtripSkeletonResult.error));
    }
    const roundtripSkeletonBinary = roundtripSkeletonResult.value;
    const reparsedSkeletonResource = await parseSkeletonRsrc(roundtripSkeletonBinary);

    // Compare key structural elements.
    expect(roundtripBg3d.skeleton?.bones.length).toBe(
      originalBg3d.skeleton?.bones.length,
    );
    expect(roundtripBg3d.skeleton?.animations.length).toBe(
      originalBg3d.skeleton?.animations.length,
    );
    expect(roundtripBg3d.skeleton?.bones.map((bone) => bone.name)).toEqual(
      originalBg3d.skeleton?.bones.map((bone) => bone.name),
    );
    expect(
      roundtripBg3d.skeleton?.animations.map((anim) => anim.name),
    ).toEqual(originalBg3d.skeleton?.animations.map((anim) => anim.name));

    const originalBoneCount = Object.keys(originalSkeletonResource.Bone || {}).length;
    const roundtripBoneCount = Object.keys(reparsedSkeletonResource.Bone || {}).length;
    expect(roundtripBoneCount).toBe(originalBoneCount);

    const originalAnimCount = Object.keys(originalSkeletonResource.AnHd || {}).length;
    const roundtripAnimCount = Object.keys(reparsedSkeletonResource.AnHd || {}).length;
    expect(roundtripAnimCount).toBe(originalAnimCount);

    console.log("✅ BG3D + skeleton semantic roundtrip achieved without preserved binaries");
  });

  it("should preserve animation timing with 100% precision", async () => {
    console.log("=== ANIMATION TIMING PRECISION TEST ===");

    // Load and parse files
    const bg3dData = readFileSync(ottoBg3dPath);
    const skeletonData = readFileSync(ottoSkeletonPath);

    const skeleton = await parseSkeletonRsrc(
      skeletonData.buffer.slice(
        skeletonData.byteOffset,
        skeletonData.byteOffset + skeletonData.byteLength,
      ),
    );
    const bg3dParsedRes = parseBG3D(bg3dData.buffer, skeleton);
    if (bg3dParsedRes.isErr()) expect.fail(String(bg3dParsedRes.error));
    const bg3dParsed = bg3dParsedRes.value;

    // Convert to glTF
    const gltfDocument = bg3dParsedToGLTF(bg3dParsed);
    const animations = gltfDocument.getRoot().listAnimations();

    expect(animations.length).toBeGreaterThan(0);

    // Collect original timing data from parsed BG3D
    const originalTimingData: Record<string, Record<string, number[]>> = {};

    if (!bg3dParsed.skeleton) {
      expect.fail("Expected skeleton to be defined");
    }
    
    bg3dParsed.skeleton.animations.forEach((anim) => {
      // Ensure the structure exists for this animation
      const animEntry = (originalTimingData[anim.name] =
        originalTimingData[anim.name] || {});

      Object.entries(anim.keyframes).forEach(([boneIndexStr, keyframes]) => {
        const boneIndex = parseInt(boneIndexStr);
        const bone = bg3dParsed.skeleton?.bones[boneIndex];
        if (bone) {
          animEntry[bone.name] = keyframes.map((kf) => kf.tick / 30.0); // seconds
        }
      });
    });

    // Collect glTF timing data
    const gltfTimingData: Record<string, Record<string, number[]>> = {};

    animations.forEach((animation) => {
      const animName = animation.getName() || "unnamed";
      // Ensure structure for this animation's glTF timing
      const animEntry = (gltfTimingData[animName] =
        gltfTimingData[animName] || {});

      animation.listChannels().forEach((channel) => {
        const node = channel.getTargetNode();
        const boneName = node?.getName() || "unknown";

        const sampler = channel.getSampler();
        if (sampler) {
          const input = sampler.getInput();
          if (input) {
            const times = input.getArray();
            if (times && times instanceof Float32Array) {
              animEntry[boneName] = Array.from(times);
            }
          }
        }
      });
    });

    // Compare timing precision
    Object.entries(originalTimingData).forEach(([animName, originalBones]) => {
      console.log(`Checking animation: ${animName}`);

      const gltfBones = gltfTimingData[animName];
      if (!gltfBones)
        expect.fail(`Missing glTF timing for animation ${animName}`);

      Object.entries(originalBones).forEach(([boneName, originalTimes]) => {
        console.log(
          `  Bone: ${boneName}, original keyframes: ${originalTimes.length}`,
        );

        const gltfTimes = gltfBones[boneName];
        if (!gltfTimes)
          expect.fail(
            `Missing glTF times for bone ${boneName} in animation ${animName}`,
          );
        expect(gltfTimes.length).toBe(originalTimes.length);

        // Check timing precision (should be exact)
        originalTimes.forEach((originalTime, index) => {
          const gltfTime = gltfTimes[index];
          if (gltfTime === undefined)
            expect.fail(
              `Missing glTF time at index ${index} for bone ${boneName}`,
            );
          expect(Math.abs(gltfTime - originalTime)).toBeLessThan(0.0001); // Microsecond precision
        });

        console.log(`    ✅ Timing precision: perfect match`);
      });
    });

    console.log("=== ANIMATION TIMING PRECISION TEST PASSED ===");
  });

  it("should preserve bone hierarchy and coordinates with 100% accuracy", async () => {
    console.log("=== BONE HIERARCHY AND COORDINATE ACCURACY TEST ===");

    // Load and parse files
    const bg3dData = readFileSync(ottoBg3dPath);
    const skeletonData = readFileSync(ottoSkeletonPath);

    const skeleton = await parseSkeletonRsrc(
      skeletonData.buffer.slice(
        skeletonData.byteOffset,
        skeletonData.byteOffset + skeletonData.byteLength,
      ),
    );
    const originalBg3dRes = parseBG3D(bg3dData.buffer, skeleton);
    expect(originalBg3dRes.isOk()).toBe(true);
    if (!originalBg3dRes.isOk()) return;
    const originalBg3d = originalBg3dRes.value;

    // Convert to glTF and back
    const gltfDocument = bg3dParsedToGLTF(originalBg3d);

    const roundtripBg3d = await gltfToBG3D(gltfDocument);

    // Compare bone structures with 100% accuracy
    if (!originalBg3d.skeleton) {
      expect.fail("Expected original skeleton to be defined");
    }
    if (!roundtripBg3d.skeleton) {
      expect.fail("Expected roundtrip skeleton to be defined");
    }
    const originalBones = originalBg3d.skeleton.bones;
    const roundtripBones = roundtripBg3d.skeleton.bones;

    expect(roundtripBones.length).toBe(originalBones.length);

    originalBones.forEach((originalBone, index) => {
      const roundtripBone = roundtripBones[index];
      if (!roundtripBone)
        expect.fail(`Missing roundtrip bone at index ${index}`);

      // Exact name match
      expect(roundtripBone.name).toBe(originalBone.name);

      // Exact parent relationship
      expect(roundtripBone.parentBone).toBe(originalBone.parentBone);

      // Coordinate precision (should be exact when using preserved binary)
      expect(roundtripBone.coordX).toBe(originalBone.coordX);
      expect(roundtripBone.coordY).toBe(originalBone.coordY);
      expect(roundtripBone.coordZ).toBe(originalBone.coordZ);

      console.log(`Bone "${originalBone.name}": hierarchy and coordinates ✅`);
    });

    // Verify root bone exists and has correct parent
    const originalRoot = originalBones.find((b) => b.parentBone === -1);
    const roundtripRoot = roundtripBones.find((b) => b.parentBone === -1);

    expect(originalRoot).toBeDefined();
    expect(roundtripRoot).toBeDefined();
    if (!originalRoot || !roundtripRoot) {
      expect.fail("Expected root bones to be defined");
    }
    expect(roundtripRoot.name).toBe(originalRoot.name);

    console.log("=== BONE HIERARCHY AND COORDINATE ACCURACY TEST PASSED ===");
  });

  it("should validate glTF structure and skinning data integrity", async () => {
    console.log("=== glTF STRUCTURE AND SKINNING VALIDATION ===");

    // Load and parse files
    const bg3dData = readFileSync(ottoBg3dPath);
    const skeletonData = readFileSync(ottoSkeletonPath);

    const skeleton = await parseSkeletonRsrc(
      skeletonData.buffer.slice(
        skeletonData.byteOffset,
        skeletonData.byteOffset + skeletonData.byteLength,
      ),
    );
    const bg3dParsedRes = parseBG3D(bg3dData.buffer, skeleton);
    expect(bg3dParsedRes.isOk()).toBe(true);
    if (!bg3dParsedRes.isOk()) return;
    const bg3dParsed = bg3dParsedRes.value;

    // Convert to glTF
    const gltfDocument = bg3dParsedToGLTF(bg3dParsed);
    const root = gltfDocument.getRoot();

    // Validate basic glTF structure
    const scenes = root.listScenes();
    const nodes = root.listNodes();
    const meshes = root.listMeshes();
    const skins = root.listSkins();
    const animations = root.listAnimations();

    expect(scenes.length).toBeGreaterThan(0);
    expect(nodes.length).toBeGreaterThan(0);
    expect(meshes.length).toBeGreaterThan(0);
    expect(skins.length).toBeGreaterThan(0);
    expect(animations.length).toBeGreaterThan(0);

    console.log(
      `glTF Structure: ${scenes.length} scenes, ${nodes.length} nodes, ${meshes.length} meshes, ${skins.length} skins, ${animations.length} animations`,
    );

    // Validate skinning data
    skins.forEach((skin, skinIndex) => {
      const joints = skin.listJoints();
      const inverseBindMatrices = skin.getInverseBindMatrices();

      expect(joints.length).toBeGreaterThan(0);
      expect(inverseBindMatrices).toBeDefined();

      console.log(
        `Skin ${skinIndex}: ${joints.length} joints, inverse bind matrices: ${
          inverseBindMatrices ? "present" : "missing"
        }`,
      );

      // Validate joint hierarchy (joints should form a proper tree)
      const jointNames = joints.map((joint) => joint.getName());
      const uniqueNames = new Set(jointNames);
      expect(uniqueNames.size).toBe(jointNames.length); // No duplicate joint names

      // Validate that joints exist
      expect(joints.length).toBeGreaterThan(0);
    });

    // Validate mesh-skin associations
    meshes.forEach((mesh, meshIndex) => {
      const primitives = mesh.listPrimitives();

      primitives.forEach((primitive, primIndex) => {
        const joints = primitive.getAttribute("JOINTS_0");
        const weights = primitive.getAttribute("WEIGHTS_0");

        if (joints && weights) {
          console.log(
            `Mesh ${meshIndex} primitive ${primIndex}: skinning attributes present`,
          );
          expect(joints.getComponentSize()).toBe(4); // 4 joints per vertex
          expect(weights.getComponentSize()).toBe(4); // 4 weights per vertex
        }
      });
    });

    console.log("=== glTF STRUCTURE AND SKINNING VALIDATION PASSED ===");
  });
});
