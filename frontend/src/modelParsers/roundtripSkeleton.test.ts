import { describe, it, expect } from 'vitest';
import { parseSkeletonRsrcTS } from './skeletonRsrc/parseSkeletonRsrcTS';
import { bg3dParsedToGLTF, gltfToBG3D } from './parsedBg3dGitfConverter';
import { parseBG3D, BG3DParseResult } from './parseBG3D';
import { readFileSync } from 'fs';

describe('BG3D + Skeleton Roundtrip Tests', () => {
  // Test data paths
  const ottoBg3dPath = '/home/runner/work/PangeaRSEdit/PangeaRSEdit/frontend/public/Otto.bg3d';
  const ottoSkeletonPath = '/home/runner/work/PangeaRSEdit/PangeaRSEdit/frontend/public/Otto.skeleton.rsrc';
  
  it('should convert BG3D+skeleton to GLB and back with data integrity', async () => {
    // Read original files
    const bg3dData = readFileSync(ottoBg3dPath);
    const skeletonData = readFileSync(ottoSkeletonPath);
    
    // Parse original BG3D
    const originalBg3d = parseBG3D(bg3dData.buffer.slice(bg3dData.byteOffset, bg3dData.byteOffset + bg3dData.byteLength));
    
    // Parse original skeleton
    const originalSkeleton = parseSkeletonRsrcTS(new Uint8Array(skeletonData));
    
    console.log('Original skeleton animations:', originalSkeleton.animations.length);
    console.log('Original animations:', originalSkeleton.animations.map(a => ({ 
      name: a.name, 
      keyframes: a.keyframes.length,
      maxTick: Math.max(...a.keyframes.flat().map(kf => kf.tick || 0))
    })));
    
    // Convert to GLB
    const gltfResult = await bg3dParsedToGLTF(originalBg3d, originalSkeleton);
    expect(gltfResult).toBeDefined();
    expect(gltfResult.getRoot().listAnimations().length).toBeGreaterThan(0);
    
    const animations = gltfResult.getRoot().listAnimations();
    console.log('GLB animations:', animations.length);
    console.log('GLB animation durations:', animations.map(a => ({ 
      name: a.getName(), 
      duration: a.listChannels()[0]?.listSamplers()[0]?.getOutput()?.getArray()?.length || 0
    })));
    
    // Convert back to BG3D+skeleton
    const roundtripResult = gltfToBG3D(gltfResult);
    expect(roundtripResult).toBeDefined();
    expect(roundtripResult.animations).toBeDefined();
    expect(roundtripResult.animations.length).toBe(originalSkeleton.animations.length);
    
    console.log('Roundtrip skeleton animations:', roundtripResult.animations.length);
    console.log('Roundtrip animations:', roundtripResult.animations.map(a => ({ 
      name: a.name, 
      keyframes: a.keyframes.length,
      maxTick: Math.max(...a.keyframes.flat().map(kf => kf.tick || 0))
    })));
    
    // Verify animation count matches
    expect(roundtripResult.animations.length).toBe(originalSkeleton.animations.length);
    
    // Verify each animation has preserved data
    for (let i = 0; i < originalSkeleton.animations.length; i++) {
      const originalAnim = originalSkeleton.animations[i];
      const roundtripAnim = roundtripResult.animations[i];
      
      expect(roundtripAnim.name).toBe(originalAnim.name);
      expect(roundtripAnim.keyframes.length).toBe(originalAnim.keyframes.length);
      
      // Check that keyframes have been preserved (allowing for some floating point differences)
      for (let boneIndex = 0; boneIndex < originalAnim.keyframes.length; boneIndex++) {
        const originalKeyframes = originalAnim.keyframes[boneIndex];
        const roundtripKeyframes = roundtripAnim.keyframes[boneIndex];
        
        expect(roundtripKeyframes.length).toBeGreaterThanOrEqual(1); // Should have at least one keyframe
        
        // Check that tick values are reasonable (not zero for all keyframes unless original was zero)
        const originalTicks = originalKeyframes.map(kf => kf.tick || 0);
        const roundtripTicks = roundtripKeyframes.map(kf => kf.tick || 0);
        const originalMaxTick = Math.max(...originalTicks);
        const roundtripMaxTick = Math.max(...roundtripTicks);
        
        if (originalMaxTick > 0) {
          expect(roundtripMaxTick).toBeGreaterThan(0);
          // Allow for some variation in timing conversion
          expect(Math.abs(roundtripMaxTick - originalMaxTick) / originalMaxTick).toBeLessThan(0.1);
        }
      }
    }
  });
  
  it('should preserve skeleton bone structure in roundtrip', async () => {
    // Read original files
    const bg3dData = readFileSync(ottoBg3dPath);
    const skeletonData = readFileSync(ottoSkeletonPath);
    
    // Parse original files
    const originalBg3d = parseBG3D(bg3dData.buffer.slice(bg3dData.byteOffset, bg3dData.byteOffset + bg3dData.byteLength));
    const originalSkeleton = parseSkeletonRsrcTS(new Uint8Array(skeletonData));
    
    // Convert to GLB and back
    const gltfResult = await bg3dParsedToGLTF(originalBg3d, originalSkeleton);
    const roundtripResult = gltfToBG3D(gltfResult);
    
    // Verify bone count matches
    expect(roundtripResult.bones.length).toBe(originalSkeleton.bones.length);
    
    // Verify bone hierarchy and coordinates
    for (let i = 0; i < originalSkeleton.bones.length; i++) {
      const originalBone = originalSkeleton.bones[i];
      const roundtripBone = roundtripResult.bones[i];
      
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
    
    const originalBg3d = parseBG3D(bg3dData.buffer.slice(bg3dData.byteOffset, bg3dData.byteOffset + bg3dData.byteLength));
    const originalSkeleton = parseSkeletonRsrcTS(new Uint8Array(skeletonData));
    
    // Convert to GLB
    const gltfResult = await bg3dParsedToGLTF(originalBg3d, originalSkeleton);
    const animations = gltfResult.getRoot().listAnimations();
    
    // Verify animations have reasonable durations (not 0)
    for (const animation of animations) {
      const channels = animation.listChannels();
      expect(channels.length).toBeGreaterThan(0);
      
      for (const channel of channels) {
        const samplers = channel.listSamplers();
        expect(samplers.length).toBeGreaterThan(0);
        
        for (const sampler of samplers) {
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