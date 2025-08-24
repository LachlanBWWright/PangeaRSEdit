# Otto Matic Skeleton System Analysis

## Otto Matic Skeleton Data Storage

Based on analysis of Otto Matic's source code, skeleton data is stored in `.skeleton.rsrc` resource files with the following structure:

### Resource Types

1. **Hedr (Header)** - Contains skeleton metadata
2. **Bone** - Bone definition with name and hierarchy
3. **BonP** - Bone position data (joint coordinates)
4. **BonN** - Bone normal data (orientation vectors)
5. **RelP** - Relative point offsets for mesh deformation
6. **AnHd** - Animation header (name, duration, etc.)
7. **Evnt** - Event data for animations
8. **NumK** - Number of keyframes per bone per animation
9. **KeyF** - Keyframe data (position, rotation per tick)

### Animation System

Otto uses a 30 FPS animation system where:
- Each animation tick represents 1/30th of a second
- Animation duration = `maxTick / 30.0`
- KeyF resources are organized as: `1000 + animIndex*100 + boneIndex`
- Each bone can have different numbers of keyframes per animation

### Coordinate System

- Uses a right-handed coordinate system
- Bone coordinates are stored as relative offsets from parent
- Position data is stored as big-endian float32 values
- Rotation data is stored as Euler angles

### Hierarchy

Bones form a tree structure where:
- Each bone has a `parentBone` index (-1 for root)
- Multiple root bones are allowed
- Circular dependencies are prevented during parsing

## Example Structure

For a character with 16 bones and 35 animations:
- 16 Bone resources (1000-1015)
- 16 BonP resources (1000-1015)  
- 16 BonN resources (1000-1015)
- 35 AnHd resources (1000-1034)
- 560 KeyF resources (1000-4415) organized as bone-animation pairs

## Animation Playback

Otto's animation system uses:
```c
currentTime += (30.0f * fps) * skeleton->AnimSpeed
```

Where:
- `fps` = 1/framerate (typically 1/60 = 0.0167)
- `AnimSpeed` = animation speed multiplier (usually 1.0)
- This results in 30 units per second of game time