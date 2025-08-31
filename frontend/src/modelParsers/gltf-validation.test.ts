import { test, expect } from "vitest";
import { validateBytes, ValidationMessage } from "gltf-validator";
import fs from "fs";
import path from "path";
import { NodeIO, WebIO } from "@gltf-transform/core";
import { parseSkeletonRsrcTS } from "./skeletonRsrc/parseSkeletonRsrcTS";
import { parseBG3DWithSkeletonResource } from "./bg3dWithSkeleton";
import { bg3dParsedToGLTF } from "./parsedBg3dGitfConverter";

test("GLB validation for Otto skeleton", async () => {
  console.log("\n=== Testing Otto skeleton GLB generation and validation ===");

  // Load the Otto files
  const bg3dPath = path.join(__dirname, "../../public/Otto.bg3d");
  const skeletonPath = path.join(__dirname, "../../public/Otto.skeleton.rsrc");

  console.log(`Loading BG3D: ${bg3dPath}`);
  console.log(`Loading skeleton: ${skeletonPath}`);

  const bg3dBuffer = fs.readFileSync(bg3dPath);
  const skeletonBuffer = fs.readFileSync(skeletonPath);

  console.log(`BG3D size: ${bg3dBuffer.length} bytes`);
  console.log(`Skeleton size: ${skeletonBuffer.length} bytes`);

  // Convert to GLB
  console.log("\nConverting to GLB...");

  // Parse skeleton using TypeScript parser
  // parseSkeletonRsrcTS expects an ArrayBuffer
  const skeletonData = parseSkeletonRsrcTS(
    new Uint8Array(skeletonBuffer).buffer,
  );
  console.log("Parsed skeleton data structure:", Object.keys(skeletonData));
  console.log(
    "Skeleton bones available (Bone):",
    Object.keys(skeletonData.Bone || {}).length,
  );
  console.log(
    "Skeleton animation headers (AnHd):",
    Object.keys(skeletonData.AnHd || {}).length,
  );

  // The parseSkeletonRsrcTS returns a SkeletonResource; pass it directly
  const parsed = parseBG3DWithSkeletonResource(
    new Uint8Array(bg3dBuffer).buffer,
    skeletonData,
  );
  console.log(
    `Parsed BG3D with skeleton: ${
      parsed.skeleton
        ? `${parsed.skeleton.bones?.length || 0} bones`
        : "no skeleton"
    }`,
  );

  // Convert to glTF document
  const doc = bg3dParsedToGLTF(parsed);

  // Convert to GLB
  const io = new WebIO();
  const glbBuffer = await io.writeBinary(doc);

  console.log(`Generated GLB size: ${glbBuffer.length} bytes`);

  // Save GLB for debugging
  const outputPath = "/tmp/otto-skeleton-test.glb";
  fs.writeFileSync(outputPath, glbBuffer);
  console.log(`Saved GLB to: ${outputPath}`);

  // Validate with gltf-validator
  console.log("\nValidating GLB with gltf-validator...");

  try {
    const result = await validateBytes(glbBuffer);

    console.log("\n--- Validation Report ---");
    console.log(
      `Issues: ${result.issues.numErrors} errors, ${result.issues.numWarnings} warnings, ${result.issues.numInfos} infos, ${result.issues.numHints} hints`,
    );

    if (result.issues.messages.length > 0) {
      console.log("\nDetailed Messages:");
      result.issues.messages.forEach(
        (msg: ValidationMessage, index: number) => {
          const severityNames = ["", "Error", "Warning", "Info", "Hint"];
          const severity = severityNames[msg.severity] || "Unknown";
          console.log(
            `${index + 1}. [${severity}] ${msg.code}: ${msg.message}`,
          );
          if (msg.pointer) {
            console.log(`   Pointer: ${msg.pointer}`);
          }
          if (msg.offset !== undefined) {
            console.log(`   Offset: ${msg.offset}`);
          }
        },
      );
    }

    // Also inspect the GLB structure using gltf-transform
    console.log("\n--- GLB Structure Analysis ---");
    const nodeIo = new NodeIO();
    const doc = await nodeIo.readBinary(glbBuffer);

    const scenes = doc.getRoot().listScenes();
    console.log(`Scenes: ${scenes.length}`);

    scenes.forEach((scene, i) => {
      console.log(
        `Scene ${i}: "${scene.getName()}" with ${
          scene.listChildren().length
        } root nodes`,
      );
      const allNodes = [];
      scene.traverse((node) => allNodes.push(node));
      console.log(`  Total nodes in scene: ${allNodes.length}`);
    });

    const skins = doc.getRoot().listSkins();
    console.log(`Skins: ${skins.length}`);
    skins.forEach((skin, i) => {
      const joints = skin.listJoints();
      console.log(
        `Skin ${i}: "${skin.getName()}" with ${joints.length} joints`,
      );
      joints.forEach((joint, j) => {
        console.log(`  Joint ${j}: "${joint.getName()}"`);
      });
    });

    const animations = doc.getRoot().listAnimations();
    console.log(`Animations: ${animations.length}`);
    animations.forEach((anim, i) => {
      const channels = anim.listChannels();
      console.log(
        `Animation ${i}: "${anim.getName()}" with ${channels.length} channels`,
      );
    });

    console.log("\n--- Validation Summary ---");
    if (result.issues.numErrors === 0) {
      console.log("✅ Valid glTF file (no errors)");
      if (result.issues.numWarnings > 0) {
        console.log(`⚠️  ${result.issues.numWarnings} warnings found`);
      }
    } else {
      console.log(`❌ Invalid glTF file (${result.issues.numErrors} errors)`);

      // Extract specific errors for debugging
      const errors = result.issues.messages.filter((msg) => msg.severity === 1);
      const nodeSkinErrors = errors.filter(
        (msg) => msg.code === "NODE_SKIN_NO_SCENE",
      );

      if (nodeSkinErrors.length > 0) {
        console.log("\n--- NODE_SKIN_NO_SCENE Errors Analysis ---");
        nodeSkinErrors.forEach((error: ValidationMessage) => {
          console.log(`Error: ${error.message}`);
          console.log(`Pointer: ${error.pointer}`);

          // Try to extract node index from pointer
          const match = error.pointer?.match(/\/nodes\/(\d+)/);
          if (match) {
            const nodeIndex = parseInt(match[1]);
            const nodes = doc.getRoot().listNodes();
            if (nodeIndex < nodes.length) {
              const node = nodes[nodeIndex];
              console.log(`  Node ${nodeIndex}: "${node.getName()}"`);
              console.log(`  Has mesh: ${node.getMesh() ? "yes" : "no"}`);
              console.log(`  Has skin: ${node.getSkin() ? "yes" : "no"}`);
              // gltf-transform Node does not have getParent typed here; skip parent

              // Check if this node is in any scene
              let inScene = false;
              scenes.forEach((scene) => {
                scene.traverse((n) => {
                  if (n === node) inScene = true;
                });
              });
              console.log(`  In scene: ${inScene}`);
            }
          }
        });
      }
    }

    console.log(result.issues);
    console.log(result.issues.messages);
    // The test should fail if there are validation errors
    expect(result.issues.numErrors).toBe(0);
    expect(result.issues.numWarnings).toBe(0);
    expect(result.issues.numInfos).toBe(0);
  } catch (error) {
    console.error("Validation failed:", error);
    throw error;
  }
});
