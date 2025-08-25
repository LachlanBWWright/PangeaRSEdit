# glTF Transform Implementation Guide

## Overview
This document provides detailed implementation guidance for using glTF Transform to create proper skeletal animations from Otto Matic data.

## Core glTF Transform Classes

### 1. Document Structure
```typescript
import { Document, NodeIO, Material, Mesh, Primitive, Accessor, Buffer } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

// Create document with all extensions
const doc = new Document();
doc.createBuffer(); // Single buffer for all data
```

### 2. Node Hierarchy Creation
```typescript
// Create joint nodes with proper hierarchy
function createJointHierarchy(bones: BoneData[]): Node[] {
  const joints: Node[] = [];
  
  // Create all joint nodes first
  for (const bone of bones) {
    const joint = doc.createNode(bone.name)
      .setTranslation([bone.coord.x, bone.coord.y, bone.coord.z]);
    joints.push(joint);
  }
  
  // Establish parent-child relationships
  for (let i = 0; i < bones.length; i++) {
    const bone = bones[i];
    if (bone.parentBone >= 0 && bone.parentBone < joints.length) {
      joints[bone.parentBone].addChild(joints[i]);
    }
  }
  
  return joints;
}
```

### 3. Skin Creation with Inverse Bind Matrices
```typescript
import { Mat4 } from 'gl-matrix';

function createSkin(joints: Node[], bones: BoneData[]): Skin {
  const skin = doc.createSkin();
  
  // Calculate inverse bind matrices
  const inverseBindMatrices: number[] = [];
  
  for (let i = 0; i < bones.length; i++) {
    const globalTransform = calculateBoneGlobalTransform(i, bones);
    const inverseBindMatrix = Mat4.invert(Mat4.create(), globalTransform);
    
    // Add 16 matrix elements (column-major order)
    inverseBindMatrices.push(...inverseBindMatrix);
  }
  
  // Create accessor for inverse bind matrices
  const buffer = doc.getRoot().listBuffers()[0];
  const inverseBindAccessor = doc.createAccessor()
    .setArray(new Float32Array(inverseBindMatrices))
    .setType(Accessor.Type.MAT4)
    .setBuffer(buffer);
  
  skin.setInverseBindMatrices(inverseBindAccessor);
  
  // Add all joints to skin
  joints.forEach(joint => skin.addJoint(joint));
  
  return skin;
}

function calculateBoneGlobalTransform(boneIndex: number, bones: BoneData[]): Mat4 {
  const bone = bones[boneIndex];
  const localTransform = Mat4.fromTranslation(Mat4.create(), [bone.coord.x, bone.coord.y, bone.coord.z]);
  
  if (bone.parentBone >= 0) {
    const parentTransform = calculateBoneGlobalTransform(bone.parentBone, bones);
    return Mat4.multiply(Mat4.create(), parentTransform, localTransform);
  }
  
  return localTransform;
}
```

### 4. Animation Creation
```typescript
import { Quat, Vec3 } from 'gl-matrix';

function createAnimations(animationData: AnimationData[], joints: Node[]): Animation[] {
  const animations: Animation[] = [];
  
  for (const animData of animationData) {
    const animation = doc.createAnimation(animData.name);
    
    // Process each bone's keyframes
    for (let boneIndex = 0; boneIndex < joints.length; boneIndex++) {
      const boneKeyframes = animData.boneKeyframes[boneIndex];
      if (!boneKeyframes || boneKeyframes.length === 0) continue;
      
      const joint = joints[boneIndex];
      
      // Create separate channels for translation, rotation, scale
      createTranslationChannel(animation, joint, boneKeyframes);
      createRotationChannel(animation, joint, boneKeyframes);
      createScaleChannel(animation, joint, boneKeyframes);
    }
    
    animations.push(animation);
  }
  
  return animations;
}

function createTranslationChannel(animation: Animation, joint: Node, keyframes: KeyframeData[]) {
  if (keyframes.every(kf => Vec3.exactEquals(kf.translation, [0, 0, 0]))) return;
  
  const times: number[] = [];
  const values: number[] = [];
  
  for (const keyframe of keyframes) {
    times.push(keyframe.tick / 30.0); // Convert to seconds
    values.push(keyframe.translation[0], keyframe.translation[1], keyframe.translation[2]);
  }
  
  const buffer = doc.getRoot().listBuffers()[0];
  
  const inputAccessor = doc.createAccessor()
    .setArray(new Float32Array(times))
    .setType(Accessor.Type.SCALAR)
    .setBuffer(buffer);
    
  const outputAccessor = doc.createAccessor()
    .setArray(new Float32Array(values))
    .setType(Accessor.Type.VEC3)
    .setBuffer(buffer);
  
  const sampler = doc.createAnimationSampler()
    .setInput(inputAccessor)
    .setOutput(outputAccessor)
    .setInterpolation('LINEAR');
  
  const channel = doc.createAnimationChannel()
    .setTargetNode(joint)
    .setTargetPath('translation')
    .setSampler(sampler);
  
  animation.addChannel(channel).addSampler(sampler);
}

function createRotationChannel(animation: Animation, joint: Node, keyframes: KeyframeData[]) {
  const times: number[] = [];
  const values: number[] = [];
  
  for (const keyframe of keyframes) {
    times.push(keyframe.tick / 30.0);
    
    // Convert Euler angles to quaternion
    const euler = keyframe.rotation; // [x, y, z] in radians
    const quaternion = Quat.fromEuler(Quat.create(), 
      euler[0] * 180 / Math.PI, 
      euler[1] * 180 / Math.PI, 
      euler[2] * 180 / Math.PI
    );
    
    values.push(quaternion[0], quaternion[1], quaternion[2], quaternion[3]);
  }
  
  const buffer = doc.getRoot().listBuffers()[0];
  
  const inputAccessor = doc.createAccessor()
    .setArray(new Float32Array(times))
    .setType(Accessor.Type.SCALAR)
    .setBuffer(buffer);
    
  const outputAccessor = doc.createAccessor()
    .setArray(new Float32Array(values))
    .setType(Accessor.Type.VEC4)
    .setBuffer(buffer);
  
  const sampler = doc.createAnimationSampler()
    .setInput(inputAccessor)
    .setOutput(outputAccessor)
    .setInterpolation('LINEAR');
  
  const channel = doc.createAnimationChannel()
    .setTargetNode(joint)
    .setTargetPath('rotation')
    .setSampler(sampler);
  
  animation.addChannel(channel).addSampler(sampler);
}
```

