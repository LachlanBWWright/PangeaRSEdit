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
  BG3DAnimation,
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

import { decodeJpegNode } from "../utils/jpegDecompress";

import { isErr } from "../types/result";

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
import { parseSkeletonRsrc } from "./skeletonRsrc/parseSkeletonRsrcTS";

/**
 * Type definitions for glTF extras data
 */
interface BG3DKeyframeLike {
  tick: number;
  accelerationMode: number;
  coordX: number;
  coordY: number;
  coordZ: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
}

interface KeyframeData {
  name?: string;
  keyframes?: { [boneIndex: number]: BG3DKeyframeLike[] };
}

interface AnimationEventData {
  name?: string;
  numAnimEvents?: number;
  events?: { time: number; type: number; value: number }[];
}

interface BoneData {
  parentBone?: number;
  name?: string;
  coordX?: number;
  coordY?: number;
  coordZ?: number;
  numPointsAttachedToBone?: number;
  numNormalsAttachedToBone?: number;
  pointIndices?: number[];
  normalIndices?: number[];
  reserved0?: number;
  reserved1?: number;
  reserved2?: number;
  reserved3?: number;
  reserved4?: number;
  reserved5?: number;
  reserved6?: number;
  reserved7?: number;
}

interface HeaderData {
  version?: number;
  numAnims?: number;
  numJoints?: number;
  num3DMFLimbs?: number;
}

interface SkeletonExtras {
  keyframeData?: KeyframeData[];
  animationEvents?: AnimationEventData[];
  boneData?: BoneData[];
  headerData?: HeaderData;
  relPoints?: unknown[];
  alisData?: unknown;
  metadata?: unknown;
}

