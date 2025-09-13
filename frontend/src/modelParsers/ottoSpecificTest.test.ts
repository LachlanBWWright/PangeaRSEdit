/**
 * Otto-specific test to debug PropertyBinding issues
 * Tests actual Otto model files to find the root cause of skeleton issues
 */

import { describe, test, expect } from 'vitest';
import { Document, WebIO } from '@gltf-transform/core';
import { createSkeletonSystem } from './skeletonSystemNew';
import { parseBG3D } from './parseBG3D';
import { parseSkeletonRsrcTS } from './skeletonRsrc/parseSkeletonRsrcTS';
import { validateBytes } from 'gltf-validator';
import fs from 'fs';
import path from 'path';

describe('Otto Model Specific Tests', () => {
  test('loads and validates Otto model skeleton', async () => {
    try {
      // Load Otto BG3D file
      const bg3dPath = path.join(__dirname, '../../public/Otto.bg3d');
      if (!fs.existsSync(bg3dPath)) {
        console.log('Otto.bg3d not found, skipping test');
        return;
      }
      const bg3dBuffer = fs.readFileSync(bg3dPath);
      
      // Load Otto skeleton file  
      const skeletonPath = path.join(__dirname, '../../public/Otto.skeleton.rsrc');
      if (!fs.existsSync(skeletonPath)) {
        console.log('Otto.skeleton.rsrc not found, skipping test');
        return;
      }
      const skeletonBuffer = fs.readFileSync(skeletonPath);
      const skeletonRsrc = parseSkeletonRsrcTS(skeletonBuffer.buffer);
      
      // Parse BG3D with skeleton
      const bg3dData = parseBG3D(bg3dBuffer.buffer, skeletonRsrc);

      console.log('Otto BG3D skeleton data:', bg3dData.skeleton);
      console.log('Otto bones:', bg3dData.skeleton?.bones.map(b => ({ name: b.name, parent: b.parentBone })));

      // Test skeleton system with real Otto data
      if (bg3dData.skeleton) {
        const doc = new Document();
        const buffer = doc.createBuffer();

        const { skin } = createSkeletonSystem(doc, bg3dData.skeleton, buffer);

        // Verify basic structure
        expect(skin).toBeDefined();
        expect(skin.listJoints().length).toBeGreaterThan(0);

        // Check for Pelvis bone specifically (from error message)
        const joints = skin.listJoints();
        const pelvisJoint = joints.find(j => j.getName() === 'Pelvis');
        console.log('Pelvis joint found:', !!pelvisJoint);
        console.log('All joint names:', joints.map(j => j.getName()));

        // Validate glTF structure
        const io = new WebIO();
        const glb = await io.writeBinary(doc);
        const result = await validateBytes(glb);
        
        console.log('glTF validation result:');
        console.log('- Errors:', result.issues.numErrors);
        console.log('- Warnings:', result.issues.numWarnings);
        
        // Log specific issues
        result.issues.messages.forEach((msg: any) => {
          if (msg.severity <= 1) { // Errors and warnings
            console.log(`- ${msg.severity === 0 ? 'ERROR' : 'WARNING'}: ${msg.message} (${msg.pointer})`);
          }
        });

        // Test that should pass
        expect(result.issues.numErrors).toBeLessThanOrEqual(5);
      }
    } catch (error) {
      console.error('Test failed:', error);
      throw error;
    }
  });

  test('analyzes Otto skeleton hierarchy for PropertyBinding issues', async () => {
    try {
      // Load Otto skeleton file  
      const skeletonPath = path.join(__dirname, '../../public/Otto.skeleton.rsrc');
      if (!fs.existsSync(skeletonPath)) {
        console.log('Otto.skeleton.rsrc not found, skipping test');
        return;
      }
      const skeletonBuffer = fs.readFileSync(skeletonPath);
      const skeletonRsrc = parseSkeletonRsrcTS(skeletonBuffer.buffer);
      
      // Parse BG3D with skeleton
      const bg3dPath = path.join(__dirname, '../../public/Otto.bg3d');
      const bg3dBuffer = fs.readFileSync(bg3dPath);
      const bg3dData = parseBG3D(bg3dBuffer.buffer, skeletonRsrc);

      if (bg3dData.skeleton) {
        console.log('\n=== Otto Skeleton Analysis ===');
        console.log(`Total bones: ${bg3dData.skeleton.bones.length}`);
        console.log(`Total animations: ${bg3dData.skeleton.animations.length}`);
        
        // Analyze bone hierarchy
        console.log('\nBone hierarchy:');
        bg3dData.skeleton.bones.forEach((bone, index) => {
          const parentName = bone.parentBone >= 0 ? bg3dData.skeleton!.bones[bone.parentBone].name : 'ROOT';
          console.log(`${index}: ${bone.name} (parent: ${bone.parentBone} = ${parentName})`);
        });

        // Check for common root
        const rootBones = bg3dData.skeleton.bones.filter(b => b.parentBone === -1);
        console.log(`\nRoot bones (parentBone = -1): ${rootBones.length}`);
        rootBones.forEach(bone => console.log(`- ${bone.name}`));

        // Analyze animations for Pelvis track
        console.log('\nAnimations:');
        bg3dData.skeleton.animations.forEach(anim => {
          console.log(`- ${anim.name}: ${Object.keys(anim.keyframes).length} bone tracks`);
          Object.entries(anim.keyframes).forEach(([boneIndexStr, keyframes]) => {
            const boneIndex = parseInt(boneIndexStr);
            const boneName = bg3dData.skeleton!.bones[boneIndex]?.name || 'UNKNOWN';
            console.log(`  - Bone ${boneIndex} (${boneName}): ${keyframes.length} keyframes`);
          });
        });

        // Create skeleton system and analyze the result
        const doc = new Document();
        const buffer = doc.createBuffer();
        const { skin } = createSkeletonSystem(doc, bg3dData.skeleton, buffer);

        console.log('\n=== glTF Skeleton Analysis ===');
        const joints = skin.listJoints();
        console.log(`Joints in skin: ${joints.length}`);
        
        // Check skeleton root
        const skeletonRoot = skin.getSkeleton();
        console.log(`Skeleton root: ${skeletonRoot?.getName() || 'NONE'}`);
        
        // Verify scene accessibility
        const scene = doc.getRoot().getDefaultScene()!;
        const allSceneNodes = new Set();
        function collectNodes(node: any): void {
          allSceneNodes.add(node);
          node.listChildren().forEach(collectNodes);
        }
        scene.listChildren().forEach(collectNodes);
        
        console.log('Joint accessibility:');
        joints.forEach(joint => {
          const accessible = allSceneNodes.has(joint);
          console.log(`- ${joint.getName()}: ${accessible ? 'ACCESSIBLE' : 'NOT ACCESSIBLE'}`);
        });
      }
    } catch (error) {
      console.error('Skeleton analysis failed:', error);
      throw error;
    }
  });
});