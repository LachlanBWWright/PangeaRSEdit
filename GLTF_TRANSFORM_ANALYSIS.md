# glTF Transform Library and Specification Analysis

## glTF Transform Core Classes

### Document Structure
```typescript
import { Document, Node, Skin, Animation } from "@gltf-transform/core";

const doc = new Document();
const scene = doc.getRoot().getDefaultScene();
```

### Node Class (Bones/Joints)
From https://gltf-transform.dev/modules/core/classes/Node:

```typescript
// Create joint node
const joint = doc.createNode(name)
  .setTranslation([x, y, z])    // Local position
  .setRotation([x, y, z, w])    // Quaternion
  .setScale([x, y, z]);         // Scale factors

// Hierarchy
parentNode.addChild(joint);     // Establishes parent-child relationship
scene.addChild(rootJoint);      // Only for root joints
```

**Critical Requirements**:
- Each bone must be a Node with local transform
- Parent-child relationships via `addChild()`
- All animated nodes must be in scene graph

### Skin Class  
From https://gltf-transform.dev/modules/core/classes/Skin:

```typescript
const skin = doc.createSkin(name)
  .setSkeleton(rootJoint)                    // Optional root joint
  .setInverseBindMatrices(ibmAccessor);      // Required for skinning

// Add joints in bone index order
joints.forEach(joint => skin.addJoint(joint));
```

**Inverse Bind Matrices**:
- Must be MAT4 accessor (16 floats per joint)
- Transforms from local space to bone space
- Formula: `inverseBindMatrix = inverse(boneWorldMatrix)`

### Animation Class
From https://gltf-transform.dev/modules/core/classes/Animation:

```typescript
const animation = doc.createAnimation(name);

// Create channel for each animated property
const channel = doc.createAnimationChannel()
  .setTargetNode(joint)              // Must be Node object in scene
  .setTargetPath('translation');     // 'translation', 'rotation', 'scale'

const sampler = doc.createAnimationSampler()
  .setInput(timeAccessor)            // Time values in seconds
  .setOutput(valueAccessor)          // Transform values
  .setInterpolation('LINEAR');       // 'LINEAR', 'STEP', 'CUBICSPLINE'

channel.setSampler(sampler);
animation.addChannel(channel);
```

## glTF 2.0 Specification Requirements

### Scene Graph Structure
From https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#scenes:

1. **Hierarchical**: All nodes form a tree structure
2. **Reference by Index**: Nodes referenced by array index, not name
3. **Transform Inheritance**: Child transforms relative to parent
4. **Root Nodes**: Only root nodes added directly to scene

### Skin Requirements

```json
{
  "inverseBindMatrices": 4,
  "joints": [1, 2, 3, 4],        // Node indices, not names
  "skeleton": 1                   // Optional root joint index
}
```

**Key Points**:
- `joints` array must reference actual scene nodes
- Inverse bind matrices required for proper deformation
- Joint order matters for vertex skinning

### Animation Requirements

```json
{
  "channels": [
    {
      "sampler": 0,
      "target": {
        "node": 1,                // Must exist in scene.nodes
        "path": "translation"
      }
    }
  ],
  "samplers": [
    {
      "input": 5,                 // Time accessor
      "output": 6,                // Value accessor
      "interpolation": "LINEAR"
    }
  ]
}
```

**Critical Requirements**:
- Target nodes must exist in scene graph
- Time values in seconds (not ticks)
- Value accessors match target path type

## Current Implementation Issues

### Problem 1: Incorrect Hierarchy
**Current Code**:
```typescript
// ALL bones added as root joints (WRONG)
bones.forEach(bone => {
  console.log(`${bone.name} -> root joint`);
  scene.addChild(jointNode);
});
```

**Correct Approach**:
```typescript
// Build proper hierarchy based on parentBone
bones.forEach((bone, index) => {
  if (bone.parentBone >= 0) {
    const parentJoint = joints[bone.parentBone];
    parentJoint.addChild(jointNode);
  } else {
    scene.addChild(jointNode);  // Only true roots
  }
});
```

