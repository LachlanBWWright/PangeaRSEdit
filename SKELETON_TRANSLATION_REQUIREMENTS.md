# Skeleton Translation Requirements: Otto Matic ↔ glTF

## System Comparison

| Aspect | Otto Matic | glTF | Translation Required |
|--------|------------|------|---------------------|
| **Bone Positions** | Absolute world coordinates | Local transforms (relative to parent) | ✅ Convert absolute → local |
| **Hierarchy** | Parent index (-1 = root) | Node.addChild() relationships | ✅ Build scene graph properly |  
| **Animation Timing** | Ticks at 30 FPS | Seconds (float) | ✅ Convert ticks/30.0 → seconds |
| **Animation Data** | Per-bone KeyF resources | Unified animation channels | ✅ Reorganize data structure |
| **Coordinate Space** | Keyframes relative to parent | Keyframes relative to rest pose | ✅ Transform animation data |
| **Joint References** | Index-based | Node object references | ✅ Map indices to scene nodes |

## Critical Translation Requirements

### 1. Hierarchy Construction Fix

**Current Problem**: All bones treated as root joints
```typescript
// BROKEN - Current implementation
bones.forEach(bone => {
  scene.addChild(jointNode); // Everything becomes root!
});
```

**Required Solution**: Proper parent-child relationships
```typescript
// CORRECT - Required implementation
bones.forEach((bone, index) => {
  const joint = joints[index];
  
  if (bone.parentBone >= 0 && bone.parentBone < bones.length) {
    const parentJoint = joints[bone.parentBone];
    parentJoint.addChild(joint);
  } else {
    scene.addChild(joint); // Only true roots
  }
});
```

### 2. Coordinate Space Conversion

**Otto's Absolute Coordinates** → **glTF Local Transforms**

```typescript
function convertToLocalTransform(bone: BG3DBone, bones: BG3DBone[]): [number, number, number] {
  if (bone.parentBone >= 0) {
    const parent = bones[bone.parentBone];
    return [
      bone.coordX - parent.coordX,  // Local X = Absolute X - Parent X
      bone.coordY - parent.coordY,  // Local Y = Absolute Y - Parent Y
      bone.coordZ - parent.coordZ   // Local Z = Absolute Z - Parent Z
    ];
  }
  
  // Root bones: local = absolute
  return [bone.coordX, bone.coordY, bone.coordZ];
}
```

### 3. Animation Timing Conversion

**Otto's Tick System** → **glTF Seconds**

```typescript
function convertAnimationTiming(ottoTicks: number): number {
  // Otto uses 30 FPS base: currentTime += (30.0f*fps)*animSpeed
  return ottoTicks / 30.0;  // Convert to seconds
}
```

### 4. Animation Channel Organization

**Otto's KeyF Resources** → **glTF Animation Channels**

Otto stores: `KeyF[1000 + animIndex*100 + boneIndex]`
glTF needs: Unified channels per animation targeting specific nodes

```typescript
interface ProcessedAnimation {
  name: string;
  duration: number;
  channels: {
    joint: Node;           // Must reference scene node
    path: 'translation' | 'rotation' | 'scale';
    times: number[];       // In seconds
    values: number[];      // Transform values
  }[];
}
```

### 5. Joint-Animation Targeting Fix

**Current Error**: "THREE.PropertyBinding: No target node found"
**Root Cause**: Animation created before joints added to scene

**Required Sequence**:
```typescript
// 1. Create all joint nodes
const joints = createJointNodes(bones);

// 2. Build hierarchy (add to scene graph)
buildJointHierarchy(joints, bones, scene);

// 3. Create skin (joints now in scene)
const skin = createSkin(doc, joints, bones);

// 4. Create animations (joints accessible by Three.js)
const animations = createAnimations(doc, joints, animationData);
```

## Implementation Plan

### Phase 1: Core Skeleton Architecture Rewrite

#### 1.1 Replace Current Skeleton System
- Delete existing `skeletonGltfTransform.ts` 
- Create new `skeletonSystem.ts` with proper architecture
- Implement coordinate space conversion utilities

#### 1.2 Joint Node Creation
```typescript
function createJointNodes(bones: BG3DBone[]): Node[] {
  return bones.map((bone, index) => {
    const joint = doc.createNode(bone.name);
    const localTransform = convertToLocalTransform(bone, bones);
    joint.setTranslation(localTransform);
    return joint;
  });
}
```

#### 1.3 Hierarchy Construction
```typescript
function buildJointHierarchy(joints: Node[], bones: BG3DBone[], scene: Scene): void {
  // Track which joints are roots for validation
  const rootJoints: Node[] = [];
  
  bones.forEach((bone, index) => {
    const joint = joints[index];
    
    if (bone.parentBone >= 0) {
      // Child bone - add to parent
      const parentJoint = joints[bone.parentBone];
      parentJoint.addChild(joint);
    } else {
      // Root bone - add to scene
      scene.addChild(joint);
      rootJoints.push(joint);
    }
  });
  
  console.log(`Created hierarchy: ${rootJoints.length} root joints, ${joints.length - rootJoints.length} child joints`);
}
```

### Phase 2: Animation System Rebuild

