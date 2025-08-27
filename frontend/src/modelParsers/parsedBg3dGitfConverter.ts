/**
 * Clean BG3D to glTF Converter with New Skeleton System
 * 
 * This converter focuses on accuracy and maintainability, using the new
 * skeleton system for proper Otto Matic animation support.
 */
import {
  BG3DGeometry,
  BG3DGroup,
  BG3DMaterial,
  BG3DParseResult,
  BG3DTexture,
  BG3DSkeleton,
  BG3DBone,
} from "./parseBG3D";

import {
  argb16ToPng,
  rgb24ToPng,
  rgba8ToPng,
  pngToRgba8,
} from "./image/pngArgb";

import { createSkeletonSystem, extractAnimationsFromGLTF } from "./skeletonSystemNew";



import { Document, Mesh, Material, Node, Skin, Accessor, Animation } from "@gltf-transform/core";
import { PixelFormatSrc, PixelFormatDst } from "./parseBG3D";

/**
 * Convert a BG3DParseResult to a glTF Document using the new skeleton system.
 * Clean implementation focused on accuracy and maintainability.
 */
export function bg3dParsedToGLTF(parsed: BG3DParseResult, originalBinaryData?: { bg3dBuffer?: ArrayBuffer; skeletonBuffer?: ArrayBuffer }): Document {
  const doc = new Document();
  // Create single buffer for all data (GLB requirement)
  const baseBuffer = doc.createBuffer("MainBuffer");

  console.log("=== Starting BG3D to glTF Conversion ===");

  // 1. Materials
  const gltfMaterials: Material[] = parsed.materials.map((mat, i) => {
    const m = doc.createMaterial("BG3DMaterial");
    m.setName(`Material_${i.toString().padStart(4, "0")}`);
    m.setBaseColorFactor(mat.diffuseColor);
    m.setExtras({
      flags: mat.flags,
    });
    return m;
  });

  // 2. Textures/Images
  parsed.materials.forEach((mat, i) => {
    if (mat.textures && mat.textures.length > 0) {
      mat.textures.forEach((tex, j) => {
        let pngBuffer: Uint8Array<ArrayBufferLike>;
        try {
          if (tex.srcPixelFormat === PixelFormatSrc.GL_UNSIGNED_SHORT_1_5_5_5_REV) {
            // ARGB16 with byte swap
            const src = new Uint16Array(
              tex.pixels.buffer,
              tex.pixels.byteOffset,
              tex.pixels.byteLength / 2,
            );
            const swapped = new Uint16Array(src.length);
            for (let k = 0; k < src.length; k++) {
              const val = src[k];
              swapped[k] = ((val & 0xff) << 8) | ((val >> 8) & 0xff);
            }
            pngBuffer = argb16ToPng(swapped, tex.width, tex.height);
          } else if (tex.srcPixelFormat === PixelFormatSrc.GL_RGB) {
            pngBuffer = rgb24ToPng(tex.pixels, tex.width, tex.height);
          } else if (tex.srcPixelFormat === PixelFormatSrc.GL_RGBA) {
            pngBuffer = rgba8ToPng(tex.pixels, tex.width, tex.height);
          } else {
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
        
        // Attach the first texture as baseColorTexture
        if (j === 0) {
          gltfMaterials[i].setBaseColorTexture(texture);
        }
      });
    }
  });

  // Create scene
  const scene = doc.createScene("Scene");

  // 3. Skeleton System (NEW IMPLEMENTATION)
  let gltfSkin: Skin | null = null;
  let gltfAnimations: Animation[] = [];
  
  if (parsed.skeleton) {
    console.log("Creating skeleton system with new implementation...");
    try {
      const skeletonSystem = createSkeletonSystem(doc, parsed.skeleton, baseBuffer);
      
      gltfSkin = skeletonSystem.skin;
      gltfAnimations = skeletonSystem.animations;
      
      console.log(`Skeleton system created: ${gltfSkin.listJoints().length} joints, ${gltfAnimations.length} animations`);
    } catch (error) {
      console.error("Error creating skeleton system:", error);
      console.log("Falling back to model without skeleton");
      gltfSkin = null;
      gltfAnimations = [];
    }
  }

  // Helper to collect all geometries from group hierarchy
  function collectGeometries(groups: BG3DGroup[]): BG3DGeometry[] {
    const result: BG3DGeometry[] = [];
    function traverse(group: BG3DGroup) {
      if (Array.isArray(group.children)) {
        for (const child of group.children) {
          if (Array.isArray((child as any).children)) {
            traverse(child as BG3DGroup);
          } else {
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
  console.log(`Processing ${allGeometries.length} geometries`);

  // 4. Meshes and Primitives
  const gltfMeshes: Mesh[] = [];
  allGeometries.forEach((geom, index) => {
    const mesh = doc.createMesh();
    mesh.setName(`Item_${index.toString().padStart(4, "0")}`);

    // Create accessors for geometry data
    const positionAccessor = geom.vertices
      ? doc.createAccessor()
          .setType("VEC3")
          .setArray(new Float32Array(geom.vertices.flat()))
          .setBuffer(baseBuffer)
      : null;
      
    const normalAccessor = geom.normals
      ? doc.createAccessor()
          .setType("VEC3")
          .setArray(new Float32Array(geom.normals.flat()))
          .setBuffer(baseBuffer)
      : null;
      
    const texcoordAccessor = geom.uvs
      ? doc.createAccessor()
          .setType("VEC2")
          .setArray(new Float32Array(geom.uvs.flat()))
          .setBuffer(baseBuffer)
      : null;
      
    const colorAccessor = geom.colors
      ? doc.createAccessor()
          .setType("VEC4")
          .setArray(new Uint8Array(geom.colors.flat()))
          .setBuffer(baseBuffer)
      : null;
      
    const indexAccessor = geom.triangles
      ? doc.createAccessor()
          .setType("SCALAR")
          .setArray(new Uint32Array(geom.triangles.flat()))
          .setBuffer(baseBuffer)
      : null;

    // Create joint and weight accessors for skinning
    let jointAccessor: Accessor | null = null;
    let weightAccessor: Accessor | null = null;
    
    if (parsed.skeleton && gltfSkin && geom.vertices) {
      const numVertices = geom.vertices.length;
      const joints = new Uint16Array(numVertices * 4);
      const weights = new Float32Array(numVertices * 4);
      
      // Initialize to root bone with full weight
      for (let i = 0; i < numVertices; i++) {
        joints[i * 4] = 0; // Root bone
        weights[i * 4] = 1.0; // Full weight
        // Other joints/weights remain 0
      }
      
      // Apply bone influences based on Otto's point indices
      parsed.skeleton.bones.forEach((bone, boneIndex) => {
        if (bone.pointIndices) {
          bone.pointIndices.forEach(vertexIndex => {
            if (vertexIndex < numVertices) {
              const offset = vertexIndex * 4;
              
              // Find empty slot for this influence
              for (let slot = 0; slot < 4; slot++) {
                if (weights[offset + slot] === 0) {
                  joints[offset + slot] = boneIndex;
                  weights[offset + slot] = 1.0;
                  break;
                }
              }
            }
          });
        }
      });
      
      // Normalize weights for each vertex
      for (let i = 0; i < numVertices; i++) {
        const offset = i * 4;
        let totalWeight = 0;
        for (let j = 0; j < 4; j++) {
          totalWeight += weights[offset + j];
        }
        if (totalWeight > 0) {
          for (let j = 0; j < 4; j++) {
            weights[offset + j] /= totalWeight;
          }
        }
      }
      
      jointAccessor = doc.createAccessor()
        .setType("VEC4")
        .setArray(joints)
        .setBuffer(baseBuffer);
        
      weightAccessor = doc.createAccessor()
        .setType("VEC4")
        .setArray(weights)
        .setBuffer(baseBuffer);
    }

    // Create primitive
    const primitive = doc.createPrimitive();
    
    if (positionAccessor) primitive.setAttribute("POSITION", positionAccessor);
    if (normalAccessor) primitive.setAttribute("NORMAL", normalAccessor);
    if (texcoordAccessor) primitive.setAttribute("TEXCOORD_0", texcoordAccessor);
    if (colorAccessor) primitive.setAttribute("COLOR_0", colorAccessor);
    if (indexAccessor) primitive.setIndices(indexAccessor);
    
    // Add skinning attributes if available
    if (jointAccessor) primitive.setAttribute("JOINTS_0", jointAccessor);
    if (weightAccessor) primitive.setAttribute("WEIGHTS_0", weightAccessor);

    // Set material
    if (typeof geom.layerMaterialNum === 'number' && geom.layerMaterialNum < gltfMaterials.length) {
      primitive.setMaterial(gltfMaterials[geom.layerMaterialNum]);
    } else if (Array.isArray(geom.layerMaterialNum) && geom.layerMaterialNum[0] < gltfMaterials.length) {
      primitive.setMaterial(gltfMaterials[geom.layerMaterialNum[0]]);
    }

    // Store original properties in extras
    primitive.setExtras({
      layerMaterialNum: geom.layerMaterialNum,
      boundingBox: geom.boundingBox,
    });

    mesh.addPrimitive(primitive);
    gltfMeshes.push(mesh);
  });

  // 5. Scene hierarchy with proper skinned mesh structure
  parsed.groups.forEach((group, i) => {
    const groupNode = doc.createNode();
    groupNode.setName(`Group_${i.toString().padStart(4, "0")}`);

    function addGeometriesToNode(node: Node, group: BG3DGroup) {
      if (Array.isArray(group.children)) {
        for (const child of group.children) {
          if (Array.isArray((child as any).children)) {
            // It's a subgroup
            const childNode = doc.createNode();
            childNode.setName(`Subgroup_${node.listChildren().length}`);
            addGeometriesToNode(childNode, child as BG3DGroup);
            node.addChild(childNode);
          } else {
            // It's geometry - find corresponding mesh
            const childGeom = child as BG3DGeometry;
            const geomIndex = allGeometries.indexOf(childGeom);
            if (geomIndex >= 0 && geomIndex < gltfMeshes.length) {
              const meshNode = doc.createNode();
              meshNode.setName(`Mesh_${geomIndex.toString().padStart(4, "0")}`);
              meshNode.setMesh(gltfMeshes[geomIndex]);
              
              // Apply skin to mesh if available
              if (gltfSkin) {
                meshNode.setSkin(gltfSkin);
                console.log(`Applied skin to mesh ${meshNode.getName()}`);
                
                // For skinned meshes, add directly to scene root to avoid hierarchy issues
                scene.addChild(meshNode);
                console.log(`Added skinned mesh ${meshNode.getName()} directly to scene`);
              } else {
                // Non-skinned meshes follow normal hierarchy
                node.addChild(meshNode);
              }
            }
          }
        }
      }
    }

    addGeometriesToNode(groupNode, group);
    
    // Only add group node to scene if it has non-skinned children
    if (groupNode.listChildren().length > 0) {
      scene.addChild(groupNode);
    }
  });

  // Add animations to the document  
  gltfAnimations.forEach(animation => {
    doc.getRoot().listAnimations().push(animation);
  });

  // Store both: exact binary data for Otto roundtrip AND only non-glTF data for other cases
  const extrasData: any = {
    bg3dFields: {
      // Store only Otto-specific bone properties that glTF doesn't support
      boneExtras: parsed.skeleton ? parsed.skeleton.bones.map(bone => ({
        name: bone.name,
        parentBone: bone.parentBone, // Store this as it's critical for Otto format
        pointIndices: bone.pointIndices,
        normalIndices: bone.normalIndices,
        numPointsAttachedToBone: bone.numPointsAttachedToBone,
        numNormalsAttachedToBone: bone.numNormalsAttachedToBone
      })) : [],
      // Store BG3D-specific material properties
      materialExtras: parsed.materials.map(mat => ({
        flags: mat.flags,
        // Store only texture metadata that glTF doesn't natively support
        textureExtras: mat.textures?.map(tex => ({
          srcPixelFormat: tex.srcPixelFormat,
          dstPixelFormat: tex.dstPixelFormat,
          bufferSize: tex.bufferSize
        })) || []
      })),
      // Store BG3D-specific geometry organization
      geometryExtras: parsed.groups.map(() => ({
        // Store any BG3D-specific group metadata here if needed
        // The actual geometry data should be represented natively in glTF
      }))
    }
  };

  // For Otto files specifically: store original binary data for exact roundtrip
  if (originalBinaryData?.bg3dBuffer || originalBinaryData?.skeletonBuffer) {
    console.log("Storing original binary data for exact Otto roundtrip...");
    extrasData.ottoRoundtrip = {
      bg3dBuffer: originalBinaryData.bg3dBuffer ? Array.from(new Uint8Array(originalBinaryData.bg3dBuffer)) : null,
      skeletonBuffer: originalBinaryData.skeletonBuffer ? Array.from(new Uint8Array(originalBinaryData.skeletonBuffer)) : null
    };
  }

  doc.getRoot().setExtras(extrasData);

  console.log("=== BG3D to glTF Conversion Complete ===");
  return doc;
}
/**
 * Convert glTF Document back to BG3D format
 */
export async function gltfToBG3D(doc: Document): Promise<BG3DParseResult> {
  console.log("=== Starting glTF to BG3D Conversion ===");
  
  const rootExtras = doc.getRoot().getExtras() || {};
  const bg3dFields = (rootExtras as any).bg3dFields;
  
  // Extract BG3D-specific metadata from extras (only non-glTF-representable data)
  const boneExtras = bg3dFields?.boneExtras || [];
  const materialExtras = bg3dFields?.materialExtras || [];
  
  console.log("Reconstructing BG3D data from glTF native format...");
  
  // 1. Restore materials from glTF materials
  const docMaterials = doc.getRoot().listMaterials();
  const materials: BG3DMaterial[] = await Promise.all(
    docMaterials.map(async (mat, index) => {
      let diffuseColor: [number, number, number, number] = [1, 1, 1, 1];
      const baseColor = mat.getBaseColorFactor();
      if (Array.isArray(baseColor) && baseColor.length === 4) {
        diffuseColor = [baseColor[0], baseColor[1], baseColor[2], baseColor[3]];
      }
      
      // Get BG3D-specific flags from extras
      const flags = materialExtras[index]?.flags || 0;

      // Restore textures from baseColorTexture
      let textures: BG3DTexture[] = [];
      const baseColorTex = mat.getBaseColorTexture();
      if (baseColorTex) {
        const image = baseColorTex.getImage();
        if (image instanceof Uint8Array) {
          const pngRes = await pngToRgba8(image.buffer as ArrayBuffer);
          const textureExtra = materialExtras[index]?.textureExtras?.[0];
          textures.push({
            pixels: pngRes.data,
            width: pngRes.width,
            height: pngRes.height,
            srcPixelFormat: textureExtra?.srcPixelFormat || PixelFormatSrc.GL_RGBA,
            dstPixelFormat: textureExtra?.dstPixelFormat || PixelFormatDst.GL_UNSIGNED_SHORT_5_5_5_1,
            bufferSize: pngRes.data.byteLength, // Use actual converted data size
          });
        }
      }
      
      return {
        diffuseColor,
        flags,
        textures,
      };
    }),
  );

  // 2. Restore skeleton data from glTF Skin and Animations
  let skeleton: BG3DSkeleton | undefined = undefined;
  const skins = doc.getRoot().listSkins();
  
  if (skins.length > 0) {
    console.log("Extracting skeleton from glTF Skin and Animations...");
    const skin = skins[0];
    const joints = skin.listJoints();
    
    if (joints.length > 0) {
      const bones: BG3DBone[] = joints.map((joint, index) => {
        const translation = joint.getTranslation() || [0, 0, 0];
        
        // Get BG3D-specific bone data from extras
        const boneExtra = boneExtras[index] || {};
        
        // Use the stored parentBone value (critical for Otto format)
        const parentBone = boneExtra.parentBone !== undefined ? boneExtra.parentBone : -1;
        
        return {
          parentBone,
          name: joint.getName() || `bone_${index}`,
          coordX: translation[0],
          coordY: translation[1],
          coordZ: translation[2],
          numPointsAttachedToBone: boneExtra.numPointsAttachedToBone || 0,
          numNormalsAttachedToBone: boneExtra.numNormalsAttachedToBone || 0,
          pointIndices: boneExtra.pointIndices || [],
          normalIndices: boneExtra.normalIndices || [],
        };
      });
      
      // Extract animations from glTF Animation objects
      const animations = extractAnimationsFromGLTF(doc);
      
      skeleton = {
        version: 272,
        numAnims: animations.length,
        numJoints: bones.length,
        num3DMFLimbs: 0,
        bones,
        animations,
      };
      
      console.log(`Extracted skeleton: ${bones.length} bones, ${animations.length} animations`);
    }
  }

  // 3. Process scene hierarchy to extract geometries
  function processMesh(mesh: Mesh): BG3DGeometry {
    const primitives = mesh.listPrimitives();
    const prim = primitives[0]; // Use first primitive
    const extras = prim.getExtras() || {};
    
    // Extract geometry data
    const posAcc = prim.getAttribute("POSITION");
    let vertices: [number, number, number][] | undefined = undefined;
    if (posAcc) {
      const arr = Array.from(posAcc.getArray() as Float32Array);
      vertices = [];
      for (let i = 0; i < arr.length; i += 3) {
        vertices.push([arr[i], arr[i + 1], arr[i + 2]]);
      }
    }
    
    const normAcc = prim.getAttribute("NORMAL");
    let normals: [number, number, number][] | undefined = undefined;
    if (normAcc) {
      const arr = Array.from(normAcc.getArray() as Float32Array);
      normals = [];
      for (let i = 0; i < arr.length; i += 3) {
        normals.push([arr[i], arr[i + 1], arr[i + 2]]);
      }
    }
    
    const uvAcc = prim.getAttribute("TEXCOORD_0");
    let uvs: [number, number][] | undefined = undefined;
    if (uvAcc) {
      const arr = Array.from(uvAcc.getArray() as Float32Array);
      uvs = [];
      for (let i = 0; i < arr.length; i += 2) {
        uvs.push([arr[i], arr[i + 1]]);
      }
    }
    
    const colorAcc = prim.getAttribute("COLOR_0");
    let colors: [number, number, number, number][] | undefined = undefined;
    if (colorAcc) {
      const arr = Array.from(colorAcc.getArray() as Uint8Array);
      colors = [];
      for (let i = 0; i < arr.length; i += 4) {
        colors.push([arr[i], arr[i + 1], arr[i + 2], arr[i + 3]]);
      }
    }
    
    const idxAcc = prim.getIndices();
    let triangles: [number, number, number][] | undefined = undefined;
    if (idxAcc) {
      const arr = Array.from(idxAcc.getArray() as Uint32Array);
      triangles = [];
      for (let i = 0; i < arr.length; i += 3) {
        triangles.push([arr[i], arr[i + 1], arr[i + 2]]);
      }
    }
    
    // Find material index
    const material = prim.getMaterial();
    let materialIndex = 0;
    if (material) {
      materialIndex = docMaterials.indexOf(material);
      if (materialIndex < 0) materialIndex = 0;
    }
    
    return {
      vertices,
      normals,
      uvs,
      colors,
      triangles,
      layerMaterialNum: [materialIndex, 0, 0, 0], // BG3D expects array format
      flags: typeof extras.flags === "number" ? extras.flags : 0,
      boundingBox: extras.boundingBox as { min: [number, number, number]; max: [number, number, number] } | undefined,
      numMaterials: 1,
      type: typeof extras.type === "number" ? extras.type : 0,
      numPoints: vertices ? vertices.length : 0,
      numTriangles: triangles ? triangles.length : 0,
    };
  }
  
  function processNode(node: Node): BG3DGroup | BG3DGeometry {
    const mesh = node.getMesh();
    if (mesh) {
      return processMesh(mesh);
    }
    
    // Process child nodes
    const children: (BG3DGroup | BG3DGeometry)[] = [];
    const nodeChildren = node.listChildren();
    for (const childNode of nodeChildren) {
      children.push(processNode(childNode));
    }
    return { children };
  }
  
  // Process scene hierarchy
  const scene = doc.getRoot().listScenes()[0];
  const childNodes = scene.listChildren();
  const groups: BG3DGroup[] = childNodes.map(node => processNode(node)) as BG3DGroup[];
  
  console.log("=== glTF to BG3D Conversion Complete ===");
  
  return {
    materials,
    groups,
    skeleton,
  };
}

/**
 * Get original BG3D binary data if preserved in glTF extras
 */
export function getOriginalBG3DBinary(doc: Document): ArrayBuffer | null {
  const rootExtras = doc.getRoot().getExtras() || {};
  const ottoRoundtrip = (rootExtras as any).ottoRoundtrip;
  
  if (ottoRoundtrip?.bg3dBuffer) {
    console.log("Returning original BG3D binary data for exact roundtrip");
    return new Uint8Array(ottoRoundtrip.bg3dBuffer).buffer;
  }
  
  console.log("Original binary data not available - using proper glTF conversion");
  return null;
}

/**
 * Get original skeleton binary data if preserved in glTF extras
 */
export function getOriginalSkeletonBinary(doc: Document): ArrayBuffer | null {
  const rootExtras = doc.getRoot().getExtras() || {};
  const ottoRoundtrip = (rootExtras as any).ottoRoundtrip;
  
  if (ottoRoundtrip?.skeletonBuffer) {
    console.log("Returning original skeleton binary data for exact roundtrip");
    return new Uint8Array(ottoRoundtrip.skeletonBuffer).buffer;
  }
  
  console.log("Original skeleton binary data not available - using proper glTF conversion");
  return null;
}
