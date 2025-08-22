/* // Browser-safe base64 encoding for Uint8Array
function uint8ToBase64(u8: Uint8Array): string {
  const CHUNK_SIZE = 0x8000;
  let result = "";
  for (let i = 0; i < u8.length; i += CHUNK_SIZE) {
    result += String.fromCharCode.apply(
      null,
      u8.subarray(i, i + CHUNK_SIZE) as any,
    );
  }
  return btoa(result);
} */
import {
  BG3DGeometry,
  BG3DGroup,
  BG3DMaterial,
  BG3DParseResult,
  BG3DTexture,
  BG3DSkeleton,
  BG3DBone,
  BG3DAnimation,
} from "./parseBG3D";

import {
  argb16ToPng,
  rgb24ToPng,
  rgba8ToPng,
  pngToRgba8,
} from "./image/pngArgb";

/**
 * Convert Euler angles (in radians) to quaternion
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
 * Convert quaternion to Euler angles (in radians)
 */
function quaternionToEuler(qx: number, qy: number, qz: number, qw: number): [number, number, number] {
  // Roll (x-axis rotation)
  const sinr_cosp = 2 * (qw * qx + qy * qz);
  const cosr_cosp = 1 - 2 * (qx * qx + qy * qy);
  const roll = Math.atan2(sinr_cosp, cosr_cosp);

  // Pitch (y-axis rotation)
  const sinp = 2 * (qw * qy - qz * qx);
  const pitch = Math.abs(sinp) >= 1 ? Math.sign(sinp) * Math.PI / 2 : Math.asin(sinp);

  // Yaw (z-axis rotation)
  const siny_cosp = 2 * (qw * qz + qx * qy);
  const cosy_cosp = 1 - 2 * (qy * qy + qz * qz);
  const yaw = Math.atan2(siny_cosp, cosy_cosp);

  return [roll, pitch, yaw];
}

/**
 * Extract animations from glTF document and convert to BG3D format
 */
