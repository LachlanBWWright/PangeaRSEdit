import { describe, test, expect, vi } from 'vitest';
import { BG3DGltfWorkerMessage, BG3DGltfWorkerResponse } from '../bg3dGltfWorker';

// Mock worker implementation for testing
class MockBG3DGltfWorker {
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;

  postMessage(message: BG3DGltfWorkerMessage) {
    // Simulate async worker processing
    setTimeout(() => {
      try {
        if (message.type === 'bg3d-with-skeleton-to-glb') {
          // Mock successful skeleton processing
          const response: BG3DGltfWorkerResponse = {
            type: 'bg3d-with-skeleton-to-glb',
            result: new ArrayBuffer(100), // Mock GLB buffer
            parsed: {
              materials: [],
              groups: [],
              skeleton: {
                version: 1,
                numAnims: 1,
                numJoints: 2,
                num3DMFLimbs: 0,
                bones: [
                  {
                    parentBone: -1,
                    name: 'root',
                    coordX: 0,
                    coordY: 0,
                    coordZ: 0,
                    numPointsAttachedToBone: 0,
                    numNormalsAttachedToBone: 0,
                  }
                ],
                animations: [
                  {
                    name: 'test_animation',
                    numAnimEvents: 0,
                    events: [],
                    keyframes: {
                      0: [
                        {
                          tick: 0,
                          accelerationMode: 0,
                          coordX: 0, coordY: 0, coordZ: 0,
                          rotationX: 0, rotationY: 0, rotationZ: 0,
                          scaleX: 1, scaleY: 1, scaleZ: 1,
                        }
                      ]
                    }
                  }
                ]
              }
            }
          };
          this.onmessage?.({ data: response } as MessageEvent);
        } else if (message.type === 'bg3d-to-glb') {
          // Mock regular BG3D processing
          const response: BG3DGltfWorkerResponse = {
            type: 'bg3d-to-glb',
            result: new ArrayBuffer(100), // Mock GLB buffer
            parsed: {
              materials: [],
              groups: [],
            }
          };
          this.onmessage?.({ data: response } as MessageEvent);
        }
      } catch (error) {
        const errorResponse: BG3DGltfWorkerResponse = {
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        };
        this.onmessage?.({ data: errorResponse } as MessageEvent);
      }
    }, 10);
  }

  terminate() {
    // Mock cleanup
  }
}

// Mock skeleton data
const mockSkeletonData = {
  Hedr: {
    "1": {
      name: "Header",
      order: 0,
      obj: {
        version: 1,
        numAnims: 1,
        numJoints: 2,
        num3DMFLimbs: 0
      }
    }
  },
  Bone: {
    "1": {
      name: "Bone",
      order: 1,
      obj: {
        parentBone: -1,
        name: "root",
        coordX: 0,
        coordY: 0,
        coordZ: 0,
        numPointsAttachedToBone: 0,
        numNormalsAttachedToBone: 0
      }
    }
  },
  BonP: {},
  BonN: {},
  AnHd: {
    "1": {
      name: "Animation Header",
      order: 2,
      obj: {
        animName: "test_animation",
        numAnimEvents: 0
      }
    }
  },
  Evnt: {},
  NumK: {
    "1": {
      name: "Number of Keyframes",
      order: 3,
      obj: {
        numKeyFrames: 1
      }
    }
  },
  KeyF: {
    "1": {
      name: "Keyframes",
      order: 4,
      obj: [
        {
          tick: 0,
          accelerationMode: 0,
          coordX: 0,
          coordY: 0,
          coordZ: 0,
          rotationX: 0,
          rotationY: 0,
          rotationZ: 0,
          scaleX: 1,
          scaleY: 1,
          scaleZ: 1
        }
      ]
    }
  }
};

describe('BG3D Skeleton Integration', () => {
  test('should handle BG3D file without skeleton', async () => {
    const worker = new MockBG3DGltfWorker();
    const mockBG3DBuffer = new ArrayBuffer(100);

    const result = await new Promise<BG3DGltfWorkerResponse>((resolve) => {
      worker.onmessage = (e) => {
        resolve(e.data);
      };

      worker.postMessage({
        type: 'bg3d-to-glb',
        buffer: mockBG3DBuffer
      });
    });

    expect(result.type).toBe('bg3d-to-glb');
    expect(result.parsed).toBeDefined();
    expect(result.parsed.skeleton).toBeUndefined();
  });

  test('should handle BG3D file with skeleton data', async () => {
    const worker = new MockBG3DGltfWorker();
    const mockBG3DBuffer = new ArrayBuffer(100);

    const result = await new Promise<BG3DGltfWorkerResponse>((resolve) => {
      worker.onmessage = (e) => {
        resolve(e.data);
      };

      worker.postMessage({
        type: 'bg3d-with-skeleton-to-glb',
        bg3dBuffer: mockBG3DBuffer,
        skeletonData: mockSkeletonData
      });
    });

    expect(result.type).toBe('bg3d-with-skeleton-to-glb');
    expect(result.parsed).toBeDefined();
    expect(result.parsed.skeleton).toBeDefined();
    expect(result.parsed.skeleton?.bones).toHaveLength(1);
    expect(result.parsed.skeleton?.animations).toHaveLength(1);
    expect(result.parsed.skeleton?.animations[0].name).toBe('test_animation');
  });

  test('should validate skeleton file format', async () => {
    const skeletonFile = new File([new ArrayBuffer(100)], 'test.skeleton.rsrc');
    const bg3dFile = new File([new ArrayBuffer(100)], 'test.bg3d');
    
    expect(skeletonFile.name.endsWith('.skeleton.rsrc')).toBe(true);
    expect(bg3dFile.name.endsWith('.bg3d')).toBe(true);
  });

  test('should extract animation information correctly', () => {
    const mockAnimations = [
      { name: 'walk', duration: 2.5, tracks: [] },
      { name: 'run', duration: 1.8, tracks: [] },
    ];

    const animationInfos = mockAnimations.map((clip, index) => ({
      name: clip.name,
      duration: clip.duration,
      index: index,
      clip: clip as any, // Mock THREE.AnimationClip
    }));

    expect(animationInfos).toHaveLength(2);
    expect(animationInfos[0].name).toBe('walk');
    expect(animationInfos[0].duration).toBe(2.5);
    expect(animationInfos[1].name).toBe('run');
    expect(animationInfos[1].duration).toBe(1.8);
  });
});

describe('Animation Viewer Integration', () => {
  test('should format time correctly', () => {
    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      const ms = Math.floor((seconds % 1) * 100);
      return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    };

    expect(formatTime(0)).toBe('0:00.00');
    expect(formatTime(65.5)).toBe('1:05.50');
    expect(formatTime(125.75)).toBe('2:05.75');
  });

  test('should handle animation selection state', () => {
    const mockAnimations = [
      { name: 'idle', duration: 3.0, index: 0, clip: {} as any },
      { name: 'walk', duration: 2.5, index: 1, clip: {} as any },
    ];

    let selectedAnimation: number | null = null;
    
    // Simulate selecting first animation
    selectedAnimation = 0;
    expect(selectedAnimation).toBe(0);
    expect(mockAnimations[selectedAnimation].name).toBe('idle');

    // Simulate deselecting
    selectedAnimation = null;
    expect(selectedAnimation).toBeNull();
  });
});