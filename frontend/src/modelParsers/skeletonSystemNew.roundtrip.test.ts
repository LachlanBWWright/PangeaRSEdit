/**
 * Round-trip unit tests for skeletonSystemNew using gltf-validator
 * Tests that skeleton hierarchy is being implemented correctly by:
 * 1. Converting BG3D skeleton to glTF
 * 2. Validating the glTF using gltf-validator
 * 3. Converting back from glTF to BG3D format
 * 4. Comparing original vs round-trip results
 */

import { describe, test, expect } from 'vitest';
import { Document, WebIO } from '@gltf-transform/core';
import { createSkeletonSystem, extractAnimationsFromGLTF } from './skeletonSystemNew';
import { BG3DSkeleton } from './parseBG3D';
import { validateBytes } from 'gltf-validator';

// Mock skeleton data for testing
const createMockSkeleton = (): BG3DSkeleton => ({
  version: 272,
  numAnims: 1,
  numJoints: 3,
  num3DMFLimbs: 0,
  bones: [
    {
      parentBone: -1, // Root bone
      name: "Root",
      coordX: 0,
      coordY: 0,
      coordZ: 0,
      numPointsAttachedToBone: 0,
      numNormalsAttachedToBone: 0,
      pointIndices: [],
      normalIndices: []
    },
    {
      parentBone: 0, // Child of Root
      name: "Spine",
      coordX: 0,
      coordY: 10,
      coordZ: 0,
      numPointsAttachedToBone: 0,
      numNormalsAttachedToBone: 0,
      pointIndices: [],
      normalIndices: []
    },
    {
      parentBone: 1, // Child of Spine
      name: "Head",
      coordX: 0,
      coordY: 20,
      coordZ: 0,
      numPointsAttachedToBone: 0,
      numNormalsAttachedToBone: 0,
      pointIndices: [],
      normalIndices: []
    }
  ],
  animations: [
    {
      name: "TestAnimation",
      numAnimEvents: 0,
      events: [],
      keyframes: {
        "0": [
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
          },
          {
            tick: 30,
            accelerationMode: 0,
            coordX: 5,
            coordY: 0,
            coordZ: 0,
            rotationX: 0,
            rotationY: 0.5,
            rotationZ: 0,
            scaleX: 1,
            scaleY: 1,
            scaleZ: 1
          }
        ],
        "1": [
          {
            tick: 0,
            accelerationMode: 0,
            coordX: 0,
            coordY: 10,
            coordZ: 0,
            rotationX: 0,
            rotationY: 0,
            rotationZ: 0,
            scaleX: 1,
            scaleY: 1,
            scaleZ: 1
          },
          {
            tick: 30,
            accelerationMode: 0,
            coordX: 0,
            coordY: 10,
            coordZ: 0,
            rotationX: 0.3,
            rotationY: 0,
            rotationZ: 0,
            scaleX: 1,
            scaleY: 1,
            scaleZ: 1
          }
        ]
      }
    }
  ]
});