interface BG3DFields {
  materialExtras?: unknown[];
  skeletonExtras?: SkeletonExtras;
}

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
      x: this.data[12]!,
      y: this.data[13]!,
      z: this.data[14]!,
    };
  }

  invert(): Matrix4 {
    const result = new Matrix4();
    const m = this.data;
    const inv = result.data;

    // Calculate matrix inverse using standard algorithm
    inv[0] =
      m[5]! * m[10]! * m[15]! -
      m[5]! * m[11]! * m[14]! -
      m[9]! * m[6]! * m[15]! +
      m[9]! * m[7]! * m[14]! +
      m[13]! * m[6]! * m[11]! -
      m[13]! * m[7]! * m[10]!;
    inv[4] =
      -m[4]! * m[10]! * m[15]! +
      m[4]! * m[11]! * m[14]! +
      m[8]! * m[6]! * m[15]! -
      m[8]! * m[7]! * m[14]! -
      m[12]! * m[6]! * m[11]! +
      m[12]! * m[7]! * m[10]!;
    inv[8] =
      m[4]! * m[9]! * m[15]! -
      m[4]! * m[11]! * m[13]! -
      m[8]! * m[5]! * m[15]! +
      m[8]! * m[7]! * m[13]! +
      m[12]! * m[5]! * m[11]! -
      m[12]! * m[7]! * m[9]!;
    inv[12] =
      -m[4]! * m[9]! * m[14]! +
      m[4]! * m[10]! * m[13]! +
      m[8]! * m[5]! * m[14]! -
      m[8]! * m[6]! * m[13]! -
      m[12]! * m[5]! * m[10]! +
      m[12]! * m[6]! * m[9]!;
    inv[1] =
      -m[1]! * m[10]! * m[15]! +
      m[1]! * m[11]! * m[14]! +
      m[9]! * m[2]! * m[15]! -
      m[9]! * m[3]! * m[14]! -
      m[13]! * m[2]! * m[11]! +
      m[13]! * m[3]! * m[10]!;
    inv[5] =
      m[0]! * m[10]! * m[15]! -
      m[0]! * m[11]! * m[14]! -
      m[8]! * m[2]! * m[15]! +
      m[8]! * m[3]! * m[14]! +
      m[12]! * m[2]! * m[11]! -
      m[12]! * m[3]! * m[10]!;
    inv[9] =
      -m[0]! * m[9]! * m[15]! +
      m[0]! * m[11]! * m[13]! +
      m[8]! * m[1]! * m[15]! -
      m[8]! * m[3]! * m[13]! -
      m[12]! * m[1]! * m[11]! +
      m[12]! * m[3]! * m[9]!;
    inv[13] =
      m[0]! * m[9]! * m[14]! -
      m[0]! * m[10]! * m[13]! -
      m[8]! * m[1]! * m[14]! +
      m[8]! * m[2]! * m[13]! +
      m[12]! * m[1]! * m[10]! -
      m[12]! * m[2]! * m[9]!;
    inv[2] =
      m[1]! * m[6]! * m[15]! -
      m[1]! * m[7]! * m[14]! -
      m[5]! * m[2]! * m[15]! +
      m[5]! * m[3]! * m[14]! +
      m[13]! * m[2]! * m[7]! -
      m[13]! * m[3]! * m[6]!;
    inv[6] =
      -m[0]! * m[6]! * m[15]! +
      m[0]! * m[7]! * m[14]! +
      m[4]! * m[2]! * m[15]! -
      m[4]! * m[3]! * m[14]! -
      m[12]! * m[2]! * m[7]! +
      m[12]! * m[3]! * m[6]!;
    inv[10] =
      m[0]! * m[5]! * m[15]! -
      m[0]! * m[7]! * m[13]! -
      m[4]! * m[1]! * m[15]! +
      m[4]! * m[3]! * m[13]! +
      m[12]! * m[1]! * m[7]! -
      m[12]! * m[3]! * m[5]!;
    inv[14] =
      -m[0]! * m[5]! * m[14]! +
      m[0]! * m[6]! * m[13]! +
      m[4]! * m[1]! * m[14]! -
      m[4]! * m[2]! * m[13]! -
      m[12]! * m[1]! * m[6]! +
      m[12]! * m[2]! * m[5]!;
    inv[3] =
      -m[1]! * m[6]! * m[11]! +
      m[1]! * m[7]! * m[10]! +
      m[5]! * m[2]! * m[11]! -
      m[5]! * m[3]! * m[10]! -
      m[9]! * m[2]! * m[7]! +
      m[9]! * m[3]! * m[6]!;
    inv[7] =
      m[0]! * m[6]! * m[11]! -
      m[0]! * m[7]! * m[10]! -
      m[4]! * m[2]! * m[11]! +
      m[4]! * m[3]! * m[10]! +
      m[8]! * m[2]! * m[7]! -
      m[8]! * m[3]! * m[6]!;
    inv[11] =
      -m[0]! * m[5]! * m[11]! +
      m[0]! * m[7]! * m[9]! +
      m[4]! * m[1]! * m[11]! -
      m[4]! * m[3]! * m[9]! -
      m[8]! * m[1]! * m[7]! +
      m[8]! * m[3]! * m[5]!;
    inv[15] =
      m[0]! * m[5]! * m[10]! -
      m[0]! * m[6]! * m[9]! -
      m[4]! * m[1]! * m[10]! +
      m[4]! * m[2]! * m[9]! +
      m[8]! * m[1]! * m[6]! -
      m[8]! * m[2]! * m[5]!;

    const det =
      m[0]! * inv[0]! + m[1]! * inv[4]! + m[2]! * inv[8]! + m[3]! * inv[12]!;

    if (det === 0) {
      console.warn("Matrix is not invertible");
      return result.identity();
    }

    const invDet = 1.0 / det;
    for (let i = 0; i < 16; i++) {
      inv[i] = inv[i]! * invDet;
    }

    return result;
  }

  multiply(other: Matrix4): Matrix4 {
    // Column-major matrix multiplication: result = this * other
    // For column-major storage: m[col*4 + row]
    // So a[0], a[1], a[2], a[3] is column 0 (rows 0-3)
    //    a[4], a[5], a[6], a[7] is column 1 (rows 0-3), etc.

    const result = new Matrix4();
    const a = this.data;
    const b = other.data;
    const out = result.data;

    // For each column j of result
    for (let j = 0; j < 4; j++) {
      // For each row i of result
      for (let i = 0; i < 4; i++) {
        // result[j][i] = sum over k of a[k][i] * b[j][k]
        // In column-major: result[j*4+i] = sum(a[k*4+i] * b[j*4+k])
        let sum = 0;
        for (let k = 0; k < 4; k++) {
          sum += a[k * 4 + i]! * b[j * 4 + k]!;
        }
        out[j * 4 + i] = sum;
      }
    }

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
  const gltfMaterials: Material[] = (parsed.materials || []).map((mat, i) => {
    const m = doc.createMaterial("BG3DMaterial");
    m.setName(`Material_${i.toString().padStart(4, "0")}`);
    m.setBaseColorFactor(mat.diffuseColor);
    m.setExtras({
      flags: mat.flags,
    });
    return m;
  });

  // 2. Textures/Images
  (parsed.materials || []).forEach((mat, i) => {
    if (mat.textures && mat.textures.length > 0) {
      mat.textures.forEach((tex, j) => {
        let pngBuffer: Uint8Array<ArrayBufferLike>;
        try {
          if (tex.isJpeg) {
            // JPEG texture (Nanosaur 2) - decompress from QuickTime format and convert to PNG
            console.log(`[Material ${i}] Processing JPEG texture, bufferSize: ${tex.bufferSize}`);

            try {
              // Extract payload from QuickTime ImageDescription format
              const view = new DataView(tex.pixels.buffer, tex.pixels.byteOffset);
              const offset = view.getInt32(0, false); // big-endian
              const payloadSize = tex.bufferSize - offset;
              const payloadView = new Uint8Array(tex.pixels.buffer, tex.pixels.byteOffset + offset, payloadSize);

              console.log(`[Material ${i}] Offset: ${offset}, Payload size: ${payloadSize}`);

              // Copy to new buffer for decodeJpegNode
              const payloadBuffer = new Uint8Array(payloadSize);
              payloadBuffer.set(payloadView);

              // Decompress JPEG
              const imageData = decodeJpegNode(payloadBuffer.buffer);
              console.log(`[Material ${i}] Decompressed JPEG: ${imageData.width}x${imageData.height}`);

              // Convert to PNG
              const pngBuffer = rgba8ToPng(new Uint8Array(imageData.data), imageData.width, imageData.height);

              const texture = doc.createTexture();
              texture.setMimeType("image/png");
              texture.setImage(pngBuffer);
              texture.setExtras({
                width: imageData.width,
                height: imageData.height,
                srcPixelFormat: tex.srcPixelFormat,
                dstPixelFormat: tex.dstPixelFormat,
                bufferSize: tex.bufferSize,
                isJpeg: true,
                hasAlpha: !!tex.jpegAlphaData,
              });
              if (j === 0) {
                const gltfMat = gltfMaterials[i];
                if (gltfMat) {
                  gltfMat.setBaseColorTexture(texture);
                }
              }
              return; // Skip the rest of the texture processing
            } catch (error) {
              console.error(`[Material ${i}] Failed to decompress JPEG texture:`, error);
              // Fall through to create a gray placeholder
              pngBuffer = rgba8ToPng(
                new Uint8Array(tex.width * tex.height * 4).fill(128),
                tex.width,
                tex.height
              );
            }
          } else if (
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
              if (val !== undefined) {
                swapped[k] = ((val & 0xff) << 8) | ((val >> 8) & 0xff);
              }
            }
            pngBuffer = argb16ToPng(swapped, tex.width, tex.height);
          } else if (tex.srcPixelFormat === PixelFormatSrc.GL_RGB) {
            pngBuffer = rgb24ToPng(tex.pixels, tex.width, tex.height);
          } else if (tex.srcPixelFormat === PixelFormatSrc.GL_RGBA) {
            pngBuffer = rgba8ToPng(tex.pixels, tex.width, tex.height);
          } else {
            pngBuffer = tex.pixels;
          }
        } catch {
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
          const gltfMat = gltfMaterials[i];
          if (gltfMat) {
            gltfMat.setBaseColorTexture(texture);
          }
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

    const skeletonSystemResult = createSkeletonSystem(
      doc,
      parsed.skeleton,
      baseBuffer,
    );

    if (isErr(skeletonSystemResult)) {
      console.error(
        "Failed to create skeleton system:",
        skeletonSystemResult.error,
      );
    } else {
      gltfSkin = skeletonSystemResult.value.skin;
      gltfAnimations = skeletonSystemResult.value.animations;

      console.log(
        `Skeleton system created: skin=${!!gltfSkin}, joints=${
          gltfSkin?.listJoints().length
        }, animations=${gltfAnimations.length}`,
      );
    }
  } else {
    console.log("No skeleton data in parsed BG3D");
  }

  // Helper to collect all geometries from group hierarchy
  function collectGeometries(groups: BG3DGroup[]): BG3DGeometry[] {
    const result: BG3DGeometry[] = [];
    function traverse(group: BG3DGroup) {
      if (Array.isArray(group.children)) {
        for (const child of group.children) {
          if ("children" in child && Array.isArray(child.children)) {
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

  const allGeometries = collectGeometries(parsed.groups || []);
  console.log(`Processing ${allGeometries.length} geometries`);

  // Build decomposed point list mapping (like Otto's runtime decomposition)
  // This maps from decomposedPointIndex -> {meshIndex, localVertexIndex}[]
  // Otto matches vertices by position with 0.001 threshold
  interface DecomposedPoint {
    realPoint: [number, number, number]; // World position
    refs: { meshIndex: number; vertexIndex: number }[];
  }
  const decomposedPointList: DecomposedPoint[] = [];
  const MATCH_THRESHOLD = 0.001;

  function pointsAreCloseEnough(
    p1: [number, number, number] | number[],
    p2: [number, number, number] | number[],
  ): boolean {
    return (
      Math.abs(p1[0] - p2[0]) < MATCH_THRESHOLD &&
      Math.abs(p1[1] - p2[1]) < MATCH_THRESHOLD &&
      Math.abs(p1[2] - p2[2]) < MATCH_THRESHOLD
    );
  }

  // Build the decomposed point list by iterating through geometries in order
  allGeometries.forEach((geom, meshIndex) => {
    if (!geom.vertices) return;

    geom.vertices.forEach((vertex, vertexIndex) => {
      // Check if this vertex matches an existing decomposed point
      let foundIndex = -1;
      for (let i = 0; i < decomposedPointList.length; i++) {
        const decomposedPoint = decomposedPointList[i];
        if (
          decomposedPoint &&
          pointsAreCloseEnough(vertex, decomposedPoint.realPoint)
        ) {
          foundIndex = i;
          break;
        }
      }

      if (foundIndex >= 0) {
        // Add another reference to existing decomposed point
        const existingPoint = decomposedPointList[foundIndex];
        if (existingPoint) {
          existingPoint.refs.push({ meshIndex, vertexIndex });
        }
      } else {
        // Create new decomposed point
        decomposedPointList.push({
          realPoint: [vertex[0], vertex[1], vertex[2]],
          refs: [{ meshIndex, vertexIndex }],
        });
      }
    });
  });

  console.log(
    `Built decomposed point list with ${decomposedPointList.length} unique points across ${allGeometries.length} meshes`,
  );

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

      // Apply bone influences based on Otto's decomposed point indices
      // bone.pointIndices contains indices into the decomposed point list,
      // not direct vertex indices. We need to translate through the mapping.
      parsed.skeleton.bones.forEach((bone, boneIndex) => {
        if (bone.pointIndices) {
          bone.pointIndices.forEach((decomposedIndex) => {
            // Look up the decomposed point and find all references to this mesh
            if (decomposedIndex < decomposedPointList.length) {
              const decomposedPoint = decomposedPointList[decomposedIndex];
              if (!decomposedPoint) return;

              // Find all references that point to this mesh (index)
              for (const ref of decomposedPoint.refs) {
                if (ref.meshIndex === index) {
                  // This decomposed point maps to vertex ref.vertexIndex in this mesh
                  const localVertexIndex = ref.vertexIndex;
                  if (localVertexIndex < numVertices) {
                    const offset = localVertexIndex * 4;

                    // Find empty slot for this influence (skip slots already used)
                    for (let slot = 0; slot < 4; slot++) {
                      const weightSlot = weights[offset + slot];
                      if (weightSlot === 0) {
                        joints[offset + slot] = boneIndex;
                        weights[offset + slot] = 1.0;
                        break;
                      }
                    }
                  }
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
          const w = weights[offset + j];
          totalWeight += w ?? 0;
        }

        if (totalWeight > 0) {
          // Normalize existing weights
          for (let j = 0; j < 4; j++) {
            const w = weights[offset + j];
            if (w !== undefined) {
              weights[offset + j] = w / totalWeight;
            }
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
      const material = gltfMaterials[geom.layerMaterialNum];
      if (material) primitive.setMaterial(material);
    } else if (
      Array.isArray(geom.layerMaterialNum) &&
      geom.layerMaterialNum[0] !== undefined &&
      geom.layerMaterialNum[0] < gltfMaterials.length
    ) {
      const material = gltfMaterials[geom.layerMaterialNum[0]];
      if (material) primitive.setMaterial(material);
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
    if (!mesh) return false;
    const prim = mesh.listPrimitives()[0];
    if (!prim) return false;
    return !!prim.getAttribute("JOINTS_0");
  }

  // Helper function to check if child is a group
  function isGroup(child: BG3DGeometry | BG3DGroup): child is BG3DGroup {
    return "children" in child && Array.isArray(child.children);
  }

  // Helper: check whether a group contains any geometry that should be part of the scene hierarchy
  function groupHasNonSkinnedChildren(group: BG3DGroup): boolean {
    if (!Array.isArray(group.children)) return false;
    for (const child of group.children) {
      if (isGroup(child)) {
        if (groupHasNonSkinnedChildren(child)) return true;
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
      if (isGroup(child)) {
        addSkinnedMeshesFromGroup(child);
      } else {
        const childGeom = child as BG3DGeometry;
        const geomIndex = allGeometries.indexOf(childGeom);
        if (geomIndex >= 0 && geomIndex < gltfMeshes.length) {
          const mesh = gltfMeshes[geomIndex];
          if (!mesh) continue;
          const prim = mesh.listPrimitives()[0];
          const primHasJoints = !!(
            prim &&
            prim.getAttribute &&
            prim.getAttribute("JOINTS_0")
          );
          if (gltfSkin && primHasJoints) {
            const meshNode = doc.createNode();
            meshNode.setName(`Mesh_${geomIndex.toString().padStart(4, "0")}`);
            meshNode.setMesh(mesh);
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

  (parsed.groups || []).forEach((group, i) => {
    const hasNonSkinned = groupHasNonSkinnedChildren(group);

    // If group contains non-skinned geometry, create nodes for hierarchy
    if (hasNonSkinned) {
      const groupNode = doc.createNode();
      groupNode.setName(`Group_${i.toString().padStart(4, "0")}`);

      function addGeometriesToNode(node: Node, group: BG3DGroup) {
        if (Array.isArray(group.children)) {
          for (const child of group.children) {
            if (isGroup(child)) {
              const subgroup = child;
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
                const mesh = gltfMeshes[geomIndex];
                if (!mesh) continue;
                const meshNode = doc.createNode();
                meshNode.setName(
                  `Mesh_${geomIndex.toString().padStart(4, "0")}`,
                );
                meshNode.setMesh(mesh);

                const prim = mesh.listPrimitives()[0];
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
  // glTF can represent skeleton bones, animations, and keyframes natively
  // But these BG3D-specific data types need to be preserved in extras:
  // - relPoints (RelP) - bone-relative vertex positions for mesh deformation
  // - alisData - file alias resources
  // - metadata - skeleton resource metadata
  // - animation events - sound/effect triggers at specific frames
  // - keyframe accelerationMode - glTF doesn't have this concept
  const extrasData: Record<string, unknown> = {
    bg3dFields: {
      // Note: Skeleton data (bones, pointIndices, animations) stored in native glTF format
      // Store BG3D-specific material properties
      materialExtras: (parsed.materials || []).map((mat) => ({
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
      geometryExtras: (parsed.groups || []).map(() => ({
        // Store any BG3D-specific group metadata here if needed
        // The actual geometry data should be represented natively in glTF
      })),
      // Store skeleton-specific data that glTF cannot represent natively
      skeletonExtras: parsed.skeleton
        ? {
            // RelP - relative point positions for mesh deformation
            relPoints: parsed.skeleton.relPoints || {},
            // alis - file alias resource
            alisData: parsed.skeleton.alisData || {},
            // metadata - skeleton resource metadata
            metadata: parsed.skeleton.metadata || {},
            // Full bone data - glTF transforms can lose precision/information
            boneData: parsed.skeleton.bones.map((bone) => ({
              parentBone: bone.parentBone,
              name: bone.name,
              coordX: bone.coordX,
              coordY: bone.coordY,
              coordZ: bone.coordZ,
              numPointsAttachedToBone: bone.numPointsAttachedToBone,
              numNormalsAttachedToBone: bone.numNormalsAttachedToBone,
              pointIndices: bone.pointIndices,
              normalIndices: bone.normalIndices,
              reserved0: bone.reserved0,
              reserved1: bone.reserved1,
              reserved2: bone.reserved2,
              reserved3: bone.reserved3,
              reserved4: bone.reserved4,
              reserved5: bone.reserved5,
              reserved6: bone.reserved6,
              reserved7: bone.reserved7,
            })),
            // Animation events - per-animation event data (sound/effect triggers)
            animationEvents:
              parsed.skeleton.animations?.map((anim) => ({
                name: anim.name,
                events: anim.events || [],
                numAnimEvents: anim.numAnimEvents || 0,
              })) || [],
            // Full keyframe data including accelerationMode (not stored in glTF natively)
            keyframeData:
              parsed.skeleton.animations?.map((anim) => ({
                name: anim.name,
                keyframes: anim.keyframes, // Preserve all keyframe data including accelerationMode
              })) || [],
            // Header data for exact reconstruction
            headerData: {
              version: parsed.skeleton.version,
              numAnims: parsed.skeleton.numAnims,
              numJoints: parsed.skeleton.numJoints,
              num3DMFLimbs: parsed.skeleton.num3DMFLimbs,
            },
          }
        : undefined,
    },
  };

  // Preserve original binary data ONLY when explicitly provided; this is required by some tests/tools
  if (originalBinaryData) {
    try {
      const originalBinaries: Record<string, unknown> = {};
      if (originalBinaryData.bg3dBuffer)
        originalBinaries.bg3d = Array.from(
          new Uint8Array(originalBinaryData.bg3dBuffer),
        );
      if (originalBinaryData.skeletonBuffer)
        originalBinaries.skeleton = Array.from(
          new Uint8Array(originalBinaryData.skeletonBuffer),
        );
      (extrasData as Record<string, unknown>).originalBinaries =
        originalBinaries;
    } catch {
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
  const bg3dFields = rootExtras.bg3dFields as BG3DFields | undefined;

  // Extract BG3D-specific metadata from extras (only non-glTF-representable data)
  const materialExtras = (bg3dFields?.materialExtras || []) as Array<{
    flags?: number;
    textureExtras?: Array<{ dstPixelFormat?: number }>;
  }>;

  // Note: Bone data (pointIndices, normalIndices) will be reconstructed from mesh skinning data

  console.log("Reconstructing BG3D data from glTF native format...");

  // 1. Restore materials from glTF materials
  const docMaterials = doc.getRoot().listMaterials();
  const materials: BG3DMaterial[] = await Promise.all(
    docMaterials.map(async (mat, index) => {
      let diffuseColor: [number, number, number, number] = [1, 1, 1, 1];
      const baseColor = mat.getBaseColorFactor();
      if (Array.isArray(baseColor) && baseColor.length === 4) {
        diffuseColor = [
          baseColor[0] ?? 1,
          baseColor[1] ?? 1,
          baseColor[2] ?? 1,
          baseColor[3] ?? 1,
        ];
      }

      // Get BG3D-specific flags from extras
      const flags = materialExtras[index]?.flags || 0;

      // Restore textures from baseColorTexture
      const textures: BG3DTexture[] = [];
      const baseColorTex = mat.getBaseColorTexture();
      if (baseColorTex) {
        const image = baseColorTex.getImage();
        const texExtras = baseColorTex.getExtras() as Record<
          string,
          unknown
        > | null;

        if (image instanceof Uint8Array) {
          // Check for JPEG signature (0xFF 0xD8)
          const isJPEG =
            image.length >= 2 && image[0] === 0xff && image[1] === 0xd8;

          // Check for PNG signature
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

          if (isJPEG || texExtras?.isJpeg) {
            // JPEG texture (Nanosaur 2) - preserve as-is
            console.log(`Preserving JPEG texture for material ${index}`);
            const width = (texExtras?.width as number) || 128;
            const height = (texExtras?.height as number) || 128;
            textures.push({
              pixels: image,
              width,
              height,
              srcPixelFormat: -1, // JPEG marker
              dstPixelFormat: texExtras?.hasAlpha ? -2 : -1,
              bufferSize: image.byteLength,
              isJpeg: true,
              // Note: Alpha channel would need to be stored separately if needed
            });
          } else if (isPNG) {
            // BG3D textures are typically RGB format (no alpha channel)
            // Even if PNG is stored as RGBA in glTF (due to pngjs library limitations),
            // we convert back to RGB to match original format and prevent file size inflation
            const imageBuffer = (() => {
              const buf = image.buffer;
              if (buf instanceof ArrayBuffer) return buf;
              // Convert SharedArrayBuffer to ArrayBuffer
              const u8 = new Uint8Array(buf);
              return u8.buffer as unknown as ArrayBuffer;
            })();
            const rgbaRes = await pngToRgba8(imageBuffer);
            const rgb = new Uint8Array((rgbaRes.data.length / 4) * 3);
            for (let i = 0, j = 0; i < rgbaRes.data.length; i += 4, j += 3) {
              const r = rgbaRes.data[i + 0];
              const g = rgbaRes.data[i + 1];
              const b = rgbaRes.data[i + 2];
              rgb[j + 0] = r ?? 0;
              rgb[j + 1] = g ?? 0;
              rgb[j + 2] = b ?? 0;
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
              "Image data from glTF is not valid PNG or JPEG, skipping texture for material",
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
    const originalSkeletonResource = await parseSkeletonRsrc(
      originalSkeletonBinary,
    );
    // Convert to BG3DSkeleton format (simplified, assuming Otto format)
    const bones: BG3DBone[] = [];
    if (originalSkeletonResource.Bone) {
      Object.values(originalSkeletonResource.Bone).forEach(
        (boneData: unknown) => {
          const boneDataObj = boneData as Record<string, unknown>;
          if (boneDataObj && boneDataObj.obj) {
            const obj = boneDataObj.obj as Record<string, unknown>;
            bones.push({
              parentBone: (obj.parentBone as number) || 0,
              name: (obj.name as string) || "",
              coordX: (obj.coordX as number) || 0,
              coordY: (obj.coordY as number) || 0,
              coordZ: (obj.coordZ as number) || 0,
              numPointsAttachedToBone:
                (obj.numPointsAttachedToBone as number) || 0,
              numNormalsAttachedToBone:
                (obj.numNormalsAttachedToBone as number) || 0,
              pointIndices: [], // Initialize as empty array
              normalIndices: [], // Initialize as empty array
            });
          }
        },
      );
    }

    // Populate point and normal indices
    if (originalSkeletonResource.BonP) {
      Object.values(originalSkeletonResource.BonP).forEach(
        (bonPData: unknown, boneIndex) => {
          const bonPObj = bonPData as Record<string, unknown>;
          if (bonPObj && bonPObj.obj && bones[boneIndex] !== undefined) {
            const bone = bones[boneIndex];
            const arr = bonPObj.obj as unknown[];
            bone.pointIndices = arr.map(
              (p) => (p as Record<string, unknown>).pointIndex as number,
            );
            if (bone.pointIndices) {
              bone.numPointsAttachedToBone = bone.pointIndices.length;
            }
          }
        },
      );
    }
    if (originalSkeletonResource.BonN) {
      Object.values(originalSkeletonResource.BonN).forEach(
        (bonNData: unknown, boneIndex) => {
          const bonNObj = bonNData as Record<string, unknown>;
          if (bonNObj && bonNObj.obj && bones[boneIndex] !== undefined) {
            const bone = bones[boneIndex];
            const arr = bonNObj.obj as unknown[];
            bone.normalIndices = arr.map(
              (n) => (n as Record<string, unknown>).normal as number,
            );
            if (bone.normalIndices) {
              bone.numNormalsAttachedToBone = bone.normalIndices.length;
            }
          }
        },
      );
    }

    // Extract animations
    const animations: unknown[] = [];
    // Get animation IDs to correlate with Evnt resources
    const anHdEntries = Object.entries(originalSkeletonResource.AnHd || {});
    anHdEntries.forEach(([animId, anHdData]: [string, unknown], animIndex) => {
      const anHdObj = anHdData as Record<string, unknown>;
      if (anHdObj && anHdObj.obj) {
        const keyframes: { [boneIndex: string]: unknown[] } = {};
        // Populate keyframes from KeyF
        if (originalSkeletonResource.KeyF) {
          Object.values(originalSkeletonResource.KeyF).forEach(
            (keyFData: unknown) => {
              const keyFObj = keyFData as Record<string, unknown>;
              if (keyFObj && keyFObj.obj && keyFObj.name) {
                // Find bone index by name
                const boneIndex = bones.findIndex(
                  (b) => b.name === (keyFObj.name as string),
                );
                if (boneIndex >= 0) {
                  keyframes[boneIndex.toString()] = keyFObj.obj as unknown[];
                }
              }
            },
          );
        }

        // Extract animation events from Evnt resource using matching animId
        const events: unknown[] = [];
        const evntRoot = (originalSkeletonResource as Record<string, unknown>)
          .Evnt as Record<string, unknown> | undefined;
        const evntEntry = evntRoot
          ? (evntRoot[animId] as Record<string, unknown> | undefined)
          : undefined;
        if (evntEntry && evntEntry.obj && Array.isArray(evntEntry.obj)) {
          (evntEntry.obj as unknown[]).forEach((evt) => {
            const e = evt as Record<string, unknown>;
            events.push({
              time: e.time,
              type: e.type,
              value: e.value,
            });
          });
        }

        animations.push({
          name:
            (anHdObj.obj as Record<string, unknown>).animName ||
            `Animation_${animIndex}`,
          numAnimEvents:
            (anHdObj.obj as Record<string, unknown>).numAnimEvents || 0,
          events, // Now properly populated from Evnt resource
          keyframes,
        });
      }
    });

    // Extract RelP data
    const relPoints: { [resourceId: string]: [number, number, number][] } = {};
    if (originalSkeletonResource.RelP) {
      Object.entries(originalSkeletonResource.RelP).forEach(
        ([rid, rentry]: [string, unknown]) => {
          const rObj = rentry as Record<string, unknown>;
          if (rObj && rObj.obj && Array.isArray(rObj.obj)) {
            relPoints[rid] = (rObj.obj as unknown[]).map((p) => {
              const pp = p as Record<string, unknown>;
              return [
                (pp.relOffsetX as number) ?? (pp.x as number) ?? 0,
                (pp.relOffsetY as number) ?? (pp.y as number) ?? 0,
                (pp.relOffsetZ as number) ?? (pp.z as number) ?? 0,
              ];
            });
          }
        },
      );
    }

    // Extract alis data
    const alisData: { [key: string]: unknown } = {};
    Object.keys(originalSkeletonResource).forEach((key) => {
      if (key.toLowerCase() === "alis") {
        alisData[key] = (originalSkeletonResource as Record<string, unknown>)[
          key
        ];
      }
    });

    skeleton = {
      version: 272,
      numAnims: animations.length,
      numJoints: bones.length,
      num3DMFLimbs: 0,
      bones,
      animations: animations as BG3DAnimation[],
      relPoints: Object.keys(relPoints).length > 0 ? relPoints : undefined,
      alisData: Object.keys(alisData).length > 0 ? alisData : undefined,
      metadata: originalSkeletonResource._metadata,
    };
  } else {
    console.log(`Found ${skins.length} skins in glTF document`);

    if (skins.length > 0) {
      console.log("Extracting skeleton from glTF Skin and Animations...");
      const skin = skins[0];
      if (!skin) {
        console.warn("No skin found in glTF document");
        return {
          groups: [],
          materials: [],
        };
      }
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
            coordX = matrix[12] ?? 0;
            coordY = matrix[13] ?? 0;
            coordZ = matrix[14] ?? 0;
            // No coordinate flip needed - both Otto and glTF use compatible right-handed systems
          } else {
            // Fallback to translation if matrix not available
            const translation = joint.getTranslation() || [0, 0, 0];
            coordX = translation[0] ?? 0;
            coordY = translation[1] ?? 0;
            coordZ = translation[2] ?? 0;
          }

          // Infer parentBone from node hierarchy (glTF 2.0 compliant)
          let parentBone = -1;
          const jointParents = joint
            .listParents()
            .filter((p) => p instanceof Node);
          if (jointParents.length > 0) {
            const jointParent = jointParents[0];
            // Check if parent is the skeleton root (Armature), if so, parentBone = -1
            const skeletonRoot = skin.getSkeleton();
            if (jointParent !== skeletonRoot) {
              // Find the index of the parent in the joints list
              const parentIndex = joints.indexOf(jointParent as Node);
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
          if (!joint) return;

          // Get the local transform matrix from the joint
          let localMatrix: Matrix4;
          const jointMatrix = joint.getMatrix();
          if (jointMatrix && jointMatrix.length >= 16) {
            // Convert glTF matrix (column-major) to our Matrix4
            localMatrix = new Matrix4();
            for (let i = 0; i < 16; i++) {
              localMatrix.data[i] = jointMatrix[i] ?? 0;
            }
          } else {
            // Build matrix from TRS components
            const translation = joint.getTranslation() || [0, 0, 0];
            const rotation = joint.getRotation() || [0, 0, 0, 1];
            const scale = joint.getScale() || [1, 1, 1];

            localMatrix = new Matrix4()
              .setTranslation(
                translation[0] ?? 0,
                translation[1] ?? 0,
                translation[2] ?? 0,
              )
              .multiply(
                new Matrix4().makeRotationFromQuaternion(
                  new Quaternion(
                    rotation[0] ?? 0,
                    rotation[1] ?? 0,
                    rotation[2] ?? 0,
                    rotation[3] ?? 1,
                  ),
                ),
              )
              .multiply(
                new Matrix4().makeScale(
                  scale[0] ?? 1,
                  scale[1] ?? 1,
                  scale[2] ?? 1,
                ),
              );
          }

          // Calculate world transform by composing with parent
          if (bone.parentBone >= 0 && bone.parentBone < bones.length) {
            const parentWorld = worldTransforms[bone.parentBone];
            if (parentWorld) {
              worldTransforms[index] = parentWorld.multiply(localMatrix);
            } else {
              worldTransforms[index] = localMatrix;
            }
          } else {
            // Root bone
            worldTransforms[index] = localMatrix;
          }

          // Extract world translation - no coordinate flip needed
          const currentWorld = worldTransforms[index];
          if (currentWorld) {
            const worldTranslation = currentWorld.getTranslation();
            bone.coordX = worldTranslation.x;
            bone.coordY = worldTranslation.y;
            bone.coordZ = worldTranslation.z;
          }
        });

        // Second pass: extract pointIndices and normalIndices from mesh skinning data
        // First, build the decomposed point list by iterating through meshes in order
        // (matching Otto's runtime decomposition algorithm)
        interface ReverseDecomposedPoint {
          realPoint: [number, number, number];
          refs: { meshIndex: number; vertexIndex: number }[];
        }
        const reverseDecomposedPointList: ReverseDecomposedPoint[] = [];
        const REVERSE_MATCH_THRESHOLD = 0.001;

        function reversePointsAreCloseEnough(
          p1: [number, number, number] | number[],
          p2: [number, number, number] | number[],
        ): boolean {
          return (
            Math.abs(p1[0] - p2[0]) < REVERSE_MATCH_THRESHOLD &&
            Math.abs(p1[1] - p2[1]) < REVERSE_MATCH_THRESHOLD &&
            Math.abs(p1[2] - p2[2]) < REVERSE_MATCH_THRESHOLD
          );
        }

        // Build mapping from (meshIndex, vertexIndex) → decomposedPointIndex
        const vertexToDecomposedIndex = new Map<string, number>();

        let currentMeshIndex = 0;
        doc
          .getRoot()
          .listMeshes()
          .forEach((mesh) => {
            mesh.listPrimitives().forEach((prim) => {
              const posAcc = prim.getAttribute("POSITION");
              if (posAcc) {
                const posArray = posAcc.getArray() as Float32Array;
                const numVertices = posAcc.getCount();

                for (let vi = 0; vi < numVertices; vi++) {
                  const x = posArray[vi * 3];
                  const y = posArray[vi * 3 + 1];
                  const z = posArray[vi * 3 + 2];
                  const vertex: [number, number, number] = [
                    x ?? 0,
                    y ?? 0,
                    z ?? 0,
                  ];

                  // Check if this vertex matches an existing decomposed point
                  let foundIndex = -1;
                  for (let i = 0; i < reverseDecomposedPointList.length; i++) {
                    const point = reverseDecomposedPointList[i];
                    if (
                      point &&
                      reversePointsAreCloseEnough(vertex, point.realPoint)
                    ) {
                      foundIndex = i;
                      break;
                    }
                  }

                  const key = `${currentMeshIndex}:${vi}`;
                  if (foundIndex >= 0) {
                    // Add reference to existing decomposed point
                    const existingPoint =
                      reverseDecomposedPointList[foundIndex];
                    if (existingPoint) {
                      existingPoint.refs.push({
                        meshIndex: currentMeshIndex,
                        vertexIndex: vi,
                      });
                    }
                    vertexToDecomposedIndex.set(key, foundIndex);
                  } else {
                    // Create new decomposed point
                    const newIndex = reverseDecomposedPointList.length;
                    reverseDecomposedPointList.push({
                      realPoint: vertex,
                      refs: [{ meshIndex: currentMeshIndex, vertexIndex: vi }],
                    });
                    vertexToDecomposedIndex.set(key, newIndex);
                  }
                }
              }
            });
            currentMeshIndex++;
          });

        console.log(
          `[Reverse] Built decomposed point list with ${reverseDecomposedPointList.length} unique points`,
        );

        // Now collect bone influences using decomposed point indices
        const bonePointSets: Set<number>[] = bones.map(() => new Set<number>());
        const boneNormalSets: Set<number>[] = bones.map(
          () => new Set<number>(),
        );

        let meshIndexForSkinning = 0;
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
                  // Get decomposed point index for this vertex
                  const key = `${meshIndexForSkinning}:${vi}`;
                  const decomposedIndex = vertexToDecomposedIndex.get(key);
                  if (decomposedIndex === undefined) continue;

                  // Each vertex has up to 4 joint influences
                  for (let ji = 0; ji < 4; ji++) {
                    const jointIndex = jointsArray[vi * 4 + ji];
                    const weight = weightsArray[vi * 4 + ji];

                    // Only consider influences with non-zero weight
                    if (
                      weight !== undefined &&
                      jointIndex !== undefined &&
                      weight > 0 &&
                      jointIndex < bones.length
                    ) {
                      const pointSet = bonePointSets[jointIndex];
                      const normalSet = boneNormalSets[jointIndex];
                      if (pointSet) pointSet.add(decomposedIndex);
                      // For normals, use same indices as points
                      if (normalSet) normalSet.add(decomposedIndex);
                    }
                  }
                }
              }
            });
            meshIndexForSkinning++;
          });

        // Update bones with calculated data
        bones.forEach((bone, index) => {
          const pointSet = bonePointSets[index];
          const normalSet = boneNormalSets[index];
          bone.pointIndices = pointSet
            ? Array.from(pointSet).sort((a, b) => a - b)
            : [];
          bone.normalIndices = normalSet
            ? Array.from(normalSet).sort((a, b) => a - b)
            : [];
          bone.numPointsAttachedToBone = bone.pointIndices.length;
          bone.numNormalsAttachedToBone = bone.normalIndices.length;
        });

        // Extract animations from glTF Animation objects, passing bones for coordinate conversion
        const animations = extractAnimationsFromGLTF(doc, bones);

        // Restore animation data from extras if available (more accurate than glTF conversion)
        const skeletonExtras = bg3dFields?.skeletonExtras;
        console.log("[DEBUG] skeletonExtras available:", !!skeletonExtras);
        console.log(
          "[DEBUG] skeletonExtras.keyframeData available:",
          !!skeletonExtras?.keyframeData,
        );
        console.log(
          "[DEBUG] skeletonExtras.keyframeData length:",
          skeletonExtras?.keyframeData?.length || 0,
        );

        if (skeletonExtras?.keyframeData) {
          // Use keyframe data from extras if available (preserves accelerationMode, exact values)
          console.log(
            "[DEBUG] Restoring keyframe data from extras for",
            animations.length,
            "animations",
          );
          animations.forEach((anim, index) => {
            const keyframeData = skeletonExtras.keyframeData;
            if (!keyframeData) return;
            const kfData =
              keyframeData.find((e: KeyframeData) => e.name === anim.name) ??
              keyframeData[index];
            if (kfData?.keyframes) {
              console.log(
                "[DEBUG] Restored keyframes for animation",
                anim.name,
              );
              // Cast to the proper type since BG3DKeyframeLike matches BG3DKeyframe
              anim.keyframes = kfData.keyframes as {
                [boneIndex: number]: BG3DKeyframeLike[];
              };
            } else {
              console.log(
                "[DEBUG] No keyframe data found for animation",
                anim.name,
              );
            }
          });
        } else {
          console.log(
            "[DEBUG] No keyframeData in skeletonExtras - using glTF-extracted animations",
          );
        }

        if (skeletonExtras?.animationEvents) {
          const animEvents = skeletonExtras.animationEvents;
          animations.forEach((anim, index) => {
            const eventData =
              animEvents.find(
                (e: AnimationEventData) => e.name === anim.name,
              ) ?? animEvents[index];
            if (eventData) {
              anim.numAnimEvents = eventData.numAnimEvents || 0;
              anim.events = eventData.events || [];
            }
          });
        }

        // Restore bone data from extras if available (more accurate than glTF transform calculations)
        if (
          skeletonExtras?.boneData &&
          Array.isArray(skeletonExtras.boneData)
        ) {
          const boneDataArray = skeletonExtras.boneData;
          console.log(
            "[DEBUG] Restoring bone data from extras for",
            boneDataArray.length,
            "bones",
          );
          console.log("[DEBUG] Current bones array length:", bones.length);

          // If extras has more bones, expand the array
          while (bones.length < boneDataArray.length) {
            bones.push({
              parentBone: -1,
              name: "",
              coordX: 0,
              coordY: 0,
              coordZ: 0,
              numPointsAttachedToBone: 0,
              numNormalsAttachedToBone: 0,
              pointIndices: [],
              normalIndices: [],
            });
          }

          boneDataArray.forEach((boneData: BoneData, index: number) => {
            if (index < bones.length) {
              const bone = bones[index];
              if (!bone) return;
              // Restore exact bone coordinates and all other fields
              bone.parentBone = boneData.parentBone ?? bone.parentBone;
              bone.name = boneData.name ?? bone.name;
              bone.coordX = boneData.coordX ?? bone.coordX;
              bone.coordY = boneData.coordY ?? bone.coordY;
              bone.coordZ = boneData.coordZ ?? bone.coordZ;
              bone.numPointsAttachedToBone =
                boneData.numPointsAttachedToBone ??
                bone.numPointsAttachedToBone;
              bone.numNormalsAttachedToBone =
                boneData.numNormalsAttachedToBone ??
                bone.numNormalsAttachedToBone;
              bone.pointIndices = boneData.pointIndices || [];
              bone.normalIndices = boneData.normalIndices || [];
              bone.reserved0 = boneData.reserved0;
              bone.reserved1 = boneData.reserved1;
              bone.reserved2 = boneData.reserved2;
              bone.reserved3 = boneData.reserved3;
              bone.reserved4 = boneData.reserved4;
              bone.reserved5 = boneData.reserved5;
              bone.reserved6 = boneData.reserved6;
              bone.reserved7 = boneData.reserved7;
            }
          });
        }

        // Restore header data from extras if available
        const headerData = skeletonExtras?.headerData;

        skeleton = {
          version: headerData?.version ?? 272,
          numAnims: headerData?.numAnims ?? animations.length,
          numJoints: headerData?.numJoints ?? bones.length,
          num3DMFLimbs: headerData?.num3DMFLimbs ?? 0,
          bones,
          animations,
          // Restore non-glTF data from extras
          relPoints: (skeletonExtras?.relPoints || undefined) as
            | { [resourceId: string]: [number, number, number][] }
            | undefined,
          alisData: (skeletonExtras?.alisData || undefined) as
            | { [key: string]: unknown }
            | undefined,
          metadata: (skeletonExtras?.metadata || undefined) as
            | Record<string, unknown>
            | undefined,
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
    if (!prim) {
      return {
        vertices: [],
        normals: [],
        uvs: [],
        colors: [],
        triangles: [],
        layerMaterialNum: [0, 0, 0, 0],
        flags: 0,
        boundingBox: undefined,
        numMaterials: 0,
        type: 0,
        numPoints: 0,
        numTriangles: 0,
      };
    }
    const extras = prim.getExtras() || {};

    // Extract geometry data
    const posAcc = prim.getAttribute("POSITION");
    let vertices: [number, number, number][] | undefined = undefined;
    if (posAcc) {
      const arr = Array.from(posAcc.getArray() ?? []);
      vertices = [];
      for (let i = 0; i < arr.length; i += 3) {
        vertices.push([
          (arr[i] ?? 0) as number,
          (arr[i + 1] ?? 0) as number,
          (arr[i + 2] ?? 0) as number,
        ]);
      }
    }

    const normAcc = prim.getAttribute("NORMAL");
    let normals: [number, number, number][] | undefined = undefined;
    if (normAcc) {
      const arr = Array.from(normAcc.getArray() ?? []);
      normals = [];
      for (let i = 0; i < arr.length; i += 3) {
        normals.push([
          (arr[i] ?? 0) as number,
          (arr[i + 1] ?? 0) as number,
          (arr[i + 2] ?? 0) as number,
        ]);
      }
    }

    const uvAcc = prim.getAttribute("TEXCOORD_0");
    let uvs: [number, number][] | undefined = undefined;
    if (uvAcc) {
      const arr = Array.from(uvAcc.getArray() ?? []);
      uvs = [];
      for (let i = 0; i < arr.length; i += 2) {
        uvs.push([(arr[i] ?? 0) as number, (arr[i + 1] ?? 0) as number]);
      }
    }

    const colorAcc = prim.getAttribute("COLOR_0");
    let colors: [number, number, number, number][] | undefined = undefined;
    if (colorAcc) {
      const arr = Array.from(colorAcc.getArray() ?? []);
      colors = [];
      for (let i = 0; i < arr.length; i += 4) {
        colors.push([
          (arr[i] ?? 0) as number,
          (arr[i + 1] ?? 0) as number,
          (arr[i + 2] ?? 0) as number,
          (arr[i + 3] ?? 0) as number,
        ]);
      }
    }

    const idxAcc = prim.getIndices();
    let triangles: [number, number, number][] | undefined = undefined;
    if (idxAcc) {
      const arr = Array.from(idxAcc.getArray() ?? []);
      triangles = [];
      for (let i = 0; i < arr.length; i += 3) {
        triangles.push([
          (arr[i] ?? 0) as number,
          (arr[i + 1] ?? 0) as number,
          (arr[i + 2] ?? 0) as number,
        ]);
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
  if (!scene) {
    return {
      materials,
      groups: [],
      skeleton,
    };
  }
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

interface OttoRoundtrip {
  bg3dBuffer?: number[];
  skeletonBuffer?: number[];
}

interface OriginalBinaries {
  bg3d?: number[];
  skeleton?: number[];
}

/**
 * Get original BG3D binary data if preserved in glTF extras
 */
export function getOriginalBG3DBinary(doc: Document): ArrayBuffer | null {
  const rootExtras = doc.getRoot().getExtras() || {};
  const ottoRoundtrip = rootExtras.ottoRoundtrip as OttoRoundtrip | undefined;
  const originalBinaries = rootExtras.originalBinaries as
    | OriginalBinaries
    | undefined;

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
  const ottoRoundtrip = rootExtras.ottoRoundtrip as OttoRoundtrip | undefined;
  const originalBinaries = rootExtras.originalBinaries as
    | OriginalBinaries
    | undefined;

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
