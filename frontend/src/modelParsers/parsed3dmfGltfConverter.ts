import { BG3DParseResult, BG3DMaterial, BG3DGroup, BG3DGeometry } from "./parseBG3D";
import { Document, Material, Mesh, Node, Primitive, Accessor, Buffer as GLTFBuffer } from "@gltf-transform/core";

/**
 * Convert a parsed 3DMF (BG3DParseResult) to a glTF Document.
 * @param parsed BG3DParseResult from 3DMF parsing
 * @returns Document glTF document
 */
export function parsed3dmfToGLTF(parsed: BG3DParseResult): Document {
  const doc = new Document();
  const root = doc.getRoot();
  const scene = doc.createScene("3DMF Scene");
  
  console.log("[parsed3dmfToGLTF] Converting 3DMF data to glTF");
  
  // Create materials
  const gltfMaterials: Material[] = [];
  for (let i = 0; i < parsed.materials.length; i++) {
    const bg3dMat = parsed.materials[i];
    const material = doc.createMaterial(`Material_${i}`)
      .setBaseColorFactor([
        bg3dMat.diffuseColor[0],
        bg3dMat.diffuseColor[1], 
        bg3dMat.diffuseColor[2],
        bg3dMat.diffuseColor[3]
      ]);
    
    gltfMaterials.push(material);
  }
  
  // Convert groups to nodes
  let nodeCounter = 0;
  for (const group of parsed.groups) {
    const groupNode = convertGroupToNode(doc, group, gltfMaterials, `Group_${nodeCounter++}`);
    scene.addChild(groupNode);
  }
  
  return doc;
}

/**
 * Convert a glTF Document to a parsed 3DMF (BG3DParseResult).
 * @param doc Document glTF document
 * @returns BG3DParseResult compatible with 3DMF format
 */
export function gltfToParsed3dmf(doc: Document): BG3DParseResult {
  const root = doc.getRoot();
  const scenes = root.listScenes();
  
  console.log("[gltfToParsed3dmf] Converting glTF to 3DMF data structure");
  
  const materials: BG3DMaterial[] = [];
  const groups: BG3DGroup[] = [];
  
  // Convert materials
  const gltfMaterials = root.listMaterials();
  for (const gltfMat of gltfMaterials) {
    const baseColor = gltfMat.getBaseColorFactor();
    const material: BG3DMaterial = {
      flags: 1,
      diffuseColor: [baseColor[0], baseColor[1], baseColor[2], baseColor[3]],
      textures: [],
      jpegTextures: []
    };
    materials.push(material);
  }
  
  // If no materials, create default
  if (materials.length === 0) {
    materials.push({
      flags: 1,
      diffuseColor: [0.8, 0.8, 0.8, 1.0],
      textures: [],
      jpegTextures: []
    });
  }
  
  // Convert scene nodes to groups
  for (const scene of scenes) {
    const group: BG3DGroup = { children: [] };
    
    for (const node of scene.listChildren()) {
      convertNodeToGroup(node, group, materials);
    }
    
    groups.push(group);
  }
  
  return {
    materials,
    groups
  };
}

function convertGroupToNode(doc: Document, group: BG3DGroup, materials: Material[], name: string): Node {
  const node = doc.createNode(name);
  
  for (let i = 0; i < group.children.length; i++) {
    const child = group.children[i];
    
    if ('vertices' in child) {
      // It's geometry - convert to mesh
      const geometry = child as BG3DGeometry;
      const mesh = convertGeometryToMesh(doc, geometry, materials, `${name}_Mesh_${i}`);
      if (mesh) {
        node.setMesh(mesh);
      }
    } else {
      // It's a sub-group - convert recursively
      const childGroup = child as BG3DGroup;
      const childNode = convertGroupToNode(doc, childGroup, materials, `${name}_Child_${i}`);
      node.addChild(childNode);
    }
  }
  
  return node;
}

