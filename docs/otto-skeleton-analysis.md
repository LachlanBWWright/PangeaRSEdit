# Otto Matic Skeleton System Analysis

## Overview
This document analyzes how Otto Matic stores skeleton and animation data, compares it with glTF Transform specifications, and provides a translation strategy.

## Otto Matic Skeleton Storage Format

### Source Code Analysis

Based on Otto Matic's source code (`src/System/File.c`, `src/System/SkeletonAnim.c`), here's how skeleton data is structured:

#### 1. Skeleton Resource Structure
```c
// From SkeletonAnim.c - skeleton file structure
typedef struct {
    short numBones;           // Number of bones in skeleton
    short numAnims;           // Number of animations  
    float animSpeed;          // Animation playback speed multiplier
    // Followed by bone data and animation data
} SkeletonHeader;
```

#### 2. Bone Data Format
```c
typedef struct {
    char name[32];            // Bone name (null-terminated string)
    short parentBone;         // Index of parent bone (-1 for root)
    Point3D coord;            // Local bone coordinates (relative to parent)
    // Bone coordinates are in Otto's coordinate system
} BoneDefinition;
```

#### 3. Animation Data Organization
Otto stores animations using a resource-based system:

- **Animation Headers**: Resource type 'Anim' with animation metadata
- **Keyframe Data**: Resource type 'KeyF' with pattern `1000 + animIndex*100 + boneIndex`
- **Timing System**: Each keyframe tick represents 1/30th of a second (30 FPS base)

```c
// Animation timing calculation from SkeletonAnim.c
float currentTime += (30.0f * fps) * skeleton->AnimSpeed;
// Where fps = 1.0/framesPerSecond, animSpeed usually = 1.0
```

#### 4. Keyframe Structure
```c
typedef struct {
    short tick;               // Time position in animation
    Point3D trans;           // Translation keyframe
    Point3D rot;             // Rotation keyframe (Euler angles)
    Point3D scale;           // Scale keyframe
} KeyFrame;
```

### Otto Coordinate System
- **Y-Up coordinate system** (Y = vertical axis)
- **Right-handed coordinate system**
- **Local bone coordinates** are relative to parent bone
- **Rotation values** stored as Euler angles in radians

---

## glTF Transform & glTF 2.0 Specification

### glTF Transform Skeleton Classes

#### 1. Skin Class
```typescript
// From gltf-transform documentation
class Skin extends ExtensibleProperty {
  getInverseBindMatrices(): Accessor | null;
  setInverseBindMatrices(accessor: Accessor | null): this;
  getSkeleton(): Node | null;
  setSkeleton(skeleton: Node | null): this;
  listJoints(): Node[];
  addJoint(joint: Node): this;
}
```

#### 2. Animation Class
```typescript
class Animation extends ExtensibleProperty {
  getName(): string;
  setName(name: string): this;
  listChannels(): AnimationChannel[];
  addChannel(channel: AnimationChannel): this;
  listSamplers(): AnimationSampler[];
  addSampler(sampler: AnimationSampler): this;
}
```

#### 3. AnimationChannel Class
```typescript
class AnimationChannel extends Property {
  getTargetNode(): Node | null;
  setTargetNode(node: Node | null): this;
  getTargetPath(): GLTF.AnimationChannelTargetPath;
  setTargetPath(path: GLTF.AnimationChannelTargetPath): this;
  getSampler(): AnimationSampler | null;
  setSampler(sampler: AnimationSampler | null): this;
}
```

### glTF 2.0 Animation Requirements

#### 1. Inverse Bind Matrices
- **Purpose**: Transform vertices from model space to bone space
- **Format**: 4x4 matrices stored as column-major float arrays
- **Calculation**: `inverseBindMatrix = inverse(globalTransform)`

#### 2. Joint Hierarchy
- **Structure**: Tree of Node objects representing bones
- **Transform**: Each node has translation, rotation, scale properties
- **Coordinate System**: Y-up, right-handed (same as Otto)

#### 3. Animation Channels
- **Target Paths**: `"translation"`, `"rotation"`, `"scale"`
- **Samplers**: Input (time) and output (values) accessors
- **Interpolation**: `"LINEAR"`, `"STEP"`, `"CUBICSPLINE"`

---

## Key Differences & Translation Strategy

### 1. Coordinate System Compatibility ✅
Both Otto and glTF use Y-up, right-handed coordinates - **no conversion needed**.

### 2. Bone Hierarchy Representation
| Otto Matic | glTF Transform |
|------------|----------------|
| `parentBone` index | Node parent-child relationships |
| Local coordinates | Node transforms |
| Flat bone array | Tree structure |

**Translation**: Build Node tree from parentBone indices.

### 3. Animation Data Format
| Otto Matic | glTF Transform |
|------------|----------------|
| Per-bone keyframe arrays | Animation channels per property |
| Euler angles | Quaternions |
| 30 FPS tick system | Time in seconds |
| Separate KeyF resources | Unified animation object |

**Translation Strategy**:
```typescript
// Otto timing to glTF time
const timeInSeconds = tick / 30.0;

// Euler to quaternion conversion
const quaternion = new THREE.Quaternion().setFromEuler(
  new THREE.Euler(rot.x, rot.y, rot.z, 'XYZ')
);
```

### 4. Inverse Bind Matrix Calculation
Otto doesn't store inverse bind matrices - they must be calculated:

```typescript
// Calculate global transform for each bone
function calculateGlobalTransform(boneIndex: number, bones: BoneData[]): Matrix4 {
  const bone = bones[boneIndex];
  let transform = new Matrix4().makeTranslation(bone.coord.x, bone.coord.y, bone.coord.z);
  
  if (bone.parentBone >= 0) {
    const parentTransform = calculateGlobalTransform(bone.parentBone, bones);
    transform.premultiply(parentTransform);
  }
  
  return transform;
}

// Create inverse bind matrix
const globalTransform = calculateGlobalTransform(boneIndex, bones);
const inverseBindMatrix = globalTransform.clone().invert();
```

---

## Implementation Plan

### Phase 1: Skeleton Structure Parsing
1. Parse skeleton header (numBones, numAnims, animSpeed)
2. Extract bone definitions with names and hierarchy
3. Build Node tree structure for joints

### Phase 2: Animation Data Extraction  
1. Parse KeyF resources using `1000 + animIndex*100 + boneIndex` pattern
2. Convert timing from ticks to seconds
3. Convert Euler rotations to quaternions
4. Organize keyframes by animation and target property

### Phase 3: glTF Transform Integration
1. Create Skin with proper inverse bind matrices
2. Build Animation objects with channels and samplers
3. Link animations to joint nodes via target paths
4. Ensure proper buffer consolidation

### Phase 4: Validation & Testing
1. Round-trip testing (BG3D → glTF → BG3D)
2. External viewer compatibility testing
3. Animation playback verification
4. Unit test coverage for all conversion functions

---

## Expected Outcomes

After implementing this strategy:

1. **Proper Skeletal Animation**: Bones will deform geometry correctly in external viewers
2. **Accurate Timing**: Animation durations will match Otto's original timing
3. **Hierarchy Preservation**: Bone relationships maintained through conversion
4. **Round-trip Integrity**: Data preserved through multiple conversions
5. **Performance**: Efficient parsing without excessive logging or computation

This analysis provides the foundation for a complete rewrite of the skeleton parsing system that properly translates between Otto Matic's format and glTF Transform's requirements.