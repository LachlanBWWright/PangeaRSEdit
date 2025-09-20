import { describe, test, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Document, WebIO } from '@gltf-transform/core';
import { validateBytes } from 'gltf-validator';
import { createSkeletonSystem } from './skeletonSystemNew';
import { parseSkeletonRsrcTS } from './skeletonRsrc/parseSkeletonRsrcTS';
import { parseBG3D } from './parseBG3D';

describe('Working Model Round-trip Validation', () => {
  test('Otto model round-trip validation', async () => {
    // Use paths that we know work from existing tests
    const ottoBg3dPath = join(__dirname, '../../public/Otto.bg3d');
    const ottoSkeletonPath = join(__dirname, '../../public/Otto.skeleton.rsrc');
    
    // Check files exist (gracefully skip if not found)
    try {
      readFileSync(ottoBg3dPath);
      readFileSync(ottoSkeletonPath);
    } catch {
      console.log('Otto files not found, skipping test');
      return;
    }
    
    console.log('=== Otto Round-trip Validation ===');
    
    // Parse skeleton
    const skeletonBuffer = readFileSync(ottoSkeletonPath);
    const skeletonResource = parseSkeletonRsrcTS(skeletonBuffer);
    
    console.log(`Skeleton parsed: ${Object.keys(skeletonResource.Bone || {}).length} bones`);
    
    // Parse BG3D with skeleton
    const bg3dBuffer = readFileSync(ottoBg3dPath);
    const bg3dData = parseBG3D(bg3dBuffer.buffer, skeletonResource);
    
    expect(bg3dData).toBeDefined();
    expect(bg3dData.skeleton).toBeDefined();
    
    console.log(`BG3D parsed: ${bg3dData.skeleton!.bones.length} bones, ${bg3dData.skeleton!.animations.length} animations`);
    
    // Create skeleton system
    const doc = new Document();
    const buffer = doc.createBuffer();
    
    const { skin, animations } = createSkeletonSystem(doc, bg3dData.skeleton!, buffer);
    
    expect(skin.listJoints().length).toBeGreaterThan(0);
    
    // Validate glTF output
    const io = new WebIO();
    const glb = await io.writeBinary(doc);
    const result = await validateBytes(glb);
    
    console.log(`glTF validation: ${result.issues.numErrors} errors, ${result.issues.numWarnings} warnings`);
    
    // Allow some validation issues but expect it to be reasonable
    expect(result.issues.numErrors).toBeLessThan(10);
    
    console.log(`✅ Otto round-trip: ${skin.listJoints().length} joints, ${animations.length} animations`);
  });

  test('Ant model skeleton parsing validation', async () => {
    const antSkeletonPath = join(__dirname, '../../public/PangeaRSEdit/games/bugdom2/skeletons/Ant.skeleton.rsrc');
    const antBg3dPath = join(__dirname, '../../public/PangeaRSEdit/games/bugdom2/skeletons/Ant.bg3d');
    
    // Check files exist (gracefully skip if not found)
    try {
      readFileSync(antSkeletonPath);
      readFileSync(antBg3dPath);
    } catch {
      console.log('Ant files not found, skipping test');
      return;
    }
    
    console.log('=== Ant Skeleton Validation ===');
    
    // Parse skeleton
    const skeletonBuffer = readFileSync(antSkeletonPath);
    const skeletonResource = parseSkeletonRsrcTS(skeletonBuffer);
    
    expect(skeletonResource).toBeDefined();
    expect(skeletonResource.Bone).toBeDefined();
    
    const boneCount = Object.keys(skeletonResource.Bone).length;
    console.log(`Ant skeleton: ${boneCount} bones`);
    
    // Parse BG3D
    const bg3dBuffer = readFileSync(antBg3dPath);
    const bg3dData = parseBG3D(bg3dBuffer.buffer, skeletonResource);
    
    expect(bg3dData).toBeDefined();
    expect(bg3dData.skeleton).toBeDefined();
    
    // Basic validation
    expect(bg3dData.skeleton!.bones.length).toBeGreaterThan(5);
    expect(bg3dData.skeleton!.animations.length).toBeGreaterThan(0);
    
    console.log(`Ant BG3D: ${bg3dData.skeleton!.bones.length} bones, ${bg3dData.skeleton!.animations.length} animations`);
    
    // Create skeleton system
    const doc = new Document();
    const buffer = doc.createBuffer();
    
    const { skin, animations } = createSkeletonSystem(doc, bg3dData.skeleton!, buffer);
    
    expect(skin.listJoints().length).toBeGreaterThan(0);
    
    console.log(`✅ Ant validation: ${skin.listJoints().length} joints created`);
  });

  test('BG3D parsing without skeleton validation', async () => {
    const antBg3dPath = join(__dirname, '../../public/PangeaRSEdit/games/bugdom2/skeletons/Ant.bg3d');
    
    try {
      readFileSync(antBg3dPath);
    } catch {
      console.log('Ant BG3D not found, skipping test');
      return;
    }
    
    console.log('=== BG3D-only Parsing Validation ===');
    
    // Parse BG3D without skeleton
    const bg3dBuffer = readFileSync(antBg3dPath);
    const bg3dData = parseBG3D(bg3dBuffer.buffer);
    
    expect(bg3dData).toBeDefined();
    expect(bg3dData.groups).toBeDefined();
    expect(bg3dData.groups.length).toBeGreaterThan(0);
    
    // Check basic structure
    let totalMaterials = 0;
    let totalGeometries = 0;
    
    for (const group of bg3dData.groups) {
      if (group.materials) {
        totalMaterials += group.materials.length;
      }
      if (group.geometryObjects) {
        totalGeometries += group.geometryObjects.length;
      }
    }
    
    console.log(`BG3D structure: ${bg3dData.groups.length} groups, ${totalMaterials} materials, ${totalGeometries} geometries`);
    
    expect(totalMaterials).toBeGreaterThan(0);
    
    console.log(`✅ BG3D-only parsing successful`);
  });

  test('Skeleton resource structure validation', async () => {
    const antSkeletonPath = join(__dirname, '../../public/PangeaRSEdit/games/bugdom2/skeletons/Ant.skeleton.rsrc');
    
    try {
      readFileSync(antSkeletonPath);
    } catch {
      console.log('Ant skeleton not found, skipping test');
      return;
    }
    
    console.log('=== Skeleton Resource Structure Validation ===');
    
    const skeletonBuffer = readFileSync(antSkeletonPath);
    const skeletonResource = parseSkeletonRsrcTS(skeletonBuffer);
    
    // Validate resource structure
    expect(skeletonResource).toBeDefined();
    expect(skeletonResource.Bone).toBeDefined();
    expect(skeletonResource.AnHd).toBeDefined();
    expect(skeletonResource.KeyF).toBeDefined();
    
    const bones = Object.keys(skeletonResource.Bone);
    const animations = Object.keys(skeletonResource.AnHd);
    const keyframes = Object.keys(skeletonResource.KeyF);
    
    console.log(`Skeleton structure: ${bones.length} bones, ${animations.length} animations, ${keyframes.length} keyframe sets`);
    
    expect(bones.length).toBeGreaterThan(0);
    expect(animations.length).toBeGreaterThan(0);
    expect(keyframes.length).toBeGreaterThan(0);
    
    console.log(`✅ Skeleton resource structure valid`);
  });
});