/**
 * Debug script to examine Otto skeleton structure and identify PropertyBinding errors
 */

import { parseBG3D } from '../modelParsers/parseBG3D';
import { parseSkeletonRsrcTS } from '../modelParsers/skeletonRsrc/parseSkeletonRsrcTS';
import { parseBG3DWithSkeletonResource } from '../modelParsers/bg3dWithSkeleton';
import { bg3dParsedToGLTF } from '../modelParsers/parsedBg3dGitfConverter';
import { WebIO } from '@gltf-transform/core';
import fs from 'fs';
import path from 'path';

async function debugOttoSkeleton() {
  console.log("=== DEBUG OTTO SKELETON STRUCTURE ===");
  
  // Load Otto files
  const bg3dPath = path.join(__dirname, '../public/Otto.bg3d');
  const skeletonPath = path.join(__dirname, '../public/Otto.skeleton.rsrc');
  
  if (!fs.existsSync(bg3dPath) || !fs.existsSync(skeletonPath)) {
    console.log("Otto files not found, skipping debug");
    return;
  }
  
  const bg3dBuffer = fs.readFileSync(bg3dPath);
  const skeletonBuffer = fs.readFileSync(skeletonPath);
  
  // Parse skeleton data
  const skeleton = parseSkeletonRsrcTS(skeletonBuffer.buffer);
  console.log(`\n📊 Skeleton Data:`);
  console.log(`- Bones: ${skeleton.bones.length}`);
  console.log(`- Animations: ${skeleton.animations.length}`);
  
  // Show bone names and structure
  console.log(`\n🦴 Bone Names:`);
  skeleton.bones.forEach((bone, index) => {
    console.log(`${index}: "${bone.name}" (parent: ${bone.parentBone})`);
  });
  
  // Parse BG3D with skeleton
  const result = parseBG3DWithSkeletonResource(bg3dBuffer.buffer, skeleton);
  
  // Convert to glTF
  console.log(`\n🔄 Converting to glTF...`);
  const gltfDoc = bg3dParsedToGLTF(result);
  
  // Examine glTF structure
  console.log(`\n📋 glTF Document Structure:`);
  const scenes = gltfDoc.getRoot().listScenes();
  console.log(`- Scenes: ${scenes.length}`);
  
  scenes.forEach((scene, sceneIndex) => {
    console.log(`\nScene ${sceneIndex}: "${scene.getName()}"`);
    const children = scene.listChildren();
    console.log(`  Direct children: ${children.length}`);
    
    children.forEach((child, childIndex) => {
      console.log(`    ${childIndex}: "${child.getName()}" (${child.constructor.name})`);
    });
  });
  
  // Examine all nodes
  const allNodes = gltfDoc.getRoot().listNodes();
  console.log(`\n🔗 All Nodes in Document: ${allNodes.length}`);
  allNodes.forEach((node, index) => {
    const name = node.getName() || `unnamed_${index}`;
    const children = node.listChildren();
    const parent = node.getParent();
    console.log(`  ${index}: "${name}" (children: ${children.length}, parent: ${parent ? parent.constructor.name : 'none'})`);
  });
  
  // Examine skins
  const skins = gltfDoc.getRoot().listSkins();
  console.log(`\n👤 Skins: ${skins.length}`);
  skins.forEach((skin, index) => {
    const joints = skin.listJoints();
    console.log(`  Skin ${index}: "${skin.getName()}" with ${joints.length} joints`);
    
    joints.forEach((joint, jointIndex) => {
      console.log(`    Joint ${jointIndex}: "${joint.getName()}"`);
    });
  });
  
  // Examine animations
  const animations = gltfDoc.getRoot().listAnimations();
  console.log(`\n🎬 Animations: ${animations.length}`);
  animations.forEach((anim, index) => {
    const channels = anim.listChannels();
    console.log(`  Animation ${index}: "${anim.getName()}" with ${channels.length} channels`);
    
    channels.slice(0, 5).forEach((channel, channelIndex) => { // Show first 5 channels
      const targetNode = channel.getTargetNode();
      const targetPath = channel.getTargetPath();
      const nodeName = targetNode ? targetNode.getName() : 'NO_TARGET_NODE';
      console.log(`    Channel ${channelIndex}: ${nodeName}.${targetPath}`);
    });
    
    if (channels.length > 5) {
      console.log(`    ... and ${channels.length - 5} more channels`);
    }
  });
  
  // Export GLB and examine its size
  const io = new WebIO();
  const glbBuffer = await io.writeBinary(gltfDoc);
  console.log(`\n💾 GLB File Size: ${glbBuffer.byteLength} bytes`);
  
  // Write debug GLB file for external inspection
  const debugPath = '/tmp/otto-debug.glb';
  fs.writeFileSync(debugPath, new Uint8Array(glbBuffer));
  console.log(`\n📁 Debug GLB written to: ${debugPath}`);
  
  console.log("\n=== DEBUG COMPLETE ===");
}

// Run the debug if this file is executed directly
if (require.main === module) {
  debugOttoSkeleton().catch(console.error);
}

export { debugOttoSkeleton };