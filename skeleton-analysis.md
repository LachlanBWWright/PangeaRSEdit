# Otto Matic Skeleton Data Analysis

This document analyzes how Otto Matic stores skeleton data and how it should be translated to glTF format.

## Otto Matic Skeleton Storage

### 1. Skeleton File Structure
Based on analysis of Otto Matic source code in `/games/ottomatic/src/Skeleton/`:

#### SkeletonAnim.c - Animation System
- Animation timing uses `30*fps*animSpeed` formula
- Each animation has keyframes stored in KeyF resources
- Timing calculation: `currentTime += (30.0f*fps)*skeleton->AnimSpeed`

#### SkeletonObj.c - Skeleton Objects
- Skeleton files contain bone hierarchy data
- Each bone has a transformation matrix
- Bones are organized in parent-child relationships

#### SkeletonJoints.c - Joint System
- Joints connect bones together
- Joint positions are relative to parent bones
- Joint rotations are stored as matrices or quaternions

#### Bones.c - Bone Data
- Each bone has a local transformation matrix
- Bone coordinates are stored relative to parent
- Bone names and hierarchy information

### 2. Resource Format Analysis

From examining Otto Matic source code in File.c and structs.h:

**Skeleton File Structure (.rsrc format):**
- `'Hedr'` (1000): Header with numAnims, numJoints, version
- `'Bone'` (1000+i): Bone definition for joint i with parent index, coordinates, point/normal counts
- `'BonP'` (1000+i): Point indices attached to bone i  
- `'BonN'` (1000+i): Normal indices attached to bone i
- `'AnHd'` (1000+i): Animation header for animation i with numAnimEvents
- `'Evnt'` (1000+i): Animation events for animation i
- `'NumK'` (1000+i): Number of keyframes per joint for animation i
- `'KeyF'` (1000+animIndex*100+jointIndex): Keyframes for specific joint in specific animation

**Key Data Structures:**
```c
typedef struct {
    int32_t     tick;                   // time at which this state exists
    int32_t     accelerationMode;       // mode of in/out acceleration  
    OGLPoint3D  coord;                  // current 3D coords (relative to parent)
    OGLVector3D rotation;               // current rotation values (relative)
    OGLVector3D scale;                  // current scale values
} JointKeyframeType;

typedef struct {
    long            parentBone;         // index to parent bone (-1 for root)
    OGLPoint3D      coord;              // absolute coord (not relative to parent!)
    uint16_t        numPointsAttachedToBone;
    uint16_t        *pointList;         // indices into decomposed point list
    uint16_t        numNormalsAttachedToBone;  
    uint16_t        *normalList;        // indices into decomposed normals list
} BoneDefinitionType;
```

### 3. Animation Data Storage

### 3. Animation Data Storage

**Animation Timing (from SkeletonAnim.c line 203):**
```c
currentTime += (30.0f*fps)*skeleton->AnimSpeed;  // 30 units per frame at normal speed
```
- Base timing: 30 units per frame 
- FPS factor: `gFramesPerSecondFrac` (typically 1/60 for 60 FPS)
- Animation speed multiplier: usually 1.0
- **Duration calculation: `ticks / 30.0` seconds**

**KeyF Resource Pattern (from File.c line 418):**
```c
hand = GetResource('KeyF', 1000+(i*100)+j);  // i=animIndex, j=jointIndex
```
- Each joint gets separate keyframes for each animation
- Resource ID formula: `1000 + animIndex * 100 + jointIndex`
- Keyframes contain: tick, accelerationMode, coord (relative), rotation, scale

**Bone Hierarchy (from structs.h):**
- Parent-child relationships via `parentBone` index (-1 for root)
- Bone coordinates are **absolute** (not relative to parent) - this is key!
- Joint keyframe coordinates are **relative** to parent bone
- Point/normal lists reference decomposed geometry vertices

## glTF Transform Documentation Analysis

### 1. glTF Transform Skin Class
From https://gltf-transform.dev/modules/core/classes/Skin:

```typescript
// Creating a skin
const skin = document.createSkin()
  .setInverseBindMatrices(accessor)
  .setSkeleton(rootJoint);

// Adding joints to skin
skin.listJoints().forEach((joint, index) => {
  // Joint setup
});
```

Key properties:
- `inverseBindMatrices`: Accessor containing inverse bind matrices for each joint
- `skeleton`: Root joint of the skeleton hierarchy
- `joints`: Array of joints that make up the skeleton

### 2. glTF Transform Animation Class
From https://gltf-transform.dev/modules/core/classes/Animation:

```typescript
// Creating an animation
const animation = document.createAnimation()
  .setName('walk');

// Creating channels and samplers
const channel = document.createAnimationChannel()
  .setTargetNode(joint)
  .setTargetPath('translation'); // or 'rotation', 'scale'

const sampler = document.createAnimationSampler()
  .setInput(timeAccessor)
  .setOutput(valueAccessor)
  .setInterpolation('LINEAR');

channel.setSampler(sampler);
animation.addChannel(channel);
```

Key components:
- `AnimationChannel`: Links a sampler to a target node and property
- `AnimationSampler`: Contains keyframe timing and values
- Target paths: 'translation', 'rotation', 'scale'

### 3. glTF 2.0 Specification Analysis
From https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html:

#### Skin Object:
```json
{
  "inverseBindMatrices": 4,
  "joints": [1, 2, 3],
  "skeleton": 1
}
```

#### Animation Object:
```json
{
  "channels": [
    {
      "sampler": 0,
      "target": {
        "node": 1,
        "path": "translation"
      }
    }
  ],
  "samplers": [
    {
      "input": 5,
      "output": 6,
      "interpolation": "LINEAR"
    }
  ]
}
```

## Data Translation Requirements

### 1. Coordinate System Differences

**Otto Matic:**
- Uses right-handed coordinate system
- Bone coordinates relative to parent
- Matrix format: 4x4 transformation matrices

**glTF:**
- Uses right-handed coordinate system
- Node transforms in local space
- Supports TRS (Translation, Rotation, Scale) or matrix format

### 2. Animation Data Conversion

**Otto Matic KeyF Resources:**
- Separate resources per bone per animation
- Timing based on 30 FPS with animSpeed multiplier
- Matrix-based transformations

**glTF Animations:**
- Unified animation structure with channels and samplers
- Time values in seconds
- Separate channels for translation, rotation, scale

### 3. Skeleton Hierarchy Translation

**Otto Matic:**
- Bone hierarchy with parent-child relationships
- Joint positions and orientations
- Inverse bind matrices calculated from bone rest poses

**glTF:**
- Node hierarchy representing joints
- Skin object linking geometry to skeleton
- Inverse bind matrices in accessor data

## Implementation Strategy

### 1. Parse Otto Skeleton Data
- Extract bone hierarchy from skeleton resources
- Parse KeyF animation data for each bone
- Calculate proper inverse bind matrices

### 2. Create glTF Node Hierarchy
- Create nodes for each bone/joint
- Set up parent-child relationships
- Apply local transformations

### 3. Generate Skin Object
- Calculate inverse bind matrices correctly
- Link skin to mesh geometry
- Reference all joints in hierarchy

### 4. Build Animation Structure
- Create separate animations for each Otto animation
- Convert KeyF data to glTF channels and samplers
- Apply correct timing conversion (30 FPS base)

### 5. Validate Round-trip Conversion
- Ensure BG3D + skeleton → glTF → BG3D produces identical results
- Test animation playback in glTF viewers
- Verify geometry integrity with skeletal deformation