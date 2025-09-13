/**
 * Debug Otto skeleton hierarchy to understand parent-child relationships
 */

import { describe, test } from 'vitest';
import { parseBG3D } from './parseBG3D';
import { parseSkeletonRsrcTS } from './skeletonRsrc/parseSkeletonRsrcTS';
import fs from 'fs';
import path from 'path';

describe('Otto Hierarchy Debug', () => {
  test('analyzes Otto bone parent-child relationships', async () => {
    try {
      // Load Otto files
      const bg3dPath = path.join(__dirname, '../../public/Otto.bg3d');
      const skeletonPath = path.join(__dirname, '../../public/Otto.skeleton.rsrc');
      
      if (!fs.existsSync(bg3dPath) || !fs.existsSync(skeletonPath)) {
        console.log('Otto files not found, skipping test');
        return;
      }
      
      const bg3dBuffer = fs.readFileSync(bg3dPath);
      const skeletonBuffer = fs.readFileSync(skeletonPath);
      const skeletonRsrc = parseSkeletonRsrcTS(skeletonBuffer.buffer);
      const bg3dData = parseBG3D(bg3dBuffer.buffer, skeletonRsrc);

      if (bg3dData.skeleton) {
        console.log('\n=== Otto Bone Hierarchy Analysis ===');
        console.log(`Total bones: ${bg3dData.skeleton.bones.length}`);
        
        // Show all bones with their parent relationships
        console.log('\nBones with parent relationships:');
        bg3dData.skeleton.bones.forEach((bone, index) => {
          const parentName = bone.parentBone >= 0 ? bg3dData.skeleton!.bones[bone.parentBone].name : 'ROOT';
          console.log(`${index}: ${bone.name} (parent: ${bone.parentBone} = ${parentName})`);
        });

        // Find root bones
        const rootBones = bg3dData.skeleton.bones.filter(b => b.parentBone === -1);
        console.log(`\nRoot bones (parentBone = -1): ${rootBones.length}`);
        rootBones.forEach(bone => console.log(`- ${bone.name}`));

        // Build hierarchy tree
        console.log('\nExpected hierarchy tree:');
        function printExpectedHierarchy(boneIndex: number, depth = 0) {
          const bone = bg3dData.skeleton!.bones[boneIndex];
          const indent = '  '.repeat(depth);
          console.log(`${indent}${bone.name}`);
          
          // Find children
          const children = bg3dData.skeleton!.bones
            .map((b, i) => ({ bone: b, index: i }))
            .filter(({ bone }) => bone.parentBone === boneIndex);
          
          children.forEach(({ index }) => printExpectedHierarchy(index, depth + 1));
        }
        
        // Print hierarchy for each root
        rootBones.forEach((rootBone, index) => {
          console.log(`\nRoot ${index + 1}: ${rootBone.name}`);
          const rootIndex = bg3dData.skeleton!.bones.indexOf(rootBone);
          printExpectedHierarchy(rootIndex);
        });
      }
    } catch (error) {
      console.error('Debug failed:', error);
      throw error;
    }
  });
});