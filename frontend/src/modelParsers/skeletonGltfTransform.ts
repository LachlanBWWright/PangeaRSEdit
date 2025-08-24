/**
 * New Skeleton System for Otto Matic -> glTF Transform Conversion
 * 
 * This module implements a clean, efficient skeleton conversion system
 * based on the Otto Matic source code analysis and glTF Transform best practices.
 */

import { Document, Node, Skin, Animation } from "@gltf-transform/core";
import { BG3DSkeleton, BG3DBone, BG3DAnimation } from "./parseBG3D";

/**
 * Represents a keyframe in Otto Matic's animation system
 */
interface OttoKeyframe {
  tick: number;           // Time position (30 FPS base)
  translation: [number, number, number];
  rotation: [number, number, number];    // Euler angles in radians
  scale: [number, number, number];
}

/**
 * Organized animation data per bone
 */
interface BoneAnimationData {
  boneIndex: number;
  boneName: string;
  keyframes: OttoKeyframe[];
}

/**
 * Complete animation structure
 */
interface ProcessedAnimation {
  name: string;
  bones: BoneAnimationData[];
  duration: number;       // In seconds
}

/**
 * Matrix utilities for bone transformations
 */
class Matrix4 {
  data: Float32Array;

  constructor() {
    this.data = new Float32Array(16);
    this.identity();
  }

  identity(): Matrix4 {
    this.data.fill(0);
    this.data[0] = this.data[5] = this.data[10] = this.data[15] = 1;
    return this;
  }

  setTranslation(x: number, y: number, z: number): Matrix4 {
    this.data[12] = x;
    this.data[13] = y;
    this.data[14] = z;
    return this;
  }

  multiply(other: Matrix4): Matrix4 {
    const result = new Matrix4();
    const a = this.data;
    const b = other.data;
    const c = result.data;

    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        c[row * 4 + col] = 0;
        for (let k = 0; k < 4; k++) {
          c[row * 4 + col] += a[row * 4 + k] * b[k * 4 + col];
        }
      }
    }
    return result;
  }

  invert(): Matrix4 {
    const result = new Matrix4();
    const m = this.data;
    const inv = result.data;

    // Calculate matrix inverse using standard algorithm
    inv[0] = m[5] * m[10] * m[15] - m[5] * m[11] * m[14] - m[9] * m[6] * m[15] +
             m[9] * m[7] * m[14] + m[13] * m[6] * m[11] - m[13] * m[7] * m[10];
    inv[4] = -m[4] * m[10] * m[15] + m[4] * m[11] * m[14] + m[8] * m[6] * m[15] -
             m[8] * m[7] * m[14] - m[12] * m[6] * m[11] + m[12] * m[7] * m[10];
    inv[8] = m[4] * m[9] * m[15] - m[4] * m[11] * m[13] - m[8] * m[5] * m[15] +
             m[8] * m[7] * m[13] + m[12] * m[5] * m[11] - m[12] * m[7] * m[9];
    inv[12] = -m[4] * m[9] * m[14] + m[4] * m[10] * m[13] + m[8] * m[5] * m[14] -
              m[8] * m[6] * m[13] - m[12] * m[5] * m[10] + m[12] * m[6] * m[9];
    inv[1] = -m[1] * m[10] * m[15] + m[1] * m[11] * m[14] + m[9] * m[2] * m[15] -
             m[9] * m[3] * m[14] - m[13] * m[2] * m[11] + m[13] * m[3] * m[10];
    inv[5] = m[0] * m[10] * m[15] - m[0] * m[11] * m[14] - m[8] * m[2] * m[15] +
             m[8] * m[3] * m[14] + m[12] * m[2] * m[11] - m[12] * m[3] * m[10];
    inv[9] = -m[0] * m[9] * m[15] + m[0] * m[11] * m[13] + m[8] * m[1] * m[15] -
             m[8] * m[3] * m[13] - m[12] * m[1] * m[11] + m[12] * m[3] * m[9];
    inv[13] = m[0] * m[9] * m[14] - m[0] * m[10] * m[13] - m[8] * m[1] * m[14] +
              m[8] * m[2] * m[13] + m[12] * m[1] * m[10] - m[12] * m[2] * m[9];
    inv[2] = m[1] * m[6] * m[15] - m[1] * m[7] * m[14] - m[5] * m[2] * m[15] +
             m[5] * m[3] * m[14] + m[13] * m[2] * m[7] - m[13] * m[3] * m[6];
    inv[6] = -m[0] * m[6] * m[15] + m[0] * m[7] * m[14] + m[4] * m[2] * m[15] -
             m[4] * m[3] * m[14] - m[12] * m[2] * m[7] + m[12] * m[3] * m[6];
    inv[10] = m[0] * m[5] * m[15] - m[0] * m[7] * m[13] - m[4] * m[1] * m[15] +
              m[4] * m[3] * m[13] + m[12] * m[1] * m[7] - m[12] * m[3] * m[5];
    inv[14] = -m[0] * m[5] * m[14] + m[0] * m[6] * m[13] + m[4] * m[1] * m[14] -
              m[4] * m[2] * m[13] - m[12] * m[1] * m[6] + m[12] * m[2] * m[5];
    inv[3] = -m[1] * m[6] * m[11] + m[1] * m[7] * m[10] + m[5] * m[2] * m[11] -
             m[5] * m[3] * m[10] - m[9] * m[2] * m[7] + m[9] * m[3] * m[6];
    inv[7] = m[0] * m[6] * m[11] - m[0] * m[7] * m[10] - m[4] * m[2] * m[11] +
             m[4] * m[3] * m[10] + m[8] * m[2] * m[7] - m[8] * m[3] * m[6];
    inv[11] = -m[0] * m[5] * m[11] + m[0] * m[7] * m[9] + m[4] * m[1] * m[11] -
              m[4] * m[3] * m[9] - m[8] * m[1] * m[7] + m[8] * m[3] * m[5];
    inv[15] = m[0] * m[5] * m[10] - m[0] * m[6] * m[9] - m[4] * m[1] * m[10] +
              m[4] * m[2] * m[9] + m[8] * m[1] * m[6] - m[8] * m[2] * m[5];

    const det = m[0] * inv[0] + m[1] * inv[4] + m[2] * inv[8] + m[3] * inv[12];
    
    if (Math.abs(det) < 1e-6) {
      return new Matrix4(); // Return identity if singular
    }
    
    const invDet = 1.0 / det;
    for (let i = 0; i < 16; i++) {
      inv[i] *= invDet;
    }
    
    return result;
  }
}

