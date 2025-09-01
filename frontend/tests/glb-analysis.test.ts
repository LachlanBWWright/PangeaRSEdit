// Simple test to examine the generated GLB structure using Three.js
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three-stdlib';

describe('GLB Structure Analysis', () => {
  it('should analyze the downloaded GLB file with Three.js to understand PropertyBinding issues', async () => {
    console.log('=== GLB Structure Analysis with Three.js ===');
    
    // Use the GLB file we downloaded earlier from Playwright test
    const glbPath = '/home/runner/work/PangeaRSEdit/PangeaRSEdit/frontend/screenshots/model.glb';
    
    if (!fs.existsSync(glbPath)) {
      throw new Error(`GLB file not found at ${glbPath}. Run the Playwright test first.`);
    }
    
    const glbBuffer = fs.readFileSync(glbPath);
    console.log(`GLB size: ${glbBuffer.length} bytes`);
    
    // Save to temp location for Three.js to load
    const tempGlbPath = '/tmp/otto-test.glb';
    fs.writeFileSync(tempGlbPath, glbBuffer);
    
    // Load with Three.js GLTFLoader
    const loader = new GLTFLoader();
    
    return new Promise((resolve, reject) => {
      loader.load(
        `file://${tempGlbPath}`,
        (gltf) => {
          console.log('\n=== Three.js GLTF Analysis ===');
          console.log(`Scene children: ${gltf.scene.children.length}`);
          console.log(`Animations: ${gltf.animations.length}`);
          
          // Examine the scene hierarchy
          console.log('\n=== Scene Hierarchy ===');
          
          function traverseScene(node: THREE.Object3D, depth = 0) {
            const indent = '  '.repeat(depth);
            const nodeInfo = `${node.name || '(unnamed)'} (${node.type})`;
            console.log(`${indent}${nodeInfo}`);
            
            // Special attention to joints/bones
            if (node.type === 'Bone' || (node.name && ['Pelvis', 'Torso', 'Head', 'RightHip', 'LeftHip'].includes(node.name))) {
              console.log(`${indent}  ⭐ JOINT: "${node.name}" - This should be findable by PropertyBinding`);
            }
            
            node.children.forEach(child => traverseScene(child, depth + 1));
          }
          
          traverseScene(gltf.scene);
          
          // Examine animations in detail
          console.log('\n=== Animation Analysis ===');
          
          if (gltf.animations.length > 0) {
            // Focus on Pickup2 animation (should be animation 6 based on earlier tests)
            const pickup2Animation = gltf.animations.find(anim => anim.name.includes('Pickup2')) || gltf.animations[6];
            
            if (pickup2Animation) {
              console.log(`\n--- Pickup2 Animation Analysis ---`);
              console.log(`Name: "${pickup2Animation.name}"`);
              console.log(`Duration: ${pickup2Animation.duration.toFixed(3)}s`);
              console.log(`Tracks: ${pickup2Animation.tracks.length}`);
              
              // Examine all tracks
              pickup2Animation.tracks.forEach((track, trackIndex) => {
                console.log(`  Track ${trackIndex}: "${track.name}" (${track.times.length} keyframes)`);
                
                // Parse track name
                const trackParts = track.name.split('.');
                if (trackParts.length >= 2) {
                  const nodeName = trackParts[0];
                  const propertyPath = trackParts.slice(1).join('.');
                  console.log(`    -> Target Node: "${nodeName}", Property: "${propertyPath}"`);
                  
                  // Check if this node exists in the scene
                  let nodeExists = false;
                  gltf.scene.traverse((obj) => {
                    if (obj.name === nodeName) {
                      nodeExists = true;
                    }
                  });
                  
                  if (!nodeExists) {
                    console.log(`    ❌ WARNING: Node "${nodeName}" NOT FOUND in scene! This will cause PropertyBinding errors.`);
                  } else {
                    console.log(`    ✅ Node "${nodeName}" found in scene`);
                  }
                }
              });
            }
          }
          
          // Test PropertyBinding manually
          console.log('\n=== PropertyBinding Test ===');
          
          if (gltf.animations.length > 0) {
            const mixer = new THREE.AnimationMixer(gltf.scene);
            
            // Test with Pickup2 animation specifically
            const pickup2Animation = gltf.animations.find(anim => anim.name.includes('Pickup2')) || gltf.animations[6];
            
            if (pickup2Animation) {
              console.log(`Testing PropertyBinding with Pickup2 animation...`);
              
              try {
                const action = mixer.clipAction(pickup2Animation);
                console.log('✅ Animation action created successfully');
                
                // Try to play (this is where PropertyBinding errors would occur)
                action.play();
                console.log('✅ Animation.play() succeeded - no PropertyBinding errors');
                
              } catch (error) {
                console.log('❌ PropertyBinding failed:', error);
                
                // This is the expected error the user is reporting
                if (error.message && error.message.includes('PropertyBinding')) {
                  console.log('🎯 REPRODUCED: This is the PropertyBinding error the user is experiencing!');
                }
              }
            }
          }
          
          console.log('\n=== Analysis Complete ===');
          resolve(gltf);
        },
        (progress) => {
          // console.log('Loading progress:', progress);
        },
        (error) => {
          console.error('GLTFLoader error:', error);
          reject(error);
        }
      );
    });
  });
});