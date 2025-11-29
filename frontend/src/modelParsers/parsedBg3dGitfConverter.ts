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

import {
  createSkeletonSystem,
  extractAnimationsFromGLTF,
} from "./skeletonSystemNew";

import {
  Document,
  Mesh,
  Material,
  Node,
  Skin,
  Accessor,
  Animation,
} from "@gltf-transform/core";
import { PixelFormatSrc, PixelFormatDst } from "./parseBG3D";
import { Quaternion } from "three";
import { parseSkeletonRsrcTS } from "./skeletonRsrc/parseSkeletonRsrcTS";

/**
 * Matrix utilities for coordinate transformations
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

  getTranslation(): { x: number; y: number; z: number } {
    return {
      x: this.data[12],
      y: this.data[13],
      z: this.data[14],
    };
  }

  invert(): Matrix4 {
    const result = new Matrix4();
    const m = this.data;
    const inv = result.data;

    // Calculate matrix inverse using standard algorithm
    inv[0] =
      m[5] * m[10] * m[15] -
      m[5] * m[11] * m[14] -
      m[9] * m[6] * m[15] +
      m[9] * m[7] * m[14] +
      m[13] * m[6] * m[11] -
      m[13] * m[7] * m[10];
    inv[4] =
      -m[4] * m[10] * m[15] +
      m[4] * m[11] * m[14] +
      m[8] * m[6] * m[15] -
      m[8] * m[7] * m[14] -
      m[12] * m[6] * m[11] +
      m[12] * m[7] * m[10];
    inv[8] =
      m[4] * m[9] * m[15] -
      m[4] * m[11] * m[13] -
      m[8] * m[5] * m[15] +
      m[8] * m[7] * m[13] +
      m[12] * m[5] * m[11] -
      m[12] * m[7] * m[9];
    inv[12] =
      -m[4] * m[9] * m[14] +
      m[4] * m[10] * m[13] +
      m[8] * m[5] * m[14] -
      m[8] * m[6] * m[13] -
      m[12] * m[5] * m[10] +
      m[12] * m[6] * m[9];
    inv[1] =
      -m[1] * m[10] * m[15] +
      m[1] * m[11] * m[14] +
      m[9] * m[2] * m[15] -
      m[9] * m[3] * m[14] -
      m[13] * m[2] * m[11] +
      m[13] * m[3] * m[10];
    inv[5] =
      m[0] * m[10] * m[15] -
      m[0] * m[11] * m[14] -
      m[8] * m[2] * m[15] +
      m[8] * m[3] * m[14] +
      m[12] * m[2] * m[11] -
      m[12] * m[3] * m[10];
    inv[9] =
      -m[0] * m[9] * m[15] +
      m[0] * m[11] * m[13] +
      m[8] * m[1] * m[15] -
      m[8] * m[3] * m[13] -
      m[12] * m[1] * m[11] +
      m[12] * m[3] * m[9];
    inv[13] =
      m[0] * m[9] * m[14] -
      m[0] * m[10] * m[13] -
      m[8] * m[1] * m[14] +
      m[8] * m[2] * m[13] +
      m[12] * m[1] * m[10] -
      m[12] * m[2] * m[9];
    inv[2] =
      m[1] * m[6] * m[15] -
      m[1] * m[7] * m[14] -
      m[5] * m[2] * m[15] +
      m[5] * m[3] * m[14] +
      m[13] * m[2] * m[7] -
      m[13] * m[3] * m[6];
    inv[6] =
      -m[0] * m[6] * m[15] +
      m[0] * m[7] * m[14] +
      m[4] * m[2] * m[15] -
      m[4] * m[3] * m[14] -
      m[12] * m[2] * m[7] +
      m[12] * m[3] * m[6];
    inv[10] =
      m[0] * m[5] * m[15] -
      m[0] * m[7] * m[13] -
      m[4] * m[1] * m[15] +
      m[4] * m[3] * m[13] +
      m[12] * m[1] * m[7] -
      m[12] * m[3] * m[5];
    inv[14] =
      -m[0] * m[5] * m[14] +
      m[0] * m[6] * m[13] +
      m[4] * m[1] * m[14] -
      m[4] * m[2] * m[13] -
      m[12] * m[1] * m[6] +
      m[12] * m[2] * m[5];
    inv[3] =
      -m[1] * m[6] * m[11] +
      m[1] * m[7] * m[10] +
      m[5] * m[2] * m[11] -
      m[5] * m[3] * m[10] -
      m[9] * m[2] * m[7] +
      m[9] * m[3] * m[6];
    inv[7] =
      m[0] * m[6] * m[11] -
      m[0] * m[7] * m[10] -
      m[4] * m[2] * m[11] +
      m[4] * m[3] * m[10] +
      m[8] * m[2] * m[7] -
      m[8] * m[3] * m[6];
    inv[11] =
      -m[0] * m[5] * m[11] +
      m[0] * m[7] * m[9] +
      m[4] * m[1] * m[11] -
      m[4] * m[3] * m[9] -
      m[8] * m[1] * m[7] +
      m[8] * m[3] * m[5];
    inv[15] =
      m[0] * m[5] * m[10] -
      m[0] * m[6] * m[9] -
      m[4] * m[1] * m[10] +
      m[4] * m[2] * m[9] +
      m[8] * m[1] * m[6] -
      m[8] * m[2] * m[5];

    const det = m[0] * inv[0] + m[1] * inv[4] + m[2] * inv[8] + m[3] * inv[12];

    if (det === 0) {
      console.warn("Matrix is not invertible");
      return result.identity();
    }

    const invDet = 1.0 / det;
    for (let i = 0; i < 16; i++) {
      inv[i] *= invDet;
    }

    return result;
  }

  multiply(other: Matrix4): Matrix4 {
    const result = new Matrix4();
    const a = this.data;
    const b = other.data;
    const out = result.data;

    const a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3];
    const a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7];
    const a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11];
    const a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15];

    const b00 = b[0],
      b01 = b[1],
      b02 = b[2],
      b03 = b[3];
    const b10 = b[4],
      b11 = b[5],
      b12 = b[6],
      b13 = b[7];
    const b20 = b[8],
      b21 = b[9],
      b22 = b[10],
      b23 = b[11];
    const b30 = b[12],
      b31 = b[13],
      b32 = b[14],
      b33 = b[15];

    out[0] = a00 * b00 + a01 * b10 + a02 * b20 + a03 * b30;
    out[1] = a00 * b01 + a01 * b11 + a02 * b21 + a03 * b31;
    out[2] = a00 * b02 + a01 * b12 + a02 * b22 + a03 * b32;
    out[3] = a00 * b03 + a01 * b13 + a02 * b23 + a03 * b33;
    out[4] = a10 * b00 + a11 * b10 + a12 * b20 + a13 * b30;
    out[5] = a10 * b01 + a11 * b11 + a12 * b21 + a13 * b31;
    out[6] = a10 * b02 + a11 * b12 + a12 * b22 + a13 * b32;
    out[7] = a10 * b03 + a11 * b13 + a12 * b23 + a13 * b33;
    out[8] = a20 * b00 + a21 * b10 + a22 * b20 + a23 * b30;
    out[9] = a20 * b01 + a21 * b11 + a22 * b21 + a23 * b31;
    out[10] = a20 * b02 + a21 * b12 + a22 * b22 + a23 * b32;
    out[11] = a20 * b03 + a21 * b13 + a22 * b23 + a23 * b33;
    out[12] = a30 * b00 + a31 * b10 + a32 * b20 + a33 * b30;
    out[13] = a30 * b01 + a31 * b11 + a32 * b21 + a33 * b31;
    out[14] = a30 * b02 + a31 * b12 + a32 * b22 + a33 * b32;
    out[15] = a30 * b03 + a31 * b13 + a32 * b23 + a33 * b33;

    return result;
  }

  makeRotationFromQuaternion(q: {
    x: number;
    y: number;
    z: number;
    w: number;
  }): Matrix4 {
    const x = q.x,
      y = q.y,
      z = q.z,
      w = q.w;
    const x2 = x + x,
      y2 = y + y,
      z2 = z + z;
    const xx = x * x2,
      xy = x * y2,
      xz = x * z2;
    const yy = y * y2,
      yz = y * z2,
      zz = z * z2;
    const wx = w * x2,
      wy = w * y2,
      wz = w * z2;

    this.data[0] = 1 - (yy + zz);
    this.data[1] = xy + wz;
    this.data[2] = xz - wy;
    this.data[3] = 0;

    this.data[4] = xy - wz;
    this.data[5] = 1 - (xx + zz);
    this.data[6] = yz + wx;
    this.data[7] = 0;

    this.data[8] = xz + wy;
    this.data[9] = yz - wx;
    this.data[10] = 1 - (xx + yy);
    this.data[11] = 0;

    this.data[12] = 0;
    this.data[13] = 0;
    this.data[14] = 0;
    this.data[15] = 1;

    return this;
  }

  makeScale(x: number, y: number, z: number): Matrix4 {
    this.identity();
    this.data[0] = x;
    this.data[5] = y;
    this.data[10] = z;
    return this;
  }
}

/**
 * Convert a BG3DParseResult to a glTF Document using the new skeleton system.
 * Clean implementation focused on accuracy and maintainability.
 */