/**
 * Convert Euler angles to quaternion (XYZ rotation order)
 */
function eulerToQuaternion(x: number, y: number, z: number): [number, number, number, number] {
  const c1 = Math.cos(x / 2);
  const c2 = Math.cos(y / 2);
  const c3 = Math.cos(z / 2);
  const s1 = Math.sin(x / 2);
  const s2 = Math.sin(y / 2);
  const s3 = Math.sin(z / 2);

  const qx = s1 * c2 * c3 + c1 * s2 * s3;
  const qy = c1 * s2 * c3 - s1 * c2 * s3;
  const qz = c1 * c2 * s3 + s1 * s2 * c3;
  const qw = c1 * c2 * c3 - s1 * s2 * s3;

  return [qx, qy, qz, qw];
}

/**
 * Create glTF joint hierarchy from Otto Matic bone data
 */
function createJointHierarchy(doc: Document, bones: BG3DBone[]): Node[] {
  // Validate bone hierarchy for circular dependencies
  const validateHierarchy = (bones: BG3DBone[]): boolean => {
    for (let i = 0; i < bones.length; i++) {
      const visited = new Set<number>();
      let current = i;
      
      while (current >= 0) {
        if (visited.has(current)) {
          console.warn(`Circular dependency detected starting from bone ${i}`);
          return false;
        }
        visited.add(current);
        current = bones[current].parentBone;
      }
    }
    return true;
  };

  if (!validateHierarchy(bones)) {
    throw new Error("Invalid bone hierarchy: circular dependencies detected");
  }

  // Create all joint nodes first
  const joints: Node[] = bones.map((bone, index) => {
    const joint = doc.createNode();
    // Keep original bone name without sanitization for round-trip compatibility
    joint.setName(bone.name);
    
    // Set bone's local transform (relative to parent)
    joint.setTranslation([bone.coordX, bone.coordY, bone.coordZ]);
    
    console.log(`Created joint ${index}: "${bone.name}" at [${bone.coordX}, ${bone.coordY}, ${bone.coordZ}]`);
    return joint;
  });

  // Establish parent-child relationships
  const rootJoints: Node[] = [];
  bones.forEach((bone, index) => {
    if (bone.parentBone >= 0 && bone.parentBone < joints.length) {
      joints[bone.parentBone].addChild(joints[index]);
      console.log(`  ${bone.name} -> child of ${bones[bone.parentBone].name}`);
    } else {
      rootJoints.push(joints[index]);
      console.log(`  ${bone.name} -> root joint`);
    }
  });

  return joints;
}