### 5. Mesh Skinning
```typescript
function applySkinToMeshes(meshes: Mesh[], skin: Skin, joints: Node[]) {
  for (const mesh of meshes) {
    const primitives = mesh.listPrimitives();
    
    for (const primitive of primitives) {
      // Ensure joint and weight attributes exist
      const jointsAccessor = primitive.getAttribute('JOINTS_0');
      const weightsAccessor = primitive.getAttribute('WEIGHTS_0');
      
      if (jointsAccessor && weightsAccessor) {
        // Apply skin to primitive
        primitive.getMaterial()?.setExtension('KHR_materials_unlit', doc.createExtension('KHR_materials_unlit'));
      }
    }
  }
  
  // Create skinned node
  const skinnedNode = doc.createNode('SkinnedMesh');
  meshes.forEach(mesh => {
    const meshNode = doc.createNode().setMesh(mesh).setSkin(skin);
    skinnedNode.addChild(meshNode);
  });
  
  return skinnedNode;
}
```

### 6. Buffer Management
```typescript
function consolidateBuffers(doc: Document) {
  // Ensure single buffer usage (required for GLB format)
  const buffers = doc.getRoot().listBuffers();
  
  if (buffers.length > 1) {
    // Merge all buffers into first one
    const primaryBuffer = buffers[0];
    
    for (let i = 1; i < buffers.length; i++) {
      const buffer = buffers[i];
      
      // Move all accessors to primary buffer
      doc.getRoot().listAccessors().forEach(accessor => {
        if (accessor.getBuffer() === buffer) {
          accessor.setBuffer(primaryBuffer);
        }
      });
      
      // Remove secondary buffer
      buffer.dispose();
    }
  }
}
```

## Best Practices

### 1. Error Handling
```typescript
function validateSkeletonData(bones: BoneData[]): boolean {
  // Check for circular dependencies
  for (let i = 0; i < bones.length; i++) {
    const visited = new Set<number>();
    let current = i;
    
    while (current >= 0) {
      if (visited.has(current)) return false; // Circular dependency
      visited.add(current);
      current = bones[current].parentBone;
    }
  }
  
  return true;
}
```

### 2. Performance Optimization
```typescript
// Cache frequently accessed data
const boneNameToIndex = new Map<string, number>();
bones.forEach((bone, index) => {
  boneNameToIndex.set(bone.name, index);
});

// Batch accessor creation
const accessorBatch: Float32Array[] = [];
// ... collect all arrays first
// Then create accessors in batch
```

### 3. Debugging Support
```typescript
function validateGltfDocument(doc: Document): ValidationResult {
  const validator = new GLTFValidator();
  return validator.validate(doc);
}

function logSkeletonInfo(bones: BoneData[], animations: Animation[]) {
  console.log(`Skeleton: ${bones.length} bones, ${animations.length} animations`);
  bones.forEach((bone, i) => {
    console.log(`Bone ${i}: ${bone.name} (parent: ${bone.parentBone})`);
  });
}
```

## Integration with Three.js

### Loading and Playing Animations
```typescript
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { AnimationMixer } from 'three';

const loader = new GLTFLoader();
loader.load('model.glb', (gltf) => {
  const mixer = new AnimationMixer(gltf.scene);
  
  // Create actions for each animation
  gltf.animations.forEach(clip => {
    const action = mixer.clipAction(clip);
    // Configure and play animation
  });
  
  // Update in render loop
  function animate() {
    mixer.update(deltaTime);
    renderer.render(scene, camera);
  }
});
```

This implementation guide ensures proper glTF Transform usage for Otto Matic skeleton conversion while maintaining compatibility with Three.js animation systems.