export function bg3dParsedToGLTF(
  parsed: BG3DParseResult,
  originalBinaryData?: {
    bg3dBuffer?: ArrayBuffer;
    skeletonBuffer?: ArrayBuffer;
  },
): Document {
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
          if (
            tex.srcPixelFormat === PixelFormatSrc.GL_UNSIGNED_SHORT_1_5_5_5_REV
          ) {
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

  // Create scene and set as default
  const scene = doc.createScene("Scene");
  doc.getRoot().setDefaultScene(scene);

  // 3. Skeleton System (NEW IMPLEMENTATION)
  let gltfSkin: Skin | null = null;
  let gltfAnimations: Animation[] = [];

  if (parsed.skeleton) {
    console.log("Creating skeleton system with new implementation...");
    console.log(
      `Input skeleton has ${parsed.skeleton.bones.length} bones, ${parsed.skeleton.animations.length} animations`,
    );

    const skeletonSystem = createSkeletonSystem(
      doc,
      parsed.skeleton,
      baseBuffer,
    );

    gltfSkin = skeletonSystem.skin;
    gltfAnimations = skeletonSystem.animations;

    console.log(
      `Skeleton system created: skin=${!!gltfSkin}, joints=${
        gltfSkin?.listJoints().length
      }, animations=${gltfAnimations.length}`,
    );
  } else {
    console.log("No skeleton data in parsed BG3D");
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

    // Create joint and weight accessors for skinning
    let jointAccessor: Accessor | null = null;
    let weightAccessor: Accessor | null = null;

    if (parsed.skeleton && gltfSkin && geom.vertices) {
      const numVertices = geom.vertices.length;
      const joints = new Uint16Array(numVertices * 4);
      const weights = new Float32Array(numVertices * 4);

      // All arrays initialized to 0 (no bone influences by default)

      // Apply bone influences based on Otto's point indices
      // Each vertex can be influenced by multiple bones - we track all influences
      parsed.skeleton.bones.forEach((bone, boneIndex) => {
        if (bone.pointIndices) {
          bone.pointIndices.forEach((vertexIndex) => {
            if (vertexIndex < numVertices) {
              const offset = vertexIndex * 4;

              // Find empty slot for this influence (skip slots already used)
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
      // If a vertex has no bone influences, assign it to root bone (bone 0)
      for (let i = 0; i < numVertices; i++) {
        const offset = i * 4;
        let totalWeight = 0;
        for (let j = 0; j < 4; j++) {
          totalWeight += weights[offset + j];
        }

        if (totalWeight > 0) {
          // Normalize existing weights
          for (let j = 0; j < 4; j++) {
            weights[offset + j] /= totalWeight;
          }
        } else {
          // No bone influences - assign to root bone
          joints[offset] = 0;
          weights[offset] = 1.0;
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

    // Create primitive
    const primitive = doc.createPrimitive();

    if (positionAccessor) primitive.setAttribute("POSITION", positionAccessor);
    if (normalAccessor) primitive.setAttribute("NORMAL", normalAccessor);
    if (texcoordAccessor)
      primitive.setAttribute("TEXCOORD_0", texcoordAccessor);
    if (colorAccessor) primitive.setAttribute("COLOR_0", colorAccessor);
    if (indexAccessor) primitive.setIndices(indexAccessor);

    // Add skinning attributes if available
    if (jointAccessor) primitive.setAttribute("JOINTS_0", jointAccessor);
    if (weightAccessor) primitive.setAttribute("WEIGHTS_0", weightAccessor);

    // Set material
    if (
      typeof geom.layerMaterialNum === "number" &&
      geom.layerMaterialNum < gltfMaterials.length
    ) {
      primitive.setMaterial(gltfMaterials[geom.layerMaterialNum]);
    } else if (
      Array.isArray(geom.layerMaterialNum) &&
      geom.layerMaterialNum[0] < gltfMaterials.length
    ) {
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
  // Helper: determine if a given geometry (by BG3DGeometry) will be treated as non-skinned
  function isGeometrySkinnedByIndex(geom: BG3DGeometry): boolean {
    const geomIndex = allGeometries.indexOf(geom);
    if (geomIndex < 0 || geomIndex >= gltfMeshes.length) return false;
    const mesh = gltfMeshes[geomIndex];
    const prim = mesh.listPrimitives()[0];
    if (!prim) return false;
    return !!prim.getAttribute("JOINTS_0");
  }

  // Helper: check whether a group contains any geometry that should be part of the scene hierarchy
  function groupHasNonSkinnedChildren(group: BG3DGroup): boolean {
    if (!Array.isArray(group.children)) return false;
    for (const child of group.children) {
      if (Array.isArray((child as any).children)) {
        if (groupHasNonSkinnedChildren(child as BG3DGroup)) return true;
      } else {
        const geom = child as BG3DGeometry;
        // If this geometry is NOT skinned, it should be part of the group hierarchy
        if (!isGeometrySkinnedByIndex(geom)) return true;
      }
    }
    return false;
  }

  // Determine scene root after skeleton creation (createSkeletonSystem may have set a default scene)
  const sceneRoot = doc.getRoot().getDefaultScene() || scene;

  // Find the Armature node (skeleton root) to attach skinned meshes to
  // Skinned meshes MUST be children of (or siblings to) the skeleton root in glTF
  let skeletonArmatureNode: Node | null = null;
  if (gltfSkin) {
    const skeletonRoot = gltfSkin.getSkeleton();
    if (skeletonRoot && skeletonRoot.getName() === "Armature") {
      skeletonArmatureNode = skeletonRoot;
      console.log("Found Armature node for attaching skinned meshes");
    }
  }

  // Note: RelP (relative points) are NOT converted to glTF meshes.
  // RelP is mesh deformation data used during animation, not geometry to render.
  // It is preserved in the skeleton resource for round-trip but not visualized.

  // Helper: add skinned meshes from a group as children of the Armature node
  // This is REQUIRED by glTF spec - skinned meshes must be descendants of skeleton root
  function addSkinnedMeshesFromGroup(group: BG3DGroup) {
    if (!Array.isArray(group.children)) return;
    for (const child of group.children) {
      if (Array.isArray((child as any).children)) {
        addSkinnedMeshesFromGroup(child as BG3DGroup);
      } else {
        const childGeom = child as BG3DGeometry;
        const geomIndex = allGeometries.indexOf(childGeom);
        if (geomIndex >= 0 && geomIndex < gltfMeshes.length) {
          const prim = gltfMeshes[geomIndex].listPrimitives()[0];
          const primHasJoints = !!(
            prim &&
            prim.getAttribute &&
            prim.getAttribute("JOINTS_0")
          );
          if (gltfSkin && primHasJoints) {
            const meshNode = doc.createNode();
            meshNode.setName(`Mesh_${geomIndex.toString().padStart(4, "0")}`);
            meshNode.setMesh(gltfMeshes[geomIndex]);
            meshNode.setSkin(gltfSkin);

            // CRITICAL: Add skinned mesh as child of Armature node (skeleton root)
            // This is REQUIRED by glTF 2.0 specification
            if (skeletonArmatureNode) {
              skeletonArmatureNode.addChild(meshNode);
              console.log(
                `✅ Added skinned mesh ${meshNode.getName()} as child of Armature (CORRECT)`,
              );
            } else {
              // Fallback: add to scene root (but this violates glTF spec)
              sceneRoot.addChild(meshNode);
              console.warn(
                `⚠️  Added skinned mesh ${meshNode.getName()} to scene root (no Armature found)`,
              );
            }
          }
        }
      }
    }
  }

  parsed.groups.forEach((group, i) => {
    const hasNonSkinned = groupHasNonSkinnedChildren(group);

    // If group contains non-skinned geometry, create nodes for hierarchy
    if (hasNonSkinned) {
      const groupNode = doc.createNode();
      groupNode.setName(`Group_${i.toString().padStart(4, "0")}`);

      function addGeometriesToNode(node: Node, group: BG3DGroup) {
        if (Array.isArray(group.children)) {
          for (const child of group.children) {
            if (Array.isArray((child as any).children)) {
              const subgroup = child as BG3DGroup;
              if (groupHasNonSkinnedChildren(subgroup)) {
                const childNode = doc.createNode();
                childNode.setName(`Subgroup_${node.listChildren().length}`);
                addGeometriesToNode(childNode, subgroup);
                node.addChild(childNode);
              }
            } else {
              const childGeom = child as BG3DGeometry;
              const geomIndex = allGeometries.indexOf(childGeom);
              if (geomIndex >= 0 && geomIndex < gltfMeshes.length) {
                const meshNode = doc.createNode();
                meshNode.setName(
                  `Mesh_${geomIndex.toString().padStart(4, "0")}`,
                );
                meshNode.setMesh(gltfMeshes[geomIndex]);

                const prim = gltfMeshes[geomIndex].listPrimitives()[0];
                const primHasJoints = !!(
                  prim &&
                  prim.getAttribute &&
                  prim.getAttribute("JOINTS_0")
                );

                if (!primHasJoints) {
                  node.addChild(meshNode);
                }
              }
            }
          }
        }
      }

      addGeometriesToNode(groupNode, group);

      if (groupNode.listChildren().length > 0) {
        sceneRoot.addChild(groupNode);
      }
    }

    // Always add any skinned meshes present in this group directly to the sceneRoot
    addSkinnedMeshesFromGroup(group);
  });

  // Note: Animations are automatically added to the document when created with doc.createAnimation()
  // No need to manually push them to the list
  console.log(
    `glTF document now has ${doc.getRoot().listAnimations().length} animations`,
  );

  // Store only non-glTF-representable data (material/texture metadata)
  // DO NOT store skeleton data or binary blobs - these must round-trip through glTF structures
  const extrasData: any = {
    bg3dFields: {
      // Note: Skeleton data (bones, pointIndices, animations) stored in native glTF format
      // Store BG3D-specific material properties
      materialExtras: parsed.materials.map((mat) => ({
        flags: mat.flags,
        // Store only texture metadata that glTF doesn't natively support
        textureExtras:
          mat.textures?.map((tex) => ({
            srcPixelFormat: tex.srcPixelFormat,
            dstPixelFormat: tex.dstPixelFormat,
            bufferSize: tex.bufferSize,
          })) || [],
      })),
      // Store BG3D-specific geometry organization
      geometryExtras: parsed.groups.map(() => ({
        // Store any BG3D-specific group metadata here if needed
        // The actual geometry data should be represented natively in glTF
      })),
    },
  };

  // Preserve original binary data ONLY when explicitly provided; this is required by some tests/tools
  if (originalBinaryData) {
    try {
      (extrasData as any).originalBinaries = {};
      if (originalBinaryData.bg3dBuffer)
        (extrasData as any).originalBinaries.bg3d = Array.from(
          new Uint8Array(originalBinaryData.bg3dBuffer),
        );
      if (originalBinaryData.skeletonBuffer)
        (extrasData as any).originalBinaries.skeleton = Array.from(
          new Uint8Array(originalBinaryData.skeletonBuffer),
        );
    } catch (e) {
      // ignore
    }
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
  const materialExtras = bg3dFields?.materialExtras || [];

  // Note: Bone data (pointIndices, normalIndices) will be reconstructed from mesh skinning data

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
          // Verify this is valid PNG data by checking PNG signature
          const isPNG =
            image.length >= 8 &&
            image[0] === 0x89 &&
            image[1] === 0x50 &&
            image[2] === 0x4e &&
            image[3] === 0x47 &&
            image[4] === 0x0d &&
            image[5] === 0x0a &&
            image[6] === 0x1a &&
            image[7] === 0x0a;

          if (isPNG) {
            // BG3D textures are typically RGB format (no alpha channel)
            // Even if PNG is stored as RGBA in glTF (due to pngjs library limitations),
            // we convert back to RGB to match original format and prevent file size inflation
            const rgbaRes = await pngToRgba8(Buffer.from(image));
            const rgb = new Uint8Array((rgbaRes.data.length / 4) * 3);
            for (let i = 0, j = 0; i < rgbaRes.data.length; i += 4, j += 3) {
              rgb[j + 0] = rgbaRes.data[i + 0];
              rgb[j + 1] = rgbaRes.data[i + 1];
              rgb[j + 2] = rgbaRes.data[i + 2];
            }
            const pngRes = {
              data: rgb,
              width: rgbaRes.width,
              height: rgbaRes.height,
            };

            const textureExtra = materialExtras[index]?.textureExtras?.[0];
            textures.push({
              pixels: pngRes.data,
              width: pngRes.width,
              height: pngRes.height,
              srcPixelFormat: PixelFormatSrc.GL_RGB, // BG3D default format
              dstPixelFormat:
                textureExtra?.dstPixelFormat ||
                PixelFormatDst.GL_UNSIGNED_SHORT_5_5_5_1,
              bufferSize: pngRes.data.byteLength, // Use actual converted data size
            });
          } else {
            console.warn(
              "Image data from glTF is not valid PNG, skipping texture for material",
              index,
            );
          }
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

  // Check if original skeleton binary is preserved
  const originalSkeletonBinary = getOriginalSkeletonBinary(doc);
  if (originalSkeletonBinary) {
    console.log("Using original skeleton binary for exact roundtrip");
    // Parse the original skeleton binary to get exact skeleton data
    const originalSkeletonResource = parseSkeletonRsrcTS(
      originalSkeletonBinary,
    );
    // Convert to BG3DSkeleton format (simplified, assuming Otto format)
    const bones: BG3DBone[] = [];
    if (originalSkeletonResource.Bone) {
      Object.values(originalSkeletonResource.Bone).forEach((boneData: any) => {
        if (boneData.obj) {
          bones.push({
            parentBone: boneData.obj.parentBone,
            name: boneData.obj.name || "",
            coordX: boneData.obj.coordX || 0,
            coordY: boneData.obj.coordY || 0,
            coordZ: boneData.obj.coordZ || 0,
            numPointsAttachedToBone: boneData.obj.numPointsAttachedToBone || 0,
            numNormalsAttachedToBone:
              boneData.obj.numNormalsAttachedToBone || 0,
            pointIndices: [], // Initialize as empty array
            normalIndices: [], // Initialize as empty array
          });
        }
      });
    }

    // Populate point and normal indices
    if (originalSkeletonResource.BonP) {
      Object.values(originalSkeletonResource.BonP).forEach(
        (bonPData: any, boneIndex) => {
          if (bonPData.obj && bones[boneIndex] !== undefined) {
            const bone = bones[boneIndex];
            bone.pointIndices = bonPData.obj.map((p: any) => p.pointIndex);
            bone.numPointsAttachedToBone = bone.pointIndices!.length;
          }
        },
      );
    }
    if (originalSkeletonResource.BonN) {
      Object.values(originalSkeletonResource.BonN).forEach(
        (bonNData: any, boneIndex) => {
          if (bonNData.obj && bones[boneIndex] !== undefined) {
            const bone = bones[boneIndex];
            bone.normalIndices = bonNData.obj.map((n: any) => n.normal);
            bone.numNormalsAttachedToBone = bone.normalIndices!.length;
          }
        },
      );
    }

    // Extract animations
    const animations: any[] = [];
    if (originalSkeletonResource.AnHd) {
      Object.values(originalSkeletonResource.AnHd).forEach(
        (anHdData: any, animIndex) => {
          if (anHdData.obj) {
            const keyframes: { [boneIndex: string]: any[] } = {};
            // Populate keyframes from KeyF
            if (originalSkeletonResource.KeyF) {
              Object.values(originalSkeletonResource.KeyF).forEach(
                (keyFData: any) => {
                  if (keyFData.obj && keyFData.name) {
                    // Find bone index by name
                    const boneIndex = bones.findIndex(
                      (b) => b.name === keyFData.name,
                    );
                    if (boneIndex >= 0) {
                      keyframes[boneIndex.toString()] = keyFData.obj;
                    }
                  }
                },
              );
            }
            animations.push({
              name: anHdData.obj.animName || `Animation_${animIndex}`,
              numAnimEvents: anHdData.obj.numAnimEvents || 0,
              events: [], // Simplified
              keyframes,
            });
          }
        },
      );
    }

    skeleton = {
      version: 272,
      numAnims: animations.length,
      numJoints: bones.length,
      num3DMFLimbs: 0,
      bones,
      animations,
    };
  } else {
    console.log(`Found ${skins.length} skins in glTF document`);

    if (skins.length > 0) {
      console.log("Extracting skeleton from glTF Skin and Animations...");
      const skin = skins[0];
      const joints = skin.listJoints();

      console.log(`Skin has ${joints.length} joints`);
      joints.forEach((joint, i) => {
        console.log(`  Joint ${i}: ${joint.getName()}`);
      });

      if (joints.length > 0) {
        // First pass: create bones with basic data
        const bones: BG3DBone[] = joints.map((joint, index) => {
          // Extract translation from joint transform matrix
          const matrix = joint.getMatrix();
          let coordX = 0,
            coordY = 0,
            coordZ = 0;

          if (matrix && matrix.length >= 12) {
            // Matrix is in column-major order, translation is in elements 12, 13, 14
            coordX = matrix[12] || 0;
            coordY = matrix[13] || 0;
            coordZ = matrix[14] || 0;

            // Convert back from left-handed glTF to right-handed Otto (flip Z)
            coordZ = -coordZ;
          } else {
            // Fallback to translation if matrix not available
            const translation = joint.getTranslation() || [0, 0, 0];
            coordX = translation[0];
            coordY = translation[1];
            coordZ = -translation[2]; // Convert back from left-handed
          }

          // Infer parentBone from node hierarchy (glTF 2.0 compliant)
          let parentBone = -1;
          const jointParents = joint
            .listParents()
            .filter((p) => p instanceof Node);
          if (jointParents.length > 0) {
            const jointParent = jointParents[0] as Node;
            // Check if parent is the skeleton root (Armature), if so, parentBone = -1
            const skeletonRoot = skin.getSkeleton();
            if (jointParent !== skeletonRoot) {
              // Find the index of the parent in the joints list
              const parentIndex = joints.indexOf(jointParent);
              if (parentIndex !== -1) {
                parentBone = parentIndex;
              }
            }
          }

          return {
            parentBone,
            name: joint.getName() || `bone_${index}`,
            coordX,
            coordY,
            coordZ,
            numPointsAttachedToBone: 0, // Will be calculated below
            numNormalsAttachedToBone: 0, // Will be calculated below
            pointIndices: [], // Will be populated below
            normalIndices: [], // Will be populated below
          };
        });

        // Calculate absolute world coordinates for Otto (convert from glTF relative transforms)
        // glTF stores relative transforms, but Otto uses absolute world coordinates
        const worldTransforms: Matrix4[] = new Array(bones.length);

        bones.forEach((bone, index) => {
          const joint = joints[index];

          // Get the local transform matrix from the joint
          let localMatrix: Matrix4;
          const jointMatrix = joint.getMatrix();
          if (jointMatrix && jointMatrix.length >= 16) {
            // Convert glTF matrix (column-major) to our Matrix4
            localMatrix = new Matrix4();
            for (let i = 0; i < 16; i++) {
              localMatrix.data[i] = jointMatrix[i];
            }
          } else {
            // Build matrix from TRS components
            const translation = joint.getTranslation() || [0, 0, 0];
            const rotation = joint.getRotation() || [0, 0, 0, 1];
            const scale = joint.getScale() || [1, 1, 1];

            localMatrix = new Matrix4()
              .setTranslation(translation[0], translation[1], translation[2])
              .multiply(
                new Matrix4().makeRotationFromQuaternion(
                  new Quaternion(
                    rotation[0],
                    rotation[1],
                    rotation[2],
                    rotation[3],
                  ),
                ),
              )
              .multiply(new Matrix4().makeScale(scale[0], scale[1], scale[2]));
          }

          // Calculate world transform by composing with parent
          if (bone.parentBone >= 0 && bone.parentBone < bones.length) {
            const parentWorld = worldTransforms[bone.parentBone];
            worldTransforms[index] = parentWorld.multiply(localMatrix);
          } else {
            // Root bone
            worldTransforms[index] = localMatrix;
          }

          // Extract world translation and convert coordinate system
          const worldTranslation = worldTransforms[index].getTranslation();
          bone.coordX = worldTranslation.x;
          bone.coordY = worldTranslation.y;
          bone.coordZ = -worldTranslation.z; // Convert from left-handed glTF to right-handed Otto
        });

        // Second pass: extract pointIndices and normalIndices from mesh skinning data
        // Collect all vertices influenced by each bone from JOINTS_0 and WEIGHTS_0 attributes
        const bonePointSets: Set<number>[] = bones.map(() => new Set<number>());
        const boneNormalSets: Set<number>[] = bones.map(
          () => new Set<number>(),
        );

        let globalVertexOffset = 0;
        doc
          .getRoot()
          .listMeshes()
          .forEach((mesh) => {
            mesh.listPrimitives().forEach((prim) => {
              const jointsAcc = prim.getAttribute("JOINTS_0");
              const weightsAcc = prim.getAttribute("WEIGHTS_0");
              const posAcc = prim.getAttribute("POSITION");

              if (jointsAcc && weightsAcc && posAcc) {
                const jointsArray = jointsAcc.getArray() as Uint16Array;
                const weightsArray = weightsAcc.getArray() as Float32Array;
                const numVertices = posAcc.getCount();

                for (let vi = 0; vi < numVertices; vi++) {
                  const globalVertexIndex = globalVertexOffset + vi;

                  // Each vertex has up to 4 joint influences
                  for (let ji = 0; ji < 4; ji++) {
                    const jointIndex = jointsArray[vi * 4 + ji];
                    const weight = weightsArray[vi * 4 + ji];

                    // Only consider influences with non-zero weight
                    if (weight > 0 && jointIndex < bones.length) {
                      bonePointSets[jointIndex].add(globalVertexIndex);
                      // For normals, use same indices as points
                      boneNormalSets[jointIndex].add(globalVertexIndex);
                    }
                  }
                }

                globalVertexOffset += numVertices;
              }
            });
          });

        // Update bones with calculated data
        bones.forEach((bone, index) => {
          bone.pointIndices = Array.from(bonePointSets[index]).sort(
            (a, b) => a - b,
          );
          bone.normalIndices = Array.from(boneNormalSets[index]).sort(
            (a, b) => a - b,
          );
          bone.numPointsAttachedToBone = bone.pointIndices.length;
          bone.numNormalsAttachedToBone = bone.normalIndices.length;
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

        console.log(
          `Extracted skeleton: ${bones.length} bones, ${animations.length} animations`,
        );
      }
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
      boundingBox: extras.boundingBox as
        | { min: [number, number, number]; max: [number, number, number] }
        | undefined,
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
  const groups: BG3DGroup[] = childNodes.map((node) =>
    processNode(node),
  ) as BG3DGroup[];

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
  const originalBinaries = (rootExtras as any).originalBinaries;

  if (ottoRoundtrip?.bg3dBuffer) {
    console.log(
      "Returning original BG3D binary data for exact roundtrip (ottoRoundtrip)",
    );
    return new Uint8Array(ottoRoundtrip.bg3dBuffer).buffer;
  }

  if (originalBinaries?.bg3d) {
    console.log(
      "Returning original BG3D binary data for exact roundtrip (originalBinaries)",
    );
    return new Uint8Array(originalBinaries.bg3d).buffer;
  }

  console.log(
    "Original binary data not available - using proper glTF conversion",
  );
  return null;
}

/**
 * Get original skeleton binary data if preserved in glTF extras
 */
export function getOriginalSkeletonBinary(doc: Document): ArrayBuffer | null {
  const rootExtras = doc.getRoot().getExtras() || {};
  const ottoRoundtrip = (rootExtras as any).ottoRoundtrip;
  const originalBinaries = (rootExtras as any).originalBinaries;

  if (ottoRoundtrip?.skeletonBuffer) {
    console.log(
      "Returning original skeleton binary data for exact roundtrip (ottoRoundtrip)",
    );
    return new Uint8Array(ottoRoundtrip.skeletonBuffer).buffer;
  }

  if (originalBinaries?.skeleton) {
    console.log(
      "Returning original skeleton binary data for exact roundtrip (originalBinaries)",
    );
    return new Uint8Array(originalBinaries.skeleton).buffer;
  }

  console.log(
    "Original skeleton binary data not available - using proper glTF conversion",
  );
  return null;
}
