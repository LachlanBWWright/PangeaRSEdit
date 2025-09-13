/**
 * Test to generate glTF and examine its structure for PropertyBinding issues
 */

import { describe, test, expect } from 'vitest';
import { Document, WebIO } from '@gltf-transform/core';
import { createSkeletonSystem } from './skeletonSystemNew';
import { parseBG3D } from './parseBG3D';
import { parseSkeletonRsrcTS } from './skeletonRsrc/parseSkeletonRsrcTS';
import { validateBytes } from 'gltf-validator';
import fs from 'fs';
import path from 'path';

describe('Otto glTF Analysis', () => {
  test('examines Otto glTF structure for PropertyBinding issues', async () => {
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
        const doc = new Document();
        const buffer = doc.createBuffer();
        const { animations } = createSkeletonSystem(doc, bg3dData.skeleton, buffer);

        // Generate glTF binary 
        const io = new WebIO();
        const glb = await io.writeBinary(doc);

        // Validate glTF
        const result = await validateBytes(glb);
        console.log('\n=== glTF Validation Results ===');
        console.log(`Errors: ${result.issues.numErrors}`);
        console.log(`Warnings: ${result.issues.numWarnings}`);
        
        // Show validation messages
        result.issues.messages.forEach((msg: any) => {
          if (msg.severity <= 1) { // Show errors and warnings
            console.log(`${msg.severity === 0 ? 'ERROR' : 'WARNING'}: ${msg.message}`);
            if (msg.pointer) console.log(`  Pointer: ${msg.pointer}`);
          }
        });

        // Examine first animation in detail
        if (animations.length > 0) {
          console.log('\n=== First Animation Analysis ===');
          const firstAnim = animations[0];
          console.log(`Animation name: ${firstAnim.getName()}`);
          
          const channels = firstAnim.listChannels();
          console.log(`Channels: ${channels.length}`);
          
          // Show first few channels
          channels.slice(0, 10).forEach((channel, index) => {
            const targetNode = channel.getTargetNode();
            const targetPath = channel.getTargetPath();
            const sampler = channel.getSampler();
            
            console.log(`  Channel ${index}:`);
            console.log(`    Target: ${targetNode?.getName()}`);
            console.log(`    Path: ${targetPath}`);
            console.log(`    Sampler: ${sampler ? 'present' : 'missing'}`);
            
            if (sampler) {
              const input = sampler.getInput();
              const output = sampler.getOutput();
              console.log(`    Input times: ${input?.getCount()} values`);
              console.log(`    Output values: ${output?.getCount()} values (${output?.getType()})`);
            }
          });
        }

        // Examine scene structure
        console.log('\n=== Scene Structure ===');
        const scene = doc.getRoot().getDefaultScene()!;
        function printSceneHierarchy(node: any, depth = 0) {
          const indent = '  '.repeat(depth);
          console.log(`${indent}${node.getName() || '(unnamed)'}`);
          node.listChildren().forEach((child: any) => printSceneHierarchy(child, depth + 1));
        }
        
        scene.listChildren().forEach(child => printSceneHierarchy(child));

        // Save glTF for manual inspection
        const outputPath = '/tmp/otto_test.glb';
        fs.writeFileSync(outputPath, Buffer.from(glb));
        console.log(`\nGenerated glTF saved to: ${outputPath}`);

        expect(result.issues.numErrors).toBe(0);
      }
    } catch (error) {
      console.error('Test failed:', error);
      throw error;
    }
  });
});