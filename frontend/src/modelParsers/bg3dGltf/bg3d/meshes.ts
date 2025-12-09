/**
 * Mesh/geometry conversion functions for BG3D ↔ glTF
 */

import {
  BG3DGeometry,
  BG3DGroup,
  BG3DSkeleton,
  BG3DBone,
} from "../../parseBG3D";

import {
  Mesh,
  Material,
  Node,
  Accessor,
  Buffer,
  Document,
} from "@gltf-transform/core";

/**
 * Convert BG3D geometries to glTF meshes
 */
export function bg3dMeshesToGltf(
  allGeometries: BG3DGeometry[],
  gltfMaterials: Material[],
  doc: Document,
  baseBuffer: Buffer | null,
  parsedSkeleton?: BG3DSkeleton,
): Mesh[] {
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

    if (parsedSkeleton && geom.vertices) {
      const numVertices = geom.vertices.length;
      const joints = new Uint16Array(numVertices * 4);
      const weights = new Float32Array(numVertices * 4);

      // All arrays initialized to 0 (no bone influences by default)

      // Apply bone influences based on Otto's point indices
      // Each vertex can be influenced by multiple bones - we track all influences
      parsedSkeleton.bones.forEach((bone: BG3DBone, boneIndex: number) => {
        if (bone.pointIndices) {
          bone.pointIndices.forEach((vertexIndex: number) => {
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
          totalWeight += weights[offset + j] ?? 0;
        }

        if (totalWeight > 0) {
          // Normalize existing weights
          for (let j = 0; j < 4; j++) {
            weights[offset + j] = (weights[offset + j] ?? 0) / totalWeight;
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
      const mat = gltfMaterials[geom.layerMaterialNum];
      if (mat) primitive.setMaterial(mat);
    } else if (
      Array.isArray(geom.layerMaterialNum) &&
      geom.layerMaterialNum[0] !== undefined &&
      geom.layerMaterialNum[0] < gltfMaterials.length
    ) {
      const mat = gltfMaterials[geom.layerMaterialNum[0]];
      if (mat) primitive.setMaterial(mat);
    }

    // Store original properties in extras
    primitive.setExtras({
      layerMaterialNum: geom.layerMaterialNum,
      boundingBox: geom.boundingBox,
    });

    mesh.addPrimitive(primitive);
    gltfMeshes.push(mesh);
  });

  return gltfMeshes;
}

/**
 * Convert glTF meshes back to BG3D geometries
 */
export function gltfMeshesToBg3d(
  docMeshes: Mesh[],
  docMaterials: Material[],
): BG3DGeometry[] {
  const geometries: BG3DGeometry[] = [];

  docMeshes.forEach((mesh) => {
    const primitives = mesh.listPrimitives();
    const prim = primitives[0]; // Use first primitive
    if (!prim) return;
    const extras = prim.getExtras() || {};

    // Extract geometry data
    const posAcc = prim.getAttribute("POSITION");
    let vertices: [number, number, number][] | undefined = undefined;
    if (posAcc) {
      const arr = Array.from(posAcc.getArray() as Float32Array);
      vertices = [];
      for (let i = 0; i < arr.length; i += 3) {
        vertices.push([arr[i] ?? 0, arr[i + 1] ?? 0, arr[i + 2] ?? 0]);
      }
    }

    const normAcc = prim.getAttribute("NORMAL");
    let normals: [number, number, number][] | undefined = undefined;
    if (normAcc) {
      const arr = Array.from(normAcc.getArray() as Float32Array);
      normals = [];
      for (let i = 0; i < arr.length; i += 3) {
        normals.push([arr[i] ?? 0, arr[i + 1] ?? 0, arr[i + 2] ?? 0]);
      }
    }

    const uvAcc = prim.getAttribute("TEXCOORD_0");
    let uvs: [number, number][] | undefined = undefined;
    if (uvAcc) {
      const arr = Array.from(uvAcc.getArray() as Float32Array);
      uvs = [];
      for (let i = 0; i < arr.length; i += 2) {
        uvs.push([arr[i] ?? 0, arr[i + 1] ?? 0]);
      }
    }

    const colorAcc = prim.getAttribute("COLOR_0");
    let colors: [number, number, number, number][] | undefined = undefined;
    if (colorAcc) {
      const arr = Array.from(colorAcc.getArray() as Uint8Array);
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
      const arr = Array.from(idxAcc.getArray() as Uint32Array);
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

    const geometry: BG3DGeometry = {
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

    geometries.push(geometry);
  });

  return geometries;
}

/**
 * Process glTF scene hierarchy to extract BG3D groups
 */
export function gltfSceneToBg3dGroups(
  sceneNodes: Node[],
  geometries: BG3DGeometry[],
  docMeshes: Mesh[],
): BG3DGroup[] {
  function processNode(node: Node): BG3DGroup | BG3DGeometry {
    const mesh = node.getMesh();
    if (mesh) {
      const meshIndex = docMeshes.indexOf(mesh);
      if (meshIndex >= 0 && meshIndex < geometries.length) {
        const geom = geometries[meshIndex];
        if (geom) {
          return geom;
        }
      }
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
  const groups: BG3DGroup[] = sceneNodes.map((node) =>
    processNode(node),
  ) as BG3DGroup[];

  return groups;
}
