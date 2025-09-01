// Analyze GLB structure using gltf-transform to understand PropertyBinding issues
import { describe, it, expect } from 'vitest';
import { NodeIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS } from '@gltf-transform/extensions';
import * as fs from 'fs';

describe('GLB Structure Analysis with gltf-transform', () => {
  it('should analyze Otto GLB structure to understand PropertyBinding target naming', async () => {
    console.log('=== GLB Structure Analysis with gltf-transform ===');
    
    // Use the GLB file we downloaded from Playwright test
    const glbPath = '/home/runner/work/PangeaRSEdit/PangeaRSEdit/frontend/screenshots/model.glb';
    
    if (!fs.existsSync(glbPath)) {
      throw new Error(`GLB file not found at ${glbPath}. Run the Playwright test first.`);
    }
    
    const glbBuffer = fs.readFileSync(glbPath);
    console.log(`GLB size: ${glbBuffer.length} bytes`);
    
    // Parse with gltf-transform
    const io = new NodeIO();
    io.registerExtensions(KHRONOS_EXTENSIONS);
    
    const document = await io.readBinary(glbBuffer);
    
    console.log('\n=== Document Structure ===');
    const root = document.getRoot();
    const scenes = root.listScenes();
    const animations = root.listAnimations();
    const skins = root.listSkins();
    
    console.log(`Scenes: ${scenes.length}`);
    console.log(`Animations: ${animations.length}`);
    console.log(`Skins: ${skins.length}`);
    
    // Analyze scene hierarchy
    console.log('\n=== Scene Hierarchy ===');
    scenes.forEach((scene, sceneIndex) => {
      console.log(`Scene ${sceneIndex}: "${scene.getName()}"`);
      
      function traverseNode(node: any, depth = 0) {
        const indent = '  '.repeat(depth + 1);
        const name = node.getName() || '(unnamed)';
        console.log(`${indent}${name}`);
        
        // Check if this looks like a joint
        if (['Pelvis', 'Torso', 'Head', 'RightHip', 'LeftHip', 'RightKnee', 'LeftKnee'].includes(name)) {
          console.log(`${indent}  ⭐ JOINT DETECTED: "${name}"`);
        }
        
        const children = node.listChildren();
        children.forEach((child: any) => traverseNode(child, depth + 1));
      }
      
      const sceneChildren = scene.listChildren();
      console.log(`  Children: ${sceneChildren.length}`);
      
      sceneChildren.forEach(child => traverseNode(child, 1));
    });
    
    // Analyze skins and joints
    console.log('\n=== Skins and Joints ===');
    skins.forEach((skin, skinIndex) => {
      console.log(`Skin ${skinIndex}: "${skin.getName()}"`);
      
      const joints = skin.listJoints();
      console.log(`  Joints: ${joints.length}`);
      
      joints.forEach((joint, jointIndex) => {
        console.log(`    Joint ${jointIndex}: "${joint.getName()}"`);
      });
      
      const skeleton = skin.getSkeleton();
      if (skeleton) {
        console.log(`  Skeleton root: "${skeleton.getName()}"`);
      }
    });
    
    // Analyze animations - focus on Pickup2
    console.log('\n=== Animation Analysis ===');
    const pickup2Animation = animations.find(anim => anim.getName()?.includes('Pickup2')) || animations[6];
    
    if (pickup2Animation) {
      console.log(`\n--- Pickup2 Animation Analysis ---`);
      console.log(`Name: "${pickup2Animation.getName()}"`);
      
      const channels = pickup2Animation.listChannels();
      console.log(`Channels: ${channels.length}`);
      
      channels.forEach((channel, channelIndex) => {
        const targetNode = channel.getTargetNode();
        const targetPath = channel.getTargetPath();
        
        console.log(`  Channel ${channelIndex}:`);
        console.log(`    Target Node: "${targetNode?.getName() || '(no name)'}"`);
        console.log(`    Target Path: "${targetPath}"`);
        console.log(`    Track Name (as Three.js sees it): "${targetNode?.getName()}.${targetPath}"`);
        
        // This is the key insight - Three.js will look for nodes with these exact names
        if (targetNode) {
          const nodeName = targetNode.getName();
          if (nodeName) {
            console.log(`    ⚠️  Three.js PropertyBinding will look for node "${nodeName}" in scene`);
            
            // Check if this node is accessible from scene root
            let nodeAccessible = false;
            scenes.forEach(scene => {
              scene.listChildren().forEach(child => {
                if (checkNodeAccessibility(child, nodeName)) {
                  nodeAccessible = true;
                }
              });
            });
            
            if (!nodeAccessible) {
              console.log(`    ❌ WARNING: Node "${nodeName}" may not be accessible from scene root!`);
            } else {
              console.log(`    ✅ Node "${nodeName}" should be accessible`);
            }
          }
        }
      });
    }
    
    // Check for potential issues
    console.log('\n=== Potential PropertyBinding Issues ===');
    
    // Issue 1: Are all animation target nodes in the scene?
    const allTargetNodes = new Set<string>();
    animations.forEach(animation => {
      const channels = animation.listChannels();
      channels.forEach(channel => {
        const targetNode = channel.getTargetNode();
        if (targetNode && targetNode.getName()) {
          allTargetNodes.add(targetNode.getName());
        }
      });
    });
    
    console.log(`Animation targets ${allTargetNodes.size} unique nodes: [${Array.from(allTargetNodes).join(', ')}]`);
    
    // Issue 2: Are all these nodes accessible from scene root?
    const sceneNodes = new Set<string>();
    scenes.forEach(scene => {
      collectAllNodeNames(scene, sceneNodes);
    });
    
    console.log(`Scene contains ${sceneNodes.size} named nodes: [${Array.from(sceneNodes).join(', ')}]`);
    
    // Find missing nodes
    const missingNodes = Array.from(allTargetNodes).filter(nodeName => !sceneNodes.has(nodeName));
    if (missingNodes.length > 0) {
      console.log(`❌ FOUND ISSUE: ${missingNodes.length} animation target nodes are missing from scene:`);
      missingNodes.forEach(nodeName => {
        console.log(`  - "${nodeName}" (This will cause PropertyBinding "No target node found" errors)`);
      });
    } else {
      console.log(`✅ All animation target nodes are present in scene`);
    }
    
    console.log('\n=== Analysis Complete ===');
  });
});

function checkNodeAccessibility(node: any, targetName: string): boolean {
  if (node.getName() === targetName) {
    return true;
  }
  
  const children = node.listChildren();
  for (const child of children) {
    if (checkNodeAccessibility(child, targetName)) {
      return true;
    }
  }
  
  return false;
}

function collectAllNodeNames(node: any, nodeNames: Set<string>) {
  const name = node.getName();
  if (name) {
    nodeNames.add(name);
  }
  
  const children = node.listChildren();
  children.forEach((child: any) => collectAllNodeNames(child, nodeNames));
}