### Problem 2: Coordinate Space Confusion
**Otto's System**: Bone coordinates are absolute world positions
**glTF Requirement**: Node transforms are local to parent

**Solution**:
```typescript
function calculateLocalTransform(bone: BG3DBone, bones: BG3DBone[]): [number, number, number] {
  if (bone.parentBone >= 0) {
    const parent = bones[bone.parentBone];
    return [
      bone.coordX - parent.coordX,
      bone.coordY - parent.coordY, 
      bone.coordZ - parent.coordZ
    ];
  }
  return [bone.coordX, bone.coordY, bone.coordZ];
}
```

### Problem 3: Animation Targeting Failures
**Current Error**: "THREE.PropertyBinding: No target node found for track: Pelvis.scale"

**Root Cause**: Animation channels created before joints added to scene

**Fix**:
```typescript
// 1. Create all joints
const joints = bones.map(bone => doc.createNode(bone.name));

// 2. Build hierarchy and add to scene  
buildHierarchy(joints, bones, scene);

// 3. THEN create animations (joints now in scene)
const animations = createAnimations(joints, animationData);
```

## Proper Implementation Pattern

### Step 1: Create Joint Nodes
```typescript
const joints: Node[] = bones.map((bone, index) => {
  const joint = doc.createNode(bone.name);
  const localTransform = calculateLocalTransform(bone, bones);
  joint.setTranslation(localTransform);
  return joint;
});
```

### Step 2: Build Hierarchy
```typescript
function buildJointHierarchy(joints: Node[], bones: BG3DBone[], scene: Scene) {
  bones.forEach((bone, index) => {
    const joint = joints[index];
    
    if (bone.parentBone >= 0 && bone.parentBone < joints.length) {
      const parentJoint = joints[bone.parentBone];
      parentJoint.addChild(joint);
    } else {
      scene.addChild(joint);  // Root joint only
    }
  });
}
```

### Step 3: Create Skin
```typescript
function createSkin(doc: Document, joints: Node[], bones: BG3DBone[]): Skin {
  const skin = doc.createSkin("skeleton");
  
  // Add joints in order
  joints.forEach(joint => skin.addJoint(joint));
  
  // Calculate inverse bind matrices
  const ibmData = calculateInverseBindMatrices(bones);
  const ibmAccessor = doc.createAccessor()
    .setType("MAT4")
    .setArray(ibmData);
    
  skin.setInverseBindMatrices(ibmAccessor);
  return skin;
}
```

### Step 4: Create Animations
```typescript
function createAnimations(doc: Document, joints: Node[], animData: ProcessedAnimation[]): Animation[] {
  return animData.map(anim => {
    const animation = doc.createAnimation(anim.name);
    
    anim.bones.forEach(boneAnim => {
      const joint = joints[boneAnim.boneIndex];
      
      // Create channels for translation, rotation, scale as needed
      if (boneAnim.hasTranslation) {
        const channel = createAnimationChannel(doc, joint, 'translation', boneAnim.translationData);
        animation.addChannel(channel);
      }
      // ... similar for rotation, scale
    });
    
    return animation;
  });
}
```

## Validation Checklist

### Scene Graph Validation
- [ ] Only root bones added directly to scene
- [ ] All parent-child relationships established correctly
- [ ] No joints appear in model hierarchy UI
- [ ] All animated joints accessible from scene

### Animation Validation  
- [ ] No "PropertyBinding" console errors
- [ ] All animation channels target valid scene nodes
- [ ] Animation durations display correctly
- [ ] Playback controls functional

### Round-Trip Validation
- [ ] BG3D + skeleton → glTF preserves geometry
- [ ] glTF → BG3D + skeleton maintains data integrity
- [ ] External glTF viewers display animations correctly

This comprehensive analysis provides the foundation for rebuilding the skeleton system correctly.