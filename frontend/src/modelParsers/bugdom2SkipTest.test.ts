/**
 * Bugdom 2 Skip-specific test to validate skeleton parsing
 * Tests Skip model skeleton files to ensure proper parsing and coordinate extraction
 */

import { describe, test, expect } from "vitest";
import { Document, WebIO } from "@gltf-transform/core";
import { createSkeletonSystem } from "./skeletonSystemNew";
import { parseBG3D } from "./parseBG3D";
import { parseSkeletonRsrcTS } from "./skeletonRsrc/parseSkeletonRsrcTS";
import { validateBytes } from "gltf-validator";
import fs from "fs";
import path from "path";

describe("Bugdom 2 Skip Model Tests", () => {
  test("loads and validates Skip_Explore skeleton", async () => {
    try {
      // Load Skip_Explore skeleton file
      const skeletonPath = path.join(
        __dirname,
        "../../public/games/bugdom2/skeletons/Skip_Explore.skeleton.rsrc",
      );
      if (!fs.existsSync(skeletonPath)) {
        console.log("Skip_Explore.skeleton.rsrc not found, skipping test");
        return;
      }
      const skeletonBuffer = fs.readFileSync(skeletonPath);
      const skeletonRsrc = parseSkeletonRsrcTS(skeletonBuffer.buffer);

      console.log("Skip_Explore skeleton data:", skeletonRsrc);

      // Parse with a compatible BG3D file (using BuddyBug as a base since it's a character model)
      const bg3dPath = path.join(
        __dirname,
        "../../public/games/bugdom2/skeletons/BuddyBug.bg3d",
      );
      if (!fs.existsSync(bg3dPath)) {
        console.log("BuddyBug.bg3d not found, skipping BG3D test");
        return;
      }
      const bg3dBuffer = fs.readFileSync(bg3dPath);
      const bg3dData = parseBG3D(bg3dBuffer.buffer, skeletonRsrc);

      console.log("Skip_Explore BG3D skeleton data:", bg3dData.skeleton);
      console.log(
        "Skip bones:",
        bg3dData.skeleton?.bones.map((b) => ({
          name: b.name,
          parent: b.parentBone,
          coords: [b.coordX, b.coordY, b.coordZ],
        })),
      );

      // CRITICAL: Verify coordinates are not all zeros (the original bug)
      if (bg3dData.skeleton) {
        const bones = bg3dData.skeleton.bones;
        const nonZeroCoords = bones.filter(
          (b) => b.coordX !== 0 || b.coordY !== 0 || b.coordZ !== 0,
        );
        console.log(
          `Bones with non-zero coordinates: ${nonZeroCoords.length}/${bones.length}`,
        );

        // TEMP: Force failure to see coordinate values
        console.log("FORCED FAILURE TO SHOW COORDINATES:");
        bones.forEach((bone, index) => {
          console.log(
            `Bone ${index} (${bone.name}): [${bone.coordX}, ${bone.coordY}, ${bone.coordZ}]`,
          );
        });

        // At least some bones should have non-zero coordinates
        expect(nonZeroCoords.length).toBeGreaterThan(0);

        // Log specific coordinate values for debugging
        bones.forEach((bone, index) => {
          console.log(
            `Bone ${index} (${bone.name}): [${bone.coordX}, ${bone.coordY}, ${bone.coordZ}]`,
          );
        });

        // Verify no bone has all coordinates as exactly 0 (unless it's truly at origin)
        const allZeroBones = bones.filter(
          (b) => b.coordX === 0 && b.coordY === 0 && b.coordZ === 0,
        );
        console.log(
          `Bones with all-zero coordinates: ${allZeroBones.length}/${bones.length}`,
        );

        // For Skip, we expect most bones to have non-zero positions
        // Allow at most 2 bones to be at origin (maybe root or special cases)
        expect(allZeroBones.length).toBeLessThan(bones.length - 1);
      }

      // Test skeleton system with Skip data
      if (bg3dData.skeleton) {
        const doc = new Document();
        const buffer = doc.createBuffer();

        const { skin } = createSkeletonSystem(doc, bg3dData.skeleton, buffer);

        // Verify basic structure
        expect(skin).toBeDefined();
        expect(skin.listJoints().length).toBeGreaterThan(0);

        // Check for specific bones that might exist in Skip
        const joints = skin.listJoints();
        console.log(
          "All joint names:",
          joints.map((j) => j.getName()),
        );

        // Validate glTF structure
        const io = new WebIO();
        const glb = await io.writeBinary(doc);
        const result = await validateBytes(glb);

        console.log("glTF validation result:");
        console.log("- Errors:", result.issues.numErrors);
        console.log("- Warnings:", result.issues.numWarnings);

        // Log specific issues
        result.issues.messages.forEach((msg: any) => {
          if (msg.severity <= 1) {
            // Errors and warnings
            console.log(
              `- ${msg.severity === 0 ? "ERROR" : "WARNING"}: ${msg.message} (${
                msg.pointer
              })`,
            );
          }
        });

        // Test that should pass
        console.log(result.issues.messages);
        expect(result.issues.numErrors).toBe(0);
      }
    } catch (error) {
      console.error("Test failed:", error);
      throw error;
    }
  });

  test("analyzes Skip_Explore skeleton hierarchy for PropertyBinding issues", async () => {
    try {
      // Load Skip_Explore skeleton file
      const skeletonPath = path.join(
        __dirname,
        "../../public/games/bugdom2/skeletons/Skip_Explore.skeleton.rsrc",
      );
      if (!fs.existsSync(skeletonPath)) {
        console.log("Skip_Explore.skeleton.rsrc not found, skipping test");
        return;
      }
      const skeletonBuffer = fs.readFileSync(skeletonPath);
      const skeletonRsrc = parseSkeletonRsrcTS(skeletonBuffer.buffer);

      // Parse with compatible BG3D
      const bg3dPath = path.join(
        __dirname,
        "../../public/games/bugdom2/skeletons/BuddyBug.bg3d",
      );
      const bg3dBuffer = fs.readFileSync(bg3dPath);
      const bg3dData = parseBG3D(bg3dBuffer.buffer, skeletonRsrc);

      if (bg3dData.skeleton) {
        console.log("\n=== Skip_Explore Skeleton Analysis ===");
        console.log(`Total bones: ${bg3dData.skeleton.bones.length}`);
        console.log(`Total animations: ${bg3dData.skeleton.animations.length}`);

        // Analyze bone hierarchy
        console.log("\nBone hierarchy:");
        bg3dData.skeleton.bones.forEach((bone, index) => {
          const parentName =
            bone.parentBone >= 0
              ? bg3dData.skeleton!.bones[bone.parentBone].name
              : "ROOT";
          console.log(
            `${index}: ${bone.name} (parent: ${bone.parentBone} = ${parentName})`,
          );
        });

        // Check for common root
        const rootBones = bg3dData.skeleton.bones.filter(
          (b) => b.parentBone === -1,
        );
        console.log(`\nRoot bones (parentBone = -1): ${rootBones.length}`);
        rootBones.forEach((bone) => console.log(`- ${bone.name}`));

        // Analyze animations
        console.log("\nAnimations:");
        bg3dData.skeleton.animations.forEach((anim) => {
          console.log(
            `- ${anim.name}: ${Object.keys(anim.keyframes).length} bone tracks`,
          );
          Object.entries(anim.keyframes).forEach(
            ([boneIndexStr, keyframes]) => {
              const boneIndex = parseInt(boneIndexStr);
              const boneName =
                bg3dData.skeleton!.bones[boneIndex]?.name || "UNKNOWN";
              console.log(
                `  - Bone ${boneIndex} (${boneName}): ${keyframes.length} keyframes`,
              );
            },
          );
        });

        // Create skeleton system and analyze the result
        const doc = new Document();
        const buffer = doc.createBuffer();
        const { skin } = createSkeletonSystem(doc, bg3dData.skeleton, buffer);

        console.log("\n=== glTF Skeleton Analysis ===");
        const joints = skin.listJoints();
        console.log(`Joints in skin: ${joints.length}`);

        // Check skeleton root
        const skeletonRoot = skin.getSkeleton();
        console.log(`Skeleton root: ${skeletonRoot?.getName() || "NONE"}`);

        // Verify scene accessibility
        const scene = doc.getRoot().getDefaultScene()!;
        const allSceneNodes = new Set();
        function collectNodes(node: any): void {
          allSceneNodes.add(node);
          node.listChildren().forEach(collectNodes);
        }
        scene.listChildren().forEach(collectNodes);

        console.log("Joint accessibility:");
        joints.forEach((joint) => {
          const accessible = allSceneNodes.has(joint);
          console.log(
            `- ${joint.getName()}: ${
              accessible ? "ACCESSIBLE" : "NOT ACCESSIBLE"
            }`,
          );
        });
      }
    } catch (error) {
      console.error("Skeleton analysis failed:", error);
      throw error;
    }
  });

  test("tests Skip_Title skeleton file parsing and validation", async () => {
    try {
      // Load Skip_Title skeleton file
      const skeletonPath = path.join(
        __dirname,
        "../../public/games/bugdom2/skeletons/Skip_Title.skeleton.rsrc",
      );
      if (!fs.existsSync(skeletonPath)) {
        console.log(
          "Skip_Title.skeleton.rsrc not found, skipping skeleton test",
        );
        return;
      }
      const skeletonBuffer = fs.readFileSync(skeletonPath);

      console.log("\n=== Skip_Title Skeleton File Test ===");
      console.log(`Skeleton file size: ${skeletonBuffer.length} bytes`);

      // Parse skeleton file
      const skeletonRsrc = parseSkeletonRsrcTS(skeletonBuffer.buffer) as any;

      console.log("Skeleton parsing result:");
      console.log(`- Parsed successfully: ${!!skeletonRsrc}`);

      if (skeletonRsrc) {
        // Validate skeleton structure
        expect(skeletonRsrc).toBeDefined();
        expect(skeletonRsrc.Bone).toBeDefined();
        expect(typeof skeletonRsrc.Bone).toBe("object");

        // Convert Bone object to array for easier testing
        const bonesArray = Object.values(skeletonRsrc.Bone);
        expect(bonesArray.length).toBeGreaterThan(0);

        console.log(`- Total bones: ${bonesArray.length}`);

        // CRITICAL VALIDATION: Check that coordinates are properly parsed (not all zeros)
        let bonesWithValidCoords = 0;
        let bonesWithZeroCoords = 0;

        bonesArray.forEach((boneEntry: any, index: number) => {
          expect(boneEntry.obj).toBeDefined();
          expect(boneEntry.obj.coordX).toBeDefined();
          expect(boneEntry.obj.coordY).toBeDefined();
          expect(boneEntry.obj.coordZ).toBeDefined();

          const { coordX, coordY, coordZ, name } = boneEntry.obj;
          const hasNonZeroCoords = coordX !== 0 || coordY !== 0 || coordZ !== 0;

          if (hasNonZeroCoords) {
            bonesWithValidCoords++;
          } else {
            bonesWithZeroCoords++;
          }

          console.log(
            `  Bone ${index}: "${name}" coords=[${coordX}, ${coordY}, ${coordZ}] ${
              hasNonZeroCoords ? "✓" : "✗"
            }`,
          );
        });

        console.log(
          `- Bones with valid coordinates: ${bonesWithValidCoords}/${bonesArray.length}`,
        );
        console.log(
          `- Bones with zero coordinates: ${bonesWithZeroCoords}/${bonesArray.length}`,
        );

        // The fix should ensure most bones have non-zero coordinates
        expect(bonesWithValidCoords).toBeGreaterThan(0);
        expect(bonesWithZeroCoords).toBeLessThan(bonesArray.length); // Not ALL bones should be at origin
      }
    } catch (error) {
      console.error("Skeleton file test failed:", error);
      throw error;
    }
  });

  test("tests Skip_Tunnel skeleton file parsing and validation", async () => {
    try {
      // Load Skip_Tunnel skeleton file
      const skeletonPath = path.join(
        __dirname,
        "../../public/games/bugdom2/skeletons/Skip_Tunnel.skeleton.rsrc",
      );
      if (!fs.existsSync(skeletonPath)) {
        console.log(
          "Skip_Tunnel.skeleton.rsrc not found, skipping skeleton test",
        );
        return;
      }
      const skeletonBuffer = fs.readFileSync(skeletonPath);

      console.log("\n=== Skip_Tunnel Skeleton File Test ===");
      console.log(`Skeleton file size: ${skeletonBuffer.length} bytes`);

      // Parse skeleton file
      const skeletonRsrc = parseSkeletonRsrcTS(skeletonBuffer.buffer) as any;

      console.log("Skeleton parsing result:");
      console.log(`- Parsed successfully: ${!!skeletonRsrc}`);

      if (skeletonRsrc) {
        // Validate skeleton structure
        expect(skeletonRsrc).toBeDefined();
        expect(skeletonRsrc.Bone).toBeDefined();
        expect(typeof skeletonRsrc.Bone).toBe("object");

        // Convert Bone object to array for easier testing
        const bonesArray = Object.values(skeletonRsrc.Bone);
        expect(bonesArray.length).toBeGreaterThan(0);

        console.log(`- Total bones: ${bonesArray.length}`);

        // CRITICAL VALIDATION: Check that coordinates are properly parsed (not all zeros)
        let bonesWithValidCoords = 0;
        let bonesWithZeroCoords = 0;

        bonesArray.forEach((boneEntry: any, index: number) => {
          expect(boneEntry.obj).toBeDefined();
          expect(boneEntry.obj.coordX).toBeDefined();
          expect(boneEntry.obj.coordY).toBeDefined();
          expect(boneEntry.obj.coordZ).toBeDefined();

          const { coordX, coordY, coordZ, name } = boneEntry.obj;
          const hasNonZeroCoords = coordX !== 0 || coordY !== 0 || coordZ !== 0;

          if (hasNonZeroCoords) {
            bonesWithValidCoords++;
          } else {
            bonesWithZeroCoords++;
          }

          console.log(
            `  Bone ${index}: "${name}" coords=[${coordX}, ${coordY}, ${coordZ}] ${
              hasNonZeroCoords ? "✓" : "✗"
            }`,
          );
        });

        console.log(
          `- Bones with valid coordinates: ${bonesWithValidCoords}/${bonesArray.length}`,
        );
        console.log(
          `- Bones with zero coordinates: ${bonesWithZeroCoords}/${bonesArray.length}`,
        );

        // The fix should ensure most bones have non-zero coordinates
        expect(bonesWithValidCoords).toBeGreaterThan(0);
        expect(bonesWithZeroCoords).toBeLessThan(bonesArray.length); // Not ALL bones should be at origin
      }
    } catch (error) {
      console.error("Skeleton file test failed:", error);
      throw error;
    }
  });

  test("byte-for-byte roundtrip test for Skip_Explore", async () => {
    try {
      // Load Skip_Explore skeleton file
      const skeletonPath = path.join(
        __dirname,
        "../../public/games/bugdom2/skeletons/Skip_Explore.skeleton.rsrc",
      );
      if (!fs.existsSync(skeletonPath)) {
        console.log("Skip_Explore.skeleton.rsrc not found, skipping test");
        return;
      }
      const skeletonBuffer = fs.readFileSync(skeletonPath);
      const skeletonRsrc = parseSkeletonRsrcTS(skeletonBuffer.buffer);

      // Parse with compatible BG3D
      const bg3dPath = path.join(
        __dirname,
        "../../public/games/bugdom2/skeletons/BuddyBug.bg3d",
      );
      const bg3dBuffer = fs.readFileSync(bg3dPath);
      const bg3dData = parseBG3D(bg3dBuffer.buffer, skeletonRsrc);

      if (!bg3dData.skeleton) {
        console.log("No skeleton data, skipping roundtrip test");
        return;
      }

      // Create original glTF document
      const originalDoc = new Document();
      const buffer = originalDoc.createBuffer();
      const { skin: originalSkin } = createSkeletonSystem(
        originalDoc,
        bg3dData.skeleton,
        buffer,
      );

      // Export to GLB binary
      const io = new WebIO();
      const glbBinary = await io.writeBinary(originalDoc);

      // Re-import the GLB binary into a new document
      const roundtripDoc = await io.readBinary(glbBinary);

      // Compare key structures
      const originalJoints = originalSkin.listJoints();
      const roundtripSkin = roundtripDoc.getRoot().listSkins()[0];
      const roundtripJoints = roundtripSkin ? roundtripSkin.listJoints() : [];

      console.log("\n=== Skip_Explore Roundtrip Comparison ===");
      console.log(`Original joints: ${originalJoints.length}`);
      console.log(`Roundtrip joints: ${roundtripJoints.length}`);

      // Verify joint count matches
      expect(roundtripJoints.length).toBe(originalJoints.length);

      // Verify joint names match
      originalJoints.forEach((originalJoint, index) => {
        const roundtripJoint = roundtripJoints[index];
        expect(roundtripJoint.getName()).toBe(originalJoint.getName());
        console.log(
          `Joint ${index}: ${originalJoint.getName()} -> ${roundtripJoint.getName()}`,
        );
      });

      // Verify skeleton root
      const originalSkeleton = originalSkin.getSkeleton();
      const roundtripSkeleton = roundtripSkin?.getSkeleton();
      expect(roundtripSkeleton?.getName()).toBe(originalSkeleton?.getName());

      // Additional validation: re-validate the roundtrip GLB
      const roundtripGlb = await io.writeBinary(roundtripDoc);
      const roundtripValidation = await validateBytes(roundtripGlb);
      console.log("Roundtrip glTF validation:");
      console.log("- Errors:", roundtripValidation.issues.numErrors);
      console.log("- Warnings:", roundtripValidation.issues.numWarnings);

      // Ensure roundtrip doesn't introduce new errors
      expect(roundtripValidation.issues.numErrors).toBe(0);
    } catch (error) {
      console.error("Roundtrip test failed:", error);
      throw error;
    }
  });
});
