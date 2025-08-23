# Translation Between Otto Matic and glTF

## Overview

Converting between Otto Matic's skeleton format and glTF requires careful mapping of data structures and coordinate systems.

## Data Type Mapping

### Timing System
- **Otto**: Integer ticks at 30 FPS → **glTF**: Float seconds
- **Conversion**: `glTFTime = ottoTick / 30.0`

### Rotation Data  
- **Otto**: Euler angles (X, Y, Z radians) → **glTF**: Quaternions (X, Y, Z, W)
- **Conversion**: Use Three.js `Euler.setFromRotationMatrix()` or manual conversion

### Position Data
- **Otto**: Relative coordinates to parent → **glTF**: Absolute world coordinates  
- **Conversion**: Apply parent transforms recursively

### Hierarchy Structure
- **Otto**: Flat array with `parentBone` indices → **glTF**: Scene graph nodes
- **Conversion**: Build parent-child relationships using `node.addChild()`

## Key Challenges

### 1. Resource Organization
Otto stores keyframes in separate KeyF resources per bone/animation:
```
KeyF 1000 = Animation 0, Bone 0
KeyF 1001 = Animation 0, Bone 1  
KeyF 1100 = Animation 1, Bone 0
```

glTF uses unified samplers with all keyframes combined:
```javascript
sampler.setInput([0, 0.33, 0.67, 1.0])    // Times for all bones
sampler.setOutput([pos1, pos2, pos3, pos4])  // Positions for all bones
```

### 2. Animation Channels
Otto has implicit channels (position always animated), glTF requires explicit channels:

```typescript
// Must create separate channels for translation, rotation, scale
const transChannel = animation.createChannel()
    .setTargetNode(joint)
    .setTargetPath('translation')
    .setSampler(translationSampler);

const rotChannel = animation.createChannel()
    .setTargetNode(joint)  
    .setTargetPath('rotation')
    .setSampler(rotationSampler);
```

### 3. Skinning Setup
Otto uses simple bone indices, glTF requires inverse bind matrices:

```typescript
// Calculate inverse bind matrix for each joint
const jointMatrix = new Matrix4();
getJointWorldMatrix(joint, jointMatrix);
const inverseBindMatrix = jointMatrix.invert();

skin.setInverseBindMatrices(accessor);
```

## Implementation Strategy

### Phase 1: Parse Otto Data
1. Load skeleton.rsrc using TypeScript rsrcdump
2. Extract bone hierarchy from Bone resources
3. Parse animation data from KeyF resources
4. Convert timing from ticks to seconds

### Phase 2: Build glTF Structure  
1. Create Document and Scene
2. Build joint hierarchy as Nodes
3. Create Animation with Channels and Samplers
4. Setup Skin with inverse bind matrices

### Phase 3: Data Conversion
1. Convert Euler rotations to quaternions
2. Organize keyframes into unified arrays
3. Create proper sampler input/output data
4. Link channels to target nodes

### Phase 4: Integration
1. Add all joints to scene graph
2. Apply skin to meshes for deformation
3. Validate animation targeting
4. Export as GLB format

## Code Example

```typescript
function convertOttoToGLTF(ottoSkeleton: OttoSkeleton): Document {
    const doc = new Document();
    const scene = doc.createScene();
    
    // Create joints
    const joints = ottoSkeleton.bones.map(bone => {
        const joint = doc.createNode(bone.name);
        joint.setTranslation([bone.x, bone.y, bone.z]);
        return joint;
    });
    
    // Build hierarchy
    ottoSkeleton.bones.forEach((bone, i) => {
        if (bone.parentBone >= 0) {
            joints[bone.parentBone].addChild(joints[i]);
        } else {
            scene.addChild(joints[i]);
        }
    });
    
    // Create animations
    ottoSkeleton.animations.forEach(anim => {
        const animation = doc.createAnimation(anim.name);
        
        // Convert keyframes to glTF format
        const timeArray = [];
        const posArray = [];
        
        anim.keyframes.forEach(kf => {
            timeArray.push(kf.tick / 30.0);
            posArray.push(...kf.position);
        });
        
        // Create samplers and channels
        const sampler = doc.createAnimationSampler()
            .setInput(doc.createAccessor().setArray(timeArray))
            .setOutput(doc.createAccessor().setArray(posArray))
            .setInterpolation('LINEAR');
            
        const channel = doc.createAnimationChannel()
            .setTargetNode(joints[anim.boneIndex])
            .setTargetPath('translation')
            .setSampler(sampler);
            
        animation.addChannel(channel);
    });
    
    return doc;
}
```

## Validation Steps

1. **Hierarchy Check**: Verify all joints have proper parent-child relationships
2. **Animation Targeting**: Ensure channels can find their target nodes
3. **Timing Validation**: Confirm animation durations are correct
4. **Round-trip Test**: Convert Otto→glTF→Otto and compare data integrity
5. **External Viewer Test**: Load in Blender/glTF Viewer to verify functionality