#### 2.1 Animation Data Processing
```typescript
function processOttoAnimations(bg3dAnimations: BG3DAnimation[], bones: BG3DBone[]): ProcessedAnimation[] {
  return bg3dAnimations.map(anim => {
    const channels: AnimationChannel[] = [];
    let maxTime = 0;
    
    // Process each bone's keyframes for this animation
    Object.entries(anim.keyframes).forEach(([boneIndexStr, keyframes]) => {
      const boneIndex = parseInt(boneIndexStr);
      if (boneIndex >= 0 && boneIndex < bones.length && keyframes.length > 0) {
        
        // Convert timing
        const times = keyframes.map(kf => kf.tick / 30.0);
        maxTime = Math.max(maxTime, ...times);
        
        // Create channels for different transform components
        const translations = keyframes.map(kf => [kf.coordX, kf.coordY, kf.coordZ]).flat();
        if (hasVariation(translations)) {
          channels.push({
            boneIndex,
            path: 'translation',
            times,
            values: translations
          });
        }
        
        // Similar for rotation, scale...
      }
    });
    
    return {
      name: anim.name,
      duration: maxTime,
      channels
    };
  });
}
```

#### 2.2 glTF Animation Creation
```typescript
function createGltfAnimations(doc: Document, joints: Node[], processedAnimations: ProcessedAnimation[]): Animation[] {
  return processedAnimations.map(anim => {
    const gltfAnimation = doc.createAnimation(anim.name);
    
    anim.channels.forEach(channelData => {
      const joint = joints[channelData.boneIndex];
      
      // Create time accessor
      const timeAccessor = doc.createAccessor()
        .setType("SCALAR")
        .setArray(new Float32Array(channelData.times));
      
      // Create value accessor
      const valueAccessor = doc.createAccessor()
        .setType(channelData.path === 'translation' ? "VEC3" : "VEC3")  // Adjust based on path
        .setArray(new Float32Array(channelData.values));
      
      // Create sampler
      const sampler = doc.createAnimationSampler()
        .setInput(timeAccessor)
        .setOutput(valueAccessor)
        .setInterpolation("LINEAR");
      
      // Create channel
      const channel = doc.createAnimationChannel()
        .setTargetNode(joint)  // Joint is now in scene graph
        .setTargetPath(channelData.path)
        .setSampler(sampler);
      
      gltfAnimation.addChannel(channel);
    });
    
    return gltfAnimation;
  });
}
```

### Phase 3: Skin and Binding

#### 3.1 Inverse Bind Matrix Calculation
```typescript
function calculateInverseBindMatrices(bones: BG3DBone[]): Float32Array {
  const matrices = new Float32Array(bones.length * 16);
  
  bones.forEach((bone, index) => {
    // Calculate world transform for this bone
    const worldMatrix = calculateBoneWorldMatrix(bone, bones);
    
    // Invert to get inverse bind matrix
    const invMatrix = invertMatrix4(worldMatrix);
    
    // Store in column-major order (glTF requirement)
    const offset = index * 16;
    matrices.set(invMatrix, offset);
  });
  
  return matrices;
}

function calculateBoneWorldMatrix(bone: BG3DBone, bones: BG3DBone[]): Float32Array {
  // Otto stores absolute coordinates, so world matrix is translation by absolute coord
  const matrix = new Float32Array(16);
  
  // Identity matrix
  matrix[0] = matrix[5] = matrix[10] = matrix[15] = 1;
  
  // Set translation (Otto's absolute coordinates)
  matrix[12] = bone.coordX;
  matrix[13] = bone.coordY; 
  matrix[14] = bone.coordZ;
  
  return matrix;
}
```

### Phase 4: Integration and Testing

#### 4.1 Main Integration Function
```typescript
export function createSkeletonSystem(doc: Document, skeleton: BG3DSkeleton): { skin: Skin; animations: Animation[] } {
  console.log("=== Creating Skeleton System (New Implementation) ===");
  
  const scene = doc.getRoot().getDefaultScene();
  
  // 1. Create joint nodes with local transforms
  const joints = createJointNodes(skeleton.bones);
  
  // 2. Build proper hierarchy
  buildJointHierarchy(joints, skeleton.bones, scene);
  
  // 3. Create skin with inverse bind matrices
  const skin = createSkin(doc, joints, skeleton.bones);
  
  // 4. Process and create animations
  const processedAnimations = processOttoAnimations(skeleton.animations, skeleton.bones);
  const animations = createGltfAnimations(doc, joints, processedAnimations);
  
  console.log(`Skeleton system complete: ${joints.length} joints, ${animations.length} animations`);
  
  return { skin, animations };
}
```

#### 4.2 Unit Testing Requirements
```typescript
describe('Skeleton System', () => {
  test('Joint hierarchy built correctly', () => {
    // Verify only root bones added to scene
    // Verify parent-child relationships
  });
  
  test('Animation targeting works', () => {
    // Verify no "PropertyBinding" errors
    // Verify animation channels target scene nodes
  });
  
  test('Round-trip data integrity', () => {
    // BG3D + skeleton → glTF → BG3D + skeleton
    // Verify identical bone coordinates and animation data
  });
});
```

## Expected Results After Implementation

### ✅ Fixed Issues
- Model hierarchy shows only meshes (no joint nodes)
- Animations display correct durations and play properly
- No "THREE.PropertyBinding: No target node found" console errors  
- External glTF viewers display animations correctly
- Round-trip conversion preserves data integrity

### ✅ Validation Checklist
- [ ] Model loads without vertex corruption
- [ ] Joint hierarchy built correctly (parent-child relationships)
- [ ] Animation system functional (play/pause/timeline)
- [ ] Console free of PropertyBinding errors
- [ ] Screenshots show model animating properly
- [ ] Unit tests pass for round-trip conversion

This comprehensive analysis provides the roadmap for completely rebuilding the skeleton system to work correctly with both Otto Matic's data format and glTF Transform's requirements.