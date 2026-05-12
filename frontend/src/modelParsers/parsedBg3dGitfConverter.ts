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

import { pngToRgba8 } from "./image/pngArgb";

import {
  createSkeletonSystem,
  extractAnimationsFromGLTF,
} from "./skeletonSystemNew";

import {
  Document,
  Mesh,
  Material,
  Node,
  Primitive,
  Skin,
  Accessor,
} from "@gltf-transform/core";
import { PixelFormatSrc, PixelFormatDst } from "./parseBG3D";
import { Quaternion } from "three";
import { Matrix4 } from "./matrix4Utils";
import { processBG3DMaterials } from "./materialConversion";
import {
  arrayBufferSchema,
  uint8ArraySchema,
  float32ArraySchema,
  uint16ArraySchema,
  plainObjectSchema,
  getNumberField,
  getArrayNumberField,
} from "@/schemas/common";

/**
 * Type guard helper functions for safe extraction from unknown values
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return plainObjectSchema.safeParse(value).success;
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
  const arrayBufferResult = arrayBufferSchema.safeParse(data);
  if (arrayBufferResult.success) {
    return arrayBufferResult.data.slice(0);
  }
  const uint8Result = uint8ArraySchema.safeParse(data);
  if (!uint8Result.success) {
    return new ArrayBuffer(0); // Should never reach with valid input
  }
  const uint8Data = uint8Result.data;
  const copy = new ArrayBuffer(uint8Data.byteLength);
  new Uint8Array(copy).set(
    new Uint8Array(uint8Data.buffer, uint8Data.byteOffset, uint8Data.byteLength),
  );
  return copy;
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
export function bg3dParsedToGLTF(parsed: BG3DParseResult): Document {
  const doc = new Document();
  const baseBuffer = doc.createBuffer("Basebuffer");

  // 1. Materials
  const gltfMaterials: Material[] = processBG3DMaterials(
    doc,
    parsed.materials || [],
  );

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
      console.error(
        "Failed to create skeleton system:",
        skeletonSystemResult.error,
      );
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
    const layerMatNum = getNumberField(geom, "layerMaterialNum");
    if (layerMatNum > 0 && layerMatNum < gltfMaterials.length) {
      const material = gltfMaterials[layerMatNum];
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

      const uint8ArrayResult = uint8ArraySchema.safeParse(image);
      if (uint8ArrayResult.success && image !== null) {
        const imageData = uint8ArrayResult.data;
        // Check for JPEG signature (0xFF 0xD8)
        const isJPEG =
          imageData.length >= 2 && imageData[0] === 0xff && imageData[1] === 0xd8;

        // Check for PNG signature
        const isPNG =
          imageData.length >= 8 &&
          imageData[0] === 0x89 &&
          imageData[1] === 0x50 &&
          imageData[2] === 0x4e &&
          imageData[3] === 0x47 &&
          imageData[4] === 0x0d &&
          imageData[5] === 0x0a &&
          imageData[6] === 0x1a &&
          imageData[7] === 0x0a;

        if (isJPEG) {
          textures.push({
            pixels: imageData,
            width: 128,
            height: 128,
            srcPixelFormat: -1,
            dstPixelFormat: -1,
            bufferSize: imageData.byteLength,
            isJpeg: true,
          });
        } else if (isPNG) {
          const imageBuffer = toExactArrayBuffer(imageData);
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
      const float32ArrayResult = float32ArraySchema.safeParse(ibmArray);
      const hasIBM =
        float32ArrayResult.success &&
        ibmArray !== null &&
        ibmArray !== undefined &&
        ibmArray.length >= joints.length * 16;

      // Pre-compute bind-pose world transforms from inverse bind matrices
      const bindPoseWorldTransforms: Matrix4[] = [];
      if (hasIBM && ibmArray !== null && ibmArray !== undefined) {
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
        const parentBone = getJointParentBoneIndex(joint, joints);

        // Use bind-pose world position from IBM, falling back to joint transforms
        let coordX = 0,
          coordY = 0,
          coordZ = 0;
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
              const float32ArrayResult = float32ArraySchema.safeParse(posArrayRaw);
              if (!float32ArrayResult.success) {
                console.warn("Position array is not Float32Array");
                return;
              }
              const posArray = float32ArrayResult.data;
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
                  const existingPoint = reverseDecomposedPointList[foundIndex];
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
              const uint16ArrayResult = uint16ArraySchema.safeParse(jointsArrayRaw);
              const float32ArrayResult = float32ArraySchema.safeParse(weightsArrayRaw);
              if (
                !uint16ArrayResult.success ||
                !float32ArrayResult.success
              ) {
                console.warn("Joints or weights array type mismatch");
                return;
              }
              const jointsArray = uint16ArrayResult.data;
              const weightsArray = float32ArrayResult.data;
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

      const relPoints: [number, number, number][] =
        reverseDecomposedPointList.map((point, decomposedIndex) => {
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
        });

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
  function processPrimitive(prim: Primitive): BG3DGeometry {
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
      flags: getNumberField(extras, "flags", 0),
      boundingBox:
        isRecord(extras.boundingBox) &&
        Array.isArray(extras.boundingBox.min) &&
        Array.isArray(extras.boundingBox.max)
          ? {
              min: [
                getArrayNumberField(extras.boundingBox.min, 0),
                getArrayNumberField(extras.boundingBox.min, 1),
                getArrayNumberField(extras.boundingBox.min, 2),
              ] as [number, number, number],
              max: [
                getArrayNumberField(extras.boundingBox.max, 0),
                getArrayNumberField(extras.boundingBox.max, 1),
                getArrayNumberField(extras.boundingBox.max, 2),
              ] as [number, number, number],
            }
          : undefined,
      numMaterials: 1,
      type: getNumberField(extras, "type", 0),
      numPoints: vertices ? vertices.length : 0,
      numTriangles: triangles ? triangles.length : 0,
    };
  }

  function processMesh(mesh: Mesh): BG3DGeometry[] {
    return mesh.listPrimitives().map((prim) => processPrimitive(prim));
  }

  // Flatten a node tree into items suitable for a BG3D group
  function flattenNodeToGroupItems(node: Node): (BG3DGroup | BG3DGeometry)[] {
    const mesh = node.getMesh();
    if (mesh) {
      return processMesh(mesh);
    }
    const items: (BG3DGroup | BG3DGeometry)[] = [];
    for (const child of node.listChildren()) {
      items.push(...flattenNodeToGroupItems(child));
    }
    return items;
  }

  // Process scene hierarchy - collect all meshes into a single root group
  // BG3D format: root group → one sub-group per model → geometry
  const scene = doc.getRoot().getDefaultScene() ?? doc.getRoot().listScenes()[0];
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
