# Otto Matic Skeleton System Analysis

## Otto Matic Source Code Analysis

### Core Skeleton Data Structures

From Otto Matic's source code (`src/System/Skeleton.h` and related files):

#### BoneDefinitionType Structure
```c
typedef struct {
    long            parentBone;         // Index to parent bone (-1 for root)
    OGLPoint3D      coord;              // **ABSOLUTE** coordinate (not relative!)
    uint16_t        numPointsAttachedToBone;
    uint16_t        *pointList;         // Vertex indices attached to this bone
    uint16_t        numNormalsAttachedToBone;  
    uint16_t        *normalList;        // Normal indices attached to this bone
} BoneDefinitionType;
```

#### JointKeyframeType Structure  
```c
typedef struct {
    int32_t     tick;                   // Time position in animation
    int32_t     accelerationMode;       // Interpolation mode
    OGLPoint3D  coord;                  // **RELATIVE** to parent bone
    OGLVector3D rotation;               // Relative rotation (Euler angles)
    OGLVector3D scale;                  // Scale factor
} JointKeyframeType;
```

### Key Insights from Otto's System

1. **Bone Coordinates**: Otto stores bone rest positions as **absolute world coordinates**
2. **Animation Coordinates**: Keyframe coordinates are **relative to parent bone**
3. **Hierarchy**: Parent-child relationships via `parentBone` index (-1 = root)
4. **Animation Timing**: Base rate of 30 FPS with `currentTime += (30.0f*fps)*skeleton->AnimSpeed`

### Otto's Resource Organization

From `src/System/File.c`:

```c
// Bone definitions: 1000 + boneIndex
GetResource('Bone', 1000 + i);

// Animation keyframes: 1000 + animIndex * 100 + boneIndex  
GetResource('KeyF', 1000 + (i*100) + j);
```

**Critical Pattern**: Each bone gets separate keyframes for each animation using the formula `1000 + animIndex*100 + boneIndex`.

## glTF 2.0 Specification Analysis

### Node Hierarchy Requirements

From https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html:

1. **Scene Graph**: All nodes must be part of a hierarchical scene graph
2. **Joint Nodes**: Each bone becomes a Node with transform data
3. **Parent-Child**: Use Node.addChild() to establish relationships
4. **Transforms**: Can use either TRS (Translation, Rotation, Scale) or matrix

### Skin Object Structure

```json
{
  "inverseBindMatrices": 4,    // Accessor to inverse bind matrices
  "joints": [1, 2, 3],         // Array of joint node indices
  "skeleton": 1                // Root joint (optional)
}
```

### Animation Object Structure

```json
{
  "channels": [
    {
      "sampler": 0,
      "target": {
        "node": 1,              // Must reference actual scene node
        "path": "translation"   // or "rotation", "scale"
      }
    }
  ],
  "samplers": [
    {
      "input": 5,               // Time accessor
      "output": 6,              // Value accessor  
      "interpolation": "LINEAR"
    }
  ]
}
```

## glTF Transform Library Analysis

From https://gltf-transform.dev/:

### Skin Creation
```typescript
const skin = document.createSkin()
  .setInverseBindMatrices(accessor)
  .setSkeleton(rootJoint);

// Add joints in order
joints.forEach(joint => skin.addJoint(joint));
```

### Animation Creation
```typescript
const animation = document.createAnimation()
  .setName('walk');

const channel = document.createAnimationChannel()
  .setTargetNode(joint)        // Must be actual Node object
  .setTargetPath('translation');

const sampler = document.createAnimationSampler()
  .setInput(timeAccessor)
  .setOutput(valueAccessor)
  .setInterpolation('LINEAR');

channel.setSampler(sampler);
animation.addChannel(channel);
```

## Critical Differences and Translation Requirements

### 1. Coordinate System Translation

| Otto Matic | glTF |
|------------|------|
| Bone rest: Absolute world coords | Node transform: Local space |
| Keyframes: Relative to parent | Animation: Relative to rest pose |
| Parent index (-1 = root) | Parent-child node relationships |

### 2. Hierarchy Construction

**Otto's Issue**: All bones currently added as root joints
**Solution Required**: Build proper parent-child hierarchy:

```typescript
// WRONG (current implementation):
bones.forEach(bone => scene.addChild(boneNode));

// CORRECT (required fix):
if (bone.parentBone >= 0) {
  parentNode.addChild(boneNode);
} else {
  scene.addChild(boneNode); // Only true roots
}
```

### 3. Transform Calculation

**Otto's absolute bone coords → glTF local transforms**:

```typescript
// For root bones (parentBone = -1):
localTransform = absoluteCoord;

// For child bones:
localTransform = absoluteCoord - parentAbsoluteCoord;
```

### 4. Animation Targeting

**Current Problem**: "No target node found for track: Pelvis.scale"
**Root Cause**: Animation channels reference joints not in scene graph

**Solution**: Ensure all joint nodes are properly added to scene before creating animations

## Implementation Strategy

### Phase 1: Fix Hierarchy Construction
1. Build proper parent-child relationships between bones
2. Calculate correct local transforms from Otto's absolute coordinates
3. Ensure only root bones are added directly to scene

### Phase 2: Fix Animation Targeting  
1. Create animations after all joints are in scene graph
2. Use proper Node references (not names) for animation channels
3. Verify joint accessibility before creating animation channels

### Phase 3: Coordinate Space Conversion
1. Convert Otto's absolute bone coordinates to glTF local transforms
2. Ensure animation keyframes work with the new coordinate system
3. Calculate proper inverse bind matrices

### Phase 4: Testing and Validation
1. Unit tests for round-trip conversion (BG3D → glTF → BG3D)
2. Visual verification that model geometry is preserved
3. Animation playback testing with console error monitoring

## Expected Results

After proper implementation:
- ✅ Model loads without vertex corruption
- ✅ Joints don't appear in model hierarchy UI
- ✅ Animations show correct durations and play properly
- ✅ No "THREE.PropertyBinding" console errors
- ✅ External glTF viewers display animations correctly