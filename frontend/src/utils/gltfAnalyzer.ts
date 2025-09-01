import { Document, WebIO } from "@gltf-transform/core";

export interface GLTFAnalysis {
  nodeCount: number;
  meshCount: number;
  materialCount: number;
  textureCount: number;
  nodes: Array<{
    name: string;
    meshes: number[];
    children: number[];
  }>;
  materials: Array<{
    name: string;
    textures: Array<{
      type: string;
      uri?: string;
    }>;
  }>;
  textures: Array<{
    name: string;
    uri?: string;
    mimeType?: string;
  }>;
}

export async function analyzeGLTF(glbArrayBuffer: ArrayBuffer): Promise<GLTFAnalysis> {
  const io = new WebIO();
  const doc = await io.readBinary(new Uint8Array(glbArrayBuffer));
  
  const analysis: GLTFAnalysis = {
    nodeCount: doc.getRoot().listNodes().length,
    meshCount: doc.getRoot().listMeshes().length,
    materialCount: doc.getRoot().listMaterials().length,
    textureCount: doc.getRoot().listTextures().length,
    nodes: [],
    materials: [],
    textures: []
  };

  // Analyze nodes
  doc.getRoot().listNodes().forEach((node, index) => {
    analysis.nodes.push({
      name: node.getName() || `Node_${index}`,
      meshes: node.getMesh() ? [doc.getRoot().listMeshes().indexOf(node.getMesh()!)] : [],
      children: node.listChildren().map(child => doc.getRoot().listNodes().indexOf(child))
    });
  });

  // Analyze materials
  doc.getRoot().listMaterials().forEach((material, index) => {
    const materialData = {
      name: material.getName() || `Material_${index}`,
      textures: [] as Array<{ type: string; uri?: string; }>
    };

    // Check for different texture types
    const textureTypes = [
      { prop: 'getBaseColorTexture', type: 'baseColor' },
      { prop: 'getNormalTexture', type: 'normal' },
      { prop: 'getMetallicRoughnessTexture', type: 'metallicRoughness' },
      { prop: 'getOcclusionTexture', type: 'occlusion' },
      { prop: 'getEmissiveTexture', type: 'emissive' }
    ];

    textureTypes.forEach(({ prop, type }) => {
      // Type assertion needed for dynamic property access on gltf-transform Material
      const texture = (material as Record<string, () => any>)[prop]();
      if (texture) {
        materialData.textures.push({
          type,
          uri: texture.getURI()
        });
      }
    });

    analysis.materials.push(materialData);
  });

  // Analyze textures
  doc.getRoot().listTextures().forEach((texture, index) => {
    analysis.textures.push({
      name: texture.getName() || `Texture_${index}`,
      uri: texture.getURI(),
      mimeType: texture.getMimeType()
    });
  });

  return analysis;
}

export function splitGLTFByNodes(doc: Document): Document[] {
  const documents: Document[] = [];
  
  doc.getRoot().listNodes().forEach((node) => {
    if (node.getMesh()) {
      const newDoc = new Document();
      const clonedNode = node.clone();
      newDoc.getRoot().getDefaultScene()?.addChild(clonedNode);
      
      // Copy materials and textures used by this node
      const mesh = node.getMesh();
      if (mesh) {
        mesh.listPrimitives().forEach(primitive => {
          const material = primitive.getMaterial();
          if (material && !newDoc.getRoot().listMaterials().includes(material)) {
            // Clone material and add to new document
            const clonedMaterial = material.clone();
            newDoc.getRoot().listMaterials().push(clonedMaterial);
            
            // Copy textures
            const textures = [
              material.getBaseColorTexture(),
              material.getNormalTexture(), 
              material.getMetallicRoughnessTexture(),
              material.getOcclusionTexture(),
              material.getEmissiveTexture()
            ].filter(Boolean);
            
            textures.forEach(texture => {
              if (texture && !newDoc.getRoot().listTextures().includes(texture)) {
                const clonedTexture = texture.clone();
                newDoc.getRoot().listTextures().push(clonedTexture);
              }
            });
          }
        });
      }
      
      documents.push(newDoc);
    }
  });

  return documents;
}