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
  BG3DMaterialFlags,
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

import {
  Document,
  Mesh,
  Material,
  Node,
  Skin,
  Accessor,
} from "@gltf-transform/core";
import { PixelFormatSrc, PixelFormatDst } from "./parseBG3D";
import { Quaternion } from "three";

/**
 * Type guard helper functions for safe extraction from unknown values
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

interface ParentLinkedNode<T> {
  getParentNode(): T | null;
}

export function getJointParentBoneIndex<T extends ParentLinkedNode<T>>(
  joint: T,
  joints: T[],
): number {
  const jointParent = joint.getParentNode();
  if (!jointParent) {
    return -1;
  }

  const parentIndex = joints.indexOf(jointParent);
  return parentIndex >= 0 ? parentIndex : -1;
}

function toExactArrayBuffer(data: Uint8Array | ArrayBuffer): ArrayBuffer {
  if (data instanceof ArrayBuffer) {
    return data.slice(0);
  }
  const copy = new ArrayBuffer(data.byteLength);
  new Uint8Array(copy).set(
    new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
  );
  return copy;
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

  /**
   * Safe accessor for this matrix's data.
   */
  private at(index: number): number {
    return this.data[index] ?? 0;
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
      x: this.at(12),
      y: this.at(13),
      z: this.at(14),
    };
  }

  invert(): Matrix4 {
    const result = new Matrix4();
    const inv = result.data;

    // Calculate matrix inverse using standard algorithm
    inv[0] =
      this.at(5) * this.at(10) * this.at(15) -
      this.at(5) * this.at(11) * this.at(14) -
      this.at(9) * this.at(6) * this.at(15) +
      this.at(9) * this.at(7) * this.at(14) +
      this.at(13) * this.at(6) * this.at(11) -
      this.at(13) * this.at(7) * this.at(10);
    inv[4] =
      -this.at(4) * this.at(10) * this.at(15) +
      this.at(4) * this.at(11) * this.at(14) +
      this.at(8) * this.at(6) * this.at(15) -
      this.at(8) * this.at(7) * this.at(14) -
      this.at(12) * this.at(6) * this.at(11) +
      this.at(12) * this.at(7) * this.at(10);
    inv[8] =
      this.at(4) * this.at(9) * this.at(15) -
      this.at(4) * this.at(11) * this.at(13) -
      this.at(8) * this.at(5) * this.at(15) +
      this.at(8) * this.at(7) * this.at(13) +
      this.at(12) * this.at(5) * this.at(11) -
      this.at(12) * this.at(7) * this.at(9);
    inv[12] =
      -this.at(4) * this.at(9) * this.at(14) +
      this.at(4) * this.at(10) * this.at(13) +
      this.at(8) * this.at(5) * this.at(14) -
      this.at(8) * this.at(6) * this.at(13) -
      this.at(12) * this.at(5) * this.at(10) +
      this.at(12) * this.at(6) * this.at(9);
    inv[1] =
      -this.at(1) * this.at(10) * this.at(15) +
      this.at(1) * this.at(11) * this.at(14) +
      this.at(9) * this.at(2) * this.at(15) -
      this.at(9) * this.at(3) * this.at(14) -
      this.at(13) * this.at(2) * this.at(11) +
      this.at(13) * this.at(3) * this.at(10);
    inv[5] =
      this.at(0) * this.at(10) * this.at(15) -
      this.at(0) * this.at(11) * this.at(14) -
      this.at(8) * this.at(2) * this.at(15) +
      this.at(8) * this.at(3) * this.at(14) +
      this.at(12) * this.at(2) * this.at(11) -
      this.at(12) * this.at(3) * this.at(10);
    inv[9] =
      -this.at(0) * this.at(9) * this.at(15) +
      this.at(0) * this.at(11) * this.at(13) +
      this.at(8) * this.at(1) * this.at(15) -
      this.at(8) * this.at(3) * this.at(13) -
      this.at(12) * this.at(1) * this.at(11) +
      this.at(12) * this.at(3) * this.at(9);
    inv[13] =
      this.at(0) * this.at(9) * this.at(14) -
      this.at(0) * this.at(10) * this.at(13) -
      this.at(8) * this.at(1) * this.at(14) +
      this.at(8) * this.at(2) * this.at(13) +
      this.at(12) * this.at(1) * this.at(10) -
      this.at(12) * this.at(2) * this.at(9);
    inv[2] =
      this.at(1) * this.at(6) * this.at(15) -
      this.at(1) * this.at(7) * this.at(14) -
      this.at(5) * this.at(2) * this.at(15) +
      this.at(5) * this.at(3) * this.at(14) +
      this.at(13) * this.at(2) * this.at(7) -
      this.at(13) * this.at(3) * this.at(6);
    inv[6] =
      -this.at(0) * this.at(6) * this.at(15) +
      this.at(0) * this.at(7) * this.at(14) +
      this.at(4) * this.at(2) * this.at(15) -
      this.at(4) * this.at(3) * this.at(14) -
      this.at(12) * this.at(2) * this.at(7) +
      this.at(12) * this.at(3) * this.at(6);
    inv[10] =
      this.at(0) * this.at(5) * this.at(15) -
      this.at(0) * this.at(7) * this.at(13) -
      this.at(4) * this.at(1) * this.at(15) +
      this.at(4) * this.at(3) * this.at(13) +
      this.at(12) * this.at(1) * this.at(7) -
      this.at(12) * this.at(3) * this.at(5);
    inv[14] =
      -this.at(0) * this.at(5) * this.at(14) +
      this.at(0) * this.at(6) * this.at(13) +
      this.at(4) * this.at(1) * this.at(14) -
      this.at(4) * this.at(2) * this.at(13) -
      this.at(12) * this.at(1) * this.at(6) +
      this.at(12) * this.at(2) * this.at(5);
    inv[3] =
      -this.at(1) * this.at(6) * this.at(11) +
      this.at(1) * this.at(7) * this.at(10) +
      this.at(5) * this.at(2) * this.at(11) -
      this.at(5) * this.at(3) * this.at(10) -
      this.at(9) * this.at(2) * this.at(7) +
      this.at(9) * this.at(3) * this.at(6);
    inv[7] =
      this.at(0) * this.at(6) * this.at(11) -
      this.at(0) * this.at(7) * this.at(10) -
      this.at(4) * this.at(2) * this.at(11) +
      this.at(4) * this.at(3) * this.at(10) +
      this.at(8) * this.at(2) * this.at(7) -
      this.at(8) * this.at(3) * this.at(6);
    inv[11] =
      -this.at(0) * this.at(5) * this.at(11) +
      this.at(0) * this.at(7) * this.at(9) +
      this.at(4) * this.at(1) * this.at(11) -
      this.at(4) * this.at(3) * this.at(9) -
      this.at(8) * this.at(1) * this.at(7) +
      this.at(8) * this.at(3) * this.at(5);
    inv[15] =
      this.at(0) * this.at(5) * this.at(10) -
      this.at(0) * this.at(6) * this.at(9) -
      this.at(4) * this.at(1) * this.at(10) +
      this.at(4) * this.at(2) * this.at(9) +
      this.at(8) * this.at(1) * this.at(6) -
      this.at(8) * this.at(2) * this.at(5);

    const det =
      this.at(0) * (inv[0] ?? 0) +
      this.at(1) * (inv[4] ?? 0) +
      this.at(2) * (inv[8] ?? 0) +
      this.at(3) * (inv[12] ?? 0);

    if (det === 0) {
      console.warn("Matrix is not invertible");
      return result.identity();
    }

    const invDet = 1.0 / det;
    for (let i = 0; i < 16; i++) {
      const val = inv[i];
      if (val !== undefined) {
        inv[i] = val * invDet;
      }
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
          sum += (a[k * 4 + i] ?? 0) * (b[j * 4 + k] ?? 0);
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
 * Convert a BG3DParseResult to a glTF Document, transferring all possible data.
 * Any data that cannot be mapped is stored in extras.
 * Data that cannot be transferred:
 *   - BG3DMaterial.flags (stored in extras)
 *   - BG3DTexture pixel format fields (stored in extras, pixel data may need conversion)
 *   - Geometry.layerMaterialNum (stored in extras)
 *   - Geometry.boundingBox (stored in extras)
 */
export function bg3dParsedToGLTF(
  parsed: BG3DParseResult,
): Document {
  const doc = new Document();
  const baseBuffer = doc.createBuffer("Basebuffer");

  // 1. Materials
  const gltfMaterials: Material[] = (parsed.materials || []).map((mat, i) => {
    const m = doc.createMaterial("BG3DMaterial");
    m.setName(`Material_${i.toString().padStart(4, "0")}`);
    m.setBaseColorFactor(mat.diffuseColor);

    // Set alpha mode based on BG3D material flags.
    // JPEG textures (Nanosaur 2) are opaque unless they carry a separate alpha channel
    // (jpegAlphaData). Using BLEND on a fully-opaque texture forces Three.js into the
    // transparent render pass and causes depth-sorting artefacts.
    // JPEG alpha data represents hard cutout transparency (like window/glass outlines),
    // so MASK (alphaTest=0.5) is preferable over BLEND — it avoids the depth-sort pass
    // entirely while still punching out the transparent pixels correctly.
    const hasJpegTexture = mat.textures.some((t) => t.isJpeg);
    const hasJpegAlpha = mat.textures.some((t) => t.isJpeg && t.jpegAlphaData);
    if (hasJpegTexture) {
      if (hasJpegAlpha) {
        // Hard-cutout alpha (binary mask) — MASK avoids depth-sort issues.
        m.setAlphaMode("MASK");
        m.setAlphaCutoff(0.5);
      } else {
        // No separate alpha channel: texture is fully opaque.
        m.setAlphaMode("OPAQUE");
      }
    } else if (mat.flags & BG3DMaterialFlags.BG3D_MATERIALFLAG_ALWAYSBLEND) {
      // For ARGB16 (1-bit alpha) textures with ALWAYSBLEND, use MASK rather than BLEND.
      // ARGB16 stores binary alpha (1=opaque, 0=transparent), so MASK is more correct
      // and avoids the transparent render pass (which causes depth-sorting artefacts).
      m.setAlphaMode("MASK");
      m.setAlphaCutoff(0.5);
    } else if (mat.flags & BG3DMaterialFlags.BG3D_MATERIALFLAG_TEXTURED) {
      // RGB-only textures are fully opaque
      const hasAlphaTexture = mat.textures.some(
        (t) =>
          t.srcPixelFormat === PixelFormatSrc.GL_UNSIGNED_SHORT_1_5_5_5_REV ||
          t.srcPixelFormat === PixelFormatSrc.GL_RGBA,
      );
      if (hasAlphaTexture) {
        m.setAlphaMode("MASK");
        m.setAlphaCutoff(0.5);
      } else {
        m.setAlphaMode("OPAQUE");
      }
    }

    return m;
  });

  // 2. Textures/Images
  (parsed.materials || []).forEach((mat, i) => {
    if (mat.textures && mat.textures.length > 0) {
      mat.textures.forEach((tex, j) => {
        let pngBuffer: Uint8Array<ArrayBufferLike>;
        if (tex.isJpeg) {
          // JPEG texture (Nanosaur 2) - decompress from QuickTime format and convert to PNG

          // Extract payload from QuickTime ImageDescription format
          const view = new DataView(
            tex.pixels.buffer,
            tex.pixels.byteOffset,
          );
          const offset = view.getInt32(0, false); // big-endian
          const payloadSize = tex.bufferSize - offset;
          const payloadView = new Uint8Array(
            tex.pixels.buffer,
            tex.pixels.byteOffset + offset,
            payloadSize,
          );


          // Copy to new buffer for decodeJpegNode
          const payloadBuffer = new Uint8Array(payloadSize);
          payloadBuffer.set(payloadView);

          // Decompress JPEG
          const imageData = decodeJpegNode(payloadBuffer.buffer);

          // Apply separate per-pixel alpha channel when present (Nanosaur 2 JPEG format).
          // Without this the alpha remains 255 (fully opaque) and transparent cutouts appear opaque.
          if (tex.jpegAlphaData && tex.jpegAlphaData.length === imageData.width * imageData.height) {
            for (let k = 0; k < tex.jpegAlphaData.length; k++) {
              imageData.data[k * 4 + 3] = tex.jpegAlphaData[k] ?? 255;
            }
          }

          // Convert to PNG
          const jpegPngBuffer = rgba8ToPng(
            new Uint8Array(imageData.data),
            imageData.width,
            imageData.height,
          );

          const texture = doc.createTexture();
          texture.setMimeType("image/png");
          texture.setImage(jpegPngBuffer);
          if (j === 0) {
            const gltfMat = gltfMaterials[i];
            if (gltfMat) {
              gltfMat.setBaseColorTexture(texture);
            }
          }
          return; // Skip the rest of the texture processing
        } else if (
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
            if (val !== undefined) {
              swapped[k] = ((val & 0xff) << 8) | ((val >> 8) & 0xff);
            }
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

        const texture = doc.createTexture();
        texture.setMimeType("image/png");
        texture.setImage(pngBuffer);

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

  if (parsed.skeleton) {
    const skeletonSystemResult = createSkeletonSystem(
      doc,
      parsed.skeleton,
      baseBuffer,
    );

    if (skeletonSystemResult.isErr()) {
      console.error("Failed to create skeleton system:", skeletonSystemResult.error);
    } else {
      gltfSkin = skeletonSystemResult.value.skin;
    }
  }

  // Type guard to check if a child is a BG3DGroup (has children array)
  function isBG3DGroup(child: BG3DGeometry | BG3DGroup): child is BG3DGroup {
    return "children" in child && Array.isArray(child.children);
  }

  // Helper to collect all geometries from group hierarchy
  function collectGeometries(groups: BG3DGroup[]): BG3DGeometry[] {
    const result: BG3DGeometry[] = [];
    function traverse(group: BG3DGroup) {
      if (Array.isArray(group.children)) {
        for (const child of group.children) {
          if (isBG3DGroup(child)) {
            traverse(child);
          } else {
            result.push(child);
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

  // 4. Meshes and Primitives
  const gltfMeshes: Mesh[] = [];
  allGeometries.forEach((geom, meshIndex) => {
    const mesh = doc.createMesh();

    mesh.setName(`Item_${gltfMeshes.length.toString().padStart(4, "0")}`);

    // Create accessors as consts using ternary expressions, then use if checks for prim.setAttribute/setIndices
    const positionAccessor = geom.vertices
      ? doc
          .createAccessor()
          .setType("VEC3")
          .setArray(new Float32Array(geom.vertices.flat()))
      : null;

    const normalAccessor = geom.normals
      ? doc
          .createAccessor()
          .setType("VEC3")
          .setArray(new Float32Array(geom.normals.flat()))
      : null;

    const texcoordAccessor = geom.uvs
      ? doc
          .createAccessor()
          .setType("VEC2")
          .setArray(new Float32Array(geom.uvs.flat()))
      : null;

    const colorAccessor = geom.colors
      ? doc
          .createAccessor()
          .setType("VEC4")
          .setArray(new Uint8Array(geom.colors.flat()))
      : null;

    const indexAccessor = geom.triangles
      ? doc
          .createAccessor()
          .setType("SCALAR")
          .setArray(new Uint32Array(geom.triangles.flat()))
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

              // Find all references that point to this mesh (meshIndex)
              for (const ref of decomposedPoint.refs) {
                if (ref.meshIndex === meshIndex) {
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

  // Helper function to check if child is a geometry
  function isGeometry(child: BG3DGeometry | BG3DGroup): child is BG3DGeometry {
    return "type" in child;
  }

  // Helper: check whether a group contains any geometry that should be part of the scene hierarchy
  function groupHasNonSkinnedChildren(group: BG3DGroup): boolean {
    if (!Array.isArray(group.children)) return false;
    for (const child of group.children) {
      if (isGroup(child)) {
        if (groupHasNonSkinnedChildren(child)) return true;
      } else if (isGeometry(child)) {
        // If this geometry is NOT skinned, it should be part of the group hierarchy
        if (!isGeometrySkinnedByIndex(child)) return true;
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
        const geomIndex = allGeometries.indexOf(child);
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
            } else if (isGeometry(child)) {
              const geomIndex = allGeometries.indexOf(child);
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
  return doc;
}

export function gltfToBG3D(doc: Document): BG3DParseResult {
  // 1. Restore materials from glTF materials (infer BG3D flags from standard glTF data)
  const docMaterials = doc.getRoot().listMaterials();
  const materials: BG3DMaterial[] = docMaterials.map((mat) => {
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

      // Infer BG3D material flags from standard glTF properties
      let flags = 0;
      const baseColorTex = mat.getBaseColorTexture();
      const hasTexture = !!baseColorTex;
      if (hasTexture) {
        flags |= BG3DMaterialFlags.BG3D_MATERIALFLAG_TEXTURED;
      }
      const alphaMode = mat.getAlphaMode();
      if (alphaMode === "BLEND" || alphaMode === "MASK") {
        flags |= BG3DMaterialFlags.BG3D_MATERIALFLAG_ALWAYSBLEND;
      }

      // Restore textures from baseColorTexture
      const textures: BG3DTexture[] = [];
      if (baseColorTex) {
        const image = baseColorTex.getImage();

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

          if (isJPEG) {
            textures.push({
              pixels: image,
              width: 128,
              height: 128,
              srcPixelFormat: -1,
              dstPixelFormat: -1,
              bufferSize: image.byteLength,
              isJpeg: true,
            });
          } else if (isPNG) {
            const imageBuffer = toExactArrayBuffer(image);
            const rgbaRes = pngToRgba8(imageBuffer);

            // Infer srcPixelFormat from actual pixel data
            // Check if any pixel has non-255 alpha (indicating true RGBA)
            let hasAlpha = false;
            for (let i = 3; i < rgbaRes.data.length; i += 4) {
              if ((rgbaRes.data[i] ?? 255) < 255) {
                hasAlpha = true;
                break;
              }
            }

            if (hasAlpha) {
              // RGBA pixel data
              textures.push({
                pixels: new Uint8Array(rgbaRes.data),
                width: rgbaRes.width,
                height: rgbaRes.height,
                srcPixelFormat: PixelFormatSrc.GL_RGBA,
                dstPixelFormat: PixelFormatDst.GL_UNSIGNED_SHORT_5_5_5_1,
                bufferSize: rgbaRes.data.byteLength,
              });
            } else {
              // Convert to RGB (strip alpha channel)
              const rgb = new Uint8Array((rgbaRes.data.length / 4) * 3);
              for (let i = 0, j = 0; i < rgbaRes.data.length; i += 4, j += 3) {
                rgb[j + 0] = rgbaRes.data[i + 0] ?? 0;
                rgb[j + 1] = rgbaRes.data[i + 1] ?? 0;
                rgb[j + 2] = rgbaRes.data[i + 2] ?? 0;
              }
              textures.push({
                pixels: rgb,
                width: rgbaRes.width,
                height: rgbaRes.height,
                srcPixelFormat: PixelFormatSrc.GL_RGB,
                dstPixelFormat: PixelFormatDst.GL_UNSIGNED_SHORT_5_5_5_1,
                bufferSize: rgb.byteLength,
              });
            }
          } else {
            console.warn(
              "Image data from glTF is not valid PNG or JPEG, skipping texture for material",
            );
          }
        }
      }

      return {
        diffuseColor,
        flags,
        textures,
      };
    });

  // 2. Restore skeleton data purely from glTF Skin and Animations
  let skeleton: BG3DSkeleton | undefined = undefined;
  const skins = doc.getRoot().listSkins();

  if (skins.length > 0) {
      const skin = skins[0];
      if (!skin) {
        console.warn("No skin found in glTF document");
        return {
          groups: [],
          materials: [],
        };
      }
      const joints = skin.listJoints();

      if (joints.length > 0) {
        // Recover rest-pose bone positions from inverse bind matrices when available.
        // Joint transforms may reflect the current animation state after a Three.js
        // GLTFExporter round-trip, but inverse bind matrices always encode the bind pose.
        const ibmAccessor = skin.getInverseBindMatrices();
        const ibmArray = ibmAccessor?.getArray();
        const hasIBM = ibmArray instanceof Float32Array && ibmArray.length >= joints.length * 16;

        // Pre-compute bind-pose world transforms from inverse bind matrices
        const bindPoseWorldTransforms: Matrix4[] = [];
        if (hasIBM) {
          for (let i = 0; i < joints.length; i++) {
            const offset = i * 16;
            const ibm = new Matrix4();
            for (let j = 0; j < 16; j++) {
              ibm.data[j] = ibmArray[offset + j] ?? 0;
            }
            // worldTransform = inverse(inverseBindMatrix)
            bindPoseWorldTransforms.push(ibm.invert());
          }
        }

        const bones: BG3DBone[] = joints.map((joint, index) => {
          const parentBone = getJointParentBoneIndex(
            joint,
            joints,
          );

          // Use bind-pose world position from IBM, falling back to joint transforms
          let coordX = 0, coordY = 0, coordZ = 0;
          const bindWorld = bindPoseWorldTransforms[index];
          if (bindWorld) {
            const t = bindWorld.getTranslation();
            coordX = t.x;
            coordY = t.y;
            coordZ = t.z;
          } else {
            const translation = joint.getTranslation() || [0, 0, 0];
            coordX = translation[0] ?? 0;
            coordY = translation[1] ?? 0;
            coordZ = translation[2] ?? 0;
          }

          return {
            parentBone,
            name: joint.getName() || `bone_${index}`,
            coordX,
            coordY,
            coordZ,
            numPointsAttachedToBone: 0,
            numNormalsAttachedToBone: 0,
            pointIndices: [],
            normalIndices: [],
          };
        });

        // When IBM is available bone.coord* are already absolute world positions.
        // Otherwise compute from the joint node hierarchy (legacy fallback).
        if (!hasIBM) {
          const worldTransforms: (Matrix4 | undefined)[] = Array.from(
            { length: bones.length },
            () => undefined,
          );

          const getLocalMatrix = (index: number): Matrix4 | undefined => {
            const joint = joints[index];
            if (!joint) {
              return undefined;
            }

            const jointMatrix = joint.getMatrix();
            if (jointMatrix && jointMatrix.length >= 16) {
              const matrix = new Matrix4();
              for (let i = 0; i < 16; i++) {
                matrix.data[i] = jointMatrix[i] ?? 0;
              }
              return matrix;
            }

            const translation = joint.getTranslation() || [0, 0, 0];
            const rotation = joint.getRotation() || [0, 0, 0, 1];
            const scale = joint.getScale() || [1, 1, 1];

            return new Matrix4()
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
          };

          const getWorldTransform = (index: number): Matrix4 | undefined => {
            const existing = worldTransforms[index];
            if (existing) {
              return existing;
            }

            const bone = bones[index];
            if (!bone) {
              return undefined;
            }

            const localMatrix = getLocalMatrix(index);
            if (!localMatrix) {
              return undefined;
            }

            if (bone.parentBone >= 0 && bone.parentBone < bones.length) {
              const parentWorld = getWorldTransform(bone.parentBone);
              worldTransforms[index] = parentWorld
                ? parentWorld.multiply(localMatrix)
                : localMatrix;
            } else {
              worldTransforms[index] = localMatrix;
            }

            return worldTransforms[index];
          };

          bones.forEach((bone, index) => {
            const currentWorld = getWorldTransform(index);
            if (currentWorld) {
              const worldTranslation = currentWorld.getTranslation();
              bone.coordX = worldTranslation.x;
              bone.coordY = worldTranslation.y;
              bone.coordZ = worldTranslation.z;
            }
          });
        }

        // Reconstruct pointIndices and normalIndices from mesh skinning data
        interface ReverseDecomposedPoint {
          realPoint: [number, number, number];
          refs: { meshIndex: number; vertexIndex: number }[];
        }
        const reverseDecomposedPointList: ReverseDecomposedPoint[] = [];
        const reverseMatchThreshold = 0.001;
        function reversePointsMatchCloseEnough(
          p1: [number, number, number] | number[],
          p2: [number, number, number] | number[],
        ): boolean {
          return (
            Math.abs(p1[0] - p2[0]) < reverseMatchThreshold &&
            Math.abs(p1[1] - p2[1]) < reverseMatchThreshold &&
            Math.abs(p1[2] - p2[2]) < reverseMatchThreshold
          );
        }

        const vertexToDecomposedIndex = new Map<string, number>();

        let currentMeshIndex = 0;
        doc
          .getRoot()
          .listMeshes()
          .forEach((mesh) => {
            mesh.listPrimitives().forEach((prim) => {
              const posAcc = prim.getAttribute("POSITION");
              if (posAcc) {
                const posArrayRaw = posAcc.getArray();
                if (!(posArrayRaw instanceof Float32Array)) {
                  console.warn("Position array is not Float32Array");
                  return;
                }
                const posArray = posArrayRaw;
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

                  let foundIndex = -1;
                  for (let i = 0; i < reverseDecomposedPointList.length; i++) {
                    const point = reverseDecomposedPointList[i];
                    if (
                      point &&
                      reversePointsMatchCloseEnough(vertex, point.realPoint)
                    ) {
                      foundIndex = i;
                      break;
                    }
                  }

                  const key = `${currentMeshIndex}:${vi}`;
                  if (foundIndex >= 0) {
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

        const bonePointSets: Set<number>[] = bones.map(() => new Set<number>());
        const boneNormalSets: Set<number>[] = bones.map(() => new Set<number>());
        const pointToJointSets = new Map<number, Set<number>>();
        const pointToJointMap = new Map<
          number,
          { jointIndex: number; weight: number }
        >();

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
                const jointsArrayRaw = jointsAcc.getArray();
                const weightsArrayRaw = weightsAcc.getArray();
                if (
                  !(jointsArrayRaw instanceof Uint16Array) ||
                  !(weightsArrayRaw instanceof Float32Array)
                ) {
                  console.warn("Joints or weights array type mismatch");
                  return;
                }
                const jointsArray = jointsArrayRaw;
                const weightsArray = weightsArrayRaw;
                const numVertices = posAcc.getCount();

                for (let vi = 0; vi < numVertices; vi++) {
                  const key = `${meshIndexForSkinning}:${vi}`;
                  const decomposedIndex = vertexToDecomposedIndex.get(key);
                  if (decomposedIndex === undefined) continue;

                  let bestJointIndex = -1;
                  let bestWeight = 0;

                  for (let ji = 0; ji < 4; ji++) {
                    const jointIndex = jointsArray[vi * 4 + ji];
                    const weight = weightsArray[vi * 4 + ji];

                    if (
                      weight !== undefined &&
                      jointIndex !== undefined &&
                      weight > 0 &&
                      jointIndex < bones.length
                    ) {
                      let jointSet = pointToJointSets.get(decomposedIndex);
                      if (!jointSet) {
                        jointSet = new Set<number>();
                        pointToJointSets.set(decomposedIndex, jointSet);
                      }
                      jointSet.add(jointIndex);
                    }

                    if (
                      weight !== undefined &&
                      jointIndex !== undefined &&
                      weight > bestWeight &&
                      weight > 0 &&
                      jointIndex < bones.length
                    ) {
                      bestJointIndex = jointIndex;
                      bestWeight = weight;
                    }
                  }

                  if (bestJointIndex >= 0) {
                    const previousOwner = pointToJointMap.get(decomposedIndex);
                    if (!previousOwner || bestWeight > previousOwner.weight) {
                      pointToJointMap.set(decomposedIndex, {
                        jointIndex: bestJointIndex,
                        weight: bestWeight,
                      });
                    }
                  }
                }
              }
            });
            meshIndexForSkinning++;
          });

        pointToJointSets.forEach((jointSet, decomposedIndex) => {
          jointSet.forEach((jointIndex) => {
            const pointSet = bonePointSets[jointIndex];
            const normalSet = boneNormalSets[jointIndex];
            if (pointSet) {
              pointSet.add(decomposedIndex);
            }
            if (normalSet) {
              normalSet.add(decomposedIndex);
            }
          });
        });

        bones.forEach((bone, index) => {
          const pointSet = bonePointSets[index];
          const normalSet = boneNormalSets[index];
          bone.pointIndices = pointSet ? Array.from(pointSet) : [];
          bone.normalIndices = normalSet ? Array.from(normalSet) : [];
          bone.numPointsAttachedToBone = bone.pointIndices.length;
          bone.numNormalsAttachedToBone = bone.normalIndices.length;
        });

        const relPoints: [number, number, number][] = reverseDecomposedPointList.map(
          (point, decomposedIndex) => {
            const owner = pointToJointMap.get(decomposedIndex);
            const bone = owner ? bones[owner.jointIndex] : undefined;
            if (!bone) {
              return [point.realPoint[0], point.realPoint[1], point.realPoint[2]];
            }

            return [
              point.realPoint[0] - bone.coordX,
              point.realPoint[1] - bone.coordY,
              point.realPoint[2] - bone.coordZ,
            ];
          },
        );

        // Reconstruct animations from glTF animation data and animation extras.
        const animations = extractAnimationsFromGLTF(doc, bones);

        skeleton = {
          version: 272,
          numAnims: animations.length,
          numJoints: bones.length,
          num3DMFLimbs: 0,
          bones,
          animations,
          relPoints: {
            "1000": relPoints,
          },
        };
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
        vertices.push([arr[i] ?? 0, arr[i + 1] ?? 0, arr[i + 2] ?? 0]);
      }
    }

    const normAcc = prim.getAttribute("NORMAL");
    let normals: [number, number, number][] | undefined = undefined;
    if (normAcc) {
      const arr = Array.from(normAcc.getArray() ?? []);
      normals = [];
      for (let i = 0; i < arr.length; i += 3) {
        normals.push([arr[i] ?? 0, arr[i + 1] ?? 0, arr[i + 2] ?? 0]);
      }
    }

    const uvAcc = prim.getAttribute("TEXCOORD_0");
    let uvs: [number, number][] | undefined = undefined;
    if (uvAcc) {
      const arr = Array.from(uvAcc.getArray() ?? []);
      uvs = [];
      for (let i = 0; i < arr.length; i += 2) {
        uvs.push([arr[i] ?? 0, arr[i + 1] ?? 0]);
      }
    }

    const colorAcc = prim.getAttribute("COLOR_0");
    let colors: [number, number, number, number][] | undefined = undefined;
    if (colorAcc) {
      const arr = Array.from(colorAcc.getArray() ?? []);
      colors = [];
      for (let i = 0; i < arr.length; i += 4) {
        colors.push([
          arr[i] ?? 0,
          arr[i + 1] ?? 0,
          arr[i + 2] ?? 0,
          arr[i + 3] ?? 0,
        ]);
      }
    }

    const idxAcc = prim.getIndices();
    let triangles: [number, number, number][] | undefined = undefined;
    if (idxAcc) {
      const arr = Array.from(idxAcc.getArray() ?? []);
      triangles = [];
      for (let i = 0; i < arr.length; i += 3) {
        triangles.push([arr[i] ?? 0, arr[i + 1] ?? 0, arr[i + 2] ?? 0]);
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
      boundingBox:
        isRecord(extras.boundingBox) &&
        Array.isArray(extras.boundingBox.min) &&
        Array.isArray(extras.boundingBox.max)
          ? {
              min: [
                typeof extras.boundingBox.min[0] === "number"
                  ? extras.boundingBox.min[0]
                  : 0,
                typeof extras.boundingBox.min[1] === "number"
                  ? extras.boundingBox.min[1]
                  : 0,
                typeof extras.boundingBox.min[2] === "number"
                  ? extras.boundingBox.min[2]
                  : 0,
              ] as [number, number, number],
              max: [
                typeof extras.boundingBox.max[0] === "number"
                  ? extras.boundingBox.max[0]
                  : 0,
                typeof extras.boundingBox.max[1] === "number"
                  ? extras.boundingBox.max[1]
                  : 0,
                typeof extras.boundingBox.max[2] === "number"
                  ? extras.boundingBox.max[2]
                  : 0,
              ] as [number, number, number],
            }
          : undefined,
      numMaterials: 1,
      type: typeof extras.type === "number" ? extras.type : 0,
      numPoints: vertices ? vertices.length : 0,
      numTriangles: triangles ? triangles.length : 0,
    };
  }

  // Flatten a node tree into items suitable for a BG3D group
  function flattenNodeToGroupItems(node: Node): (BG3DGroup | BG3DGeometry)[] {
    const mesh = node.getMesh();
    if (mesh) {
      return [processMesh(mesh)];
    }
    const items: (BG3DGroup | BG3DGeometry)[] = [];
    for (const child of node.listChildren()) {
      items.push(...flattenNodeToGroupItems(child));
    }
    return items;
  }

  // Process scene hierarchy - collect all meshes into a single root group
  // BG3D format: root group → one sub-group per model → geometry
  const scene = doc.getRoot().listScenes()[0];
  if (!scene) {
    return {
      materials,
      groups: [],
      skeleton,
    };
  }

  // Collect all geometry from the scene (meshes may be at various levels)
  function isGeometry(item: BG3DGroup | BG3DGeometry): item is BG3DGeometry {
    return "numPoints" in item;
  }
  const allGeometry: BG3DGeometry[] = [];
  for (const node of scene.listChildren()) {
    const items = flattenNodeToGroupItems(node);
    for (const item of items) {
      if (isGeometry(item)) {
        allGeometry.push(item);
      }
    }
  }

  // BG3D structure: root group contains one sub-group with all geometry items
  const subGroup: BG3DGroup = { children: allGeometry };
  const rootGroup: BG3DGroup = { children: [subGroup] };
  const groups: BG3DGroup[] = allGeometry.length > 0 ? [rootGroup] : [];

  return {
    materials,
    groups,
    skeleton,
  };
}