function convertGeometryToMesh(doc: Document, geometry: BG3DGeometry, materials: Material[], name: string): Mesh | null {
  if (!geometry.vertices || !geometry.triangles) {
    console.warn(`[parsed3dmfToGLTF] Geometry ${name} missing vertices or triangles`);
    return null;
  }
  
  const mesh = doc.createMesh(name);
  
  // Create buffer for vertex data
  const buffer = doc.createBuffer();
  
  // Flatten vertex data
  const vertexData = new Float32Array(geometry.vertices.length * 3);
  for (let i = 0; i < geometry.vertices.length; i++) {
    vertexData[i * 3] = geometry.vertices[i][0];
    vertexData[i * 3 + 1] = geometry.vertices[i][1];
    vertexData[i * 3 + 2] = geometry.vertices[i][2];
  }
  
  // Create position accessor
  const positionAccessor = doc.createAccessor()
    .setType(Accessor.Type.VEC3)
    .setComponentType(Accessor.ComponentType.FLOAT)
    .setCount(geometry.vertices.length)
    .setBuffer(buffer);
  
  // Set position data
  positionAccessor.setArray(vertexData);
  
  // Flatten triangle indices
  const indexData = new Uint32Array(geometry.triangles.length * 3);
  for (let i = 0; i < geometry.triangles.length; i++) {
    indexData[i * 3] = geometry.triangles[i][0];
    indexData[i * 3 + 1] = geometry.triangles[i][1];
    indexData[i * 3 + 2] = geometry.triangles[i][2];
  }
  
  // Create index accessor
  const indexAccessor = doc.createAccessor()
    .setType(Accessor.Type.SCALAR)
    .setComponentType(Accessor.ComponentType.UNSIGNED_INT)
    .setCount(indexData.length)
    .setBuffer(buffer);
  
  indexAccessor.setArray(indexData);
  
  // Create primitive
  const primitive = doc.createPrimitive()
    .setMode(Primitive.Mode.TRIANGLES)
    .setIndices(indexAccessor)
    .setAttribute('POSITION', positionAccessor);
  
  // Assign material if available
  const materialIndex = Math.min(geometry.layerMaterialNum[0] || 0, materials.length - 1);
  if (materials[materialIndex]) {
    primitive.setMaterial(materials[materialIndex]);
  }
  
  mesh.addPrimitive(primitive);
  
  return mesh;
}

function convertNodeToGroup(node: Node, group: BG3DGroup, materials: BG3DMaterial[]) {
  const mesh = node.getMesh();
  
  if (mesh) {
    // Convert mesh to geometry
    for (const primitive of mesh.listPrimitives()) {
      const geometry = convertPrimitiveToGeometry(primitive, materials);
      if (geometry) {
        group.children.push(geometry);
      }
    }
  }
  
  // Process child nodes
  for (const childNode of node.listChildren()) {
    const childGroup: BG3DGroup = { children: [] };
    convertNodeToGroup(childNode, childGroup, materials);
    if (childGroup.children.length > 0) {
      group.children.push(childGroup);
    }
  }
}

function convertPrimitiveToGeometry(primitive: Primitive, materials: BG3DMaterial[]): BG3DGeometry | null {
  const positionAccessor = primitive.getAttribute('POSITION');
  const indexAccessor = primitive.getIndices();
  
  if (!positionAccessor || !indexAccessor) {
    console.warn("[gltfToParsed3dmf] Primitive missing position or index data");
    return null;
  }
  
  // Extract vertices
  const positionArray = positionAccessor.getArray();
  if (!positionArray) {
    console.warn("[gltfToParsed3dmf] Position accessor has no array data");
    return null;
  }
  
  const vertices: [number, number, number][] = [];
  for (let i = 0; i < positionArray.length; i += 3) {
    vertices.push([
      positionArray[i],
      positionArray[i + 1],
      positionArray[i + 2]
    ]);
  }
  
  // Extract triangles
  const indexArray = indexAccessor.getArray();
  if (!indexArray) {
    console.warn("[gltfToParsed3dmf] Index accessor has no array data");
    return null;
  }
  
  const triangles: [number, number, number][] = [];
  for (let i = 0; i < indexArray.length; i += 3) {
    triangles.push([
      indexArray[i],
      indexArray[i + 1], 
      indexArray[i + 2]
    ]);
  }
  
  // Find material index
  const primitiveMaterial = primitive.getMaterial();
  let materialIndex = 0;
  if (primitiveMaterial) {
    // This is simplified - in practice you'd need to track material correspondence
    materialIndex = 0;
  }
  
  const geometry: BG3DGeometry = {
    type: 0,
    numMaterials: 1,
    layerMaterialNum: [materialIndex, 0, 0, 0],
    flags: 0,
    numPoints: vertices.length,
    numTriangles: triangles.length,
    vertices,
    triangles
  };
  
  return geometry;
}
