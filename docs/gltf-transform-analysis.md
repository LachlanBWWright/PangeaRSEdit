# glTF Transform Library Analysis

## Core Components

glTF Transform provides these key classes for skeletal animation:

### Document Management
- `Document` - Root container for all glTF data
- `Scene` - Contains nodes and their hierarchy

### Skeletal Structure
- `Node` - Represents joints/bones in the skeleton
- `Skin` - Defines skinning information (joints, inverse bind matrices)

### Animation System  
- `Animation` - Container for animation channels and samplers
- `AnimationChannel` - Links sampler data to specific node properties
- `AnimationSampler` - Contains keyframe timing and interpolation data
- `Accessor` - Raw binary data arrays (positions, rotations, etc.)

## Animation Structure

glTF animations follow this hierarchy:
```
Animation
├── Channel 1 (targets Node.translation)
│   └── Sampler (INPUT: time, OUTPUT: positions)
├── Channel 2 (targets Node.rotation) 
│   └── Sampler (INPUT: time, OUTPUT: quaternions)
└── Channel 3 (targets Node.scale)
    └── Sampler (INPUT: time, OUTPUT: scales)
```

## Key Differences from Otto

| Aspect | Otto Matic | glTF |
|--------|------------|------|
| Time Units | Ticks (30 FPS) | Seconds (float) |
| Rotation | Euler angles | Quaternions |
| Hierarchy | Flat bone array | Scene graph nodes |
| Keyframes | Per-bone resources | Unified samplers |
| Storage | Resource fork | Single JSON+binary |

## Implementation Requirements

To convert Otto → glTF:

1. **Timing Conversion**: `glTFTime = ottoTick / 30.0`
2. **Rotation Conversion**: Euler → Quaternion using three.js
3. **Node Hierarchy**: Build parent-child relationships  
4. **Sampler Creation**: Combine all bone keyframes into unified arrays
5. **Channel Targeting**: Link samplers to specific node properties
6. **Skin Setup**: Create inverse bind matrices for mesh deformation

## glTF Transform Usage

```typescript
const doc = new Document();
const scene = doc.createScene();

// Create skeleton joints
const joint = doc.createNode('BoneName');
scene.addChild(joint);

// Create animation
const animation = doc.createAnimation('AnimName');
const channel = doc.createAnimationChannel();
const sampler = doc.createAnimationSampler();

// Link components
channel.setTargetNode(joint);
channel.setTargetPath('translation');
channel.setSampler(sampler);
animation.addChannel(channel);

// Create skin for mesh deformation
const skin = doc.createSkin();
skin.addJoint(joint);
```

## Best Practices

1. Use single buffer for all animation data
2. Convert Euler angles to quaternions for rotations
3. Ensure proper node hierarchy before creating skin
4. Add all joints to scene for Three.js compatibility
5. Use LINEAR interpolation for keyframes
6. Store timing data as float32 arrays