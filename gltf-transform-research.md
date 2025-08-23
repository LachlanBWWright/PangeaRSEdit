# glTF-Transform Documentation Research

## Key Findings from gltf-transform.dev Documentation

### Skin Class (https://gltf-transform.dev/modules/core/classes/Skin)

**Purpose**: Defines a bind pose and joint matrices for skeletal animation.

**Key Methods:**
- `addJoint(joint: Node)`: Adds a joint to the skin
- `setInverseBindMatrices(accessor: Accessor)`: Sets inverse bind matrices for skin joints
- `setName(name: string)`: Sets skin name
- `setSkeleton(joint: Node)`: Sets root skeleton joint (optional)

**Critical Requirements:**
1. **Joints must be Nodes** - each bone becomes a glTF Node with transform data
2. **Inverse Bind Matrices** - Must be MAT4 accessor with 16 floats per joint 
3. **Joint Hierarchy** - Use Node.addChild() to establish parent/child relationships
4. **Scene Integration** - Joints must be added to scene graph to be found by animations

### Animation Class (https://gltf-transform.dev/modules/core/classes/Animation)

**Purpose**: Defines keyframe animation data using channels and samplers.

**Key Components:**
- `AnimationSampler`: Defines interpolation between keyframes (input/output data)
- `AnimationChannel`: Targets specific Node properties (translation/rotation/scale)

**Critical Requirements:**
1. **Samplers need input/output accessors**: Time values and transformation data
2. **Channels target Node properties**: Must reference actual scene nodes 
3. **Node targeting**: Channel.setTargetNode() must reference nodes in scene graph

### glTF 2.0 Specification Key Points

**Scene Graph Structure:**
- All animated nodes must be part of the scene graph
- Animation channels target nodes by reference, not by name
- Skin joints must also be nodes in the scene

**Animation Targeting:**
- Channels target Node objects directly via setTargetNode()
- Target paths: "translation", "rotation", "scale"
- Nodes must exist in document's node list to be targetable

## Current Issues Identified

### 1. Joint Naming vs. Node Reference Problem
**Issue**: Animation channels are looking for joints by name ("Pelvis", "Torso", etc.) but Three.js expects to find actual Node objects in the scene graph.

**Root Cause**: The joints are being added to the document but may not be properly referenced by animation channels.

### 2. Scale Coordination Issues  
**Issue**: User reports model scale has increased.

**Root Cause**: Multiple scale transformations being applied:
- Joint positions: `scale = 0.01` (line 279)
- Animation keyframes: `scale = 0.01` (line 512)
- This could be scaling twice or inconsistently

### 3. Scene Graph Integration
**Issue**: THREE.js warnings about "No target node found for track"

**Root Cause**: Animation channels may not be finding their target joints in the loaded scene.

## Required Fixes

### 1. Fix Joint-Animation Targeting
- Ensure all joints are properly added to document node list
- Verify animation channels use setTargetNode() with actual joint Node objects
- Check that joint hierarchy is correctly established in scene

### 2. Consolidate Scaling
- Use consistent scale factor across joint positions and animations
- Consider removing scale factor and using Otto's native coordinates
- Ensure inverse bind matrices account for any scaling

### 3. Validate Scene Graph Structure
- Ensure root joints are added to scene
- Verify all joints are discoverable by animations
- Test that joint names match expected animation targets

### 4. Round-trip Testing
- Implement comprehensive BG3D+Skeleton → GLB → BG3D tests
- Verify animation data preservation through conversion cycles
- Test model geometry integrity with/without skeleton data

## Implementation Plan

1. **Fix scale consistency** - Use single scale factor or remove scaling entirely
2. **Verify joint scene integration** - Ensure all joints are properly added to scene graph  
3. **Test animation channel targeting** - Verify channels can find their target joints
4. **Implement round-trip validation** - Create tests that verify data integrity
5. **Manual testing** - Verify animations play without console errors