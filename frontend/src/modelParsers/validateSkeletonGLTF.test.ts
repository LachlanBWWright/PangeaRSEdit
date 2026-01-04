// Comprehensive validation test for skeleton animations in glTF output
import { describe, it, expect } from "vitest";
import { parseBG3D } from "./parseBG3D";
import { parseSkeletonRsrc } from "./skeletonRsrc/parseSkeletonRsrcTS";
import { bg3dParsedToGLTF } from "./parsedBg3dGitfConverter";
import { readFileSync } from "fs";
import { join } from "path";
import { NodeIO, Node } from "@gltf-transform/core";
import { validateBytes } from "gltf-validator";

describe("Skeleton Animation glTF Validation", () => {
  it("should create valid glTF with properly structured skeleton animations", async () => {
    // Load Otto files
    const ottoPath = join(
      __dirname,
      "../../public/games/ottomatic/skeletons/Otto.bg3d",
    );
    const ottoSkeletonPath = join(
      __dirname,
      "../../public/games/ottomatic/skeletons/Otto.skeleton.rsrc",
    );

    console.log("=== Loading and Parsing Otto Files ===");
    const ottoData = readFileSync(ottoPath);
    const ottoSkeletonData = readFileSync(ottoSkeletonPath);

    const skeleton = await parseSkeletonRsrc(ottoSkeletonData as unknown as ArrayBuffer);
    const bg3dParseResult = parseBG3D(ottoData.buffer, skeleton);
    if (!bg3dParseResult.ok) {
      throw bg3dParseResult.error;
    }
    const bg3dParsed = bg3dParseResult.value;

    // Convert to glTF Document
    console.log("\n=== Converting to glTF ===");
    const gltfDoc = bg3dParsedToGLTF(bg3dParsed);

    // Export to GLB for validation
    const io = new NodeIO();
    const glbBuffer = await io.writeBinary(gltfDoc);
    console.log(`Generated GLB size: ${glbBuffer.length} bytes`);

    // Validate the GLB using official glTF validator
    console.log("\n=== Running Official glTF Validator ===");
    const validationReport = await validateBytes(glbBuffer);

    // Check validation results
    console.log(
      `Validation: ${validationReport.issues.numErrors} errors, ${validationReport.issues.numWarnings} warnings, ${validationReport.issues.numInfos} infos`,
    );

    // Log any issues
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
        if (msg.pointer) {
          console.log(`     Pointer: ${msg.pointer}`);
        }
      });
    }

    console.log("\n=== Analyzing glTF Structure ===");

    // Debug: Check the hierarchy
    const defaultScene = gltfDoc.getRoot().getDefaultScene();
    if (!defaultScene) {
      throw new Error("No default scene found in glTF document");
    }
    const rootChildren = defaultScene.listChildren();

    console.log("\n=== Scene Root Children ===");
    rootChildren.forEach((child, i) => {
      console.log(
        `${i}. ${child.getName()} (children: ${child.listChildren().length})`,
      );
      child.listChildren().forEach((grandchild, j) => {
        console.log(
          `   ${j}. ${grandchild.getName()} (children: ${
            grandchild.listChildren().length
          })`,
        );
        grandchild.listChildren().forEach((ggchild, k) => {
          console.log(
            `      ${k}. ${ggchild.getName()} (children: ${
              ggchild.listChildren().length
            })`,
          );
        });
      });
    });

    // Check skins
    console.log("\n=== Skins ===");
    const allSkins = gltfDoc.getRoot().listSkins();
    allSkins.forEach((skin, i) => {
      console.log(`Skin ${i}: ${skin.getName()}`);
      console.log(
        `  Skeleton root: ${skin.getSkeleton()?.getName() || "NONE"}`,
      );
      console.log(`  Joints (${skin.listJoints().length}):`);
      skin.listJoints().forEach((joint, j) => {
        const parent = joint.getParentNode();
        console.log(
          `    ${j}. ${joint.getName()} (parent: ${
            parent?.getName() || "NONE"
          })`,
        );
      });
    });

    // Validation should pass (no errors)
    expect(validationReport.issues.numErrors).toBe(0);

    console.log("\n=== Full Analysis ===");

    // Get the root
    const root = gltfDoc.getRoot();

    // Check scene
    const scene = root.getDefaultScene();
    expect(scene).toBeDefined();
    if (scene) {
      console.log(`Scene: "${scene.getName()}"`);
    }
    // Check skins
    const skins = root.listSkins();
    expect(skins.length).toBeGreaterThan(0);
    console.log(`\nSkins: ${skins.length}`);

    skins.forEach((skin, skinIndex) => {
      console.log(`  Skin ${skinIndex}: "${skin.getName()}"`);

      const joints = skin.listJoints();
      console.log(`    Joints: ${joints.length}`);

      // Verify all joints have names
      joints.forEach((joint, jointIndex) => {
        const jointName = joint.getName();
        expect(jointName).toBeTruthy();
        expect(jointName.length).toBeGreaterThan(0);
        console.log(`      Joint ${jointIndex}: "${jointName}"`);
      });

      // Check inverse bind matrices
      const ibm = skin.getInverseBindMatrices();
      expect(ibm).toBeDefined();
      console.log(`    Inverse Bind Matrices: ${ibm ? "present" : "missing"}`);

      // Check skeleton root
      const skeletonRoot = skin.getSkeleton();
      if (skeletonRoot) {
        console.log(`    Skeleton Root: "${skeletonRoot.getName()}"`);
      }
    });

    // Check animations
    const animations = root.listAnimations();
    expect(animations.length).toBeGreaterThan(0);
    console.log(`\nAnimations: ${animations.length}`);

    let totalChannels = 0;
    let channelsWithValidTargets = 0;

    animations.forEach((animation) => {
      const channels = animation.listChannels();

      channels.forEach((channel) => {
        totalChannels++;

        const targetNode = channel.getTargetNode();
        const sampler = channel.getSampler();

        if (targetNode && sampler) {
          channelsWithValidTargets++;
        }
      });

      // Log first 3 animations in detail
      if (animations.indexOf(animation) < 3) {
        console.log(
          `  Animation ${animations.indexOf(
            animation,
          )}: "${animation.getName()}"`,
        );
        console.log(`    Channels: ${channels.length}`);

        channels.forEach((channel, channelIndex) => {
          const targetNode = channel.getTargetNode();
          const targetPath = channel.getTargetPath();
          const sampler = channel.getSampler();

          if (channelIndex < 5) {
            // Log first 5 channels
            console.log(
              `      Channel ${channelIndex}: ${targetNode?.getName()}.${targetPath} (sampler: ${
                sampler ? "✓" : "✗"
              })`,
            );
          }
        });
      }
    });

    console.log(`\nTotal channels: ${totalChannels}`);
    console.log(`Channels with valid targets: ${channelsWithValidTargets}`);

    // All channels should have valid targets and samplers
    expect(channelsWithValidTargets).toBe(totalChannels);

    // Verify scene structure for PropertyBinding
    console.log("\n=== Verifying PropertyBinding Compatibility ===");

    const sceneChildren = scene!.listChildren();
    console.log(`Scene children: ${sceneChildren.length}`);

    // Check if all joints from skin are accessible from scene
    const skin = skins[0];
    const joints = (skin?.listJoints()) ?? [];

    let jointsAccessibleFromScene = 0;

    // Helper to check if node is in scene hierarchy
    type SceneOrNode = { listChildren: () => Node[] };
    function isNodeInHierarchy(node: Node, root: SceneOrNode): boolean {
      if (root === node) return true;

      const children = root.listChildren();
      for (const child of children) {
        if (isNodeInHierarchy(node, child)) {
          return true;
        }
      }

      return false;
    }

    joints.forEach((joint, index) => {
      const isAccessible = isNodeInHierarchy(joint, scene!);
      if (isAccessible) {
        jointsAccessibleFromScene++;
      }

      if (index < 5) {
        // Log first 5 joints
        console.log(
          `  Joint "${joint.getName()}": ${
            isAccessible ? "✓ accessible" : "✗ not accessible"
          }`,
        );
      }
    });

    console.log(
      `Joints accessible from scene: ${jointsAccessibleFromScene}/${joints.length}`,
    );

    // All joints should be accessible from scene for PropertyBinding
    expect(jointsAccessibleFromScene).toBe(joints.length);

    // Verify animation timing
    console.log("\n=== Verifying Animation Timing ===");

    let animationsWithTiming = 0;
    let singleFrameAnimations = 0;
    const animationDurations: number[] = [];

    animations.forEach((animation) => {
      const channels = animation.listChannels();
      let maxDuration = 0;

      channels.forEach((channel) => {
        const sampler = channel.getSampler();
        if (sampler) {
          const input = sampler.getInput();
          if (input) {
            const times = input.getArray();
            if (times && times.length > 0) {
              const lastTime = (times[times.length - 1] as number | undefined) ?? 0;
              maxDuration = Math.max(maxDuration, lastTime);
            }
          }
        }
      });

      animationDurations.push(maxDuration);

      if (maxDuration > 0) {
        animationsWithTiming++;
      } else {
        singleFrameAnimations++;
      }
    });

    console.log(`Animations with timing: ${animationsWithTiming}`);
    console.log(`Single-frame animations/poses: ${singleFrameAnimations}`);
    console.log(
      `Animation durations (first 10): ${animationDurations
        .slice(0, 10)
        .map((d) => d.toFixed(2))
        .join(", ")}`,
    );

    // Most animations should have timing
    expect(animationsWithTiming).toBeGreaterThan(animations.length * 0.7);

    // Verify animations DON'T all have the same duration (no placeholder 1.0 values)
    const uniqueDurations = new Set(animationDurations);
    console.log(`Unique duration values: ${uniqueDurations.size}`);
    expect(uniqueDurations.size).toBeGreaterThan(5); // At least 6 different durations

    // Verify no placeholder 1.0 durations (except for single-frame animations which are 0)
    const nonZeroDurations = animationDurations.filter((d) => d > 0);
    const hasPlaceholderOnes = nonZeroDurations.every(
      (d) => Math.abs(d - 1.0) < 0.01,
    );
    expect(hasPlaceholderOnes).toBe(false); // Should NOT all be 1.0

    console.log("\n=== ✅ All Validation Checks Passed ===");
    console.log("✓ glTF structure is valid");
    console.log("✓ All joints have names");
    console.log("✓ All animation channels have valid targets");
    console.log(
      "✓ All joints are accessible from scene (PropertyBinding compatible)",
    );
    console.log("✓ Animation timing is preserved");
  });
});