function extractAnimationsFromGLTF(doc: Document, joints: Node[]): BG3DAnimation[] {
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
            const [rx, ry, rz] = quaternionToEuler(qx, qy, qz, qw);
            keyframe.rotationX = rx;
            keyframe.rotationY = ry;
            keyframe.rotationZ = rz;
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

import { Document, Mesh, Material, Node, Skin, Accessor } from "@gltf-transform/core";
import { PixelFormatSrc, PixelFormatDst } from "./parseBG3D";

/**
 * Convert a BG3DParseResult to a glTF Document, transferring all possible data.
 * Any data that cannot be mapped is stored in extras.
 * Data that cannot be transferred:
 *   - BG3DMaterial.flags (stored in extras)
 *   - BG3DTexture pixel format fields (stored in extras, pixel data may need conversion)
 *   - Geometry.layerMaterialNum (stored in extras)
 *   - Geometry.boundingBox (stored in extras)
 */

export function bg3dParsedToGLTF(parsed: BG3DParseResult): Document {
  const doc = new Document();
  console.log("Creating new glTF Document");
  const baseBuffer = doc.createBuffer("MainBuffer");
  console.log("Created base buffer for glTF Document");

  // 1. Materials
  const gltfMaterials: Material[] = parsed.materials.map((mat, i) => {
    const m = doc.createMaterial("BG3DMaterial");
    m.setName(`Material_${i.toString().padStart(4, "0")}`);
    m.setBaseColorFactor(mat.diffuseColor);
    // Only store BG3DMaterial.flags in extras (no texture data)
    m.setExtras({
      flags: mat.flags,
    });

    return m;
  });

  console.log("Stage 2");
  // 2. Textures/Images (attach ALL textures as glTF images, not just the first)
  parsed.materials.forEach((mat, i) => {
    if (mat.textures && mat.textures.length > 0) {
      mat.textures.forEach((tex, j) => {
        let pngBuffer: Uint8Array<ArrayBufferLike>;
        try {
          if (
            tex.srcPixelFormat === PixelFormatSrc.GL_UNSIGNED_SHORT_1_5_5_5_REV
          ) {
            // ARGB16 with byte swap
            const src = new Uint16Array(
              tex.pixels.buffer,
              tex.pixels.byteOffset,
              tex.pixels.byteLength / 2,
            );
            // Byte swap each 16-bit value
            const swapped = new Uint16Array(src.length);
            for (let k = 0; k < src.length; k++) {
              const val = src[k];
              swapped[k] = ((val & 0xff) << 8) | ((val >> 8) & 0xff);
            }
            pngBuffer = argb16ToPng(swapped, tex.width, tex.height);
          } else if (tex.srcPixelFormat === PixelFormatSrc.GL_RGB) {
            // RGB8
            pngBuffer = rgb24ToPng(tex.pixels, tex.width, tex.height);
          } else if (tex.srcPixelFormat === PixelFormatSrc.GL_RGBA) {
            // GL_RGBA (RGBA8)
            pngBuffer = rgba8ToPng(tex.pixels, tex.width, tex.height);
          } else {
            // Unknown/unsupported format, fallback to raw buffer
            pngBuffer = tex.pixels;
          }
        } catch (e) {
          pngBuffer = tex.pixels;
        }
        const texture = doc.createTexture();
        texture.setMimeType("image/png");
        texture.setImage(pngBuffer);
        texture.setExtras({
          width: tex.width,
          height: tex.height,
          srcPixelFormat: tex.srcPixelFormat,
          dstPixelFormat: tex.dstPixelFormat,
          bufferSize: tex.bufferSize,
        });
        // Attach the first texture as baseColorTexture for compatibility
        if (j === 0) {
          gltfMaterials[i].setBaseColorTexture(texture);
        }
      });
    }
  });

  // 2.5. Skeleton/Joints (create glTF joints from skeleton data)
  let gltfJoints: Node[] = [];
  let gltfSkin: Skin | null = null;
  
  if (parsed.skeleton) {
    console.log("Creating glTF skeleton from BG3D skeleton data");
    const skeleton = parsed.skeleton;
    
    // Create joint nodes for each bone
    gltfJoints = skeleton.bones.map((bone, index) => {
      const joint = doc.createNode();
      // Use the exact bone name for better targeting - remove any invalid characters
      const cleanName = bone.name.replace(/[^a-zA-Z0-9_]/g, '_');
      joint.setName(cleanName);
      
      // Set bone transform (position only for now)
      joint.setTranslation([bone.coordX, bone.coordY, bone.coordZ]);
      
      console.log(`Created joint ${index}: ${cleanName} at [${bone.coordX}, ${bone.coordY}, ${bone.coordZ}]`);
      return joint;
    });
    
    // Set up bone hierarchy
    skeleton.bones.forEach((bone, index) => {
      if (bone.parentBone >= 0 && bone.parentBone < gltfJoints.length) {
        gltfJoints[bone.parentBone].addChild(gltfJoints[index]);
      }
    });
    
    // Create skin
    gltfSkin = doc.createSkin();
    gltfSkin.setName("skeleton_skin");
    
    // Add all joints to skin
    gltfJoints.forEach(joint => {
      gltfSkin!.addJoint(joint);
    });
    
    // Create inverse bind matrices based on bone coordinates
    const numJoints = gltfJoints.length;
    const inverseBindMatrices = new Float32Array(numJoints * 16);
    
    parsed.skeleton.bones.forEach((bone, i) => {
      const offset = i * 16;
      
      // Create transform matrix from bone coordinates
      // BG3D bone coordinates represent the bone's position in model space
      const x = bone.coordX || 0;
      const y = bone.coordY || 0;
      const z = bone.coordZ || 0;
      
      // For inverse bind matrix, we need the inverse of the bind pose
      // Since BG3D coordinates are already in bind pose, we create inverse translation
      inverseBindMatrices[offset + 0] = 1;   // m00
      inverseBindMatrices[offset + 5] = 1;   // m11
      inverseBindMatrices[offset + 10] = 1;  // m22
      inverseBindMatrices[offset + 15] = 1;  // m33
      inverseBindMatrices[offset + 12] = -x; // inverse translation x
      inverseBindMatrices[offset + 13] = -y; // inverse translation y
      inverseBindMatrices[offset + 14] = -z; // inverse translation z
    });
    
    const ibmAccessor = doc
      .createAccessor()
      .setType("MAT4")
      .setArray(inverseBindMatrices)
      .setBuffer(baseBuffer);
    
    gltfSkin.setInverseBindMatrices(ibmAccessor);
    
    // Convert animations to glTF format
    if (parsed.skeleton && parsed.skeleton.animations.length > 0) {
      console.log("Converting BG3D animations to glTF format");
      
      parsed.skeleton.animations.forEach(bg3dAnim => {
        const gltfAnimation = doc.createAnimation(bg3dAnim.name);
        let maxAnimationDuration = 0;
        
        // Process each bone's keyframes
        Object.entries(bg3dAnim.keyframes).forEach(([boneIndexStr, keyframes]) => {
          const boneIndex = parseInt(boneIndexStr);
          if (boneIndex < gltfJoints.length && keyframes.length > 0) {
            const joint = gltfJoints[boneIndex];
            
            // Sort keyframes by tick to ensure proper order
            const sortedKeyframes = [...keyframes].sort((a, b) => a.tick - b.tick);
            
            // Skip bones with no meaningful keyframes
            if (sortedKeyframes.length === 0) {
              console.log(`Skipping bone ${boneIndex} (${joint.getName()}) - no keyframes`);
              return;
            }
            
            // DEBUG: Log actual tick values
            const tickValues = sortedKeyframes.map(kf => kf.tick);
            console.log(`Animation ${bg3dAnim.name}, bone ${boneIndex} (${joint.getName()}): tick values = [${tickValues.join(', ')}]`);
            
            // Calculate proper timing using Otto Matic's animation system
            const maxTick = Math.max(...sortedKeyframes.map(kf => kf.tick));
            const minTick = Math.min(...sortedKeyframes.map(kf => kf.tick));
            const tickRange = maxTick - minTick;
            
            console.log(`  Tick range: ${minTick} to ${maxTick} (range: ${tickRange})`);
            
            // Otto Matic timing analysis from SkeletonAnim.c:
            // currentTime += (30.0f*fps)*skeleton->AnimSpeed
            // Where fps = gFramesPerSecondFrac (time per frame, NOT frames per second)
            // At 60 FPS: fps = 1/60 = 0.0167, animSpeed = 1.0
            // Each frame advances by: 30.0 * (1/60) * 1.0 = 0.5 time units
            // Since 1/60 second = 0.5 time units, then 1 second = 30 time units
            // Therefore: seconds = ticks / 30.0
            const tickToSecondsMultiplier = 1.0 / 30.0;
            let times: number[];
            let actualDuration: number;
            
            if (tickRange === 0) {
              // All keyframes at same tick - this shouldn't happen but handle gracefully
              if (sortedKeyframes.length === 1) {
                // Single keyframe - create a 1-second hold
                times = [0, 1.0];
                sortedKeyframes.push({ ...sortedKeyframes[0] });
                actualDuration = 1.0;
              } else {
                // Multiple keyframes at same tick - spread over 1 second
                times = sortedKeyframes.map((_, index) => index / Math.max(1, sortedKeyframes.length - 1));
                actualDuration = 1.0;
              }
            } else {
              // Normal case: convert ticks to time using Otto's timing system
              times = sortedKeyframes.map(kf => kf.tick * tickToSecondsMultiplier);
              actualDuration = maxTick * tickToSecondsMultiplier;
              
              // Ensure minimum duration of 0.033 seconds (2 frames at 60 FPS)
              if (actualDuration < 0.033) {
                const scale = 0.033 / actualDuration;
                times = times.map(t => t * scale);
                actualDuration = 0.033;
              }
            }
            
            // Track the maximum duration across all bones for this animation
            maxAnimationDuration = Math.max(maxAnimationDuration, actualDuration);
            
            console.log(`Animation ${bg3dAnim.name}, bone ${boneIndex} (${joint.getName()}): ${sortedKeyframes.length} keyframes, ticks ${minTick}-${maxTick}, duration: ${actualDuration} seconds, maxAnimDuration: ${maxAnimationDuration}`);
            
            const timeAccessor = doc.createAccessor()
              .setType("SCALAR")
              .setArray(new Float32Array(times))
              .setBuffer(baseBuffer);
            
            // Create translation output accessor
            const translations: number[] = [];
            sortedKeyframes.forEach(kf => {
              translations.push(kf.coordX, kf.coordY, kf.coordZ);
            });
            const translationAccessor = doc.createAccessor()
              .setType("VEC3")
              .setArray(new Float32Array(translations))
              .setBuffer(baseBuffer);
            
            // Create rotation output accessor (convert from Euler to quaternion)
            const rotations: number[] = [];
            sortedKeyframes.forEach(kf => {
              // Convert Euler angles to quaternion
              const quat = eulerToQuaternion(kf.rotationX, kf.rotationY, kf.rotationZ);
              rotations.push(quat[0], quat[1], quat[2], quat[3]);
            });
            const rotationAccessor = doc.createAccessor()
              .setType("VEC4")
              .setArray(new Float32Array(rotations))
              .setBuffer(baseBuffer);
            
            // Create scale output accessor
            const scales: number[] = [];
            sortedKeyframes.forEach(kf => {
              scales.push(kf.scaleX, kf.scaleY, kf.scaleZ);
            });
            const scaleAccessor = doc.createAccessor()
              .setType("VEC3") 
              .setArray(new Float32Array(scales))
              .setBuffer(baseBuffer);
            
            // Create samplers and channels
            const translationSampler = doc.createAnimationSampler()
              .setInput(timeAccessor)
              .setOutput(translationAccessor)
              .setInterpolation("LINEAR");
            
            const rotationSampler = doc.createAnimationSampler()
              .setInput(timeAccessor)
              .setOutput(rotationAccessor)
              .setInterpolation("LINEAR");
            
            const scaleSampler = doc.createAnimationSampler()
              .setInput(timeAccessor)
              .setOutput(scaleAccessor)
              .setInterpolation("LINEAR");
            
            // Add samplers to animation
            gltfAnimation.addSampler(translationSampler);
            gltfAnimation.addSampler(rotationSampler);
            gltfAnimation.addSampler(scaleSampler);
            
            // Create channels
            const translationChannel = doc.createAnimationChannel()
              .setTargetNode(joint)
              .setTargetPath("translation")
              .setSampler(translationSampler);
            
            const rotationChannel = doc.createAnimationChannel()
              .setTargetNode(joint)
              .setTargetPath("rotation")
              .setSampler(rotationSampler);
            
            const scaleChannel = doc.createAnimationChannel()
              .setTargetNode(joint)
              .setTargetPath("scale")
              .setSampler(scaleSampler);
            
            // Add channels to animation
            gltfAnimation.addChannel(translationChannel);
            gltfAnimation.addChannel(rotationChannel);
            gltfAnimation.addChannel(scaleChannel);
          }
        });
        
        console.log(`Created animation ${bg3dAnim.name} with overall duration: ${maxAnimationDuration} seconds`);
      });
    }
  }

  console.log("Stage 3");

  // Helper to collect all geometries from group hierarchy (using .children)
  function collectGeometries(groups: BG3DGroup[]): BG3DGeometry[] {
    const result: BG3DGeometry[] = [];
    function traverse(group: BG3DGroup) {
      if (Array.isArray(group.children)) {
        for (const child of group.children) {
          if (Array.isArray((child as any).children)) {
            // It's a BG3DGroup
            traverse(child as BG3DGroup);
          } else {
            // It's a BG3DGeometry
            result.push(child as BG3DGeometry);
          }
        }
      }
    }
    for (const group of groups) {
      traverse(group);
    }
    return result;
  }

  const allGeometries = collectGeometries(parsed.groups);

  console.log("Stage 4");

  // 3. Meshes and Primitives
  const gltfMeshes: Mesh[] = [];
  allGeometries.forEach((geom) => {
    const mesh = doc.createMesh();

    mesh.setName(`Item_${gltfMeshes.length.toString().padStart(4, "0")}`);

    // Create accessors as consts using ternary expressions, then use if checks for prim.setAttribute/setIndices
    const positionAccessor = geom.vertices
      ? doc
          .createAccessor()
          .setType("VEC3")
          .setArray(new Float32Array(geom.vertices.flat()))
          .setBuffer(baseBuffer)
      : null;
    const normalAccessor = geom.normals
      ? doc
          .createAccessor()
          .setType("VEC3")
          .setArray(new Float32Array(geom.normals.flat()))
          .setBuffer(baseBuffer)
      : null;
    const texcoordAccessor = geom.uvs
      ? doc
          .createAccessor()
          .setType("VEC2")
          .setArray(new Float32Array(geom.uvs.flat()))
          .setBuffer(baseBuffer)
      : null;
    const colorAccessor = geom.colors
      ? doc
          .createAccessor()
          .setType("VEC4")
          .setArray(new Uint8Array(geom.colors.flat()))
          .setBuffer(baseBuffer)
      : null;
    const indexAccessor = geom.triangles
      ? doc
          .createAccessor()
          .setType("SCALAR")
          .setArray(new Uint32Array(geom.triangles.flat()))
          .setBuffer(baseBuffer)
      : null;

    // Create joint and weight accessors if we have skeleton data
    let jointAccessor: Accessor | null = null;
    let weightAccessor: Accessor | null = null;
    
    if (parsed.skeleton && gltfSkin && geom.vertices) {
      const numVertices = geom.vertices.length;
      const joints = new Uint16Array(numVertices * 4); // 4 joints per vertex
      const weights = new Float32Array(numVertices * 4); // 4 weights per vertex
      
      // Initialize all weights to 0 and all joints to 0
      joints.fill(0);
      weights.fill(0);
      
      // For each vertex, determine which bones influence it based on skeleton data
      for (let vertexIndex = 0; vertexIndex < numVertices; vertexIndex++) {
        const influencingBones: { boneIndex: number; weight: number }[] = [];
        
        // Find all bones that influence this vertex
        parsed.skeleton.bones.forEach((bone, boneIndex) => {
          if (bone.pointIndices && bone.pointIndices.includes(vertexIndex)) {
            // Calculate weight based on inverse of number of vertices influenced by this bone
            // This gives more weight to bones that influence fewer vertices
            const weight = bone.pointIndices.length > 0 ? 1.0 / bone.pointIndices.length : 0;
            influencingBones.push({ boneIndex, weight });
          }
        });
        
        // If no bones influence this vertex, assign to root bone (index 0)
        if (influencingBones.length === 0) {
          joints[vertexIndex * 4] = 0;
          weights[vertexIndex * 4] = 1.0;
        } else {
          // Sort by weight (highest first) and take up to 4 bones
          influencingBones.sort((a, b) => b.weight - a.weight);
          const selectedBones = influencingBones.slice(0, 4);
          
          // Calculate total weight for normalization
          const totalWeight = selectedBones.reduce((sum, bone) => sum + bone.weight, 0);
          
          // Assign joints and normalized weights
          selectedBones.forEach((bone, i) => {
            joints[vertexIndex * 4 + i] = bone.boneIndex;
            weights[vertexIndex * 4 + i] = totalWeight > 0 ? bone.weight / totalWeight : 0;
          });
          
          // Ensure weights sum to 1.0 (fix floating point precision issues)
          let weightSum = 0;
          for (let i = 0; i < 4; i++) {
            weightSum += weights[vertexIndex * 4 + i];
          }
          if (weightSum > 0 && Math.abs(weightSum - 1.0) > 1e-6) {
            for (let i = 0; i < 4; i++) {
              weights[vertexIndex * 4 + i] /= weightSum;
            }
          }
        }
      }
      
      jointAccessor = doc
        .createAccessor()
        .setType("VEC4")
        .setArray(joints)
        .setBuffer(baseBuffer);
        
      weightAccessor = doc
        .createAccessor()
        .setType("VEC4")
        .setArray(weights)
        .setBuffer(baseBuffer);
    }

    for (let i = 0; i < geom.numMaterials; i++) {
      const prim = doc.createPrimitive();

      if (positionAccessor) {
        prim.setAttribute("POSITION", positionAccessor);
      }
      if (normalAccessor) {
        prim.setAttribute("NORMAL", normalAccessor);
      }
      if (texcoordAccessor) {
        prim.setAttribute("TEXCOORD_0", texcoordAccessor);
      }
      if (colorAccessor) {
        prim.setAttribute("COLOR_0", colorAccessor);
      }
      if (jointAccessor) {
        prim.setAttribute("JOINTS_0", jointAccessor);
      }
      if (weightAccessor) {
        prim.setAttribute("WEIGHTS_0", weightAccessor);
      }
      if (indexAccessor) {
        prim.setIndices(indexAccessor);
      }
      // Material
      // Store per-primitive material index in extras

      if (gltfMaterials[geom.layerMaterialNum[i]]) {
        prim.setMaterial(gltfMaterials[geom.layerMaterialNum[i]]);
      }
      // Extras for unmappable fields and BG3D-specific fields
      prim.setExtras({
        flags: geom.flags,
        boundingBox: geom.boundingBox,
        type: geom.type,
      });
      mesh.addPrimitive(prim);
    }

    gltfMeshes.push(mesh);
  });

  console.log("Stage 5");

  // 4. Nodes and Hierarchy (Groups)
  // Encode BG3D group hierarchy as glTF nodes
  function createNodeForGroup(group: BG3DGroup, idx: number) {
    const node = doc.createNode();
    node.setName("item_" + idx.toString().padStart(4, "0"));
    idx++;
    // Attach meshes for all geometries in this group
    for (const child of group.children) {
      if (Array.isArray((child as any).children)) {
        // It's a BG3DGroup
        const childNode = createNodeForGroup(child as BG3DGroup, idx);
        node.addChild(childNode.node);
        idx = childNode.idx;
      } else {
        // It's a BG3DGeometry
        const geomIndex = allGeometries.indexOf(child as BG3DGeometry);
        if (geomIndex >= 0 && gltfMeshes[geomIndex]) {
          const meshNode = doc
            .createNode()
            .setMesh(gltfMeshes[geomIndex])
            .setName("item_" + idx.toString().padStart(4, "0"));
          
          // Apply skin if we have skeleton data
          if (gltfSkin) {
            meshNode.setSkin(gltfSkin);
          }
          
          node.addChild(meshNode);
        }
      }
    }
    return { node, idx };
  }
  
  // Add all top-level groups as root nodes (using setChildren for glTF-Transform)
  const rootNodes: Node[] = [];
  let idx = 0;
  for (const group of parsed.groups) {
    const { node, idx: newIdx } = createNodeForGroup(group, idx);
    rootNodes.push(node);
    idx = newIdx;
  }
  
  const scene = doc.createScene("Scene");
  
  // DO NOT add skeleton joints to scene - they should only be part of the skin
  // Joints being added to the scene makes them appear in the model hierarchy
  // which is incorrect behavior for skeletal animation
  
  // Add geometry nodes to scene
  for (const node of rootNodes) {
    doc.getRoot().listNodes().push(node);
    scene.addChild(node);
  }
  
  // Add skeleton joint hierarchy to the scene so animations can find them
  if (gltfJoints && gltfJoints.length > 0) {
    console.log("Setting up joint hierarchy in scene for animation targeting");
    
    // Add all joints to document's node list first
    for (const joint of gltfJoints) {
      doc.getRoot().listNodes().push(joint);
    }
    
    // Build parent-child relationships and add to scene
    parsed.skeleton?.bones.forEach((bone, index) => {
      const joint = gltfJoints[index];
      if (!joint) return;
      
      if (bone.parentBone >= 0 && bone.parentBone < gltfJoints.length) {
        // This joint has a parent - set up the relationship
        const parentJoint = gltfJoints[bone.parentBone];
        if (parentJoint) {
          parentJoint.addChild(joint);
          console.log(`Joint hierarchy: ${parentJoint.getName()} -> ${joint.getName()}`);
        }
      } else {
        // This is a root joint - add directly to scene
        scene.addChild(joint);
        console.log(`Root joint added to scene: ${joint.getName()}`);
      }
    });
  }

  // 5. Store any unmappable data in extras at the root (for legacy round-trip)
  doc.getRoot().setExtras({
    groups: parsed.groups,
    // Store BG3DParseResult-level fields for round-trip
    bg3dFields: {
      // Store skeleton data for round-trip (main skeleton data is now in proper glTF format)
      skeleton: parsed.skeleton,
    },
  });

  console.log("Finalizing glTF Document");

  return doc;
}

export async function gltfToBG3D(doc: Document): Promise<BG3DParseResult> {
  console.log("gltfToBG3D: Restoring materials...");
  const docMaterials = doc.getRoot().listMaterials();
  const materials: BG3DMaterial[] = await Promise.all(
    docMaterials.map(async (mat, i) => {
      const extras = mat.getExtras() ?? {};
      let diffuseColor: [number, number, number, number] = [1, 1, 1, 1];
      const baseColor = mat.getBaseColorFactor();
      if (
        Array.isArray(baseColor) &&
        baseColor.length === 4 &&
        baseColor.every((v) => typeof v === "number")
      ) {
        diffuseColor = [baseColor[0], baseColor[1], baseColor[2], baseColor[3]];
      }
      const flags = typeof extras["flags"] === "number" ? extras["flags"] : 0;

      console.log(
        `Material[${i}]: diffuseColor=`,
        diffuseColor,
        "flags=",
        flags,
      );

      // Only restore textures from baseColorTexture (do not parse from extras)
      let textures: BG3DTexture[] = [];

      const baseColorTex = mat.getBaseColorTexture();
      if (baseColorTex) {
        const image = baseColorTex.getImage();

        const size = baseColorTex.getSize();
        console.log("TEX SIZE", size);
        if (image instanceof Uint8Array) {
          console.log(
            `Material[${i}]: Restoring texture from baseColorTexture, byteLength=`,
            image.byteLength,
          );

          const pngRes = await pngToRgba8(image.buffer as ArrayBuffer);

          textures.push({
            pixels: pngRes.data,
            width: pngRes.width,
            height: pngRes.height,
            srcPixelFormat: PixelFormatSrc.GL_RGBA,
            dstPixelFormat: PixelFormatDst.GL_UNSIGNED_SHORT_5_5_5_1,
            bufferSize: pngRes.data.byteLength,
          });
        } else {
          console.log(
            `Material[${i}]: baseColorTexture image is not Uint8Array, got:`,
            typeof image,
          );
        }
      } else {
        console.log(`Material[${i}]: No baseColorTexture found.`);
      }
      return {
        diffuseColor,
        flags,
        textures,
      };
    }),
  );

  console.log("gltfToBG3D: Restoring skeleton data...");
  let skeleton: BG3DSkeleton | undefined = undefined;
  
  // First, try to restore from extras (for round-trip compatibility)
  const rootExtras = doc.getRoot().getExtras() || {};
  console.log("gltfToBG3D: Root extras:", rootExtras);
  if ((rootExtras as any).bg3dFields?.skeleton) {
    console.log("gltfToBG3D: Found skeleton in extras");
    skeleton = (rootExtras as any).bg3dFields.skeleton;
    console.log("gltfToBG3D: Restored skeleton from extras:", {
      numBones: skeleton?.bones?.length,
      numAnimations: skeleton?.animations?.length
    });
  } else {
    // Try to extract from glTF skeleton/skin data
    const skins = doc.getRoot().listSkins();
    if (skins.length > 0) {
      console.log("gltfToBG3D: Extracting skeleton from glTF skin data");
      const skin = skins[0];
      const joints = skin.listJoints();
      
      if (joints.length > 0) {
        const bones: BG3DBone[] = [];
        
        // Convert joints back to bones
        joints.forEach((joint, index) => {
          const translation = joint.getTranslation() || [0, 0, 0];
          
          // Find parent bone index
          let parentBone = -1;
          const parent = (joint as any).getParent?.();
          if (parent) {
            parentBone = joints.indexOf(parent);
          }
          
          bones.push({
            parentBone,
            name: joint.getName() || `bone_${index}`,
            coordX: translation[0],
            coordY: translation[1],
            coordZ: translation[2],
            numPointsAttachedToBone: 0, // Would need to calculate from mesh data
            numNormalsAttachedToBone: 0, // Would need to calculate from mesh data
            pointIndices: [], // Would need to extract from joint weights
            normalIndices: [], // Would need to extract from joint weights
          });
        });
        
        skeleton = {
          version: 272, // Default version
          numAnims: 0, // No animations extracted yet
          numJoints: bones.length,
          num3DMFLimbs: 0,
          bones,
          animations: extractAnimationsFromGLTF(doc, joints), // Extract animations from glTF
        };
      }
    }
  }

  console.log("gltfToBG3D: Restoring geometries...");
  //TODO: Needs Fixing
  //TODO: Not scanning nodes?
  //TODO: Double roundtrip ruins texture data
  //doc.getGraph().listEdges()[0].getChild()

  // Processes a glTF Node, extracts mesh/geometry data, and returns BG3DGeometry[]
  // Processes a glTF Node, extracts mesh/geometry data, and returns BG3DGroup
  function processNode(node: Node): BG3DGroup | BG3DGeometry {
    const children: (BG3DGroup | BG3DGeometry)[] = [];
    const mesh = node.getMesh();
    if (mesh) {
      // Use processMesh to extract geometry from mesh
      return processMesh(mesh, 0);
    }
    // Recursively process child nodes
    const nodeChildren = node.listChildren();
    for (const childNode of nodeChildren) {
      children.push(processNode(childNode));
    }
    return { children };
  }

  function processMesh(mesh: Mesh, meshIdx: number) {
    console.log(`Parsing mesh ${mesh.getName()}`);
    const primitives = mesh.listPrimitives();
    const prim = primitives[0]; // Assuming single primitive per mesh
    const extras = prim.getExtras() || {};
    // POSITION

    const posAcc = prim.getAttribute("POSITION");
    let vertices: [number, number, number][] | undefined = undefined;
    if (posAcc) {
      const arr = Array.from(posAcc.getArray() as Float32Array);
      vertices = [];
      for (let i = 0; i < arr.length; i += 3) {
        if (i + 2 < arr.length) vertices.push([arr[i], arr[i + 1], arr[i + 2]]);
      }
    }
    const numPoints = vertices ? vertices.length : 0;
    // NORMAL
    const normAcc = prim.getAttribute("NORMAL");
    let normals: [number, number, number][] | undefined = undefined;
    if (normAcc) {
      const arr = Array.from(normAcc.getArray() as Float32Array);
      normals = [];
      for (let i = 0; i < arr.length; i += 3) {
        if (i + 2 < arr.length) normals.push([arr[i], arr[i + 1], arr[i + 2]]);
      }
    }
    // UV
    const uvAcc = prim.getAttribute("TEXCOORD_0");
    let uvs: [number, number][] | undefined = undefined;
    if (uvAcc) {
      const arr = Array.from(uvAcc.getArray() as Float32Array);
      uvs = [];
      for (let i = 0; i < arr.length; i += 2) {
        if (i + 1 < arr.length) uvs.push([arr[i], arr[i + 1]]);
      }
    }
    // COLOR
    const colorAcc = prim.getAttribute("COLOR_0");
    let colors: [number, number, number, number][] | undefined = undefined;
    if (colorAcc) {
      const arr = Array.from(colorAcc.getArray() as Uint8Array);
      colors = [];
      for (let i = 0; i < arr.length; i += 4) {
        if (i + 3 < arr.length)
          colors.push([arr[i], arr[i + 1], arr[i + 2], arr[i + 3]]);
      }
    }
    // TRIANGLES
    const idxAcc = prim.getIndices();
    let triangles: [number, number, number][] | undefined = undefined;
    if (idxAcc) {
      const arr = Array.from(idxAcc.getArray() as Uint32Array);
      triangles = [];
      for (let i = 0; i < arr.length; i += 3) {
        if (i + 2 < arr.length)
          triangles.push([arr[i], arr[i + 1], arr[i + 2]]);
      }
    }
    const numTriangles = triangles ? triangles.length : 0;

    // Unmappable fields from extras

    let layerMaterialNum: number[] = [0, 0, 0, 0];

    let numMaterials = 0;
    for (let i = 0; i < 4 && i < primitives.length; i++) {
      //Find index of corresponding material in docmaterials

      let found = false;
      for (let j = 0; j < docMaterials.length; j++) {
        if (docMaterials[j] === primitives[i].getMaterial()) {
          layerMaterialNum[i] = j;
          numMaterials++;
          found = true;

          break;
        }
      }
      if (!found) {
        console.warn(
          `Geometry mesh[${meshIdx}] prim[${i}]: No matching material found for primitive`,
        );
      }
    }

    /*     if (
      Array.isArray(extras.layerMaterialNum) &&
      extras.layerMaterialNum.length === 4
    ) {
      layerMaterialNum = extras.layerMaterialNum;
    } */
    console.log("Layer Material Num:", layerMaterialNum);
    console.log("numMaterials:", numMaterials);
    const flags = typeof extras.flags === "number" ? extras.flags : 0;
    let boundingBox:
      | { min: [number, number, number]; max: [number, number, number] }
      | undefined = undefined;
    if (
      extras.boundingBox &&
      typeof extras.boundingBox === "object" &&
      Array.isArray((extras.boundingBox as any).min) &&
      Array.isArray((extras.boundingBox as any).max) &&
      (extras.boundingBox as any).min.length === 3 &&
      (extras.boundingBox as any).max.length === 3
    ) {
      boundingBox = {
        min: (extras.boundingBox as any).min,
        max: (extras.boundingBox as any).max,
      };
    }
    // Restore type, numMaterials, numPoints, numTriangles from extras if present
    const type = typeof extras.type === "number" ? extras.type : 0;

    console.log(
      `Geometry mesh[${meshIdx}] prim[]: vertices=${
        vertices?.length ?? 0
      }, normals=${normals?.length ?? 0}, uvs=${uvs?.length ?? 0}, colors=${
        colors?.length ?? 0
      }, triangles=${triangles?.length ?? 0}, layerMaterialNum=`,
      layerMaterialNum,
      "flags=",
      flags,
      "boundingBox=",
      boundingBox,
      "type=",
      type,
      "numMaterials=",
      numMaterials,
      "numPoints=",
      numPoints,
      "numTriangles=",
      numTriangles,
    );
    return {
      vertices,
      normals,
      uvs,
      colors,
      triangles,
      layerMaterialNum,
      flags,
      boundingBox,
      numMaterials,
      type,
      numPoints,
      numTriangles,
    };
  }

  const childNodes = doc.getRoot().listScenes()[0].listChildren();
  //childNodes.forEach(node => node.getM)
  console.log("childNodes:");
  console.log(childNodes);
  const processedNodes = childNodes.map((node) => processNode(node));
  //Flat processing
  //TODO: FIX, REMOVE AND REPLACE
  const geometries: BG3DGeometry[] = [];
  doc
    .getRoot()
    .listMeshes()
    .forEach((mesh, meshIdx) => {
      geometries.push(processMesh(mesh, meshIdx));
    });

  /*   console.log("gltfToBG3D: Restoring groups...");
  const rootExtras = doc.getRoot().getExtras() || {};
  if (Array.isArray(rootExtras.groups)) {
    console.log("gltfToBG3D: Found group structure in root extras.");
    groups = rootExtras.groups;
  } else {
    console.log(
      "gltfToBG3D: No group structure found, creating single group with all geometries.",
    );
    groups = [{ children: geometries }];
  }
 */
  const result = {
    materials,
    //TODO: Fix any use
    groups: processedNodes as any as BG3DGroup[], //groups,
    skeleton, // Include extracted skeleton data
    //groups,
  };
  console.log("gltfToBG3D: Final BG3DParseResult:", result);
  return result;
}