/**
 * Calculate world transform for a bone in the hierarchy
 */
function calculateBoneWorldTransform(boneIndex: number, bones: BG3DBone[], cache = new Map<number, Matrix4>()): Matrix4 {
  if (cache.has(boneIndex)) {
    return cache.get(boneIndex)!;
  }

  const bone = bones[boneIndex];
  const localTransform = new Matrix4().setTranslation(bone.coordX, bone.coordY, bone.coordZ);
  
  let worldTransform: Matrix4;
  if (bone.parentBone >= 0 && bone.parentBone < bones.length) {
    const parentWorld = calculateBoneWorldTransform(bone.parentBone, bones, cache);
    worldTransform = parentWorld.multiply(localTransform);
  } else {
    worldTransform = localTransform;
  }
  
  cache.set(boneIndex, worldTransform);
  return worldTransform;
}

/**
 * Create Skin with proper inverse bind matrices
 */
function createSkin(doc: Document, bones: BG3DBone[], joints: Node[]): Skin {
  const skin = doc.createSkin("Otto_Skeleton");
  
  // Add all joints to skin
  joints.forEach(joint => skin.addJoint(joint));
  
  // Calculate inverse bind matrices
  const inverseBindMatrices = new Float32Array(bones.length * 16);
  
  bones.forEach((_, boneIndex) => {
    const worldTransform = calculateBoneWorldTransform(boneIndex, bones);
    const inverseBindMatrix = worldTransform.invert();
    
    // Copy matrix data to result array (column-major order)
    const offset = boneIndex * 16;
    for (let i = 0; i < 16; i++) {
      inverseBindMatrices[offset + i] = inverseBindMatrix.data[i];
    }
  });
  
  // Create accessor for inverse bind matrices
  const buffer = doc.getRoot().listBuffers()[0];
  const ibmAccessor = doc.createAccessor()
    .setType("MAT4")
    .setArray(inverseBindMatrices)
    .setBuffer(buffer);
  
  skin.setInverseBindMatrices(ibmAccessor);
  
  console.log(`Created skin with ${bones.length} joints and inverse bind matrices`);
  return skin;
}

/**
 * Process Otto Matic animation data into organized structure
 */
function processAnimationData(bg3dAnimations: BG3DAnimation[], bones: BG3DBone[]): ProcessedAnimation[] {
  return bg3dAnimations.map(bg3dAnim => {
    const processedBones: BoneAnimationData[] = [];
    let maxDuration = 0;

    // Process each bone's keyframes
    Object.entries(bg3dAnim.keyframes).forEach(([boneIndexStr, keyframes]) => {
      const boneIndex = parseInt(boneIndexStr);
      
      if (boneIndex >= 0 && boneIndex < bones.length && keyframes.length > 0) {
        const bone = bones[boneIndex];
        
        // Convert Otto keyframes to our format
        const ottoKeyframes: OttoKeyframe[] = keyframes.map(kf => ({
          tick: kf.tick,
          translation: [kf.coordX, kf.coordY, kf.coordZ],
          rotation: [kf.rotationX, kf.rotationY, kf.rotationZ],
          scale: [kf.scaleX, kf.scaleY, kf.scaleZ]
        }));
        
        // Sort by tick
        ottoKeyframes.sort((a, b) => a.tick - b.tick);
        
        // Calculate duration using Otto's 30 FPS system
        if (ottoKeyframes.length > 0) {
          const maxTick = Math.max(...ottoKeyframes.map(kf => kf.tick));
          const minTick = Math.min(...ottoKeyframes.map(kf => kf.tick));
          
          // If all keyframes are at the same tick, use a minimum duration
          let duration;
          if (maxTick === minTick) {
            duration = 0.033; // 1 frame at 30 FPS
          } else {
            duration = maxTick / 30.0; // Otto uses 30 FPS timing
          }
          
          maxDuration = Math.max(maxDuration, duration);
        }
        
        processedBones.push({
          boneIndex,
          boneName: bone.name,
          keyframes: ottoKeyframes
        });
      }
    });

    // Ensure minimum duration of at least 1/30 second (one frame)
    if (maxDuration < 0.033) {
      maxDuration = 0.033; // Default minimum duration 
    }

    return {
      name: bg3dAnim.name,
      bones: processedBones,
      duration: maxDuration
    };
  });
}