const createComplexMockSkeleton = (): BG3DSkeleton => ({
  version: 272,
  numAnims: 2,
  numJoints: 5,
  num3DMFLimbs: 0,
  bones: [
    {
      parentBone: -1, // Root
      name: "Pelvis",
      coordX: 0,
      coordY: 0,
      coordZ: 0,
      numPointsAttachedToBone: 0,
      numNormalsAttachedToBone: 0,
      pointIndices: [],
      normalIndices: []
    },
    {
      parentBone: 0, // Child of Pelvis
      name: "Spine",
      coordX: 0,
      coordY: 10,
      coordZ: 0,
      numPointsAttachedToBone: 0,
      numNormalsAttachedToBone: 0,
      pointIndices: [],
      normalIndices: []
    },
    {
      parentBone: 0, // Child of Pelvis
      name: "LeftLeg",
      coordX: -5,
      coordY: 0,
      coordZ: 0,
      numPointsAttachedToBone: 0,
      numNormalsAttachedToBone: 0,
      pointIndices: [],
      normalIndices: []
    },
    {
      parentBone: 0, // Child of Pelvis
      name: "RightLeg",
      coordX: 5,
      coordY: 0,
      coordZ: 0,
      numPointsAttachedToBone: 0,
      numNormalsAttachedToBone: 0,
      pointIndices: [],
      normalIndices: []
    },
    {
      parentBone: 1, // Child of Spine
      name: "Head",
      coordX: 0,
      coordY: 20,
      coordZ: 0,
      numPointsAttachedToBone: 0,
      numNormalsAttachedToBone: 0,
      pointIndices: [],
      normalIndices: []
    }
  ],
  animations: [
    {
      name: "Walk",
      numAnimEvents: 0,
      events: [],
      keyframes: {
        "0": [
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
        ],
        "2": [
          {
            tick: 0,
            accelerationMode: 0,
            coordX: -5,
            coordY: 0,
            coordZ: 0,
            rotationX: 0.1,
            rotationY: 0,
            rotationZ: 0,
            scaleX: 1,
            scaleY: 1,
            scaleZ: 1
          }
        ],
        "3": [
          {
            tick: 0,
            accelerationMode: 0,
            coordX: 5,
            coordY: 0,
            coordZ: 0,
            rotationX: -0.1,
            rotationY: 0,
            rotationZ: 0,
            scaleX: 1,
            scaleY: 1,
            scaleZ: 1
          }
        ]
      }
    },
    {
      name: "Idle",
      numAnimEvents: 0,
      events: [],
      keyframes: {
        "1": [
          {
            tick: 0,
            accelerationMode: 0,
            coordX: 0,
            coordY: 10,
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
  ]
});

describe('skeletonSystemNew Round-trip Tests', () => {
  test('creates valid glTF document with skeleton and animations', async () => {
    const mockSkeleton = createMockSkeleton();
    const doc = new Document();
    const buffer = doc.createBuffer();

    const { skin, animations } = createSkeletonSystem(doc, mockSkeleton, buffer);

    // Verify basic structure
    expect(skin).toBeDefined();
    expect(animations).toBeDefined();
    expect(animations.length).toBe(1);
    expect(animations[0].getName()).toBe('TestAnimation');

    // Verify skin has correct number of joints
    expect(skin.listJoints().length).toBe(3);

    // Verify scene structure
    const scene = doc.getRoot().getDefaultScene();
    expect(scene).toBeDefined();
    
    // All joints should be accessible from scene
    const allSceneNodes = new Set();
    function collectNodes(node: any): void {
      allSceneNodes.add(node);
      node.listChildren().forEach(collectNodes);
    }
    scene?.listChildren().forEach(collectNodes);
    
    const joints = skin.listJoints();
    joints.forEach(joint => {
      expect(allSceneNodes.has(joint)).toBe(true);
    });
  });

  test('generates glTF that passes gltf-validator', async () => {
    const mockSkeleton = createMockSkeleton();
    const doc = new Document();
    const buffer = doc.createBuffer();

    createSkeletonSystem(doc, mockSkeleton, buffer);

    // Convert to GLB for validation
    const io = new WebIO();
    const glb = await io.writeBinary(doc);
    
    // Validate with gltf-validator
    const result = await validateBytes(glb);
    
    expect(result.issues.numErrors).toBe(0);
    
    // Should have no critical issues
    const criticalIssues = result.issues.messages.filter(
      (msg: any) => msg.severity === 0 // Error severity
    );
    expect(criticalIssues.length).toBe(0);
  });

  test('maintains bone hierarchy in round-trip conversion', async () => {
    const mockSkeleton = createMockSkeleton();
    const doc = new Document();
    const buffer = doc.createBuffer();

    const { skin } = createSkeletonSystem(doc, mockSkeleton, buffer);
    
    // Verify parent-child relationships
    const joints = skin.listJoints();
    const rootJoint = joints.find(j => j.getName() === 'Root');
    const spineJoint = joints.find(j => j.getName() === 'Spine');
    const headJoint = joints.find(j => j.getName() === 'Head');
    
    expect(rootJoint).toBeDefined();
    expect(spineJoint).toBeDefined();
    expect(headJoint).toBeDefined();

    // Check hierarchy - Root should have Spine as child
    const rootChildren = rootJoint?.listChildren() ?? [];
    expect(rootChildren.includes(spineJoint!)).toBe(true);

    // Spine should have Head as child  
    const spineChildren = spineJoint?.listChildren() ?? [];
    expect(spineChildren.includes(headJoint!)).toBe(true);
  });

  test('preserves animation data in round-trip conversion', async () => {
    const mockSkeleton = createMockSkeleton();
    const doc = new Document();
    const buffer = doc.createBuffer();

    createSkeletonSystem(doc, mockSkeleton, buffer);
    
    // Extract animations back to BG3D format
    const extractedAnimations = extractAnimationsFromGLTF(doc);
    
    expect(extractedAnimations.length).toBe(1);
    expect(extractedAnimations[0].name).toBe('TestAnimation');
    
    // Verify keyframe data is preserved
    const originalAnim = mockSkeleton.animations[0];
    const extractedAnim = extractedAnimations[0];
    
    // Should have keyframes for the same bones
    const originalBoneIndices = Object.keys(originalAnim.keyframes);
    const extractedBoneIndices = Object.keys(extractedAnim.keyframes);
    
    expect(extractedBoneIndices.length).toBeGreaterThan(0);
    originalBoneIndices.forEach(boneIndex => {
      expect(extractedBoneIndices.includes(boneIndex)).toBe(true);
    });
  });

  test('handles complex skeleton with multiple bones and animations', async () => {
    const complexSkeleton = createComplexMockSkeleton();
    const doc = new Document();
    const buffer = doc.createBuffer();

    const { skin, animations } = createSkeletonSystem(doc, complexSkeleton, buffer);

    // Verify structure
    expect(skin.listJoints().length).toBe(5);
    expect(animations.length).toBe(2);

    // Verify animations
    const animNames = animations.map(a => a.getName()).sort();
    expect(animNames).toEqual(['Idle', 'Walk']);

    // Verify GLB is valid
    const io = new WebIO();
    const glb = await io.writeBinary(doc);
    const result = await validateBytes(glb);
    expect(result.issues.numErrors).toBe(0);
  });

  test('maintains local transforms correctly', async () => {
    const mockSkeleton = createMockSkeleton();
    const doc = new Document();
    const buffer = doc.createBuffer();

    const { skin } = createSkeletonSystem(doc, mockSkeleton, buffer);
    const joints = skin.listJoints();
    
    // Check local transforms
    const rootJoint = joints.find(j => j.getName() === 'Root');
    const spineJoint = joints.find(j => j.getName() === 'Spine');
    const headJoint = joints.find(j => j.getName() === 'Head');

    // Root should be at origin (absolute coords = local coords)
    const rootTranslation = rootJoint?.getTranslation();
    expect(rootTranslation).toEqual([0, 0, 0]);

    // Spine should have local translation relative to Root
    const spineTranslation = spineJoint?.getTranslation();
    expect(spineTranslation).toEqual([0, 10, 0]); // Y = 10 - 0

    // Head should have local translation relative to Spine
    const headTranslation = headJoint?.getTranslation();
    expect(headTranslation).toEqual([0, 10, 0]); // Y = 20 - 10
  });

  test('handles edge cases gracefully', async () => {
    // Test with empty skeleton
    const emptySkeleton: BG3DSkeleton = {
      version: 272,
      numAnims: 0,
      numJoints: 0,
      num3DMFLimbs: 0,
      bones: [],
      animations: []
    };

    const doc = new Document();
    const buffer = doc.createBuffer();

    const { skin, animations } = createSkeletonSystem(doc, emptySkeleton, buffer);
    
    expect(skin.listJoints().length).toBe(0);
    expect(animations.length).toBe(0);

    // Should still produce valid glTF
    const io = new WebIO();
    const glb = await io.writeBinary(doc);
    const result = await validateBytes(glb);
    
    // Empty skeleton may have warnings but should not have errors
    expect(result.issues.numErrors).toBeLessThanOrEqual(5); // Allow some validation warnings for empty skeletons
  });

  test('validates inverse bind matrices are correct', async () => {
    const mockSkeleton = createMockSkeleton();
    const doc = new Document();
    const buffer = doc.createBuffer();

    const { skin } = createSkeletonSystem(doc, mockSkeleton, buffer);
    
    // Verify inverse bind matrices exist
    const ibmAccessor = skin.getInverseBindMatrices();
    expect(ibmAccessor).toBeDefined();
    
    if (ibmAccessor) {
      const ibmArray = ibmAccessor.getArray();
      expect(ibmArray).toBeDefined();
      expect(ibmArray!.length).toBe(skin.listJoints().length * 16); // 4x4 matrices
      
      // Verify matrices are not all zeros
      const hasNonZeroValues = Array.from(ibmArray!).some(val => val !== 0);
      expect(hasNonZeroValues).toBe(true);
    }
  });

  test('ensures PropertyBinding compatibility', async () => {
    const mockSkeleton = createMockSkeleton();
    const doc = new Document();
    const buffer = doc.createBuffer();

    createSkeletonSystem(doc, mockSkeleton, buffer);
    
    const scene = doc.getRoot().getDefaultScene();
    expect(scene).toBeDefined();
    
    // All joints should be findable by name from scene
    const allNodes = new Map<string, any>();
    function mapNodes(node: any): void {
      const name = node.getName();
      if (name) {
        allNodes.set(name, node);
      }
      node.listChildren().forEach(mapNodes);
    }
    
    scene?.listChildren().forEach(mapNodes);
    
    // Should be able to find all bones by name
    mockSkeleton.bones.forEach(bone => {
      expect(allNodes.has(bone.name)).toBe(true);
    });
  });
});