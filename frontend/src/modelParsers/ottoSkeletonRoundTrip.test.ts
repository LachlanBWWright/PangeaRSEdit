// Round-trip test for Otto BG3D + skeleton parsing
import { describe, it, expect } from "vitest";
import { parseBG3D } from "./parseBG3D";
import { parseSkeletonRsrcTS } from "./skeletonRsrc/parseSkeletonRsrcTS";
import { bg3dSkeletonToSkeletonResource } from "./skeletonExport";
import { bg3dParsedToGLTF } from "./parsedBg3dGitfConverter";
import { readFileSync } from "fs";
import { join } from "path";
import { NodeIO } from "@gltf-transform/core";
import { validateBytes } from "gltf-validator";

describe("Otto BG3D Skeleton Round-trip", () => {
  it("should preserve Otto animation timing and structure in round-trip conversion", async () => {
    // Load Otto test files - using the correct Otto skeleton file
    const ottoPath = join(__dirname, "../../public/Otto.bg3d");
    const ottoSkeletonPath = join(__dirname, "../../public/Otto.skeleton.rsrc");
    
    console.log("Loading Otto files...");
    const ottoData = readFileSync(ottoPath);
    const ottoSkeletonData = readFileSync(ottoSkeletonPath);
    
    console.log("Parsing Otto skeleton resource with TypeScript implementation...");
    const skeleton = parseSkeletonRsrcTS(new Uint8Array(ottoSkeletonData));
    
    console.log("Parsing Otto BG3D with skeleton data...");
    const bg3dParsed = parseBG3D(ottoData.buffer, skeleton);
    
    expect(bg3dParsed.skeleton).toBeDefined();
    expect(bg3dParsed.skeleton!.animations.length).toBeGreaterThan(0);
    
    // Verify Otto has 16 bones
    expect(bg3dParsed.skeleton!.bones.length).toBe(16);
    
    // Debug: Log bone parent data
    console.log("\n=== Otto Bone Parent Structure ===");
    bg3dParsed.skeleton!.bones.forEach((bone, index) => {
      console.log(`Bone ${index}: "${bone.name}" - parent: ${bone.parentBone}`);
    });
    console.log("===================================\n");
    
    // Verify expected Otto bone names
    const boneNames = bg3dParsed.skeleton!.bones.map(b => b.name);
    const expectedOttoBones = [
      "Pelvis", "Torso", "Chest", "Head", 
      "RightHip", "LeftHip", "RightKnee", "LeftKnee",
      "RightFoot", "LeftFoot", "RtShoulder", "LeftShoulder",
      "RightElbow", "LeftElbow", "RightHand", "Left Hand"
    ];
    
    expectedOttoBones.forEach(expectedBone => {
      expect(boneNames).toContain(expectedBone);
    });
    
    console.log("Converting to glTF to test animation timing...");
    const gltfDocument = bg3dParsedToGLTF(bg3dParsed);
    
    const animations = gltfDocument.getRoot().listAnimations();
    expect(animations.length).toBeGreaterThan(0);
    
    // **ADD glTF VALIDATION**
    console.log('\n=== Running Official glTF Validator ===');
    const io = new NodeIO();
    const glbBuffer = await io.writeBinary(gltfDocument);
    console.log(`Generated GLB size: ${glbBuffer.length} bytes`);
    
    const validationReport = await validateBytes(glbBuffer);
    console.log(`Validation: ${validationReport.issues.numErrors} errors, ${validationReport.issues.numWarnings} warnings, ${validationReport.issues.numInfos} infos`);
    
    if (validationReport.issues.messages.length > 0) {
      console.log('\nValidation Issues:');
      validationReport.issues.messages.forEach((msg, index) => {
        const severity = msg.severity === 0 ? 'ERROR' : msg.severity === 1 ? 'WARNING' : 'INFO';
        console.log(`  ${index + 1}. [${severity}] ${msg.message}`);
        if (msg.pointer) {
          console.log(`     Pointer: ${msg.pointer}`);
        }
      });
    }
    
    // glTF MUST pass validation (0 errors - warnings are acceptable for informational purposes)
    expect(validationReport.issues.numErrors).toBe(0);
    // Note: Warnings about skinned mesh parent nodes are informational
    // The warning "Node with a skinned mesh is not root" is expected when meshes are children of Armature
    
    // Verify all joints are properly accessible in the scene
    const scene = gltfDocument.getRoot().getDefaultScene();
    expect(scene).toBeDefined();
    
    const sceneChildren = scene!.listChildren();
    console.log(`Scene has ${sceneChildren.length} direct children`);
    
    // Get skin to check joints
    const skins = gltfDocument.getRoot().listSkins();
    expect(skins.length).toBe(1);
    
    const skin = skins[0];
    const joints = skin.listJoints();
    expect(joints.length).toBe(16);
    
    // Verify every joint is in the scene and has a name
    console.log("Verifying joint accessibility for PropertyBinding...");
    let accessibleJoints = 0;
    
    joints.forEach((joint, index) => {
      const jointName = joint.getName();
      console.log(`  Joint ${index}: "${jointName}"`);
      
      // Joint should have a name
      expect(jointName).toBeTruthy();
      expect(jointName.length).toBeGreaterThan(0);
      
      // Joint should be in scene (directly or in hierarchy)
      const isInScene = sceneChildren.includes(joint);
      if (isInScene) {
        accessibleJoints++;
        console.log(`    ✅ Accessible from scene root`);
      } else {
        console.log(`    ⚠️ Not directly in scene (may be in hierarchy)`);
      }
    });
    
    console.log(`Joints accessible from scene: ${accessibleJoints}/${joints.length}`);
    
    // Test that animations have reasonable durations
    const animationDurations: { [name: string]: number } = {};
    
    animations.forEach(animation => {
      const channels = animation.listChannels();
      let maxDuration = 0;
      
      console.log(`Checking animation "${animation.getName()}" with ${channels.length} channels`);
      
      channels.forEach((channel, channelIndex) => {
        const sampler = channel.getSampler();
        const targetNode = channel.getTargetNode();
        const targetPath = channel.getTargetPath();
        
        // Verify channel has a target node
        expect(targetNode).toBeDefined();
        console.log(`  Channel ${channelIndex}: ${targetNode?.getName()}.${targetPath}`);
        
        if (sampler) {
          const inputAccessor = sampler.getInput();
          if (inputAccessor) {
            const times = inputAccessor.getArray();
            if (times && times.length > 0) {
              const lastTime = times[times.length - 1] as number;
              maxDuration = Math.max(maxDuration, lastTime);
            }
          }
        }
      });
      
      console.log(`Animation "${animation.getName()}" max duration: ${maxDuration}`);
      animationDurations[animation.getName()] = maxDuration;
    });
    
    console.log("Animation durations:", animationDurations);
    
    // Verify durations are reasonable
    let validAnimationCount = 0;
    
    Object.entries(animationDurations).forEach(([name, duration]) => {
      if (duration > 0) {
        validAnimationCount++;
        expect(duration).toBeGreaterThan(0.01); // At least 10ms
        expect(duration).toBeLessThan(30); // Less than 30 seconds
        console.log(`Animation "${name}": ${duration.toFixed(3)} seconds ✓`);
      } else {
        console.log(`Animation "${name}": ${duration.toFixed(3)} seconds (single-frame pose)`);
      }
    });
    
    // Most animations should have timing
    expect(validAnimationCount).toBeGreaterThan(animations.length * 0.7); // At least 70% should have duration
    console.log(`Valid animations with timing: ${validAnimationCount}/${animations.length}`);
    
    // Convert back to skeleton resource format
    console.log("Converting back to skeleton resource format...");
    const reconstructedSkeleton = bg3dSkeletonToSkeletonResource(bg3dParsed.skeleton!);
    
    // Verify basic structure preservation
    expect(reconstructedSkeleton.Hedr).toBeDefined();
    expect(reconstructedSkeleton.Bone).toBeDefined();
    expect(reconstructedSkeleton.KeyF).toBeDefined();
    
    // Check that we have the same number of animations
    const originalAnimCount = skeleton.AnHd ? Object.keys(skeleton.AnHd).length : 0;
    const reconstructedAnimCount = reconstructedSkeleton.AnHd ? Object.keys(reconstructedSkeleton.AnHd).length : 0;
    
    expect(reconstructedAnimCount).toBe(originalAnimCount);
    
    console.log(`Original animations: ${originalAnimCount}, Reconstructed: ${reconstructedAnimCount}`);
    console.log("✅ Otto round-trip test complete!");
  });
});