/**
 * Create glTF animation from processed Otto data
 */
function createGLTFAnimation(
  doc: Document, 
  processedAnim: ProcessedAnimation, 
  joints: Node[]
): Animation {
  const gltfAnimation = doc.createAnimation(processedAnim.name);
  const buffer = doc.getRoot().listBuffers()[0];
  
  console.log(`Creating animation "${processedAnim.name}" with duration ${processedAnim.duration}s`);
  
  processedAnim.bones.forEach(boneAnim => {
    if (boneAnim.keyframes.length === 0) return;
    
    const joint = joints[boneAnim.boneIndex];
    if (!joint) return;
    
    // Convert times to seconds
    const times = boneAnim.keyframes.map(kf => kf.tick / 30.0);
    
    // Create time accessor
    const timeAccessor = doc.createAccessor()
      .setType("SCALAR")
      .setArray(new Float32Array(times))
      .setBuffer(buffer);
    
    // Translation channel
    const hasTranslation = boneAnim.keyframes.some(kf => 
      kf.translation[0] !== 0 || kf.translation[1] !== 0 || kf.translation[2] !== 0
    );
    
    if (hasTranslation) {
      const translations = boneAnim.keyframes.flatMap(kf => kf.translation);
      const translationAccessor = doc.createAccessor()
        .setType("VEC3")
        .setArray(new Float32Array(translations))
        .setBuffer(buffer);
      
      const translationSampler = doc.createAnimationSampler()
        .setInput(timeAccessor)
        .setOutput(translationAccessor)
        .setInterpolation("LINEAR");
      
      const translationChannel = doc.createAnimationChannel()
        .setTargetNode(joint)
        .setTargetPath("translation")
        .setSampler(translationSampler);
      
      gltfAnimation.addSampler(translationSampler).addChannel(translationChannel);
    }
    
    // Rotation channel
    const hasRotation = boneAnim.keyframes.some(kf => 
      kf.rotation[0] !== 0 || kf.rotation[1] !== 0 || kf.rotation[2] !== 0
    );
    
    if (hasRotation) {
      const rotations = boneAnim.keyframes.flatMap(kf => {
        const [qx, qy, qz, qw] = eulerToQuaternion(kf.rotation[0], kf.rotation[1], kf.rotation[2]);
        return [qx, qy, qz, qw];
      });
      
      const rotationAccessor = doc.createAccessor()
        .setType("VEC4")
        .setArray(new Float32Array(rotations))
        .setBuffer(buffer);
      
      const rotationSampler = doc.createAnimationSampler()
        .setInput(timeAccessor)
        .setOutput(rotationAccessor)
        .setInterpolation("LINEAR");
      
      const rotationChannel = doc.createAnimationChannel()
        .setTargetNode(joint)
        .setTargetPath("rotation")
        .setSampler(rotationSampler);
      
      gltfAnimation.addSampler(rotationSampler).addChannel(rotationChannel);
    }
    
    // Scale channel
    const hasScale = boneAnim.keyframes.some(kf => 
      kf.scale[0] !== 1 || kf.scale[1] !== 1 || kf.scale[2] !== 1
    );
    
    if (hasScale) {
      const scales = boneAnim.keyframes.flatMap(kf => kf.scale);
      const scaleAccessor = doc.createAccessor()
        .setType("VEC3")
        .setArray(new Float32Array(scales))
        .setBuffer(buffer);
      
      const scaleSampler = doc.createAnimationSampler()
        .setInput(timeAccessor)
        .setOutput(scaleAccessor)
        .setInterpolation("LINEAR");
      
      const scaleChannel = doc.createAnimationChannel()
        .setTargetNode(joint)
        .setTargetPath("scale")
        .setSampler(scaleSampler);
      
      gltfAnimation.addSampler(scaleSampler).addChannel(scaleChannel);
    }
    
    console.log(`  Added channels for bone ${boneAnim.boneName} (T:${hasTranslation}, R:${hasRotation}, S:${hasScale})`);
  });
  
  return gltfAnimation;
}

/**
 * Main function to convert Otto Matic skeleton to glTF Transform structures
 */
