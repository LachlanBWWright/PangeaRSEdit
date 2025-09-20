import { describe, test, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Document, WebIO } from '@gltf-transform/core';
import { validateBytes } from 'gltf-validator';
import { createSkeletonSystem } from './skeletonSystemNew';
import { parseSkeletonRsrcTS } from './skeletonRsrc/parseSkeletonRsrcTS';
import { parseBG3D } from './parseBG3D';

describe('Bugdom 2 Round-trip Parsing Tests', () => {
  const basePath = join(__dirname, '..', '..', 'public', 'PangeaRSEdit', 'games', 'bugdom2', 'skeletons');
  
  // Test models that are known to have both BG3D and skeleton files
  const testModels = [
    'Ant',
    'Checkpoint', 
    'Chipmunk',
    'MouseTrap',
    'BuddyBug'
  ];

  test.each(testModels)('round-trip parsing for %s skeleton data', async (modelName) => {
    const skeletonPath = join(basePath, `${modelName}.skeleton.rsrc`);
    const bg3dPath = join(basePath, `${modelName}.bg3d`);
    
    // Check files exist
    expect(() => readFileSync(skeletonPath)).not.toThrow();
    expect(() => readFileSync(bg3dPath)).not.toThrow();
    
    // Parse skeleton data
    const skeletonBuffer = readFileSync(skeletonPath);
    const skeletonResource = parseSkeletonRsrcTS(skeletonBuffer);
    
    expect(skeletonResource).toBeDefined();
    expect(skeletonResource.Bone).toBeDefined();
    expect(Object.keys(skeletonResource.Bone).length).toBeGreaterThan(0);
    
    // Parse BG3D data with skeleton
    const bg3dBuffer = readFileSync(bg3dPath);
    const bg3dData = parseBG3D(bg3dBuffer.buffer, skeletonResource);
    
    expect(bg3dData).toBeDefined();
    expect(bg3dData.groups).toBeDefined();
    expect(bg3dData.skeleton).toBeDefined();
    
    // Create skeleton system with round-trip
    const doc = new Document();
    const buffer = doc.createBuffer();
    
    const { skin, animations } = createSkeletonSystem(doc, bg3dData.skeleton!, buffer);
    
    expect(skin).toBeDefined();
    expect(skin.listJoints().length).toBeGreaterThan(0);
    
    // Validate glTF output
    const io = new WebIO();
    const glb = await io.writeBinary(doc);
    const result = await validateBytes(glb);
    
    expect(result.issues.numErrors).toBe(0);
    
    console.log(`✅ ${modelName}: ${bg3dData.skeleton!.bones.length} bones, ${animations.length} animations`);
  }, 10000); // 10 second timeout for each model

  test('Bugdom 2 skeleton hierarchy validation', async () => {
    const antSkeletonPath = join(basePath, 'Ant.skeleton.rsrc');
    const antBg3dPath = join(basePath, 'Ant.bg3d');
    
    const skeletonBuffer = readFileSync(antSkeletonPath);
    const skeletonResource = parseSkeletonRsrcTS(skeletonBuffer);
    
    // Parse BG3D with skeleton to get processed skeleton data
    const bg3dBuffer = readFileSync(antBg3dPath);
    const bg3dData = parseBG3D(bg3dBuffer.buffer, skeletonResource);
    
    expect(bg3dData.skeleton).toBeDefined();
    
    // Check bone hierarchy structure for Ant model
    expect(bg3dData.skeleton!.bones.length).toBeGreaterThan(10); // Ant should have multiple bones
    
    // Verify parent-child relationships exist
    const bonesWithParents = bg3dData.skeleton!.bones.filter(bone => bone.parentBone !== -1);
    expect(bonesWithParents.length).toBeGreaterThan(0);
    
    // Check for expected bone names in Ant
    const boneNames = bg3dData.skeleton!.bones.map(bone => bone.name);
    expect(boneNames).toContain('Chest');
    
    console.log(`Ant skeleton bones: ${boneNames.join(', ')}`);
  });

  test('Bugdom 2 animation data preservation', async () => {
    const checkpointPath = join(basePath, 'Checkpoint.skeleton.rsrc');
    const checkpointBg3dPath = join(basePath, 'Checkpoint.bg3d');
    
    const skeletonBuffer = readFileSync(checkpointPath);
    const skeletonResource = parseSkeletonRsrcTS(skeletonBuffer);
    
    // Parse BG3D with skeleton to get processed skeleton data
    const bg3dBuffer = readFileSync(checkpointBg3dPath);
    const bg3dData = parseBG3D(bg3dBuffer.buffer, skeletonResource);
    
    expect(bg3dData.skeleton).toBeDefined();
    expect(bg3dData.skeleton!.animations).toBeDefined();
    
    if (bg3dData.skeleton!.animations.length > 0) {
      const doc = new Document();
      const buffer = doc.createBuffer();
      
      const { animations } = createSkeletonSystem(doc, bg3dData.skeleton!, buffer);
      
      expect(animations.length).toBe(bg3dData.skeleton!.animations.length);
      
      // Validate first animation has channels
      if (animations.length > 0) {
        expect(animations[0].listChannels().length).toBeGreaterThan(0);
        expect(animations[0].listSamplers().length).toBeGreaterThan(0);
      }
      
      console.log(`Checkpoint animations: ${animations.map(a => a.getName()).join(', ')}`);
    }
  });

  test('BG3D texture data parsing for Bugdom 2', async () => {
    const checkpointPath = join(basePath, 'Checkpoint.bg3d');
    const bg3dBuffer = readFileSync(checkpointPath);
    const bg3dData = parseBG3D(bg3dBuffer.buffer);
    
    expect(bg3dData.groups).toBeDefined();
    expect(bg3dData.groups.length).toBeGreaterThan(0);
    
    // Check for texture data in materials
    let hasTextures = false;
    for (const group of bg3dData.groups) {
      if (group.materials && group.materials.length > 0) {
        for (const material of group.materials) {
          if (material.textureMap && material.textureMap.length > 0) {
            hasTextures = true;
            break;
          }
        }
      }
    }
    
    if (hasTextures) {
      console.log(`✅ Checkpoint model contains texture data`);
    } else {
      console.log(`ℹ️  Checkpoint model has no texture data`);
    }
  });

  test('Bugdom 2 bone coordinate system consistency', async () => {
    const chipmunkPath = join(basePath, 'Chipmunk.skeleton.rsrc');
    const chipmunkBg3dPath = join(basePath, 'Chipmunk.bg3d');
    
    const skeletonBuffer = readFileSync(chipmunkPath);
    const skeletonResource = parseSkeletonRsrcTS(skeletonBuffer);
    
    // Parse BG3D with skeleton to get processed skeleton data
    const bg3dBuffer = readFileSync(chipmunkBg3dPath);
    const bg3dData = parseBG3D(bg3dBuffer.buffer, skeletonResource);
    
    expect(bg3dData.skeleton).toBeDefined();
    
    // Check that bone coordinates are reasonable
    for (const bone of bg3dData.skeleton!.bones) {
      expect(bone.coordX).toBeTypeOf('number');
      expect(bone.coordY).toBeTypeOf('number');
      expect(bone.coordZ).toBeTypeOf('number');
      
      // Coordinates should be finite
      expect(isFinite(bone.coordX)).toBe(true);
      expect(isFinite(bone.coordY)).toBe(true);
      expect(isFinite(bone.coordZ)).toBe(true);
    }
    
    console.log(`Chipmunk bone coordinates validated for ${bg3dData.skeleton!.bones.length} bones`);
  });
});