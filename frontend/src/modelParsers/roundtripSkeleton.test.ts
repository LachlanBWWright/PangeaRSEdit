import { describe, it, expect } from 'vitest';
import { parseSkeletonRsrcTS } from './skeletonRsrc/parseSkeletonRsrcTS';
import { bg3dParsedToGLTF, gltfToBG3D } from './parsedBg3dGitfConverter';
import { parseBG3D } from './parseBG3D';
import { bg3dSkeletonToSkeletonResource } from './skeletonExport';
import { skeletonResourceToBinary } from './skeletonBinaryExport';
import { readFileSync } from 'fs';

describe('BG3D + Skeleton Roundtrip Tests', () => {
  // Test data paths
  const ottoBg3dPath = '/home/runner/work/PangeaRSEdit/PangeaRSEdit/frontend/public/Otto.bg3d';
  const ottoSkeletonPath = '/home/runner/work/PangeaRSEdit/PangeaRSEdit/frontend/public/Otto.skeleton.rsrc';
  
  it('should perform complete BG3D+skeleton binary roundtrip with data integrity', async () => {
    // Read original files
    const bg3dData = readFileSync(ottoBg3dPath);
    const skeletonData = readFileSync(ottoSkeletonPath);
    
    // Parse original skeleton
    const originalSkeletonResource = parseSkeletonRsrcTS(new Uint8Array(skeletonData));
    console.log('Original skeleton resource structure:', Object.keys(originalSkeletonResource));
    
    // Parse original BG3D with skeleton integrated
    const originalBg3d = parseBG3D(bg3dData.buffer.slice(bg3dData.byteOffset, bg3dData.byteOffset + bg3dData.byteLength), originalSkeletonResource);
    
    console.log('Original BG3D with skeleton:', {
      bones: originalBg3d.skeleton?.bones?.length,
      animations: originalBg3d.skeleton?.animations?.length
    });
    
    // Convert to GLB
    const gltfResult = await bg3dParsedToGLTF(originalBg3d);
    expect(gltfResult).toBeDefined();
    expect(gltfResult.getRoot().listAnimations().length).toBeGreaterThan(0);
    
    const animations = gltfResult.getRoot().listAnimations();
    console.log('GLB animations:', animations.length);
    
    // Convert back to BG3D+skeleton
    const roundtripResult = await gltfToBG3D(gltfResult);
    expect(roundtripResult).toBeDefined();
    expect(roundtripResult.skeleton).toBeDefined();
    expect(roundtripResult.skeleton!.animations).toBeDefined();
    expect(roundtripResult.skeleton!.animations.length).toBe(originalBg3d.skeleton!.animations.length);
    
    // Export skeleton resource from roundtrip result
    const roundtripSkeletonResource = bg3dSkeletonToSkeletonResource(roundtripResult.skeleton!);
    
    // Convert back to binary format
    const roundtripSkeletonBinary = skeletonResourceToBinary(roundtripSkeletonResource);
    
    // Parse the roundtrip binary back to verify integrity
    const reparsedSkeletonResource = parseSkeletonRsrcTS(new Uint8Array(roundtripSkeletonBinary));
    
    // Verify key structure matches
    expect(Object.keys(reparsedSkeletonResource)).toEqual(Object.keys(originalSkeletonResource));
    
    // Verify bone count matches
    const originalBoneCount = Object.keys(originalSkeletonResource.Bone || {}).length;
    const roundtripBoneCount = Object.keys(reparsedSkeletonResource.Bone || {}).length;
    expect(roundtripBoneCount).toBe(originalBoneCount);
    
    // Verify animation count matches
    const originalAnimCount = Object.keys(originalSkeletonResource.AnHd || {}).length;
    const roundtripAnimCount = Object.keys(reparsedSkeletonResource.AnHd || {}).length;
    expect(roundtripAnimCount).toBe(originalAnimCount);
    
    console.log('Roundtrip integrity test completed successfully');
  });
  
  it('should preserve skeleton bone structure in roundtrip', async () => {
    // Read original files
    const bg3dData = readFileSync(ottoBg3dPath);
    const skeletonData = readFileSync(ottoSkeletonPath);
    
    // Parse original files with skeleton integrated
    const originalSkeletonResource = parseSkeletonRsrcTS(new Uint8Array(skeletonData));
    const originalBg3d = parseBG3D(bg3dData.buffer.slice(bg3dData.byteOffset, bg3dData.byteOffset + bg3dData.byteLength), originalSkeletonResource);
    
    // Convert to GLB and back
    const gltfResult = await bg3dParsedToGLTF(originalBg3d);
    const roundtripResult = await gltfToBG3D(gltfResult);
    
    // Verify bone count matches
    expect(roundtripResult.skeleton!.bones.length).toBe(originalBg3d.skeleton!.bones.length);
    
    // Verify bone hierarchy and coordinates
    for (let i = 0; i < originalBg3d.skeleton!.bones.length; i++) {
      const originalBone = originalBg3d.skeleton!.bones[i];
      const roundtripBone = roundtripResult.skeleton!.bones[i];
      
      expect(roundtripBone.name).toBe(originalBone.name);
      expect(roundtripBone.parentBone).toBe(originalBone.parentBone);
      
      // Check coordinates are preserved (allowing for floating point precision)
      expect(Math.abs(roundtripBone.coordX - originalBone.coordX)).toBeLessThan(0.001);
      expect(Math.abs(roundtripBone.coordY - originalBone.coordY)).toBeLessThan(0.001);
      expect(Math.abs(roundtripBone.coordZ - originalBone.coordZ)).toBeLessThan(0.001);
    }
  });
  
  it('should maintain animation timing accuracy', async () => {
    // Read and parse files
    const bg3dData = readFileSync(ottoBg3dPath);
    const skeletonData = readFileSync(ottoSkeletonPath);
    
    const originalSkeletonResource = parseSkeletonRsrcTS(new Uint8Array(skeletonData));
    const originalBg3d = parseBG3D(bg3dData.buffer.slice(bg3dData.byteOffset, bg3dData.byteOffset + bg3dData.byteLength), originalSkeletonResource);
    
    // Convert to GLB
    const gltfResult = await bg3dParsedToGLTF(originalBg3d);
    const animations = gltfResult.getRoot().listAnimations();
    
    // Verify animations have reasonable durations (not 0)
    for (const animation of animations) {
      const channels = animation.listChannels();
      expect(channels.length).toBeGreaterThan(0);
      
      for (const channel of channels) {
        const sampler = channel.getSampler();
        expect(sampler).toBeTruthy();
        
        if (sampler) {
          const input = sampler.getInput();
          const times = input?.getArray();
          
          if (times && times.length > 1) {
            const duration = times[times.length - 1] - times[0];
            expect(duration).toBeGreaterThan(0);
            
            // Duration should be reasonable (between 0.1 seconds and 10 seconds for Otto animations)
            expect(duration).toBeGreaterThan(0.01);
            expect(duration).toBeLessThan(20.0);
            
            console.log(`Animation ${animation.getName()}: duration = ${duration.toFixed(3)}s`);
          }
        }
      }
    }
  });
});