export function createSkeletonSystem(
  doc: Document, 
  skeleton: BG3DSkeleton
): { joints: Node[], skin: Skin, animations: Animation[] } {
  console.log(`\n=== Creating Skeleton System ===`);
  console.log(`Bones: ${skeleton.bones.length}, Animations: ${skeleton.animations.length}`);
  
  // Create joint hierarchy
  const joints = createJointHierarchy(doc, skeleton.bones);
  
  // Create skin with inverse bind matrices
  const skin = createSkin(doc, skeleton.bones, joints);
  
  // Process and create animations
  const processedAnimations = processAnimationData(skeleton.animations, skeleton.bones);
  const gltfAnimations = processedAnimations.map(anim => 
    createGLTFAnimation(doc, anim, joints)
  );
  
  console.log(`Created ${gltfAnimations.length} animations`);
  console.log(`=== Skeleton System Complete ===\n`);
  
  return {
    joints,
    skin,
    animations: gltfAnimations
  };
}

/**
 * Extract animations from glTF document back to BG3D format
 */
export function extractAnimationsFromGLTF(doc: Document, joints: Node[]): BG3DAnimation[] {
  const animations: BG3DAnimation[] = [];
  const gltfAnimations = doc.getRoot().listAnimations();
  
  gltfAnimations.forEach((gltfAnim: any) => {
    const bg3dAnim: BG3DAnimation = {
      name: gltfAnim.getName() || 'animation',
      numAnimEvents: 0,
      events: [],
      keyframes: {},
    };
    
    // Process each channel
    gltfAnim.listChannels().forEach((channel: any) => {
      const targetNode = channel.getTargetNode();
      const targetPath = channel.getTargetPath();
      const sampler = channel.getSampler();
      
      if (!targetNode || !sampler) return;
      
      // Find bone index for this joint
      const boneIndex = joints.indexOf(targetNode);
      if (boneIndex === -1) return;
      
      // Initialize keyframes array for this bone if not exists
      if (!bg3dAnim.keyframes[boneIndex]) {
        bg3dAnim.keyframes[boneIndex] = [];
      }
      
      // Get input (time) and output (values) data
      const inputAccessor = sampler.getInput();
      const outputAccessor = sampler.getOutput();
      
      if (!inputAccessor || !outputAccessor) return;
      
      const times = inputAccessor.getArray();
      const values = outputAccessor.getArray();
      
      if (!times || !values) return;
      
      // Convert based on target path
      for (let i = 0; i < times.length; i++) {
        const time = times[i];
        const tick = Math.round(time * 30.0); // Convert seconds to ticks (30 fps)
        
        // Find or create keyframe for this tick
        let keyframe = bg3dAnim.keyframes[boneIndex].find(kf => kf.tick === tick);
        if (!keyframe) {
          keyframe = {
            tick,
            accelerationMode: 0,
            coordX: 0,
            coordY: 0,
            coordZ: 0,
            rotationX: 0,
            rotationY: 0,
            rotationZ: 0,
            scaleX: 1,
            scaleY: 1,
            scaleZ: 1,
          };
          bg3dAnim.keyframes[boneIndex].push(keyframe);
        }
        
        // Update keyframe based on target path
        switch (targetPath) {
          case 'translation':
            keyframe.coordX = values[i * 3 + 0];
            keyframe.coordY = values[i * 3 + 1];
            keyframe.coordZ = values[i * 3 + 2];
            break;
          case 'rotation':
            // Convert quaternion to Euler angles
            const qx = values[i * 4 + 0];
            const qy = values[i * 4 + 1];
            const qz = values[i * 4 + 2];
            const qw = values[i * 4 + 3];
            
            // Simplified quaternion to Euler conversion
            const roll = Math.atan2(2 * (qw * qx + qy * qz), 1 - 2 * (qx * qx + qy * qy));
            const sinp = 2 * (qw * qy - qz * qx);
            const pitch = Math.abs(sinp) >= 1 ? Math.sign(sinp) * Math.PI / 2 : Math.asin(sinp);
            const yaw = Math.atan2(2 * (qw * qz + qx * qy), 1 - 2 * (qy * qy + qz * qz));
            
            keyframe.rotationX = roll;
            keyframe.rotationY = pitch;
            keyframe.rotationZ = yaw;
            break;
          case 'scale':
            keyframe.scaleX = values[i * 3 + 0];
            keyframe.scaleY = values[i * 3 + 1];
            keyframe.scaleZ = values[i * 3 + 2];
            break;
        }
      }
    });
    
    // Sort keyframes by tick for each bone
    Object.keys(bg3dAnim.keyframes).forEach(boneIndexStr => {
      const boneIndex = parseInt(boneIndexStr);
      bg3dAnim.keyframes[boneIndex].sort((a, b) => a.tick - b.tick);
    });
    
    animations.push(bg3dAnim);
  });
  
  return animations;
}