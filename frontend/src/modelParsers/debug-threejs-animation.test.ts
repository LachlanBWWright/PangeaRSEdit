// Test to inspect the actual Three.js animation structure and property names
import { describe, it, expect } from 'vitest';
import { convertBG3DWithSkeletonToGLTF } from './bg3dWithSkeleton';
import * as fs from 'fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three-stdlib';

describe('Three.js Animation Property Names Debug', () => {
  it('should inspect actual Three.js animation structure to debug PropertyBinding errors', async () => {
    console.log('=== Three.js Animation Property Names Debug ===');
    
    // Load Otto files
    const bg3dPath = '/home/runner/work/PangeaRSEdit/PangeaRSEdit/frontend/public/Otto.bg3d';
    const skeletonPath = '/home/runner/work/PangeaRSEdit/PangeaRSEdit/frontend/public/Otto.skeleton.rsrc';
    
    const bg3dBuffer = fs.readFileSync(bg3dPath);
    const skeletonBuffer = fs.readFileSync(skeletonPath);
    
    console.log(`BG3D size: ${bg3dBuffer.length} bytes`);
    console.log(`Skeleton size: ${skeletonBuffer.length} bytes`);
    
    // Convert to GLB
    const glbBuffer = convertBG3DWithSkeletonToGLTF(bg3dBuffer, skeletonBuffer);
    console.log(`Generated GLB size: ${glbBuffer.length} bytes`);
    
    // Save GLB temporarily for Three.js to load
    const tempGlbPath = '/tmp/otto-debug.glb';
    fs.writeFileSync(tempGlbPath, glbBuffer);
    
    // Load with Three.js GLTFLoader to see actual structure
    const loader = new GLTFLoader();
    
    // Load the GLB and inspect the animation structure
    return new Promise((resolve, reject) => {
      loader.load(
        `file://${tempGlbPath}`,
        (gltf) => {
          console.log('\n=== Three.js GLTF Structure ===');
          console.log(`Scene children: ${gltf.scene.children.length}`);
          console.log(`Animations: ${gltf.animations.length}`);
          
          // Inspect the first few animations
          const testAnimations = gltf.animations.slice(0, 3);
          testAnimations.forEach((animation, animIndex) => {
            console.log(`\n--- Animation ${animIndex}: "${animation.name}" ---`);
            console.log(`Duration: ${animation.duration.toFixed(3)}s`);
            console.log(`Tracks: ${animation.tracks.length}`);
            
            // Examine first few tracks to see property names
            const sampleTracks = animation.tracks.slice(0, 10);
            sampleTracks.forEach((track, trackIndex) => {
              console.log(`  Track ${trackIndex}: "${track.name}" (${track.times.length} keyframes)`);
              
              // Parse track name to see format
              const parts = track.name.split('.');
              if (parts.length >= 2) {
                const nodeName = parts[0];
                const propertyPath = parts.slice(1).join('.');
                console.log(`    Node: "${nodeName}", Property: "${propertyPath}"`);
              }
            });
          });
          
          // Inspect scene hierarchy to see if joints are findable
          console.log('\n=== Scene Hierarchy Analysis ===');
          
          function traverseScene(node: THREE.Object3D, depth = 0) {
            const indent = '  '.repeat(depth);
            console.log(`${indent}${node.name || '(unnamed)'} (${node.type})`);
            
            // Check if this is a bone/joint
            if (node.type === 'Bone' || (node.name && ['Pelvis', 'Torso', 'Head'].includes(node.name))) {
              console.log(`${indent}  ⭐ Joint detected: "${node.name}"`);
            }
            
            node.children.forEach(child => traverseScene(child, depth + 1));
          }
          
          traverseScene(gltf.scene);
          
          // Check for skins
          console.log('\n=== Skins Analysis ===');
          if (gltf.scene.children.length > 0) {
            gltf.scene.traverse((node: THREE.Object3D) => {
              if ((node as any).isSkinnedMesh) {
                const skinnedMesh = node as THREE.SkinnedMesh;
                console.log(`Found SkinnedMesh: "${node.name}"`);
                
                if (skinnedMesh.skeleton) {
                  console.log(`  Skeleton bones: ${skinnedMesh.skeleton.bones.length}`);
                  skinnedMesh.skeleton.bones.slice(0, 5).forEach((bone, index) => {
                    console.log(`    Bone ${index}: "${bone.name}" (${bone.type})`);
                  });
                }
              }
            });
          }
          
          // Test Three.js PropertyBinding to see what happens
          console.log('\n=== PropertyBinding Test ===');
          
          if (gltf.animations.length > 0) {
            const testAnimation = gltf.animations[0];
            const mixer = new THREE.AnimationMixer(gltf.scene);
            
            try {
              console.log(`Testing PropertyBinding with animation: "${testAnimation.name}"`);
              const action = mixer.clipAction(testAnimation);
              
              // Try to get the animation action to bind properties
              console.log('PropertyBinding attempt...');
              action.reset();
              
              // The binding happens when we try to play
              console.log('Attempting to play animation to trigger PropertyBinding...');
              action.play();
              
              console.log('✅ PropertyBinding succeeded (no errors thrown)');
              
            } catch (error) {
              console.log('❌ PropertyBinding failed:', error);
            }
          }
          
          console.log('\n=== Debug Complete ===');
          resolve(gltf);
        },
        (progress) => {
          console.log('Loading progress:', progress);
        },
        (error) => {
          console.error('GLTFLoader error:', error);
          reject(error);
        }
      );
    });
  });
});